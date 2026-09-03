# Hadouken Neden Çıkmadı: Coyote Time'ın Ötesinde Girdi Tamponu, Komut Kuyruğu ve Oyunun Kısa Süreli Hafızası

*Coyote time affedici bir platformer'ın sadece başlangıcıydı. Bu yazıda girdiyi bir olay olmaktan çıkarıp zaman damgalı bir kayda çeviriyoruz: genel bir input buffer, koşulunu bekleyen bir komut kuyruğu ve "çeyrek daire + yumruk"u pencere içinde yakalayan bir dizi tanıyıcı. Ve zaman dışarıdan geldiği için hepsi tarayıcı açmadan test ediliyor.*

*Tahmini okuma süresi: 15 dakika*

---

Parmağın hareketi yaptı. Aşağı, aşağı-ileri, ileri, yumruk. Ekranda hiçbir şey olmadı.

Street Fighter oynayan herkes bu anı bilir. Hadouken'i çıkarmak için o çeyrek daireyi çizdin, yumruğa bastın, ve karakterin öylece durdu. "Ben yaptım ama" diye söylenirsin. Aslında yaptın da. Sorun senin parmağında değildi. Sorun oyunun her tuşu ayrı ayrı, birbirinden habersiz, o an olup biten bir olay (event) gibi dinlemesindeydi. Aşağı geldi, gitti. Aşağı-ileri geldi, gitti. Aralarında hiçbir bağ yok, çünkü oyunun bir hafızası yok. Dört ayrı çığlık duydu, bir cümle duymadı.

Bu yazının bütün derdi o hafızayı kurmak. Oyuna kısa süreli bir bellek (short-term memory) vereceğiz: bastığın her tuşu bir zaman damgasıyla bir deftere yazan, sonra o defteri kısa bir pencere içinde geri okuyan bir bellek. Coyote time da jump buffering de bu belleğin en basit iki sayfası. Biz defterin tamamını yazacağız.

Serinin dördüncü yazısında, o kahvaltı sofrasında yuvarlanan zeytinle, affedici bir platformer kurmuştuk: coyote time (uçurumdan çıkınca birkaç kare daha zıplayabilme), jump buffering (yere inmeden basılan zıplamayı hatırlama), değişken zıplama. O yazı bunları tek amaçlı iki sayaçla çözdü ve sonunda bir söz verdi: girdi tamponlaması başlı başına ayrı bir yazının konusu. İşte o yazı bu. Oradaki iki sayacı bugün genel, yeniden kullanılabilir bir belleğe çeviriyoruz ve platformer'ın çok ötesine, dövüş oyununun içine kadar götürüyoruz.

Yol haritası sekiz durak: coyote'yi hatırlayıp ilerisine geçmek, girdiyi neden "olay" değil "kayıt" saymamız gerektiği, genel bir `InputBuffer`, koşulunu bekleyen bir komut kuyruğu, bırakmayı da bir girdi sayan negatif kenar, çeyrek daireyi tanıyan bir dizi eşleyici, tamponun gizli bedeli olan girdi gecikmesi, ve en sonda zamanı elle enjekte ederek her şeyi tarayıcısız kanıtlamak.

### Nereden Devam Ediyoruz: Coyote Time Zaten Vardı

Önce borcumuzu ödeyelim, çünkü coyote'yi sıfırdan anlatacak değilim. Side-scroller yazısında zeytin platformdan ayrıldıktan sonra da yaklaşık 0.1 saniye zıplayabiliyordu; jump buffering ise yere inmeden önce basılan zıplamayı 0.12 saniye hatırlıyordu. İkisi de iki sayaç ve tek bir koşuldu:

```ts
// canvas-side-scroller-from-scratch projesinden HATIRLATMA — bu kod bu yazının
// projesinde YOK; aşağıda genel belleğe çevireceğimiz eski, tek amaçlı hali.
export function shouldJump(j: {
  timeSinceGround: number;
  timeSincePress: number;
}): boolean {
  return j.timeSinceGround <= 0.1 && j.timeSincePress <= 0.12;
}
```

