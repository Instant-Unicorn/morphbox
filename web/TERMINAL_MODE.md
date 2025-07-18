# Morphbox Terminal Mode

Terminal mode allows you to run Morphbox with only the Claude Code interface, perfect for when you want a focused AI coding assistant experience without the full Morphbox UI.

## Usage

After building the project, you can run Morphbox in terminal mode using any of these methods:

### Method 1: NPM Script
```bash
npm run build
npm run start:terminal
```

### Method 2: Direct Server Command
```bash
npm run build
node server.js --terminal
```

### Method 3: Executable Script (after npm link)
```bash
npm run build
npm link
morphbox-terminal
```

## What's Different in Terminal Mode?

- **Focused Interface**: Only Claude Code is loaded, no file explorer, code editor, or other panels
- **Minimal UI**: Clean interface with just the Claude terminal
- **Same Functionality**: All Claude Code features work exactly the same
- **WebSocket Support**: Full terminal and AI capabilities via WebSocket connection

## Building for Production

1. Build the project:
   ```bash
   npm run build
   ```

2. The build output will be in the `build/` directory

3. Run in terminal mode:
   ```bash
   node server.js --terminal
   ```

## Environment Variables

- `PORT`: HTTP server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `WS_PORT`: WebSocket server port (default: 8009)

## Development

For development with hot reloading, you'll need to run the regular dev server and manually navigate to a terminal-only view. The terminal mode flag only works with the production build.

## Command Line Arguments

- `--terminal`: Start in terminal mode (Claude Code only)

Future arguments could include:
- `--port <number>`: Override default port
- `--ws-port <number>`: Override WebSocket port
- `--host <address>`: Override host address