# HackerTrace — Project Reference

A hacker‑style traceroute terminal with synchronized world map animations and a typing speed (WPM) terminal tool. This document is the single source of truth for architecture, conventions, commands, and troubleshooting so we can resume work instantly.

----------------------------------------------------------------

## TL;DR Quickstart (Windows)
- Requirements: Node 18+ (LTS), pnpm or npm
- Install: `npm install`
- Dev: `npm run dev` then open http://localhost:3000
- Build: `npm run build`
- Start prod: `npm run start`

If Next shows an icon error, ensure `app/icon.png` and `app/favicon.ico` are valid PNG/ICO or remove them.

----------------------------------------------------------------

## Tech Stack
- Next.js App Router (14.x)
- React 18
- TailwindCSS 3
- framer-motion 11 (typing + arc animations)
- react-simple-maps 3 (2D world map)
- TypeScript 5
- prop-types (peer dep for react-simple-maps)

Key theme
- Background: #0A0A0A (near black)
- Accent: Neon Green (#00FF00)
- Font: Fira Code, monospace

----------------------------------------------------------------

## High-Level Features
- Hacker Terminal UI with:
  - Blinking neon cursor
  - Command history (↑/↓)
  - Tab autocompletion (trace-route + cities)
  - Log typing effect (per-char), occasional glitch jitter
  - One-time boot sequence (sessionStorage gated)
- Traceroute Simulation:
  - 8–16 hops, latency increases 5→200ms
  - Reserved/private IP ranges: 10.x.x.x, 192.0.2.x, 198.51.100.x, 203.0.113.x
  - Random `* * *` hop timeouts
  - Ends with FINAL HANDSHAKE... OK + TRACE COMPLETE.
- World Map:
  - Countries (dark gray), graticule
  - Neon markers for source (Delhi) + destination
  - Great-circle arc with 2s strokeDash animation
  - Glowing “packet” dot traveling along the path, synced to logs
  - Only one active arc at a time
- Typing (WPM) Page:
  - Hacker terminal themed typing test
  - Time and words modes, per-char accuracy, metrics, session history, export

----------------------------------------------------------------

## Routes & Pages
- `/` — Landing: hacker-themed intro, CTA to Trace and Typing
- `/trace` — Main hacker terminal + traceroute map UI
- `/typing` — Terminal-based typing speed calculator (WPM tool)

Note: A top navbar links to Home, Trace, Typing.

----------------------------------------------------------------

## Data: Cities
Source is always Delhi. Supported destinations:

```ts
export const cities = [
  { name: "delhi",  label: "Delhi, India",            coordinates: [77.2090, 28.6139] },
  { name: "paris",  label: "Paris, France",           coordinates: [2.3522, 48.8566] },
  { name: "tokyo",  label: "Tokyo, Japan",            coordinates: [139.6917, 35.6895] },
  { name: "nyc",    label: "New York City, USA",      coordinates: [-74.0060, 40.7128] },
  { name: "london", label: "London, UK",              coordinates: [-0.1276, 51.5074] },
  { name: "sydney", label: "Sydney, Australia",       coordinates: [151.2093, -33.8688] }
] as const;
```

Normalization examples (map to `name` field):
- “new york”, “ny”, “nyc”, “newyorkcity” → nyc
- “delhi”, “ncr” → delhi
- “syd” → sydney

Add more cities in `lib/cities.ts` and update autocomplete lists.

----------------------------------------------------------------

## Core Commands (Terminal)
- `trace-route <city>` — Run cinematic traceroute; updates map and plays arc + packet animation in sync.
- `cities` — Print supported destinations.
- `clear` — Clear terminal logs.
- `help` — Show available commands.

Planned/Optional:
- `mode real` — Use live APIs (ip-api/ipinfo) for traceroute-like hops; fallback to fake when offline.
- `whoami` — Show hacker-style profile card.
- `scan <city>` — Fake port scan results.
- `ping <city>` — Simulated ping (ms).
- `ascii <word>` — ASCII art render.
- `mode 3d` — Switch to 3D globe (react-globe.gl).

----------------------------------------------------------------

## Architecture Overview

App Router structure (expected)
- app/
  - layout.tsx — Global theme, fonts, navbar
  - globals.css — Tailwind + custom effects
  - page.tsx — Landing page (intro)
  - trace/page.tsx — Trace CLI + Map composition
  - typing/page.tsx — Typing tool
- components/
  - Navbar.tsx — Top navigation (neon)
  - Terminal.tsx — Input, logs, command parsing, history, autocomplete
  - Map.tsx — Map rendering, markers, arc animation, packet
  - UI/… — Small shared UI elements if needed
- lib/
  - traceroute.ts — Fake traceroute generator
  - cities.ts — City dataset + normalization helpers
  - commands/ — Modular command registry (exec + help text)
  - storage.ts — localStorage/sessionStorage helpers
  - utils.ts — Formatting, RNG, animation helpers

Data flow (trace)
1) User input in Terminal → parse command.
2) `trace-route <city>`:
   - Resolve destination from `cities`.
   - Generate traceroute hops via `lib/traceroute.ts`.
   - Start log typing sequence; compute total log duration.
   - Notify Map of new destination and an animation timeline (or a progress stream).