Bu güzel çalıştı, ama tek amaçlıydı. `timeSincePress` sadece zıplamayı biliyordu. Dash için ikinci bir sayaç, saldırı için üçüncü, çeyrek daire için altı sayaç mı tutacağız? Sayaçlar çoğaldıkça her biri elle beslenmesi gereken bir borç oluyor. Bir tanesini bir karede sıfırlamayı unutursun, girdi kaybolur, sebebini yarım saat ararsın.

Peki bu sayaçların hepsi aslında tek bir şeyin özel hali değil mi? Hepsi "şu tuşa şu an basıldı, ne kadar zaman geçti" diyor. Bir tuş için doğru olan, her tuş için doğru. O halde tek tuşa özel bir sayaç yerine, her tuşu zaman damgasıyla yazan tek bir defter tutalım.

### Girdiyi Bir Olay Değil, Zaman Damgalı Bir Kayıt Yap

Bir olayın hüznü şudur: geçmiştir. `keydown` tetiklendiği an bir şey yapmazsan, o an bir daha gelmez. Tuşun "basıldı" bilgisi o mikro saniyede doğar ve ölür. Oyun döngüsü bir sonraki kareye geçtiğinde artık elinde hiçbir şey yoktur, olsa olsa bir boolean bayrak kalmıştır ki o da "şu an basılı mı" der, "ne zaman basıldı" demez.

Bütün mesele bu ayrımda. "Basılı mı" bir durum, "ne zaman basıldı" bir kayıt. Coyote time'ın çalışmasının tek sebebi, ikinci soruyu sorabiliyor olmamızdı. Zeytin uçurumdan çıktı, ama "en son ne zaman yerdeydin" sorusunun cevabı hâlâ "90 milisaniye önce" olduğu için affediyorduk. Zaman damgası olmadan af diye bir şey olamaz.

O yüzden girdiyi bir olay gibi tüketmeyi bırakıp bir kayıt gibi saklayacağız. Her basış deftere bir satır düşürecek: hangi tuş, hangi an. Oyun döngüsü de o defteri okuyacak. "Şu tuşa son 120 milisaniye içinde basıldı mı" diye soracak, cevap evetse eylemi yapacak. Girdi artık uçup giden bir kıvılcım değil, kısa bir süre sayfada duran, okunabilen, hatta üstü çizilebilen bir not.

Bir de küçük bir güzelliği var: defter zaman damgalı olduğu için, o zamanı biz dışarıdan verebiliriz. Bu cümlenin ne kadar önemli olduğunu yazının sonunda göreceğiz. Şimdilik aklınızda kalsın.

### Genel InputBuffer: Pencere ve Süre Aşımı

Defterin kendisi utanç verecek kadar basit. İçinde bir dizi damga (stamp) var; her damga bir tuş, bir an ve "tüketildi mi" bilgisinden ibaret. Üç metot: yaz, oku, temizle.

```ts
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
```

`consume`'un kalbindeki üç sayıya dikkat: `token`, `now`, `window`. Pencere (window), damganın ne kadar taze olması gerektiğini söyleyen tek sayı. Jump buffer için 120 milisaniye, coyote için 100, dövüş oyununda bir hareket adımı için belki 200. Aynı defter, farklı okuyuculara farklı pencere veriyor. Sayaç başına bir değişken tutmuyoruz artık; pencereyi okuma anında, çağıran taraf söylüyor.

İki incelik var, ikisi de bir bug yememek için. Birincisi, en yeniyi tüketiyoruz: döngü diziyi sondan başa tarıyor. Oyuncu 20 milisaniye arayla iki kez zıplaya bastıysa, niyeti en son basıştır; eskiyi tüketmek geç kalmış bir zıplamayı canlandırırdı. İkincisi, `consumed` bayrağı. Bir damga bir kez tüketilir. Bu olmadan aynı basış hem coyote penceresinde hem bir kare sonra tekrar okunur, oyuncu tek basışla iki kez zıplardı. Side-scroller'da bunu `timeSincePress = BUFFER + 1` diye elle "yakıyorduk"; burada bayrak işi temizce yapıyor.

