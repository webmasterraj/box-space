# Box.Space

A web application built with [Windsurf AI](https://codeium.com/windsurf) for creating notes on the web quickly and efficiently.

Live version: https://box-space.vercel.app

## Features

- Automatically turn URLs into embed cards & YouTube links into embedded videos
- Fast and responsive user interface
- Modern React-based architecture
- Server-side functionality with Express
- Markdown support for rich text formatting

## Tech Stack

- **Frontend**: React 18
- **Build Tool**: Vite 6
- **Backend**: Express.js
- **Markdown Processing**: Marked
- **Development Tools**: ESLint

## Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the development server:

```bash
npm run dev
```

This will start the Vite development server with hot module replacement (HMR).

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Linting

To run the linter:

```bash
npm run lint
```

## Project Structure

- `/src` - Frontend source code
- `/public` - Static assets
- `/server.js` - Express server configuration
- `/vite.config.js` - Vite configuration
