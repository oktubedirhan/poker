// Bot karar motoru. Bot YALNIZCA `gorunum` (kendi görebildiği durum) ve `gecerli` (geçerli eylemler)
// ile karar verir; Oyun nesnesine, başkalarının kartlarına ya da destenin sırasına erişimi yoktur.
// Dönen eylem her zaman `gecerli` içindeki bir eylemdir (bet/raise miktarı min..max, tam sayı).

import { kartDeger } from '../motor/kart.js';
import { degerlendir, KATEGORI } from '../motor/degerlendirici.js';
import { guvenliRng } from '../motor/rng.js';
import { rastgeleRakibeKarsi, potOrani } from '../analiz/olasilik.js';
import { outlariBul } from '../analiz/outs.js';
import { chenPuani } from '../analiz/koc.js';
import { PROFILLER } from './profiller.js';

const sans = (rng, p) => p > 0 && rng.int(1000) < Math.round(p * 1000);

// ---------- Bağlam ----------

function baglamCikar(gorunum, gecerli) {
  const ben = gorunum.oyuncular.find((o) => o.id === gorunum.benimId);
  const rakipler = gorunum.oyuncular.filter((o) => o.id !== gorunum.benimId && o.oturuyor && !o.dusuk);
  const bb = gorunum.buyukBlind ?? 1;
  return {
    el: gorunum.benimKartlarim,
    board: gorunum.board,
    sokak: gorunum.sokak,
    poz: ben?.pozisyon ?? 'MP',
    cip: ben?.cip ?? 0,
    benimBahis: ben?.bahis ?? 0,
    cagri: gecerli.call ?? 0,
    pot: gorunum.potToplam,
    mevcut: gorunum.mevcutBahis,
    bb,
    rakipSayisi: Math.max(1, rakipler.length),
    yukseltildi: gorunum.sokak === 'preflop' && gorunum.mevcutBahis > bb,
  };
}

// ---------- El gücü (postflop, 0..1) ----------

// Hızlı sezgisel güç: made hand + çekiş. Rakip aralığı hesaba katılmaz (basit botlar için yeterli).
export function elGucu(el, board) {
  const [h1, h2] = el.map(kartDeger);
  const deger = degerlendir([...el, ...board]);
  const vals = board.map(kartDeger).sort((a, b) => b - a);
  const enYuksek = Math.max(h1, h2);
  const cepCifti = h1 === h2;
  const uzerinde = (r) => r === h1 || r === h2;
  const e5 = deger.enIyi5.map(kartDeger);
  let g;

  switch (deger.kategori) {
    case KATEGORI.YUKSEK:
      g = enYuksek === 14 ? 0.16 : enYuksek === 13 ? 0.12 : 0.06;
      break;
    case KATEGORI.CIFT: {
      const r = e5[0];
      if (!uzerinde(r)) g = 0.1 + (enYuksek === 14 ? 0.06 : 0); // çift board'da
      else if (cepCifti) g = r > vals[0] ? (r >= 13 ? 0.7 : 0.62) : r > vals[1] ? 0.45 : 0.3;
      else g = r === vals[0] ? 0.5 + (Math.max(h1, h2) === r && Math.min(h1, h2) >= 12 ? 0.07 : 0) : r === vals[1] ? 0.36 : 0.26;
      break;
    }
    case KATEGORI.IKI_CIFT: {
      const kullanilan = [e5[0], e5[2]].filter(uzerinde).length;
      g = kullanilan === 2 ? 0.72 : kullanilan === 1 ? (cepCifti ? 0.6 : 0.5) : 0.1;
      break;
    }
    case KATEGORI.UCLU:
      g = uzerinde(e5[0]) ? (cepCifti ? 0.85 : 0.78) : 0.12;
      break;
    default: // sıralı, floş ve üstü
      g = deger.kategori >= KATEGORI.FUL ? 0.95 : 0.88;
      // Board'un kendisi aynı eli veriyorsa el bize katkı yapmıyor
      if (board.length === 5 && degerlendir(board).puan === deger.puan) g = 0.2;
  }

  if (board.length < 5 && deger.kategori < KATEGORI.SIRALI) {
    const outs = outlariBul(el, board).toplam;
    if (outs >= 8) g = Math.max(g, 0.36 + 0.01 * (outs - 8));
    else if (outs >= 4) g += 0.05;
  }
  return Math.min(1, g);
}

