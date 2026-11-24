// Ders müfredatı testleri: şema, kart geçerliliği, tekrar ve cevap doğruluğu.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SEVIYELER } from '../js/dersler/mufredat.js';

const KART_RE = /^[23456789TJQKA][shdc]$/;
const DEGER = '23456789TJQKA';
const PROFILLER = ['pasifAcemi', 'sikiPasif', 'gevsekAgresif', 'blofcu', 'akilli'];
const POZ = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];

// ---- Bağımsız değerlendirici (motor yoksa da cevapları doğrular) ----
function skor5(k) {
  const v = k.map((c) => DEGER.indexOf(c[0]) + 2).sort((a, b) => b - a);
  const flos = k.every((c) => c[1] === k[0][1]);
  const say = {};
  v.forEach((x) => (say[x] = (say[x] || 0) + 1));
  const gruplar = Object.entries(say).map(([d, n]) => [n, +d]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let sirali = new Set(v).size === 5 && v[0] - v[4] === 4;
  let yuksek = v[0];
  if (!sirali && new Set(v).size === 5 && v.join() === '14,5,4,3,2') { sirali = true; yuksek = 5; }
  const dizi = gruplar.map((g) => g[1]);
  let kat;
  if (sirali && flos) kat = yuksek === 14 ? 9 : 8;
  else if (gruplar[0][0] === 4) kat = 7;
  else if (gruplar[0][0] === 3 && gruplar[1][0] === 2) kat = 6;
  else if (flos) kat = 5;
  else if (sirali) kat = 4;
  else if (gruplar[0][0] === 3) kat = 3;
  else if (gruplar[0][0] === 2 && gruplar[1][0] === 2) kat = 2;
  else if (gruplar[0][0] === 2) kat = 1;
  else kat = 0;
  return [kat, ...(sirali ? [yuksek] : dizi)];
}
function karsilas(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}
function kombinasyonlar(d, n) {
  if (n === 0) return [[]];
  if (d.length < n) return [];
  const [ilk, ...son] = d;
  return [...kombinasyonlar(son, n - 1).map((k) => [ilk, ...k]), ...kombinasyonlar(son, n)];
}
function enIyiSkor(kartlar) {
  return kombinasyonlar(kartlar, 5).map(skor5).reduce((m, s) => (karsilas(s, m) > 0 ? s : m));
}
function hangisiBeklenen(s) {
  const a = s.board ? [...s.elA, ...s.board] : s.elA;
  const b = s.board ? [...s.elB, ...s.board] : s.elB;
  const c = karsilas(enIyiSkor(a), enIyiSkor(b));
  return c > 0 ? 'A' : c < 0 ? 'B' : 'esit';
}

// ---- Yardımcılar ----
function kartlariTopla(o) {
  const t = [];
  if (!o) return t;
  for (const alan of ['kartlar', 'board', 'elA', 'elB']) if (Array.isArray(o[alan])) t.push(...o[alan]);
  if (Array.isArray(o.el)) t.push(...o.el);
  else if (o.el && typeof o.el === 'object') t.push(...(o.el.kartlar || []), ...(o.el.board || []));
  return t;
}
function tumKartlar(sev) {
  const liste = [];
  sev.dersler.forEach((d) => liste.push(['ders', d, kartlariTopla(d)]));
  sev.alistirmalar.forEach((s) => liste.push(['soru', s, kartlariTopla(s)]));
  if (sev.gorev.hazirKartlar) {
    const h = sev.gorev.hazirKartlar;
    liste.push(['gorev', h, [...h.insan, ...h.bot1, ...h.board]]);
  }
  return liste;
}
const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
function kesinOlasilik(outs, kalanSokak) {
  const bilinmeyen = kalanSokak === 2 ? 47 : 46;
  return kalanSokak === 2 ? 1 - C(bilinmeyen - outs, 2) / C(bilinmeyen, 2) : outs / bilinmeyen;
}

// Motor varsa onunla da doğrula
let motor = null;
if (fs.existsSync(new URL('../js/motor/degerlendirici.js', import.meta.url))) {
  try { motor = await import('../js/motor/degerlendirici.js'); } catch { motor = null; }
}

test('müfredat 11 seviye, id 0..10 sıralı', () => {
  assert.equal(SEVIYELER.length, 11);
  SEVIYELER.forEach((s, i) => assert.equal(s.id, i));
});

for (const sev of SEVIYELER) {
  const ad = `Seviye ${sev.id}`;

  test(`${ad}: şema`, () => {
    for (const a of ['baslik', 'ozet']) assert.ok(typeof sev[a] === 'string' && sev[a].length > 3, a);
    assert.ok(Array.isArray(sev.kazanim) && sev.kazanim.length >= 2);
    assert.ok(sev.dersler.length >= 2 && sev.dersler.length <= 5, 'ders sayısı 2–5');
    sev.dersler.forEach((d) => {
      assert.ok(d.baslik && d.metin);
      assert.ok(d.metin.length > 80);
    });
    assert.ok(sev.alistirmalar.length >= 5 && sev.alistirmalar.length <= 12, 'alıştırma sayısı 5–12');
    assert.ok(['acik', 'istege', 'kapali'].includes(sev.ozellikler.koc));
    assert.equal(typeof sev.ozellikler.saymaPaneli, 'boolean');
    assert.equal(typeof sev.ozellikler.outIpucu, 'boolean');
    const beklenenKoc = sev.id <= 6 ? 'acik' : sev.id <= 9 ? 'istege' : 'kapali';
    assert.equal(sev.ozellikler.koc, beklenenKoc);
    assert.equal(sev.ozellikler.saymaPaneli, sev.id >= 5);
  });

  test(`${ad}: kartlar geçerli ve tekrarsız`, () => {
    for (const [tip, nesne, kartlar] of tumKartlar(sev)) {
      kartlar.forEach((k) => assert.match(k, KART_RE, `${tip}: ${k}`));
      assert.equal(new Set(kartlar).size, kartlar.length, `${tip}: tekrar eden kart ${kartlar.join(' ')}`);
    }
  });

  test(`${ad}: sorular`, () => {
    for (const s of sev.alistirmalar) {
      switch (s.tur) {
        case 'secmeli':
          assert.ok(s.soru && s.aciklama);
          assert.ok(Array.isArray(s.secenekler) && s.secenekler.length >= 2);
          assert.ok(Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < s.secenekler.length, s.soru);
          assert.equal(new Set(s.secenekler).size, s.secenekler.length, 'seçenekler tekrarsız');
          break;
        case 'hangisiGuclu': {
          assert.ok(s.aciklama);
          if (s.board) { assert.equal(s.board.length, 5); assert.equal(s.elA.length, 2); assert.equal(s.elB.length, 2); }
          else { assert.equal(s.elA.length, 5); assert.equal(s.elB.length, 5); }
          const hepsi = [...(s.board || []), ...s.elA, ...s.elB];
          assert.equal(new Set(hepsi).size, hepsi.length, 'A/B/board arasında kart tekrarı');
          assert.ok(['A', 'B', 'esit'].includes(s.dogru));
          assert.equal(hangisiBeklenen(s), s.dogru, `bağımsız değerlendirici: ${hepsi.join(' ')}`);
          if (motor) {
            const a = motor.degerlendir(s.board ? [...s.elA, ...s.board] : s.elA);
            const b = motor.degerlendir(s.board ? [...s.elB, ...s.board] : s.elB);
            const m = a.puan > b.puan ? 'A' : a.puan < b.puan ? 'B' : 'esit';
            assert.equal(m, s.dogru, `motor: ${hepsi.join(' ')}`);
          }
          break;
        }
        case 'enIyi5':
          assert.ok(s.aciklama);
          assert.equal(s.kartlar.length, 7);
          break;
        case 'outSay':
          assert.ok(['flos', 'acikUcluSirali', 'icSirali', 'karisik'].includes(s.uret.cekis));
          break;
        case 'oynaAt':
          assert.equal(s.el.length, 2);
          assert.ok(POZ.includes(s.pozisyon));
          assert.ok(['oyna', 'at'].includes(s.dogru));
          assert.ok(s.aciklama);
          break;
        case 'potOrani': {
          assert.ok(s.aciklama);
          assert.ok([1, 2].includes(s.kalanSokak));
          const gereken = s.call / (s.pot + s.call);
          const kesin = kesinOlasilik(s.outs, s.kalanSokak);
          const kural = Math.min(1, (s.outs * (s.kalanSokak === 2 ? 4 : 2)) / 100);
          const beklenen = kesin > gereken ? 'call' : 'fold';
          assert.equal(s.dogru, beklenen, `pot oranı: kesin ${kesin.toFixed(3)} gereken ${gereken.toFixed(3)}`);
          assert.ok(Math.abs(kesin - gereken) >= 0.02, 'cevap sınırda, belirsiz');
          assert.equal(kural > gereken ? 'call' : 'fold', s.dogru, '2-4 kuralı da aynı kararı vermeli');
          break;
        }
        case 'sonrakiKart':
          assert.ok(['renk', 'deger', 'resimli'].includes(s.uret.soru));
          break;
        default:
          assert.fail(`bilinmeyen soru türü: ${s.tur}`);
      }
    }
  });

  test(`${ad}: görev`, () => {
    const g = sev.gorev;
    assert.ok(['quiz', 'yonlendirmeliEl', 'masa'].includes(g.tur));
    assert.ok(Array.isArray(g.yildiz) && g.yildiz.length === 3);
    if (g.tur === 'quiz') {
      assert.ok(g.soruSayisi <= sev.alistirmalar.length);
      assert.ok(g.yildiz.every((y) => y >= 1 && y <= g.soruSayisi));
    }
    if (g.tur === 'yonlendirmeliEl') {
      assert.ok(g.adimlar.length >= 3);
      g.botlar.forEach((b) => assert.ok(PROFILLER.includes(b)));
      assert.equal(g.hazirKartlar.insan.length, 2);
      assert.equal(g.hazirKartlar.bot1.length, 2);
      assert.equal(g.hazirKartlar.board.length, 5);
      // İnsan oyuncu kazanmalı
      const b = g.hazirKartlar.board;
      const sonuc = karsilas(enIyiSkor([...g.hazirKartlar.insan, ...b]), enIyiSkor([...g.hazirKartlar.bot1, ...b]));
      assert.equal(sonuc, 1, 'insan elinin kazanması gerekir');
    }
    if (g.tur === 'masa') {
      assert.ok(g.botlar.length >= 1 && g.botlar.length <= 5);
      g.botlar.forEach((b) => assert.ok(PROFILLER.includes(b), b));
      assert.ok(g.baslangicCip > 0 && g.kucukBlind > 0 && g.buyukBlind >= g.kucukBlind);
      assert.ok(['elBasi', 'ayakkabi'].includes(g.desteModu));
      assert.ok(g.elSayisi > 0);
      assert.ok(['cipKazan', 'hayattaKal', 'birinciOl', 'dogruKarar'].includes(g.hedef.tur));
      if (g.araSorular) assert.ok(['outSay', 'sonrakiKart'].includes(g.araSorular.tur));
    }
  });
}

test('seviye özel gereksinimleri', () => {
  const [, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10] = SEVIYELER;
  const say = (s, t) => s.alistirmalar.filter((x) => x.tur === t).length;
  assert.equal(SEVIYELER[0].gorev.tur, 'quiz');
  assert.ok(say(s1, 'hangisiGuclu') >= 4 && say(s1, 'enIyi5') >= 2 && s1.gorev.tur === 'quiz');
  assert.equal(s2.gorev.tur, 'yonlendirmeliEl');
  assert.equal(s3.gorev.tur, 'masa'); assert.deepEqual(s3.gorev.botlar, ['pasifAcemi']);
  assert.equal(s3.gorev.hedef.tur, 'cipKazan');
  assert.ok(say(s4, 'oynaAt') >= 6);
  assert.ok(say(s5, 'outSay') >= 3 && say(s5, 'secmeli') >= 3);
  assert.equal(s5.gorev.araSorular.tur, 'outSay'); assert.ok(s5.ozellikler.outIpucu);
  assert.ok(say(s6, 'potOrani') >= 5); assert.equal(s6.gorev.hedef.tur, 'dogruKarar');
  assert.equal(s7.gorev.desteModu, 'ayakkabi'); assert.equal(s7.gorev.elSonuKartlariAc, true);
  assert.equal(s7.gorev.araSorular.tur, 'sonrakiKart');
  assert.equal(s8.gorev.botlar.length, 3);
  assert.deepEqual([...new Set(s9.gorev.botlar)].length, s9.gorev.botlar.length);
  assert.equal(s10.gorev.botlar.length, 5);
  assert.ok(s10.gorev.blindArtis); assert.equal(s10.gorev.hedef.tur, 'birinciOl');
});
