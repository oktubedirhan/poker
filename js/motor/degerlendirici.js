// El değerlendirici. 5–7 kart alır, en iyi 5 kartlık eli bulur.
//
// Hız için kartlar önce tam sayı koduna çevrilir: kod = deger * 4 + renkIndeksi.
// Puan = kategori * 16^5 + beş adet 4 bitlik değer (önem sırasına göre). Büyük puan = güçlü el,
// eşit puan = beraberlik. 7 kartta 21 kombinasyonun her biri hızlı 5'li yoldan geçer.

import { DEGERLER, RENKLER, RENK_AD, DEGER_AD } from './kart.js';

export const KATEGORI = {
  YUKSEK: 0, CIFT: 1, IKI_CIFT: 2, UCLU: 3, SIRALI: 4, FLOS: 5, FUL: 6, DORTLU: 7, SIRALI_FLOS: 8, ROYAL: 9,
};
export const KATEGORI_AD = [
  'Yüksek Kart', 'Çift', 'İki Çift', 'Üçlü (Set)', 'Sıralı (Straight)', 'Floş (Flush)',
  'Ful (Full House)', 'Dörtlü (Kare)', 'Sıralı Floş', 'Royal Floş',
];

// --- Kart kodları ---
const KOD = new Map();
for (let d = 0; d < DEGERLER.length; d++) {
  for (let r = 0; r < RENKLER.length; r++) KOD.set(DEGERLER[d] + RENKLER[r], (d + 2) * 4 + r);
}

// A-2-3-4-5 (wheel) bit maskesi
const WHEEL = (1 << 14) | (1 << 5) | (1 << 4) | (1 << 3) | (1 << 2);

// n kart içinden 5'li indeks kombinasyonları (n = 5, 6, 7)
const KOMBOLAR = {};
for (const n of [5, 6, 7]) {
  const liste = [];
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) liste.push([a, b, c, d, e]);
  KOMBOLAR[n] = liste;
}

const sayac = new Int8Array(15); // her değerden kaç tane (tekrar kullanılır, her çağrıda sıfırlanır)

function puanYap(kategori, v1 = 0, v2 = 0, v3 = 0, v4 = 0, v5 = 0) {
  return kategori * 0x100000 + v1 * 0x10000 + v2 * 0x1000 + v3 * 0x100 + v4 * 0x10 + v5;
}

// Hızlı yol: 5 kart kodu → puan.
function puan5(k0, k1, k2, k3, k4) {
  const d0 = k0 >> 2, d1 = k1 >> 2, d2 = k2 >> 2, d3 = k3 >> 2, d4 = k4 >> 2;
  const r = k0 & 3;
  const flos = (k1 & 3) === r && (k2 & 3) === r && (k3 & 3) === r && (k4 & 3) === r;
  const maske = (1 << d0) | (1 << d1) | (1 << d2) | (1 << d3) | (1 << d4);

  // Beş farklı değer: sıralı, floş ya da yüksek kart
  if (d0 !== d1 && d0 !== d2 && d0 !== d3 && d0 !== d4 && d1 !== d2 && d1 !== d3 && d1 !== d4 &&
      d2 !== d3 && d2 !== d4 && d3 !== d4) {
    const enYuksek = 31 - Math.clz32(maske);
    let siraliUst = 0;
    if (maske === (31 << (enYuksek - 4))) siraliUst = enYuksek;
    else if (maske === WHEEL) siraliUst = 5;
    if (siraliUst) {
      if (flos) return puanYap(siraliUst === 14 ? KATEGORI.ROYAL : KATEGORI.SIRALI_FLOS, siraliUst);
      return puanYap(KATEGORI.SIRALI, siraliUst);
    }
    // Değerleri büyükten küçüğe maskeden oku
    let p = 0, m = maske;
    for (let i = 0; i < 5; i++) {
      const v = 31 - Math.clz32(m);
      p = p * 16 + v;
      m ^= 1 << v;
    }
    return (flos ? KATEGORI.FLOS : KATEGORI.YUKSEK) * 0x100000 + p;
  }

  // Tekrarlı değerler: grupları say
  sayac[d0]++; sayac[d1]++; sayac[d2]++; sayac[d3]++; sayac[d4]++;
  let dortlu = 0, uclu = 0, cift1 = 0, cift2 = 0, tekler = 0, tekSayisi = 0;
  for (let v = 14; v >= 2; v--) {
    const s = sayac[v];
    if (s === 0) continue;
    sayac[v] = 0;
    if (s === 4) dortlu = v;
    else if (s === 3) uclu = v;
    else if (s === 2) { if (cift1) cift2 = v; else cift1 = v; }
    else { tekler = tekler * 16 + v; tekSayisi++; }
  }
  if (dortlu) return puanYap(KATEGORI.DORTLU, dortlu, tekler);
  if (uclu && cift1) return puanYap(KATEGORI.FUL, uclu, cift1);
  if (uclu) return KATEGORI.UCLU * 0x100000 + uclu * 0x10000 + tekler * 0x100;
  if (cift2) return puanYap(KATEGORI.IKI_CIFT, cift1, cift2, tekler);
  return KATEGORI.CIFT * 0x100000 + cift1 * 0x10000 + tekler * 0x10;
}

