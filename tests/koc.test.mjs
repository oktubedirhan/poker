import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kararDegerlendir, ipucu, preflopSinifi, chenPuani, elBilgisi } from '../js/analiz/koc.js';
import { Oyun } from '../js/motor/oyun.js';
import { tohumluRng } from '../js/motor/rng.js';
import seviye04 from '../js/dersler/seviye-04.js';

// Elle kurulmuş görünüm (Oyun.gorunum biçimi). benimBahis: bu sokakta zaten koyduğum.
function gv({ sokak = 'flop', el, board = [], pot = 100, mevcut = 0, benimBahis = 0, cip = 1000, rakipler = 1, poz = 'BTN', bb = 20 }) {
  const oyuncular = [{ id: 'sen', ad: 'Sen', cip, bahis: benimBahis, toplamBahis: benimBahis, dusuk: false, allIn: false, oturuyor: true, acikKartlar: null, pozisyon: poz }];
  for (let i = 1; i <= rakipler; i++) {
    oyuncular.push({ id: `bot${i}`, ad: `Bot ${i}`, cip: 1000, bahis: mevcut, toplamBahis: mevcut, dusuk: false, allIn: false, oturuyor: true, acikKartlar: null, pozisyon: 'BB' });
  }
  return {
    elNo: 1, sokak, board, potToplam: pot, mevcutBahis: mevcut, enAzRaise: mevcut + Math.max(mevcut, bb),
    kucukBlind: bb / 2, buyukBlind: bb, benimId: 'sen', benimKartlarim: el, oyuncular, gecmis: [],
  };
}
const preflop = (el, poz, { mevcut = 20, cip = 2000 } = {}) =>
  gv({ sokak: 'preflop', el, pot: 30 + (mevcut > 20 ? mevcut : 0), mevcut, poz, benimBahis: poz === 'BB' ? 20 : 0, cip });
const not = (g, tur, miktar) => kararDegerlendir(g, { tur, miktar }, { rng: tohumluRng(1) });

test('preflop: seviye-04 alıştırmalarıyla tutarlı (oyna ⇔ zayıf değil)', () => {
  const sorular = seviye04.alistirmalar.filter((s) => s.tur === 'oynaAt');
  assert.ok(sorular.length >= 10);
  for (const s of sorular) {
    const sinif = preflopSinifi(s.el, { poz: s.pozisyon, cagri: 20, buyukBlind: 20, cip: 2000, yukseltildi: false });
    assert.equal(sinif !== 'zayif', s.dogru === 'oyna', `${s.el.join('')} ${s.pozisyon}: ${sinif}`);
  }
});

test('preflop: 7-2 UTG → fold iyi, raise hata', () => {
  const g = preflop(['7h', '2d'], 'UTG');
  assert.equal(not(g, 'fold').not, 'iyi');
  assert.equal(not(g, 'raise', 60).not, 'hata');
  assert.notEqual(not(g, 'call').not, 'iyi');
});

test('preflop: As-As → fold hata, sadece call şüpheli, raise iyi', () => {
  const g = preflop(['As', 'Ad'], 'UTG');
  assert.equal(not(g, 'fold').not, 'hata');
  assert.equal(not(g, 'call').not, 'supheli');
  assert.equal(not(g, 'raise', 60).not, 'iyi');
});

test('preflop: BTN J♠10♠ oynanır, UTG K-J offsuit fold', () => {
  assert.equal(not(preflop(['Js', 'Ts'], 'BTN'), 'raise', 60).not, 'iyi');
  assert.equal(not(preflop(['Js', 'Ts'], 'BTN'), 'call').not, 'iyi');
  assert.equal(not(preflop(['Ks', 'Jd'], 'UTG'), 'fold').not, 'iyi');
});

test('preflop: bedava check atılmaz; pahalı raise\'e zayıf el call etmek hata', () => {
  const bb = preflop(['9d', '2c'], 'BB');
  assert.equal(not(bb, 'fold').not, 'hata');
  assert.equal(not(bb, 'check').not, 'iyi');
  const pahali = preflop(['9d', '2c'], 'BB', { mevcut: 120 });
  assert.equal(not(pahali, 'call').not, 'hata');
  assert.equal(not(pahali, 'fold').not, 'iyi');
});

