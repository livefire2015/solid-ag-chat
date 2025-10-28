import { Component } from 'solid-js';
import { SolidMarkdown } from 'solid-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export interface MessageRendererProps {
  content: string;
  class?: string;
}

/**
 * MessageRenderer - Renders markdown content with syntax highlighting
 *
 * Features:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists, etc.)
 * - Syntax highlighting for code blocks via highlight.js
 * - XSS-safe by default (HTML is escaped)
 * - Supports streaming content updates
 *
 * @example
 * <MessageRenderer content={message.content} />
 * <MessageRenderer content={streamingText()} class="prose prose-sm" />
 */
export const MessageRenderer: Component<MessageRendererProps> = (props) => {
  return (
    <SolidMarkdown
      children={props.content}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      class={props.class || ''}
    />
  );
};

export default MessageRenderer;
