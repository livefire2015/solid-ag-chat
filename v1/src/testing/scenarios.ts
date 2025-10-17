import type { IntentPayloads } from '../types';
import { MockAgClient } from './mockClient';

// A small helper to drive an end-to-end mock conversation
export async function runBasicScenario(client = new MockAgClient()) {
  // Ensure snapshot is requested (optional; constructor auto-emits)
  await client.send('state.request_snapshot', {});

  // Create conversation
  await client.send('conversation.create', { title: 'New Chat' });

  // Send a message and let the mock stream an answer
  const sendPayload: IntentPayloads['message.send'] = {
    clientMessageId: 'client-msg-1',
    text: 'How are you?'
  };
  await client.send('message.send', sendPayload);

  return client;
}

export default runBasicScenario;
