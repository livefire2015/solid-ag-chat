import { MockAgClient } from './mockClient';

// A small helper to drive an end-to-end mock conversation
export async function runBasicScenario(client = new MockAgClient()) {
  // Create conversation
  const conv = await client.createConversation('New Chat');

  // Send a message and let the mock stream an answer
  await client.sendMessage(conv.id, 'How are you?');

  return client;
}

export default runBasicScenario;
