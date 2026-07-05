import express from "express";
import multer from "multer";
import cors from "cors";
import sharp from "sharp";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors({ origin: "*" }));
app.use(express.json());

// Initialize AWS S3 Client for Cloudflare R2
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error("Critical Error: Cloudflare R2 configurations are missing in .env");
  process.exit(1);
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Supabase configurations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Critical Error: Supabase URL or Publishable Key is missing in .env");
  process.exit(1);
}
const SETTINGS_FILE = "./settings.json";

const getDropboxAccessToken = async (settings) => {
  const dbSettings = settings.dropbox;
  if (!dbSettings || !dbSettings.apiKey) {
    throw new Error("Dropbox integration is not configured in settings");
  }

  // If we already have a valid access token that expires at least 60 seconds from now, return it!
  if (dbSettings.accessToken && dbSettings.expiresAt && dbSettings.expiresAt > Date.now() + 60000) {
    return dbSettings.accessToken;
  }

  // If there is no access token, but there's a refresh token (apiKey holds the refresh token or manual token):
  // Let's try to request a fresh access token using the refresh token!
  // Note: if the apiKey is a short-lived token generated manually, refreshing it will fail.
  // In that case, we fallback to returning the apiKey itself!
  if (dbSettings.apiKey && !dbSettings.apiKey.startsWith("sl.")) {
    // If it doesn't look like a short-lived token, it must be the refresh token!
    console.log("Refreshing Dropbox access token...");
    const appKey = "ad1o4zsc1obb539";
    const appSecret = "eeodmq24nbb6ymb";

    try {
      const params = new URLSearchParams();
      params.append("grant_type", "refresh_token");
      params.append("refresh_token", dbSettings.apiKey);

      const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${appKey}:${appSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });

      if (response.ok) {
        const data = await response.json();
        dbSettings.accessToken = data.access_token;
        dbSettings.expiresAt = Date.now() + (data.expires_in * 1000);
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
        return data.access_token;
      } else {
        const errText = await response.text();
        console.warn(`Failed to refresh Dropbox token, falling back to raw apiKey. Error: ${errText}`);
      }
    } catch (err) {
      console.warn("Failed to refresh Dropbox access token, falling back to raw apiKey:", err);
    }
  }

  return dbSettings.apiKey;
};

// Multer memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * Helper to upload buffer to Cloudflare R2
 */
async function uploadToR2(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
}