3) Map:
   - Reset previous arc; compute great-circle path.
   - Measure SVG path length; animate strokeDash from full to zero over total duration (2s baseline or synced to logs).
   - Packet dot moves along path using `getPointAtLength(progress * totalLength)`.
4) Terminal and Map:
   - Sync via a shared progress state or a scheduler; when logs complete, set packet position to end and mark “TRACE COMPLETE.”

----------------------------------------------------------------

## Terminal Internals

Typing effect
- Use framer-motion to reveal characters progressively.
- Log entries render line-by-line. Each line has:
  - text
  - timestamps or intended delay (derived from hop latency)
  - flags: glitch, highlight, error

Glitch effect
- Small random jitter or skew on selected lines using framer-motion transforms or CSS keyframes.

History & Autocomplete
- History: array with index; ArrowUp/Down cycles.
- Autocomplete: Tab cycles through matches (command then argument):
  - If input starts with `tr`, auto to `trace-route `.
  - For `trace-route ` argument, show city completions by prefix.

Boot sequence
- sessionStorage key (e.g., `hackertrace:booted=true`) ensures we run the cinematic boot only once per browser session.

----------------------------------------------------------------

## Traceroute Generator (lib/traceroute.ts)

Behavior
- Hops: random 8–16.
- Latency: monotonically increasing across hops from ~5ms to ~200ms with noise.
- IP pools:
  - 10.x.x.x (private)
  - 192.0.2.x (TEST-NET-1)
  - 198.51.100.x (TEST-NET-2)
  - 203.0.113.x (TEST-NET-3)
- Timeout insertion: random hops output `*  *  *    Request timed out.`

Output schema
```ts
export type Hop = {
  index: number;          // 1-based hop count
  ip?: string;            // missing when timeout
  ms?: number;            // missing when timeout
  timeout?: boolean;      // indicates asterisks line
  text: string;           // pre-formatted line for terminal
  delayMs: number;        // delay before printing this line
};
```

Final lines appended:
- `FINAL HANDSHAKE... OK`
- `TRACE COMPLETE.`

Sync
- Sum of `delayMs` determines total “trace duration”.
- Map uses either a fixed 2s arc draw or matches terminal total duration for perfect sync (recommended).

----------------------------------------------------------------

## Map Internals (components/Map.tsx)

Library
- react-simple-maps: `ComposableMap`, `Geographies`, `Geography`, `Graticule`, `Marker`
- Projection: default geoEqualEarth or geoNaturalEarth1 (sane for world)
- Countries styling: dark gray fill, thin neon borders optional
- Graticule: subtle lines to give hacker radar feel

Markers
- SVG circles with neon glow:
  - Tailwind idea: `fill-[#00ff00] drop-shadow-[0_0_6px_#00ff00]`

Great-circle arc
- Approach A (simple, chosen):
  - Render `Line` to get a projected path
  - Clone its `d` attribute into a custom `<path>` we control
  - Measure `path.getTotalLength()`
- Stroke animation:
  - Set `strokeDasharray = totalLength`
  - Animate `strokeDashoffset` from `totalLength → 0` over duration (easeOut)
- Packet dot:
  - On `requestAnimationFrame`, compute `point = path.getPointAtLength(progress * totalLength)`
  - Place a glowing circle at that coordinate
  - Stop at end or loop for “packet storm” mode

