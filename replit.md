# Pairwise - Real-time Collaborative Code Review Platform

## Overview

Pairwise is a collaborative code review and pair programming platform that enables real-time code editing with session snapshots, inline comments, and session replay capabilities. The application provides a VS Code-like editing experience with Linear-inspired UI patterns, supporting multiple participants in live coding sessions with full version control through snapshots.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and caching

**UI Framework**
- **shadcn/ui** component library based on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Monaco Editor** (@monaco-editor/react) as the primary code editing interface
- Custom theme system extending shadcn's "new-york" style with neutral base colors

**Design System**
- Typography: Inter font family for UI, Fira Code for code snippets
- Layout follows a three-panel structure: left sidebar (file tree/participants), center editor, right panel (comments/chat)
- Spacing primitives use Tailwind's standard scale (2, 3, 4, 6, 8, 12)
- Color system uses HSL CSS variables for theme customization

**Key Frontend Components**
- `SessionEditor`: Main code editing interface with Monaco integration and file tree navigation
- `SnapshotTimeline`: Visual timeline of code snapshots with author/timestamp metadata
- `CommentPanel`: Inline comment management with resolved/open filtering
- `DiffViewer`: Line-by-line diff visualization using the `diff` library
- `SessionReplay`: Playback system for reviewing session history with speed controls
- `ParticipantList`: Real-time participant presence indicators

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript for REST API endpoints
- **WebSocket (ws library)** for real-time bidirectional communication
- Custom middleware for request logging and JSON parsing with raw body access

**API Design Pattern**
- RESTful endpoints under `/api` namespace
- Resource-oriented routes: `/api/sessions`, `/api/snapshots`, `/api/comments`
- WebSocket endpoint at `/ws` for live session updates
- Response format includes related entities (e.g., sessions include host user data)

**Real-time Communication**
- WebSocket server mounted on HTTP server for session collaboration
- Supports live code changes, cursor positions, and participant updates
- Connection management for session-specific message broadcasting

**Storage Abstraction Layer**
- Interface-based storage pattern (`IStorage`) in `server/storage.ts`
- Database operations abstracted through Drizzle ORM
- CRUD operations for: Users, Projects, Sessions, Snapshots, Files, InlineComments, SessionParticipants

### Data Storage Solutions

**ORM and Database**
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** via Neon's serverless driver (@neondatabase/serverless)
- WebSocket constructor override for serverless environment compatibility
- Connection pooling with `@neondatabase/serverless` Pool

**Schema Design**
- **users**: Authentication and profile data with username uniqueness
- **projects**: Container for files owned by users
- **sessions**: Live or scheduled review sessions with status tracking (scheduled/live/ended)
- **snapshots**: Point-in-time code states with JSONB diff storage and optional base snapshot reference
- **files**: Project files with content and path tracking
- **inlineComments**: Line-specific comments with range, status (open/resolved), and parent thread support
- **sessionParticipants**: Join table for user-session relationships with role assignment (host/participant/observer)

**Data Relationships**
- Cascade deletes on user/project removal
- Soft deletes through status fields (session status, comment resolution)
- Foreign key constraints with `onDelete` policies

**Migration Strategy**
- Drizzle Kit for schema migrations in `./migrations` directory
- Schema definition in `shared/schema.ts` for type sharing between client and server
- Zod schemas generated from Drizzle tables for runtime validation

### External Dependencies

**Third-party Services**
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Google Fonts**: Inter and Fira Code font families served via CDN

**Key NPM Packages**
- **@monaco-editor/react**: VSCode's Monaco editor component
- **diff**: Text diff algorithm for change visualization
- **date-fns**: Date formatting and manipulation
- **nanoid**: Unique ID generation
- **zod**: Runtime schema validation via drizzle-zod integration
- **class-variance-authority (cva)**: Type-safe variant styling for components

**Development Tools**
- **TypeScript**: Strict mode enabled with ESNext modules
- **esbuild**: Production server bundling
- **tsx**: TypeScript execution for development server
- **Replit plugins**: Runtime error overlay, cartographer, dev banner (dev environment only)

