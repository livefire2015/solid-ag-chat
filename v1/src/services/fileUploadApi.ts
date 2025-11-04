/**
 * External File Upload API Client
 *
 * Handles communication with the external file upload service.
 * Provides methods for initiating uploads and marking them complete.
 */

export interface InitiateUploadRequest {
  owner_id: string;
  owner_type: 'conversation' | 'user';
  tenant_id: string;
  file_name: string;
  mime_type: string;
  document_type?: string;
  storage_backend_name?: string;
}

export interface InitiateUploadResponse {
  content_id: string;
  upload_url: string;
}

export interface UploadCompleteRequest {
  content_id: string;
}

export interface UploadCompleteResponse {
  status: 'uploaded' | 'processing' | 'available';
}

export class FileUploadApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'FileUploadApiError';
  }
}

export class FileUploadApi {
  constructor(
    private apiUrl: string,
    private getAuthHeaders: () => Promise<Record<string, string>> | Record<string, string>
  ) {}

  /**
   * Initiate a file upload and get a presigned URL
   */
  async initiateUpload(
    request: InitiateUploadRequest
  ): Promise<InitiateUploadResponse> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.apiUrl}/upload/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new FileUploadApiError(
          errorData.message || `Upload initiate failed: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof FileUploadApiError) {
        throw error;
      }
      throw new FileUploadApiError(
        `Network error during upload initiate: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Mark an upload as complete
   */
  async uploadComplete(
    contentId: string
  ): Promise<UploadCompleteResponse> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.apiUrl}/upload/done`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ content_id: contentId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new FileUploadApiError(
          errorData.message || `Upload complete failed: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof FileUploadApiError) {
        throw error;
      }
      throw new FileUploadApiError(
        `Network error during upload complete: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
