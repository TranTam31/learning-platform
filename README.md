# Moly - Learning Platform

A multi-tenant learning platform where educators build structured curricula and developers create assignment widgets - sandboxed via iframe/WebView, like **Figma plugins** or **Chrome extensions** (pluggable system).

## Monorepo Structure

```
learning-platform/
├── apps/
│   ├── web/                   # Next.js 16 — Web dashboard & course editor
│   ├── backend/               # NestJS 11 — REST API server
│   └── mobile/                # Expo 54 — React Native mobile app
│
├── packages/
│   ├── api-contract/          # ts-rest contracts + Zod schemas
│   ├── auth/                  # Better Auth config (server, client, plugins)
│   └── database/              # Prisma schema, migrations, generated client
```

## Highlights

### Turborepo Monorepo

The project is organized as a **Turborepo monorepo** with npm workspaces, comprising three applications and three shared packages:

| Layer     | Package                 | Framework                   |
| --------- | ----------------------- | --------------------------- |
| Web       | `apps/web`              | **Next.js 16** (App Router) |
| API       | `apps/backend`          | **NestJS 11**               |
| Mobile    | `apps/mobile`           | **Expo 54** (React Native)  |
| Contracts | `packages/api-contract` | **ts-rest** + **Zod**       |
| Auth      | `packages/auth`         | **Better Auth**             |
| Database  | `packages/database`     | **Prisma 7** (PostgreSQL)   |

Turborepo orchestrates builds, linting, type-checking, and database migrations with proper dependency graphs and caching.

### End-to-End Type-Safe API with ts-rest

API contracts are defined **once** in `packages/api-contract` using [ts-rest](https://ts-rest.com/) and [Zod](https://zod.dev/) schemas, then consumed by:

- **NestJS backend** — via `@ts-rest/nest` controller decorators
- **Next.js frontend** — via `@ts-rest/react-query` hooks and a `[...ts-rest]` catch-all route handler
- **Mobile app** — via typed fetch calls against the same contract

This ensures request/response types, path parameters, query strings, and status codes are validated at compile time across the entire stack.

### Better Auth — Authentication & Organization Management

Authentication is powered by [Better Auth](https://www.better-auth.com/) with:

- **Email + password** sign-up/sign-in
- **Session-based** authentication with Prisma adapter (PostgreSQL)
- **Organization plugin** — built-in multi-tenancy with invitation flows
- **Expo plugin** — first-class React Native support with secure token storage

### Prisma ORM & Relational Data Model

The database layer uses **Prisma 7** with PostgreSQL, modeling **18 entities** connected through a rich relational graph:

```
Organization → Course → LessonNode (self-referential tree)
                 ↓
               Class → ClassMember (owner / teacher / student)
                 ↓
         ClassLessonNode → StudentAssignment
                 ↓
            ClassGroup → ClassGroupMember
```

### Multi-Level Permission System

The platform implements a **hierarchical, role-based access control** system across multiple scopes:

| Scope            | Roles                           | Capabilities                                     |
| ---------------- | ------------------------------- | ------------------------------------------------ |
| **Organization** | `owner` · `admin` · `member`    | Org settings, course CRUD, member management     |
| **Class**        | `owner` · `teacher` · `student` | Class management, grading, assignment submission |
| **Class Group**  | Group member                    | Collaborative group activities                   |

### Widget SDK & Plugin Architecture

The platform's most distinctive feature is its **extensible Widget system**, which allows developers to build custom, interactive assignment types — then integrate them into the host platform via **sandboxed iframes** (web) or **WebViews** (mobile).

**How it works** (Similar to Figma plugins / Chrome extensions):

1. **Develop** — Developers link a GitHub repository containing their widget source code
2. **Build** — The platform triggers CI builds via GitHub Actions, producing versioned artifacts (`WidgetBuild`)
3. **Publish** — Successful builds appear in the **Widget Marketplace** for educators to browse
4. **Integrate** — Teachers attach widgets to homework nodes; the platform renders them in a sandboxed iframe/WebView
5. **Communicate** — A `postMessage` bridge protocol handles the lifecycle:

### Course Content Authoring with BlockNote

Lesson content is created using [BlockNote](https://www.blocknotejs.org/) — a modern, block-based rich text editor built on top of ProseMirror/TipTap

## Widget SDK & Plugin System

### For Widget Developers

Widgets are standalone web applications hosted in GitHub repositories. The platform builds and serves them automatically.

| Resource                                                       | Link                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Widget SDK** — Core library & communication protocol         | [github.com/moly-edu/widget-sdk](https://github.com/moly-edu/widget-sdk)           |
| **Widget Template** — Starter project to scaffold a new widget | [github.com/moly-edu/widget-template](https://github.com/moly-edu/widget-template) |

**Communication Protocol:**

```typescript
// Widget → Host: Signal readiness
window.parent.postMessage({ type: "WIDGET_READY" }, "*");

// Host → Widget: Receive configuration parameters
window.addEventListener("message", (event) => {
  if (event.data.type === "PARAMS_UPDATE") {
    const config = event.data.params; // Widget-specific parameters
    // Render your interactive content based on config
  }
});

// Widget → Host: Submit student answer
window.parent.postMessage(
  {
    type: "SUBMIT",
    answer: {
      /* student's response data */
    },
  },
  "*",
);
```

### For Educators

1. Browse the **Widget Marketplace** to find assignment types
2. Attach a widget to a homework node in your course
3. Configure parameters using the auto-generated Tweakpane UI
4. Students interact with the widget in a sandboxed environment

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** database (or [Supabase](https://supabase.com/) project)

### Installation

```bash
# Install dependencies
npm install --force

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL, auth secrets, etc.

# Generate Prisma client
npx turbo run db:generate

# Run database migrations
npx turbo run db:deploy

# Start all apps in development mode
npx turbo run dev
```
