/**
 * Upload file to presigned URL with progress tracking
 *
 * Uses XMLHttpRequest for progress events (fetch doesn't support upload progress)
 */

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type ProgressCallback = (progress: UploadProgress) => void;

export class UploadError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export interface UploadOptions {
  onProgress?: ProgressCallback;
  timeout?: number; // milliseconds, default 5 minutes
  abortSignal?: AbortSignal;
}

/**
 * Upload file to a presigned URL with progress tracking
 *
 * @param url Presigned URL from external API
 * @param file File object to upload
 * @param options Upload options (progress callback, timeout, abort signal)
 * @returns Promise that resolves when upload completes
 */
export function uploadToPresignedUrl(
  url: string,
  file: File,
  options: UploadOptions = {}
): Promise<void> {
  const { onProgress, timeout = 5 * 60 * 1000, abortSignal } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort signal
    const handleAbort = () => {
      xhr.abort();
      reject(new UploadError('Upload aborted by user'));
    };

    if (abortSignal) {
      if (abortSignal.aborted) {
        reject(new UploadError('Upload aborted before starting'));
        return;
      }
      abortSignal.addEventListener('abort', handleAbort);
    }

    // Set timeout
    xhr.timeout = timeout;

    // Progress tracking
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          };
          onProgress(progress);
        }
      });
    }

    // Success
    xhr.addEventListener('load', () => {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', handleAbort);
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new UploadError(
            `Upload failed with status ${xhr.status}: ${xhr.statusText}`,
            xhr.status
          )
        );
      }
    });

    // Error
    xhr.addEventListener('error', () => {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', handleAbort);
      }
      reject(new UploadError('Network error during upload'));
    });

    // Timeout
    xhr.addEventListener('timeout', () => {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', handleAbort);
      }
      reject(new UploadError(`Upload timed out after ${timeout}ms`));
    });

    // Abort
    xhr.addEventListener('abort', () => {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', handleAbort);
      }
      reject(new UploadError('Upload aborted'));
    });

    // Start upload
    xhr.open('PUT', url);

    // Set content type from file
    if (file.type) {
      xhr.setRequestHeader('Content-Type', file.type);
    }

    xhr.send(file);
  });
}
