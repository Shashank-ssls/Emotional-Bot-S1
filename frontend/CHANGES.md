# Solace Frontend — Change Log

> Use this file to identify what was changed and where, so you can revert specific files if something breaks.

---

## Round 1 — 14 Core Improvements

### `src/types.ts`
- Added `Session` interface (`id`, `startedAt`, `title`, `messages[]`)
- Added `timestamp?: number` to `Message` interface (Round 2)

### `src/index.css`
- Replaced global `* { transition }` with `.theme-transitioning` class (only fires during toggle, not constantly)
- Added mobile CSS (`@media max-width: 640px` — hides scrollbar)
- Rewrote `@media print` with Solace branding header, `@page` margins, `data-role` bubble styles

### `src/hooks/useTheme.ts`
- `toggleTheme()` now adds `.theme-transitioning` to `<html>` for 350ms, then removes it
- Prevents all elements from transitioning constantly; only during theme switch

### `src/hooks/useChat.ts`
- Added `sessions` state (loaded from `localStorage.solace.history`)
- Added `saveCurrentToHistory(msgs)` — prepends current conversation to history (max 20 sessions)
- `startNewConversation()` now saves current to history before clearing
- Added `loadSession(id)` — saves current, loads selected session, removes it from history list
- Added `deleteSession(id)` — removes from history without loading
- Added `cancelStream()` — aborts current SSE stream
- Added `retryLastError()` (Round 2) — removes last error message and re-streams the same user message
- Refactored stream logic into shared `runStream(text, historyForApi)` to avoid duplication
- All new messages now include `timestamp: Date.now()`

### `src/components/ErrorBoundary.tsx` *(new)*
- React class component error boundary
- Wraps the message list in `App.tsx`
- Shows soft italic fallback if a message card crashes

### `src/components/JumpToLatest.tsx` *(new)*
- Floating pill button (`↓ Jump to latest`) that appears when scrolled >200px from bottom
- AnimatePresence fade+slide animation
- Fixed position, centered, z-index 30

### `src/components/BreathingOverlay.tsx`
- **Bug fix:** replaced `extraCycle` boolean with `maxCycles` state
- Old: `reset()` set `extraCycle=false`, then setTimeout re-set it — race condition
- New: "One more" calls `reset(DEFAULT_CYCLES + 1)` — single atomic state update, no race

### `src/components/ChatMessage.tsx`
- `TypingIndicator` now has `exit={{ opacity: 0, y: -4 }}` animation for smooth crossfade into partial card
- Added `timestamp` display below each bubble (shown always; formatted as time or weekday)
- Added hover-reveal **copy button** on bot cards (copies opener + reflection + follow-up)
- Added **retry button** on error cards (`onRetry?: () => void` prop) — "Try again" link
- Bot card body text changed from `15px` to `1em` (scales with font size slider)
- `data-role="user"` / `data-role="assistant"` attributes added for print CSS targeting

### `src/components/MoodSparklineModal.tsx`
- Collects `mood_trend.note` alongside valence per data point
- Added dashed midline to SVG sparkline
- Dots are now colored by trend direction (green=improving, amber=stable, red=worsening)
- Shows a notes list below the chart — each note with a colored dot

### `src/components/ChatInput.tsx`
- Added `onCancel: () => void` prop
- While `disabled` (streaming): send button becomes a **stop button** (square icon)
- Stop button hover: turns blush/primary color with border
- Textarea placeholder changes to "Solace is thinking…" while streaming
- **Round 3:** Hint text changed to `"Solace makes life better. Press / for a breathing exercise."`

### `src/components/ExportMenu.tsx`
- Added `disabled?: boolean` prop
- When disabled: trigger button opacity 0.4, cursor `not-allowed`
- Passed `disabled={messages.length === 0}` from Sidebar

### `src/components/Sidebar.tsx`
- Added `sessions`, `onLoadSession`, `onDeleteSession` props
- Added **history section** below settings (always shown)
  - Empty state: "Past conversations will appear here."
  - Each row: conversation title (truncated) + formatted date + delete button
  - Delete button: opacity 0.45 normally, full red on hover
- Added `"/"` keyboard hint badge on the Breathing row
- Added `useIsMobile()` hook — detects `window.innerWidth < 640`
- **Mobile:** slides up from bottom as a bottom-sheet (max-height 80vh, rounded top corners)
- **Desktop:** slides in from left (280px)
- Focus management: auto-focuses first button when sidebar opens (after 320ms transition)
- `inert` attribute set on main content via `App.tsx` when sidebar is open
- Added swipe-to-close gesture (`touchstart`/`touchmove`): swipe down on mobile, swipe left on desktop
- Added **conversation search** input (shown when sessions > 3) — filters by title in real time
- Added **font size** row (Aa label + A− / A / A+ buttons), wired to `useFontSize` hook
- Added `fontSizeIndex` and `onSetFontSize` props

