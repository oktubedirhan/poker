// Koç: insan oyuncunun kararını değerlendirir (kararDegerlendir) ve eylemden önce öneri verir (ipucu).
// Preflop: seviye-04'teki basit başlangıç rehberi (pozisyona göre aralıklar).
// Postflop: equity (rastgele rakiplere karşı Monte Carlo, ~3000 iterasyon) ile pot oranı karşılaştırması.
// Yalnızca `gorunum` kullanılır; başkalarının kapalı kartları bilinmez.

import { kartDeger, DEGER_AD } from '../motor/kart.js';
import { rastgeleRakibeKarsi, potOrani, kural24 } from './olasilik.js';
import { outlariBul } from './outs.js';

const ITERASYON = 3000;

const yuzde = (x) => `%${Math.round(x * 100)}`;

// ---------- El sınıflandırma (botlar da kullanır) ----------

// ['Ah','Kd'] → { hi, lo, suited, pair, ad: 'AKo' }
export function elBilgisi(kartlar) {
  const [a, b] = kartlar;
  const da = kartDeger(a), db = kartDeger(b);
  const hi = Math.max(da, db), lo = Math.min(da, db);
  const suited = a[1] === b[1];
  const pair = da === db;
  const harf = (v) => '23456789TJQKA'[v - 2];
  return { hi, lo, suited, pair, ad: harf(hi) + harf(lo) + (pair ? '' : suited ? 's' : 'o') };
}

// Okunur ad: 'As-Papaz (suited)', 'Kız-Kız'
export function elAdi(kartlar) {
  const { hi, lo, suited, pair } = elBilgisi(kartlar);
  const ad = (v) => DEGER_AD['23456789TJQKA'[v - 2]];
  return `${ad(hi)}-${ad(lo)}${!pair && suited ? ' (suited)' : ''}`;
}

// Chen formülü: başlangıç eli gücü (AA = 20, 7-2 offsuit ≈ -1). Botlar için sayısal ölçü.
export function chenPuani(kartlar) {
  const { hi, lo, suited, pair } = elBilgisi(kartlar);
  const temel = (v) => (v === 14 ? 10 : v === 13 ? 8 : v === 12 ? 7 : v === 11 ? 6 : v / 2);
  let p = temel(hi);
  if (pair) return Math.max(5, p * 2);
  if (suited) p += 2;
  const bosluk = hi - lo - 1;
  p -= bosluk === 0 ? 0 : bosluk === 1 ? 1 : bosluk === 2 ? 2 : bosluk === 3 ? 4 : 5;
  if (bosluk <= 1 && hi < 12) p += 1;
  return Math.ceil(p);
}

function premiumMu({ hi, lo, pair }) {
  return (pair && hi >= 12) || (hi === 14 && lo === 13);
}
function gucluMu(e) {
  const { hi, lo, suited, pair } = e;
  return (pair && hi >= 9 && hi <= 11) || (hi === 14 && lo === 12) || (hi === 14 && lo === 11 && suited) ||
    (hi === 13 && lo === 12 && suited);
}

// Seviye 4 rehberi: pozisyona göre oynanacak eller.
function aralikta(e, poz) {
  const { hi, lo, suited, pair } = e;
  const bosluk = hi - lo - 1;
  const utg = (pair && hi >= 7) || (hi === 14 && lo >= 12) || (hi === 14 && lo === 11 && suited) ||
    (hi === 13 && lo === 12 && suited);
  if (poz === 'UTG') return utg;
  const mp = utg || (pair && hi >= 6) || (hi === 14 && lo >= 11) || (hi === 13 && lo === 12) ||
    (hi === 14 && lo === 10 && suited) || (hi === 12 && lo === 11 && suited);
  if (poz === 'MP') return mp;
  const co = mp || pair || (hi === 14 && (suited || lo >= 10)) || (hi === 13 && lo >= 11) ||
    (suited && hi >= 12 && lo >= 10) || (suited && bosluk === 0 && lo >= 3) || (suited && bosluk === 1 && lo >= 5);
  if (poz === 'CO' || poz === 'SB') return co;
  // BTN (ve heads-up'ta BTN/SB): CO + geniş suited ve yüksek offsuit
  return co || (suited && hi >= 11 && lo >= 9) || (suited && hi === 13 && lo >= 9) || (suited && hi === 12 && lo >= 9) ||
    (suited && bosluk === 0) || (hi === 14 && lo >= 9) || (hi === 13 && lo >= 10) || (hi === 12 && lo === 11);
}