`prune` ise defterin çöpçüsü. Tüketilmiş ya da yeterince eskimiş satırları atar. Onsuz defter sonsuza kadar büyür; her karede bir temizlik, belleği bir avuç damgada tutar.

Şimdi coyote'ye geri dönelim, çünkü artık onu bu belleğin bir özel hali olarak yazabiliriz. Zeminden ayrılma anını bir damga gibi düşünün: "en son şu an yerdeydin". Coyote penceresi de tam olarak `consume`'un pencere kontrolüyle aynı soru:

```ts
// input-buffer.ts — coyote, artık genel pencerenin bir özel hali
export function coyoteWindow(
  lastGroundedAt: number,
  now: number,
  window: number,
): boolean {
  const age = now - lastGroundedAt;
  return age >= 0 && age <= window;
}
```

`shouldJump`'ın iki yarısını hatırlayın: `timeSinceGround <= COYOTE` bu fonksiyonun ta kendisi, `timeSincePress <= BUFFER` ise `buffer.consume("jump", now, 120)` çağrısı. Side-scroller'ın tek amaçlı iki sayacı, aynı belleğin iki okuması olarak yeniden doğdu. Zıplama artık şu iki satır: yerdeysen (coyote penceresi) ve son 120 milisaniyede zıpla bastıysan (buffer), zıpla.

Burada #25'te verdiğimiz sözün karşılığını da alıyoruz. State machine yazısında FSM'in "nasıl zıplanır"ı temizlediğini, "ne zaman zıpla saymalı"yı ise tamponun çözeceğini söylemiştik. O kavşak tam burası: `buffer.consume("jump", now, 120)` true dönerse, makineye `send("jump", ctx)` yollarsınız. Tampon "ne zaman", FSM "nasıl". Biri belleği okur, diğeri kapıyı açar. İkisi birbirinin işine karışmaz.

### Komut Kuyruğu: Sıradaki Eylemi Beklet

Tampon bir soruyu çözüyor: "bu girdi yeterince taze mi?" Ama bir soru daha var. Bazen girdi tazedir, oyuncu tam zamanında basmıştır, ama eylem o an fiziksel olarak mümkün değildir. Zeytin havadadır, zıplayamaz. Karakter saldırı animasyonunun ortasındadır, dash yapamaz. Girdiyi çöpe atarsanız oyuncu haksızlığa uğrar; ama hemen de yapamazsınız.

Bunun için ikinci bir yapı lazım: koşulunu bekleyen bir komut. Tampon "girdiyi hatırlar", kuyruk "eylemi bekletir". Bir komut, bir aksiyon adı, bir giriş zamanı ve "ne zaman yapılabilir" diye soran bir koşuldan ibaret:

```ts
// command-queue.ts
export interface Command<Ctx> {
  action: string;
  at: number; // kuyruğa girdiği an (ms)
  ready: (ctx: Ctx) => boolean; // ne zaman yapılabilir?
}

export class CommandQueue<Ctx> {
  private items: Command<Ctx>[] = [];

  enqueue(cmd: Command<Ctx>): void {
    this.items.push(cmd);
  }

  /**
   * Koşulu sağlanan komutları sırayla dışarı ver; `ttl`'i aşanları sessizce düş.
   * Dönüş: bu karede ateşlenen aksiyonlar. Yan etki yok: kuyruk sadece kendi
   * listesini günceller, eylemi çağıran taraf uygular (ör. FSM'e send).
   */
  flush(now: number, ttl: number, ctx: Ctx): string[] {
    const fired: string[] = [];
    const keep: Command<Ctx>[] = [];
    for (const cmd of this.items) {
      if (now - cmd.at > ttl) continue; // süre aşımı: düş
      if (cmd.ready(ctx)) {
        fired.push(cmd.action); // koşul sağlandı: ateşle
      } else {
        keep.push(cmd); // henüz olmadı: beklet
      }
    }
    this.items = keep;
    return fired;
  }

  /** Görselleştirme için bekleyen komutlar. */
  get pending(): ReadonlyArray<Readonly<Command<Ctx>>> {
    return this.items;
  }
}
```

