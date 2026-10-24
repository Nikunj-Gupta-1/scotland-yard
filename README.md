# Digital Scotland Yard 🕵️‍♂️🔍

> 🎮 **Project Type**: **Hobby Project**  
> *Built purely for fun, exploration, and recreation (my AI credits were sitting unused and I'm paying for them, so I figured I might as well put them to good use!). This is not an academic research paper, commercial product, or professional enterprise project.*

A tactical, high-fidelity, multi-device web adaptation of the classic Ravensburger deduction board game **Scotland Yard**. 

Built as a modern TypeScript monorepo featuring 60 FPS HTML5 Canvas cartography with organic curved routes, vector waterways and parks, real-time zero-cheat networked multiplayer, a mathematical "Suspect Possibility Cloud" deduction engine, 3D tabletop operative tokens, autonomous evasive AI, procedural Web Audio soundscapes, post-game replay analysis, and interactive collaborative whiteboards.

---

## 🌟 Highlights & Features

- **Multi-Device First Architecture**:
  - Each player connects on their own device (smartphone, tablet, laptop, or desktop) over local Wi-Fi or public hosting.
  - **Shared Map Model**: The city transit map is the shared ground truth across all devices; all 5 detective pawns are always visible.
  - **Zero-Cheat State Isolation**: Mister X's station coordinates and map pawn are cryptographically/server-side redacted during hidden rounds. The client HUD strictly renders `Station: ??? (Secret)`.
  - **Multi-Detective Control**: A single device can claim and control multiple detectives (e.g. 2 players can divide control of the 5 detectives).
  - **Session Reconnection Grace Window**: Dropped connections or page refreshes preserve seats and roles via secret session tokens with a 45-second grace window before bot takeover.

- **Organic Transit Cartography & Vector City Underlays**:
  - **Vector Waterways**: River Thames (with ferry connections), River Seine (with Île de la Cité), and East & Hudson Rivers.
  - **Organic Green Spaces**: Vector park foliage for Hyde Park, Regent's Park, Jardin des Tuileries, Jardin du Luxembourg, and Central Park.
  - **District Typographic Watermarks & Landmark Badges**: Low-opacity typographic watermarks (Mayfair, Westminster, Soho, Montmartre, Manhattan) and callout badges for prominent transit hubs (Big Ben, Kings Cross, Châtelet, Times Square).
  - **Curved Corridors & Obstacle Avoidance**: Replaces rigid straight lines with smooth quadratic Bezier curves that dynamically bow around unrelated stations, rendering multi-modal tracks (Taxi, Bus, Underground, Ferry) in parallel offset lines.

- **60 FPS Animation & Tabletop Aesthetics**:
  - **Smooth Bezier Pawn Gliding**: Pawns smoothly glide along organic Bezier curves with `easeOutCubic` interpolation and motion trails.
  - **Surfacing Sonar Shockwaves**: Expanding concentric ripples radiate from stations when Mister X surfaces.
  - **"Last Seen" Ghost Silhouette**: Translucent apparition token hovers over Mister X's last confirmed sighting with pulsating radar rings.
  - **Candidate Route Transit Pulses**: Directional dash pulses flow toward adjacent stations when hovering valid moves.
  - **3D Brass & Enamel Operative Tokens**: Heavy tabletop pawns with beveled metallic rims, deep enamel colors, drop shadows, specular glass reflections, and active-turn sonar beacons.

- **Zero-Leak "Suspect Possibility Cloud" Deduction Engine**:
  - Computes the mathematical perimeter of all stations Mister X could possibly occupy based exclusively on public travel log tickets.
  - Automatically prunes detective-occupied stations and police roadblocks.
  - Never inspects private game state or network payloads.

- **Multi-Page Cinematic App Flow & Ergonomic HUD**:
  - **Noir Title Screen**: Atmospheric menu with local match, online multiplayer, field rulebook, and settings.
  - **Pre-Mission Setup Matrix**: Interactive assignment of human players and automated AI bots across roles.
  - **Collapsible Case File Drawer**: Confidential travel log drawer with turn countdowns and click-to-preview station focus.
  - **Station-Anchored Move Popover**: Clean, translucent move card that preserves full visibility of the board.
  - **Squad Bar with One-Click Focus**: Click any squad detective to smoothly pan the camera to their location.

- **Three Metropolitan Maps**:
  - **London (Classic)**: 199 stations, 468 multi-modal routes across Taxi, Bus, Underground, and Thames ferries.
  - **Paris (Intermediate)**: 280 stations, 906 routes across the Seine river and RER rail network.
  - **New York (Expert)**: 380 stations, 1,212 routes through Manhattan grid avenues and East River bridges.

- **Autonomous Evasive AI (Mister X & Detective Bots)**:
  - Multi-source BFS distance field heuristics, escape mobility bonuses, cornered emergency triggers (Black tickets / 2x Double Moves), and surfacing preparation.
  - Automated detective bots capable of patrol and converging on last-known surfaced locations.

- **Tactical Power-Ups Mode**:
  - **Police Roadblocks**: Deploy physical barriers for 2 rounds.
  - **Informant Radar Pings**: Scan whether Mister X is within a 2-hop radius of a chosen station.
  - **Mister X Decoys**: Disguise transit modes in the public travel log.

- **Collaborative Whiteboard Scratchpad**:
  - Drop custom pins (Flags, Questions, Crosses, Notes) directly onto stations, synced in real-time between detective devices over WebSockets.

- **Post-Game Replay Scrubber**:
  - Step forward and backward through the match history with full trajectory ribbons and near-miss counter.

- **Pure Web Audio Procedural Sound Engine**:
  - Synthesized ambient rain, tactile ticket validation clicks, sub-bass Tube rumbles, vintage taxi horns, and surfacing alarms with zero external audio assets.

---

## 🛠️ Technologies & Skills Used

| Domain | Technologies & Key Concepts |
| :--- | :--- |
| **Frontend Engineering** | **Next.js 16** (Webpack Mode), **React 19**, **TypeScript** (strict mode), **Tailwind CSS 4**, Lucide Icons |
| **Graphics & Rendering** | **HTML5 Canvas 2D**, High-DPI Retina scaling (`devicePixelRatio`), Frustum culling, Viewport pan/zoom transforms, Pre-computed geometry caching in `useRef` |
| **Game Theory & Algorithms** | **Graph Theory** (Multi-modal adjacency lists), **Breadth-First Search (BFS)** shortest path & multi-source distance fields, **Quadratic Bezier Curve geometry** with dynamic collision-avoidance normal bowing, **Formal State Machines** |
| **Backend & Real-Time Sync** | **Node.js 26** (`--experimental-strip-types`), **Express**, **Socket.io 4**, Room-based channel routing, **Zero-Cheat State Sanitizer**, Secret reconnection session tokens (`crypto.timingSafeEqual`), IP rate limiting |
| **Audio Programming** | **Web Audio API** procedural synthesis (Biquad filters, Gain nodes, white/pink noise buffers, frequency modulation) |
| **Tooling & Quality Assurance** | **Node Native Test Runner** (`node:test`), **ESLint 9** flat config, **GitHub Actions CI**, Pure type imports (`import type { ... }`) |

---

## 🏗️ Monorepo Architecture

```
scotland-yard/
├── packages/
│   ├── common/      # Pure TypeScript game rules, graph math, deduction engine, maps, AI, and types
│   ├── server/      # Node.js + Socket.io authoritative multiplayer server & anti-cheat sanitizer
│   └── client/      # Next.js 16 + React 19 + Tailwind CSS 4 + HTML5 Canvas cartography
├── .github/workflows/ci.yml           # GitHub Actions CI pipeline
├── AGENT.md                          # Directives and rules for AI assistants
├── CURRENT_ARCHITECTURE_AND_STATUS.md # Complete architectural reference & file catalog
└── package.json                      # Root workspace scripts
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v20+ (Node.js v26 recommended for native strip-types).
- **npm**: v10+.

### 1. Installation
Clone the repository and install all workspace dependencies:
```bash
npm install
```

### 2. Running the Application

Run the server and the frontend client concurrently in two separate terminal windows:

#### Terminal 1: Real-Time Server
```bash
npm run dev:server
```
*Starts the Socket.io WebSocket server on `http://localhost:3001`.*

#### Terminal 2: Web Client
```bash
npm run dev:client
```
*Starts the Next.js frontend application on `http://localhost:3000`.*

---

## 📱 Playing with Friends Across Multiple Devices

### Option A: Local Wi-Fi Network
1. Find your machine's local IP address (e.g. `192.168.1.50` on macOS via `ipconfig getifaddr en0` or Settings).
2. Start both server and client.
3. On your host computer, open `http://localhost:3000`.
4. Click **Online Multiplayer** $\rightarrow$ **Host Room** $\rightarrow$ note the 6-character room code (e.g. `SCOT42`).
5. Other players on the same Wi-Fi network open their browser and visit:
   ```
   http://192.168.1.50:3000/?join=SCOT42
   ```
6. Each player claims their preferred roles in the lobby. One device can claim multiple detectives!
7. The host clicks **Launch Operation**.

### Option B: Internet Play via Port Forwarding or Tunneling
1. Forward ports `3000` (HTTP) and `3001` (WebSocket) on your router, or use a tunneling tool such as `cloudflared` or `ngrok`.
2. Configure `NEXT_PUBLIC_SOCKET_URL` in `packages/client/.env.local` if using a remote domain.

---

## ⌨️ Tactical Controls & Shortcuts

| Key | Action |
| :--- | :--- |
| `Space` | Center camera on active operative |
| `1` – `5` | Quick-focus detectives (Red, Green, Yellow, Blue, Purple) |
| `S` | Toggle Detective Scratchpad Whiteboard |
| `M` | Toggle Audio Mute |
| `?` or `/` | Open Field Rulebook & Strategy Manual |
| `Esc` | Close active popups or cancel targeting modes |
| Mouse Wheel / Pinch | Smooth Zoom ($0.3\times$ to $3.0\times$) |
| Click & Drag | Pan board viewport |

---

## 🧪 Testing & Verification

Run the comprehensive test suite across all packages:
```bash
# Run all unit tests (Common + Server - 43 tests)
npm test

# Run common engine, graph, and deduction tests (29 tests)
npm run test:common

# Run multiplayer server unit & socket integration tests (14 tests)
npm run test:server

# Lint and typecheck all packages
npm run lint
npm run typecheck

# Build production client bundle
npm run build:client
```

---

## 📜 Documentation Reference
- **[AGENT.md](AGENT.md)**: Operating guidelines and mandatory maintenance rules for AI agents.
- **[CURRENT_ARCHITECTURE_AND_STATUS.md](CURRENT_ARCHITECTURE_AND_STATUS.md)**: Exhaustive architectural manual, file-by-file dependency catalog, and subsystem deep dives.

---

## 📄 License
MIT License. Built for fun & recreational enjoyment.
