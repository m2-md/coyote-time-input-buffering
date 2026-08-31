import { describe, expect, it } from "vitest";
import { SequenceMatcher } from "../src/sequence";

const QCF = ["down", "down-forward", "forward", "punch"] as const;

describe("SequenceMatcher", () => {
  it("pencere içinde tam diziyi tanır", () => {
    const m = new SequenceMatcher(QCF, 200);
    expect(m.feed("down", 1000)).toBe(false);
    expect(m.feed("down-forward", 1100)).toBe(false);
    expect(m.feed("forward", 1200)).toBe(false);
    expect(m.feed("punch", 1300)).toBe(true); // SPECIAL!
  });

  it("araya çok gecikme girerse sıfırlanır", () => {
    const m = new SequenceMatcher(QCF, 200);
    m.feed("down", 1000);
    m.feed("down-forward", 1100);
    expect(m.feed("forward", 1600)).toBe(false); // 500ms > 200ms: koptu
    expect(m.step).toBe(0);
  });

  it("ilk adım tekrarında ilerleme 1'e çekilir, dizi yine tanınır", () => {
    const m = new SequenceMatcher(QCF, 200);
    expect(m.feed("down", 1000)).toBe(false);
    expect(m.feed("down", 1050)).toBe(false); // tereddüt: ilk adım tekrar → progress=1
    expect(m.step).toBe(1);
    expect(m.feed("down-forward", 1100)).toBe(false);
    expect(m.feed("forward", 1200)).toBe(false);
    expect(m.feed("punch", 1300)).toBe(true); // SPECIAL!
  });

  it("alakasız token diziyi sıfırlar, tamamlandıktan sonra tekrar tanınır", () => {
    const m = new SequenceMatcher(QCF, 200);
    m.feed("down", 1000);
    expect(m.feed("punch", 1050)).toBe(false); // alakasız (ilk adım değil) → sıfır
    expect(m.step).toBe(0);
    // İkinci hadouken peş peşe atılabilir:
    expect(m.feed("down", 2000)).toBe(false);
    expect(m.feed("down-forward", 2050)).toBe(false);
    expect(m.feed("forward", 2100)).toBe(false);
    expect(m.feed("punch", 2150)).toBe(true);
  });
});
