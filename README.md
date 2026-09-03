# Coyote Time & Input Buffering — Hadouken

<!-- LINKS:BEGIN — üretildi: scripts/sync-repo-links.py · elle düzenleme -->
**▶ [Live demo](https://m2-md.github.io/coyote-time-input-buffering/)** · [Source](https://github.com/m2-md/coyote-time-input-buffering)
<!-- LINKS:END -->

> A timestamped input buffer, command queue, coyote jump forgiveness, and a
> fighting-game sequence recognizer (Hadouken parser) — testable headless in Vitest.

Working code for the article "Why the Hadouken Didn't Come Out: Beyond Coyote Time —
Input Buffering, Command Queues and the Game's Short-Term Memory".

A short-term game memory that stores input not as an _event_ but as a timestamped
_record_. All the pure logic takes `now` as an argument from the outside, so it is
never tied to the wall clock — in tests we inject time by hand instead of waiting
real milliseconds.

## What's in here

Pure logic (never touches DOM/canvas/wall clock, fully testable):

- `src/input-buffer.ts` — `InputBuffer` (`press` / `consume` / `prune` / `peek`)
  and `coyoteWindow`. Timestamped presses; if one falls inside the window, it
  consumes the newest unconsumed record exactly once.
- `src/command-queue.ts` — `CommandQueue<Ctx>`: fires actions whose condition is
  non-temporal (landing on the ground, animation end) as soon as `ready(ctx)` holds,
  and drops them once `ttl` is exceeded. The timeout check comes **before** `ready`
  (so that stale input is not forgiven).
- `src/sequence.ts` — `SequenceMatcher`: recognizes sequences like quarter-circle +
  punch with partial progress + a per-step window.
- `src/latency.ts` — `FRAME_MS`, `latencyFrames`, `windowInFrames`: converts the
  buffer's hidden cost — input latency — from milliseconds into frames.

Demo (DOM + canvas + the real clock live only here):

- `src/render.ts` + `src/main.ts` + `index.html` — a single character: jumping
  (coyote + jump buffer), hadouken with `↓ ↘ → + J`. A LIVE overlay at the edge of
  the screen: buffer presses with their ages (consumed ones struck through), the
  command queue, the sequence progress bar and the "SPECIAL!" flash.

## Setup

```bash
npm install
```

## Running

```bash
npm run dev      # Vite dev server → http://localhost:5173/
```

Open it in a browser. If you open it with `file://` the modules won't load and you
will see a blank screen.

**Controls:** `← →` walk · `Space`/`↑` jump · `↓ ↘ → + J` special (hadouken).
When you walk off the edge of a platform a green `COYOTE` ring appears around the
character for a short while — at that moment you can still jump.

## Test

```bash
npm test         # 18 tests, opens no browser, a few ms
npm run typecheck
```

The 18 unit tests verify every claim the memory makes using an injected `now`:
consumption inside/outside the window, the double-consume guard, scanning from the
end, negative age, prune, the command queue's condition/timeout behaviour, sequence
recognition + reset, and the millisecond→frame conversion.

## Bench

```bash
npm run bench    # throughput + deterministic scenario via vite-node
```

Measures the throughput of `InputBuffer press+consume` and `SequenceMatcher feed`,
and additionally verifies deterministically that a specific timestamped input
sequence produces the expected commands (`["jump"]` + special).

## Build

```bash
npm run build    # tsc && vite build → dist/
```

## Tech stack

- TypeScript
- Vite / vite-node
- Vitest
- HTML5 Canvas 2D

## File layout

```
src/
  input-buffer.ts   # InputBuffer + coyoteWindow (pure)
  command-queue.ts  # CommandQueue<Ctx> (pure)
  sequence.ts       # SequenceMatcher (pure)
  latency.ts        # latencyFrames + windowInFrames (pure)
  render.ts         # Canvas2D drawing + overlay (render only)
  main.ts           # Keyboard → memory → physics loop (DOM + real clock)
test/
  input-buffer.test.ts
  command-queue.test.ts
  sequence.test.ts
  latency.test.ts
bench/
  bench.ts
```

## License

MIT
