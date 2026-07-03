import express from "express";
import multer from "multer";
import cors from "cors";
import sharp from "sharp";
import dotenv from "dotenv";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

    // Create the sharp instance from the uploaded file buffer
    const baseSharp = sharp(file.buffer);

    // Extract original extension (e.g. jpg, png) and base filename
    const originalName = file.originalname;
    const dotIndex = originalName.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
    const originalExt = dotIndex !== -1 ? originalName.substring(dotIndex + 1).toLowerCase() : "jpg";
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");

    // 1. Process large size (max 2000px wide/high)
    const largeWebpBuffer = await baseSharp
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 2. Process medium size (max 1200px wide/high)
    const mediumWebpBuffer = await baseSharp
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 3. Process thumb size (max 300px wide/high)
    const thumbWebpBuffer = await baseSharp
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

// Start server
app.listen(port, () => {
  console.log(`Upload API Server running on port ${port}`);
});
