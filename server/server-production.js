import express from "express";
import multer from "multer";
import cors from "cors";
import sharp from "sharp";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: SECURITY HEADERS & CORS
// ─────────────────────────────────────────────────────────────────────────────

// Apply security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.supabase.co"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: "deny" },
  noSniff: true,
  xssFilter: true,
}));

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: CORS CONFIGURATION (HARDENED)
// ─────────────────────────────────────────────────────────────────────────────

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
if (!allowedOriginsEnv) {
  console.error("CRITICAL ERROR: ALLOWED_ORIGINS environment variable is not set");
  console.error("Set ALLOWED_ORIGINS to a comma-separated list of frontend URLs");
  process.exit(1);
}

const corsOptions = {
  origin: allowedOriginsEnv.split(",").map((o) => o.trim()),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: ENVIRONMENT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

const requiredEnvVars = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
];

const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`CRITICAL ERROR: Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: R2 CLIENT SETUP
// ─────────────────────────────────────────────────────────────────────────────

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5: SUPABASE CLIENT SETUP
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 6: LOGGING & ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

const logLevels = {
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  DEBUG: "DEBUG",
};

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
  };
  console.log(JSON.stringify(logEntry));
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 7: AUTHENTICATION MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

async function validateUserToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      log(logLevels.WARN, "Missing or invalid authorization header");
      return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      log(logLevels.WARN, "Invalid JWT token", { error: error?.message });
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    req.user = user;
    next();
  } catch (err) {
    log(logLevels.ERROR, "Auth middleware error", { error: err.message });
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 8: INPUT VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const uploadBodySchema = z.object({
  galleryId: z.string().uuid("Invalid gallery ID"),
  sectionId: z.string().uuid("Invalid section ID"),
  displayOrder: z.coerce.number().int().min(0),
  caption: z.string().max(500).optional().nullable(),
  gallerySlug: z.string().max(100).optional(),
  sectionTitle: z.string().max(100).optional(),
});

const galleryStatsSchema = z.object({
  prefixes: z.array(z.string().max(200)).min(1).max(50),
});

const syncFolderSchema = z.object({
  source: z.enum(["dropbox", "gdrive"]),
  folderUrl: z.string().url(),
  token: z.string().optional(),
  galleryId: z.string().uuid(),
  sectionId: z.string().uuid(),
  gallerySlug: z.string().max(100),
  sectionTitle: z.string().max(100),
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 9: RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: "Too many uploads, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
});

const settingsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 10: FILE UPLOAD CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`));
    } else {
      cb(null, true);
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 11: HEALTH CHECK ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 12: R2 UPLOAD HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function uploadToR2(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000", // 1 year for immutable assets
  });
  await s3Client.send(command);
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 13: UPLOAD ENDPOINT (SECURED)
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/upload", validateUserToken, uploadLimiter, upload.single("file"), async (req, res) => {
  let photoId;
  try {
    photoId = crypto.randomUUID();
    const { file } = req;

    // Validate input
    const validation = uploadBodySchema.safeParse(req.body);
    if (!validation.success) {
      log(logLevels.WARN, "Upload validation failed", { userId: req.user.id, errors: validation.error.errors });
      return res.status(400).json({ error: "Invalid request parameters", details: validation.error.errors });
    }

    const { galleryId, sectionId, displayOrder, caption, gallerySlug, sectionTitle } = validation.data;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    log(logLevels.INFO, "Processing upload", {
      userId: req.user.id,
      photoId,
      galleryId,
      fileName: file.originalname,
      fileSize: file.size,
    });

    // Create supabase client for this user
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.authorization },
      },
    });

    // Verify user owns the gallery
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .select("id")
      .eq("id", galleryId)
      .single();

    if (galleryError || !gallery) {
      log(logLevels.WARN, "Gallery access denied", { userId: req.user.id, galleryId });
      return res.status(403).json({ error: "Access denied: Gallery not found or not owned by user" });
    }

    // Process images
    const originalName = file.originalname;
    const dotIndex = originalName.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
    const originalExt = dotIndex !== -1 ? originalName.substring(dotIndex + 1).toLowerCase() : "jpg";
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 50);

    // Generate variants
    const [largeWebp, mediumWebp, thumbWebp] = await Promise.all([
      sharp(file.buffer)
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
      sharp(file.buffer)
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
      sharp(file.buffer)
        .resize({ width: 300, height: 300, fit: "cover" })
        .webp({ quality: 75 })
        .toBuffer(),
    ]);

    // Upload to R2
    let basePath = `Gallery/${galleryId}/${sectionId}/${photoId}`;
    if (gallerySlug && sectionTitle) {
      const cleanGallerySlug = gallerySlug.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 50);
      const cleanSectionTitle = sectionTitle.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 50);
      basePath = `${cleanGallerySlug}/${cleanSectionTitle}/${photoId}`;
    }

    const originalKey = `${basePath}/${cleanBaseName}.${originalExt}`;
    const largeKey = `${basePath}/${cleanBaseName}-lg.webp`;
    const mediumKey = `${basePath}/${cleanBaseName}-md.webp`;
    const thumbKey = `${basePath}/${cleanBaseName}-sm.webp`;

    await Promise.all([
      uploadToR2(originalKey, file.buffer, file.mimetype),
      uploadToR2(largeKey, largeWebp, "image/webp"),
      uploadToR2(mediumKey, mediumWebp, "image/webp"),
      uploadToR2(thumbKey, thumbWebp, "image/webp"),
    ]);

    // Save to database
    const { data, error: dbError } = await supabase
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

    if (dbError) {
      log(logLevels.ERROR, "Database insert failed", { userId: req.user.id, photoId, error: dbError.message });
      throw new Error(`Database error: ${dbError.message}`);
    }

    log(logLevels.INFO, "Upload completed", { userId: req.user.id, photoId });
    res.status(200).json({ success: true, photo: data });
  } catch (error) {
    log(logLevels.ERROR, "Upload error", {
      photoId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });

    if (res.headersSent) return;
    const message = error instanceof Error ? error.message : "Failed to process and upload image";
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 14: GALLERY STATS ENDPOINT (SECURED)
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/gallery-stats", validateUserToken, apiLimiter, async (req, res) => {
  try {
    const validation = galleryStatsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
    }

    const { prefixes } = validation.data;
    let totalSize = 0;
    let photoCount = 0;

    for (const prefix of prefixes) {
      let isTruncated = true;
      let continuationToken = undefined;

      while (isTruncated) {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        });

        const response = await s3Client.send(command);

        if (response.Contents) {
          const originals = response.Contents.filter((obj) => {
            if (!obj.Key) return false;
            const lowerKey = obj.Key.toLowerCase();
            if (lowerKey.endsWith("-lg.webp") || lowerKey.endsWith("-md.webp") || lowerKey.endsWith("-sm.webp")) {
              return false;
            }
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
    log(logLevels.ERROR, "Gallery stats error", { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Failed to fetch gallery stats" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 15: SECURE SETTINGS ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

const SETTINGS_FILE = process.env.SETTINGS_FILE || "./settings.json";

app.get("/api/settings", validateUserToken, apiLimiter, (req, res) => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      const defaults = {
        dropbox: { enabled: false },
        gdrive: { enabled: false },
        onedrive: { enabled: false },
      };
      return res.status(200).json(defaults);
    }

    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    const sanitized = {
      dropbox: { enabled: data.dropbox?.enabled || false },
      gdrive: { enabled: data.gdrive?.enabled || false },
      onedrive: { enabled: data.onedrive?.enabled || false },
    };
    res.status(200).json(sanitized);
  } catch (error) {
    log(logLevels.ERROR, "Settings read error", { error: error.message });
    res.status(500).json({ error: "Failed to read settings" });
  }
});

app.post("/api/settings", validateUserToken, settingsLimiter, express.json(), (req, res) => {
  try {
    const { dropbox, gdrive, onedrive } = req.body || {};

    const settingsData = {
      dropbox: dropbox || { enabled: false },
      gdrive: gdrive || { enabled: false },
      onedrive: onedrive || { enabled: false },
      lastUpdated: new Date().toISOString(),
      updatedBy: req.user.id,
    };

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2), "utf8");
    log(logLevels.INFO, "Settings updated", { userId: req.user.id });
    res.status(200).json({ success: true });
  } catch (error) {
    log(logLevels.ERROR, "Settings write error", { error: error.message });
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 16: ERROR HANDLING MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  log(logLevels.ERROR, "Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.errors });
  }

  res.status(500).json({ error: "Internal server error" });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 17: 404 HANDLER
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 18: GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

process.on("unhandledRejection", (reason, promise) => {
  log(logLevels.ERROR, "Unhandled rejection", { reason, promise });
});

process.on("uncaughtException", (error) => {
  log(logLevels.ERROR, "Uncaught exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 19: SERVER STARTUP
// ─────────────────────────────────────────────────────────────────────────────

const server = app.listen(port, () => {
  log(logLevels.INFO, "Server started", { port });
});

export default app;