**Session Management**
- **connect-pg-simple**: PostgreSQL session store for Express (package present but implementation details not in provided files)

## Recent Changes

### MVP Launch Ready (November 13, 2025)
- ✅ Complete database schema with 7 tables implemented and seeded
- ✅ Full REST API with all CRUD endpoints for sessions, snapshots, comments, and files
- ✅ WebSocket server for real-time collaboration (editor sync, cursor positions, participant presence)
- ✅ Session creation and management UI with live/scheduled/finished status tracking
- ✅ Monaco editor integration with file tree navigation
- ✅ Snapshot system with timeline view and diff comparison
- ✅ Inline comment system with resolve/unresolve functionality
- ✅ Participant tracking with real-time presence updates
- ✅ Complete React Query integration for API state management
- ✅ End-to-end testing verified all critical user flows
- ✅ Visual design following VS Code/Linear/GitHub patterns with Inter and Fira Code fonts

### Snapshot/Time-Travel System Implementation (November 14, 2025)
- ✅ **Complete snapshot system** with restore and time-travel capabilities
- ✅ **Backend API endpoints**: GET /api/snapshots/:id for full snapshot retrieval
- ✅ **Server-side metadata computation**: Backend calculates total lines and files modified
- ✅ **Snapshot format**: Normalized `{ files: Record<string,string>, metadata: { linesChanged, filesModified } }`
- ✅ **Backward compatibility**: Restore logic handles both Record and legacy Array snapshot formats
- ✅ **Real-time collaboration**: WebSocket 'snapshot-created' events broadcast to all session participants
- ✅ **Client-side snapshot refresh**: Automatic snapshot list updates when new snapshots are created
- ✅ **SnapshotTimeline component**: Displays snapshots with metadata badges (file count, total lines)
- ✅ **Restore functionality**: Click "Restore" button to view historical snapshot in read-only mode
- ✅ **Read-only mode**: Monaco editor becomes read-only when viewing snapshots
- ✅ **"Viewing snapshot" banner**: Amber warning banner with timestamp when in snapshot view
- ✅ **"Back to Live" functionality**: Exits snapshot view and refetches latest files from database
- ✅ **File persistence integration**: Snapshots work seamlessly with database-backed file storage
- ✅ **E2E testing verified**: Complete snapshot create → restore → back to live flow tested

**Implementation Notes:**
- `linesChanged` metadata represents total lines in snapshot files (snapshot size metric), not diff delta against previous snapshot
- For true diff calculation (added/removed lines), would need to compare against base/previous snapshot
- Legacy snapshots (array format) are handled on read without database migration
- WebSocket events currently support snapshot creation broadcasts; update/delete events not implemented

### Known Issues
- Vite HMR WebSocket warnings in browser console (cosmetic, does not affect functionality)
- Monaco editor focus quirk (minor interaction issue, does not block usage)

## Current Features

### Core Functionality
1. **Session Management**
   - Create new collaborative coding sessions
   - Join existing sessions as host, participant, or observer
   - Live session status tracking (scheduled/live/finished)
   - Session list with participant counts and timestamps

2. **Code Editor**
   - Monaco editor with VS Code theming
   - Multi-file project support with file tree navigation
   - Real-time code synchronization via WebSocket
   - Syntax highlighting for TypeScript, JavaScript, and more

3. **Snapshot System**
   - Capture point-in-time code states with descriptions
   - Timeline view of all session snapshots
   - Visual diff viewer for comparing snapshots
   - Author attribution and timestamp tracking

4. **Comments & Review**
   - Line-specific inline comments on code
   - Comment threads with range selection
   - Resolve/unresolve comment status
   - Filter by open/resolved comments

5. **Real-time Collaboration**
   - WebSocket-based live editing
   - Participant presence tracking
   - Cursor position sharing (infrastructure ready)
   - Instant code synchronization across clients

### User Interface
- Clean, developer-focused design inspired by VS Code and Linear
- Three-panel layout: file tree, editor, and activity panel
- Responsive design with proper spacing and typography
- Loading states, error handling, and empty states
- Toast notifications for user feedback