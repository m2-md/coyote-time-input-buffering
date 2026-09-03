// main.ts — DEMO. DOM/canvas + real clock (performance.now) live here. Pure logic
// (input-buffer / command-queue / sequence / latency) does not read wall clock;
// we inject `now` from here.

import { InputBuffer, coyoteWindow } from "./input-buffer";
import { CommandQueue } from "./command-queue";
import { SequenceMatcher } from "./sequence";
import { render, type Ctx, type Snapshot } from "./render";

const W = 900;
const H = 520;

// Windows (ms)
const COYOTE = 100;
const JUMP_WINDOW = 120;
const QUEUE_TTL = 200;
const STEP_WINDOW = 200;
const PRUNE_MAX = 500;

// --- Buffer layer ---
const buffer = new InputBuffer();
const queue = new CommandQueue<Ctx>();
const STEPS = ["down", "down-forward", "forward", "punch"] as const;
const hadouken = new SequenceMatcher(STEPS, STEP_WINDOW);

// Press and release are SEPARATE events: both recorded with timestamp.
function onKeyDown(action: string, now: number): void {
  buffer.press(action, now); // rising edge: "punch"
}
function onKeyUp(action: string, now: number): void {
  buffer.press(action + "^", now); // falling edge: "punch^"
}

// --- Physics state ---
const GRAVITY = 2000; // px/s^2
const MOVE = 260; // px/s
const JUMP_V = 720; // px/s
const R = 18;

const platforms: [number, number, number][] = [
  [80, 380, 300],
  [520, 380, 300],
];

const state = {
  px: 180,
  py: 380 - R,
  vy: 0,
  grounded: true,
  facing: 1 as 1 | -1,
  lastGroundedAt: 0,
  specialFlashUntil: -1,
};

const held = new Set<string>();

function groundYAt(x: number): number | null {
  for (const [gx, gy, gw] of platforms) {
    if (x >= gx && x <= gx + gw) return gy;
  }
  return null;
}

/** Facing direction + arrow key → sequence token. */
function directionToken(): string | null {
  const down = held.has("ArrowDown");
  const fwd = held.has("ArrowRight") || held.has("ArrowLeft");
  if (down && fwd) return "down-forward";
  if (down) return "down";
  if (fwd) return "forward";
  return null;
}

function attemptJump(now: number): void {
  // Buffer: fresh intent if jump was pressed within the last JUMP_WINDOW ms.
  if (!buffer.consume("jump", now, JUMP_WINDOW)) return;
  const canJumpNow =
    state.grounded || coyoteWindow(state.lastGroundedAt, now, COYOTE);
  if (canJumpNow) {
    doJump();
  } else {
    // Condition out-of-time (touch ground): hold in command queue.
    queue.enqueue({ action: "jump", at: now, ready: (c) => c.grounded });
  }
}

function doJump(): void {
  state.vy = -JUMP_V;
  state.grounded = false;
}

// --- Keyboard ---
window.addEventListener("keydown", (e) => {
  const now = performance.now();
  if (e.repeat) return;
  held.add(e.key);

  if (e.key === "ArrowLeft") state.facing = -1;
  if (e.key === "ArrowRight") state.facing = 1;

  if (e.key === " " || e.key === "ArrowUp") {
    e.preventDefault();
    onKeyDown("jump", now);
  }

  // Sequence token: direction keys
  if (
    e.key === "ArrowDown" ||
    e.key === "ArrowRight" ||
    e.key === "ArrowLeft"
  ) {
    const tok = directionToken();
    if (tok) {
      onKeyDown(tok, now);
      hadouken.feed(tok, now);
    }
  }

  // Punch / attack
  if (e.key === "j" || e.key === "J") {
    onKeyDown("punch", now);
    if (hadouken.feed("punch", now)) {
      state.specialFlashUntil = now + 600;
    }
  }
});

window.addEventListener("keyup", (e) => {
  const now = performance.now();
  held.delete(e.key);
  if (e.key === "j" || e.key === "J") onKeyUp("punch", now);
  if (e.key === " " || e.key === "ArrowUp") onKeyUp("jump", now);
});

// --- Loop ---
function update(dt: number, now: number): void {
  // Horizontal movement
  let dx = 0;
  if (held.has("ArrowLeft")) dx -= MOVE * dt;
  if (held.has("ArrowRight")) dx += MOVE * dt;
  state.px = Math.max(R, Math.min(W - R, state.px + dx));

  // Gravity
  state.vy += GRAVITY * dt;
  state.py += state.vy * dt;

  // Ground contact
  const gy = groundYAt(state.px);
  const wasGrounded = state.grounded;
  if (gy !== null && state.py >= gy - R && state.vy >= 0) {
    state.py = gy - R;
    state.vy = 0;
    state.grounded = true;
    state.lastGroundedAt = now;
  } else {
    if (wasGrounded && (gy === null || state.py < gy - R)) {
      // Stepped off cliff/platform edge: start coyote timer.
      state.lastGroundedAt = now;
    }
    state.grounded = false;
  }

  // Fall limit: respawn if fallen below screen
  if (state.py > H + 200) {
    state.px = 180;
    state.py = 380 - R;
    state.vy = 0;
  }

  // Process buffer & queue
  attemptJump(now);
  const fired = queue.flush(now, QUEUE_TTL, { grounded: state.grounded });
  for (const action of fired) {
    if (action === "jump") doJump();
  }
  buffer.prune(now, PRUNE_MAX);
}

function snapshot(now: number): Snapshot {
  return {
    now,
    px: state.px,
    py: state.py,
    r: R,
    grounded: state.grounded,
    facing: state.facing,
    platforms,
    lastGroundedAt: state.lastGroundedAt,
    coyoteWindow: COYOTE,
    inCoyote: coyoteWindow(state.lastGroundedAt, now, COYOTE),
    stamps: buffer.peek(),
    pending: queue.pending,
    jumpWindow: JUMP_WINDOW,
    queueTtl: QUEUE_TTL,
    steps: STEPS,
    step: hadouken.step,
    specialFlashUntil: state.specialFlashUntil,
  };
}

function main(): void {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;

  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now);
    render(g, W, H, snapshot(now));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
