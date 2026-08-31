import { describe, expect, it } from "vitest";
import { InputBuffer, coyoteWindow } from "../src/input-buffer";

describe("InputBuffer", () => {
  it("pencere içinde tüketim başarılı", () => {
    const b = new InputBuffer();
    b.press("jump", 1000);
    expect(b.consume("jump", 1080, 120)).toBe(true); // 80ms < 120ms
  });

  it("pencere dışında tüketim başarısız", () => {
    const b = new InputBuffer();
    b.press("jump", 1000);
    expect(b.consume("jump", 1200, 120)).toBe(false); // 200ms > 120ms
  });

  it("tüketilen girdi ikinci kez tüketilemez", () => {
    const b = new InputBuffer();
    b.press("jump", 1000);
    expect(b.consume("jump", 1050, 120)).toBe(true);
    expect(b.consume("jump", 1060, 120)).toBe(false);
  });

  it("negatif kenar ayrı bir olaydır", () => {
    const b = new InputBuffer();
    b.press("punch", 1000); // basma
    b.press("punch^", 1030); // bırakma (negative edge)
    expect(b.consume("punch", 1010, 120)).toBe(true);
    expect(b.consume("punch", 1035, 120)).toBe(false);
    expect(b.consume("punch^", 1040, 120)).toBe(true); // bırakma hâlâ orada
  });

  it("en YENİ basış tüketilir (sondan tarama)", () => {
    const b = new InputBuffer();
    b.press("jump", 1000); // eski
    b.press("jump", 1020); // yeni — niyet bu
    expect(b.consume("jump", 1030, 120)).toBe(true);
    // Yeni tüketildi; eski hâlâ pencere içinde ama niyet zaten karşılandı.
    expect(b.consume("jump", 1035, 120)).toBe(true); // eski hâlâ tüketilebilir
    expect(b.consume("jump", 1040, 120)).toBe(false); // ikisi de bitti
  });

  it("gelecekten gelen damga (negatif yaş) tüketilmez", () => {
    const b = new InputBuffer();
    b.press("jump", 1100);
    expect(b.consume("jump", 1000, 120)).toBe(false); // now < at → age < 0
  });

  it("prune eski ve tüketilmiş kayıtları atar", () => {
    const b = new InputBuffer();
    b.press("jump", 1000);
    b.press("dash", 1000);
    b.consume("dash", 1010, 120); // dash tüketildi
    b.prune(1500, 120); // jump 500ms eski, dash tüketilmiş → ikisi de gider
    expect(b.peek().length).toBe(0);
    expect(b.consume("jump", 1510, 120)).toBe(false);
  });

  it("coyoteWindow pencere içi/dışı", () => {
    expect(coyoteWindow(1000, 1080, 100)).toBe(true); // 80ms <= 100ms
    expect(coyoteWindow(1000, 1200, 100)).toBe(false); // 200ms > 100ms
    expect(coyoteWindow(1100, 1000, 100)).toBe(false); // negatif yaş
  });
});