Reset logic
- When a new destination is set or `clear` is called:
  - Remove previous path, reset packet position, clear timers/raf

Responsiveness
- Stack terminal above map on small screens; use fixed aspect ratio for map container and responsive width.

----------------------------------------------------------------

## Typing Tool (Typing WPM) — Design Notes

Modes
- Time mode: 15, 30, 60, 120 sec
- Words mode: 10, 25, 50 words
- Option toggles:
  - Punctuation on/off
  - Numbers on/off
  - Case sensitivity on/off
  - Difficulty (word pool filter)

Metrics
- Characters: total, correct, incorrect, corrected (backspaces)
- Accuracy: correct / total
- Gross WPM: (typedChars / 5) / minutes
- Net WPM: (correctChars / 5) / minutes
- Consistency: std dev of WPM over sliding windows
- Error map: indices of mistakes; highlight in UI

Flow
- Generate a test prompt (word list) on start
- Countdown (3..2..1), then timer
- Capture keystrokes; compare char-by-char
- End when timer ends (time mode) or when words completed
- Show results dashboard:
  - WPM, accuracy, raw stats
  - Timeline chart (optional future)
  - List of most missed keys/words
- Save to localStorage history; allow export JSON/TXT

Shortcuts
- Enter: start/reset when ready
- Esc: cancel
- Ctrl+Backspace: delete previous word
- Tab: focus begin

Theming
- Same neon terminal look
- Cursor is a blinking green block/beam
- Optional CRT scanlines overlay

----------------------------------------------------------------

## Styling & Theme

Tailwind tokens
- Colors:
  - bg: `bg-[#0A0A0A]`
  - neon text: `text-[#00ff00]`
  - glow: `drop-shadow-[0_0_6px_#00ff00]`
- Fonts:
  - Fira Code loaded in layout (via @import or next/font)
- Effects:
  - Blinking caret: CSS keyframes; class applied to a pseudo-element
  - Scanlines: repeating-linear-gradient overlay with low opacity
  - Glitch: small random `translateX/rotate` in motion transitions

----------------------------------------------------------------

## State Management

Top-level page (Trace)
- `logs`: Array of terminal entries
- `currentDestination`: City object | null
- `traceInProgress`: boolean
- `traceProgress`: 0..1 (shared between terminal and map)
- `booted`: boolean (sessionStorage)

Terminal
- `input`: string
- `history`: string[]
- `historyIndex`: number | null
- `autocompleteMatches`: string[]

Map
- `pathRef`: SVG path measurement
- `pathLength`: number
- `animStartTime`: number
- `packetPos`: { x, y } computed via getPointAtLength

Synchronization options
- Schedule-based: Terminal drives a timeline; map listens to a total duration and animates in that window
- Progress-based: Terminal updates `traceProgress` as lines render; map moves packet based on that value

----------------------------------------------------------------

## Adding New Commands

Command registry (suggested)
```ts
export type CommandContext = {
  print: (line: string, opts?: { glitch?: boolean; delay?: number }) => void;
  setDestination: (name: string | null) => void;
  setProgress: (p: number) => void;
  env: { mode: "fake" | "real" | "3d" };
};

export type Command = {
  name: string;
  aliases?: string[];
  help: string;
  run: (args: string[], ctx: CommandContext) => Promise<void> | void;
};
```

- Keep commands in `lib/commands/*.ts` and export an array in `lib/commands/index.ts`.
- Terminal parses the first token, finds the command by `name | alias`, and calls `run`.

----------------------------------------------------------------

## Persistence

- sessionStorage: `booted` flag
- localStorage: saved traces, typing sessions history, user preferences
- Planned SaaS:
  - NextAuth/Clerk for auth
  - Database (Supabase/Planetscale) for saved logs, leaderboards
  - Feature flags by plan

----------------------------------------------------------------

## Environment Variables (future)
- NEXTAUTH_SECRET, PROVIDER_KEYS (Google/GitHub)
- LIVEBLOCKS/WebSocket keys for collaboration
- REAL TRACE Providers (ip-api/ipinfo) tokens
- Export them in `.env.local` and read only via server components or API routes

----------------------------------------------------------------

## Dependency Reference