/**
 * POST /api/upload
 * Expects multipart form data with fields:
 * - file: The image file
 * - galleryId: The ID of the gallery
 * - sectionId: The ID of the section
 * - displayOrder: The display order index
 * - caption: (Optional) Photo caption
 */
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const { file } = req;
    const { galleryId, sectionId, displayOrder, caption, gallerySlug, sectionTitle } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized: Missing Authorization header" });
    }

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!galleryId || !sectionId) {
      return res.status(400).json({ error: "galleryId and sectionId are required" });
    }

    // Initialize Supabase client for this request with the user's JWT
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Generate a unique photo ID
    const photoId = crypto.randomUUID();

    console.log(`Processing file: ${file.originalname} for gallery: ${galleryId}, section: ${sectionId}`);

    // Extract original extension (e.g. jpg, png) and base filename
    const originalName = file.originalname;
    const dotIndex = originalName.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
    const originalExt = dotIndex !== -1 ? originalName.substring(dotIndex + 1).toLowerCase() : "jpg";
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");

    // Create sharp instances for each variant (sharp streams are consumed after first read)
    // 1. Process large size (max 2000px wide/high)
    const largeWebpBuffer = await sharp(file.buffer)
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 2. Process medium size (max 1200px wide/high)
    const mediumWebpBuffer = await sharp(file.buffer)
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 3. Process thumb size (max 300px wide/high)
    const thumbWebpBuffer = await sharp(file.buffer)
      .resize({
        width: 300,
        height: 300,
        fit: "cover",
      })
      .webp({ quality: 75 })
      .toBuffer();

    // Structure R2 path using gallerySlug/sectionTitle if provided, else fallback
    let basePath = `Gallery/${galleryId}/${sectionId}/${photoId}`;
    if (gallerySlug && sectionTitle) {
      const cleanGallerySlug = gallerySlug.replace(/[^a-zA-Z0-9-_]/g, "_");
      const cleanSectionTitle = sectionTitle.replace(/[^a-zA-Z0-9-_]/g, "_");
      basePath = `${cleanGallerySlug}/${cleanSectionTitle}/${photoId}`;
    }

    const originalKey = `${basePath}/${cleanBaseName}.${originalExt}`;
    const largeKey = `${basePath}/${cleanBaseName}-lg.webp`;
    const mediumKey = `${basePath}/${cleanBaseName}-md.webp`;
    const thumbKey = `${basePath}/${cleanBaseName}-sm.webp`;

    console.log(`Uploading processed files to R2...`);

    // Upload concurrently to R2 (original is uploaded as-is with original mimetype)
    await Promise.all([
      uploadToR2(originalKey, file.buffer, file.mimetype),
      uploadToR2(largeKey, largeWebpBuffer, "image/webp"),
      uploadToR2(mediumKey, mediumWebpBuffer, "image/webp"),
      uploadToR2(thumbKey, thumbWebpBuffer, "image/webp"),
    ]);

    console.log(`Database insertion to Supabase...`);

    // Insert photo record into Supabase
    const { data, error } = await supabase
      .from("photos")
      .insert({
        id: photoId,
        section_id: sectionId,
        storage_path: originalKey,
        thumbnail_path: thumbKey,
        display_order: parseInt(displayOrder) || 0,
        caption: caption || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`Upload & processing complete for photo: ${photoId}`);
    res.status(200).json({ success: true, photo: data });
  } catch (error) {
    console.error("Upload API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process and upload image";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/gallery-stats
 * Returns the size and count of only original photos (excluding covers and preview sizes) for the given prefixes.
 */
app.post("/api/gallery-stats", async (req, res) => {
  try {
    const { prefixes } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized: Missing Authorization header" });
    }

    if (!prefixes || !Array.isArray(prefixes) || prefixes.length === 0) {
      return res.status(400).json({ error: "prefixes array is required" });
    }

    let totalSize = 0;
    let photoCount = 0;

    for (const pref of prefixes) {
      let isTruncated = true;
      let continuationToken = undefined;

      while (isTruncated) {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: pref,
          ContinuationToken: continuationToken,
        });

        const response = await s3Client.send(command);

        if (response.Contents) {
          const originals = response.Contents.filter((obj) => {
            if (!obj.Key) return false;
            const lowerKey = obj.Key.toLowerCase();
            // Filter out preview sizes
            if (lowerKey.endsWith("-lg.webp") || lowerKey.endsWith("-md.webp") || lowerKey.endsWith("-sm.webp")) return false;
            if (lowerKey.endsWith("/large.webp") || lowerKey.endsWith("/medium.webp") || lowerKey.endsWith("/thumb.webp")) return false;
            // Filter out cover images
            if (lowerKey.includes("/cover.") || lowerKey.includes("-cover.")) return false;
            return true;
          });

          photoCount += originals.length;
          totalSize += originals.reduce((acc, obj) => acc + (obj.Size || 0), 0);
        }

        isTruncated = response.IsTruncated || false;
        continuationToken = response.NextContinuationToken;
      }
    }

    res.status(200).json({ totalSize, photoCount });
  } catch (error) {
    console.error("Gallery Stats API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch gallery stats";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/sync-external-folder
 * Scans a shared Dropbox or Google Drive folder, generates responsive WebP previews,
 * uploads them to R2, and links the original to the external source.
 */
app.post("/api/sync-external-folder", async (req, res) => {
  try {
    const { source, folderUrl, token, galleryId, sectionId, gallerySlug, sectionTitle } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized: Missing Authorization header" });
    }
    if (!folderUrl || !galleryId || !sectionId || !gallerySlug || !sectionTitle) {
      return res.status(400).json({ error: "folderUrl, galleryId, sectionId, gallerySlug, and sectionTitle are required" });
    }

    // Set chunked encoding headers to stream progress updates in real time
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Initialize Supabase client for this request with the user's JWT to verify access
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const cleanGallerySlug = gallerySlug.replace(/[^a-zA-Z0-9-_]/g, "_");
    const cleanSectionTitle = sectionTitle.replace(/[^a-zA-Z0-9-_]/g, "_");

    let entries = [];

    if (source === "dropbox") {
      let activeToken = token;
      if (!activeToken) {
        try {
          if (fs.existsSync(SETTINGS_FILE)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
            if (settings.dropbox && settings.dropbox.enabled) {
              activeToken = await getDropboxAccessToken(settings);
            }
          }
        } catch (e) {
          console.error("Failed to read dropbox token from settings:", e);
        }
      }
      if (!activeToken) {
        activeToken = process.env.DROPBOX_ACCESS_TOKEN;
      }
      if (!activeToken) {
        res.write(JSON.stringify({ status: "error", error: "Dropbox access token is missing. Please configure it in Account Settings." }) + "\n");
        return res.end();
      }

      console.log(`Scanning Dropbox shared folder: ${folderUrl}`);
      const listResponse = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "",
          shared_link: { url: folderUrl },
        }),
      });

      if (!listResponse.ok) {
        const errText = await listResponse.text();
        let errMsg = errText;
        try {
          const errData = JSON.parse(errText);
          errMsg = errData.error_summary || errText;
        } catch (e) {}
        throw new Error(errMsg || "Failed to list Dropbox folder");
      }

      const listData = await listResponse.json();
      entries = (listData.entries || []).filter((entry) => {
        const ext = entry.name.split(".").pop()?.toLowerCase();
        return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "");
      });

      console.log(`Discovered ${entries.length} images to process from Dropbox.`);
      res.write(JSON.stringify({ status: "discovered", total: entries.length }) + "\n");

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const photoId = crypto.randomUUID();
        const originalName = entry.name;
        const dotIndex = originalName.lastIndexOf(".");
        const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
        const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");

        console.log(`Processing file [${i + 1}/${entries.length}]: ${originalName}`);
        res.write(JSON.stringify({
          status: "processing",
          current: i + 1,
          total: entries.length,
          filename: originalName
        }) + "\n");

        // Download file from Dropbox link
        const dlResponse = await fetch("https://content.dropboxapi.com/2/sharing/get_shared_link_file", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${activeToken}`,
            "Dropbox-API-Arg": JSON.stringify({
              url: folderUrl,
              path: "/" + originalName,
            }),
          },
        });

        if (!dlResponse.ok) {
          console.error(`Failed to download ${originalName} from Dropbox.`);
          continue;
        }

        // Delay 200ms to avoid Dropbox API rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));

        const buffer = Buffer.from(await dlResponse.arrayBuffer());
        const baseSharp = sharp(buffer);

        // Generate previews
        const largeWebpBuffer = await baseSharp.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        const mediumWebpBuffer = await baseSharp.resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        const thumbWebpBuffer = await baseSharp.resize({ width: 300, height: 300, fit: "cover" }).webp({ quality: 75 }).toBuffer();

        const basePath = `${cleanGallerySlug}/${cleanSectionTitle}/${photoId}`;
        const largeKey = `${basePath}/${cleanBaseName}-lg.webp`;
        const mediumKey = `${basePath}/${cleanBaseName}-md.webp`;
        const thumbKey = `${basePath}/${cleanBaseName}-sm.webp`;

        // Upload previews to R2
        await Promise.all([
          uploadToR2(largeKey, largeWebpBuffer, "image/webp"),
          uploadToR2(mediumKey, mediumWebpBuffer, "image/webp"),
          uploadToR2(thumbKey, thumbWebpBuffer, "image/webp"),
        ]);

        // Insert metadata in Supabase
        const storagePath = `dropbox:${folderUrl}:${originalName}`;
        const { error: dbError } = await supabase
          .from("photos")
          .insert({
            id: photoId,
            section_id: sectionId,
            storage_path: storagePath,
            thumbnail_path: thumbKey,
            display_order: i + 1,
            caption: originalName,
          });

        if (dbError) console.error("Database insert error:", dbError);
      }
    } else if (source === "gdrive") {
      let activeKey = token;
      if (!activeKey) {
        try {
          if (fs.existsSync(SETTINGS_FILE)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
            if (settings.gdrive && settings.gdrive.enabled && settings.gdrive.apiKey) {
              activeKey = settings.gdrive.apiKey;
            }
          }
        } catch (e) {
          console.error("Failed to read google drive key from settings:", e);
        }
      }
      if (!activeKey) {
        activeKey = process.env.GOOGLE_API_KEY;
      }
      if (!activeKey) {
        res.write(JSON.stringify({ status: "error", error: "Google API Key is missing. Please configure it in Account Settings." }) + "\n");
        return res.end();
      }

      const match = folderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      const folderId = match ? match[1] : null;

      if (!folderId) {
        res.write(JSON.stringify({ status: "error", error: "Invalid Google Drive folder link" }) + "\n");
        return res.end();
      }

      console.log(`Scanning Google Drive folder: ${folderId}`);
      const listResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name,mimeType)`,
        {
          headers: {
            "x-goog-api-key": activeKey
          }
        }
      );

      if (!listResponse.ok) {
        const errData = await listResponse.json();
        throw new Error(errData.error?.message || "Failed to list Google Drive folder");
      }

      const listData = await listResponse.json();
      entries = listData.files || [];

      console.log(`Discovered ${entries.length} images to process from Google Drive.`);
      res.write(JSON.stringify({ status: "discovered", total: entries.length }) + "\n");

      for (let i = 0; i < entries.length; i++) {
        const fileEntry = entries[i];
        const photoId = crypto.randomUUID();
        const originalName = fileEntry.name;
        const dotIndex = originalName.lastIndexOf(".");
        const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
        const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");

        console.log(`Processing file [${i + 1}/${entries.length}]: ${originalName}`);
        res.write(JSON.stringify({
          status: "processing",
          current: i + 1,
          total: entries.length,
          filename: originalName
        }) + "\n");

        // Download file from GDrive
        const dlResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileEntry.id}?alt=media`,
          {
            headers: {
              "x-goog-api-key": activeKey
            }
          }
        );

        if (!dlResponse.ok) {
          const errBody = await dlResponse.text();
          console.error(`Failed to download ${originalName} from Google Drive. Status: ${dlResponse.status}. Error: ${errBody}`);
          continue;
        }

        // Delay 200ms to avoid Google API rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));

        const buffer = Buffer.from(await dlResponse.arrayBuffer());
        const baseSharp = sharp(buffer);

        // Generate previews
        const largeWebpBuffer = await baseSharp.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        const mediumWebpBuffer = await baseSharp.resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        const thumbWebpBuffer = await baseSharp.resize({ width: 300, height: 300, fit: "cover" }).webp({ quality: 75 }).toBuffer();

        const basePath = `${cleanGallerySlug}/${cleanSectionTitle}/${photoId}`;
        const largeKey = `${basePath}/${cleanBaseName}-lg.webp`;
        const mediumKey = `${basePath}/${cleanBaseName}-md.webp`;
        const thumbKey = `${basePath}/${cleanBaseName}-sm.webp`;

        // Upload previews to R2
        await Promise.all([
          uploadToR2(largeKey, largeWebpBuffer, "image/webp"),
          uploadToR2(mediumKey, mediumWebpBuffer, "image/webp"),
          uploadToR2(thumbKey, thumbWebpBuffer, "image/webp"),
        ]);

        // Insert metadata in Supabase
        const storagePath = `gdrive:${folderUrl}:${fileEntry.id}:${originalName}`;
        const { error: dbError } = await supabase
          .from("photos")
          .insert({
            id: photoId,
            section_id: sectionId,
            storage_path: storagePath,
            thumbnail_path: thumbKey,
            display_order: i + 1,
            caption: originalName,
          });

        if (dbError) console.error("Database insert error:", dbError);
      }
    } else {
      res.write(JSON.stringify({ status: "error", error: "Unsupported source type" }) + "\n");
      return res.end();
    }

    res.write(JSON.stringify({ status: "completed", total: entries.length }) + "\n");
    res.end();
  } catch (error) {
    console.error("Folder sync API Error:", error);
    const message = error instanceof Error ? error.message : "Folder sync failed";
    res.write(JSON.stringify({ status: "error", error: message }) + "\n");
    res.end();
  }
});

app.get("/api/download-external", async (req, res) => {
  try {
    const { photoId } = req.query;
    if (!photoId) return res.status(400).json({ error: "photoId is required" });

    // Fetch photo details using standard anonymous supabase client since photo downloads are public
    const publicSupabase = createClient(supabaseUrl, supabaseKey);
    const { data: photo, error } = await publicSupabase
      .from("photos")
      .select("storage_path")
      .eq("id", photoId)
      .single();

    if (error || !photo) return res.status(404).json({ error: "Photo not found" });

    const path = photo.storage_path;
    if (path.startsWith("dropbox:")) {
      const parts = path.substring(8).split(":");
      const folderUrl = parts.slice(0, -1).join(":");
      const filename = parts[parts.length - 1];

      let token = undefined;
      try {
        if (fs.existsSync(SETTINGS_FILE)) {
          const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
          if (settings.dropbox && settings.dropbox.enabled) {
            token = await getDropboxAccessToken(settings);
          }
        }
      } catch (e) {}
      if (!token) {
        token = process.env.DROPBOX_ACCESS_TOKEN;
      }
      if (!token) return res.status(500).json({ error: "Dropbox Access Token is not configured in settings or environment" });

      const dlResponse = await fetch("https://content.dropboxapi.com/2/sharing/get_shared_link_file", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Dropbox-API-Arg": JSON.stringify({
            url: folderUrl,
            path: "/" + filename,
          }),
        },
      });

      if (!dlResponse.ok) {
        throw new Error("Failed to download file from Dropbox");
      }

      const buffer = Buffer.from(await dlResponse.arrayBuffer());
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", dlResponse.headers.get("content-type") || "application/octet-stream");
      res.send(buffer);
    } else if (path.startsWith("gdrive:")) {
      const parts = path.substring(7).split(":");
      const fileId = parts[2];
      const filename = parts[3] || "image.jpg";

      let apiKey = undefined;
      try {
        if (fs.existsSync(SETTINGS_FILE)) {
          const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
          if (settings.gdrive && settings.gdrive.enabled && settings.gdrive.apiKey) {
            apiKey = settings.gdrive.apiKey;
          }
        }
      } catch (e) {}
      if (!apiKey) {
        apiKey = process.env.GOOGLE_API_KEY;
      }
      if (!apiKey) return res.status(500).json({ error: "Google API Key is not configured in settings or environment" });

      const dlResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            "x-goog-api-key": apiKey
          }
        }
      );

      if (!dlResponse.ok) {
        throw new Error("Failed to download file from Google Drive");
      }

      const buffer = Buffer.from(await dlResponse.arrayBuffer());
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", dlResponse.headers.get("content-type") || "application/octet-stream");
      res.send(buffer);
    } else {
      res.status(400).json({ error: "Not an external photo" });
    }
  } catch (error) {
    console.error("External download error:", error);
    const message = error instanceof Error ? error.message : "External download failed";
    res.status(500).json({ error: message });
  }
});

app.get("/api/settings", (req, res) => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      const defaultSettings = {
        dropbox: { enabled: false, apiKey: "" },
        gdrive: { enabled: false, apiKey: "" },
        onedrive: { enabled: false, apiKey: "" }
      };
      return res.status(200).json(defaultSettings);
    }
    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    res.status(200).json(data);
  } catch (error) {
    console.error("Failed to read settings.json:", error);
    res.status(500).json({ error: "Failed to read settings" });
  }
});

app.post("/api/settings", (req, res) => {
  try {
    const settingsData = req.body;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2), "utf8");
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to write settings.json:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.post("/api/dropbox-auth", async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code || !redirectUri) {
      return res.status(400).json({ error: "code and redirectUri are required" });
    }

    const appKey = "ad1o4zsc1obb539";
    const appSecret = "eeodmq24nbb6ymb";

    const params = new URLSearchParams();
    params.append("code", code);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", redirectUri);

    console.log("Exchanging code for Dropbox refresh token...");
    const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${appKey}:${appSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Dropbox token exchange failed: ${errBody}`);
    }

    const data = await response.json();
    
    // Read current settings
    let currentSettings = {
      dropbox: { enabled: false, apiKey: "" },
      gdrive: { enabled: false, apiKey: "" },
      onedrive: { enabled: false, apiKey: "" }
    };

    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        currentSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      } catch (e) {}
    }

    currentSettings.dropbox = {
      enabled: true,
      apiKey: data.refresh_token, // Store the refresh token in apiKey
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), "utf8");
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Dropbox OAuth code exchange error:", error);
    const message = error instanceof Error ? error.message : "OAuth exchange failed";
    res.status(500).json({ error: message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Upload API Server running on port ${port}`);
});
