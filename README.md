# Coyote Time & Girdi Tamponu — Hadouken

"Hadouken Neden Çıkmadı: Coyote Time'ın Ötesinde Girdi Tamponu, Komut Kuyruğu ve
Oyunun Kısa Süreli Hafızası" makalesinin çalışan kodu.

Girdiyi bir _olay_ (event) değil, zaman damgalı bir _kayıt_ (record) olarak tutan
kısa süreli oyun hafızası. Bütün saf mantık `now`'ı dışarıdan parametre olarak
aldığı için duvar saatine bağlı değildir — testte zamanı elle enjekte ederiz,
gerçek milisaniye beklemeyiz.

## Ne var

Saf mantık (DOM/canvas/duvar saati görmez, tamamen test edilebilir):

- `src/input-buffer.ts` — `InputBuffer` (`press` / `consume` / `prune` / `peek`)
  ve `coyoteWindow`. Zaman damgalı damgalar; pencere içindeyse en yeni tüketilmemiş
  kaydı bir kez tüketir.
- `src/command-queue.ts` — `CommandQueue<Ctx>`: koşulu zaman-dışı olan (yere değme,
  animasyon bitişi) eylemleri `ready(ctx)` sağlanınca ateşler, `ttl`'i aşınca düşer.
  Süre aşımı kontrolü `ready`'den **önce** gelir (bayat girdiyi affetmemek için).
- `src/sequence.ts` — `SequenceMatcher`: çeyrek daire + yumruk gibi dizileri kısmi
  ilerleme + adım penceresiyle tanır.
- `src/latency.ts` — `FRAME_MS`, `latencyFrames`, `windowInFrames`: tamponun gizli
  bedeli olan girdi gecikmesini milisaniyeden kareye çevirir.

Demo (DOM + canvas + gerçek saat sadece burada):

- `src/render.ts` + `src/main.ts` + `index.html` — tek karakter: zıplama
  (coyote + jump buffer), `↓ ↘ → + J` ile hadouken. Ekran kenarında CANLI overlay:
  tampon damgaları + yaşları (tüketilenler üstü çizili), komut kuyruğu, dizi ilerleme
  çubuğu ve "SPECIAL!" flaşı.

## Kurulum

```bash
npm install
```

## Çalıştırma

```bash
npm run dev      # Vite dev server → http://localhost:5173/
```

Tarayıcıda açın. `file://` ile açarsanız modüller yüklenmez ve boş ekran görürsünüz.

**Kontroller:** `← →` yürü · `Space`/`↑` zıpla · `↓ ↘ → + J` special (hadouken).
Platform kenarından yürüyünce karakterin etrafında kısa süre yeşil `COYOTE` halkası
belirir — o an hâlâ zıplayabilirsiniz.

## Test

```bash
npm test         # 18 test, tarayıcı açmaz, birkaç ms
npm run typecheck
```

18 birim testi belleğin bütün iddialarını enjekte edilen `now` ile doğrular:
pencere içi/dışı tüketim, çift tüketim engeli, sondan tarama, negatif yaş, prune,
komut kuyruğunun koşul/süre-aşımı davranışı, dizi tanıma + sıfırlama, ve
milisaniye→kare çevrimi.

## Bench

```bash
npm run bench    # vite-node ile throughput + deterministik senaryo
```

`InputBuffer press+consume` ve `SequenceMatcher feed` throughput'unu ölçer, ayrıca
belirli zaman-damgalı bir girdi dizisinin beklenen komutları (`["jump"]` + special)
ürettiğini deterministik olarak doğrular.

## Build

```bash
npm run build    # tsc && vite build → dist/
```

## Dosya yapısı

```
src/
  input-buffer.ts   # InputBuffer + coyoteWindow (saf)
  command-queue.ts  # CommandQueue<Ctx> (saf)
  sequence.ts       # SequenceMatcher (saf)
  latency.ts        # latencyFrames + windowInFrames (saf)
  render.ts         # Canvas2D çizim + overlay (sadece render)
  main.ts           # Klavye → bellek → fizik döngüsü (DOM + gerçek saat)
test/
  input-buffer.test.ts
  command-queue.test.ts
  sequence.test.ts
  latency.test.ts
bench/
  bench.ts
```

## Lisans

MIT