`ready` bir fonksiyon, çünkü koşulun sahibi kuyruk değil, oyun. FSM yazısındaki guard'ları hatırlayın: makine soruyu sorar, cevabı dışarısı verir. Burada da aynı refleks. Kuyruk "zıpla" komutunu tutar ama "yerde miyim" sorusunu her `flush`'ta dışarıdan gelen `ctx`'e sorar. Zeytin havadayken komut bekler; yere değdiği karede `ready` true döner ve komut ateşlenir.

`ttl` (time to live, yaşam süresi) ise kuyruğun sabrının sınırı. Bir komut sonsuza kadar bekleyemez. Oyuncu iki saniye önce dash'e bastıysa ve karakter hâlâ müsait değilse, o niyet artık bayattır; oyuncu çoktan başka bir şey düşünüyordur. `ttl`'i aşan komut sessizce düşer. Tampon penceresinin kuyruk versiyonu bu.

Küçük bir tasarım kararını itiraf edeyim, çünkü ilk yazışımda ters yapmıştım. Süre aşımı kontrolünü `ready` kontrolünden önce koydum. Yani bir komut hem hazır hem de süresi geçmişse, düşürüyoruz, ateşlemiyoruz. Önce `ready`'yi koysaydım, iki saniye bekleyip tam süresi dolacakken yere değen bir komut ateşlenirdi ve oyuncu iki saniye önce unuttuğu bir zıplamayı yerken bulurdu. Bayat girdiyi affetmek, taze girdiyi affetmekten daha kötü. Sıra önemli.

Tampon ile kuyruk çoğu zaman birlikte çalışır: tampon girdiyi yakalar, "şu an yapılabilir mi" diye bakarsın, yapılamıyorsa kuyruğa atarsın. Ama basit durumlarda (jump buffer gibi) tampon tek başına yeter, çünkü orada koşul sadece zamandır. Kuyruk, koşul zaman-dışı bir şey olduğunda (animasyon bitişi, yere değme, bir kaynağın dolması) devreye girer.

### Negatif Kenar (Negative Edge): Bırakmak da Bir Girdidir

Şimdi tuhaf bir dövüş oyunu gerçeği. Klasik Street Fighter'da bir special move'u tuşa basarak da, basılı tuttuğun tuşu bırakarak da çıkarabilirsin. Bir tuşu basılı tutup çeyrek daireyi çizer, sonra tuşu bırakırsan hadouken yine çıkar. Buna negatif kenar (negative edge) denir ve ismi elektronikten gelir: sinyalin yükselen kenarı basıştır, düşen kenarı bırakış. Oyun ikisini de bir girdi sayar.

Neden umursayalım? Çünkü bizim tampon zaten buna hazır. `press` bir token yazıyor; token'ın ne olduğu tamponu ilgilendirmiyor. O halde bırakmayı da ayrı bir token olarak yazarız. Basış `"punch"`, bırakış `"punch^"`. İki ayrı damga, iki ayrı zaman, iki ayrı satır. Oyun katmanında `keydown` birini, `keyup` diğerini deftere düşürür:

```ts
// src/main.ts — iki fonksiyon repodakiyle birebir; çevresi kısaltıldı
import { InputBuffer } from "./input-buffer";

const buffer = new InputBuffer();

// Basma ve bırakma AYRI olaylar: ikisi de deftere zaman damgasıyla yazılır.
function onKeyDown(action: string, now: number): void {
  buffer.press(action, now); // yükselen kenar: "punch"
}
function onKeyUp(action: string, now: number): void {
  buffer.press(action + "^", now); // düşen kenar: "punch^"
}
```

Böylece `consume("punch", ...)` basışı, `consume("punch^", ...)` bırakışı tüketir; biri diğerini yemez. Negatif kenar için ayrı bir mekanizma, ayrı bir sayaç, ayrı bir kod yolu yazmadık. Sadece belleğe bir token daha yazdık. İyi bir soyutlamanın işareti tam bu: yeni bir gereksinim, yeni bir kavram değil, var olanın bir kullanımı çıkıyor.

Bu aynı zamanda "bir tuşu ne kadar tuttun" gibi şeyleri de ölçebilir kılar. Basış damgası ile bırakış damgası arasındaki fark, tuşun basılı kaldığı süredir. Değişken zıplamanın (tuşu erken bırakınca alçak zıpla) bir başka yüzü. Ama o ayrı bir yazının konusu; burada sadece kapıyı gösterip geçiyorum.

