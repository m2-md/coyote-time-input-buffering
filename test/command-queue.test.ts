import { describe, expect, it } from "vitest";
import { CommandQueue } from "../src/command-queue";

interface Ctx {
  grounded: boolean;
}

describe("CommandQueue", () => {
  it("koşul sağlanınca boşalır", () => {
    const q = new CommandQueue<Ctx>();
    q.enqueue({ action: "jump", at: 1000, ready: (c) => c.grounded });
    expect(q.flush(1010, 200, { grounded: false })).toEqual([]); // havada: bekler
    expect(q.pending.length).toBe(1);
    expect(q.flush(1050, 200, { grounded: true })).toEqual(["jump"]); // yere değdi
    expect(q.pending.length).toBe(0);
  });

  it("süre aşımıyla düşer", () => {
    const q = new CommandQueue<Ctx>();
    q.enqueue({ action: "jump", at: 1000, ready: (c) => c.grounded });
    expect(q.flush(1300, 200, { grounded: false })).toEqual([]); // 300ms > ttl
    expect(q.pending.length).toBe(0);
    expect(q.flush(1310, 200, { grounded: true })).toEqual([]); // artık yok
  });

  it("bayat girdi hazır olsa bile ateşlenmez (süre aşımı ready'den önce)", () => {
    const q = new CommandQueue<Ctx>();
    q.enqueue({ action: "dash", at: 1000, ready: (c) => c.grounded });
    // Hem süresi geçmiş (300ms > 200ttl) hem de grounded=true: yine de düşer.
    expect(q.flush(1300, 200, { grounded: true })).toEqual([]);
    expect(q.pending.length).toBe(0);
  });
});
