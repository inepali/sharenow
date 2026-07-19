import { supabase } from "@/integrations/supabase/client";

export interface UploadedPhoto {
  id: string;
  section_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  display_order: number;
  caption: string | null;
}

export interface UploadPhotoParams {
  file: File;
  galleryId: string;
  sectionId: string;
  displayOrder: number;
  gallerySlug: string;
  sectionTitle: string;
  caption?: string;
  onProgress?: (percent: number) => void;
}

const LARGE_MAX = 2000;
const MEDIUM_MAX = 1200;
const THUMB_SIZE = 300;

type ImageSource = ImageBitmap | HTMLImageElement;

async function decodeImage(file: File): Promise<ImageSource> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Fallback for formats/browsers where createImageBitmap fails
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not decode image: ${file.name}`));
      };
      img.src = url;
    });
  }
}

function sourceSize(source: ImageSource): { width: number; height: number } {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

function toBlobAsync(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Encode as WebP; Safari doesn't support WebP encoding and silently returns
// PNG, so fall back to JPEG there. Keys keep the .webp name either way —
// R2 serves the stored Content-Type, which is what browsers honor.
async function encodeCanvas(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<{ blob: Blob; contentType: string }> {
  const webp = await toBlobAsync(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") {
    return { blob: webp, contentType: "image/webp" };
  }
  const jpeg = await toBlobAsync(canvas, "image/jpeg", quality);
  if (!jpeg) {
    throw new Error("Image encoding failed");
  }
  return { blob: jpeg, contentType: "image/jpeg" };
}

// Fit within max×max without enlarging (sharp's fit: "inside")
function drawInside(source: ImageSource, max: number): HTMLCanvasElement {
  const { width, height } = sourceSize(source);
  const scale = Math.min(max / width, max / height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Fill size×size with a centered crop (sharp's fit: "cover")
function drawCover(source: ImageSource, size: number): HTMLCanvasElement {
  const { width, height } = sourceSize(source);
  const scale = Math.max(size / width, size / height);
  const drawW = Math.round(width * scale);
  const drawH = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");
  ctx.drawImage(source, Math.round((size - drawW) / 2), Math.round((size - drawH) / 2), drawW, drawH);
  return canvas;
}

async function getPresignedUrl(fileName: string, contentType: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("r2-presigned-url", {
    body: { fileName, contentType },
  });
  if (error || !data?.url) {
    throw new Error("Failed to get an upload URL from storage");
  }
  return data.url;
}

function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onBytes: (delta: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);

    let lastLoaded = 0;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onBytes(event.loaded - lastLoaded);
        lastLoaded = event.loaded;
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Storage upload failed (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(body);
  });
}

/**
 * Upload a photo entirely from the browser: resize to -sm/-md/-lg WebP
 * variants with canvas, PUT the original plus variants directly to R2 via
 * presigned URLs, then insert the photo row. No upload server involved.
 */
export async function uploadPhoto(params: UploadPhotoParams): Promise<UploadedPhoto> {
  const { file, galleryId, sectionId, displayOrder, gallerySlug, sectionTitle, caption, onProgress } = params;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("You must be signed in to upload photos");
  }

  const source = await decodeImage(file);
  const [large, medium, thumb] = [
    await encodeCanvas(drawInside(source, LARGE_MAX), 0.8),
    await encodeCanvas(drawInside(source, MEDIUM_MAX), 0.8),
    await encodeCanvas(drawCover(source, THUMB_SIZE), 0.75),
  ];
  if (source instanceof ImageBitmap) source.close();

  const photoId = crypto.randomUUID();

  // Same key structure the old upload server produced, so
  // getResponsiveUrls() and delete logic keep working
  const originalName = file.name;
  const dotIndex = originalName.lastIndexOf(".");
  const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  const originalExt = dotIndex !== -1 ? originalName.substring(dotIndex + 1).toLowerCase() : "jpg";
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");

  let basePath = `Gallery/${galleryId}/${sectionId}/${photoId}`;
  if (gallerySlug && sectionTitle) {
    const cleanGallerySlug = gallerySlug.replace(/[^a-zA-Z0-9-_]/g, "_");
    const cleanSectionTitle = sectionTitle.replace(/[^a-zA-Z0-9-_]/g, "_");
    basePath = `${cleanGallerySlug}/${cleanSectionTitle}/${photoId}`;
  }

  const originalKey = `${basePath}/${cleanBaseName}.${originalExt}`;
  const thumbKey = `${basePath}/${cleanBaseName}-sm.webp`;

  const uploads: { key: string; blob: Blob; contentType: string }[] = [
    { key: originalKey, blob: file, contentType: file.type || "application/octet-stream" },
    { key: `${basePath}/${cleanBaseName}-lg.webp`, blob: large.blob, contentType: large.contentType },
    { key: `${basePath}/${cleanBaseName}-md.webp`, blob: medium.blob, contentType: medium.contentType },
    { key: thumbKey, blob: thumb.blob, contentType: thumb.contentType },
  ];

  const totalBytes = uploads.reduce((sum, u) => sum + u.blob.size, 0);
  let uploadedBytes = 0;
  const reportBytes = (delta: number) => {
    uploadedBytes += delta;
    onProgress?.(Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)));
  };

  await Promise.all(
    uploads.map(async (u) => {
      const url = await getPresignedUrl(u.key, u.contentType);
      await putWithProgress(url, u.blob, u.contentType, reportBytes);
    })
  );

  const { data, error } = await supabase
    .from("photos")
    .insert({
      id: photoId,
      section_id: sectionId,
      storage_path: originalKey,
      thumbnail_path: thumbKey,
      display_order: displayOrder,
      caption: caption || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
