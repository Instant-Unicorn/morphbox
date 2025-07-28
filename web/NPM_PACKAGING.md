# NPM Packaging Instructions

This document describes how the morphbox npm package is structured after the reorganization.

## Package Structure

The morphbox project is now packaged as a single npm package from the `web` directory:

```
web/
├── package.json          # Main package configuration
├── README.md            # Development README (for GitHub)
├── README.npm.md        # NPM README (copied to README.md during publish)
├── .npmignore           # Files to exclude from npm package
├── bin/
│   ├── morphbox.js      # Main morphbox command
│   └── install.js       # Installer command
├── build/               # Built SvelteKit app
├── src/                 # Source code
└── ...
```

## Publishing Process

1. **Build the project**:
   ```bash
   cd web
   npm run build
   ```

2. **Test locally**:
   ```bash
   npm pack
   # This creates morphbox-2.0.0.tgz
   npm install -g morphbox-2.0.0.tgz
   ```

3. **Publish to npm**:
   ```bash
   npm publish
   ```

   The publish process automatically:
   - Runs `npm run build` (via prepare script)
   - Copies README.npm.md to README.md (via prepublishOnly)
   - Publishes the package
   - Restores the original README.md (via postpublish)

## Package Contents

The published npm package includes:
- `bin/` - Command-line tools (morphbox, morphbox-installer)
- `build/` - Built SvelteKit application
- `src/` - Source code (for debugging)
- `static/` - Static assets
- `server.js` - Main server entry point
- `morphbox-terminal` - Terminal mode script
- Configuration files (package.json, svelte.config.js, etc.)

## Commands Provided

After installation, users get two global commands:

1. **morphbox** - Main command to start MorphBox
   - `morphbox` - Start web interface
   - `morphbox --terminal` - Start Claude in terminal mode
   - `morphbox --help` - Show help

2. **morphbox-installer** - Installer to set up Docker environment
   - `morphbox-installer` - Run full installation
   - `morphbox-installer --dry-run` - Check requirements only

## Usage Flow

1. User installs the package: `npm install -g morphbox`
2. User runs installer: `morphbox-installer`
   - Checks for Docker, Git, etc.
   - Clones morphbox repository to ~/.morphbox
   - Sets up Docker containers
3. User runs morphbox: `morphbox`
   - Checks if ~/.morphbox exists
   - Starts the morphbox-start script from the cloned repo

## Version Management

- Package version is in `web/package.json`
- Update version before publishing
- Tag releases in git: `git tag v2.0.0`