function kodlaraCevir(kartlar) {
  if (!Array.isArray(kartlar) || kartlar.length < 5 || kartlar.length > 7) {
    throw new Error('Değerlendirme için 5–7 kart gerekir');
  }
  const kodlar = new Array(kartlar.length);
  for (let i = 0; i < kartlar.length; i++) {
    const kod = KOD.get(kartlar[i]);
    if (kod === undefined) throw new Error(`Geçersiz kart: ${kartlar[i]}`);
    for (let j = 0; j < i; j++) if (kodlar[j] === kod) throw new Error(`Tekrarlanan kart: ${kartlar[i]}`);
    kodlar[i] = kod;
  }
  return kodlar;
}

function enIyiKombo(kodlar) {
  let enIyi = -1, enIyiIndeks = null;
  for (const [a, b, c, d, e] of KOMBOLAR[kodlar.length]) {
    const p = puan5(kodlar[a], kodlar[b], kodlar[c], kodlar[d], kodlar[e]);
    if (p > enIyi) { enIyi = p; enIyiIndeks = [a, b, c, d, e]; }
  }
  return { puan: enIyi, indeksler: enIyiIndeks };
}

// Yalnız puan (analiz/simülasyon döngüleri için hızlı yol). 5–7 kart.
export function puanHesapla(kartlar) {
  return enIyiKombo(kodlaraCevir(kartlar)).puan;
}

// --- Türkçe açıklama ---
const AD = {};
for (let v = 2; v <= 14; v++) AD[v] = DEGER_AD[DEGERLER[v - 2]];

// '-e kadar' biçimi için yönelme eki (sıralının en yüksek kartı 5..As)
const YONELME = {
  5: "5'e", 6: "6'ya", 7: "7'ye", 8: "8'e", 9: "9'a", 10: "10'a",
  11: "Vale'ye", 12: "Kız'a", 13: "Papaz'a", 14: "As'a",
};

const kodDeger = (k) => KOD.get(k) >> 2;

// En iyi 5 kartı okunuş sırasına diz: büyük grup önce, sonra büyük değer; wheel'de As sona.
function okunusSirasi(kartlar, puan) {
  const adet = {};
  for (const k of kartlar) adet[kodDeger(k)] = (adet[kodDeger(k)] || 0) + 1;
  const sirali = [...kartlar].sort((a, b) => {
    const da = kodDeger(a), db = kodDeger(b);
    return adet[db] - adet[da] || db - da;
  });
  const kategori = Math.floor(puan / 0x100000);
  const siraliMi = kategori === KATEGORI.SIRALI || kategori === KATEGORI.SIRALI_FLOS;
  if (siraliMi && ((puan >> 16) & 15) === 5) sirali.push(sirali.shift()); // As en sona
  return sirali;
}

function aciklamaYap(kategori, puan, kartlar) {
  const v = [(puan >> 16) & 15, (puan >> 12) & 15, (puan >> 8) & 15, (puan >> 4) & 15, puan & 15];
  const renk = RENK_AD[kartlar[0][1]];
  switch (kategori) {
    case KATEGORI.ROYAL: return `${renk} royal floş`;
    case KATEGORI.SIRALI_FLOS: return `${renk} sıralı floş, ${YONELME[v[0]]} kadar`;
    case KATEGORI.DORTLU: return `${AD[v[0]]} dörtlüsü (kare), ${AD[v[1]]} kicker`;
    case KATEGORI.FUL: return `Ful: üç ${AD[v[0]]}, iki ${AD[v[1]]}`;
    case KATEGORI.FLOS: return `${renk} floş, ${AD[v[0]]} yüksek`;
    case KATEGORI.SIRALI: return `${YONELME[v[0]]} kadar sıralı`;
    case KATEGORI.UCLU: return `${AD[v[0]]} üçlüsü, ${AD[v[1]]} kicker`;
    case KATEGORI.IKI_CIFT: return `${AD[v[0]]} ve ${AD[v[1]]} iki çift, ${AD[v[2]]} kicker`;
    case KATEGORI.CIFT: return `${AD[v[0]]} çifti, ${AD[v[1]]} kicker`;
    default: return `${AD[v[0]]} yüksek`;
  }
}

// 5..7 kart → { kategori, ad, puan, enIyi5, aciklama }
export function degerlendir(kartlar) {
  const { puan, indeksler } = enIyiKombo(kodlaraCevir(kartlar));
  const kategori = Math.floor(puan / 0x100000);
  const enIyi5 = okunusSirasi(indeksler.map((i) => kartlar[i]), puan);
  return { kategori, ad: KATEGORI_AD[kategori], puan, enIyi5, aciklama: aciklamaYap(kategori, puan, enIyi5) };
}

export function karsilastir(a, b) {
  return a.puan > b.puan ? 1 : a.puan < b.puan ? -1 : 0;
}

// [{ id, kartlar }] → kazanan id[] (beraberlikte birden çok)
export function kazananlar(eller) {
  let enIyi = -1, sonuc = [];
  for (const { id, kartlar } of eller) {
    const p = puanHesapla(kartlar);
    if (p > enIyi) { enIyi = p; sonuc = [id]; }
    else if (p === enIyi) sonuc.push(id);
  }
  return sonuc;
}
