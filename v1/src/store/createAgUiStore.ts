import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { AgUiClient } from '../types';
import type { ChatState } from './state';
import { initStateFromSnapshot, applyNormalizedEvent } from './state';

export interface AgUiStore {
  state: ChatState;
  isConnected: () => boolean;
  send: AgUiClient['send'];
  close: () => void;
}

export function createAgUiStore(client: AgUiClient): AgUiStore {
  // Initialize empty state
  const [state, setState] = createStore<ChatState>({
    revision: '0',
    conversations: {},
    messages: {},
    attachments: {},
    messagesByConversation: {},
    streaming: {},
  });

  const [isConnected, setIsConnected] = createSignal(false);

  // Subscribe to lifecycle events
  client.on('client.ready', (payload) => {
    setIsConnected(true);
    setState('sessionId', payload.sessionId);
  });

  client.on('client.closed', () => {
    setIsConnected(false);
  });

  // Subscribe to state snapshot
  client.on('state.snapshot', (snapshot) => {
    const newState = initStateFromSnapshot(snapshot);
    setState(newState);
  });

  // Subscribe to all normalized events
  client.on('conversation.created', (payload) => {
    setState(s => applyNormalizedEvent(s, 'conversation.created', payload));
  });

  client.on('conversation.updated', (payload) => {
    setState(s => applyNormalizedEvent(s, 'conversation.updated', payload));
  });

  client.on('conversation.archived', (payload) => {
    setState(s => applyNormalizedEvent(s, 'conversation.archived', payload));
  });

  client.on('message.created', (payload) => {
    setState(s => applyNormalizedEvent(s, 'message.created', payload));
  });

  client.on('message.delta', (payload) => {
    setState(s => applyNormalizedEvent(s, 'message.delta', payload));
  });

  client.on('message.completed', (payload) => {
    setState(s => applyNormalizedEvent(s, 'message.completed', payload));
  });

  client.on('message.errored', (payload) => {
    setState(s => applyNormalizedEvent(s, 'message.errored', payload));
  });

  client.on('message.canceled', (payload) => {
    setState(s => applyNormalizedEvent(s, 'message.canceled', payload));
  });

  client.on('message.tool_call', (payload) => {
    setState(s => applyNormalizedEvent(s, 'message.tool_call', payload));
  });

  client.on('message.tool_result', (payload) => {
    setState(s => applyNormalizedEvent(s, 'message.tool_result', payload));
  });

  client.on('attachment.available', (payload) => {
    setState(s => applyNormalizedEvent(s, 'attachment.available', payload));
  });

  client.on('attachment.failed', (payload) => {
    setState(s => applyNormalizedEvent(s, 'attachment.failed', payload));
  });

  return {
    state,
    isConnected,
    send: client.send.bind(client),
    close: () => client.close(),
  };
}
