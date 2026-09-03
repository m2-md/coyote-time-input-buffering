import { describe, expect, it } from "vitest";
import { SequenceMatcher } from "../src/sequence";

const QCF = ["down", "down-forward", "forward", "punch"] as const;

describe("SequenceMatcher", () => {
  it("recognizes exact sequence within window", () => {
    const m = new SequenceMatcher(QCF, 200);
    expect(m.feed("down", 1000)).toBe(false);
    expect(m.feed("down-forward", 1100)).toBe(false);
    expect(m.feed("forward", 1200)).toBe(false);
    expect(m.feed("punch", 1300)).toBe(true); // SPECIAL!
  });

  it("resets if excessive delay occurs between steps", () => {
    const m = new SequenceMatcher(QCF, 200);
    m.feed("down", 1000);
    m.feed("down-forward", 1100);
    expect(m.feed("forward", 1600)).toBe(false); // 500ms > 200ms: timed out
    expect(m.step).toBe(0);
  });

  it("restarts progress at 1 on repeating first step, still recognizes sequence", () => {
    const m = new SequenceMatcher(QCF, 200);
    expect(m.feed("down", 1000)).toBe(false);
    expect(m.feed("down", 1050)).toBe(false); // hesitate: repeated first step → progress=1
    expect(m.step).toBe(1);
    expect(m.feed("down-forward", 1100)).toBe(false);
    expect(m.feed("forward", 1200)).toBe(false);
    expect(m.feed("punch", 1300)).toBe(true); // SPECIAL!
  });

  it("irrelevant token resets sequence, recognizes again after completion", () => {
    const m = new SequenceMatcher(QCF, 200);
    m.feed("down", 1000);
    expect(m.feed("punch", 1050)).toBe(false); // irrelevant (not first step) → zero
    expect(m.step).toBe(0);
    // Second hadouken can be executed consecutively:
    expect(m.feed("down", 2000)).toBe(false);
    expect(m.feed("down-forward", 2050)).toBe(false);
    expect(m.feed("forward", 2100)).toBe(false);
    expect(m.feed("punch", 2150)).toBe(true);
  });
});
