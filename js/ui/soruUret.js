// Soruları ekrana hazır biçime getirir. Dinamik türler (outSay, sonrakiKart) gerçek bir desteden üretilir.
// DOM'a dokunmaz (Node'da test edilir).
//
// Hazır soru biçimleri:
//   { tur:'secmeli', soru, kartlar?, board?, secenekler, dogru, aciklama, ekKartlar?, kartBoyutu? }
//   { tur:'hangisiGuclu', soru, board?, elA, elB, dogru, aciklama, degerA, degerB }
//   { tur:'enIyi5', soru, kartlar, aciklama }

import { Deste } from '../motor/deste.js';
import { DEGERLER, RENKLER, kartAdi } from '../motor/kart.js';
import { outlariBul } from '../analiz/outs.js';
import { kural24 } from '../analiz/olasilik.js';
import { hangisiGucluCoz, sonrakiKartSorusu, siraliTamamlayanlar, karistir, pozisyonTarifi } from './mantik.js';

function sec(dizi, rng) {
  return dizi[rng.int(dizi.length)];
}

// ---------- outSay ----------

const kart = (v, r) => DEGERLER[v - 2] + r;

function digerRenk(haric, rng) {
  const a = RENKLER.filter((r) => r !== haric);
  return sec(a, rng);
}

// Aday el + flop üret. Döner { el, board } ya da null.
function adayUret(cekis, rng) {
  const tip = cekis === 'karisik' ? sec(['acik', 'ic'], rng) : cekis;
  const flosRengi = cekis === 'flos' || cekis === 'karisik' ? sec(RENKLER, rng) : null;
  let degerler; // 4 değer: çekiş kartları

  if (tip === 'flos') {
    degerler = karistir([...Array(13).keys()].map((i) => i + 2), rng).slice(0, 4);
  } else if (tip === 'acikUcluSirali' || tip === 'acik') {
    const alt = 2 + rng.int(9); // 2..10 → alt..alt+3 (üst ≤ K)
    degerler = [alt, alt + 1, alt + 2, alt + 3];
  } else {
    const alt = 2 + rng.int(9); // pencere alt..alt+4 (üst ≤ A)
    const bosluk = 1 + rng.int(3);
    degerler = [0, 1, 2, 3, 4].filter((i) => i !== bosluk).map((i) => alt + i);
  }
  degerler = karistir(degerler, rng);
  const elD = degerler.slice(0, 2), boardD = degerler.slice(2);

  // Üçüncü board kartı: çekişe karışmayan bir değer
  const yasak = new Set(degerler);
  if (tip !== 'flos') {
    const mn = Math.min(...degerler), mx = Math.max(...degerler);
    for (let v = mn - 2; v <= mx + 2; v++) yasak.add(v);
    if (yasak.has(2) || yasak.has(3)) yasak.add(14);
  }
  const bos = [];
  for (let v = 2; v <= 14; v++) if (!yasak.has(v)) bos.push(v);
  if (!bos.length) return null;
  const ucuncu = sec(bos, rng);

  let el, board;
  if (flosRengi) {
    el = elD.map((v) => kart(v, flosRengi));
    board = [...boardD.map((v) => kart(v, flosRengi)), kart(ucuncu, digerRenk(flosRengi, rng))];
  } else {
    // Renkler: hiçbir renkten 3'ten fazla olmasın (floş çekişi olmasın)
    const renkler = karistir(['s', 'h', 'd', 'c', 's', 'h', 'd', 'c'], rng).slice(0, 5);
    el = elD.map((v, i) => kart(v, renkler[i]));
    board = [...boardD.map((v, i) => kart(v, renkler[2 + i])), kart(ucuncu, renkler[4])];
  }
  return { el, board: karistir(board, rng) };
}

function uygunMu(cekis, el, board) {
  const hepsi = [...el, ...board];
  if (new Set(hepsi).size !== 5) return false;
  if (new Set(hepsi.map((k) => k[0])).size !== 5) return false; // çift yok, temiz soru
  const renkSay = {};
  for (const k of hepsi) renkSay[k[1]] = (renkSay[k[1]] ?? 0) + 1;
  const enCokRenk = Math.max(...Object.values(renkSay));
  const tamamlayan = siraliTamamlayanlar(hepsi).length;
  if (cekis === 'flos') return enCokRenk === 4 && tamamlayan === 0;
  if (cekis === 'acikUcluSirali') return enCokRenk <= 3 && tamamlayan === 2;
  if (cekis === 'icSirali') return enCokRenk <= 3 && tamamlayan === 1;
  if (cekis === 'karisik') return enCokRenk === 4 && tamamlayan >= 1;
  return false;
}

function sayiSecenekleri(dogru, rng) {
  const adaylar = karistir([dogru - 4, dogru - 2, dogru - 1, dogru + 1, dogru + 2, dogru + 3, dogru + 4, dogru * 2], rng)
    .filter((v, i, a) => v > 0 && v !== dogru && v <= 24 && a.indexOf(v) === i);
  const secenek = [dogru, ...adaylar.slice(0, 3)].sort((a, b) => a - b);
  return { secenekler: secenek.map(String), dogru: secenek.indexOf(dogru) };
}

