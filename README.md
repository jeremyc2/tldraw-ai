## Tldraw AI

A Next.js application that integrates AI agent capabilities with [tldraw](https://tldraw.com/), a collaborative digital whiteboard library. This project leverages the **Cursor Agent CLI** for AI-powered automation and enables users to create and interact with agent-driven shape tools within the tldraw interface.

### Features

- **AI Agent Tool**: Custom tldraw tool for creating agent prompt shapes on the canvas
- **Cursor Agent CLI Integration**: Powers the application with headless AI automation capabilities
- **Modern Stack**: Built with Next.js, React, TypeScript, and Tailwind CSS
- **Seamless Integration**: AI agent functionality integrated directly into the tldraw UI
- **API Integration**: Backend API route for handling agent operations

### Tech Stack

- **Framework**: Next.js
- **UI Library**: React
- **Drawing**: tldraw
- **Styling**: Tailwind CSS, PostCSS
- **Language**: TypeScript
- **Code Quality**: Biome
- **Runtime**: Bun
- **AI Automation**: Cursor Agent CLI

### Getting Started

#### Prerequisites

- [Bun](https://bun.sh/)
- [Cursor Agent CLI](https://cursor.com/docs/cli)

#### Installing Cursor Agent CLI

```bash
# Install Cursor CLI
curl https://cursor.com/install -fsS | bash
```

#### Installation

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

The application will be available at `http://localhost:3000`.

#### Build & Deployment

```bash
# Build for production
bun run build

# Start production server
bun start
```

### Development

#### Code Quality

```bash
# Lint and format code
bun run lint

# Format code
bun run format
```

### Usage

1. Open the application in your browser
2. Use the AI Agent tool (Shift+A) from the toolbar
3. Draw shapes on the canvas to create agent prompts
4. Interact with AI-powered functionality through the custom shapes

### API

The application includes an API route at `/api/agent` for handling AI agent operations. This endpoint integrates with the **Cursor Agent CLI** to process agent prompts and execute AI-powered automation tasks.

### Documentation

See [docs/](docs/) for additional documentation and guides.