// ---------- Eylemi geçerliye çevir ----------

function geriDus(g) {
  if (g.check) return { tur: 'check' };
  if (g.call !== null) return { tur: 'call' };
  return { tur: 'fold' };
}

// niyet: { tur, hedef? } → gecerli içinden geçerli eylem
function gecerliyeCevir(niyet, g) {
  switch (niyet.tur) {
    case 'fold':
      return g.check ? { tur: 'check' } : { tur: 'fold' };
    case 'check':
      return g.check ? { tur: 'check' } : g.fold ? { tur: 'fold' } : geriDus(g);
    case 'call':
      return geriDus(g);
    case 'allin':
      return g.allin ? { tur: 'allin' } : geriDus(g);
    case 'bet':
    case 'raise': {
      const aralik = g.bet || g.raise;
      if (!aralik) return g.allin && g.allin > (g.call ?? 0) ? { tur: 'allin' } : geriDus(g);
      const hedef = Math.min(aralik.max, Math.max(aralik.min, Math.round(niyet.hedef)));
      if (hedef >= aralik.max && g.allin) return { tur: 'allin' };
      return { tur: g.bet ? 'bet' : 'raise', miktar: hedef };
    }
    default:
      return geriDus(g);
  }
}

// Bahis büyüklüğü: potun `oran` katı. Bahis yoksa pot'a göre; bahse karşıysa call sonrası pot'a göre raise.
function hedefHesapla(c, oran) {
  if (c.mevcut === 0) return Math.round(oran * c.pot);
  return c.mevcut + Math.round(oran * (c.pot + c.cagri));
}

// ---------- Preflop (tüm profiller) ----------

function pozisyonAyari(poz, rakipSayisi) {
  if (rakipSayisi === 1) return poz === 'BTN' ? -2 : -1; // heads-up: herkes geniş oynar
  switch (poz) {
    case 'UTG': return 1.5;
    case 'MP': return 0.5;
    case 'CO': return -1;
    case 'BTN': return -2;
    case 'SB': return -1;
    case 'BB': return -1.5;
    default: return 0;
  }
}

function preflopKarar(pr, c, rng) {
  const pp = pr.params.preflop;
  const chen = chenPuani(c.el);
  const esik = pp.esik + pp.pozEtki * pozisyonAyari(c.poz, c.rakipSayisi);
  const bedava = c.cagri === 0;
  const kisaStack = c.cip <= 10 * c.bb;
  const rais = (hedef) => (kisaStack ? { tur: 'allin' } : { tur: 'raise', hedef });

  if (!c.yukseltildi) {
    if (chen >= esik) {
      if (chen >= pp.raiseSkor && sans(rng, pp.raiseOran)) return rais(pp.boyut * c.bb);
      return bedava ? { tur: 'check' } : { tur: 'call' };
    }
    if (bedava) return { tur: 'check' };
    const gec = c.poz === 'BTN' || c.poz === 'CO' || c.poz === 'SB';
    if (gec && sans(rng, pp.steal)) return rais(pp.boyut * c.bb);
    return { tur: 'fold' };
  }

  const gerekli = esik + pp.raiseKorku * (c.mevcut / c.bb - 1);
  if (chen >= pp.yenidenRaiseSkor && sans(rng, pp.yenidenRaiseOran)) return rais(3 * c.mevcut);
  if (chen >= gerekli) return { tur: 'call' };
  return { tur: 'fold' };
}

// ---------- Postflop: parametreli basit profiller ----------