### Dizi Tanıma: Çeyrek Daire + Yumruk

Geldik açılıştaki hadouken'e. Çeyrek daire ileri (quarter-circle-forward), dört adımlık bir dizi: `down`, `down-forward`, `forward`, ve ardından `punch`. Oyuncunun bunları arka arkaya, ama çok da yavaş olmayacak şekilde basması gerekir. "Çok da yavaş değil" kısmı işin canı: her adım arasında bir pencere var. Aşağıya basıp iki saniye bekleyip sonra yumruğa basarsan, bu bir hadouken değil, iki alakasız girdi.

Bu yüzden dizi tanıyıcı (sequence matcher) iki şey tutar: kaçıncı adımdayız (progress) ve son adımı ne zaman bastık (lastStepAt). Her yeni token geldiğinde önce şunu sorar: son adımdan bu yana çok mu zaman geçti? Geçtiyse ilerleme koptu, sıfırla. Değilse, gelen token beklenen adım mı diye bak:

```ts
// sequence.ts
export class SequenceMatcher {
  private progress = 0;
  private lastStepAt = 0;

  constructor(
    private readonly steps: readonly string[],
    private readonly stepWindow: number, // adımlar arası izin verilen max gecikme (ms)
  ) {}

  /**
   * Bir token besle. `now` zaman damgasıyla. Dizi tamamlandıysa true döner ve
   * ilerleme sıfırlanır (aynı hareket peş peşe basılabilsin).
   */
  feed(token: string, now: number): boolean {
    // Araya çok gecikme girdiyse ilerlemeyi sil: hareket "koptu".
    if (this.progress > 0 && now - this.lastStepAt > this.stepWindow) {
      this.progress = 0;
    }

    const expected = this.steps[this.progress];
    if (token === expected) {
      this.progress++;
      this.lastStepAt = now;
      if (this.progress === this.steps.length) {
        this.progress = 0;
        return true; // SPECIAL!
      }
      return false;
    }

    // Beklenen gelmedi. Token dizinin başıysa yeni bir denemeye başla,
    // değilse baştan sıfırla.
    if (token === this.steps[0]) {
      this.progress = 1;
      this.lastStepAt = now;
    } else {
      this.progress = 0;
    }
    return false;
  }

  /** Overlay için: dizinin kaçıncı adımındayız. */
  get step(): number {
    return this.progress;
  }
}
```

Kullanımı bir satır. Diziyi ve adım penceresini verip beslemeye başlıyorsunuz:

```ts
// src/main.ts — kullanım (demo bağlamından kısaltıldı)
import { SequenceMatcher } from "./sequence";

const STEPS = ["down", "down-forward", "forward", "punch"] as const;
const STEP_WINDOW = 200; // her adım arası en fazla 200 ms
const hadouken = new SequenceMatcher(STEPS, STEP_WINDOW);

// Girdi geldikçe besle. Yalnızca dizinin SON adımı (punch) true döndürür;
// aradaki yön adımları hep false döner.
if (hadouken.feed("punch", now)) {
  state.specialFlashUntil = now + 600; // ekrana "SPECIAL!" düşür
}
```

İki ince nokta bu tanıyıcıyı gerçek oyunlarda çalışır kılıyor. Birincisi, yanlış token geldiğinde körlemesine sıfırlamıyoruz. Gelen token dizinin ilk adımıysa, ilerlemeyi 1'e çekip yeni bir denemeye başlıyoruz. Oyuncu `down`, `down`, `down-forward`... diye biraz tereddütlü bastığında hareket yine tanınsın diye. İkincisi, tamamlanınca `progress` sıfıra dönüyor, böylece oyuncu iki hadouken'i peş peşe atabiliyor.

