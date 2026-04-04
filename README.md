# Create Screeps TypeScript Starter

Modern TypeScript starter template for [Screeps MMO](https://screeps.com/) with esbuild and hot reloading.

## Quick Start

```bash
# Create a new Screeps bot project
pnpm create @tigatok/screeps-ts-starter my-screeps-bot
cd my-screeps-bot

# Install dependencies
pnpm install

# Set up your Screeps access
cp .env.example .env
cp .screeps.json.example .screeps.json

# Start developing with hot reload
pnpm watch
```

## What's Included

- **⚡ Fast builds** with esbuild
- **🔥 Hot reload** - automatically uploads on file changes
- **📁 Local development** - option to copy files to local Screeps client
- **🎯 Modern TypeScript** - strict mode with latest features
- **📦 Zero config** - works out of the box
- **🗄️ screeps.json** - Supports screeps.json for easier config
- **🐳 Docker support** - Contains a docker-compose file for running a local server

## Available Scripts

```bash
pnpm build        # Build for production
pnpm upload       # Upload to Screeps servers
pnpm push         # Build + upload
pnpm push:local   # Build + copy to local client
pnpm push:ptr     # Build + upload to PTR server
pnpm watch        # Watch files + auto upload
pnpm watch:local  # Watch files + copy to local client
pnpm watch:ptr    # Watch files + upload to PTR server
```

## Configuration

Update env variables in `.env`:

```env
SCREEPS_BRANCH=default

# Screeps MMO server configuration
SCREEPS_TOKEN=your_token_here

# Only needed if running a local server
SCREEPS_LOCAL_USERNAME=your_username
SCREEPS_LOCAL_PASSWORD=your_password
```

Get your token from [Screeps Account Settings](https://screeps.com/a/#!/account/auth-tokens).

## Running Local Server

To run a local Screeps server, ensure you have Docker installed. Copy the server/.env.example to server/.env and replace your steam key and path to nw. Then run:

```bash
cd server && docker-compose up -d
```

## Features

- Modern ES2020+ TypeScript setup
- Automatic bundling with esbuild
- Strict type checking
- Hot reload development workflow
- Support for both MMO and private
- Supports `screeps.json` configuration
- Contains docker-compose for local server
