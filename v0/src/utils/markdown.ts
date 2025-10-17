// Simple markdown parser and syntax highlighter
// This is a basic implementation that covers the most common markdown features
// For production use, consider using a library like marked or remark

export interface MarkdownOptions {
  enableCodeHighlighting?: boolean;
  enableTables?: boolean;
  enableTaskLists?: boolean;
  enableMath?: boolean;
}

// Simple syntax highlighting for common languages
const syntaxHighlight = (code: string, language: string): string => {
  // Basic keyword highlighting for popular languages
  const languagePatterns: Record<string, Array<{ pattern: RegExp; className: string }>> = {
    javascript: [
      { pattern: /\b(const|let|var|function|if|else|for|while|return|class|import|export)\b/g, className: 'keyword' },
      { pattern: /\b(true|false|null|undefined)\b/g, className: 'literal' },
      { pattern: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: 'comment' },
      { pattern: /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, className: 'string' },
      { pattern: /\b\d+\b/g, className: 'number' },
    ],
    typescript: [
      { pattern: /\b(const|let|var|function|if|else|for|while|return|class|import|export|interface|type|enum)\b/g, className: 'keyword' },
      { pattern: /\b(true|false|null|undefined|string|number|boolean|any|void)\b/g, className: 'literal' },
      { pattern: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: 'comment' },
      { pattern: /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, className: 'string' },
      { pattern: /\b\d+\b/g, className: 'number' },
    ],
    python: [
      { pattern: /\b(def|class|if|elif|else|for|while|return|import|from|as|with|try|except|finally)\b/g, className: 'keyword' },
      { pattern: /\b(True|False|None)\b/g, className: 'literal' },
      { pattern: /(#.*$)/gm, className: 'comment' },
      { pattern: /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, className: 'string' },
      { pattern: /\b\d+\b/g, className: 'number' },
    ],
    json: [
      { pattern: /("(?:\\.|[^"\\])*")\s*:/g, className: 'property' },
      { pattern: /:\s*("(?:\\.|[^"\\])*")/g, className: 'string' },
      { pattern: /\b(true|false|null)\b/g, className: 'literal' },
      { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
    ],
    css: [
      { pattern: /([a-zA-Z-]+)\s*:/g, className: 'property' },
      { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'comment' },
      { pattern: /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, className: 'string' },
      { pattern: /#[a-fA-F0-9]{3,6}\b/g, className: 'color' },
    ],
    html: [
      { pattern: /(<\/?[a-zA-Z][^>]*>)/g, className: 'tag' },
      { pattern: /\s([a-zA-Z-]+)=/g, className: 'attribute' },
      { pattern: /=(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, className: 'string' },
      { pattern: /(<!--[\s\S]*?-->)/g, className: 'comment' },
    ],
  };

  let highlightedCode = escapeHtml(code);
  const patterns = languagePatterns[language.toLowerCase()] || [];

  patterns.forEach(({ pattern, className }) => {
    highlightedCode = highlightedCode.replace(pattern, (match, ...groups) => {
      if (className === 'string' && groups.length >= 2) {
        const quote = groups[0];
        const content = groups[1];
        return `${quote}<span class="syntax-${className}">${content}</span>${quote}`;
      }
      return `<span class="syntax-${className}">${match}</span>`;
    });
  });

  return highlightedCode;
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const unescapeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

export const parseMarkdown = (markdown: string, options: MarkdownOptions = {}): string => {
  let html = markdown;

  // Escape HTML first
  html = escapeHtml(html);

  // Code blocks (must be processed first)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
    const lang = language || 'text';
    const highlightedCode = options.enableCodeHighlighting
      ? syntaxHighlight(unescapeHtml(code), lang)
      : unescapeHtml(code);
    return `<pre class="code-block" data-language="${lang}"><code>${highlightedCode}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="markdown-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="markdown-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="markdown-h1">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // Auto-links
  html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="markdown-image" />');

  // Lists
  if (options.enableTaskLists) {
    // Task lists
    html = html.replace(/^- \[ \] (.+)$/gm, '<div class="task-item"><input type="checkbox" class="task-checkbox" disabled> <span>$1</span></div>');
    html = html.replace(/^- \[x\] (.+)$/gm, '<div class="task-item"><input type="checkbox" class="task-checkbox" checked disabled> <span class="task-completed">$1</span></div>');
  }

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="list-item">$1</li>');
  html = html.replace(/(<li class="list-item">.*<\/li>)/s, '<ul class="markdown-list">$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="list-item-ordered">$1</li>');
  html = html.replace(/(<li class="list-item-ordered">.*<\/li>)/s, '<ol class="markdown-list-ordered">$1</ol>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="markdown-blockquote">$1</blockquote>');

  // Tables (if enabled)
  if (options.enableTables) {
    // Simple table parsing
    const tableRegex = /(\|.+\|\n)+/g;
    html = html.replace(tableRegex, (match) => {
      const rows = match.trim().split('\n');
      let tableHtml = '<table class="markdown-table"><thead>';

      if (rows.length > 0) {
        // Header row
        const headerCells = rows[0].split('|').filter(cell => cell.trim() !== '');
        tableHtml += '<tr>';
        headerCells.forEach(cell => {
          tableHtml += `<th class="table-header">${cell.trim()}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        // Data rows (skip alignment row if present)
        const dataRows = rows.slice(rows[1] && rows[1].includes('---') ? 2 : 1);
        dataRows.forEach(row => {
          if (row.trim()) {
            const cells = row.split('|').filter(cell => cell.trim() !== '');
            tableHtml += '<tr>';
            cells.forEach(cell => {
              tableHtml += `<td class="table-cell">${cell.trim()}</td>`;
            });
            tableHtml += '</tr>';
          }
        });
      }

      tableHtml += '</tbody></table>';
      return tableHtml;
    });
  }

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="markdown-hr" />');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="markdown-paragraph">');
  html = html.replace(/\n/g, '<br />');

  // Wrap in paragraph if needed
  if (!html.includes('<p>') && !html.includes('<pre>') && !html.includes('<h1>') && !html.includes('<h2>') && !html.includes('<h3>')) {
    html = `<p class="markdown-paragraph">${html}</p>`;
  } else if (html.startsWith('<p>')) {
    // Already wrapped
  } else {
    html = `<p class="markdown-paragraph">${html}`;
  }

  return html;
};

// Extract code blocks for copy functionality
export const extractCodeBlocks = (markdown: string): Array<{ language: string; code: string; index: number }> => {
  const codeBlocks: Array<{ language: string; code: string; index: number }> = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let index = 0;

  while ((match = regex.exec(markdown)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2],
      index: index++
    });
  }

  return codeBlocks;
};

// Get text content without markdown syntax
export const getPlainText = (markdown: string): string => {
  let text = markdown;

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');

  // Remove inline code
  text = text.replace(/`[^`]+`/g, '');

  // Remove headers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');

  // Remove strikethrough
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove images
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');

  // Remove list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // Remove blockquotes
  text = text.replace(/^>\s+/gm, '');

  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, '\n').trim();

  return text;
};