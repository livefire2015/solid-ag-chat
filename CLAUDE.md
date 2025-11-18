# CLAUDE.md

**solid-ag-chat** is a SolidJS library for building chat UIs with AG-UI protocol support and bidirectional tool execution. This is a library (not a ready-to-use UI), providing primitives and hooks for developers to build custom chat interfaces.

## Development Setup

Key commands include `npm run dev` for watch mode (rebuilds on source changes), and `npm run build` for production builds. The main development happens in the `v2/` directory which contains the latest version.

## Architecture Highlights

The library exports hooks and utilities through `v2/src/index.ts`. Components reside in `v2/src/primitives/` with state management in `v2/src/store/`. It builds to ES module and CommonJS formats with peer dependencies on solid-js that consuming applications must provide.

## Version Structure

- **v2 (Current):** Bidirectional tool execution with automatic handler invocation
- **v1 (Previous):** Official AG-UI protocol support
- **v0 (Deprecated):** Legacy version with built-in UI components

## State Management & Key Features

The library provides hooks like `useConversation`, `useMessages`, `useToolCalls`, and `useToolExecution` for managing chat state through SolidJS signals and stores. V2 adds tool registration, execution state tracking, and human-in-the-loop patterns.

## Integration & Workflows

The backend expects POST requests with conversation history and returns streaming responses via Server-Sent Events following the AG-UI protocol. For active development across library and consuming apps, the recommended approach uses `npm run dev` (watch mode) alongside `npm link` for local testing without npm publication.

## Key Dependencies

- **@ag-ui/core** & **@ag-ui/client** - Official AG-UI protocol
- **RxJS** - Reactive streams
- **fast-json-patch** - JSON Patch for state deltas
- **solid-js** (peer) - Reactive UI framework
