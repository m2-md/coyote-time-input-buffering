// input-buffer.ts
// Bir "token" ham bir girdiyi temsil eder: "jump", "punch", ya da negatif kenar
// için "punch^" (bırakma). Tampon token'ın anlamını bilmez, sadece damgalar.

export type Token = string;

export interface Stamp {
  token: Token;
  at: number; // basıldığı an (ms)
  consumed: boolean;
}

export class InputBuffer {
  private stamps: Stamp[] = [];

  /** Zaman damgalı kayıt. `now` dışarıdan gelir (duvar saati yok). */
  press(token: Token, now: number): void {
    this.stamps.push({ token, at: now, consumed: false });
  }

  /**
   * Pencere içindeyse en YENİ tüketilmemiş kaydı tüket (bir kez) ve true dön.
   * `now - at <= window` geçerli; değilse false. Tüketilen kayıt bir daha
   * tüketilemez.
   */
  consume(token: Token, now: number, window: number): boolean {
    for (let i = this.stamps.length - 1; i >= 0; i--) {
      const s = this.stamps[i];
      if (s.consumed || s.token !== token) continue;
      const age = now - s.at;
      if (age >= 0 && age <= window) {
        s.consumed = true;
        return true;
      }
    }
    return false;
  }

  /** Süresi geçmiş veya tüketilmiş kayıtları at. Her karede bir kez çağrılır. */
  prune(now: number, maxAge: number): void {
    this.stamps = this.stamps.filter(
      (s) => !s.consumed && now - s.at <= maxAge,
    );
  }

  /** Görselleştirme için salt-okunur kopya (demo overlay bunu okur). */
  peek(): ReadonlyArray<Readonly<Stamp>> {
    return this.stamps.map((s) => ({ ...s }));
  }
}

// input-buffer.ts — coyote, artık genel pencerenin bir özel hali
export function coyoteWindow(
  lastGroundedAt: number,
  now: number,
  window: number,
): boolean {
  const age = now - lastGroundedAt;
  return age >= 0 && age <= window;
}
