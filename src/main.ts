// main.ts — DEMO. DOM/canvas + gerçek saat (performance.now) burada. Saf mantık
// (input-buffer / command-queue / sequence / latency) hiç duvar saatine bakmaz;
// biz `now`'ı buradan enjekte ederiz.

import { InputBuffer, coyoteWindow } from "./input-buffer";
import { CommandQueue } from "./command-queue";
import { SequenceMatcher } from "./sequence";
import { render, type Ctx, type Snapshot } from "./render";

const W = 900;
const H = 520;

// Pencereler (ms)
const COYOTE = 100;
const JUMP_WINDOW = 120;
const QUEUE_TTL = 200;
const STEP_WINDOW = 200;
const PRUNE_MAX = 500;

// --- Bellek katmanı ---
const buffer = new InputBuffer();
const queue = new CommandQueue<Ctx>();
const STEPS = ["down", "down-forward", "forward", "punch"] as const;
const hadouken = new SequenceMatcher(STEPS, STEP_WINDOW);

// Basma ve bırakma AYRI olaylar: ikisi de deftere zaman damgasıyla yazılır.
function onKeyDown(action: string, now: number): void {
  buffer.press(action, now); // yükselen kenar: "punch"
}
function onKeyUp(action: string, now: number): void {
  buffer.press(action + "^", now); // düşen kenar: "punch^"
}

// --- Fizik durumu ---
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

/** Bakış yönü + bir arrow tuşu → dizi token'ı. */
function directionToken(): string | null {
  const down = held.has("ArrowDown");
  const fwd = held.has("ArrowRight") || held.has("ArrowLeft");
  if (down && fwd) return "down-forward";
  if (down) return "down";
  if (fwd) return "forward";
  return null;
}

function attemptJump(now: number): void {
  // Tampon: son JUMP_WINDOW ms içinde zıpla bastıysak niyet taze.
  if (!buffer.consume("jump", now, JUMP_WINDOW)) return;
  const canJumpNow =
    state.grounded || coyoteWindow(state.lastGroundedAt, now, COYOTE);
  if (canJumpNow) {
    doJump();
  } else {
    // Koşul zaman-dışı (yere değme): komut kuyruğuna beklet.
    queue.enqueue({ action: "jump", at: now, ready: (c) => c.grounded });
  }
}

function doJump(): void {
  state.vy = -JUMP_V;
  state.grounded = false;
}

// --- Klavye ---
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

  // Dizi token'ı: yön tuşları
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

  // Yumruk / attack
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

// --- Döngü ---
function update(dt: number, now: number): void {
  // Yatay hareket
  let dx = 0;
  if (held.has("ArrowLeft")) dx -= MOVE * dt;
  if (held.has("ArrowRight")) dx += MOVE * dt;
  state.px = Math.max(R, Math.min(W - R, state.px + dx));

  // Yerçekimi
  state.vy += GRAVITY * dt;
  state.py += state.vy * dt;

  // Zemin teması
  const gy = groundYAt(state.px);
  const wasGrounded = state.grounded;
  if (gy !== null && state.py >= gy - R && state.vy >= 0) {
    state.py = gy - R;
    state.vy = 0;
    state.grounded = true;
    state.lastGroundedAt = now;
  } else {
    if (wasGrounded && (gy === null || state.py < gy - R)) {
      // Uçurumdan/platform kenarından yeni ayrıldık: coyote saati başlasın.
      state.lastGroundedAt = now;
    }
    state.grounded = false;
  }

  // Düşüş sınırı: aşağı düşerse başlangıca dön
  if (state.py > H + 200) {
    state.px = 180;
    state.py = 380 - R;
    state.vy = 0;
  }

  // Bellek işleme
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
