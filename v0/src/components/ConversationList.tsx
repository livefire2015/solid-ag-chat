import { Component, createSignal, Show, For, createMemo } from 'solid-js';
import type { ConversationSummary } from '../services/types';

interface ConversationListProps {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onConversationCreate: () => void;
  onConversationDelete: (conversationId: string) => void;
  onConversationRename: (conversationId: string, newTitle: string) => void;
  onConversationDuplicate?: (conversationId: string) => void;
  onConversationArchive?: (conversationId: string) => void;
  onConversationStar?: (conversationId: string) => void;
  enableSearch?: boolean;
  enableFiltering?: boolean;
  isLoading?: boolean;
  className?: string;
}

const ConversationList: Component<ConversationListProps> = (props) => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterMode, setFilterMode] = createSignal<'all' | 'starred' | 'archived'>('all');
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [editingTitle, setEditingTitle] = createSignal('');
  const [contextMenuId, setContextMenuId] = createSignal<string | null>(null);

  const filteredConversations = createMemo(() => {
    let filtered = props.conversations;

    // Apply search filter
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(query) ||
        conv.description?.toLowerCase().includes(query) ||
        conv.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filter mode
    switch (filterMode()) {
      case 'starred':
        filtered = filtered.filter(conv => conv.starred);
        break;
      case 'archived':
        filtered = filtered.filter(conv => conv.archived);
        break;
      default:
        filtered = filtered.filter(conv => !conv.archived);
    }

    return filtered;
  });

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const startEditing = (conversation: ConversationSummary) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
    setContextMenuId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveEditing = () => {
    const id = editingId();
    const title = editingTitle().trim();
    if (id && title) {
      props.onConversationRename(id, title);
    }
    cancelEditing();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const toggleContextMenu = (conversationId: string, e: Event) => {
    e.stopPropagation();
    setContextMenuId(contextMenuId() === conversationId ? null : conversationId);
  };

  const closeContextMenu = () => {
    setContextMenuId(null);
  };

  return (
    <div class={`conversation-list bg-white border-r border-gray-200 flex flex-col h-full ${props.className || ''}`}>
      {/* Header */}
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-900">Conversations</h2>
          <button
            onClick={props.onConversationCreate}
            class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="New conversation"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <Show when={props.enableSearch}>
          <div class="relative mb-3">
            <input
              type="text"
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              placeholder="Search conversations..."
              class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </Show>

        {/* Filter Tabs */}
        <Show when={props.enableFiltering}>
          <div class="flex text-sm">
            <button
              onClick={() => setFilterMode('all')}
              class={`flex-1 py-1 px-2 rounded-l-lg border ${
                filterMode() === 'all'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('starred')}
              class={`flex-1 py-1 px-2 border-t border-b ${
                filterMode() === 'starred'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Starred
            </button>
            <button
              onClick={() => setFilterMode('archived')}
              class={`flex-1 py-1 px-2 rounded-r-lg border ${
                filterMode() === 'archived'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Archived
            </button>
          </div>
        </Show>
      </div>

      {/* Conversation List */}
      <div class="flex-1 overflow-y-auto" onClick={closeContextMenu}>
        <Show when={props.isLoading}>
          <div class="p-4 text-center text-gray-500">
            <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading conversations...
          </div>
        </Show>

        <Show when={!props.isLoading && filteredConversations().length === 0}>
          <div class="p-4 text-center text-gray-500">
            <Show when={searchQuery().trim()}>
              <div>No conversations match your search.</div>
            </Show>
            <Show when={!searchQuery().trim()}>
              <div>
                <div class="text-4xl mb-2">💬</div>
                <div>No conversations yet.</div>
                <button
                  onClick={props.onConversationCreate}
                  class="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Start your first conversation
                </button>
              </div>
            </Show>
          </div>
        </Show>

        <div class="space-y-1 p-2">
          <For each={filteredConversations()}>
            {(conversation) => (
              <div class="relative">
                <div
                  onClick={() => props.onConversationSelect(conversation.id)}
                  class={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                    props.currentConversationId === conversation.id
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <Show
                        when={editingId() === conversation.id}
                        fallback={
                          <div class="text-sm font-medium truncate pr-2">
                            {conversation.title}
                          </div>
                        }
                      >
                        <input
                          type="text"
                          value={editingTitle()}
                          onInput={(e) => setEditingTitle(e.currentTarget.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={saveEditing}
                          class="text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 w-full"
                          onClick={(e) => e.stopPropagation()}
                          autofocus
                        />
                      </Show>

                      <div class={`text-xs mt-1 ${
                        props.currentConversationId === conversation.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span>{conversation.messageCount} messages</span>
                        <span class="mx-1">•</span>
                        <span>{formatRelativeTime(conversation.lastMessageAt)}</span>
                      </div>

                      <Show when={conversation.description}>
                        <div class={`text-xs mt-1 truncate ${
                          props.currentConversationId === conversation.id ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          {conversation.description}
                        </div>
                      </Show>

                      <Show when={conversation.tags && conversation.tags.length > 0}>
                        <div class="flex flex-wrap gap-1 mt-2">
                          <For each={conversation.tags?.slice(0, 3)}>
                            {(tag) => (
                              <span class={`text-xs px-1.5 py-0.5 rounded ${
                                props.currentConversationId === conversation.id
                                  ? 'bg-blue-400 text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {tag}
                              </span>
                            )}
                          </For>
                          <Show when={conversation.tags && conversation.tags.length > 3}>
                            <span class={`text-xs ${
                              props.currentConversationId === conversation.id ? 'text-blue-100' : 'text-gray-400'
                            }`}>
                              +{(conversation.tags?.length || 0) - 3}
                            </span>
                          </Show>
                        </div>
                      </Show>
                    </div>

                    <div class="flex items-center gap-1">
                      <Show when={conversation.starred}>
                        <div class={`text-xs ${
                          props.currentConversationId === conversation.id ? 'text-yellow-200' : 'text-yellow-500'
                        }`}>
                          ⭐
                        </div>
                      </Show>

                      <Show when={conversation.archived}>
                        <div class={`text-xs ${
                          props.currentConversationId === conversation.id ? 'text-blue-200' : 'text-gray-400'
                        }`}>
                          📁
                        </div>
                      </Show>

                      <button
                        onClick={(e) => toggleContextMenu(conversation.id, e)}
                        class={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 ${
                          props.currentConversationId === conversation.id ? 'hover:bg-blue-400' : ''
                        }`}
                        title="More options"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Context Menu */}
                <Show when={contextMenuId() === conversation.id}>
                  <div class="absolute right-2 top-12 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                    <button
                      onClick={() => {
                        startEditing(conversation);
                      }}
                      class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <span>✏️</span>
                      Rename
                    </button>

                    <Show when={props.onConversationDuplicate}>
                      <button
                        onClick={() => {
                          props.onConversationDuplicate?.(conversation.id);
                          closeContextMenu();
                        }}
                        class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span>📋</span>
                        Duplicate
                      </button>
                    </Show>

                    <Show when={props.onConversationStar}>
                      <button
                        onClick={() => {
                          props.onConversationStar?.(conversation.id);
                          closeContextMenu();
                        }}
                        class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span>{conversation.starred ? '⭐' : '☆'}</span>
                        {conversation.starred ? 'Unstar' : 'Star'}
                      </button>
                    </Show>

                    <Show when={props.onConversationArchive}>
                      <button
                        onClick={() => {
                          props.onConversationArchive?.(conversation.id);
                          closeContextMenu();
                        }}
                        class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span>{conversation.archived ? '📂' : '📁'}</span>
                        {conversation.archived ? 'Unarchive' : 'Archive'}
                      </button>
                    </Show>

                    <div class="border-t border-gray-200 my-1"></div>

                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this conversation?')) {
                          props.onConversationDelete(conversation.id);
                        }
                        closeContextMenu();
                      }}
                      class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <span>🗑️</span>
                      Delete
                    </button>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Footer Stats */}
      <Show when={props.conversations.length > 0}>
        <div class="p-3 border-t border-gray-200 text-xs text-gray-500">
          <div class="flex items-center justify-between">
            <span>{filteredConversations().length} of {props.conversations.length}</span>
            <div class="flex items-center gap-2">
              <Show when={props.conversations.some(c => c.starred)}>
                <span>⭐ {props.conversations.filter(c => c.starred).length}</span>
              </Show>
              <Show when={props.conversations.some(c => c.archived)}>
                <span>📁 {props.conversations.filter(c => c.archived).length}</span>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ConversationList;