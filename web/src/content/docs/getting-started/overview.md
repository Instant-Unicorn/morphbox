---
title: Overview
description: Introduction to MorphBox - a fast-loading safe AI sandbox for development
lastModified: 2025-07-21
---

# Welcome to MorphBox

MorphBox is a powerful, secure development environment that provides a fast-loading sandbox for AI-assisted development with Claude. It combines the flexibility of a full development environment with the safety of containerization and the intelligence of AI assistance.

## What is MorphBox?

MorphBox is:
- **A Development Sandbox**: Complete isolated environment for safe experimentation
- **AI-Powered**: Deep integration with Claude AI for intelligent assistance
- **Persistent**: Sessions continue running even when you close your browser
- **Customizable**: Create custom panels and workflows tailored to your needs
- **Secure**: Containerized environment keeps your system safe
- **Fast**: Optimized for quick startup and responsive interaction

## Key Features

### 1. Persistent Terminal Sessions
Your terminal sessions keep running using GNU Screen, surviving:
- Browser crashes or closures
- Network disconnections
- Computer sleep/hibernation
- Tab switching on mobile devices

### 2. Custom Panel System
Create custom tools and interfaces without coding:
- Visual panel builder with templates
- Live preview as you build
- Share panels with your team
- Extend MorphBox's functionality

### 3. Built-in Developer Tools
Everything you need out of the box:
- **Terminal**: Full bash shell with persistence
- **Claude AI**: Integrated AI assistant
- **File Explorer**: Browse and manage files
- **Code Editor**: Monaco-based editor with syntax highlighting
- **Session Manager**: Monitor and manage persistent sessions
- **Settings**: Customize appearance and behavior

### 4. Mobile Support
Full functionality on mobile devices:
- Responsive layout that adapts to any screen
- Touch-optimized controls
- Mobile-specific optimizations
- Session persistence across app switches

### 5. Theme Customization
Make MorphBox yours:
- Multiple built-in themes
- Custom color schemes
- Font and size preferences
- Workspace layouts

## Use Cases

MorphBox is perfect for:
- **Learning**: Safe environment to experiment with new technologies
- **Prototyping**: Quickly build and test ideas with AI assistance
- **Development**: Full-featured development environment with AI pair programming
- **Teaching**: Provide students with consistent, accessible environments
- **Remote Work**: Access your development environment from anywhere

## Architecture Overview

MorphBox consists of:
- **Web Interface**: SvelteKit-based responsive UI
- **Backend Server**: Node.js server handling API and WebSocket connections
- **Docker Container**: Isolated environment running your code
- **Session Manager**: GNU Screen-based session persistence
- **Panel System**: Modular, extensible UI components

## Getting Started

Ready to dive in? Here's where to go next:

1. **[Installation Guide](/docs/getting-started/installation)** - Set up MorphBox on your system
2. **[Quick Start](/docs/getting-started/quick-start)** - Get up and running in minutes
3. **[Panel System](/docs/user-guide/panels)** - Learn about the flexible UI
4. **[Custom Panels](/docs/user-guide/custom-panels)** - Create your own tools

## Philosophy

MorphBox is built on these principles:

1. **Safety First**: Experiments should never risk your system
2. **Power Without Complexity**: Advanced features that are easy to use
3. **AI Enhancement**: AI should augment, not replace, human creativity
4. **Persistence Matters**: Your work should survive interruptions
5. **Extensibility**: Users should be able to extend and customize

## Community

Join the MorphBox community:
- Report issues and request features on [GitHub](https://github.com/morphbox/morphbox)
- Share custom panels and workflows
- Get help from other users
- Contribute to the project

Welcome to MorphBox - let's build something amazing together!