From package.json:
- next: ^14.2.5
- react: ^18.3.1
- react-dom: ^18.3.1
- tailwindcss: ^3.4.10
- postcss: ^8.4.41
- autoprefixer: ^10.4.19
- framer-motion: ^11.2.10
- react-simple-maps: ^3.0.0
- prop-types: ^15.8.1
- typescript: 5.9.2
- @types/node: 24.3.0
- @types/react: 19.1.10

Notes
- react-simple-maps relies on `prop-types` in dev; keep it installed.
- Use dynamic imports when integrating 3D globe libs (to avoid SSR errors).

----------------------------------------------------------------

## Common Pitfalls & Fixes

1) “Invalid image file” for favicon/icon
- Cause: corrupt `app/favicon.ico` or `app/icon.png`
- Fix: replace with valid files or remove; Next will stop parsing

2) Arc path not visible
- Ensure we:
  - Render the path only after Geo features load
  - Measure path length via `getTotalLength()` after the path is in the DOM
  - Set `strokeDasharray = length` and animate `strokeDashoffset: length → 0`
  - Tailwind classes don’t override stroke with `fill: none` or zero `stroke-width`

3) Packet dot not moving
- Confirm `pathRef.current` exists and `length > 0`
- Use `getPointAtLength(progress * length)` in a `requestAnimationFrame` loop or driven by a progress state

4) City not recognized
- Input normalization: lowercase, strip punctuation/whitespace
- Map common synonyms to canonical names

5) SSR warnings with map libs
- If needed, `dynamic(() => import('...'), { ssr: false })` for heavy or window-bound code

----------------------------------------------------------------

## Extending to SaaS

- Auth: NextAuth or Clerk in `app/api/auth` with providers
- Pricing page: `/pricing` — neon hacker cards with Free vs Pro features
- Real Mode: API route `/api/trace` to proxy to ip-api/ipinfo, sanitize output
- Collaboration: Liveblocks/WebSocket; room per shareable session ID
- Exports: JSON/TXT export endpoints or client-side blob download
- Leaderboards: Public table with dummy or aggregated data

----------------------------------------------------------------

## Testing & QA

- Unit tests (future): traceroute generation, city normalization, command parsing
- Manual test checklist:
  - Boot sequence runs once per session
  - `trace-route paris` draws and animates properly
  - `cities`, `help`, `clear` all work
  - History ↑/↓ and Tab autocomplete
  - Typing page calculates WPM and accuracy, stores history, exports
  - Mobile layout stacks terminal above map; performance acceptable

----------------------------------------------------------------

## Performance

- Avoid re-projecting geographies on each render; memoize geo data
- Keep animation timelines on RAF or motion values to minimize re-renders
- Prefer CSS GPU-accelerated transforms for glitch/scanline effects

----------------------------------------------------------------

## Accessibility

- Sufficient contrast with neon on dark
- aria-live region for terminal logs
- Keyboard navigation: input focus, skip links, sane tab order
- Reduce motion setting respected (optional)

----------------------------------------------------------------

## Roadmap (Suggested)

Short-term
- Solidify command registry and city normalization
- Improve typing analytics dashboard
- Add export buttons for traces/typing JSON/TXT

Mid-term
- Auth + saved sessions
- Real mode traceroute via API
- Collaboration room with shared logs

Long-term
- 3D globe mode
- Mission mode, achievements, leaderboard
- Theming (Konami easter egg for rainbow neon)

----------------------------------------------------------------

## File Map (Expected/Recommended)

- app/
  - layout.tsx
  - globals.css
  - page.tsx (Landing)
  - trace/page.tsx (Trace CLI + Map)
  - typing/page.tsx (Typing WPM tool)
- components/
  - Navbar.tsx
  - Terminal.tsx
  - Map.tsx
- lib/
  - traceroute.ts
  - cities.ts
  - commands/index.ts
  - storage.ts
  - utils.ts

Keep this doc updated when adding commands, pages, or architectural changes.

----------------------------------------------------------------

## Notes for Future Me
- When things “disappear,” it’s usually path measurement timing or icon assets.
- Keep the neon glow subtle: combine `stroke-[#00ff00]` with `drop-shadow` filters, not overly thick strokes.
- For perfect log ↔ arc sync, choose one “time driver” (either sum delays or a fixed animation duration) and ensure both read from the same clock/progress.
- If we add react-globe.gl, guard with `dynamic(..., { ssr: false })` and isolate