Gerçek bir dövüş oyunu bundan daha toleranslıdır: çapraz yönleri esnek yorumlar, birkaç kare fazladan girdiyi yok sayar, hatta girdiyi bir "input history" halkasında tutar ve geriye doğru tarar. Ama çekirdek fikir tam olarak bu: bir diziyi, adımlar arası zaman penceresiyle, kısmi ilerleme tutarak eşle. Ve dikkat edin, tanıyıcının kendi saati yok. Her `feed`'e `now`'ı biz veriyoruz. Bu, bir sonraki bölümün de sırrı.

### Girdi Gecikmesi (Input Latency): Tamponun Gizli Bedeli

Bu affediciliğin bir faturası var, ve o faturayı kimse sana önceden söylemez. Tampon bir girdiyi hemen değil, koşulu sağlanınca tüketir. Erken basılan bir zıplama, zeytin yere değene kadar bekler. O bekleme bir gecikmedir (input latency). Oyuncu tuşa 1000. milisaniyede bastı, zıplama 1100'de gerçekleşti: aradaki 100 milisaniye, tamponun oyuncuya fark ettirmeden eklediği borç.

Bu borcu kareye çevirmek faydalı, çünkü oyun geliştiricileri milisaniye değil kare konuşur. 60 FPS'te bir kare yaklaşık 16.67 milisaniye:

```ts
// latency.ts
export const FRAME_MS = 1000 / 60; // 60 FPS'te bir kare ≈ 16.67 ms

/**
 * Basış ile eylemin gerçekleştiği an arasındaki gecikme, kare cinsinden.
 * Pozitif: eylem basıştan sonra ateşlendi (tamponlandı/geç). 0: aynı karede.
 */
export function latencyFrames(
  pressAt: number,
  actionAt: number,
  frameMs = FRAME_MS,
): number {
  return (actionAt - pressAt) / frameMs;
}

/** Bir pencere süresi (ms) kaç kareye denk gelir. */
export function windowInFrames(window: number, frameMs = FRAME_MS): number {
  return window / frameMs;
}
```

Bu iki minik fonksiyon bir tasarım sohbetini sayıya çeviriyor. 120 milisaniyelik bir jump buffer penceresi, `windowInFrames(120)` ile 7.2 kare eder. Yani en kötü ihtimalle oyuncunun zıplaması 7 kare geç ateşlenebilir. Bu çok mu? Bir platformer için genelde hayır, göze çarpmaz, "adil" hisseder. Ama bir ritim oyununda ya da rekabetçi bir dövüş oyununda 7 kare felakettir; orada pencereni daraltırsın.

Tamponlamanın gizli dengesi tam burada. Pencereyi büyütürsen oyun daha affedici ama daha "gevşek" hisseder, girdilerin geç oturur. Küçültürsen daha keskin ama daha zalim olur, kenarda basanı affetmez. `latencyFrames` ile bu dengeyi tahminle değil ölçerek kurarsın. Coyote 100 milisaniye mi olsun 80 mi? İkisini de kare cinsinden görüp karar verirsin. Affediciliğin bir dozu var, ve o dozu görünür kılmayan her tampon karanlıkta ayar yapıyor.

Bu arada, tampon zaman damgalı olduğu için serinin başka bir yazısıyla da akraba. #16'da girdi kaydı ve deterministik replay'i kurmuştuk: girdileri tick numaralarıyla kaydedip aynen geri oynatmak. Aynı zaman damgalı girdiler, aynı belleğe geri beslenirse, kaydedilmiş bir oyun aynı hadouken'i aynı karede çıkarır. Tampon, kayıt, replay: hepsi "girdi, zaman damgalı bir kayıttır" fikrinin farklı meyveleri.

### Determinist Test: Zaman Damgalarını Enjekte Et

Ve geldik başta aklınızda kalsın dediğim yere. Bu belleğin hiçbir metodu duvar saatine (wall clock) bakmıyor. `press`, `consume`, `prune`, `feed`, `flush`, hepsi `now`'ı parametre olarak alıyor. `Date.now()` yok, `performance.now()` yok. Zaman, odaya kapıdan uzatılıyor.

#15'te bunu bir temiz oda (clean room) disiplini olarak kurmuştuk: simülasyonu render'dan, rastgeleliği tohumdan, zamanı duvar saatinden ayır. Tampon bu disiplinin tam bir örneği. Zaman dışarıdan geldiği için, testte zamanı biz yazarız. "80 milisaniye sonra" demek için 80 milisaniye beklemeyiz; `consume(..., 1080, ...)` deriz ve iş biter.