test('onemli: yalnız bahisle karşılaşılan ya da bahis yapılan kararlar', () => {
  // Bedava check (preflop BB ve postflop) önemli değil
  const bb = preflop(['9d', '2c'], 'BB');
  assert.equal(not(bb, 'check').onemli, false);
  assert.equal(not(bb, 'raise', 60).onemli, true);
  const bos = gv({ el: ['7h', '2d'], board: ['Ac', 'Kd', '9s'], pot: 100 });
  assert.equal(not(bos, 'check').not, 'iyi');
  assert.equal(not(bos, 'check').onemli, false);
  assert.equal(not(bos, 'fold').onemli, false); // bedava fold: hata ama önemli sayılmaz
  assert.equal(not(bos, 'bet', 50).onemli, true);
  // Bahisle karşılaşınca fold / call / raise önemli
  const bahis = gv({ el: ['7h', '2d'], board: ['Ac', 'Kd', '9s'], pot: 200, mevcut: 100 });
  for (const tur of ['fold', 'call']) assert.equal(not(bahis, tur).onemli, true, tur);
  assert.equal(not(bahis, 'raise', 300).onemli, true);
  assert.equal(not(bahis, 'allin').onemli, true);
});

test('preflop yardımcıları: Chen puanı ve el bilgisi', () => {
  assert.equal(chenPuani(['As', 'Ad']), 20);
  assert.equal(chenPuani(['As', 'Ks']), 12);
  assert.ok(chenPuani(['7h', '2d']) < 0 + 1);
  assert.equal(elBilgisi(['Ah', 'Kd']).ad, 'AKo');
  assert.equal(elBilgisi(['9s', '8s']).ad, '98s');
  assert.equal(elBilgisi(['Qs', 'Qd']).ad, 'QQ');
});

test('postflop: bedava check\'i fold etmek hata', () => {
  const g = gv({ el: ['7h', '2d'], board: ['Ac', 'Kd', '9s'], pot: 100 });
  const r = not(g, 'fold');
  assert.equal(r.not, 'hata');
  assert.match(r.baslik + r.mesaj, /check/i);
  assert.equal(not(g, 'check').not, 'iyi');
});

test('postflop: floş çekişi ucuza call iyi, fold hata; ayrıntı alanları dolu', () => {
  const g = gv({ el: ['Ah', '5h'], board: ['Kh', '9h', '2c'], pot: 125, mevcut: 25 });
  const c = not(g, 'call');
  assert.equal(c.not, 'iyi');
  assert.equal(c.ayrinti.outs, 9);
  assert.ok(Math.abs(c.ayrinti.gerekenEquity - 25 / 150) < 1e-9);
  assert.ok(c.ayrinti.equity > c.ayrinti.gerekenEquity);
  assert.match(c.mesaj, /9 out/);
  assert.match(c.mesaj, /%36/);
  assert.equal(not(g, 'fold').not, 'hata');
  for (const alan of ['not', 'baslik', 'mesaj', 'ayrinti']) assert.ok(c[alan] !== undefined);
});

test('postflop: çöp elle büyük bahse call hata, fold iyi', () => {
  const g = gv({ el: ['7h', '2d'], board: ['Ac', 'Kd', '9s'], pot: 190, mevcut: 90 });
  assert.equal(not(g, 'call').not, 'hata');
  assert.equal(not(g, 'fold').not, 'iyi');
  assert.equal(not(g, 'raise', 300).not, 'hata');
});

test('postflop: çok güçlü elle sadece call şüpheli (value bet kaçırma), raise iyi', () => {
  const g = gv({ el: ['8h', '8d'], board: ['8c', '4d', '2h'], pot: 150, mevcut: 50 });
  const c = not(g, 'call');
  assert.equal(c.not, 'supheli');
  assert.match(c.baslik + c.mesaj, /value bet|raise/i);
  assert.equal(not(g, 'raise', 150).not, 'iyi');
  assert.equal(not(g, 'fold').not, 'hata');
  // bedava check ile de değer kaçırılır
  const serbest = gv({ el: ['8h', '8d'], board: ['8c', '4d', '2h'], pot: 100 });
  assert.equal(not(serbest, 'check').not, 'supheli');
  assert.equal(not(serbest, 'bet', 60).not, 'iyi');
});

test('postflop: çok rakipli potta orta el için check mantıklı', () => {
  const g = gv({ el: ['9h', '8d'], board: ['Ac', 'Kd', '3s'], pot: 200, rakipler: 4 });
  assert.equal(not(g, 'check').not, 'iyi');
});

test('postflop: yarı blöf (floş çekişiyle raise) iyi', () => {
  const g = gv({ el: ['Ah', '5h'], board: ['Kh', '9h', '2c'], pot: 125, mevcut: 25 });
  const r = not(g, 'raise', 80);
  assert.equal(r.not, 'iyi');
  assert.match(r.baslik, /blöf/i);
});

