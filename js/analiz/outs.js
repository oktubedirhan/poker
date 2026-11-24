// Out bulucu: flop ya da turn'de, elini iyileştiren kalan kartlar.
//
// Kural: bilinmeyen kartlar (52 − el − board − görülen) içinde, kartın gelince
//   1) elin kategorisi yükselir VE
//   2) bu yükselme yalnızca board'dan gelmez (board + o kart tek başına aynı kategoriyi vermez).
// Ders tutarlılığı için sayılan iyileşmeler: floş, sıralı, üçlü ve üstü (set, ful, kare) ve
// hiç çekişi olmayan elde "over kart" eşleşmesi. İki çift ve düşük çift eşleşmeleri out sayılmaz
// (rakibi yenmeye nadiren yeter, "kirli" iyileşmedir). Aynı kart birden çok gruba girebilir
// (örn. floş + sıralı yapan kart); `toplam` her kartı bir kez sayar.

import { tumKartlar, kartDeger } from '../motor/kart.js';
import { KATEGORI } from '../motor/degerlendirici.js';

// Değer kümesinde 5'li sıra var mı? (As hem 14 hem 1)
function siraliVar(deger) {
  const var_ = new Set(deger);
  if (var_.has(14)) var_.add(1);
  for (let ust = 14; ust >= 5; ust--) {
    let tam = true;
    for (let d = ust; d > ust - 5; d--) if (!var_.has(d)) { tam = false; break; }
    if (tam) return true;
  }
  return false;
}

// 0..7 kart için kategori özeti (degerlendirici 5 kart ister, burada 3-4 kartlık board da gerekir).
function ozet(kartlar) {
  const adet = new Array(15).fill(0);
  const renk = { s: [], h: [], d: [], c: [] };
  for (const k of kartlar) {
    const v = kartDeger(k);
    adet[v]++;
    renk[k[1]].push(v);
  }
  let dort = 0, uc = 0, cift = 0;
  for (let v = 2; v <= 14; v++) {
    if (adet[v] === 4) dort++;
    else if (adet[v] === 3) uc++;
    else if (adet[v] === 2) cift++;
  }
  let rank = KATEGORI.YUKSEK;
  if (dort) rank = KATEGORI.DORTLU;
  else if (uc >= 2 || (uc && cift)) rank = KATEGORI.FUL;
  else if (uc) rank = KATEGORI.UCLU;
  else if (cift >= 2) rank = KATEGORI.IKI_CIFT;
  else if (cift === 1) rank = KATEGORI.CIFT;

  const flosRenk = Object.values(renk).find((a) => a.length >= 5);
  const flos = !!flosRenk;
  const sirali = siraliVar(kartlar.map(kartDeger));
  const siraliFlos = flos && siraliVar(flosRenk);
  const tam = siraliFlos ? KATEGORI.SIRALI_FLOS
    : rank === KATEGORI.DORTLU ? KATEGORI.DORTLU
      : rank === KATEGORI.FUL ? KATEGORI.FUL
        : flos ? KATEGORI.FLOS
          : sirali ? KATEGORI.SIRALI
            : rank;
  return { rank, flos, sirali, tam };
}

const ADLAR = {
  flos: 'Floş çekişi',
  iki: 'İki over kart',
  tek: 'Over kart',
  [KATEGORI.UCLU]: 'Üçlü çekişi',
  set: 'Set çekişi',
  [KATEGORI.FUL]: 'Ful çekişi',
  [KATEGORI.DORTLU]: 'Kare çekişi',
};

export function outlariBul(elKartlari, board, { gorulen = [] } = {}) {
  if (!Array.isArray(elKartlari) || elKartlari.length !== 2) throw new Error('El 2 kart olmalı');
  if (!Array.isArray(board) || board.length < 3 || board.length > 5) throw new Error('Board 3-5 kart olmalı');
  const bos = { toplam: 0, kartlar: [], gruplar: [], aciklama: 'Board tamamlandı, çekilecek kart yok.' };
  if (board.length === 5) return bos;

  const bilinen = new Set([...elKartlari, ...board, ...gorulen]);
  const adaylar = tumKartlar().filter((k) => !bilinen.has(k));

  const H = [...elKartlari, ...board];
  const aH = ozet(H);
  const aB = ozet(board);
  const boardMax = Math.max(...board.map(kartDeger));
  const [d1, d2] = elKartlari.map(kartDeger);
  const holeCepCifti = d1 === d2;
  const overDegerler = new Set([d1, d2].filter((d) => d > boardMax));
  const ikiOver = !holeCepCifti && overDegerler.size === 2;

  const flosK = [], siraliK = [], rankK = {}, overK = [];
  for (const k of adaylar) {
    const aN = ozet([...H, k]);
    const aBN = ozet([...board, k]);
    if (!(aN.tam > aH.tam && aN.tam > aBN.tam)) continue;

    if (aN.flos && !aH.flos && !aBN.flos) flosK.push(k);
    if (aN.sirali && !aH.sirali && !aBN.sirali) siraliK.push(k);
    if (aN.rank >= KATEGORI.UCLU && aN.rank > aH.rank && aN.rank > aBN.rank) {
      (rankK[aN.rank] ||= []).push(k);
    }
    if (aH.rank === aB.rank && overDegerler.has(kartDeger(k)) && aN.rank > aH.rank && aN.rank > aBN.rank) {
      overK.push(k);
    }
  }

  const gruplar = [];
  if (flosK.length) gruplar.push({ ad: ADLAR.flos, kartlar: flosK });
  if (siraliK.length) {
    const degerler = new Set(siraliK.map(kartDeger));
    gruplar.push({
      ad: degerler.size === 1 ? 'İç sıralı çekişi (gutshot)' : 'Açık uçlu sıralı çekişi',
      kartlar: siraliK,
    });
  }
  for (const kat of Object.keys(rankK).map(Number).sort((a, b) => a - b)) {
    const ad = kat === KATEGORI.UCLU && holeCepCifti ? ADLAR.set : ADLAR[kat];
    gruplar.push({ ad, kartlar: rankK[kat] });
  }
  // Over kartlar yalnızca başka çekişin olmadığı elde out sayılır (ders: floş/sıralı çekişinde ana çekiş sayılır).
  if (overK.length && !flosK.length && !siraliK.length) {
    gruplar.push({ ad: ikiOver ? ADLAR.iki : ADLAR.tek, kartlar: overK });
  }

  const hepsi = new Set();
  let toplamGrup = 0;
  for (const g of gruplar) {
    toplamGrup += g.kartlar.length;
    for (const k of g.kartlar) hepsi.add(k);
  }
  const kartlar = adaylar.filter((k) => hepsi.has(k)); // deste sırasında

  let aciklama;
  if (kartlar.length === 0) {
    aciklama = 'Belirgin bir out\'un yok.';
  } else {
    aciklama = `${kartlar.length} out: ${gruplar.map((g) => `${g.ad} (${g.kartlar.length})`).join(' + ')}`;
    if (toplamGrup > kartlar.length) {
      aciklama += `. ${toplamGrup - kartlar.length} kart iki gruba birden girdiği için bir kez sayıldı`;
    }
    aciklama += '.';
    if (aB.rank >= KATEGORI.CIFT && (flosK.length || siraliK.length)) {
      aciklama += ' Dikkat: masada çift var, bazı out\'lar rakibe ful verebilir (kirli out).';
    }
  }
  return { toplam: kartlar.length, kartlar, gruplar, aciklama };
}
