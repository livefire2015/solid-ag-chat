# @livefire2015/solid-ag-chat

SolidJS chat components for AG-UI protocol integration with PydanticAI.

## Features

- 🚀 Built with SolidJS for reactive, performant UI
- 💬 Complete chat interface with message history
- 🔄 Real-time streaming support via Server-Sent Events (SSE)
- 🧠 Agent state visualization panel
- 📦 TypeScript support out of the box
- 🎨 Styled with Tailwind CSS classes

## Installation

```bash
npm install @livefire2015/solid-ag-chat
```

## Peer Dependencies

This package requires SolidJS as a peer dependency:

```bash
npm install solid-js
```

## Quick Start

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

function App() {
  return (
    <ChatInterface apiUrl="http://localhost:8000/agent/stream" />
  );
}
```

## Components

### ChatInterface

The main chat component that includes all sub-components.

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

<ChatInterface apiUrl="http://localhost:8000/agent/stream" />
```

**Props:**
- `apiUrl` (optional): The API endpoint for the AG-UI stream. Defaults to `http://localhost:8000/agent/stream`

### MessageList

Displays the list of chat messages.

```tsx
import { MessageList } from '@livefire2015/solid-ag-chat';

<MessageList
  messages={messages()}
  isLoading={isLoading()}
/>
```

### MessageInput

Text input for sending messages.

```tsx
import { MessageInput } from '@livefire2015/solid-ag-chat';

<MessageInput
  onSendMessage={handleSend}
  disabled={isLoading()}
/>
```

### StatePanel

Side panel for visualizing agent state.

```tsx
import { StatePanel } from '@livefire2015/solid-ag-chat';

<StatePanel agentState={agentState()} />
```

## Services

### createAGUIService

A reactive service for managing chat state and AG-UI protocol communication.

```tsx
import { createAGUIService } from '@livefire2015/solid-ag-chat';

const chatService = createAGUIService('http://localhost:8000/agent/stream');

// Access reactive state
const messages = chatService.messages();
const isLoading = chatService.isLoading();
const error = chatService.error();
const agentState = chatService.agentState();

// Send messages
await chatService.sendMessage('Hello!');

// Clear state
chatService.clearMessages();
chatService.clearAgentState();
```

## AG-UI Protocol

This package implements the AG-UI protocol for streaming agent interactions. The protocol supports:

- **TEXT_MESSAGE_CONTENT**: Full message updates
- **TEXT_MESSAGE_DELTA**: Incremental message updates
- **STATE_SNAPSHOT**: Complete agent state
- **STATE_DELTA**: Partial agent state updates
- **TOOL_CALL_START/END**: Tool execution events
- **ERROR**: Error handling

## Types

All TypeScript types are exported for use in your application:

```tsx
import type {
  AGUIMessage,
  AGUIEvent,
  AgentState,
  ChatService
} from '@livefire2015/solid-ag-chat';
```

## Styling

Components use Tailwind CSS classes. Ensure your project has Tailwind CSS configured:

```bash
npm install -D tailwindcss
```

## Development

```bash
# Build the package
npm run build

# Watch mode
npm run dev
```

## License

MIT

## Author

livefire2015