// → 'premium' | 'guclu' | 'oynanir' | 'zayif'
// durum: { poz, cagri, buyukBlind, cip, yukseltildi }
export function preflopSinifi(kartlar, durum) {
  const e = elBilgisi(kartlar);
  if (premiumMu(e)) return 'premium';
  if (gucluMu(e)) return 'guclu';
  const { poz, cagri, buyukBlind, cip, yukseltildi } = durum;
  if (!yukseltildi || cagri === 0) return aralikta(e, poz === 'BB' ? 'BTN' : poz) ? 'oynanir' : 'zayif';
  const pahali = cagri > 4 * buyukBlind;
  if (pahali) {
    // Çok pahalı raise: yalnız küçük çiftlerle set avı (call'ın stack'in ~%10'unu geçmediği yerde)
    return e.pair && e.hi >= 6 && cagri <= cip * 0.1 ? 'oynanir' : 'zayif';
  }
  const hedef = poz === 'BB' ? 'BTN' : poz === 'BTN' ? 'CO' : poz === 'UTG' ? 'UTG' : 'MP';
  return aralikta(e, hedef) ? 'oynanir' : 'zayif';
}

// ---------- Durum çıkarma ----------

function durumCikar(gorunum) {
  const ben = gorunum.oyuncular.find((o) => o.id === gorunum.benimId);
  const rakipler = gorunum.oyuncular.filter((o) => o.id !== gorunum.benimId && o.oturuyor && !o.dusuk);
  const benimBahis = ben ? ben.bahis : 0;
  const cip = ben ? ben.cip : 0;
  const cagri = Math.min(Math.max(0, gorunum.mevcutBahis - benimBahis), cip);
  const bb = gorunum.buyukBlind ?? Math.max(1, gorunum.enAzRaise - gorunum.mevcutBahis);
  return {
    ben, cip, benimBahis, cagri, bb,
    pot: gorunum.potToplam,
    rakipSayisi: Math.max(1, rakipler.length),
    poz: ben?.pozisyon ?? 'BTN',
    sokak: gorunum.sokak,
    yukseltildi: gorunum.sokak === 'preflop' && gorunum.mevcutBahis > bb,
  };
}

function eylemNormal(eylem) {
  if (typeof eylem === 'string') return { tur: eylem };
  return eylem || {};
}

// Çekişi olan (güçlü bitmemiş) ellerde 2-4 kuralı cümlesi
function outMetni(a) {
  return a.outs >= 4 && a.kalanSokak > 0 && a.equity < 0.75
    ? `Elinde ${a.outs} out var, 2-4 kuralıyla ~%${kural24(a.outs, a.kalanSokak)}. ` : '';
}

// Postflop sayısal analiz
function postflopAnaliz(gorunum, d, rng) {
  const el = gorunum.benimKartlarim;
  const board = gorunum.board;
  const e = rastgeleRakibeKarsi(el, board, d.rakipSayisi, { iterasyon: ITERASYON, rng });
  const gerek = potOrani(d.pot, d.cagri);
  const outs = board.length === 3 || board.length === 4 ? outlariBul(el, board).toplam : 0;
  const ref = 1 / (d.rakipSayisi + 1);
  return {
    equity: e.equity, gerek, outs, ref,
    adj: d.cagri > 0 ? 0.05 : 0, // bahis açan rakip rastgele ele göre daha güçlü
    degerEsigi: Math.min(0.8, ref + 0.18),
    cokGuclu: Math.min(0.85, Math.max(0.65, ref + 0.35)),
    kalanSokak: board.length === 3 ? 2 : board.length === 4 ? 1 : 0,
  };
}

