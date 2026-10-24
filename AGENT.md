# AGENT.md: Operational Directives for AI Coding Assistants

This document serves as the authoritative operating manual for any AI assistant (such as Antigravity, Claude, ChatGPT, or Cursor) working on the **Scotland Yard** codebase.

---

## 🚨 MANDATORY AGENT DIRECTIVES (NON-NEGOTIABLE)

### 1. The Living Architecture Rule
> **MANDATORY**: At the end of every task, work session, or feature implementation, you **MUST update [`CURRENT_ARCHITECTURE_AND_STATUS.md`](file:///Users/nikunjgupta/Downloads/PROJECTS/Scotland%20yard/CURRENT_ARCHITECTURE_AND_STATUS.md)** to accurately reflect:
> - Any newly created, modified, or deleted files.
> - Any changes to file exports, imports, or cross-package dependencies.
> - Any architectural changes, schema additions, or new game mechanics.
> - The updated verification status and passing test count.

Failure to update `CURRENT_ARCHITECTURE_AND_STATUS.md` degrades the context for future AI sessions and is strictly prohibited.

---

### 2. Zero-Leak Anti-Cheat Privacy Rule
> **MANDATORY**: In all detective perspectives (local Pass & Play hotseat, single-player detective view, or networked multiplayer), **Mister X's true position MUST NEVER be leaked**.
> - **Server**: `GameSessionController` and `StateSanitizer` must redact Mister X's station to `-1` and travel log coordinates to `-1` for all detective sockets unless `currentRound` is a surfacing round ($3, 8, 13, 18, 24$) and Mister X has made his move, or `status !== "in_progress"`.
> - **Canvas Viewport**: `BoardViewport.tsx` only renders Mister X's pawn if `xStation > 0`.
> - **Ticket HUD**: `TicketLedgerHUD.tsx` must strictly display `Station: ??? (Secret)` if `viewerRole !== "misterX"` and not surfaced.
> - Never store unredacted Mister X positions in DOM attributes, dataset attributes, or unencrypted localStorage accessible to detective clients.

---

### 3. Node.js v26 Native Strip-Types Rule
> **MANDATORY**: This monorepo uses Node.js v26 with `--experimental-strip-types` to execute TypeScript directly without prior transpilation.
> - You **MUST** import pure types and interfaces using `import type { ... }`:
>   ```ts
>   // ✅ CORRECT
>   import type { PlayerRole, GameState } from "@scotland-yard/common";
>   import { GameEngine } from "@scotland-yard/common";
>
>   // ❌ FATAL RUNTIME ERROR IN NODE 26:
>   import { PlayerRole, GameEngine } from "@scotland-yard/common";
>   ```
> - Mixing types with values in a non-type `import { ... }` causes Node.js v26 to throw:
>   `SyntaxError: The requested module does not provide an export named '...'`.

---

### 4. Next.js 16 Webpack Build Requirement
> **MANDATORY**: In `packages/client/package.json`, the build script is configured as `next build --webpack`.
> - Do not change this to Turbopack (`next build`), as standard terminal sandboxes block socket IPC used by Turbopack PostCSS plugins.
> - Webpack builds compile deterministically with zero sandbox failures.

---

### 5. High-Performance 60 FPS Canvas Directives
> - **Never recalculate heavy geometry inside `requestAnimationFrame`**:
>   - Bezier curve control points, obstacle avoidance bowing vectors, and line offsets must be **pre-computed and cached** in React refs (`controlPointsRef`) on map load or window resize.
>   - The per-frame `render()` loop in `BoardViewport.tsx` must only execute fast 2D affine transforms and `quadraticCurveTo` strokes.

---

## 🗂️ Monorepo Structure & Package Boundaries

```
scotland-yard/
├── packages/
│   ├── common/      # Domain rules, map graphs, AI decision trees, types
│   ├── server/      # Node.js + Express + Socket.io multiplayer authority
│   └── client/      # Next.js 16 + React 19 + Tailwind CSS 4 frontend
├── AGENT.md
├── CURRENT_ARCHITECTURE_AND_STATUS.md
├── README.md
└── package.json
```

### Dependency Rules:
1. `packages/common` has **ZERO runtime external dependencies**. It must run identically in Node.js and modern browsers. Do not import `window`, `document`, `canvas`, or `socket.io` inside `common`.
2. `packages/server` depends on `@scotland-yard/common`.
3. `packages/client` depends on `@scotland-yard/common`. It communicates with `packages/server` exclusively via WebSocket events.

---

## 🛠️ Development & Verification Commands

Always run verification commands from the project root:

```bash
# 1. Run all unit & integration tests across the workspace (Must pass 39/39 tests)
npm test

# 2. Run common engine, AI, and map tests (25 tests)
npm run test:common

# 3. Run server session, anti-cheat, and socket integration tests (14 tests)
npm run test:server

# 4. Lint and typecheck all workspaces (Must have 0 errors)
npm run lint
npm run typecheck

# 5. Compile the client production bundle (Must have 0 TypeScript or webpack errors)
npm run build:client

# 5. Start real-time server in dev mode
npm run dev:server

# 6. Start client frontend in dev mode
npm run dev:client
```

---

## 🧩 Standard Workflow for Any AI Assistant

1. **Orientation**: Read `CURRENT_ARCHITECTURE_AND_STATUS.md` first. Understand the current subsystem states, file exports, and recent changes before generating code.
2. **Implementation**: Make minimal, precise, surgical edits. Respect established coding patterns (React 19 hooks, TypeScript strict mode, Tailwind CSS 4 utility classes).
3. **Verification**:
   - Run `npm test` to verify no regressions in game rules or server sanitization.
   - Run `npm run build:client` to verify TypeScript types and build health.
4. **Documentation**: Update `CURRENT_ARCHITECTURE_AND_STATUS.md` with every file touched, modified, or created, and update the verification logs.
