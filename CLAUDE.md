# CLAUDE.md

**solid-ag-chat** is a SolidJS library for building chat UIs with AG-UI protocol support and bidirectional tool execution. This is a library (not a ready-to-use UI), providing primitives and hooks for developers to build custom chat interfaces.

## Development Setup

The project contains three versions in separate directories:

```bash
# v2 (Current - Recommended)
cd v2 && npm run dev    # Watch mode
cd v2 && npm run build  # Production build

# v1 (Previous)
cd v1 && npm run dev
cd v1 && npm run build

# v0 (Deprecated)
cd v0 && npm run dev
cd v0 && npm run build
```

## Architecture Highlights

Each version has its own architecture:

- **v2**: Exports through `v2/src/index.ts`, primitives in `v2/src/primitives/`, state in `v2/src/store/`
- **v1**: Exports through `v1/src/index.ts`, similar structure to v2 but without tool execution
- **v0**: Exports through `v0/src/index.tsx`, includes built-in UI components

All versions build to ES module and CommonJS formats with peer dependencies on solid-js.

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