function preflopAyrinti(gorunum, d, rng) {
  const e = rastgeleRakibeKarsi(gorunum.benimKartlarim, [], d.rakipSayisi, { iterasyon: 1500, rng });
  return { equity: e.equity, gerekenEquity: potOrani(d.pot, d.cagri), outs: 0 };
}

// ---------- kararDegerlendir ----------

const NOT = (not, baslik, mesaj, ayrinti) => ({ not, baslik, mesaj, ayrinti });

// onemli: oyuncu bir bahisle karşılaştıysa (call miktarı > 0 iken fold/call/raise) ya da kendisi
// bet/raise yaptıysa true. Bedava check (ve bedava kararlar) false: görev puanına yalnız önemli
// 'iyi' kararlar sayılır.
export function onemliKararMi(cagri, tur) {
  const agresif = tur === 'bet' || tur === 'raise' || tur === 'allin';
  return agresif || (cagri > 0 && (tur === 'fold' || tur === 'call'));
}

export function kararDegerlendir(gorunum, eylem, { rng } = {}) {
  const ey = eylemNormal(eylem);
  const tur = ey.tur;
  const d = durumCikar(gorunum);
  if (!gorunum.benimKartlarim) {
    return { ...NOT('iyi', 'Değerlendirme yok', 'Kartların bilinmediği için bu karar değerlendirilemedi.', { equity: null, gerekenEquity: null, outs: 0 }), onemli: false };
  }
  const sonuc = gorunum.sokak === 'preflop'
    ? preflopDegerlendir(gorunum, tur, ey, d, rng)
    : postflopDegerlendir(gorunum, tur, ey, d, rng);
  return { ...sonuc, onemli: onemliKararMi(d.cagri, tur) };
}