En temel testler doğrudan pencereyi yokluyor: içindeyse tüket, dışındaysa tüketme, tüketilen ikinci kez tüketilmesin:

```ts
// test/input-buffer.test.ts — dosyadaki 8 testin en anlatıcı 4'ü
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
});
```

Komut kuyruğu da aynı kolaylıkta. Koşul sağlanınca boşalıyor mu, süre aşımıyla düşüyor mu; ikisini de elle enjekte edilen zamanla kanıtlıyoruz:

```ts
// test/command-queue.test.ts — 3 testin 2'si (üçüncüsü "bayat girdi hazır
// olsa bile ateşlenmez", yani süre aşımının ready'den önce gelmesi)
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
});
```

Dizi tanıyıcının testi ise iki yönden sıkıştırıyor: hem tanıdığını hem de doğru yerde vazgeçtiğini gösteriyor. Zaman damgalarını kare kare uydurup çeyrek daireyi çiziyoruz; sonra araya kasten uzun bir boşluk koyup dizinin koptuğunu doğruluyoruz:

```ts
// test/sequence.test.ts — 4 testin 2'si
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
});
```

Bu testlerin hiçbiri tarayıcı açmıyor, canvas'a dokunmuyor, gerçek bir milisaniye beklemiyor. Repoda dört dosyada toplam 18 test var (tampon 8, kuyruk 3, dizi 4, gecikme 3) ve hepsi birkaç milisaniyede koşuyor. Zamanı enjekte etmenin bütün karşılığı bu tek satırda: `feed("forward", 1600)`. Gerçekte 600 milisaniye geçmedi; ibreyi biz çevirdik ve dizinin koptuğunu bir milisaniye beklemeden gördük.

### Demo: Belleği Ekranda Görmek

Saf mantık test edilir, ama bir de gözle görülür olsun istedim. Demoda tek bir karakter var: zıplayabiliyor (coyote + jump buffer görünür bir göstergeyle) ve bir de special'ı var, `down`, `down-forward`, `forward` ardından attack.

Ekranın kenarında belleğin canlı hali akıyor: tamponun içindeki damgalar, her birinin yaşı milisaniye cinsinden, üstü çizilenler tüketilmiş olanlar. Altında komut kuyruğunda bekleyen ne varsa, kaç milisaniyedir beklediğiyle. Dizi tanıyıcının kaçıncı adımda olduğu bir ilerleme çubuğu gibi dolup boşalıyor, ve çeyrek daire tamamlandığı an ekrana kocaman bir "SPECIAL!" düşüyor. Coyote penceresi de görünür: zeytin uçurumdan çıkınca kısa bir süre yeşil bir "hâlâ zıplayabilirsin" işareti yanıp sönüyor.

Bu overlay bir gösteriş değil, bir teşhis aracı. Bir girdi "kaybolduğunda", defteri gözünüzle okuyup nedenini görüyorsunuz: damga pencereden mi düştü, yoksa hiç yazılmadı mı? #25'teki durum etiketleri ve geçiş logu neyse, bu da o: soyut bir mekanizmayı ekranda olan bir şeye çeviriyor.

Demo Vite ile çalışıyor; `npm run dev` deyip tarayıcıda açmanız yeterli. `file://` ile açarsanız modüller yüklenmez ve boş ekran görürsünüz, bunu serideki her demoda tekrarladım çünkü ben yeterince kez yedim.

### Özetle:

