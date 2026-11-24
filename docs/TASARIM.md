# Poker Okulu: Görsel katman (TASARIM.md)

E ajanı için: JS'in üreteceği her bileşenin tam markup'ı. Canlı örnekler: `onizleme.html` (`npx serve .` ile `/onizleme`; `?tema=dark`, `?dort` parametreleri).
CSS yükleme sırası (index.html'de hazır): `fonts.css, temel.css, kart.css, masa.css, kontroller.css`. Hepsi göreli yoldur.

## Kimlik
- Sayfa kâğıttır (bedirhanoktu.dev "Defter": noktalı ızgara, mürekkep mavisi `--accent`, kiremit `--accent-2`, fosfor `--fosfor`). Masa ve `.kece` yüzeyleri lacivert keçedir; her iki temada aynıdır. Kartlar fiziksel nesnedir, tema değiştirmez.
- Yazı: Fraunces (başlık, rakamlar), Instrument Sans (arayüz), Source Serif 4 (ders metni), JetBrains Mono (yalnız `kbd`).
- Tema: sistem tercihi (`prefers-color-scheme`); `<html data-theme="light|dark">` zorlar. Dört renk: `<html class="dort-renk">` (ya da herhangi bir üst öğe). Hareket azaltma: otomatik.
- Dil: sadece Türkçe; çıplak metin düğümü yeterli, ikon fontu yok. Sembol karakterleri (`♠ ♥ ♦ ♣ ✓ ✕`) CSS'ten gelir.

## Giriş noktası
`index.html` yalnızca `<div class="uygulama">` + `<main id="uygulama">` + üst bar iskeleti taşır. `#uygulama` içine çizin (içindeki `.acilis` yükleniyor ekranını ilk render'da silin). `#ust-araclar` (üst sağ) `.ikon-dugme` düğmelerine ayrılmıştır. Service worker kaydı index.html'de satır içi; `uygulama.js` kaydetmek zorunda değil.

## Kart
```html
<div class="kart" data-kart="Ah" data-renk="h"></div>   <!-- açık yüz -->
<div class="kart kart--arka"></div>                      <!-- arka yüz: data-kart KOYMAYIN -->
<div class="kart kart--yuva" data-etiket="flop"></div>  <!-- boş yuva (data-etiket isteğe bağlı) -->
```
Değer ve sembol `data-kart`'tan CSS ile çıkarılır; ek `<span>` gerekmez. `data-renk` (s/h/d/c) zorunlu değil ama verin (4 renk ve sayma paneli için güvenli).

| Sınıf | Anlam |
|---|---|
| `kart--mini` `--kucuk` `--orta` `--buyuk` | genişlik 28 / 44 / 64 / 88 px. Ya da `style="--kw:52px"` (1em = kart genişliği, tüm iç ölçü orantılı). Üst öğede `--kw` verilirse çocuk kartlar alır |
| `kart--secilebilir` | imleç + hover'da kalkar (düğme gibi kullanılıyorsa `role="button" tabindex="0"` ekleyin) |
| `kart--secili` | kullanıcı seçti (enIyi5, el seçimi): yukarı kalkar, halka |
| `kart--vurgulu` | kazanan 5 kart: altın halka, hafif yükselme |
| `kart--soluk` | kazanana katkısı olmayan / görülen kart: solgun |
| `kart--dagit` | dağıtım animasyonu. `style="--dx:120px;--dy:-200px;--gecikme:150ms"` (başlangıç ofseti, sıra gecikmesi) |
| `kart--cevir` | çevirme animasyonu: önce `kart--arka`'yı kaldırıp `data-kart` ekleyin, sonra `kart--cevir` ekleyin |
| `kart--at` | fold: kart yukarı kayıp söner (bitince DOM'dan kaldırın ya da `kart--soluk` bırakın) |

Sıralar:
```html
<div class="kart-sirasi">…kartlar…</div>                          <!-- yan yana, 0.35rem boşluk -->
<div class="kart-sirasi kart-sirasi--ortusen" style="--kw:64px">…</div>  <!-- el yelpazesi; örtüşme --kw'ye bağlı -->
<div class="kart-sirasi kart-sirasi--sarmal" style="--kw:46px">…</div>   <!-- 13'lü sıralar, alta sarar -->
```
Keçe dışında (kâğıt üzerinde) boş yuva için üst öğeye `.panel` ya da `.kagit-uzeri` verin.

## Masa
```html
<section class="masa" data-oyuncu-sayisi="6" aria-label="Poker masası">
  <div class="masa__merkez">
    <div class="masa__pot"><span class="cip-yigin" data-adet="4" data-deger="25"></span>Pot <b>140</b></div>
    <div class="masa__board">
      <div class="kart" data-kart="Kh" data-renk="h"></div> …3 kart…
      <div class="kart kart--yuva"></div><div class="kart kart--yuva"></div>   <!-- board her zaman 5 öğe -->
    </div>
    <p class="masa__sokak">Flop</p>                       <!-- el bitince: class="masa__sokak masa__sokak--sonuc", metin "Mert kazandı +520" -->
  </div>

  <div class="koltuk koltuk--insan" data-koltuk="0">      <!-- 0 = insan (altta) -->
    <span class="koltuk__eylem">Check</span>             <!-- etiket yuvası; boşken görünmez ama yer tutar -->
    <div class="koltuk__kartlar">
      <div class="kart" data-kart="Ah" data-renk="h"></div><div class="kart" data-kart="Kd" data-renk="d"></div>
    </div>
    <div class="koltuk__kimlik">
      <span class="koltuk__ad">Sen</span><span class="koltuk__cip">960</span>
      <span class="koltuk__rozetler"><span class="rozet rozet--sb">SB</span></span>
    </div>
    <span class="koltuk__bahis"><span class="cip-yigin" data-adet="1" data-deger="5"></span>20</span>
  </div>
  <!-- koltuk 1..5: aynı iskelet, kartlar yerine <div class="kart kart--arka"></div> ×2, "koltuk--insan" yok -->
</section>
```
- `data-oyuncu-sayisi`: 2–6. `data-koltuk`: 0..n-1, saat yönünde (0 altta, 1 sol-alt, …). Koltuk konumu CSS'te hazır; JS konum vermez.
- Koltukta her zaman 2 kart. Boş koltukta (`oyuncuElendi`) `koltuk--elendi` ekleyin, kartları arka bırakın.
- `koltuk__rozetler` içine: `rozet--dealer` ("D"), `rozet--sb` ("SB"), `rozet--bb` ("BB"). Hepsi sadece plaka üzerinde asılıdır; rozeti olmayan koltukta `koltuk__rozetler` hiç eklenmez.
- `koltuk__bahis`: bu sokaktaki bahis; sokak bitince `textContent=''` yapın ya da kaldırın (`:empty` gizler). Fiş yığını isteğe bağlı.
- Fiş: `<span class="cip-yigin" data-adet="1..5" data-deger="1|5|10|25|100|500">`. `data-adet` miktarın büyüklüğüyle orantılı seçilebilir (örn. miktar<50 → 1, <200 → 2, <500 → 3, <1000 → 4, ≥1000 → 5).

Koltuk durumları (`.koltuk`'a sınıf):

| Sınıf | Görünüm |
|---|---|
| `koltuk--sirada` | altın halka + nabız + noktalı ad: sıra bu koltukta (aynı anda bir tane) |
| `koltuk--fold` | kartlar ve plaka solar, gri; bahis topuzu kalır |
| `koltuk--allin` | kiremit halka, çip yanında "all-in" |
| `koltuk--kazanan` | altın plaka (el bitince) |
| `koltuk--elendi` | tamamen solgun |

`koltuk__eylem` bir yuvadır ve tek metin taşır; varyantları: yok (sade: "Check", "Call 20"), `koltuk__eylem--fold` ("Fold"), `koltuk__eylem--agresif` ("Raise 60", "All-in", "Bet 80"), `koltuk__eylem--el` (altın: showdown'da el adı, örn. "Dörtlü (Kare)").

Showdown: kazanan 5 kartı board'da `kart--vurgulu`, diğer board kartlarını `kart--soluk` yapın; kazanan koltuğa `koltuk--kazanan`, `koltuk__eylem--el`'e el adını yazın; `masa__sokak--sonuc` ile özet verin. Rakip kartlarını açmak: `kart--arka`'yı kaldırıp `data-kart` + `kart--cevir`.

## Eylem çubuğu
```html
<div class="eylem-cubugu eylem-cubugu--yapisik" role="group" aria-label="Eylemler">
  <div class="raise-paneli" hidden>                         <!-- Raise/Bet düğmesi açar -->
    <div class="raise-paneli__ust"><span>Bu sokakta toplam bahsin</span><output class="raise-paneli__miktar">80</output></div>
    <input class="kaydirici" type="range" min="40" max="960" step="10" value="80" style="--dolu:8%" aria-label="Raise miktarı">
    <div class="hizli-tutarlar">
      <button class="hizli" type="button">½ pot</button>
      <button class="hizli" type="button" aria-pressed="true">Pot</button>   <!-- seçili hızlı tutar -->
      <button class="hizli" type="button">All-in</button>
    </div>
    <button class="dugme dugme--ikincil" type="button">Raise 80</button>      <!-- onay -->
  </div>
  <div class="eylem-cubugu__butonlar">
    <button class="dugme eylem eylem--fold"  type="button">Fold<kbd>F</kbd></button>
    <button class="dugme eylem eylem--call"  type="button">Call<span class="eylem__tutar">20</span><kbd>C</kbd></button>
    <!-- bedava ise: <button class="dugme eylem eylem--check" …>Check<kbd>C</kbd></button> -->
    <button class="dugme eylem eylem--raise" type="button" aria-expanded="false">Raise<kbd>R</kbd></button>   <!-- bet yoksa metin "Bet" -->
  </div>
</div>
```
- `--dolu` kaydırıcının dolu kısmını yüzde olarak boyar (input olayında `(v-min)/(max-min)*100%` yazın; Firefox'ta gerekmez).
- Sıra bende değilken: kök öğeye `eylem-cubugu--bekle` (düğmeler soluk + tıklanmaz), isteğe bağlı `<p class="eylem-cubugu__durum">Sıra Zeynep'te…</p>` ilk çocuk olarak. Sıra bana gelince sınıfı ve `<p>`'yi kaldırın.
- `kbd` yalnız masaüstü genişliğinde görünür. `eylem-cubugu--yapisik`: telefonda ekran altına yapışır.
- Düğmeyi kapatmak için `disabled` kullanın (örn. check yokken `Check` düğmesini hiç koymayın, call yokken `Call`'u).

## Koç balonu
```html
<aside class="koc koc--giris" data-not="iyi" role="status">   <!-- data-not: iyi | supheli | hata | ipucu -->
  <span class="koc__simge" aria-hidden="true"></span>        <!-- ✓ ! ✕ ? CSS'ten -->
  <div class="koc__govde">
    <h3 class="koc__baslik">İyi karar</h3>
    <p class="koc__mesaj">Floş çekişin var ve pot oranı sana yetiyor. Call doğru.</p>
    <dl class="koc__ayrinti">                                 <!-- isteğe bağlı: koc.js ayrinti alanları -->
      <div><dt>Equity</dt><dd>%36</dd></div><div><dt>Gereken</dt><dd>%25</dd></div><div><dt>Out</dt><dd>9</dd></div>
    </dl>
  </div>
  <button class="ikon-dugme koc__kapat" type="button" aria-label="Notu kapat">✕</button>
</aside>
```
`kararDegerlendir` → `not` değerini `data-not`'a; `ipucu()` → `data-not="ipucu"`. Rastgele sınıf eklemeyin. Giriş animasyonu `koc--giris` (tek seferlik).

## Sayma paneli
```html
<section class="sayma" aria-label="Kart sayma">
  <div class="sayma__baslik"><h3>Görmediğin kartlar</h3><span class="sayma__kalan"><b>36</b> bilinmeyen</span></div>
  <div class="sayma__izgara">
    <div class="sayma__satir" data-renk="s">                  <!-- s, h, d, c sırasıyla 4 satır -->
      <span class="sayma__etiket" aria-hidden="true"></span> <!-- ♠ CSS'ten -->
      <span class="say-hucre" data-kart="2s" data-renk="s"></span>  <!-- 2..A, 13 hücre -->
      <span class="say-hucre say-hucre--goruldu" data-kart="3s" data-renk="s"></span>
      <span class="say-hucre say-hucre--out" data-kart="As" data-renk="s"></span>
    </div>
  </div>
  <div class="sayma__dagilim">                                <!-- bilinmeyenlerde renk dağılımı -->
    <div class="dagilim" data-renk="s"><span class="dagilim__etiket">10</span><span class="dagilim__cubuk" style="--oran:.77"></span></div>
    <!-- h, d, c aynı şekilde; --oran = o renkten kalan / 13 -->
  </div>
</section>
```
Hücre durumları: `say-hucre--goruldu` (görüldü, üstü çizili), `say-hucre--out` (koç out'u gösteriyor). Sayma masada `saymaPaneli:true` seviyelerde, masanın altına/yanına konur.

## Ders ekranı
```html
<div class="ders">
  <div class="ders__ust"><span>Seviye 1: El sıralaması</span><span>Ders 2 / 4</span></div>
  <article class="ders__kart">
    <h2 class="ders__baslik">Floş, sıralıdan güçlüdür</h2>
    <div class="ders__gorsel kece">                            <!-- kartlar/board/el varsa; yoksa hiç koymayın -->
      <div class="kart-sirasi" style="--kw:52px"><div class="kart" …></div>…</div>
      <p class="ders__gorsel-etiket">Aynı renkten beş kart: floş</p>
    </div>
    <div class="ders__metin">
      <p>Paragraf; <strong>kalın</strong> terimler fosfor kalemle işaretlenir.</p>   <!-- '\n\n' → <p>, **x** → <strong> -->
    </div>
    <nav class="ders__gezinti" aria-label="Ders gezintisi">
      <button class="dugme" type="button">Geri</button>
      <div class="noktalar" role="img" aria-label="2. ders, toplam 4">
        <span class="nokta nokta--bitti"></span><span class="nokta" aria-current="step"></span><span class="nokta"></span><span class="nokta"></span>
      </div>
      <button class="dugme dugme--birincil" type="button">İleri</button>       <!-- son derste metin "Alıştırmalara geç" -->
    </nav>
  </article>
</div>
```
Ders metnine HTML enjekte ederken `textContent` kullanıp yalnız `**…**` kalıbını `<strong>`'a çevirin; ham HTML yazmayın.

## Soru (quiz)
```html
<section class="soru">
  <div class="soru__ust"><span>Soru 3 / 8</span><div class="ilerleme"><div class="ilerleme__dolu" style="width:37%"></div></div></div>
  <h3 class="soru__metin">Elinde kupa A, kupa 9; board'da iki kupa var. Kaç out'un var?</h3>
  <div class="soru__gorsel kece">                              <!-- kartlar/board varsa -->
    <div class="kart-sirasi"><div class="kart" …></div>…</div><p class="ders__gorsel-etiket">Board</p>
  </div>

  <!-- secmeli / oynaAt / potOrani / outSay -->
  <div class="secenekler" role="radiogroup" aria-label="Seçenekler">
    <button class="secenek" type="button" role="radio" aria-checked="false"><span class="secenek__harf">A</span><span>4</span></button>
    …
  </div>

  <!-- hangisiGuclu -->
  <div class="karsilastirma">
    <button class="el-secenek" type="button"><span>A</span><span class="kart-sirasi">…2 kart…</span></button>
    <button class="el-secenek" type="button"><span>B</span><span class="kart-sirasi">…</span></button>
    <button class="dugme karsilastirma__esit" type="button">Eşit</button>
  </div>

  <div class="geri-bildirim" role="status"><strong>Doğru.</strong>Açıklama metni.</div>   <!-- yanlışta: class="geri-bildirim geri-bildirim--yanlis", <strong>Yanlış.</strong> -->
  <div class="soru__alt"><button class="dugme dugme--birincil" type="button">Sonraki soru</button></div>
</section>
```
Cevap sonrası durum sınıfları (hem `.secenek` hem `.el-secenek`): `--secili` (işaretlendi, henüz gönderilmedi), `--dogru`, `--yanlis`; diğer seçeneklere `secenek--soluk`; hepsine `disabled`. Doğru seçenekte ✓, yanlışta ✕ simgesi CSS'ten gelir. `enIyi5`: 7 kartı `kart--secilebilir` yapın, seçileni `kart--secili`; sonuçta 5 doğru kart `kart--vurgulu`, diğer ikisi `kart--soluk`.

## Seviye haritası
```html
<section class="karsilama"><h1>Merhaba, nerede kalmıştık?</h1><p>…</p></section>
<ol class="harita">
  <li class="harita__satir">                                    <!-- kilitliyse: class="harita__satir harita__satir--kilitli" -->
    <button class="dugum dugum--tamam" type="button" aria-label="Seviye 0: Deste, tamamlandı, 3 yıldız"><span class="dugum__no">0</span></button>
    <div class="harita__bilgi">
      <h3 class="harita__ad">Deste</h3>
      <p class="harita__ozet">52 kart, dört renk, değerler.</p>
      <span class="yildizlar" role="img" aria-label="3 yıldız">
        <span class="yildiz yildiz--dolu"></span><span class="yildiz yildiz--dolu"></span><span class="yildiz yildiz--dolu"></span>
      </span>
    </div>
  </li>
</ol>
```
Düğüm durumları: `dugum--tamam` (dolu mavi), `dugum--acik` (sıradaki; nabız halkası; ya da bir yıldız almış açık seviye için sade çerçeve), `dugum--kilitli` (kesik çerçeve, `disabled`). Final seviye (10): ek `dugum--final`. 11 `<li>` her zaman; sıra 0..10.

## Yıldızlar ve sonuç ekranı
```html
<span class="yildizlar" role="img" aria-label="2 yıldız"><span class="yildiz yildiz--dolu"></span><span class="yildiz yildiz--dolu"></span><span class="yildiz"></span></span>
<!-- büyük + giriş animasyonu: class="yildizlar yildizlar--buyuk"; her .yildiz'e style="--s:0|1|2" (sıralı patlama) -->

<div class="modal" role="dialog" aria-modal="true" aria-labelledby="sonuc-baslik">
  <div class="modal__perde"></div>
  <div class="modal__kutu sonuc">
    <span class="yildizlar yildizlar--buyuk" role="img" aria-label="2 yıldız">…</span>
    <h2 class="sonuc__baslik" id="sonuc-baslik">Seviye 2 tamam</h2>
    <p class="sonuc__ozet">8 sorudan 7'sini doğru yaptın.</p>
    <dl class="sonuc__istatistik"><div><dt>Doğru</dt><dd>7/8</dd></div><div><dt>Süre</dt><dd>3:20</dd></div><div><dt>Yıldız</dt><dd>2</dd></div></dl>
    <div class="sonuc__butonlar">
      <button class="dugme dugme--birincil" type="button">Sıradaki seviye</button>
      <button class="dugme" type="button">Tekrar dene</button>
      <button class="dugme dugme--sade" type="button">Haritaya dön</button>
    </div>
  </div>
</div>
```
Modal açılınca odağı kutudaki ilk düğmeye taşıyın, Esc ile kapatın (JS işi; CSS yalnız görünüm).

## Küçük bileşenler
```html
<button class="dugme">İkincil</button>
<button class="dugme dugme--birincil">Birincil</button>       <!-- mavi -->
<button class="dugme dugme--ikincil">Vurgu</button>           <!-- kiremit -->
<button class="dugme dugme--sade">Sade</button>
<button class="dugme dugme--kucuk">Küçük</button>
<button class="ikon-dugme" aria-label="Ayarlar" aria-pressed="false">⚙</button>
<label class="anahtar"><input type="checkbox"><span class="anahtar__ray"></span>Koçu göster</label>
<div class="panel"><div class="panel__baslik"><h2>Başlık</h2></div>…</div>
<div class="bildirim" role="status">Deste karıldı: sayma sıfırlandı</div>   <!-- fixed, altta ortada; 3 sn sonra kaldırın -->
<div class="ilerleme"><div class="ilerleme__dolu" style="width:40%"></div></div>
<span class="gorunmez">yalnız ekran okuyucu</span>
```

## Sınıf adı kuralları
Hepsi Türkçe ASCII, BEM benzeri: `blok`, `blok__oge`, `blok--durum`. Veri öznitelikleri: `data-kart`, `data-renk`, `data-oyuncu-sayisi`, `data-koltuk`, `data-not`, `data-adet`, `data-deger`, `data-etiket`. Her duruma özgü sınıfı JS ekler/kaldırır; inline stil yalnızca `--kw`, `--dx/--dy/--gecikme`, `--dolu`, `--oran`, `--s` ve `width` (ilerleme) için.

## Erişilebilirlik notları (CSS tarafı hazır, JS'e düşenler)
- Odak halkası her yerde (`:focus-visible`), keçe üstünde altın. En küçük dokunma hedefi 48px.
- Durum rengi tek başına bilgi taşımaz: koç simgeleri (✓ ! ✕ ?), doğru/yanlış simgeleri, sıra göstergesindeki nokta, fold'daki metin etiketi.
- Kartlara ekran okuyucu için `aria-label="Kupa As"` (ve `role="img"`) ekleyin: `kartAdi(k)`. Kapalı kartlara `aria-label="Kapalı kart"`.
- Hareket: `prefers-reduced-motion` tüm animasyonları kapatır; JS'te `setTimeout` ile bekleyen akışlar animasyon bitişine değil olaylara bağlı olmalı.
