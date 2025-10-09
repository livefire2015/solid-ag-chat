import { Component, createSignal, Show, onMount } from 'solid-js';
import type { FileAttachment } from '../services/types';

interface FilePreviewProps {
  file: FileAttachment;
  onClose?: () => void;
  onDownload?: () => void;
  maxWidth?: string;
  maxHeight?: string;
  className?: string;
}

const FilePreview: Component<FilePreviewProps> = (props) => {
  const [imageError, setImageError] = createSignal(false);
  const [textContent, setTextContent] = createSignal<string>('');
  const [isLoading, setIsLoading] = createSignal(false);

  const isImage = () => props.file.type.startsWith('image/');
  const isText = () =>
    props.file.type.startsWith('text/') ||
    props.file.type === 'application/json' ||
    props.file.name.endsWith('.md') ||
    props.file.name.endsWith('.txt') ||
    props.file.name.endsWith('.json');
  const isPDF = () => props.file.type === 'application/pdf';
  const isVideo = () => props.file.type.startsWith('video/');
  const isAudio = () => props.file.type.startsWith('audio/');

  const loadTextContent = async () => {
    if (!isText() || !props.file.data) return;

    try {
      setIsLoading(true);
      let content = '';

      if (typeof props.file.data === 'string') {
        content = props.file.data;
      } else if (props.file.data instanceof ArrayBuffer) {
        content = new TextDecoder().decode(props.file.data);
      }

      setTextContent(content);
    } catch (error) {
      console.error('Error loading text content:', error);
      setTextContent('Error loading file content');
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    if (isText()) {
      loadTextContent();
    }
  });

  const getFileIcon = (size = 'w-16 h-16') => {
    const type = props.file.type;
    const iconClass = `${size} text-gray-400`;

    if (type.startsWith('image/')) {
      return (
        <svg class={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    if (type.startsWith('video/')) {
      return (
        <svg class={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }

    if (type.startsWith('audio/')) {
      return (
        <svg class={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    }

    if (type === 'application/pdf') {
      return (
        <svg class={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }

    return (
      <svg class={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getDataUrl = () => {
    if (!props.file.data) return undefined;

    if (typeof props.file.data === 'string' && props.file.data.startsWith('data:')) {
      return props.file.data;
    }

    if (props.file.url) {
      return props.file.url;
    }

    // If we have binary data, create a blob URL
    if (props.file.data instanceof ArrayBuffer) {
      const blob = new Blob([props.file.data], { type: props.file.type });
      return URL.createObjectURL(blob);
    }

    return undefined;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div
      class={`file-preview bg-white border rounded-lg overflow-hidden ${props.className || ''}`}
      style={{
        'max-width': props.maxWidth || '100%',
        'max-height': props.maxHeight || '100%'
      }}
    >
      {/* Header */}
      <div class="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <div class="text-sm">{getFileIcon('w-4 h-4')}</div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">
              {props.file.name}
            </div>
            <div class="text-xs text-gray-500">
              {formatFileSize(props.file.size)} • {props.file.type}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <Show when={props.onDownload}>
            <button
              onClick={props.onDownload}
              class="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
              title="Download"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </Show>

          <Show when={props.onClose}>
            <button
              onClick={props.onClose}
              class="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
              title="Close"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Show>
        </div>
      </div>

      {/* Content */}
      <div class="p-4">
        {/* Image Preview */}
        <Show when={isImage() && !imageError()}>
          <Show
            when={getDataUrl()}
            fallback={
              <div class="flex items-center justify-center h-48 bg-gray-100 rounded">
                {getFileIcon('w-16 h-16')}
                <div class="ml-2 text-gray-500">No preview available</div>
              </div>
            }
          >
            <img
              src={getDataUrl()}
              alt={props.file.name}
              onError={handleImageError}
              class="max-w-full max-h-96 object-contain rounded mx-auto"
            />
          </Show>
        </Show>

        {/* Text Content */}
        <Show when={isText()}>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">Content Preview</span>
              <button
                onClick={() => copyToClipboard(textContent())}
                class="text-xs text-blue-600 hover:text-blue-800"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>

            <Show when={isLoading()}>
              <div class="text-center py-8 text-gray-500">
                Loading content...
              </div>
            </Show>

            <Show when={!isLoading() && textContent()}>
              <pre class="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-64 whitespace-pre-wrap">
                {textContent()}
              </pre>
            </Show>
          </div>
        </Show>

        {/* Video Preview */}
        <Show when={isVideo()}>
          <Show
            when={getDataUrl()}
            fallback={
              <div class="flex items-center justify-center h-48 bg-gray-100 rounded">
                {getFileIcon('w-16 h-16')}
                <div class="ml-2 text-gray-500">Video preview not available</div>
              </div>
            }
          >
            <video
              src={getDataUrl()}
              controls
              class="max-w-full max-h-96 rounded mx-auto"
            >
              Your browser does not support the video tag.
            </video>
          </Show>
        </Show>

        {/* Audio Preview */}
        <Show when={isAudio()}>
          <Show
            when={getDataUrl()}
            fallback={
              <div class="flex items-center justify-center h-24 bg-gray-100 rounded">
                {getFileIcon('w-8 h-8')}
                <div class="ml-2 text-gray-500">Audio preview not available</div>
              </div>
            }
          >
            <div class="flex items-center justify-center py-4">
              <audio src={getDataUrl()} controls class="w-full max-w-md">
                Your browser does not support the audio tag.
              </audio>
            </div>
          </Show>
        </Show>

        {/* PDF Preview */}
        <Show when={isPDF()}>
          <Show
            when={getDataUrl()}
            fallback={
              <div class="flex items-center justify-center h-48 bg-gray-100 rounded">
                {getFileIcon('w-16 h-16')}
                <div class="ml-2 text-gray-500">PDF preview not available</div>
              </div>
            }
          >
            <div class="border rounded">
              <iframe
                src={getDataUrl()}
                class="w-full h-96"
                title={props.file.name}
              >
                <p>Your browser does not support PDFs.</p>
              </iframe>
            </div>
          </Show>
        </Show>

        {/* Generic File Preview */}
        <Show when={!isImage() && !isText() && !isVideo() && !isAudio() && !isPDF()}>
          <div class="flex flex-col items-center justify-center h-48 bg-gray-50 rounded">
            {getFileIcon('w-16 h-16')}
            <div class="mt-2 text-sm text-gray-600 text-center">
              <div>Preview not available</div>
              <div class="text-xs mt-1">
                {props.file.type || 'Unknown file type'}
              </div>
            </div>
          </div>
        </Show>

        {/* Error State */}
        <Show when={isImage() && imageError()}>
          <div class="flex flex-col items-center justify-center h-48 bg-gray-50 rounded">
            {getFileIcon('w-16 h-16')}
            <div class="mt-2 text-sm text-red-600 text-center">
              Failed to load image
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default FilePreview;