function preflopDegerlendir(gorunum, tur, ey, d, rng) {
  const ay = preflopAyrinti(gorunum, d, rng);
  const sinif = preflopSinifi(gorunum.benimKartlarim, d);
  const ad = elAdi(gorunum.benimKartlarim);
  const poz = d.poz;
  const agresif = tur === 'bet' || tur === 'raise' || tur === 'allin';
  const gec = poz === 'BTN' || poz === 'CO' || poz === 'SB';
  const guclu = sinif === 'premium' || sinif === 'guclu';

  if (tur === 'fold') {
    if (d.cagri === 0) return NOT('hata', 'Bedava check\'te fold etme', `Call edecek bir şey yok; check etmek bedava. ${ad} elini atmak için sebep yok.`, ay);
    if (guclu) return NOT('hata', 'Güçlü eli fold ettin', `${ad} güçlü bir başlangıç eli. Fold etmek burada değer kaçırmaktır.`, ay);
    if (sinif === 'oynanir') {
      return NOT('supheli', 'Biraz fazla temkinli', `${ad} ${poz} pozisyonunda oynanabilir bir el${d.yukseltildi ? ', ama raise\'e karşı fold da savunulur' : '; call ya da raise düşünebilirdin'}.`, ay);
    }
    return NOT('iyi', 'Doğru fold', `${ad} ${poz} pozisyonunda zayıf bir el. Her elde oynamak para kaybettirir; fold doğru.`, ay);
  }

  if (tur === 'check') {
    if (guclu && d.rakipSayisi <= 2) return NOT('supheli', 'Güçlü elde check', `${ad} güçlü. Bedava check yerine raise ile pot'u büyütmek (value bet) daha kârlı.`, ay);
    return NOT('iyi', 'Sorun yok', 'Bedava kartı görmek mantıklı.', ay);
  }

  if (tur === 'call') {
    if (sinif === 'premium' && d.cagri <= 6 * d.bb) {
      return NOT('supheli', 'Raise etmeyi düşün', `${ad} premium bir el. Sadece call etmek yerine raise ile pot'u büyüt; rakiplerin ucuza görmesini istemezsin.`, ay);
    }
    if (sinif !== 'zayif') return NOT('iyi', 'İyi call', `${ad} ${poz} pozisyonunda oynanır; call mantıklı.`, ay);
    if (d.cagri <= d.bb) return NOT('supheli', 'Ucuz ama zayıf', `${ad} zayıf bir el. Ucuza görmek cazip ama bu elleri sık oynamak uzun vadede kaybettirir.`, ay);
    return NOT('hata', 'Zayıf elle call', `${ad} ${poz} pozisyonunda zayıf; üstüne raise'e call etmek pahalı bir hata. Fold daha iyi.`, ay);
  }

  if (agresif) {
    const cipBB = d.cip / d.bb;
    if (tur === 'allin' && cipBB > 15 && sinif !== 'premium') {
      return NOT(guclu ? 'supheli' : 'hata', 'Çok büyük bahis', `${Math.round(cipBB)} büyük blind ile all-in, ${ad} elinin riske değeceği bir durum değil. Daha küçük raise yeterli.`, ay);
    }
    if (guclu) return NOT('iyi', 'Güçlü raise', `${ad} güçlü bir el; raise ile pot'u büyütmek doğru.`, ay);
    if (sinif === 'oynanir') {
      if (d.yukseltildi) return NOT('supheli', 'Hafif el ile re-raise', `${ad} oynanır ama re-raise için biraz zayıf. Call daha güvenli.`, ay);
      return NOT('iyi', 'İyi raise', `${ad} ${poz} pozisyonunda oynanır; limp yerine raise etmek doğru.`, ay);
    }
    if (gec && !d.yukseltildi) return NOT('supheli', 'Blind çalma denemesi', `${ad} zayıf ama ${poz}'den raise blind çalmak (steal) olabilir. Arkandakiler fold etmezse zor durumdasın.`, ay);
    return NOT('hata', 'Zayıf elle raise', `${ad} ${poz} pozisyonunda zayıf. Böyle elle raise etmek riskli; fold ya da check daha iyi.`, ay);
  }
  return NOT('iyi', 'Sorun yok', 'Bu karar makul.', ay);
}

