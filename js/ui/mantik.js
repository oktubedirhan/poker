// Arayüzün DOM'suz (saf) parçaları: görev değerlendirme, yıldız hesabı, metin biçimleri, olay metinleri.
// Node'da test edilir (tests/ui-mantik.test.mjs).

import { kartAdi, DEGER_AD, RENK_AD, kartDeger } from '../motor/kart.js';
import { degerlendir, karsilastir } from '../motor/degerlendirici.js';

// ---------- Sayı ve metin biçimleri ----------

export function sayiBicim(n) {
  const s = Math.round(Math.abs(Number(n) || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? `−${s}` : s;
}

export function isaretliBicim(n) {
  if (n > 0) return `+${sayiBicim(n)}`;
  if (n < 0) return `−${sayiBicim(-n)}`;
  return '0';
}

// 0..1 → '%36'
export function yuzde(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return '–';
  const v = x <= 1 ? x * 100 : x;
  return `%${Math.round(v)}`;
}

export function kartlarAdi(kartlar) {
  return (kartlar || []).map(kartAdi).join(', ');
}

// Ders metni: '\n\n' paragraf, **kalın**. → [[{ kalin, metin }]]
export function metinParcala(metin) {
  const paragraflar = String(metin ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paragraflar.map((p) => {
    const parcalar = [];
    const re = /\*\*(.+?)\*\*/g;
    let son = 0, m;
    while ((m = re.exec(p))) {
      if (m.index > son) parcalar.push({ kalin: false, metin: p.slice(son, m.index) });
      parcalar.push({ kalin: true, metin: m[1] });
      son = m.index + m[0].length;
    }
    if (son < p.length) parcalar.push({ kalin: false, metin: p.slice(son) });
    return parcalar;
  });
}

// ---------- Yıldız ve görev değerlendirme ----------

// esikler: [1★, 2★, 3★] için gereken değer (artan). birinciOl: bitirilen sıra, esik = en kötü kabul edilen sıra.
export function yildizHesapla(hedefTur, deger, esikler) {
  if (!Array.isArray(esikler) || typeof deger !== 'number' || !Number.isFinite(deger)) return 0;
  if (hedefTur === 'birinciOl') return esikler.filter((e) => deger >= 1 && deger <= e).length;
  return esikler.filter((e) => deger >= e).length;
}

export function quizSonucu(gorev, dogru, toplam) {
  const yildiz = yildizHesapla('quiz', dogru, gorev.yildiz);
  return {
    yildiz, basarili: yildiz > 0, deger: dogru,
    ozet: `${toplam} sorudan ${dogru} tanesini doğru yaptın.`,
    istatistik: [['Doğru', `${dogru}/${toplam}`]],
  };
}

export function yonlendirmeliSonucu(gorev, { tamamlandi, foldEtti }) {
  const deger = tamamlandi && !foldEtti ? 1 : 0;
  const yildiz = yildizHesapla('yonlendirmeliEl', deger, gorev.yildiz);
  return {
    yildiz, basarili: yildiz > 0, deger,
    ozet: deger ? 'Eli baştan sona oynadın: preflop, flop, turn, river ve showdown.' : 'Bu elde showdown\'a kadar kalmalıydın. Bir daha dene.',
    istatistik: [],
  };
}

// Oyuncu elendiğinde ya da el bitiminde bitirme sırası. kalanCipler: diğer oyuncuların el sonu çipleri.
export function siraHesapla({ benimCip, digerCipler, elendi }) {
  const kalan = digerCipler.filter((c) => c > 0);
  if (elendi) return kalan.length + 1;
  return 1 + kalan.filter((c) => c > benimCip).length;
}

// Koç notunu görev sayacına işler. Yalnız önemli (bahisle karşılaşılan ya da bahis yapılan) 'iyi'
// kararlar +1, her 'hata' −1; net (iyiKarar) en az 0. Bedava check gibi kararlar puan getirmez.
export function kararSay(durum, not) {
  if (!not) return durum;
  if (not.not === 'iyi' && not.onemli) durum.onemliIyi = (durum.onemliIyi ?? 0) + 1;
  if (not.not === 'hata') durum.hataKarar = (durum.hataKarar ?? 0) + 1;
  durum.iyiKarar = Math.max(0, (durum.onemliIyi ?? 0) - (durum.hataKarar ?? 0));
  return durum;
}

// durum: { netCip, iyiKarar, elendi, sira, oynananEl }
export function hedefDegeri(hedef, durum) {
  switch (hedef?.tur) {
    case 'cipKazan': return durum.netCip;
    case 'dogruKarar': return durum.iyiKarar;
    case 'hayattaKal': return durum.elendi ? 0 : durum.oynananEl;
    case 'birinciOl': return durum.sira;
    default: return 0;
  }
}

export function masaSonucu(gorev, durum) {
  const { hedef } = gorev;
  const deger = hedefDegeri(hedef, durum);
  let yildiz;
  if (hedef.tur === 'birinciOl') yildiz = yildizHesapla('birinciOl', deger, gorev.yildiz);
  else if (durum.elendi) yildiz = 0;
  else if (hedef.tur === 'hayattaKal') yildiz = durum.oynananEl >= gorev.elSayisi ? 3 : 0;
  else yildiz = yildizHesapla(hedef.tur, deger, gorev.yildiz);

  let ozet;
  if (durum.elendi && hedef.tur !== 'birinciOl') ozet = 'Fişlerin bitti, görev başarısız. Bir daha dene.';
  else if (hedef.tur === 'cipKazan') ozet = `${durum.oynananEl} elde net ${isaretliBicim(durum.netCip)} fiş. Hedef: +${sayiBicim(gorev.yildiz[0])}.`;
  else if (hedef.tur === 'dogruKarar') ozet = `${durum.oynananEl} elde net ${durum.iyiKarar} iyi karar (önemli iyi kararlar − hatalar). Hedef: ${gorev.yildiz[0]}.`;
  else if (hedef.tur === 'birinciOl') ozet = `Turnuvayı ${durum.sira}. sırada bitirdin.`;
  else ozet = `${durum.oynananEl} el oynadın.`;

  const istatistik = [['El', String(durum.oynananEl)], ['Net fiş', isaretliBicim(durum.netCip)]];
  if (hedef.tur === 'dogruKarar' || durum.iyiKarar > 0) istatistik.push(['Net iyi karar', String(durum.iyiKarar)]);
  if (hedef.tur === 'dogruKarar' && durum.hataKarar) istatistik.push(['Hata', String(durum.hataKarar)]);
  if (hedef.tur === 'birinciOl') istatistik.push(['Sıra', `${durum.sira}.`]);
  return { yildiz, basarili: yildiz > 0, deger, ozet, istatistik };
}

export function hedefDurumMetni(gorev, durum) {
  const h = gorev.hedef;
  if (!h) return '';
  if (h.tur === 'cipKazan') return `Net ${isaretliBicim(durum.netCip)} · hedef +${sayiBicim(gorev.yildiz[0])}`;
  if (h.tur === 'dogruKarar') return `Net iyi karar ${durum.iyiKarar} · hedef ${gorev.yildiz[0]}`;
  if (h.tur === 'hayattaKal') return `Hayatta kal: ${durum.oynananEl}/${gorev.elSayisi}`;
  if (h.tur === 'birinciOl') return `Masada ${durum.kalanOyuncu ?? '?'} oyuncu · birinci ol`;
  return '';
}

export function hedefTarifi(gorev) {
  const h = gorev.hedef;
  if (!h) return '';
  const el = `${gorev.elSayisi} el`;
  if (h.tur === 'cipKazan') return `${el} oyna, en az +${sayiBicim(gorev.yildiz[0])} fiş kazan. ${sayiBicim(gorev.yildiz[1])} ve ${sayiBicim(gorev.yildiz[2])} fişte daha çok yıldız.`;
  if (h.tur === 'dogruKarar') return `${el} oyna. Bahisle karşılaştığın ya da bahis yaptığın kararlarda koçun her "iyi" notu +1, her hata −1 sayılır; en az ${gorev.yildiz[0]} net puan topla. Fişlerin bitmesin.`;
  if (h.tur === 'hayattaKal') return `${el} boyunca fişlerin bitmesin.`;
  if (h.tur === 'birinciOl') return 'Blind\'ler her 10 elde artar. Son kalan ol: 1. olursan 3 yıldız, 2. olursan 2, 3. olursan 1.';
  return '';
}

// ---------- Soru seçimi ----------

export function karistir(dizi, rng) {
  const a = [...dizi];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function quizSorulariSec(alistirmalar, n, rng) {
  return karistir(alistirmalar, rng).slice(0, Math.min(n, alistirmalar.length));
}

// ---------- Soru doğrulama (motorla) ----------

export function enIyi5Dogrula(kartlar7, secilen) {
  const enIyi = degerlendir(kartlar7);
  if (!Array.isArray(secilen) || secilen.length !== 5 || secilen.some((k) => !kartlar7.includes(k))) {
    return { dogru: false, enIyi, secilenDeger: null };
  }
  const secilenDeger = degerlendir(secilen);
  return { dogru: secilenDeger.puan === enIyi.puan, enIyi, secilenDeger };
}

export function hangisiGucluCoz(soru) {
  const board = soru.board || [];
  const a = degerlendir([...soru.elA, ...board]);
  const b = degerlendir([...soru.elB, ...board]);
  const k = karsilastir(a, b);
  return { dogru: k > 0 ? 'A' : k < 0 ? 'B' : 'esit', a, b };
}

// ---------- Masa yardımcıları ----------

// Kendi perspektifinden olay: başkasının kapalı kartı silinir.
export function gorunurOlay(olay, benimId) {
  if (olay?.tur === 'kartDagitildi' && olay.oyuncuId !== benimId) return { ...olay, kartlar: null };
  return olay;
}

export function cipYigini(miktar) {
  const adet = miktar < 50 ? 1 : miktar < 200 ? 2 : miktar < 500 ? 3 : miktar < 1000 ? 4 : 5;
  const deger = miktar >= 1000 ? 500 : miktar >= 300 ? 100 : miktar >= 100 ? 25 : miktar >= 30 ? 10 : miktar >= 10 ? 5 : 1;
  return { adet, deger };
}

const EYLEM_AD = { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allin: 'All-in' };

// Koltuk etiketi ve sınıfı: { metin, tur: ''|'fold'|'agresif' }
export function eylemEtiketi(olay) {
  const e = olay.eylem;
  if (e === 'fold') return { metin: 'Fold', tur: 'fold' };
  if (e === 'check') return { metin: 'Check', tur: '' };
  if (e === 'call') return { metin: `Call ${sayiBicim(olay.eklenen)}`, tur: '' };
  if (e === 'allin') return { metin: 'All-in', tur: 'agresif' };
  return { metin: `${EYLEM_AD[e] ?? e} ${sayiBicim(olay.miktar)}`, tur: 'agresif' };
}

const SOKAK_AD = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown', bitti: 'El bitti' };
export function sokakAdi(s) {
  return SOKAK_AD[s] ?? s;
}

// Ekran okuyucu metni. adlar: { id: 'Zeynep' }, benimId: 'sen'
export function olayMetni(olay, adlar, benimId = 'sen') {
  const ad = (id) => (id === benimId ? 'Sen' : adlar[id] ?? id);
  switch (olay.tur) {
    case 'elBasladi':
      return `El ${olay.elNo} başladı. Dealer: ${ad(olay.dealerId)}. Blind'ler ${olay.kucukBlind}/${olay.buyukBlind}.`;
    case 'kartDagitildi':
      return olay.oyuncuId === benimId && olay.kartlar ? `Kartların: ${kartlarAdi(olay.kartlar)}.` : null;
    case 'sokak':
      return `${sokakAdi(olay.sokak)}: ${kartlarAdi(olay.yeniKartlar)}.`;
    case 'eylem': {
      const ben = olay.oyuncuId === benimId;
      const kim = ad(olay.oyuncuId);
      const ek = ben ? 'ettin' : 'etti';
      switch (olay.eylem) {
        case 'fold': return `${kim} fold ${ek}.`;
        case 'check': return `${kim} check ${ek}.`;
        case 'call': return `${kim} ${olay.eklenen} call ${ek}.`;
        case 'bet': return `${kim} ${olay.miktar} bet ${ek}.`;
        case 'raise': return `${kim} ${olay.miktar} raise ${ek}.`;
        case 'allin': return `${kim} all-in ${ben ? 'yaptın' : 'yaptı'}: ${olay.miktar}.`;
        default: return null;
      }
    }
    case 'showdown':
      return `Showdown. ${olay.acilanlar.map((a) => `${ad(a.oyuncuId)}: ${kartlarAdi(a.kartlar)}, ${a.deger?.ad ?? ''}`).join('. ')}.`;
    case 'potKazanildi': {
      const kim = olay.kazananlar.map(ad).join(' ve ');
      const tek = olay.kazananlar.length === 1;
      const fiil = tek ? (olay.kazananlar[0] === benimId ? 'kazandın' : 'kazandı') : 'paylaştı';
      return `${kim} ${olay.potIndex > 0 ? 'yan potu' : 'potu'} ${fiil}: ${olay.miktar} fiş${olay.deger ? `, ${olay.deger.aciklama}` : ''}.`;
    }
    case 'karildi':
      return olay.mod === 'ayakkabi' ? 'Deste karıldı, sayma sıfırlandı.' : null;
    case 'oyuncuElendi':
      return olay.oyuncuId === benimId ? 'Fişlerin bitti.' : `${ad(olay.oyuncuId)} masadan elendi.`;
    default:
      return null;
  }
}

// Sonuç şeridi metni: "Mert kazandı +520" (birden çok potta birleştirir).
export function sonucMetni(potOlaylari, adlar, benimId = 'sen') {
  const kazanc = new Map();
  for (const p of potOlaylari) {
    const pay = Math.floor(p.miktar / p.kazananlar.length);
    for (const id of p.kazananlar) kazanc.set(id, (kazanc.get(id) ?? 0) + pay);
  }
  return [...kazanc.entries()]
    .map(([id, m]) => (id === benimId ? `Kazandın +${sayiBicim(m)}` : `${adlar[id] ?? id} kazandı +${sayiBicim(m)}`))
    .join(' · ');
}

// Hızlı tutarlar (bu sokakta TOPLAM bahis, "raise to"). aralik: {min,max}
export function hizliTutarlar(gorunum, cagri, aralik, adim = 1) {
  const sinirla = (v) => Math.max(aralik.min, Math.min(aralik.max, v));
  const yuvarla = (v) => Math.round(v / adim) * adim;
  const potSonra = gorunum.potToplam + (cagri || 0);
  const temel = gorunum.mevcutBahis;
  return {
    yarimPot: sinirla(yuvarla(temel + potSonra / 2)),
    pot: sinirla(yuvarla(temel + potSonra)),
    allin: aralik.max,
  };
}

export function kaydiriciDegeri(v, aralik, adim) {
  const n = Math.round(Number(v));
  if (n >= aralik.max) return aralik.max;
  if (n <= aralik.min) return aralik.min;
  const yuvarlak = Math.round(n / adim) * adim;
  return Math.max(aralik.min, Math.min(aralik.max, yuvarlak));
}

// Koç ayrıntısı → [[dt, dd]]
export function ayrintiSatirlari(ayrinti) {
  if (!ayrinti || typeof ayrinti !== 'object') return [];
  const satir = [];
  if (typeof ayrinti.equity === 'number') satir.push(['Equity', yuzde(ayrinti.equity)]);
  if (typeof ayrinti.gerekenEquity === 'number') satir.push(['Gereken', yuzde(ayrinti.gerekenEquity)]);
  const outs = typeof ayrinti.outs === 'number' ? ayrinti.outs : ayrinti.outs?.toplam;
  if (typeof outs === 'number' && outs > 0) satir.push(['Out', String(outs)]);
  return satir;
}

const POZISYON_TARIF = {
  UTG: 'UTG (Under the Gun): preflop ilk konuşan, en erken pozisyon',
  MP: 'MP: orta pozisyon',
  CO: 'CO (Cutoff): düğmeden hemen önce, geç pozisyon',
  BTN: 'BTN (Button): dealer düğmesi, en son konuşan',
  SB: 'SB: küçük blind',
  BB: 'BB: büyük blind',
};
export function pozisyonTarifi(p) {
  return POZISYON_TARIF[p] ?? p;
}

export const ONERI_AD = { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allin: 'All-in', oyna: 'Oyna', at: 'At' };

// ---------- Sonraki kart (sayma) sorusu ----------

const RESIMLI = new Set(['J', 'Q', 'K']);

// Saf: gorulen + bilinmeyen kart listeleri → secmeli soru. tip: 'renk'|'deger'|'resimli'
export function sonrakiKartSorusu({ gorulen, bilinmeyen, tip, rng }) {
  const U = bilinmeyen.length;
  let filtre, ad, toplamTur, gorulenTur;
  if (tip === 'renk') {
    const renkler = ['s', 'h', 'd', 'c'];
    // Görülen kartlardan bir renk seç ki hesap anlamlı olsun
    const adaylar = renkler.filter((r) => gorulen.some((k) => k[1] === r));
    const r = (adaylar.length ? adaylar : renkler)[rng.int((adaylar.length ? adaylar : renkler).length)];
    filtre = (k) => k[1] === r;
    ad = RENK_AD[r];
    toplamTur = 13;
    gorulenTur = `${RENK_AD[r]} kartı`;
  } else if (tip === 'deger') {
    const adaylar = [...new Set(gorulen.map((k) => k[0]))];
    const d = adaylar.length ? adaylar[rng.int(adaylar.length)] : 'A';
    filtre = (k) => k[0] === d;
    ad = DEGER_AD[d];
    toplamTur = 4;
    gorulenTur = `${DEGER_AD[d]}`;
  } else {
    filtre = (k) => RESIMLI.has(k[0]);
    ad = 'resimli kart (Vale, Kız, Papaz)';
    toplamTur = 12;
    gorulenTur = 'resimli kart';
  }
  const kalan = bilinmeyen.filter(filtre).length;
  const gor = gorulen.filter(filtre).length;
  const dogruYuzde = U ? Math.round((kalan / U) * 100) : 0;

  const adaylar = [
    Math.round((toplamTur / 52) * 100), // görülenleri unutmak
    U ? Math.round((kalan / 52) * 100) : 0, // paydayı düzeltmemek
    U ? Math.round(((kalan + 2) / U) * 100) : 0,
    U ? Math.round((Math.max(0, kalan - 2) / U) * 100) : 0,
    dogruYuzde + 5, Math.max(0, dogruYuzde - 4), dogruYuzde * 2 + 1,
  ];
  const secenekSayilari = [dogruYuzde];
  for (const a of adaylar) {
    if (secenekSayilari.length >= 4) break;
    if (a >= 0 && a <= 100 && !secenekSayilari.some((s) => Math.abs(s - a) < 2)) secenekSayilari.push(a);
  }
  let ek = 7;
  while (secenekSayilari.length < 4) {
    const a = dogruYuzde + ek;
    if (a <= 100 && !secenekSayilari.some((s) => Math.abs(s - a) < 2)) secenekSayilari.push(a);
    ek += 6;
  }
  const sirali = [...secenekSayilari].sort((a, b) => a - b);
  return {
    tur: 'secmeli',
    soru: `${gorulen.length} kart gördün (aşağıda). Sonraki kartın ${ad} olma olasılığı yaklaşık kaç?`,
    kartlar: [...gorulen],
    kartBoyutu: 'mini',
    secenekler: sirali.map((s) => `%${s}`),
    dogru: sirali.indexOf(dogruYuzde),
    aciklama: `${gorulen.length} kart gördün, ${U} bilinmeyen kart kaldı. ${toplamTur} ${gorulenTur} içinden ${gor} tanesini gördün, ${kalan} kaldı: ${kalan} ÷ ${U} ≈ %${dogruYuzde}.`,
  };
}

// ---------- Out sorusu için düz yardımcılar ----------

// Değerler (2..14) kümesinde 5'li sıra var mı? As 1 de sayılır.
export function siraliVarMi(degerler) {
  const s = new Set(degerler);
  if (s.has(14)) s.add(1);
  for (let ust = 14; ust >= 5; ust--) {
    let tam = true;
    for (let d = ust; d > ust - 5; d--) if (!s.has(d)) { tam = false; break; }
    if (tam) return true;
  }
  return false;
}

// Sıralıyı tamamlayan değerler (kartlar 5 ya da 6 kart)
export function siraliTamamlayanlar(kartlar) {
  const d = kartlar.map(kartDeger);
  if (siraliVarMi(d)) return [];
  const sonuc = [];
  for (let v = 2; v <= 14; v++) if (!d.includes(v) && siraliVarMi([...d, v])) sonuc.push(v);
  return sonuc;
}
