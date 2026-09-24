import { getR2Url } from "./r2";
import { getApiUrl } from "./api";

interface ResponsiveUrls {
  original: string;
  thumb: string;
  medium: string;
  large: string;
}

/**
 * Given a storage path, returns responsive R2 URLs.
 * Detects new Gallery WebP multi-size format and falls back to original path for legacy images.
 */
export function getResponsiveUrls(
  storagePath: string,
  thumbnailPath?: string | null,
  photoId?: string
): ResponsiveUrls {
  // Check if this is an external photo
  if (storagePath.startsWith("dropbox:") || storagePath.startsWith("gdrive:")) {
    const originalUrl = photoId 
      ? getApiUrl(`/api/download-external?photoId=${photoId}`)
      : storagePath;

    const thumbUrl = thumbnailPath ? getR2Url(thumbnailPath) : originalUrl;
    let mediumUrl = thumbUrl;
    let largeUrl = thumbUrl;

    if (thumbnailPath) {
      const parts = thumbnailPath.split("/");
      const fileName = parts.pop() || "";
      const dirPath = parts.join("/");
      const baseName = fileName.replace("-sm.webp", "");
      mediumUrl = getR2Url(`${dirPath}/${baseName}-md.webp`);
      largeUrl = getR2Url(`${dirPath}/${baseName}-lg.webp`);
    }

    return {
      original: originalUrl,
      thumb: thumbUrl,
      medium: mediumUrl,
      large: largeUrl,
    };
  }

  const parts = storagePath.split("/");

  // Newest format: gallerySlug/photoId/filename.ext (3 segments) — photos
  // uploaded directly under the album folder, not nested by section
  if (parts.length === 3) {
    const fileName = parts.pop() || "";
    const dirPath = parts.join("/");

    const dotIndex = fileName.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;

    return {
      original: getR2Url(storagePath),
      thumb: getR2Url(`${dirPath}/${baseName}-sm.webp`),
      medium: getR2Url(`${dirPath}/${baseName}-md.webp`),
      large: getR2Url(`${dirPath}/${baseName}-lg.webp`),
    };
  }

  // Previous format: gallerySlug/sectionTitle/photoId/filename.ext (4 segments)
  if (parts.length === 4) {
    const fileName = parts.pop() || "";
    const dirPath = parts.join("/");
    
    const dotIndex = fileName.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;

    return {
      original: getR2Url(storagePath),
      thumb: getR2Url(`${dirPath}/${baseName}-sm.webp`),
      medium: getR2Url(`${dirPath}/${baseName}-md.webp`),
      large: getR2Url(`${dirPath}/${baseName}-lg.webp`),
    };
  }

  // Transition format: Gallery/galleryId/sectionId/photoId/filename.ext (5 segments)
  if (parts.length === 5 && parts[0] === "Gallery") {
    const fileName = parts.pop() || "";
    const dirPath = parts.join("/");
    
    const dotIndex = fileName.lastIndexOf(".");
    const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
    
    // Support transitioning from 'original.webp' to custom original filenames
    const thumbName = baseName === "original" ? "thumb.webp" : `${baseName}-sm.webp`;
    const mediumName = baseName === "original" ? "medium.webp" : `${baseName}-md.webp`;
    const largeName = baseName === "original" ? "large.webp" : `${baseName}-lg.webp`;

    return {
      original: getR2Url(storagePath),
      thumb: getR2Url(`${dirPath}/${thumbName}`),
      medium: getR2Url(`${dirPath}/${mediumName}`),
      large: getR2Url(`${dirPath}/${largeName}`),
    };
  }

  // Fallback for legacy images
  const originalUrl = getR2Url(storagePath);
  return {
    original: originalUrl,
    thumb: originalUrl,
    medium: originalUrl,
    large: originalUrl,
  };
}
