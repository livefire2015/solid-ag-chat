# Local Development Quick Start

Quick reference for using @livefire2015/solid-ag-chat locally without publishing to npm.

## Version Selection

| Version | Directory | Status | Description |
|---------|-----------|--------|-------------|
| **v2** | `v2/` | Current | Bidirectional tool execution (recommended) |
| v1 | `v1/` | Previous | AG-UI protocol support |
| v0 | `v0/` | Deprecated | Built-in UI components |

**Note**: Examples below use v2. Replace with `v1` or `v0` as needed.

---

## Quick Start (2 minutes)

### Method 1: npm link (Recommended)

**In solid-ag-chat/v2 directory:**
```bash
cd v2
npm run build
npm link
```

**In your app directory:**
```bash
npm link @livefire2015/solid-ag-chat
npm run dev
```

Done! Your app now uses the local version.

---

## All Methods at a Glance

### 1. npm link (Best for development)
```bash
# solid-ag-chat/v2
npm run build
npm link

# your-app
npm link @livefire2015/solid-ag-chat
```

### 2. File Path (Simple)
```json
// your-app/package.json
{
  "dependencies": {
    "@livefire2015/solid-ag-chat": "file:../solid-ag-chat/v2"
  }
}
```

### 3. Monorepo (Professional)
```
project/
├── packages/
│   ├── solid-ag-chat/
│   └── your-app/
└── package.json  (with "workspaces")
```

---

## Common Commands

### In solid-ag-chat/v2 directory

```bash
# Build once
npm run build

# Build and watch for changes
npm run dev

# Unlink
npm unlink
```

### In your app directory

```bash
# Link solid-ag-chat
npm link @livefire2015/solid-ag-chat

# Unlink solid-ag-chat
npm unlink @livefire2015/solid-ag-chat

# Install from npm instead
npm install @livefire2015/solid-ag-chat
```

---

## Development Workflow

### Quick Test (No hot reload)
```bash
# Terminal 1: solid-ag-chat
cd v2
npm run build
npm link

# Terminal 2: your-app
npm link @livefire2015/solid-ag-chat
npm run dev

# Make changes → rebuild → refresh browser
```

### Active Development (With hot reload)
```bash
# Terminal 1: solid-ag-chat
cd v2
npm run dev  # watch mode

# Terminal 2: your-app
npm link @livefire2015/solid-ag-chat
npm run dev

# Changes auto-rebuild!
```

---

## Troubleshooting

### "Cannot find module '@livefire2015/solid-ag-chat'"
```bash
cd solid-ag-chat/v2
npm run build
npm link
```

### Changes not showing
```bash
# Rebuild
cd solid-ag-chat/v2
npm run build

# Hard refresh browser: Cmd+Shift+R
```

### Multiple SolidJS versions
```bash
# Remove SolidJS from solid-ag-chat (it's a peer dependency)
cd solid-ag-chat/v2
npm uninstall solid-js

# Your app should provide it
```

---

## File Locations

```bash
# Your setup might look like:
~/projects/
├── solid-ag-chat/v2/     # This library
└── my-chat-app/          # Your app using it

# Or in a monorepo:
~/projects/my-monorepo/
└── packages/
    ├── solid-ag-chat/
    └── my-chat-app/
```

---

## Method Comparison

| Method | Setup Time | Hot Reload | Best For |
|--------|-----------|------------|----------|
| npm link | 30 sec | With watch | Most cases |
| File path | 1 min | No | Simple projects |
| Monorepo | 5 min | No | Teams |

---

## Real-World Examples

### Example 1: Testing a Bug Fix
```bash
# 1. Make changes in solid-ag-chat/v2
vim src/primitives/useConversation.ts

# 2. Rebuild
npm run build

# 3. Test in your app (already linked)
# Just refresh the browser!
```

### Example 2: Developing New Feature
```bash
# Start watch mode
cd solid-ag-chat/v2
npm run dev  # Leave this running

# In another terminal
cd your-app
npm run dev

# Now edit solid-ag-chat files
# They'll auto-rebuild and update!
```

### Example 3: Switching Between Local and npm
```bash
# Use local version
npm link @livefire2015/solid-ag-chat

# Switch back to npm version
npm unlink @livefire2015/solid-ag-chat
npm install @livefire2015/solid-ag-chat
```

---

## Working with All Versions

### Quick Link Commands

```bash
# v2 (Current - Recommended)
cd solid-ag-chat/v2 && npm run build && npm link

# v1 (Previous)
cd solid-ag-chat/v1 && npm run build && npm link

# v0 (Deprecated)
cd solid-ag-chat/v0 && npm run build && npm link
```

### Version-Specific Features

| Version | Key Exports |
|---------|-------------|
| v2 | `useToolExecution`, `useToolCalls`, `usePendingTools` |
| v1 | `useConversation`, `useMessages`, `useStreamingText` |
| v0 | `ChatContainer`, `MessageList`, `Composer` |

### Switching Versions

```bash
# Unlink current
npm unlink @livefire2015/solid-ag-chat

# Link different version
cd solid-ag-chat/v1  # or v0, v2
npm run build && npm link

# In your app
npm link @livefire2015/solid-ag-chat
```

---

## Full Documentation

For detailed information, see:
- [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) - Complete guide
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Codebase overview

---

## Need Help?

**Issue not listed?** Check [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for:
- Detailed troubleshooting
- Advanced configurations
- Alternative methods
- Best practices
