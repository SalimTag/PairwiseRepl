# Pairwise

A real-time collaborative code review and pair programming platform built with [Replit Core](https://replit.com). Pairwise provides a VS Code-like editing experience with session snapshots, inline comments, diff viewing, and session replay — all synchronized in real time via WebSockets.

## Features

- **Live Collaborative Editing** — Multiple participants edit code simultaneously with real-time synchronization via WebSockets.
- **Monaco Code Editor** — Full VS Code editing experience with syntax highlighting, IntelliSense, and theming.
- **Snapshot System** — Capture point-in-time code states, browse a visual timeline, and restore any previous snapshot.
- **Diff Viewer** — Compare snapshots side-by-side with line-level change highlighting.
- **Inline Comments** — Add line-specific comments with range selection, threaded replies, and resolve/unresolve status.
- **Session Replay** — Play back session history with adjustable speed controls.
- **Participant Presence** — See who's online, their roles (host/participant/observer), and cursor positions.
- **Multi-file Projects** — File tree navigation with full CRUD support for project files.
- **Session Management** — Create, join, and manage sessions with status tracking (scheduled, live, finished).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Components** | shadcn/ui (Radix UI), Tailwind CSS |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **State Management** | TanStack Query (React Query) |
| **Routing** | Wouter |
| **Backend** | Express.js, TypeScript |
| **Real-time** | WebSocket (`ws`) |
| **Database** | PostgreSQL (Neon serverless) |
| **ORM** | Drizzle ORM |
| **Validation** | Zod (via `drizzle-zod`) |
| **Platform** | Built and deployed with Replit Core |

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- A PostgreSQL database (the project uses [Neon](https://neon.tech/) serverless Postgres)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/SalimTag/PairwiseRepl.git
cd PairwiseRepl
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root (or set the variables in your environment):

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
PORT=5000
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `PORT` | Server port (defaults to `5000`) |

### 4. Push the database schema

```bash
npm run db:push
```

This runs `drizzle-kit push` to apply the schema defined in `shared/schema.ts` to your database.

### 5. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`. Vite handles hot module replacement for the frontend while Express serves the API.

## Project Structure

```
PairwiseRepl/
├── client/                  # Frontend (React + Vite)
│   ├── index.html           # HTML entry point
│   ├── public/              # Static assets
│   └── src/
│       ├── App.tsx           # Root component and router
│       ├── main.tsx          # Application entry point
│       ├── index.css         # Global styles and CSS variables
│       ├── components/       # Feature components
│       │   ├── session-editor.tsx      # Monaco editor integration
│       │   ├── snapshot-timeline.tsx   # Snapshot history timeline
│       │   ├── comment-panel.tsx       # Inline comment management
│       │   ├── diff-viewer.tsx         # Snapshot diff visualization
│       │   ├── session-replay.tsx      # Session playback controls
│       │   ├── participant-list.tsx    # Participant presence UI
│       │   └── ui/                     # shadcn/ui primitives
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # Utilities and query client
│       └── pages/            # Route pages (home, session, not-found)
├── server/                  # Backend (Express)
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # REST API and WebSocket handlers
│   ├── storage.ts           # Database storage abstraction layer
│   ├── db.ts                # Database connection (Drizzle + Neon)
│   ├── seed.ts              # Database seed data
│   └── vite.ts              # Vite dev server integration
├── shared/                  # Shared code (client + server)
│   └── schema.ts            # Drizzle schema, Zod validators, TypeScript types
├── drizzle.config.ts        # Drizzle Kit configuration
├── vite.config.ts           # Vite build configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── components.json          # shadcn/ui configuration
├── postcss.config.js        # PostCSS configuration
└── package.json             # Dependencies and scripts
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Build the frontend (Vite) and bundle the server (esbuild) |
| `npm run start` | Run the production build |
| `npm run check` | Type-check the project with TypeScript |
| `npm run db:push` | Push the Drizzle schema to the database |

## API Overview

All API endpoints are served under the `/api` namespace:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/sessions/:id` | Get a session by ID |
| `POST` | `/api/sessions` | Create a new session |
| `PATCH` | `/api/sessions/:id/status` | Update session status |
| `GET` | `/api/sessions/:id/snapshots` | List snapshots for a session |
| `POST` | `/api/sessions/:id/snapshots` | Create a snapshot |
| `GET` | `/api/snapshots/:id` | Get a snapshot by ID |
| `GET` | `/api/sessions/:id/comments` | List comments for a session |
| `POST` | `/api/sessions/:id/comments` | Add an inline comment |
| `PATCH` | `/api/comments/:id/status` | Update comment status |
| `GET` | `/api/sessions/:id/participants` | List session participants |
| `GET` | `/api/projects/:id/files` | List files in a project |
| `POST` | `/api/projects/:id/files` | Create a file |
| `PATCH` | `/api/files/:id` | Update file content |
| `DELETE` | `/api/files/:id` | Delete a file |

**WebSocket** — Connect to `/ws` for real-time session events (editor changes, cursor positions, participant presence).

## Deployment

The project is configured for deployment on **Replit** with autoscaling:

```bash
# Build for production
npm run build

# Start the production server
npm run start
```

The production build outputs to `dist/` — Vite bundles the frontend into `dist/public/` and esbuild bundles the server into `dist/index.js`. The server serves both the API and the static frontend assets.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please ensure your code passes type checking (`npm run check`) before submitting.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
