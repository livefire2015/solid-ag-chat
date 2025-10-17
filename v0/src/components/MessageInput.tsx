import { Component, createSignal, Show, onMount } from 'solid-js';
import FileAttachment from './FileAttachment';
import type { FileAttachment as FileAttachmentType } from '../services/types';

export interface MessageInputHandle {
  setInputValue: (text: string) => void;
  focus: () => void;
  clear: () => void;
}

interface MessageInputProps {
  onSendMessage: (message: string, files?: FileAttachmentType[]) => void;
  disabled: boolean;
  enableFileAttachments?: boolean;
  enableMarkdown?: boolean;
  placeholder?: string;
  maxFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  autoSave?: boolean;
  onTyping?: (isTyping: boolean) => void;
  ref?: (handle: MessageInputHandle) => void;
}

const MessageInput: Component<MessageInputProps> = (props) => {
  const [message, setMessage] = createSignal('');
  const [files, setFiles] = createSignal<FileAttachmentType[]>([]);
  const [isMarkdownMode, setIsMarkdownMode] = createSignal(false);
  const [showFileAttachment, setShowFileAttachment] = createSignal(false);
  const [messageHistory, setMessageHistory] = createSignal<string[]>([]);
  const [historyIndex, setHistoryIndex] = createSignal(-1);
  const [isTyping, setIsTyping] = createSignal(false);
  let textareaRef: HTMLTextAreaElement | undefined;
  let typingTimer: number | undefined;

  // Public methods for parent component access
  const setInputValue = (text: string) => {
    setMessage(text);
    setTimeout(() => {
      autoResize();
      if (textareaRef) {
        textareaRef.focus();
      }
    }, 0);
  };

  const focusInput = () => {
    if (textareaRef) {
      textareaRef.focus();
    }
  };

  const clearInput = () => {
    setMessage('');
    setFiles([]);
    clearDraft();
    setTimeout(autoResize, 0);
  };

  const placeholder = () =>
    props.placeholder ||
    (isMarkdownMode()
      ? 'Type your message in Markdown... (Press Enter to send, Shift+Enter for new line)'
      : 'Type your message... (Press Enter to send, Shift+Enter for new line)');

  // Auto-resize textarea
  const autoResize = () => {
    if (textareaRef) {
      textareaRef.style.height = 'auto';
      textareaRef.style.height = Math.min(textareaRef.scrollHeight, 200) + 'px';
    }
  };

  // Handle typing indicators
  const handleTyping = () => {
    if (!isTyping()) {
      setIsTyping(true);
      props.onTyping?.(true);
    }

    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    typingTimer = setTimeout(() => {
      setIsTyping(false);
      props.onTyping?.(false);
    }, 1000);
  };

  // Auto-save draft
  const saveDraft = () => {
    if (props.autoSave && message().trim()) {
      localStorage.setItem('agui-chat-draft', message());
    }
  };

  // Load draft
  const loadDraft = () => {
    if (props.autoSave) {
      const draft = localStorage.getItem('agui-chat-draft');
      if (draft) {
        setMessage(draft);
        setTimeout(autoResize, 0);
      }
    }
  };

  // Clear draft
  const clearDraft = () => {
    if (props.autoSave) {
      localStorage.removeItem('agui-chat-draft');
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const trimmedMessage = message().trim();

    if ((trimmedMessage || files().length > 0) && !props.disabled) {
      // Add to history
      if (trimmedMessage && !messageHistory().includes(trimmedMessage)) {
        setMessageHistory(prev => [trimmedMessage, ...prev.slice(0, 49)]); // Keep last 50
      }

      // Send message with files
      const messageFiles = files().filter(f => f.uploaded);
      props.onSendMessage(trimmedMessage, messageFiles.length > 0 ? messageFiles : undefined);

      // Clear inputs
      setMessage('');
      setFiles([]);
      setHistoryIndex(-1);
      clearDraft();

      // Reset height
      setTimeout(autoResize, 0);

      // Stop typing indicator
      setIsTyping(false);
      props.onTyping?.(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'ArrowUp' && message() === '' && messageHistory().length > 0) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex() + 1, messageHistory().length - 1);
      setHistoryIndex(newIndex);
      setMessage(messageHistory()[newIndex]);
      setTimeout(autoResize, 0);
    } else if (e.key === 'ArrowDown' && historyIndex() >= 0) {
      e.preventDefault();
      const newIndex = historyIndex() - 1;
      setHistoryIndex(newIndex);
      setMessage(newIndex >= 0 ? messageHistory()[newIndex] : '');
      setTimeout(autoResize, 0);
    } else if (e.key === 'Tab' && props.enableMarkdown) {
      e.preventDefault();
      // Insert tab character for code blocks
      const target = e.currentTarget as HTMLTextAreaElement;
      if (target) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = message();
        setMessage(value.substring(0, start) + '  ' + value.substring(end));
        setTimeout(() => {
          if (textareaRef) {
            textareaRef.selectionStart = textareaRef.selectionEnd = start + 2;
          }
        }, 0);
      }
    }

    handleTyping();
  };

  const handleInput = (e: Event) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    setMessage(target.value);
    autoResize();
    handleTyping();
    saveDraft();
  };

  const handlePaste = async (e: ClipboardEvent) => {
    if (!props.enableFileAttachments) return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Handle file paste
    const items = Array.from(clipboardData.items);
    const fileItems = items.filter(item => item.kind === 'file');

    if (fileItems.length > 0) {
      e.preventDefault();
      const newFiles = fileItems.map(item => item.getAsFile()).filter(Boolean) as File[];
      if (newFiles.length > 0) {
        handleFilesAdd(newFiles);
      }
    }
  };

  const handleFilesAdd = (newFiles: File[]) => {
    const existingFiles = files();
    const maxFiles = props.maxFiles || 10;

    if (existingFiles.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const fileAttachments: FileAttachmentType[] = newFiles.map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploaded: false,
      uploadProgress: 0
    }));

    setFiles(prev => [...prev, ...fileAttachments]);

    // Simulate upload process
    fileAttachments.forEach(attachment => {
      simulateUpload(attachment);
    });

    setShowFileAttachment(true);
  };

  const simulateUpload = (attachment: FileAttachmentType) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles(prev => prev.map(f =>
          f.id === attachment.id
            ? { ...f, uploaded: true, uploadProgress: 100 }
            : f
        ));
      } else {
        setFiles(prev => prev.map(f =>
          f.id === attachment.id
            ? { ...f, uploadProgress: Math.round(progress) }
            : f
        ));
      }
    }, 200);
  };

  const handleFileRemove = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFileRetry = (fileId: string) => {
    const file = files().find(f => f.id === fileId);
    if (file) {
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, error: undefined, uploadProgress: 0, uploaded: false }
          : f
      ));
      simulateUpload(file);
    }
  };

  const insertMarkdown = (syntax: string, placeholder = 'text') => {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = message().substring(start, end);
    const replacement = selectedText || placeholder;

    let newText = '';
    switch (syntax) {
      case 'bold':
        newText = `**${replacement}**`;
        break;
      case 'italic':
        newText = `*${replacement}*`;
        break;
      case 'code':
        newText = `\`${replacement}\``;
        break;
      case 'codeblock':
        newText = `\`\`\`\n${replacement}\n\`\`\``;
        break;
      case 'link':
        newText = `[${replacement}](url)`;
        break;
      case 'list':
        newText = `- ${replacement}`;
        break;
    }

    const newMessage = message().substring(0, start) + newText + message().substring(end);
    setMessage(newMessage);

    // Focus and set cursor position
    setTimeout(() => {
      if (textareaRef) {
        textareaRef.focus();
        const newPosition = start + newText.length;
        textareaRef.selectionStart = textareaRef.selectionEnd = newPosition;
      }
      autoResize();
    }, 0);
  };

  // Load draft on mount and expose handle to parent
  onMount(() => {
    loadDraft();

    // Expose methods to parent component
    if (props.ref) {
      props.ref({
        setInputValue,
        focus: focusInput,
        clear: clearInput
      });
    }
  });

  return (
    <div class="border-t bg-white">
      {/* File Attachment Area */}
      <Show when={showFileAttachment() && props.enableFileAttachments}>
        <div class="p-4 border-b bg-gray-50">
          <FileAttachment
            files={files()}
            onFilesAdd={handleFilesAdd}
            onFileRemove={handleFileRemove}
            onFileRetry={handleFileRetry}
            maxFiles={props.maxFiles}
            maxFileSize={props.maxFileSize}
            allowedTypes={props.allowedFileTypes}
            disabled={props.disabled}
            className="bg-white"
          />
        </div>
      </Show>

      {/* Main Input Area */}
      <div class="p-4">
        {/* Markdown Toolbar */}
        <Show when={isMarkdownMode() && props.enableMarkdown}>
          <div class="flex items-center gap-1 mb-2 pb-2 border-b">
            <button
              type="button"
              onClick={() => insertMarkdown('bold')}
              class="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Bold"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('italic')}
              class="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded italic"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('code')}
              class="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded font-mono"
              title="Inline code"
            >
              {'</>'}
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('codeblock')}
              class="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Code block"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('link')}
              class="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Link"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('list')}
              class="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="List"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </Show>

        <form onSubmit={handleSubmit} class="flex flex-col space-y-2">
          <div class="flex items-center space-x-3 px-2">
            {/* File Attachment Button - Inline Left */}
            <Show when={props.enableFileAttachments}>
              <button
                type="button"
                onClick={() => setShowFileAttachment(!showFileAttachment())}
                class={`p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ${
                  showFileAttachment() ? 'text-teal-600' : 'text-gray-500'
                }`}
                title="Attach files"
                disabled={props.disabled}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
            </Show>

            {/* Input Field - Center */}
            <div class="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message()}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={placeholder()}
                class="w-full resize-none border-0 rounded-lg px-3 py-3 focus:outline-none focus:ring-0 min-h-[2.5rem] max-h-[200px] bg-transparent"
                rows="1"
                disabled={props.disabled}
                style="overflow-y: auto; field-sizing: content;"
              />
            </div>

            {/* Send Button - Circular Teal with Up Arrow */}
            <button
              type="submit"
              disabled={props.disabled || (!message().trim() && files().filter(f => f.uploaded).length === 0)}
              class="flex-shrink-0 w-10 h-10 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Send message"
            >
              <Show when={props.disabled} fallback={
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              }>
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </Show>
            </button>
          </div>

          {/* File count indicator */}
          <Show when={files().length > 0}>
            <div class="text-xs text-gray-500 flex items-center gap-2">
              <span>{files().filter(f => f.uploaded).length}/{files().length} files ready</span>
              <button
                type="button"
                onClick={() => setShowFileAttachment(!showFileAttachment())}
                class="text-blue-600 hover:text-blue-800"
              >
                {showFileAttachment() ? 'Hide' : 'Show'} files
              </button>
            </div>
          </Show>

          {/* Input hints */}
          <div class="text-xs text-gray-500">
            <Show when={messageHistory().length > 0 && message() === ''}>
              <span>↑ for message history • </span>
            </Show>
            <Show when={props.enableMarkdown && isMarkdownMode()}>
              <span>Markdown enabled • </span>
            </Show>
            <span>Enter to send, Shift+Enter for new line</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageInput;