### `src/App.tsx`
- Added `ErrorBoundary` wrapping the message list
- Added `JumpToLatest` with scroll-position detection (shows when >200px from bottom)
- Added visually-hidden `aria-live="assertive"` region that reads "Solace is responding…" during streaming
- `inert` attribute applied to main content div when sidebar is open (focus trap)
- Added `handleLoadSession` wrapper that calls `loadSession` then smoothly scrolls to top
- `onBreathingOpen` now uses toggle: `setBreathingOpen((o) => !o)` — **Round 3**
- Global `/` keydown handler also toggles: `setBreathingOpen((o) => !o)` — **Round 3**
- Typing indicator + partial card wrapped in `<AnimatePresence mode="sync">` for crossfade
- `onRetry` passed to last message only when it's a retryable error
- Passed `cancelStream` as `onCancel` to `ChatInput`
- Conversation zone has `fontSize: ${fontSize}px` applied for text size scaling

---

## Round 2 — 10 More Improvements

### `src/hooks/useFontSize.ts` *(new)*
- Three sizes: 13px (Small), 15px (Medium), 17px (Large)
- Reads/writes `localStorage.solace.fontSizeIndex`
- Returns `{ fontSizeIndex, fontSize, fontSizeLabel, setFontSizeIndex }`

### `src/lib/export.ts`
- **`exportAsPDF(messages)`** completely rewritten
  - Old: called `window.print()` on the live app → Chrome rasterized everything into one image
  - New: opens a clean `window.open()` with a standalone HTML document
  - Document includes: Fraunces+Inter fonts, user bubbles (right-aligned sage), bot cards (blush border), emotion pills, suggestion cards with intensity dots, follow-up quote, timestamps, disclaimer
  - Waits 400ms after `load` event for fonts before calling `print()`
  - Falls back with `alert()` if popup is blocked
- `exportAsPDF` now takes `messages` parameter (was `void`)

### `src/components/ExportMenu.tsx`
- Updated `exportAsPDF` call to pass `messages`: `() => exportAsPDF(messages)`

### `vite.config.ts`
- Added `vite-plugin-pwa` with `autoUpdate` register type
- Manifest: name "Solace", theme `#C98B7A`, background `#FBF6EF`, standalone display, portrait orientation
- Workbox caches JS/CSS/HTML/SVG/woff2 + Google Fonts (CacheFirst, 1 year TTL)

### `public/icon.svg` *(new)*
- SVG app icon: rounded rect background (#FBF6EF) + radial gradient orb (blush→sage)
- Used as PWA manifest icon (`sizes: "any"`, `purpose: "any maskable"`)

---

## File Map (what each src file does now)

| File | Purpose |
|---|---|
| `src/types.ts` | TypeScript interfaces: Message (+ timestamp), Session, ChatResponse, SSEEvent, StreamStatus |
| `src/index.css` | Tailwind v4 @theme, CSS variables (light/dark), theme-transitioning class, print styles |
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Root component — wires all hooks and renders all UI |
| `src/hooks/useChat.ts` | All chat state: messages, sessions, streaming, send/retry/cancel/history |
| `src/hooks/useTheme.ts` | Dark/light theme toggle with smooth CSS transition class |
| `src/hooks/useFontSize.ts` | Font size preference (3 sizes, persisted to localStorage) |
| `src/lib/api.ts` | `postChat()` (non-streaming) + `postChatStream()` (SSE) |
| `src/lib/export.ts` | exportAsText, exportAsPDF (clean print window), copyToClipboard |
| `src/lib/emotionPalette.ts` | Maps emotion keywords → blob HSL colors for EmotionBackground |
| `src/components/App.tsx` | (see App.tsx above) |
| `src/components/TopBar.tsx` | Gear icon + "Solace" wordmark + "New Conversation" button |
| `src/components/Sidebar.tsx` | Left drawer (desktop) / bottom-sheet (mobile) with settings + history |
| `src/components/ChatInput.tsx` | Auto-grow textarea, send/cancel button, hint text, `/` shortcut |
| `src/components/ChatMessage.tsx` | User bubble + bot card + error card + TypingIndicator |
| `src/components/EmotionBackground.tsx` | 3 animated blurred blobs keyed to current emotion |
| `src/components/Orb.tsx` | Breathing orb with breathing/thinking/typing animations; `mini` prop |
| `src/components/BreathingOverlay.tsx` | Radix Dialog with 4-7-8 breathing exercise (maxCycles state, fixed race condition) |
| `src/components/MoodSparklineModal.tsx` | SVG mood sparkline with per-point notes list |
| `src/components/AmbientSoundPopover.tsx` | Radix Popover for ambient sound choice (UI only, sound coming soon) |
| `src/components/ExportMenu.tsx` | Radix Popover export menu (text / PDF / clipboard); disabled when no messages |
| `src/components/ErrorBoundary.tsx` | React class error boundary wrapping message list |
| `src/components/JumpToLatest.tsx` | Floating pill button when scrolled away from bottom |
| `public/icon.svg` | PWA app icon (SVG orb) |
| `vite.config.ts` | Vite + React + Tailwind v4 + PWA plugin config |

---

## localStorage Keys

| Key | Value | Set by |
|---|---|---|
| `solace.conversation` | `Message[]` JSON | useChat — current conversation |
| `solace.history` | `Session[]` JSON | useChat — up to 20 past sessions |
| `solace.theme` | `"light"` or `"dark"` | useTheme |
| `solace.ambient` | `"off"` / `"rain"` / `"hum"` / `"waves"` | AmbientSoundPopover |
| `solace.fontSizeIndex` | `"0"` / `"1"` / `"2"` | useFontSize |
