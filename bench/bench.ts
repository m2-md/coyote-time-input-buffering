// bench/bench.ts — saf mantık throughput ölçümü + deterministik senaryo doğrulaması.
// Duvar saati sadece SÜREYİ ölçmek için; ölçülen kod `now`'ı enjekte edilmiş alır.
// Çalıştır: npm run bench

import { InputBuffer } from "../src/input-buffer";
import { SequenceMatcher } from "../src/sequence";
import { CommandQueue } from "../src/command-queue";

function bench(label: string, iters: number, fn: (i: number) => void): void {
  // Isınma
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
    if ((i & 1023) === 0) b.prune(i + 5, 500); // ara sıra çöpçü
  });
}

// 2) SequenceMatcher feed throughput (tam QCF dizisi)
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

// 3) Deterministik senaryo: belirli zaman-damgalı girdi dizisi → beklenen komutlar.
function scenario(): { fired: string[]; special: boolean } {
  const buffer = new InputBuffer();
  const queue = new CommandQueue<{ grounded: boolean }>();
  const matcher = new SequenceMatcher(
    ["down", "down-forward", "forward", "punch"],
    200,
  );
  const fired: string[] = [];
  let special = false;

  // t=1000: havadayken zıpla bas (grounded=false). Tampon yakalar, kuyruğa düşer.
  buffer.press("jump", 1000);
  if (buffer.consume("jump", 1000, 120)) {
    queue.enqueue({ action: "jump", at: 1000, ready: (c) => c.grounded });
  }
  // t=1010..1060: hâlâ havada → kuyruk bekler.
  fired.push(...queue.flush(1010, 200, { grounded: false }));
  // t=1080: yere değdi → kuyruk ateşler (80ms < 200ttl).
  fired.push(...queue.flush(1080, 200, { grounded: true }));

  // t=1200..1350: hadouken (adımlar arası 50ms < 200 pencere).
  matcher.feed("down", 1200);
  matcher.feed("down-forward", 1250);
  matcher.feed("forward", 1300);
  special = matcher.feed("punch", 1350);

  return { fired, special };
}

const N = 500_000;
let acc = 0;
bench("deterministik senaryo", N, () => {
  const r = scenario();
  acc += r.fired.length + (r.special ? 1 : 0);
});

// Doğrulama (deterministik: her koşuda aynı olmalı)
const r = scenario();
const okFired = JSON.stringify(r.fired) === JSON.stringify(["jump"]);
const okSpecial = r.special === true;
console.log("");
console.log(
  `senaryo.fired   = ${JSON.stringify(r.fired)}  ${okFired ? "OK" : "FAIL"}`,
);
console.log(`senaryo.special = ${r.special}  ${okSpecial ? "OK" : "FAIL"}`);
console.log(`checksum        = ${acc}`);

if (!okFired || !okSpecial) {
  throw new Error("Deterministik senaryo beklenen çıktıyı vermedi.");
}