export function outSorusuUret(cekis, rng) {
  const tur = ['flos', 'acikUcluSirali', 'icSirali', 'karisik'].includes(cekis) ? cekis : 'karisik';
  for (let deneme = 0; deneme < 400; deneme++) {
    const aday = adayUret(tur, rng);
    if (!aday || !uygunMu(tur, aday.el, aday.board)) continue;
    const r = outlariBul(aday.el, aday.board);
    if (!r.toplam) continue;
    const { secenekler, dogru } = sayiSecenekleri(r.toplam, rng);
    return {
      tur: 'secmeli',
      soru: `Elinde ${kartAdi(aday.el[0])} ve ${kartAdi(aday.el[1])}. Flop açıldı. Kaç out'un var?`,
      kartlar: aday.el,
      board: aday.board,
      secenekler,
      dogru,
      aciklama: `${r.aciklama} 2-4 kuralıyla iki kart gelecekken yaklaşık %${kural24(r.toplam, 2)}.`,
      ekKartlar: r.kartlar,
      ekEtiket: 'Out\'ların',
    };
  }
  // Çok olası değil; yine de sabit bir soruya düş.
  return {
    tur: 'secmeli', soru: 'Elinde iki kupa, flop\'ta iki kupa daha var. Floşa kaç out\'un var?',
    kartlar: ['Ah', 'Kh'], board: ['Qh', '7h', '2c'], secenekler: ['4', '8', '9', '13'], dogru: 2,
    aciklama: 'Kupa 13 kart, 4\'ünü görüyorsun. 13 − 4 = 9 out.',
  };
}

// ---------- sonrakiKart ----------

// Alıştırma için: ayakkabı modunda bir desteden rastgele sayıda kart "görülmüş" olsun.
export function sonrakiKartAlistirmasi(tip, rng) {
  const deste = new Deste({ mod: 'ayakkabi', rng });
  const n = 6 + rng.int(13); // 6..18
  const gorulen = [];
  for (let i = 0; i < n; i++) gorulen.push(deste.cek());
  const set = new Set(gorulen);
  const bilinmeyen = [];
  for (const d of DEGERLER) for (const r of RENKLER) if (!set.has(d + r)) bilinmeyen.push(d + r);
  return sonrakiKartSorusu({ gorulen, bilinmeyen, tip, rng });
}

// ---------- Hepsini hazırla ----------

// baglam: { rng, sayac? } — sayac verilirse sonrakiKart masadaki gerçek sayımdan üretilir.
export function soruHazirla(soru, { rng, sayac } = {}) {
  switch (soru.tur) {
    case 'secmeli':
      return { ...soru };
    case 'hangisiGuclu': {
      const c = hangisiGucluCoz(soru);
      return {
        ...soru,
        soru: soru.soru ?? (soru.board ? 'Board aynı. Hangi el daha güçlü?' : 'Hangi 5 kartlık el daha güçlü?'),
        dogru: c.dogru,
        degerA: c.a,
        degerB: c.b,
      };
    }
    case 'enIyi5':
      return { ...soru, soru: soru.soru ?? '7 kartın içinden en iyi 5\'li eli seç.' };
    case 'oynaAt':
      return {
        tur: 'secmeli',
        soru: `Pozisyonun ${pozisyonTarifi(soru.pozisyon)}. Bu eli oynar mısın, atar mısın?`,
        kartlar: soru.el,
        kartEtiket: 'Elin',
        secenekler: ['Oyna', 'At (fold)'],
        dogru: soru.dogru === 'oyna' ? 0 : 1,
        aciklama: soru.aciklama,
      };
    case 'potOrani':
      return {
        tur: 'secmeli',
        soru: `Potta ${soru.pot} fiş var, call için ${soru.call} fiş koyman gerekiyor. ${soru.outs} out'un var ve ${soru.kalanSokak === 1 ? '1 kart' : '2 kart'} gelecek. Call mı, fold mu?`,
        secenekler: ['Call', 'Fold'],
        dogru: soru.dogru === 'call' ? 0 : 1,
        aciklama: soru.aciklama,
      };
    case 'outSay':
      return outSorusuUret(soru.uret?.cekis, rng);
    case 'sonrakiKart': {
      const tip = soru.uret?.soru ?? 'renk';
      if (sayac && sayac.gorulen().length >= 4) {
        return sonrakiKartSorusu({ gorulen: sayac.gorulen(), bilinmeyen: sayac.bilinmeyen(), tip, rng });
      }
      return sonrakiKartAlistirmasi(tip, rng);
    }
    default:
      return { tur: 'secmeli', soru: 'Bilinmeyen soru türü.', secenekler: ['Devam'], dogru: 0, aciklama: '' };
  }
}

