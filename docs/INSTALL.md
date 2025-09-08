# MorphBox Installation Guide

## Clean Installation Steps

If you're having issues with npm installation, follow these steps:

### 1. Clean up existing installation

Run this command with sudo to remove stuck files:
```bash
sudo rm -rf /home/$USER/.npm-global/lib/node_modules/morphbox* /home/$USER/.npm-global/lib/node_modules/.morphbox-* /home/$USER/.npm-global/bin/morphbox /usr/local/bin/morphbox
```

### 2. Install MorphBox

```bash
npm install -g morphbox-0.7.1.tgz
```

### 3. Add npm global bin to PATH

Add this to your `~/.bashrc` or `~/.zshrc`:
```bash
export PATH="$HOME/.npm-global/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

### 4. Verify installation

```bash
morphbox --help
```

## Alternative: Using npx (No installation needed)

You can also run morphbox directly without installing:
```bash
npx morphbox-0.7.1.tgz --terminal
```

## Troubleshooting

If you see "command not found", make sure:
1. The npm global bin directory is in your PATH
2. You've reloaded your shell configuration

To find your npm global bin directory:
```bash
npm config get prefix
# The bin directory is: <prefix>/bin
```

For most users, this is `~/.npm-global/bin` or `/usr/local/bin`.