function postflopDegerlendir(gorunum, tur, ey, d, rng) {
  const a = postflopAnaliz(gorunum, d, rng);
  const ay = { equity: a.equity, gerekenEquity: a.gerek, outs: a.outs };
  const eq = a.equity - a.adj;
  const eqY = yuzde(a.equity);
  const gerekY = yuzde(a.gerek);
  const kalanOut = outMetni(a);

  if (tur === 'fold') {
    if (d.cagri === 0) return NOT('hata', 'Bedava check\'te fold etme', 'Rakip bahis açmadı; check etmek bedava. Fold etmenin hiçbir anlamı yok.', ay);
    const fark = eq - a.gerek;
    if (fark > 0.12) return NOT('hata', 'Fazla temkinli fold', `${kalanOut}Equity'n ${eqY}, pot sadece ${gerekY} istiyor. Call matematiksel olarak kârlıydı.`, ay);
    if (fark > 0.04) return NOT('supheli', 'Sınırda fold', `${kalanOut}Equity'n ${eqY}, pot ${gerekY} istiyor; call hafif kârlıydı. Rakip güçlü görünüyorsa fold savunulur.`, ay);
    return NOT('iyi', 'Doğru fold', `${kalanOut}Equity'n ${eqY}, pot ${gerekY} istiyor. Matematik fold diyor.`, ay);
  }

  if (tur === 'check') {
    if (eq >= a.cokGuclu) return NOT('supheli', 'Value bet kaçırdın', `Elin çok güçlü (equity ${eqY}). Check yerine bahis açıp rakibin call etmesini sağlamak (value bet) daha çok kazandırır.`, ay);
    return NOT('iyi', 'Mantıklı check', a.outs >= 8 ? `${kalanOut}Bedava kart görmek iyi.` : 'Elin bahis açacak kadar güçlü değil; check ile pot\'u küçük tutmak mantıklı.', ay);
  }

  if (tur === 'call') {
    const fark = eq - a.gerek;
    if (eq >= a.cokGuclu && d.cagri > 0) return NOT('supheli', 'Value bet kaçırdın', `Elin çok güçlü (equity ${eqY}). Sadece call etmek yerine raise ile daha çok para almayı düşün.`, ay);
    if (fark < -0.12) return NOT('hata', 'Pahalı call', `${kalanOut}Equity'n ${eqY}, pot ${gerekY} istiyor. Bu call uzun vadede para kaybettirir.`, ay);
    if (fark < -0.04) return NOT('supheli', 'Sınırda call', `${kalanOut}Equity'n ${eqY}, pot ${gerekY} istiyor. Biraz eksik; rakip zayıf oynuyorsa (implied odds) savunulabilir.`, ay);
    return NOT('iyi', 'İyi call', `${kalanOut}Equity'n ${eqY}, pot ${gerekY} istiyor. Call mantıklı.`, ay);
  }

  if (tur === 'bet' || tur === 'raise' || tur === 'allin') {
    if (eq >= a.degerEsigi) return NOT('iyi', 'Güzel value bet', `Equity'n ${eqY}; elin güçlü. Bahis açıp rakibin call etmesini sağlamak doğru.`, ay);
    if (a.outs >= 8 && a.kalanSokak > 0) return NOT('iyi', 'Yarı blöf', `${kalanOut}Bet ile hem rakibi fold ettirebilir hem kartını bulabilirsin (semi-bluff).`, ay);
    if (tur === 'allin' && ey.miktar === undefined && d.cip > d.pot * 2 && eq < 0.6) {
      return NOT('hata', 'Riskli all-in', `Equity'n ${eqY}; pot'a göre çok büyük bir bahis. Bu kadar riske girmeye değmez.`, ay);
    }
    if (eq >= a.ref + 0.05) return NOT(d.cagri > 0 ? 'supheli' : 'iyi', 'Orta güçte bahis', `Equity'n ${eqY}; orta güçte bir el. ${d.cagri > 0 ? 'Raise yerine call daha güvenli olabilir.' : 'İnce bir value bet; rakip call edecek kadar zayıfsa kârlı.'}`, ay);
    if (eq < a.ref - 0.1) return NOT('hata', 'Zayıf elle blöf', `Equity'n ${eqY} ve çekişin yok. Rakibi fold ettirecek hikayen de yoksa bu blöf riskli.`, ay);
    return NOT('supheli', 'Blöf', `Equity'n ${eqY}. Bu bir blöf; sadece rakip fold ederse kazanırsın. Dikkatli kullan.`, ay);
  }
  return NOT('iyi', 'Sorun yok', 'Bu karar makul.', ay);
}

// ---------- ipucu ----------

function raiseHedefi(gorunum, d, oran) {
  // "raise to" miktarı: bu sokakta toplam koyulacak. min..max aralığına sıkıştırılır.
  const enAz = Math.max(gorunum.enAzRaise, d.bb);
  const enFazla = d.benimBahis + d.cip;
  const ham = gorunum.mevcutBahis + Math.round(oran * (d.pot + d.cagri));
  return Math.max(Math.min(enAz, enFazla), Math.min(ham, enFazla));
}

// Preflop raise: ilk raise'de 3 büyük blind, re-raise'de mevcut bahsin 3 katı.
function preflopRaiseHedefi(gorunum, d) {
  const ham = d.yukseltildi ? 3 * gorunum.mevcutBahis : 3 * d.bb;
  const enFazla = d.benimBahis + d.cip;
  return Math.min(enFazla, Math.max(ham, gorunum.enAzRaise));
}

