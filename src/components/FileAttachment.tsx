import { Component, createSignal, Show, For, onMount, onCleanup } from 'solid-js';
import type { FileAttachment as FileAttachmentType } from '../services/types';

interface FileAttachmentProps {
  files: FileAttachmentType[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  onFileRetry: (fileId: string) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  disabled?: boolean;
  multiple?: boolean;
  className?: string;
}

const FileAttachment: Component<FileAttachmentProps> = (props) => {
  const [isDragOver, setIsDragOver] = createSignal(false);
  let fileInputRef: HTMLInputElement | undefined;
  let dropZoneRef: HTMLDivElement | undefined;

  const maxFiles = () => props.maxFiles || 10;
  const maxFileSize = () => props.maxFileSize || 10 * 1024 * 1024; // 10MB
  const allowedTypes = () => props.allowedTypes || ['image/*', 'text/*', 'application/pdf', 'application/json'];

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize()) {
      return `File size exceeds ${formatFileSize(maxFileSize())}`;
    }

    const isAllowed = allowedTypes().some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return `File type ${file.type} is not allowed`;
    }

    return null;
  };

  const handleFiles = (fileList: FileList) => {
    const files = Array.from(fileList);
    const currentCount = props.files.length;
    const remainingSlots = maxFiles() - currentCount;

    if (files.length > remainingSlots) {
      alert(`Can only add ${remainingSlots} more files. Maximum is ${maxFiles()}.`);
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(`Some files could not be added:\n${errors.join('\n')}`);
    }

    if (validFiles.length > 0) {
      props.onFilesAdd(validFiles);
    }
  };

  const handleFileInputChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      handleFiles(target.files);
      target.value = '';
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (props.disabled) return;

    const files = event.dataTransfer?.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!props.disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set drag over to false if we're leaving the drop zone itself
    const rect = dropZoneRef?.getBoundingClientRect();
    if (rect && (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )) {
      setIsDragOver(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type === 'application/pdf') return '📄';
    if (type.includes('text/') || type.includes('json')) return '📝';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    return '📁';
  };

  const openFileSelector = () => {
    if (!props.disabled) {
      fileInputRef?.click();
    }
  };

  // Setup global drag and drop prevention
  onMount(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleWindowDrop = (e: DragEvent) => {
      preventDefaults(e);
      // Only handle drop if it's outside our drop zone
      if (!dropZoneRef?.contains(e.target as Node)) {
        // Prevent browser from opening the file
      }
    };

    window.addEventListener('dragenter', preventDefaults);
    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', handleWindowDrop);

    onCleanup(() => {
      window.removeEventListener('dragenter', preventDefaults);
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', handleWindowDrop);
    });
  });

  return (
    <div class={`file-attachment ${props.className || ''}`}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={props.multiple !== false}
        accept={allowedTypes().join(',')}
        onChange={handleFileInputChange}
        class="hidden"
        disabled={props.disabled}
      />

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileSelector}
        class={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragOver()
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-300 hover:border-gray-400 text-gray-600'
          }
          ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
        `}
      >
        <div class="space-y-2">
          <div class="text-3xl">📎</div>
          <div class="text-sm font-medium">
            {isDragOver() ? 'Drop files here' : 'Click to upload or drag and drop'}
          </div>
          <div class="text-xs text-gray-500">
            {allowedTypes().join(', ')} • Max {formatFileSize(maxFileSize())} per file
          </div>
          <div class="text-xs text-gray-500">
            {props.files.length}/{maxFiles()} files
          </div>
        </div>
      </div>

      {/* File List */}
      <Show when={props.files.length > 0}>
        <div class="mt-4 space-y-2">
          <For each={props.files}>
            {(file) => (
              <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <div class="text-lg">{getFileIcon(file.type)}</div>

                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </div>
                  <div class="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.type}
                  </div>

                  {/* Upload Progress */}
                  <Show when={file.uploadProgress !== undefined && file.uploadProgress < 100}>
                    <div class="mt-1">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            class="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${file.uploadProgress}%` }}
                          />
                        </div>
                        <span class="text-xs text-gray-500">
                          {file.uploadProgress}%
                        </span>
                      </div>
                    </div>
                  </Show>

                  {/* Error Message */}
                  <Show when={file.error}>
                    <div class="text-xs text-red-600 mt-1">
                      {file.error}
                    </div>
                  </Show>
                </div>

                {/* Action Buttons */}
                <div class="flex items-center gap-1">
                  {/* Retry Button */}
                  <Show when={file.error}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onFileRetry(file.id);
                      }}
                      class="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                      title="Retry upload"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </Show>

                  {/* Success Indicator */}
                  <Show when={file.uploaded && !file.error}>
                    <div class="text-green-600" title="Uploaded successfully">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </Show>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onFileRemove(file.id);
                    }}
                    class="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                    title="Remove file"
                    disabled={props.disabled}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* File Count Indicator */}
      <Show when={props.files.length > 0}>
        <div class="mt-2 text-xs text-gray-500 text-center">
          {props.files.filter(f => f.uploaded).length} of {props.files.length} files uploaded
        </div>
      </Show>
    </div>
  );
};

export default FileAttachment;