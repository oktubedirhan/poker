// Bot-bot simülasyon ve QA koşucusu.
// Kullanım: node scripts/simulasyon.mjs <elSayisi> [tohum]
// Tohum aynıysa koşu birebir tekrarlanır. Masalar tohumdan türetilir.
// Çıkış kodu: ihlal (istisna dahil) varsa 1.

import { performance } from 'node:perf_hooks';
import { Oyun } from '../js/motor/oyun.js';
import { tohumluRng } from '../js/motor/rng.js';
import { botKarar } from '../js/botlar/bot.js';
import { PROFILLER } from '../js/botlar/profiller.js';

const PROFIL_IDLERI = ['pasifAcemi', 'sikiPasif', 'gevsekAgresif', 'blofcu', 'akilli'];
const BASLANGIC_CIP = 1000;
const KUCUK_BLIND = 10;
const BUYUK_BLIND = 20;
const MASA_EL_LIMITI = 400;      // bir masada en fazla bu kadar el (çok uzayan masaları keser; ihlal değildir)
const EL_ICI_ADIM_LIMITI = 500;  // bir elde en fazla bu kadar eylem (takılma tespiti)
const ORNEK_LIMITI = 3;
const YAKMA_BEKLENEN = { 0: 0, 3: 1, 4: 2, 5: 3 }; // board uzunluğu → yakılması gereken kart sayısı

const args = process.argv.slice(2);
const elSayisi = Number(args[0]);
const tohum = args[1] !== undefined ? Number(args[1]) : 1;
if (!Number.isInteger(elSayisi) || elSayisi <= 0 || !Number.isInteger(tohum)) {
  console.error('Kullanım: node scripts/simulasyon.mjs <elSayisi> [tohum]');
  process.exit(2);
}

// ---------- Sayaçlar ----------

const ihlal = {
  cip: 0, negatif: 0, deste: 0, kart_tekrar: 0, yakma: 0, ayakkabi: 0,
  sizinti: 0, acik_kart: 0, takilma: 0, istisna: 0,
};
const ornekler = [];
let toplamIhlal = 0;

function ihlalKaydet(tur, mesaj, bag) {
  ihlal[tur]++;
  toplamIhlal++;
  if (ornekler.length < ORNEK_LIMITI) ornekler.push({ tur, mesaj, ...bag });
}

const profilPot = Object.fromEntries(PROFIL_IDLERI.map((p) => [p, 0]));
const profilEl = Object.fromEntries(PROFIL_IDLERI.map((p) => [p, 0])); // koltuk-el sayısı
let toplamPot = 0;
let showdownEl = 0;
let tamamlananEl = 0;
let elSureToplamMs = 0;
let masaSayisi = 0;
let masaLimitKesilen = 0;
let masaBitenSayisi = 0;
const masaDesteModu = { elBasi: 0, ayakkabi: 0 };

// ---------- Kontroller ----------

// Oyuncunun görünümünde başkasının açık kartı ya da başkasına ait dağıtım olayı var mı (el sürerken).
function eldeSizintiVar(g, id) {
  for (const o of g.oyuncular) {
    if (o.id !== id && o.acikKartlar) return `${o.id} kartları açık, ${id} görünümünde (el sürerken)`;
  }
  for (const ev of g.gecmis) {
    if (ev.tur === 'kartDagitildi' && ev.oyuncuId !== id && ev.kartlar) {
      return `${ev.oyuncuId} kartDagitildi olayı ${id} görünümünde açık`;
    }
  }
  return null;
}

// El bitince: showdown/kartlarAcildi ile açılmış olmayan kartlar sızmış mı.
function elSonuSizintiVar(oyun, id) {
  const g = oyun.gorunum(id);
  const acilanlar = new Set();
  for (const ev of g.gecmis) {
    if (ev.tur === 'showdown') ev.acilanlar.forEach((a) => acilanlar.add(a.oyuncuId));
    if (ev.tur === 'kartlarAcildi') ev.eller.forEach((a) => acilanlar.add(a.oyuncuId));
    if (ev.tur === 'kartDagitildi' && ev.oyuncuId !== id && ev.kartlar) {
      return `${ev.oyuncuId} kartDagitildi olayı ${id} görünümünde açık (el sonu)`;
    }
  }
  for (const o of g.oyuncular) {
    if (o.id !== id && o.acikKartlar && !acilanlar.has(o.id)) {
      return `${o.id} kartları açılmamışken ${id} görünümünde açık (el sonu)`;
    }
  }
  return null;
}

// ---------- El ve masa ----------

