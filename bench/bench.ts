// bench/bench.ts — pure logic throughput measurement + deterministic scenario validation.
// Wall clock is used ONLY to measure duration; measured code receives injected `now`.
// Run: npm run bench

import { InputBuffer } from "../src/input-buffer";
import { SequenceMatcher } from "../src/sequence";
import { CommandQueue } from "../src/command-queue";

function bench(label: string, iters: number, fn: (i: number) => void): void {
  // Warmup
  for (let i = 0; i < Math.min(iters, 10000); i++) fn(i);
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn(i);
  const t1 = performance.now();
  const ms = t1 - t0;
  const opsPerSec = iters / (ms / 1000);
  console.log(
    `${label.padEnd(34)} ${iters.toLocaleString()} ops  ${ms.toFixed(1)} ms  ` +
      `${(opsPerSec / 1e6).toFixed(1)}M ops/s`,
  );
}

// 1) InputBuffer press + consume throughput
{
  const N = 2_000_000;
  const b = new InputBuffer();
  bench("InputBuffer press+consume", N, (i) => {
    b.press("jump", i);
    b.consume("jump", i + 5, 120);
    if ((i & 1023) === 0) b.prune(i + 5, 500); // periodic cleanup
  });
}

// 2) SequenceMatcher feed throughput (complete QCF sequence)
{
  const N = 2_000_000;
  const m = new SequenceMatcher(
    ["down", "down-forward", "forward", "punch"],
    200,
  );
  const seq = ["down", "down-forward", "forward", "punch"];
  bench("SequenceMatcher feed", N, (i) => {
    m.feed(seq[i & 3], i * 50);
  });
}

// 3) Deterministic scenario: specific timestamped input sequence → expected commands.
function scenario(): { fired: string[]; special: boolean } {
  const buffer = new InputBuffer();
  const queue = new CommandQueue<{ grounded: boolean }>();
  const matcher = new SequenceMatcher(
    ["down", "down-forward", "forward", "punch"],
    200,
  );
  const fired: string[] = [];
  let special = false;

  // t=1000: jump pressed while airborne (grounded=false). Buffer catches, queues into command queue.
  buffer.press("jump", 1000);
  if (buffer.consume("jump", 1000, 120)) {
    queue.enqueue({ action: "jump", at: 1000, ready: (c) => c.grounded });
  }
  // t=1010..1060: still airborne → queue holds.
  fired.push(...queue.flush(1010, 200, { grounded: false }));
  // t=1080: touched ground → queue fires (80ms < 200ttl).
  fired.push(...queue.flush(1080, 200, { grounded: true }));

  // t=1200..1350: hadouken (50ms between steps < 200 window).
  matcher.feed("down", 1200);
  matcher.feed("down-forward", 1250);
  matcher.feed("forward", 1300);
  special = matcher.feed("punch", 1350);

  return { fired, special };
}

const N = 500_000;
let acc = 0;
bench("deterministic scenario", N, () => {
  const r = scenario();
  acc += r.fired.length + (r.special ? 1 : 0);
});

// validation (deterministic: must be identical across runs)
const r = scenario();
const okFired = JSON.stringify(r.fired) === JSON.stringify(["jump"]);
const okSpecial = r.special === true;
console.log("");
console.log(
  `scenario.fired   = ${JSON.stringify(r.fired)}  ${okFired ? "OK" : "FAIL"}`,
);
console.log(`scenario.special = ${r.special}  ${okSpecial ? "OK" : "FAIL"}`);
console.log(`checksum        = ${acc}`);

if (!okFired || !okSpecial) {
  throw new Error("Deterministic scenario did not produce expected output.");
}
