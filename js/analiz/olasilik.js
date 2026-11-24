// Olasılık hesapları: equity (kesin sayım ya da Monte Carlo), pot oranı, 2-4 kuralı.
// Hızlı yol: degerlendirici.js `puanHesapla` (yalnız puan, açıklama yok).

import { tumKartlar } from '../motor/kart.js';
import { puanHesapla } from '../motor/degerlendirici.js';
import { guvenliRng } from '../motor/rng.js';

function bilinmeyenKartlar(kullanilan) {
  const set = new Set(kullanilan);
  if (set.size !== kullanilan.length) throw new Error('Tekrarlanan kart var');
  return tumKartlar().filter((k) => !set.has(k));
}

// Bir tamamlanmış board için her elin puanını hesaplar, kazananlara pay dağıtır.
// sonuc[i] = { kazanma, beraberlik, pay } toplamları (sayı olarak, oran değil).
function payDagit(puanlar, sonuc) {
  let enIyi = -1, adet = 0;
  for (let i = 0; i < puanlar.length; i++) {
    if (puanlar[i] > enIyi) { enIyi = puanlar[i]; adet = 1; }
    else if (puanlar[i] === enIyi) adet++;
  }
  for (let i = 0; i < puanlar.length; i++) {
    if (puanlar[i] !== enIyi) continue;
    if (adet === 1) { sonuc[i].kazanma++; sonuc[i].pay += 1; }
    else { sonuc[i].beraberlik++; sonuc[i].pay += 1 / adet; }
  }
}

function oranlaFinal(sonuc, toplam) {
  return sonuc.map((s) => ({ kazanma: s.kazanma / toplam, beraberlik: s.beraberlik / toplam, equity: s.pay / toplam }));
}

// eller: [[k,k], …] bilinen eller. Kalan board ≤ 2 kartsa kesin sayım, yoksa Monte Carlo.
export function equity(eller, board = [], { olu = [], iterasyon = 20000, rng } = {}) {
  if (!Array.isArray(eller) || eller.length < 1) throw new Error('En az bir el gerekir');
  if (board.length > 5) throw new Error('Board en fazla 5 kart');
  const kalan = 5 - board.length;
  const kullanilan = [...eller.flat(), ...board, ...olu];
  const deste = bilinmeyenKartlar(kullanilan);
  const n = eller.length;
  const sonuc = eller.map(() => ({ kazanma: 0, beraberlik: 0, pay: 0 }));
  const kartlar7 = eller.map((el) => [...el, ...board, ...new Array(kalan).fill('')]);
  const bs = board.length;
  const puanlar = new Array(n);
  let toplam = 0;

  const degerlendir = () => {
    for (let i = 0; i < n; i++) puanlar[i] = puanHesapla(kartlar7[i]);
    payDagit(puanlar, sonuc);
    toplam++;
  };
  const boardYaz = (j, k) => { for (let i = 0; i < n; i++) kartlar7[i][2 + bs + j] = k; };

  if (kalan === 0) {
    degerlendir();
  } else if (kalan === 1) {
    for (const a of deste) { boardYaz(0, a); degerlendir(); }
  } else if (kalan === 2) {
    for (let i = 0; i < deste.length; i++) {
      boardYaz(0, deste[i]);
      for (let j = i + 1; j < deste.length; j++) { boardYaz(1, deste[j]); degerlendir(); }
    }
  } else {
    const r = rng || guvenliRng();
    const d = deste.slice();
    for (let it = 0; it < iterasyon; it++) {
      // Kısmi Fisher–Yates: yalnız ilk `kalan` kart karılır
      for (let j = 0; j < kalan; j++) {
        const s = j + r.int(d.length - j);
        const t = d[j]; d[j] = d[s]; d[s] = t;
        boardYaz(j, d[j]);
      }
      degerlendir();
    }
  }
  return oranlaFinal(sonuc, toplam);
}

// Tek el, `rakipSayisi` rastgele elli rakibe karşı (rakiplerin kartları bilinmiyor).
export function rastgeleRakibeKarsi(el, board, rakipSayisi, { olu = [], iterasyon = 5000, rng } = {}) {
  if (rakipSayisi < 1) return { kazanma: 1, beraberlik: 0, equity: 1 };
  const kalan = 5 - board.length;
  const deste = bilinmeyenKartlar([...el, ...board, ...olu]);
  const gerek = 2 * rakipSayisi + kalan;
  if (deste.length < gerek) throw new Error('Deste yetmiyor');
  const r = rng || guvenliRng();
  const hero = [...el, ...board, ...new Array(kalan).fill('')];
  const rakipler = [];
  for (let i = 0; i < rakipSayisi; i++) rakipler.push(['', '', ...board, ...new Array(kalan).fill('')]);
  const bs = board.length;
  const d = deste.slice();
  let kazanma = 0, beraberlik = 0, pay = 0;

  for (let it = 0; it < iterasyon; it++) {
    for (let j = 0; j < gerek; j++) {
      const s = j + r.int(d.length - j);
      const t = d[j]; d[j] = d[s]; d[s] = t;
    }
    for (let j = 0; j < kalan; j++) {
      const k = d[j];
      hero[2 + bs + j] = k;
      for (let i = 0; i < rakipSayisi; i++) rakipler[i][2 + bs + j] = k;
    }
    for (let i = 0; i < rakipSayisi; i++) {
      rakipler[i][0] = d[kalan + 2 * i];
      rakipler[i][1] = d[kalan + 2 * i + 1];
    }
    const hp = puanHesapla(hero);
    let enIyiRakip = -1, esit = 0;
    for (let i = 0; i < rakipSayisi; i++) {
      const p = puanHesapla(rakipler[i]);
      if (p > enIyiRakip) { enIyiRakip = p; esit = 1; }
      else if (p === enIyiRakip) esit++;
    }
    if (hp > enIyiRakip) { kazanma++; pay += 1; }
    else if (hp === enIyiRakip) { beraberlik++; pay += 1 / (esit + 1); }
  }
  return { kazanma: kazanma / iterasyon, beraberlik: beraberlik / iterasyon, equity: pay / iterasyon };
}

// Gereken equity = call / (pot + call). `pot` rakip bahsi dahil mevcut pot.
export function potOrani(pot, callMiktari) {
  if (callMiktari <= 0) return 0;
  return callMiktari / (pot + callMiktari);
}

// 2-4 kuralı: yaklaşık yüzde (kalanSokak 1 → ×2, 2 → ×4).
export function kural24(outSayisi, kalanSokak) {
  return outSayisi * (kalanSokak >= 2 ? 4 : 2);
}

// Gerçek olasılık: kalanSokak kart çekilirken en az bir out gelme ihtimali.
export function kesinCekmeOlasiligi(outSayisi, bilinmeyenSayisi, kalanSokak) {
  let olmaz = 1;
  for (let i = 0; i < kalanSokak; i++) {
    olmaz *= Math.max(0, bilinmeyenSayisi - outSayisi - i) / (bilinmeyenSayisi - i);
  }
  return 1 - olmaz;
}