test('ipucu: biçim ve makul öneriler', () => {
  const r = (g) => ipucu(g, { rng: tohumluRng(1) });
  const draw = r(gv({ el: ['Ah', '5h'], board: ['Kh', '9h', '2c'], pot: 125, mevcut: 25 }));
  assert.equal(draw.onerilen, 'call');
  assert.ok(draw.mesaj.length > 10 && draw.ayrinti.outs === 9);
  assert.equal(r(gv({ el: ['7h', '2d'], board: ['Ac', 'Kd', '9s'], pot: 190, mevcut: 90 })).onerilen, 'fold');
  assert.equal(r(gv({ el: ['7h', '2d'], board: ['Ac', 'Kd', '9s'], pot: 100 })).onerilen, 'check');
  const guclu = r(gv({ el: ['8h', '8d'], board: ['8c', '4d', '2h'], pot: 100 }));
  assert.equal(guclu.onerilen, 'bet');
  assert.ok(Number.isInteger(guclu.ayrinti.miktar) && guclu.ayrinti.miktar > 0);
  assert.equal(r(gv({ el: ['8h', '8d'], board: ['8c', '4d', '2h'], pot: 150, mevcut: 50 })).onerilen, 'raise');
  assert.equal(r(preflop(['As', 'Ad'], 'UTG')).onerilen, 'raise');
  assert.equal(r(preflop(['7h', '2d'], 'UTG')).onerilen, 'fold');
  assert.equal(r(preflop(['7h', '2d'], 'BB')).onerilen, 'check');
});

test('gerçek Oyun görünümüyle: her karar için geçerli çıktı, hızlı', () => {
  const rng = tohumluRng(5);
  const oyun = new Oyun({
    oyuncular: [{ id: 'sen', cip: 2000 }, { id: 'bot1', cip: 2000 }, { id: 'bot2', cip: 2000 }],
    kucukBlind: 10, buyukBlind: 20, rng,
  });
  let enYavas = 0, karar = 0;
  const NOTLAR = ['iyi', 'supheli', 'hata'];
  const ONERI = ['fold', 'check', 'call', 'bet', 'raise', 'allin'];
  for (let el = 0; el < 25 && !oyun.oyunBittiMi(); el++) {
    oyun.yeniEl();
    while (!oyun.elBittiMi()) {
      const id = oyun.siradaki();
      const g = oyun.gecerliEylemler(id);
      if (id === 'sen') {
        const gor = oyun.gorunum('sen');
        const t0 = performance.now();
        const ip = ipucu(gor, { rng });
        const eylem = g.check ? { tur: 'check' } : { tur: 'call' };
        const kd = kararDegerlendir(gor, eylem, { rng });
        enYavas = Math.max(enYavas, performance.now() - t0);
        karar++;
        assert.ok(ONERI.includes(ip.onerilen), ip.onerilen);
        assert.ok(NOTLAR.includes(kd.not), kd.not);
        assert.ok(typeof kd.mesaj === 'string' && kd.mesaj.length > 0);
        assert.ok(kd.ayrinti && 'equity' in kd.ayrinti && 'gerekenEquity' in kd.ayrinti && 'outs' in kd.ayrinti);
        oyun.eylem(id, eylem);
      } else {
        oyun.eylem(id, g.check ? { tur: 'check' } : g.call !== null && rng.int(3) ? { tur: 'call' } : { tur: 'fold' });
      }
    }
  }
  console.log(`  [ölçüm] koç (ipucu + kararDegerlendir) en yavaş çift: ${enYavas.toFixed(0)} ms, ${karar} karar`);
  assert.ok(karar > 20);
  assert.ok(enYavas < 600, `koç çok yavaş: ${enYavas} ms`);
});

test('hız: tek kararDegerlendir (postflop, 3 rakip) < 150 ms', () => {
  const g = gv({ el: ['Ah', '5h'], board: ['Kh', '9h', '2c'], pot: 125, mevcut: 25, rakipler: 3 });
  not(g, 'call'); // ısınma
  const t0 = performance.now();
  not(g, 'call');
  const ms = performance.now() - t0;
  console.log(`  [ölçüm] kararDegerlendir postflop 3 rakip: ${ms.toFixed(0)} ms`);
  assert.ok(ms < 150, `${ms} ms`);
});

test('kartlar bilinmiyorsa çökmez', () => {
  const g = gv({ el: null, board: [], sokak: 'preflop' });
  assert.equal(kararDegerlendir(g, { tur: 'fold' }).not, 'iyi');
  assert.ok(ipucu(g).onerilen);
});