function postflopGenel(pr, c, rng) {
  const pp = pr.params.postflop;
  const g = elGucu(c.el, c.board);
  const sinif = g >= 0.65 ? 'guclu' : g >= 0.35 ? 'orta' : 'zayif';
  const gerek = potOrani(c.pot, c.cagri);

  if (c.cagri === 0) {
    let p = pp[sinif].bet;
    if (sinif === 'zayif' && (c.sokak === 'turn' || c.sokak === 'river')) p = Math.max(p, pp.blof[c.sokak]);
    if (sans(rng, p)) return { tur: 'bet', hedef: hedefHesapla(c, pp.boyut) };
    return { tur: 'check' };
  }

  if (sans(rng, pp[sinif].raise)) return { tur: 'raise', hedef: hedefHesapla(c, pp.boyut) };
  if (g >= pp.callEsik + pp.callDuyarlilik * gerek) return { tur: 'call' };
  return { tur: 'fold' };
}

// ---------- Postflop: akıllı bot (equity + pot oranı) ----------

function postflopAkilli(pr, c, rng) {
  const pp = pr.params.postflop;
  const iter = Math.min(2000, pp.iterasyon);
  const eq = rastgeleRakibeKarsi(c.el, c.board, c.rakipSayisi, { iterasyon: iter, rng }).equity;
  const outs = c.board.length < 5 ? outlariBul(c.el, c.board).toplam : 0;
  const yalniz = c.rakipSayisi <= 2;
  const ref = 1 / (c.rakipSayisi + 1);
  const degerEsigi = Math.min(0.8, Math.max(pp.degerEsigi, ref + 0.18));
  const gec = c.poz === 'BTN' || c.poz === 'CO';

  if (c.cagri === 0) {
    if (eq >= degerEsigi) return sans(rng, 0.85) ? { tur: 'bet', hedef: hedefHesapla(c, pp.boyut) } : { tur: 'check' };
    if (eq >= pp.inceDegerEsigi && yalniz && sans(rng, 0.4)) return { tur: 'bet', hedef: hedefHesapla(c, 0.4) };
    if (outs >= 8 && c.sokak !== 'river' && sans(rng, pp.yariBlof)) return { tur: 'bet', hedef: hedefHesapla(c, pp.boyut) };
    if (yalniz && (c.sokak === 'turn' || c.sokak === 'river' || gec) && sans(rng, pp.blof)) {
      return { tur: 'bet', hedef: hedefHesapla(c, pp.boyut) };
    }
    return { tur: 'check' };
  }

  const gerek = potOrani(c.pot, c.cagri);
  const eqE = eq - 0.05; // bahis açan rakibin aralığı rastgele elden güçlüdür
  if (eqE >= 0.8 && sans(rng, 0.5)) return { tur: 'raise', hedef: hedefHesapla(c, 0.8) };
  if (eqE >= gerek + 0.02) return { tur: 'call' };
  if (outs >= 8 && c.sokak === 'flop' && sans(rng, 0.15)) return { tur: 'raise', hedef: hedefHesapla(c, pp.boyut) };
  if (sans(rng, 0.03) && yalniz) return { tur: 'raise', hedef: hedefHesapla(c, pp.boyut) };
  return { tur: 'fold' };
}

// ---------- Dışa açık ----------

export function botKarar(profilId, gorunum, gecerli, { rng = guvenliRng() } = {}) {
  const profil = PROFILLER[profilId];
  if (!profil) throw new Error(`Bilinmeyen bot profili: ${profilId}`);
  const c = baglamCikar(gorunum, gecerli);
  if (!c.el) return geriDus(gecerli);

  let niyet;
  if (c.sokak === 'preflop') niyet = preflopKarar(profil, c, rng);
  else if (profilId === 'akilli') niyet = postflopAkilli(profil, c, rng);
  else niyet = postflopGenel(profil, c, rng);
  return gecerliyeCevir(niyet, gecerli);
}
