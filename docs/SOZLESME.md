# Poker Okulu — Modül Sözleşmesi

Tüm ajanlar bu imzalara uyar. İmza değiştirmek gerekirse **değiştirme**, raporunda öner. Vanilla JS ES modülleri; bağımlılık yok, derleme yok. Motor ve analiz katmanı DOM'a dokunmaz (Node'da test edilir). Göreli importlar `.js` uzantılı (`import { x } from './kart.js'`). Kod içi isimler Türkçe (ASCII), yorumlar Türkçe.

## Kart gösterimi
Kart = 2 karakterlik string: değer + renk. Değer `23456789TJQKA`, renk `s h d c`.
`'Ah'` = Kupa As, `'Td'` = Karo 10, `'2c'` = Sinek 2, `'Ks'` = Maça Papaz.
Türkçe: s=Maça ♠, h=Kupa ♥, d=Karo ♦, c=Sinek ♣; A=As, K=Papaz, Q=Kız, J=Vale, T=10.

## js/motor/rng.js
```js
export function guvenliRng()        // { int(max) } — globalThis.crypto.getRandomValues, modulo sapmasız (blackjack app.js:101-113 mantığı)
export function tohumluRng(tohum)   // { int(max) } — mulberry32, testler/tekrar için
```

## js/motor/kart.js
```js
export const DEGERLER = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
export const RENKLER  = ['s','h','d','c'];
export const RENK_AD = { s:'Maça', h:'Kupa', d:'Karo', c:'Sinek' };
export const RENK_SEMBOL = { s:'♠', h:'♥', d:'♦', c:'♣' };
export const DEGER_AD = { A:'As', K:'Papaz', Q:'Kız', J:'Vale', T:'10', '9':'9', … '2':'2' };
export function tumKartlar()        // 52 kart, sabit sıra
export function kartDeger(k)        // 2..14 (A=14)
export function kartRenk(k)         // 's'|'h'|'d'|'c'
export function kartAdi(k)          // 'Kupa As'
export function kartGecerliMi(k)    // boolean
```

## js/motor/deste.js
```js
export class Deste {
  constructor({ mod = 'elBasi', rng = guvenliRng() })  // mod: 'elBasi' | 'ayakkabi'
  yeniEl(gerekenKart)   // elBasi: her zaman karar. ayakkabi: kalan < gerekenKart ise karar.
                        // döner { karildi: boolean }
  diz(ustKartlar)       // (ders için) desteyi kar, verilen kartları bu sırayla en üste koy
  cek()                 // üstten 1 kart (string); boşsa Error
  yak()                 // üstten 1 kart çeker, yakılanlara ekler, kartı döner
  kalanSayisi()
  cekilenler()          // son karıştırmadan beri çekilen tüm kartlar (yakılanlar dahil)
  karistirmaSayisi      // sayaç (number)
  dogrula()             // kalan ∪ çekilen = 52 benzersiz geçerli kart değilse Error fırlatır
}
```
`gerekenKart = 2*oyuncuSayisi + 5 + 3` (3 yakma).

## js/motor/degerlendirici.js
```js
export const KATEGORI = { YUKSEK:0, CIFT:1, IKI_CIFT:2, UCLU:3, SIRALI:4, FLOS:5, FUL:6, DORTLU:7, SIRALI_FLOS:8, ROYAL:9 };
export const KATEGORI_AD = ['Yüksek Kart','Çift','İki Çift','Üçlü (Set)','Sıralı (Straight)','Floş (Flush)','Ful (Full House)','Dörtlü (Kare)','Sıralı Floş','Royal Floş'];
export function degerlendir(kartlar)  // 5..7 kart → { kategori, ad, puan, enIyi5: string[5], aciklama }
                                      // puan: tam sayı, büyük = güçlü, eşit = beraberlik.
                                      // aciklama: 'Papaz çifti, As kicker' gibi Türkçe.
export function karsilastir(a, b)     // a, b: degerlendir sonucu → -1 | 0 | 1
export function kazananlar(eller)     // [{id, kartlar}] → kazanan id[] (beraberlikte çok)
```
A-2-3-4-5 (wheel) sıralıdır, en yüksek kartı 5. Royal = A yüksek sıralı floş.

