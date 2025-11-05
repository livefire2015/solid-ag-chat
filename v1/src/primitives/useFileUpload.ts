/**
 * useFileUpload Hook
 *
 * Provides file upload functionality with progress tracking and state management.
 * Handles the complete upload flow: initiate → upload to storage → complete.
 */

import { createSignal } from 'solid-js';
import type { AgUiClient, AttachmentDoc, Id } from '../types';
import { FileUploadApi, type InitiateUploadRequest } from '../services/fileUploadApi';
import { uploadToPresignedUrl, type UploadProgress } from '../services/uploadToPresignedUrl';

export interface UseFileUploadConfig {
  client: AgUiClient;
  conversationId?: string;
  fileUploadApiUrl: string;
  getAuthHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  onProgress?: (fileId: Id, progress: UploadProgress) => void;
  onComplete?: (attachment: AttachmentDoc) => void;
  onError?: (fileId: Id, error: Error) => void;
  // userId and tenantId removed - come from JWT auth on backend
}

export interface FileUploadState {
  fileId: Id;
  file: File;
  progress: UploadProgress;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: Error;
  contentId?: string;
}

/**
 * Hook for uploading files to external storage service
 */
export function useFileUpload(config: UseFileUploadConfig) {
  const [uploads, setUploads] = createSignal<Record<Id, FileUploadState>>({});

  // Create API client
  const fileApi = new FileUploadApi(
    config.fileUploadApiUrl,
    config.getAuthHeaders || (() => ({}))
  );

  /**
   * Upload a single file
   */
  const uploadFile = async (file: File): Promise<Id> => {
    // 1. Generate temporary ID and create optimistic attachment
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimisticAttachment: AttachmentDoc = {
      id: tempId,
      name: file.name,
      mime: file.type,
      size: file.size,
      upload_url: '',
      state: 'pending',
      metadata: {},
    };

    // Initialize upload state
    setUploads((prev) => ({
      ...prev,
      [tempId]: {
        fileId: tempId,
        file,
        progress: { loaded: 0, total: file.size, percentage: 0 },
        status: 'pending',
      },
    }));

    // Don't emit event yet - wait for content_id from backend
    // config.client.emit('attachment.uploading', { attachment: optimisticAttachment });

    try {
      // 2. Initiate upload with external API
      const initiateRequest: InitiateUploadRequest = {
        owner_type: config.conversationId ? 'conversation' : 'user',
        file_name: file.name,
        mime_type: file.type,
        // owner_id (user_uuid) and tenant_id come from JWT auth on backend
      };

      const { content_id, upload_url } = await fileApi.initiateUpload(initiateRequest);

      // Update state with real content_id
      setUploads((prev) => ({
        ...prev,
        [tempId]: {
          ...prev[tempId],
          contentId: content_id,
        },
      }));

      // Update attachment with content_id and uploading status
      const uploadingAttachment: AttachmentDoc = {
        ...optimisticAttachment,
        id: content_id,
        state: 'uploading',
      };

      config.client.emit('attachment.uploading', { attachment: uploadingAttachment });

      // Update local state to uploading
      setUploads((prev) => ({
        ...prev,
        [tempId]: {
          ...prev[tempId],
          status: 'uploading',
        },
      }));

      // 3. Upload file to presigned URL with progress tracking
      await uploadToPresignedUrl(upload_url, file, {
        onProgress: (progress) => {
          setUploads((prev) => ({
            ...prev,
            [tempId]: {
              ...prev[tempId],
              progress,
            },
          }));

          // Emit progress event
          config.client.emit('attachment.progress', { fileId: content_id, progress });
          config.onProgress?.(content_id, progress);
        },
        timeout: 5 * 60 * 1000, // 5 minutes
      });

      // 4. Mark upload complete
      const result = await fileApi.uploadComplete(content_id);

      // 5. Create final attachment with available status
      const completedAttachment: AttachmentDoc = {
        id: content_id,
        name: file.name,
        mime: file.type,
        size: file.size,
        upload_url: upload_url, // Use presigned URL (or get download URL from result)
        state: result.status === 'available' ? 'available' : 'uploaded',
        metadata: {},
      };

      // Update local state
      setUploads((prev) => ({
        ...prev,
        [tempId]: {
          ...prev[tempId],
          status: 'completed',
          contentId: content_id,
        },
      }));

      // Emit available event
      config.client.emit('attachment.available', { attachment: completedAttachment });
      config.onComplete?.(completedAttachment);

      // Clean up temp ID after short delay
      setTimeout(() => {
        setUploads((prev) => {
          const updated = { ...prev };
          delete updated[tempId];
          return updated;
        });
      }, 1000);

      return content_id;
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('Upload failed');

      // Update local state
      setUploads((prev) => ({
        ...prev,
        [tempId]: {
          ...prev[tempId],
          status: 'failed',
          error: uploadError,
        },
      }));

      // Emit failed event
      config.client.emit('attachment.failed', {
        fileId: uploads()[tempId]?.contentId || tempId,
        error: {
          code: 'UPLOAD_FAILED',
          message: uploadError.message,
          details: uploadError,
        },
      });

      config.onError?.(uploads()[tempId]?.contentId || tempId, uploadError);

      throw uploadError;
    }
  };

  /**
   * Upload multiple files
   */
  const uploadFiles = async (files: File[]): Promise<Id[]> => {
    const uploadPromises = files.map((file) => uploadFile(file));
    return Promise.all(uploadPromises);
  };

  /**
   * Cancel an ongoing upload
   */
  const cancelUpload = (fileId: Id) => {
    // TODO: Implement abort controller support
    setUploads((prev) => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
  };

  /**
   * Clear completed/failed uploads
   */
  const clearUploads = () => {
    setUploads((prev) => {
      const filtered: Record<Id, FileUploadState> = {};
      Object.entries(prev).forEach(([id, state]) => {
        if (state.status === 'uploading' || state.status === 'pending') {
          filtered[id] = state;
        }
      });
      return filtered;
    });
  };

  return {
    uploads,
    uploadFile,
    uploadFiles,
    cancelUpload,
    clearUploads,
  };
}
