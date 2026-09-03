import { describe, expect, it } from "vitest";
import { CommandQueue } from "../src/command-queue";

interface Ctx {
  grounded: boolean;
}

describe("CommandQueue", () => {
  it("flushes when condition is met", () => {
    const q = new CommandQueue<Ctx>();
    q.enqueue({ action: "jump", at: 1000, ready: (c) => c.grounded });
    expect(q.flush(1010, 200, { grounded: false })).toEqual([]); // airborne: wait
    expect(q.pending.length).toBe(1);
    expect(q.flush(1050, 200, { grounded: true })).toEqual(["jump"]); // touched ground
    expect(q.pending.length).toBe(0);
  });

  it("drops upon timeout", () => {
    const q = new CommandQueue<Ctx>();
    q.enqueue({ action: "jump", at: 1000, ready: (c) => c.grounded });
    expect(q.flush(1300, 200, { grounded: false })).toEqual([]); // 300ms > ttl
    expect(q.pending.length).toBe(0);
    expect(q.flush(1310, 200, { grounded: true })).toEqual([]); // gone
  });

  it("does not fire stale input even if ready (timeout evaluated before ready)", () => {
    const q = new CommandQueue<Ctx>();
    q.enqueue({ action: "dash", at: 1000, ready: (c) => c.grounded });
    // Both expired (300ms > 200ttl) and grounded=true: still dropped.
    expect(q.flush(1300, 200, { grounded: true })).toEqual([]);
    expect(q.pending.length).toBe(0);
  });
});
