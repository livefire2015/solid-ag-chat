# Publishing to NPM

This guide explains how to publish @livefire2015/solid-ag-chat to npm.

## Version Overview

The project contains three versions that can be published independently:

| Version | Directory | npm Package Version | Status |
|---------|-----------|---------------------|--------|
| v2 | `v2/` | 2.x.x | **Current** (Recommended) |
| v1 | `v1/` | 1.x.x | Previous |
| v0 | `v0/` | 0.x.x | Deprecated |

**Note**: Each version directory has its own `package.json` with its own version number.

## Prerequisites

Before publishing, ensure you have:

1. npm account (logged in with access to publish)
2. Access to publish to the `@livefire2015` scope
3. Clean git working directory
4. Library built successfully

## Pre-Publication Checklist

Before publishing a new version, complete this checklist:

### 1. Update Package Metadata (if needed)

Edit `v2/package.json` to verify:

```json
{
  "name": "@livefire2015/solid-ag-chat",
  "version": "2.0.0",
  "author": "livefire2015",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/livefire2015/solid-ag-chat.git"
  },
  "bugs": {
    "url": "https://github.com/livefire2015/solid-ag-chat/issues"
  },
  "homepage": "https://github.com/livefire2015/solid-ag-chat#readme"
}
```

### 2. Verify Package Contents

Check what will be published:

```bash
cd v2
npm pack --dry-run
```

