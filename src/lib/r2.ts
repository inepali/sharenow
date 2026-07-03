/**
 * Get the full public URL for an R2 object.
 */
export function getR2Url(path: string): string {
  const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
  return `${publicUrl}/${path}`;
}

/**
 * Format a byte count into a human-readable string (B, KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Download multiple files concurrently with a concurrency limit.
 * Returns an array of results (blob or null on failure).
 */
export async function downloadConcurrent(
  urls: string[],
  concurrency: number = 5,
  onProgress?: (completed: number, total: number) => void
): Promise<(Blob | null)[]> {
  const results: (Blob | null)[] = new Array(urls.length).fill(null);
  let completed = 0;

  const queue = urls.map((url, index) => ({ url, index }));
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        const response = await fetch(item.url);
        results[item.index] = await response.blob();
      } catch {
        results[item.index] = null;
      }
      completed++;
      onProgress?.(completed, urls.length);
    }
  });

  await Promise.all(workers);
  return results;
}