export function ipucu(gorunum, { rng } = {}) {
  const d = durumCikar(gorunum);
  if (!gorunum.benimKartlarim) {
    return { onerilen: d.cagri > 0 ? 'call' : 'check', mesaj: 'Kartların henüz bilinmiyor.', ayrinti: { equity: null, gerekenEquity: null, outs: 0 } };
  }
  const acik = gorunum.mevcutBahis === 0; // bet / check durumu
  const raiseVar = d.cip > d.cagri; // raise için fişi var mı
  const agresifTur = acik ? 'bet' : 'raise';

  if (gorunum.sokak === 'preflop') {
    const ay = preflopAyrinti(gorunum, d, rng);
    const sinif = preflopSinifi(gorunum.benimKartlarim, d);
    const ad = elAdi(gorunum.benimKartlarim);
    if (sinif === 'premium' && raiseVar) {
      const miktar = preflopRaiseHedefi(gorunum, d);
      return { onerilen: 'raise', mesaj: `${ad} premium bir el. Raise et ve pot'u büyüt.`, ayrinti: { ...ay, miktar } };
    }
    if ((sinif === 'guclu' || sinif === 'oynanir') && !d.yukseltildi && raiseVar && d.cagri <= d.bb) {
      const miktar = preflopRaiseHedefi(gorunum, d);
      return { onerilen: 'raise', mesaj: `${ad} ${d.poz} pozisyonunda oynanır. Limp yerine ${Math.round(miktar / d.bb)} büyük blind raise et.`, ayrinti: { ...ay, miktar } };
    }
    if (sinif === 'guclu' || sinif === 'oynanir') {
      return { onerilen: 'call', mesaj: `${ad} ${d.poz} pozisyonunda oynanır. Call et.`, ayrinti: ay };
    }
    if (d.cagri === 0) return { onerilen: 'check', mesaj: `${ad} zayıf ama check bedava; kartları ucuza gör.`, ayrinti: ay };
    return { onerilen: 'fold', mesaj: `${ad} ${d.poz} pozisyonunda zayıf. Fold et; her elde oynamak para kaybettirir.`, ayrinti: ay };
  }

  const a = postflopAnaliz(gorunum, d, rng);
  const eq = a.equity - a.adj;
  const ay = { equity: a.equity, gerekenEquity: a.gerek, outs: a.outs };
  const kalanOut = outMetni(a);

  if (d.cagri === 0) {
    if (eq >= a.degerEsigi && raiseVar) {
      return { onerilen: agresifTur, mesaj: `Equity'n ${yuzde(a.equity)}, elin güçlü. Pot'un yarısı-üçte ikisi kadar bahis aç (value bet).`, ayrinti: { ...ay, miktar: raiseHedefi(gorunum, d, 0.6) } };
    }
    return { onerilen: 'check', mesaj: `${kalanOut}Equity'n ${yuzde(a.equity)}; bahis açacak kadar güçlü değil. Check et.`, ayrinti: ay };
  }
  if (eq >= a.cokGuclu && raiseVar && d.cip > d.cagri * 2) {
    return { onerilen: 'raise', mesaj: `Elin çok güçlü (equity ${yuzde(a.equity)}). Sadece call etme, raise ile değer al.`, ayrinti: { ...ay, miktar: raiseHedefi(gorunum, d, 0.8) } };
  }
  if (eq >= a.gerek + 0.03) {
    return { onerilen: 'call', mesaj: `${kalanOut}Equity'n ${yuzde(a.equity)}, pot ${yuzde(a.gerek)} istiyor. Call mantıklı.`, ayrinti: ay };
  }
  return { onerilen: 'fold', mesaj: `${kalanOut}Equity'n ${yuzde(a.equity)}, pot ${yuzde(a.gerek)} istiyor. Fold et.`, ayrinti: ay };
}