This shows all files that will be included in the package. Verify that:
- `dist/` folder is included
- `README.md` is included
- Source files (`src/`) are NOT included (they shouldn't be)
- `node_modules/` is NOT included

### 3. Build the Library

```bash
cd v2
npm run build
```

Verify the build output in `dist/`:
- `dist/index.js` - ES module
- `dist/index.cjs` - CommonJS module
- `dist/index.d.ts` - TypeScript definitions

## Publishing Process

### For First-Time Publication

If this is the first time publishing:

```bash
# 1. Verify you're logged in
npm whoami

# 2. Check package name is available
npm search @livefire2015/solid-ag-chat

# 3. Build the library
cd v2
npm run build

# 4. Publish (with public access for scoped packages)
npm publish --access public
```

### For Subsequent Releases

#### Option 1: Using npm version (Recommended)

npm automatically updates version, creates git tag, and commits:

```bash
cd v2

# For patch release (2.0.0 -> 2.0.1) - Bug fixes
npm version patch

# For minor release (2.0.0 -> 2.1.0) - New features, backward compatible
npm version minor

# For major release (2.0.0 -> 3.0.0) - Breaking changes
npm version major
```

Then build and publish:

```bash
npm run build
npm publish
```

#### Option 2: Manual Version Update

```bash
# 1. Manually edit version in v2/package.json
# Change "version": "2.0.0" to "version": "2.1.0"

# 2. Build the library
npm run build

# 3. Commit the version change
git add v2/package.json
git commit -m "Bump version to 2.1.0"
git tag v2.1.0
git push && git push --tags

# 4. Publish to npm
npm publish
```

## Version Guidelines (Semantic Versioning)

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (2.0.0 -> 3.0.0): Breaking changes
  - Removing exported functions/hooks
  - Changing hook APIs in incompatible ways
  - Renaming props or exports

- **MINOR** (2.0.0 -> 2.1.0): New features, backward compatible
  - Adding new hooks
  - Adding new props to existing hooks
  - Adding new utilities

- **PATCH** (2.0.0 -> 2.0.1): Bug fixes, backward compatible
  - Fixing bugs
  - Updating documentation
  - Performance improvements

## Release Workflow

### Complete Release Process

```bash
# 1. Ensure clean working directory
git status

# 2. Pull latest changes
git pull origin main

# 3. Update version (choose one: patch, minor, major)
cd v2
npm version minor -m "Release v%s: Add new feature"

# 4. Build the library
npm run build

# 5. Publish to npm
npm publish

# 6. Push git changes and tags
git push && git push --tags

# 7. Create GitHub release (optional but recommended)
# Go to GitHub -> Releases -> Create new release
# Use the tag you just created (e.g., v2.1.0)
# Add release notes describing changes
```

## Post-Publication

### 1. Verify Package on npm

Visit: https://www.npmjs.com/package/@livefire2015/solid-ag-chat

Check that:
- Version number is correct
- README is displaying properly
- Dependencies are correct
- File count looks reasonable

### 2. Test Installation

In a separate project, test installing the package:

```bash
npm install @livefire2015/solid-ag-chat
# or
npm install @livefire2015/solid-ag-chat@2.1.0
```

### 3. Update Documentation

If you have external documentation, update it with:
- New version number
- New features
- Migration guide (for breaking changes)

## Unpublishing (Emergency Only)

**Warning**: Unpublishing can break projects that depend on your package!

You can only unpublish within 72 hours of publishing:

```bash
# Unpublish a specific version
npm unpublish @livefire2015/solid-ag-chat@2.0.0

# Unpublish entire package (use with extreme caution!)
npm unpublish @livefire2015/solid-ag-chat --force
```

Better alternative: Publish a new patch version with the fix.

## Deprecating Old Versions

If you want to discourage use of an old version:

```bash
npm deprecate @livefire2015/solid-ag-chat@1.0.0 "Please upgrade to v2 for bidirectional tool execution"
```

## npm Scripts for Publishing

You can add these helper scripts to `v2/package.json`:

```json
{
  "scripts": {
    "prepublishOnly": "npm run build",
    "version": "npm run build && git add -A dist",
    "postversion": "git push && git push --tags",
    "release:patch": "npm version patch && npm publish",
    "release:minor": "npm version minor && npm publish",
    "release:major": "npm version major && npm publish"
  }
}
```

Then you can simply run:

```bash
npm run release:minor
```

## Troubleshooting

### Error: "You do not have permission to publish"

Make sure you're logged in and have access to the `@livefire2015` scope:

```bash
npm whoami
npm access ls-packages
```

### Error: "Version already exists"

You're trying to publish a version that already exists. Update the version:

```bash
npm version patch
```

### Error: "Package name too similar to existing package"

If publishing for the first time, npm might flag similar package names. Contact npm support or choose a different name.

### Files Missing in Published Package

Check your `package.json` `files` array:

```json
{
  "files": [
    "dist",
    "README.md"
  ]
}
```

## Best Practices

1. **Always build before publishing**: Run `npm run build`
2. **Use semantic versioning**: Follow MAJOR.MINOR.PATCH correctly
3. **Write good release notes**: Document what changed in each version
4. **Keep dependencies updated**: Regularly update peer dependencies
5. **Test the published package**: Install it in a test project
6. **Tag releases in git**: Use `git tag` for version tracking
7. **Create GitHub releases**: Add release notes on GitHub

## Quick Reference

```bash
# Check login status
npm whoami

# Dry run to see what will be published
cd v2
npm pack --dry-run

# Build
npm run build

# Publish (first time)
npm publish --access public

# Update version and publish (subsequent releases)
npm version patch  # or minor, or major
npm run build
npm publish

# Push git changes
git push && git push --tags
```

## Example Release

Here's a complete example of publishing version 2.1.0 with new features:

```bash
# 1. Ensure everything is ready
cd v2
git status
npm run build

# 2. Update version
npm version minor -m "Release v%s: Add useToolExecution improvements"
# This creates commit and tag automatically

# 3. Publish
npm publish

# 4. Push to git
git push origin main
git push --tags

# 5. Create GitHub release
# Go to https://github.com/livefire2015/solid-ag-chat/releases/new
# Select tag: v2.1.0
# Title: "v2.1.0 - Tool Execution Improvements"
# Description:
# ## New Features
# - Improved tool execution state tracking
# - Added new hooks for pending tools
#
# ## Breaking Changes
# None
#
# ## Installation
# ```bash
# npm install @livefire2015/solid-ag-chat@2.1.0
# ```
```

Done! Your package is now published to npm!

## Publishing Different Versions

### Publishing v2 (Current)

```bash
cd v2
npm run build
npm version minor -m "Release v%s: New feature"
npm publish
git push && git push --tags
```

### Publishing v1 (Previous)

```bash
cd v1
npm run build
npm version patch -m "Release v%s: Bug fix"
npm publish
git push && git push --tags
```

### Publishing v0 (Deprecated)

**Note**: v0 is deprecated. Only publish critical security fixes.

```bash
cd v0
npm run build
npm version patch -m "Release v%s: Security fix"
npm publish
git push && git push --tags

# Mark as deprecated
npm deprecate @livefire2015/solid-ag-chat@0.x.x "Please upgrade to v2"
```

### Version-Specific Build Outputs

| Version | ES Module | CommonJS | Types |
|---------|-----------|----------|-------|
| v2 | `dist/index.js` | `dist/index.cjs` | `dist/index.d.ts` |
| v1 | `dist/index.js` | `dist/index.cjs` | `dist/index.d.ts` |
| v0 | `dist/index.js` | `dist/index.cjs` | `dist/index.d.ts` |

### Checking Published Versions

```bash
# View all published versions
npm view @livefire2015/solid-ag-chat versions

# View specific version info
npm view @livefire2015/solid-ag-chat@2.0.0

# Check deprecation status
npm view @livefire2015/solid-ag-chat deprecated
```