function eliOynat(oyun, ctx) {
  const { masaToplam, profiller, botRng, bag, desteModu } = ctx;

  const aktifSayi = oyun.oyuncular.filter((p) => p.cip > 0).length;
  const gerekenKart = 2 * aktifSayi + 5 + 3;
  const kalanOnce = oyun.deste.kalanSayisi();
  const karistirmaOnce = oyun.deste.karistirmaSayisi;

  // Yakılanlar ayakkabı modunda karıştırmadan karıştırmaya birikir; yalnız bu elin yakmalarını sayarız.
  const yakilanOnce = oyun.deste.yakilanlar().length;
  const t0 = performance.now();
  oyun.yeniEl();
  const karildi = oyun.deste.karistirmaSayisi - karistirmaOnce;
  const yakmaBaslangic = karildi ? 0 : yakilanOnce;

  // Deste modu mantığı: elBasi her elde karar; ayakkabı yalnız kart yetmezse.
  if (desteModu === 'elBasi' && karildi !== 1) {
    ihlalKaydet('deste', `elBasi modunda el başında karıştırma ${karildi} kez`, bag);
  }
  if (desteModu === 'ayakkabi') {
    if (karildi === 1 && kalanOnce >= gerekenKart) {
      ihlalKaydet('ayakkabi', `gereksiz karıştırma: kalan ${kalanOnce}, gereken ${gerekenKart}`, bag);
    }
    if (karildi === 0 && kalanOnce < gerekenKart) {
      ihlalKaydet('ayakkabi', `kart yetmedi ama karıştırılmadı: kalan ${kalanOnce}, gereken ${gerekenKart}`, bag);
    }
  }
  const kalanSimdi = oyun.deste.kalanSayisi();
  if (kalanSimdi < 0 || kalanSimdi > 52) ihlalKaydet('ayakkabi', `kalan kart aralık dışı: ${kalanSimdi}`, bag);

  let adim = 0;
  while (!oyun.elBittiMi()) {
    if (++adim > EL_ICI_ADIM_LIMITI) {
      ihlalKaydet('takilma', `el ${EL_ICI_ADIM_LIMITI} eylemde bitmedi`, bag);
      return 'takilma';
    }
    const id = oyun.siradaki();
    if (id === null) {
      ihlalKaydet('takilma', 'el aktif ama sırada oyuncu yok', bag);
      return 'takilma';
    }
    const g = oyun.gorunum(id);
    const gecerli = oyun.gecerliEylemler(id);

    const topCip = oyun.oyuncular.reduce((t, p) => t + p.cip, 0);
    if (topCip + g.potToplam !== masaToplam) {
      ihlalKaydet('cip', `el içi toplam ${topCip + g.potToplam} ≠ ${masaToplam}`, bag);
    }
    const sizinti = eldeSizintiVar(g, id);
    if (sizinti) ihlalKaydet('sizinti', sizinti, bag);

    const karar = botKarar(profiller[id], g, gecerli, { rng: botRng });
    oyun.eylem(id, karar);
  }

  const sure = performance.now() - t0;
  elSureToplamMs += sure;
  tamamlananEl++;

  // El sonu kontroller
  const toplam = oyun.oyuncular.reduce((t, p) => t + p.cip, 0);
  if (toplam !== masaToplam) ihlalKaydet('cip', `el sonu toplam ${toplam} ≠ ${masaToplam}`, bag);
  if (oyun.oyuncular.some((p) => p.cip < 0)) ihlalKaydet('negatif', 'negatif çip', bag);

  try {
    oyun.deste.dogrula();
  } catch (e) {
    ihlalKaydet('deste', `dogrula: ${e.message}`, bag);
  }

  const dagitilan = oyun.oyuncular.flatMap((p) => p.kartlar ?? []);
  const yakilanBuEl = oyun.deste.yakilanlar().slice(yakmaBaslangic);
  const liste = [...dagitilan, ...oyun.board, ...yakilanBuEl];
  if (new Set(liste).size !== liste.length) {
    ihlalKaydet('kart_tekrar', `tekrarlı kart: ${liste.join(' ')}`, bag);
  }
  if (yakilanBuEl.length !== YAKMA_BEKLENEN[oyun.board.length]) {
    ihlalKaydet('yakma', `board ${oyun.board.length} kart, bu elde ${yakilanBuEl.length} yakma`, bag);
  }

  for (const p of oyun.oyuncular) {
    if (p.acikKartlar && p.kartlar && p.acikKartlar.some((k) => !p.kartlar.includes(k))) {
      ihlalKaydet('acik_kart', `${p.id} açık kartları elinden farklı`, bag);
    }
  }
  for (const p of oyun.oyuncular) {
    const sz = elSonuSizintiVar(oyun, p.id);
    if (sz) ihlalKaydet('sizinti', sz, bag);
  }

  // Profil istatistikleri
  for (const p of oyun.oyuncular) {
    if (p.kartlar) profilEl[profiller[p.id]]++;
  }
  const gecmis = oyun.gorunum(oyun.oyuncular[0].id).gecmis;
  let elShowdown = false;
  for (const ev of gecmis) {
    if (ev.tur === 'showdown') elShowdown = true;
    if (ev.tur === 'potKazanildi') {
      toplamPot += ev.miktar;
      const pay = ev.miktar / ev.kazananlar.length;
      for (const kid of ev.kazananlar) profilPot[profiller[kid]] += pay;
    }
  }
  if (elShowdown) showdownEl++;
  return 'tamam';
}