## js/motor/pot.js
```js
export function potlariHesapla(oyuncular)
// oyuncular: [{ id, toplamBahis, dusuk }] → [{ miktar, hakSahipleri: id[] }] (ana pot önce, sonra yan potlar)
// Fold edenin parası pota girer ama hak sahibi olamaz.
export function potuDagit(potlar, kazananBul, dealerSonrasiSira)
// kazananBul(hakSahipleri) → kazanan id[]; bölünemeyen fiş dealer'ın solundan ilk kazanana.
// → { [id]: kazanılanMiktar }
```

## js/motor/oyun.js
```js
export class Oyun {
  constructor({
    oyuncular,              // [{ id, ad, cip, bot: profilAdi | null }]
    kucukBlind, buyukBlind,
    desteModu = 'elBasi',
    rng = guvenliRng(),
    elSonuKartlariAc = false,  // true: el bitince TÜM ellerin kartları 'kartlarAcildi' olayıyla açılır (sayma antrenmanı)
    blindArtis = null,      // { herElde: 10, carpan: 1.5 } turnuva için, yoksa null
  })
  yeniEl({ hazirKartlar } = {})
    // hazirKartlar (ders için): { [oyuncuId]: [k,k], board: [k,k,k,k,k] } → deste.diz ile ayarlanır
    // döner: olay[]
  eylem(oyuncuId, { tur, miktar })
    // tur: 'fold'|'check'|'call'|'bet'|'raise'|'allin'
    // miktar (bet/raise): bu sokakta oyuncunun TOPLAM koyacağı miktar ("raise to")
    // geçersizse Error('Geçersiz eylem: …'). döner: olay[]
  gecerliEylemler(oyuncuId)
    // → { fold, check, call: eklenecekMiktar|null, bet: {min,max}|null, raise: {min,max}|null, allin: eklenecekMiktar }
  siradaki()               // oyuncuId | null (el bitti ya da bekleniyor)
  gorunum(oyuncuId)        // o oyuncunun görebildiği anlık durum (aşağıda); başkalarının kartları gizli (showdown'da açılanlar hariç)
  durum()                  // tam durum (test/hata ayıklama)
  elBittiMi(); oyunBittiMi()
  deste                    // Deste örneği (salt okunur kullan)
}
```
Kurallar:
- Dealer düğmesi her el sağa (index+1) kayar, oyuncusu bitenler atlanır.
- Heads-up'ta dealer küçük blind öder, preflop ilk o konuşur, sonraki sokaklarda son konuşur.
- Gerçek dağıtım sırası: kartlar dealer'ın solundan başlayarak birer birer iki tur. Flop, turn ve river'dan önce birer yakma kartı.
- En az raise: son bet ya da raise artışı kadar (preflop'ta en az BB). Tam raise olmayan all-in, zaten konuşmuş oyuncuya yeniden raise hakkı açmaz.
- Herkes all-in ya da biri kalınca kalan board otomatik açılır.
- Showdown'da açılma sırası: son agresif oyuncu önce. Botlar kaybedince elini açmayabilir, ders için `elSonuKartlariAc` hepsini açar.

`gorunum(id)` biçimi:
```js
{ elNo, sokak: 'preflop'|'flop'|'turn'|'river'|'showdown'|'bitti', board: [], potToplam, mevcutBahis, enAzRaise,
  dealerId, kucukBlindId, buyukBlindId, siradakiId, benimId, benimKartlarim: [k,k],
  oyuncular: [{ id, ad, cip, bahis, toplamBahis, dusuk, allIn, oturuyor, acikKartlar: [k,k]|null, pozisyon: 'BTN'|'SB'|'BB'|'UTG'|'MP'|'CO' }],
  gecmis: olay[] /* bu elin, oyuncuya görünür olaylar */ }
```

### Olaylar (her olay `{ tur, ... }`)
| tur | alanlar | görünürlük |
|---|---|---|
| `karildi` | `{ mod }` | herkes |
| `elBasladi` | `{ elNo, dealerId, kucukBlind, buyukBlind }` | herkes |
| `blind` | `{ oyuncuId, miktar, tip:'kucuk'|'buyuk' }` | herkes |
| `kartDagitildi` | `{ oyuncuId, kartlar:[k,k] }` | yalnız `oyuncuId` (gorunum'de diğerleri `kartlar:null`) |
| `yakildi` | `{}` | herkes (kart yüzü gizli) |
| `sokak` | `{ sokak, yeniKartlar, board }` | herkes |
| `eylem` | `{ oyuncuId, tur, miktar, eklenen }` | herkes |
| `showdown` | `{ acilanlar: [{ oyuncuId, kartlar, deger }] }` | herkes |
| `kartlarAcildi` | `{ eller: [{ oyuncuId, kartlar }] }` | herkes (yalnız elSonuKartlariAc) |
| `potKazanildi` | `{ potIndex, miktar, kazananlar: id[], deger }` | herkes |
| `elBitti` | `{ cipler: {id: cip} }` | herkes |
| `oyuncuElendi` | `{ oyuncuId }` | herkes |
| `oyunBitti` | `{ kazananId }` | herkes |

`deger` = degerlendir sonucu.

## js/analiz/outs.js
```js
export function outlariBul(elKartlari, board, { gorulen = [] } = {})
// board 3 ya da 4 kart. Bilinmeyen kartlar (52 − el − board − gorulen) içinde elin kategorisini yükselten
// VE iyileşme yalnızca board'dan gelmeyen kartlar.
// → { toplam, kartlar: string[], gruplar: [{ ad: 'Floş çekişi', kartlar }], aciklama }
```

## js/analiz/olasilik.js
```js
export function equity(eller, board = [], { olu = [], iterasyon = 20000, rng } = {})
// eller: [[k,k], …] bilinen eller. Kalan board ≤ 2 kartsa kesin sayım, yoksa Monte Carlo.
// → [{ kazanma, beraberlik, equity }] (0..1)
export function rastgeleRakibeKarsi(el, board, rakipSayisi, { olu = [], iterasyon = 5000, rng } = {})
// → { kazanma, beraberlik, equity }
export function potOrani(pot, callMiktari)  // gereken equity = call / (pot + call)
export function kural24(outSayisi, kalanSokak) // kalanSokak 1 → outs*2, 2 → outs*4 (yüzde, yaklaşık)
export function kesinCekmeOlasiligi(outSayisi, bilinmeyenSayisi, kalanSokak) // gerçek olasılık
```

## js/analiz/sayac.js
```js
export class Sayac {
  constructor({ perspektifId, mod = 'elBasi' })
  olay(e)                    // Oyun olaylarını besle (gorunum gecmişi ya da eylem dönüşleri). 'karildi' → sıfırla.
                             // elBasi modunda 'elBasladi' da sıfırlar.
  gorulen()                  // perspektifin gördüğü kartlar (kendi eli, board, açılanlar)
  bilinmeyen()               // 52 − görülen (destede ya da başkasının elinde/atılmış)
  destedeKalanFiziksel       // number: Oyun.deste.kalanSayisi() ile UI günceller (bilgi amaçlı)
  dagilim()                  // { renk: {s,h,d,c}, deger: {'2':n,…,'A':n} } bilinmeyenlerde
  olasilik(filtre)           // filtre(k) → bool; bilinmeyenler içinde oran (0..1)
}
```

## js/analiz/koc.js
```js
export function kararDegerlendir(gorunum, eylem, { rng } = {})
// İnsan oyuncunun eylemini o anki duruma göre değerlendirir (equity vs pot oranı, el gücü, pozisyon).
// → { not: 'iyi'|'supheli'|'hata', baslik, mesaj, ayrinti: { equity, gerekenEquity, outs } }
export function ipucu(gorunum, { rng } = {})
// Eylemden ÖNCE öneri. → { onerilen: tur, mesaj, ayrinti }
```
Mesajlar kısa, Türkçe, yeni başlayana göre ("Elinde 9 out var, 2-4 kuralıyla ~%36. Pot sana %25 veriyor, call mantıklı.").

## js/botlar/
```js
// profiller.js
export const PROFILLER = { pasifAcemi, sikiPasif, gevsekAgresif, blofcu, akilli };
// her biri: { id, ad, aciklama (Türkçe, oyuncunun okuyacağı tarz tarifi), ipuclari: string[] (rakip okuma dersi için), params: {...} }
// bot.js
export function botKarar(profilId, gorunum, gecerli, { rng })  // → { tur, miktar? } — her zaman gecerli içinden
```
Bot yalnızca `gorunum` görür (başkalarının kartlarını asla). `akilli` olasilik.js kullanır (iterasyon ≤ 2000, hız için).

## js/dersler/
```js
// mufredat.js
export const SEVIYELER = [ seviye00, …, seviye10 ];   // her biri ayrı dosyadan import
```
Seviye nesnesi:
```js
{ id: 0, baslik, ozet, kazanim: string[],
  dersler: [ { baslik, metin /* paragraflar '\n\n' ile; **kalın** destekli */, kartlar?: [k…], board?: [k…], el?: { kartlar, board } } ],
  alistirmalar: [ Soru ],           // 5–12 soru
  gorev: Gorev,
  ozellikler: { koc: 'acik'|'istege'|'kapali', saymaPaneli: bool, outIpucu: bool } }
```
Soru türleri:
```js
{ tur:'secmeli', soru, kartlar?, board?, secenekler: string[], dogru: index, aciklama }
{ tur:'hangisiGuclu', board?, elA: [k…], elB: [k…], dogru: 'A'|'B'|'esit', aciklama }   // board yoksa 5 kartlık eller
{ tur:'enIyi5', kartlar: [7 kart], aciklama }                                              // kullanıcı 5 kart seçer, motor doğrular
{ tur:'outSay', uret: { cekis: 'flos'|'acikUcluSirali'|'icSirali'|'karisik' } }            // UI analiz ile dinamik üretir
{ tur:'oynaAt', el: [k,k], pozisyon, dogru: 'oyna'|'at', aciklama }
{ tur:'potOrani', pot, call, outs, kalanSokak, dogru: 'call'|'fold', aciklama }
{ tur:'sonrakiKart', uret: { soru: 'renk'|'deger'|'resimli' } }                           // ayakkabı modunda dinamik
```
Görev türleri:
```js
{ tur:'quiz', soruSayisi, yildiz: [enAzDogru1, enAzDogru2, enAzDogru3] }
{ tur:'yonlendirmeliEl', hazirKartlar: { insan: [k,k], bot1: [k,k], board: [5] },
  botlar: ['pasifAcemi'], adimlar: [ { sokak, metin, beklenen?: tur } ], yildiz: [1,1,1] }
{ tur:'masa', botlar: [profilId…], baslangicCip, kucukBlind, buyukBlind, desteModu, elSayisi, elSonuKartlariAc?, blindArtis?,
  hedef: { tur: 'cipKazan'|'hayattaKal'|'birinciOl'|'dogruKarar', miktar }, yildiz: [e1,e2,e3], araSorular?: { her: n, tur: 'outSay'|'sonrakiKart' } }
```
İnsan oyuncu id'si her yerde `'sen'`, botlar `'bot1'…'bot5'`.

## js/ilerleme.js
```js
export function ilerlemeYukle()  // localStorage 'poker-okulu-v1' → { seviyeler: { [id]: { yildiz, tamam } }, ayarlar: { ses, koc } }
export function ilerlemeKaydet(ilerleme)
export function seviyeAcikMi(ilerleme, id)  // id 0 hep açık; id n için n-1 en az 1 yıldız
```

## Görsel katman (css/ + docs/TASARIM.md)
Kart DOM: `<div class="kart" data-kart="Ah" data-renk="h"></div>`; arka yüz `<div class="kart kart--arka"></div>`; boş yuva `kart--yuva`. Diğer sınıflar docs/TASARIM.md'de (C yazar, E uyar).

## Test
`npm test` → `node --test "tests/**/*.test.mjs"`. Her modülün kendi `tests/<modul>.test.mjs` dosyası. Rastgelelik testlerde `tohumluRng` ile.