1. Girdiyi bir olay (event) değil, zaman damgalı bir kayıt (record) yapın. "Basılı mı" bir durumdur; "ne zaman basıldı" bir bellektir, ve af ancak bellekle mümkündür.
2. `InputBuffer` üç metottur: `press(token, now)` yazar, `consume(token, now, window)` pencere içindeyse bir kez tüketir, `prune` eskiyeni atar. Pencere sayaç başına değil, okuma anında verilir.
3. Coyote time ve jump buffering bu belleğin iki özel hali: coyote `coyoteWindow`, buffer `consume("jump", ...)`. Side-scroller'ın iki sayacı, tek belleğin iki okuması.
4. `CommandQueue` koşulu zaman-dışı olan eylemleri bekletir: `ready(ctx)` sağlanınca ateşler, `ttl`'i aşınca düşer. Koşulun sahibi oyun, tıpkı FSM guard'larındaki gibi.
5. Süre aşımını `ready`'den önce kontrol edin: bayat girdiyi affetmek, taze girdiyi affetmekten daha kötü hisseder.
6. Negatif kenar (negative edge) ayrı bir mekanizma değil, ayrı bir token: `press("punch^", now)`. İyi soyutlamada yeni gereksinim, var olanın bir kullanımı çıkar.
7. Dizi tanıma kısmi ilerleme + adım penceresi tutar: doğru adım ilerletir, yanlış adım sıfırlar (ama ilk adımsa yeniden başlar), çok gecikme koparır.
8. Tamponun bedeli girdi gecikmesidir: `latencyFrames` ile milisaniyeyi kareye çevirip affediciliğin dozunu tahminle değil ölçerek ayarlayın.
9. Bütün bellek `now`'ı dışarıdan aldığı için duvar saatine bağlı değil: testte zamanı elle enjekte edip her şeyi tarayıcısız, milisaniyelerde kanıtlarsınız.

Repoda `npm test` bütün belleği tarayıcısız doğruluyor; demoyu görmek isterseniz `npm run dev` sizi hadouken'i çıkarabildiğiniz karakterle buluşturuyor.

Coyote time'ı ilk duyduğumda bir hile sanmıştım; karakter uçurumdan çıktıktan sonra hâlâ zıplayabiliyorsa bu bir bug değil miydi? Yıllar aldı, ama sonunda mesele hile değilmiş, hafızaymış. İyi kontroller, oyunun senin niyetini bir an akılda tutmasından doğuyor. Parmağın hata yapmadı; oyun seni unutmasın diye ona küçük bir defter verdik, o kadar. Ve bir dahaki sefere hadouken çıkmadığında, artık kimin suçlu olduğunu deftere bakıp anlayabilirsin. 🥋⏱️

---

### 🚀 Serinin ve Konunun Devamı
Web oyun mekanikleri, girdi mimarisi ve oyun tasarımı serisindeki diğer yazılarımız:
- 📌 **[Darbeyi Darbe Yapan Es: Sıfırdan Hit-Stop ve Katmanlı Juice](https://medium.com/@mkare)** — *Çarpışma anında zamanı birkaç kare dondurarak (hit-stop) vuruşa ağırlık katma sanatı.*
- 📌 **[Aynı Anda İki Odada Olamazsın: Oyun Varlıkları İçin Sonlu Durum Makineleri (FSM)](https://medium.com/@mkare)** — *Spagetti if-else karmaşasından kurtulup karakter durumlarını (Idle/Run/Jump) disipline etme.*
- 📌 **[Sıfırdan Tweening ve Easing: Penner Denklemleri ve Canlı Eğri Görselleştirici](https://medium.com/@mkare)** — *Akıcı hareketler, sönümlü zıplamalar ve Penner matematiği.*

---

### 👋 Yazar Hakkında
Ben **Mustafa Morbel** — 14 yılı aşkın süredir modern web teknolojileri, tarayıcı oyun motorları, WebGL ve yapay zekâ sistemleri üzerine mühendislik yapıyorum.

* Girdi tamponu (input buffer) testlerini, komut kuyruğunu ve çalışan demoyu **[GitHub (@mkare)](https://github.com/mkare)** profilimde bulabilirsiniz.
* Yeni teknik rehberler ve oyun mekanikleri paylaşımları için **[LinkedIn](https://linkedin.com/in/mustafamorbel)** ve **[X / Twitter (@mustafamorbel)](https://x.com/mustafamorbel)** üzerinden takibe alabilirsiniz.
* Kendi oyunlarınızda oyuncu kontrol hissini nasıl kurguladığınızı yorumlarda paylaşmayı, faydalı bulduysanız 👏 alkış bırakmayı unutmayın!