function masaCalistir(masaTohum, masaNo, elSayac) {
  const kr = tohumluRng(masaTohum ^ 0x9e3779b9);
  const deskRng = tohumluRng(masaTohum ^ 0x27d4eb2d);
  const botRng = tohumluRng(masaTohum ^ 0x85ebca6b);

  const n = 2 + kr.int(5);
  const profiller = {};
  const oyuncular = [];
  for (let i = 1; i <= n; i++) {
    const id = `bot${i}`;
    const pid = PROFIL_IDLERI[kr.int(PROFIL_IDLERI.length)];
    profiller[id] = pid;
    oyuncular.push({ id, ad: PROFILLER[pid].ad, cip: BASLANGIC_CIP, bot: pid });
  }
  const desteModu = masaNo % 2 === 1 ? 'elBasi' : 'ayakkabi';
  const blindArtis = masaNo % 3 === 0 ? { herElde: 15, carpan: 1.3 } : null;
  const elSonuKartlariAc = masaNo % 4 === 1;
  masaDesteModu[desteModu]++;

  const oyun = new Oyun({
    oyuncular, kucukBlind: KUCUK_BLIND, buyukBlind: BUYUK_BLIND,
    desteModu, rng: deskRng, elSonuKartlariAc, blindArtis,
  });
  const masaToplam = n * BASLANGIC_CIP;
  const bag = { anaTohum: tohum, masaTohumu: masaTohum, masaNo, elNo: elSayac };
  const ctx = { masaToplam, profiller, botRng, bag, desteModu };

  let masaEl = 0;
  masaSayisi++;
  try {
    while (!oyun.oyunBittiMi() && elSayac.v < elSayisi) {
      if (masaEl >= MASA_EL_LIMITI) { masaLimitKesilen++; return; }
      elSayac.v++;
      masaEl++;
      ctx.bag = { ...bag, elNo: elSayac.v };
      const sonuc = eliOynat(oyun, { ...ctx, bag: ctx.bag });
      if (sonuc !== 'tamam') return;
    }
    if (oyun.oyunBittiMi()) masaBitenSayisi++;
  } catch (e) {
    ihlalKaydet('istisna', e.message, { ...bag, elNo: elSayac.v });
  }
}

// ---------- Ana döngü ----------

const baslangic = performance.now();
const ana = tohumluRng(tohum);
const sayac = { v: 0 };
while (sayac.v < elSayisi) {
  const masaTohum = ana.int(4294967296);
  masaCalistir(masaTohum, masaSayisi + 1, sayac);
}
const sureSn = (performance.now() - baslangic) / 1000;

// ---------- Rapor ----------

const yuzde = (x) => `${(x * 100).toFixed(1)}%`;
const toplamPotGercek = toplamPot || 1;
const profilSatirlari = PROFIL_IDLERI.map((p) => {
  const pay = profilPot[p] / toplamPotGercek;
  return `  ${PROFILLER[p].ad.padEnd(14)} pot payı ${yuzde(pay)}  (koltuk-el: ${profilEl[p]})`;
});

console.log(`Poker simülasyonu — tohum ${tohum}, hedef ${elSayisi} el`);
console.log(`El: ${tamamlananEl} tamamlandı | Masa: ${masaSayisi} (biten: ${masaBitenSayisi}, ${MASA_EL_LIMITI} el sınırında kesilen: ${masaLimitKesilen}) | Süre: ${sureSn.toFixed(1)} sn`);
console.log(`Masa deste modu: elBasi ${masaDesteModu.elBasi}, ayakkabı ${masaDesteModu.ayakkabi}`);
console.log(`Ortalama el süresi: ${(elSureToplamMs / Math.max(1, tamamlananEl)).toFixed(2)} ms`);
console.log(`Showdown oranı: ${yuzde(showdownEl / Math.max(1, tamamlananEl))} (${showdownEl}/${tamamlananEl})`);
console.log('İhlaller:');
for (const [tur, sayi] of Object.entries(ihlal)) console.log(`  ${tur.padEnd(12)} ${sayi}`);
console.log('Profil başına kazanılan pot oranı (toplam pot içinde):');
console.log(profilSatirlari.join('\n'));

if (ornekler.length > 0) {
  console.log('İlk ihlaller (tekrar için: node scripts/simulasyon.mjs ' + elSayisi + ' ' + tohum + '):');
  for (const o of ornekler) {
    console.log(`  [${o.tur}] el ${o.elNo}, masa ${o.masaNo} (masa tohumu ${o.masaTohumu}): ${o.mesaj}`);
  }
}

process.exitCode = toplamIhlal > 0 ? 1 : 0;
