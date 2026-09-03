import { describe, expect, it } from "vitest";
import { InputBuffer, coyoteWindow } from "../src/input-buffer";

describe("InputBuffer", () => {
  it("consumes successfully within window", () => {
    const b = new InputBuffer();
    b.press("jump", 1000);
    expect(b.consume("jump", 1080, 120)).toBe(true); // 80ms < 120ms
  });

  it("fails to consume outside window", () => {
    const b = new InputBuffer();
    b.press("jump", 1000);
    expect(b.consume("jump", 1200, 120)).toBe(false); // 200ms > 120ms
  });

  it("cannot consume already consumed input a second time", () => {
    const b = new InputBuffer();
    b.press("jump", 1000);
    expect(b.consume("jump", 1050, 120)).toBe(true);
    expect(b.consume("jump", 1060, 120)).toBe(false);
  });

  it("negative edge is a separate event", () => {
    const b = new InputBuffer();
    b.press("punch", 1000); // press
    b.press("punch^", 1030); // release (negative edge)
    expect(b.consume("punch", 1010, 120)).toBe(true);
    expect(b.consume("punch", 1035, 120)).toBe(false);
    expect(b.consume("punch^", 1040, 120)).toBe(true); // release still present
  });

  it("consumes newest press first (reverse scan)", () => {
    const b = new InputBuffer();
    b.press("jump", 1000); // older
    b.press("jump", 1020); // newer — this represents the intent
    expect(b.consume("jump", 1030, 120)).toBe(true);
    // newer consumed; older still within window but intent already satisfied.
    expect(b.consume("jump", 1035, 120)).toBe(true); // older can still be consumed
    expect(b.consume("jump", 1040, 120)).toBe(false); // both exhausted
  });

  it("does not consume future timestamps (negative age)", () => {
    const b = new InputBuffer();
    b.press("jump", 1100);
    expect(b.consume("jump", 1000, 120)).toBe(false); // now < at → age < 0
  });

  it("prune removes old and consumed stamps", () => {
    const b = new InputBuffer();
    b.press("jump", 1000);
    b.press("dash", 1000);
    b.consume("dash", 1010, 120); // dash consumed
    b.prune(1500, 120); // jump is 500ms old, dash is consumed → both removed
    expect(b.peek().length).toBe(0);
    expect(b.consume("jump", 1510, 120)).toBe(false);
  });

  it("coyoteWindow inside/outside window", () => {
    expect(coyoteWindow(1000, 1080, 100)).toBe(true); // 80ms <= 100ms
    expect(coyoteWindow(1000, 1200, 100)).toBe(false); // 200ms > 100ms
    expect(coyoteWindow(1100, 1000, 100)).toBe(false); // negative age
  });
});
