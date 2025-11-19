# Local Development - Using @livefire2015/solid-ag-chat Without Publishing to npm

This guide shows how to use @livefire2015/solid-ag-chat in other applications during local development without publishing to npm.

## Version Selection

The library has three versions available:

| Version | Directory | Status | Use Case |
|---------|-----------|--------|----------|
| v2 | `v2/` | **Current** | Bidirectional tool execution (recommended) |
| v1 | `v1/` | Previous | Official AG-UI protocol support |
| v0 | `v0/` | Deprecated | Legacy with built-in UI components |

**Note**: Throughout this guide, replace `v2` with `v1` or `v0` if you need to work with those versions.

## Table of Contents

- [Method 1: npm link (Recommended)](#method-1-npm-link-recommended)
- [Method 2: Local File Path](#method-2-local-file-path)
- [Method 3: Workspace/Monorepo](#method-3-workspacemonorepo)
- [Method 4: Build and Copy](#method-4-build-and-copy)
- [Hot Reloading Setup](#hot-reloading-setup)
- [Troubleshooting](#troubleshooting)

## Method 1: npm link (Recommended)

The `npm link` command creates a symbolic link, making the library available globally and then linking it to your project.

### Step-by-Step

**1. In the solid-ag-chat/v2 directory:**

```bash
cd /path/to/solid-ag-chat/v2

# Build the library first
npm run build

# Create a global symlink
npm link
```

**2. In your application directory:**

```bash
cd /path/to/your-app

# Link the @livefire2015/solid-ag-chat package
npm link @livefire2015/solid-ag-chat
```

**3. Use it in your app:**

```tsx
import { ChatProvider, useConversation, useMessages } from '@livefire2015/solid-ag-chat';
import { createSdkAgent } from '@livefire2015/solid-ag-chat';

const client = createSdkAgent({
  baseUrl: 'http://localhost:8000',
});

const App = () => {
  return (
    <ChatProvider client={client}>
      <ChatInterface />
    </ChatProvider>
  );
};
```

### Advantages
- Works like a real npm package
- Easy to set up
- Can link to multiple projects
- Changes reflected after rebuild

### Development Workflow

```bash
# In solid-ag-chat/v2 directory
# Make changes to source code
npm run build

# Changes are now available in linked apps
# Just refresh your app
```

### Unlinking

When you're done:

```bash
# In your application
npm unlink @livefire2015/solid-ag-chat

# In solid-ag-chat/v2 directory
npm unlink
```

## Method 2: Local File Path

Install the library directly from the file system.

### Setup

**In your application's package.json:**

```json
{
  "dependencies": {
    "@livefire2015/solid-ag-chat": "file:../solid-ag-chat/v2",
    "solid-js": "^1.8.0"
  }
}
```

Then install:

```bash
npm install
```

### Advantages
- Simple and straightforward
- Works with npm/yarn/pnpm
- No global linking needed

### Disadvantages
- Copies files (not symlink)
- Need to reinstall after changes

### Development Workflow

```bash
# 1. Make changes in solid-ag-chat/v2
cd /path/to/solid-ag-chat/v2
npm run build

# 2. Reinstall in your app
cd /path/to/your-app
npm install
```

### Updating

After making changes:

```bash
# Force reinstall
npm install --force
# or
rm -rf node_modules/@livefire2015/solid-ag-chat
npm install
```

## Method 3: Workspace/Monorepo

Best for managing multiple related packages.

### Setup with npm Workspaces

Create a workspace structure:

```
my-project/
├── packages/
│   ├── solid-ag-chat/        # The library
│   └── my-app/               # Your application
└── package.json              # Root package.json
```

**Root package.json:**

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}
```

**my-app/package.json:**

```json
{
  "name": "my-app",
  "dependencies": {
    "@livefire2015/solid-ag-chat": "*",
    "solid-js": "^1.8.0"
  }
}
```

**Install from root:**

```bash
# From root directory
npm install
```

### Advantages
- Auto-linked between packages
- Shared dependencies
- Easy to manage
- Professional setup

### Using pnpm Workspaces

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'packages/*'
```

**Root package.json:**

```json
{
  "name": "my-monorepo",
  "private": true
}
```

Then:

```bash
pnpm install
```

## Method 4: Build and Copy

Manually copy the built library to your project.

### Setup

**1. Build solid-ag-chat:**

```bash
cd /path/to/solid-ag-chat/v2
npm run build
```

**2. Copy to your project:**

```bash
# Create a local directory for the library
cd /path/to/your-app
mkdir -p local-packages/solid-ag-chat

# Copy the built files
cp -r /path/to/solid-ag-chat/v2/dist local-packages/solid-ag-chat/
cp /path/to/solid-ag-chat/v2/package.json local-packages/solid-ag-chat/
```

**3. Install from local directory:**

```json
{
  "dependencies": {
    "@livefire2015/solid-ag-chat": "file:./local-packages/solid-ag-chat"
  }
}
```

### Advantages
- Full control
- No symbolic links
- Can version locally

### Disadvantages
- Manual process
- Need to copy after changes

## Hot Reloading Setup

For real-time development without rebuilding.

### Option 1: Watch Mode with npm link

**1. In solid-ag-chat/v2:**

```bash
cd /path/to/solid-ag-chat/v2
npm link
npm run dev  # This runs vite build --watch
```

**2. In your app:**

```bash
npm link @livefire2015/solid-ag-chat
npm run dev
```

Now changes in solid-ag-chat will automatically rebuild and update in your app!

### Option 2: Direct Source Import (Advanced)

Configure your app to import the source directly (requires matching build setup).

**vite.config.ts in your app:**

```typescript
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '@livefire2015/solid-ag-chat': path.resolve(__dirname, '../solid-ag-chat/v2/src')
    }
  }
});
```

**Advantages:**
- Instant updates
- No rebuild needed
- Best developer experience

**Disadvantages:**
- Complex setup
- Build configs must match

## Practical Examples

### Example 1: Quick Test Setup

```bash
# Terminal 1: solid-ag-chat
cd /path/to/solid-ag-chat/v2
npm run build
npm link

# Terminal 2: your app
cd ~/projects/my-chat-app
npm link @livefire2015/solid-ag-chat
npm run dev

# Make changes, rebuild, refresh browser
```

### Example 2: Active Development

```bash
# Terminal 1: solid-ag-chat (watch mode)
cd /path/to/solid-ag-chat/v2
npm run dev

# Terminal 2: your app
cd ~/projects/my-chat-app
npm link @livefire2015/solid-ag-chat
npm run dev

# Changes auto-rebuild and update!
```

### Example 3: Monorepo Setup

```bash
# Create structure
mkdir my-project
cd my-project

# Move or clone solid-ag-chat
mv /path/to/solid-ag-chat ./packages/

# Create app
mkdir -p packages/my-app

# Setup workspace
cat > package.json << 'EOF'
{
  "name": "my-project",
  "private": true,
  "workspaces": ["packages/*"]
}
EOF

# Install everything
npm install

# Now solid-ag-chat is automatically linked!
cd packages/my-app
npm run dev
```

## Troubleshooting

### Issue: "Cannot find module '@livefire2015/solid-ag-chat'"

**Solution:**

```bash
# Rebuild the library
cd /path/to/solid-ag-chat/v2
npm run build

# Relink
npm link

# In your app
cd /path/to/your-app
npm link @livefire2015/solid-ag-chat
```

### Issue: "Module not found" after linking

**Solution:** Check that the library is built:

```bash
ls /path/to/solid-ag-chat/v2/dist
# Should show: index.js, index.d.ts, index.cjs
```

If empty, run `npm run build`.

### Issue: Changes not reflecting

**Solution:**

```bash
# 1. Rebuild the library
cd /path/to/solid-ag-chat/v2
npm run build

# 2. Hard refresh your app
# In browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 3. Or restart dev server
cd /path/to/your-app
# Ctrl+C to stop
npm run dev
```

### Issue: Multiple versions of SolidJS

**Solution:** Use peer dependencies and ensure SolidJS is only installed once:

```bash
# In your app
npm list solid-js

# Should show only one version
# If multiple, remove duplicates
cd /path/to/solid-ag-chat/v2
npm uninstall solid-js
```

### Issue: TypeScript can't find types

**Solution:**

```bash
# Make sure types are built
cd /path/to/solid-ag-chat/v2
npm run build

# Check dist folder
ls dist/index.d.ts  # Should exist
```

## Best Practices

### 1. Always Build Before Linking

```bash
cd /path/to/solid-ag-chat/v2
npm run build
npm link
```

### 2. Use Watch Mode for Active Development

```bash
npm run dev
```

### 3. Version Your Changes

Even during local development, commit your changes:

```bash
git commit -m "feat: add new feature"
```

This helps track what version your app is using.

### 4. Document Local Setup

In your app's README:

```markdown
## Local Development with @livefire2015/solid-ag-chat

This project uses a local version of @livefire2015/solid-ag-chat:

\`\`\`bash
cd ../solid-ag-chat/v2
npm run build
npm link

cd ../my-app
npm link @livefire2015/solid-ag-chat
\`\`\`
```

## Comparison Table

| Method | Setup | Updates | Hot Reload | Multiple Apps | Complexity |
|--------|-------|---------|------------|---------------|------------|
| npm link | Easy | Manual rebuild | With watch | Yes | Low |
| File path | Easy | Reinstall | No | No | Low |
| Workspace | Medium | Automatic | No | Yes | Medium |
| Build/Copy | Manual | Manual | No | No | Low |
| Direct source | Hard | Instant | Yes | Yes | High |

## Recommended Workflow

**For casual testing:**
```bash
npm link  # Quick and easy
```

**For active development:**
```bash
npm run dev  # Automatic rebuilds (watch mode)
npm link
```

**For team projects:**
```bash
# Use monorepo with workspaces
# Most professional and maintainable
```

## When to Publish to npm

Consider publishing when:
- Library is stable
- Multiple teams need it
- You want version control
- Need semantic versioning
- Want public distribution

During development, local methods are faster and more flexible!

## Working with Different Versions

### Linking a Specific Version

```bash
# For v2 (recommended)
cd /path/to/solid-ag-chat/v2
npm run build && npm link

# For v1
cd /path/to/solid-ag-chat/v1
npm run build && npm link

# For v0
cd /path/to/solid-ag-chat/v0
npm run build && npm link
```

### Version-Specific Imports

```tsx
// v2 - Bidirectional tool execution
import { ChatProvider, useConversation, useToolExecution } from '@livefire2015/solid-ag-chat';

// v1 - AG-UI protocol support
import { ChatProvider, useConversation, useMessages } from '@livefire2015/solid-ag-chat';

// v0 - Built-in UI components
import { ChatContainer, MessageList, Composer } from '@livefire2015/solid-ag-chat';
```

### Switching Between Versions

To switch from one version to another:

```bash
# Unlink current version
npm unlink @livefire2015/solid-ag-chat

# Link new version
cd /path/to/solid-ag-chat/v1  # or v0, v2
npm run build
npm link

# In your app
npm link @livefire2015/solid-ag-chat
```
