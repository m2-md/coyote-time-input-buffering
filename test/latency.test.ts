import { describe, expect, it } from "vitest";
import { FRAME_MS, latencyFrames, windowInFrames } from "../src/latency";

describe("latency", () => {
  it("0 latency in same frame", () => {
    expect(latencyFrames(1000, 1000)).toBe(0);
  });

  it("~6 frames latency after 100ms", () => {
    expect(latencyFrames(1000, 1100)).toBeCloseTo(100 / FRAME_MS, 10);
    expect(latencyFrames(1000, 1100)).toBeCloseTo(6, 1); // 6.0
  });

  it("120ms window ≈ 7.2 frames", () => {
    expect(windowInFrames(120)).toBeCloseTo(7.2, 5);
  });
});
