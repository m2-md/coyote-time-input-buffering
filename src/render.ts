// render.ts — SADECE çizim. Hiç mantık yok; anlık durum enstantanesini alır ve
// canvas'a döker. Overlay bir teşhis aracı: tampon damgaları + yaşları, komut
// kuyruğu, dizi ilerleme çubuğu, "SPECIAL!" flaşı, coyote penceresi.

import type { Stamp } from "./input-buffer";
import type { Command } from "./command-queue";

export interface Ctx {
  grounded: boolean;
}

export interface Snapshot {
  now: number;
  // Karakter
  px: number;
  py: number;
  r: number;
  grounded: boolean;
  facing: 1 | -1;
  // Zemin platformları [x, y, w]
  platforms: readonly [number, number, number][];
  // Coyote
  lastGroundedAt: number;
  coyoteWindow: number;
  inCoyote: boolean;
  // Bellek
  stamps: ReadonlyArray<Readonly<Stamp>>;
  pending: ReadonlyArray<Readonly<Command<Ctx>>>;
  jumpWindow: number;
  queueTtl: number;
  // Dizi
  steps: readonly string[];
  step: number;
  specialFlashUntil: number;
}

const BG = "#1c1917";
const GROUND = "#3f3f46";
const CHAR = "#ec4899";
const CHAR_AIR = "#f472b6";
const TXT = "#e7e5e4";
const DIM = "#78716c";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";

export function render(
  g: CanvasRenderingContext2D,
  W: number,
  H: number,
  s: Snapshot,
): void {
  g.fillStyle = BG;
  g.fillRect(0, 0, W, H);

  // Platformlar
  g.fillStyle = GROUND;
  for (const [x, y, w] of s.platforms) {
    g.fillRect(x, y, w, 16);
  }

  // Coyote penceresi: uçurumdan çıkınca yeşil "hâlâ zıplayabilirsin" halkası
  if (s.inCoyote && !s.grounded) {
    g.strokeStyle = GREEN;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(s.px, s.py, s.r + 8, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = GREEN;
    g.font = "12px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("COYOTE", s.px, s.py - s.r - 14);
  }

  // Karakter
  g.fillStyle = s.grounded ? CHAR : CHAR_AIR;
  g.beginPath();
  g.arc(s.px, s.py, s.r, 0, Math.PI * 2);
  g.fill();
  // Bakış yönü
  g.strokeStyle = "#0c0a09";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(s.px, s.py);
  g.lineTo(s.px + s.facing * s.r, s.py);
  g.stroke();

  // SPECIAL! flaşı
  if (s.now < s.specialFlashUntil) {
    const t = (s.specialFlashUntil - s.now) / 600; // 0..1
    g.save();
    g.globalAlpha = Math.min(1, t + 0.2);
    g.fillStyle = AMBER;
    g.font = "bold 64px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("SPECIAL!", W / 2, H / 2 - 40);
    g.restore();
  }

  drawOverlay(g, W, s);
  drawSequenceBar(g, W, H, s);
}

function drawOverlay(
  g: CanvasRenderingContext2D,
  W: number,
  s: Snapshot,
): void {
  const x = W - 300;
  let y = 24;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";

  g.fillStyle = TXT;
  g.font = "bold 13px ui-monospace, monospace";
  g.fillText("INPUT BUFFER", x, y);
  y += 20;

  g.font = "12px ui-monospace, monospace";
  if (s.stamps.length === 0) {
    g.fillStyle = DIM;
    g.fillText("(boş)", x, y);
    y += 16;
  }
  for (const st of s.stamps) {
    const age = Math.round(s.now - st.at);
    const label = `${st.token}  ${age}ms`;
    g.fillStyle = st.consumed ? DIM : TXT;
    g.fillText(label, x, y);
    if (st.consumed) {
      const w = g.measureText(label).width;
      g.strokeStyle = DIM;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y - 4);
      g.lineTo(x + w, y - 4);
      g.stroke();
    }
    y += 16;
  }

  y += 12;
  g.fillStyle = TXT;
  g.font = "bold 13px ui-monospace, monospace";
  g.fillText("COMMAND QUEUE", x, y);
  y += 20;
  g.font = "12px ui-monospace, monospace";
  if (s.pending.length === 0) {
    g.fillStyle = DIM;
    g.fillText("(boş)", x, y);
    y += 16;
  }
  for (const cmd of s.pending) {
    const wait = Math.round(s.now - cmd.at);
    g.fillStyle = AMBER;
    g.fillText(`${cmd.action}  bekliyor ${wait}ms`, x, y);
    y += 16;
  }
}

function drawSequenceBar(
  g: CanvasRenderingContext2D,
  _W: number,
  H: number,
  s: Snapshot,
): void {
  const x = 24;
  const y = H - 40;
  g.textAlign = "left";
  g.fillStyle = TXT;
  g.font = "12px ui-monospace, monospace";
  g.fillText("HADOUKEN:", x, y - 10);

  const cell = 130;
  for (let i = 0; i < s.steps.length; i++) {
    const cx = x + i * cell;
    const done = i < s.step;
    g.fillStyle = done ? GREEN : "#292524";
    g.fillRect(cx, y, cell - 10, 18);
    g.fillStyle = done ? "#0c0a09" : DIM;
    g.fillText(s.steps[i], cx + 6, y + 13);
  }
}
