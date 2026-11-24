import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  metinParcala, yildizHesapla, quizSonucu, masaSonucu, yonlendirmeliSonucu, siraHesapla, enIyi5Dogrula,
  hangisiGucluCoz, gorunurOlay, olayMetni, eylemEtiketi, sonucMetni, hizliTutarlar, kaydiriciDegeri,
  sayiBicim, isaretliBicim, yuzde, ayrintiSatirlari, sonrakiKartSorusu, siraliTamamlayanlar, quizSorulariSec,
} from '../js/ui/mantik.js';
import { soruHazirla, outSorusuUret } from '../js/ui/soruUret.js';
import { outlariBul } from '../js/analiz/outs.js';
import { tohumluRng } from '../js/motor/rng.js';
import { tumKartlar } from '../js/motor/kart.js';
import { SEVIYELER } from '../js/dersler/mufredat.js';

test('metinParcala: paragraflar ve **kalın**, HTML yorumlanmaz', () => {
  const p = metinParcala('Bir **iki** üç.\n\n<b>dört</b> **beş**');
  assert.equal(p.length, 2);
  assert.deepEqual(p[0], [{ kalin: false, metin: 'Bir ' }, { kalin: true, metin: 'iki' }, { kalin: false, metin: ' üç.' }]);
  assert.deepEqual(p[1], [{ kalin: false, metin: '<b>dört</b> ' }, { kalin: true, metin: 'beş' }]);
});

test('yildizHesapla: artan eşikler ve birinciOl', () => {
  assert.equal(yildizHesapla('cipKazan', 99, [100, 250, 500]), 0);
  assert.equal(yildizHesapla('cipKazan', 250, [100, 250, 500]), 2);
  assert.equal(yildizHesapla('quiz', 8, [5, 7, 8]), 3);
  assert.equal(yildizHesapla('birinciOl', 1, [3, 2, 1]), 3);
  assert.equal(yildizHesapla('birinciOl', 2, [3, 2, 1]), 2);
  assert.equal(yildizHesapla('birinciOl', 3, [3, 2, 1]), 1);
  assert.equal(yildizHesapla('birinciOl', 4, [3, 2, 1]), 0);
});

test('quiz ve yönlendirmeli sonuç', () => {
  assert.equal(quizSonucu({ yildiz: [5, 7, 8] }, 6, 8).yildiz, 1);
  assert.equal(quizSonucu({ yildiz: [5, 7, 8] }, 4, 8).basarili, false);
  const g = { yildiz: [1, 1, 1] };
  assert.equal(yonlendirmeliSonucu(g, { tamamlandi: true, foldEtti: false }).yildiz, 3);
  assert.equal(yonlendirmeliSonucu(g, { tamamlandi: true, foldEtti: true }).yildiz, 0);
});

test('masaSonucu: hedef yorumları ve elenme', () => {
  const cip = SEVIYELER[3].gorev;
  assert.equal(masaSonucu(cip, { netCip: 260, iyiKarar: 0, elendi: false, sira: 1, oynananEl: 12 }).yildiz, 2);
  assert.equal(masaSonucu(cip, { netCip: 600, iyiKarar: 0, elendi: true, sira: 2, oynananEl: 5 }).yildiz, 0);
  const karar = SEVIYELER[6].gorev;
  assert.equal(masaSonucu(karar, { netCip: -50, iyiKarar: 9, elendi: false, sira: 2, oynananEl: 12 }).yildiz, 2);
  const final = SEVIYELER[10].gorev;
  assert.equal(masaSonucu(final, { netCip: -1500, iyiKarar: 0, elendi: true, sira: 3, oynananEl: 40 }).yildiz, 1);
  assert.equal(masaSonucu(final, { netCip: 7500, iyiKarar: 0, elendi: false, sira: 1, oynananEl: 80 }).yildiz, 3);
  const kal = { hedef: { tur: 'hayattaKal' }, elSayisi: 10, yildiz: [10, 10, 10] };
  assert.equal(masaSonucu(kal, { netCip: 0, iyiKarar: 0, elendi: false, sira: 2, oynananEl: 10 }).yildiz, 3);
});

test('siraHesapla', () => {
  assert.equal(siraHesapla({ benimCip: 0, digerCipler: [500, 0, 300, 0, 0], elendi: true }), 3);
  assert.equal(siraHesapla({ benimCip: 400, digerCipler: [500, 0, 300], elendi: false }), 2);
  assert.equal(siraHesapla({ benimCip: 900, digerCipler: [0, 0], elendi: false }), 1);
});

test('enIyi5Dogrula ve hangisiGucluCoz motorla', () => {
  const k7 = ['Ah', 'Ad', 'Ks', 'Kd', '7c', '4h', '2s'];
  assert.equal(enIyi5Dogrula(k7, ['Ah', 'Ad', 'Ks', 'Kd', '7c']).dogru, true);
  assert.equal(enIyi5Dogrula(k7, ['Ah', 'Ad', 'Ks', 'Kd', '4h']).dogru, false);
  assert.equal(enIyi5Dogrula(k7, ['Ah', 'Ad']).dogru, false);
  // Dersteki tüm hangisiGuclu sorularında veri ile motor aynı cevabı vermeli
  for (const s of SEVIYELER) {
    for (const q of s.alistirmalar.filter((x) => x.tur === 'hangisiGuclu')) {
      assert.equal(hangisiGucluCoz(q).dogru, q.dogru, `Seviye ${s.id}: ${q.aciklama}`);
    }
  }
});

test('gorunurOlay rakip kartlarını siler', () => {
  const o = { tur: 'kartDagitildi', oyuncuId: 'bot1', kartlar: ['Ah', 'Kd'] };
  assert.equal(gorunurOlay(o, 'sen').kartlar, null);
  assert.deepEqual(gorunurOlay({ ...o, oyuncuId: 'sen' }, 'sen').kartlar, ['Ah', 'Kd']);
  assert.equal(olayMetni(gorunurOlay(o, 'sen'), { bot1: 'Zeynep' }), null);
});

test('olay metinleri ve etiketler', () => {
  const adlar = { bot1: 'Zeynep' };
  assert.equal(olayMetni({ tur: 'eylem', oyuncuId: 'bot1', eylem: 'raise', miktar: 40, eklenen: 30 }, adlar), 'Zeynep 40 raise etti.');
  assert.equal(olayMetni({ tur: 'eylem', oyuncuId: 'sen', eylem: 'call', miktar: 20, eklenen: 10 }, adlar), 'Sen 10 call ettin.');
  assert.equal(olayMetni({ tur: 'sokak', sokak: 'flop', yeniKartlar: ['Ah', '7s', '2c'], board: [] }, adlar), 'Flop: Kupa As, Maça 7, Sinek 2.');
  assert.deepEqual(eylemEtiketi({ eylem: 'call', miktar: 20, eklenen: 10 }), { metin: 'Call 10', tur: '' });
  assert.deepEqual(eylemEtiketi({ eylem: 'raise', miktar: 60, eklenen: 60 }), { metin: 'Raise 60', tur: 'agresif' });
  assert.equal(sonucMetni([{ miktar: 520, kazananlar: ['bot1'] }], adlar), 'Zeynep kazandı +520');
  assert.equal(sonucMetni([{ miktar: 100, kazananlar: ['sen', 'bot1'] }], adlar), 'Kazandın +50 · Zeynep kazandı +50');
});

test('biçimler', () => {
  assert.equal(sayiBicim(1020), '1.020');
  assert.equal(sayiBicim(1500000), '1.500.000');
  assert.equal(isaretliBicim(-40), '−40');
  assert.equal(isaretliBicim(250), '+250');
  assert.equal(yuzde(0.364), '%36');
  assert.deepEqual(ayrintiSatirlari({ equity: 0.36, gerekenEquity: 0.25, outs: 9 }), [['Equity', '%36'], ['Gereken', '%25'], ['Out', '9']]);
  assert.deepEqual(ayrintiSatirlari({ equity: null, outs: 0 }), []);
});

test('hızlı tutarlar ve kaydırıcı sınırları', () => {
  const g = { potToplam: 60, mevcutBahis: 20 };
  const h = hizliTutarlar(g, 20, { min: 40, max: 980 }, 10);
  assert.equal(h.pot, 100); // 20 + (60 + 20)
  assert.equal(h.yarimPot, 60);
  assert.equal(h.allin, 980);
  assert.equal(hizliTutarlar({ potToplam: 30, mevcutBahis: 20 }, 10, { min: 40, max: 50 }, 10).pot, 50);
  assert.equal(kaydiriciDegeri(977, { min: 40, max: 980 }, 10), 980);
  assert.equal(kaydiriciDegeri(974, { min: 40, max: 980 }, 10), 970);
  assert.equal(kaydiriciDegeri(12, { min: 40, max: 980 }, 10), 40);
});

test('sonrakiKartSorusu doğru oranı verir', () => {
  const gorulen = ['Ah', 'Kh', '7h', '2c', '9d'];
  const bilinmeyen = tumKartlar().filter((k) => !gorulen.includes(k));
  const rng = tohumluRng(1);
  for (let i = 0; i < 30; i++) {
    for (const tip of ['renk', 'deger', 'resimli']) {
      const s = sonrakiKartSorusu({ gorulen, bilinmeyen, tip, rng });
      assert.equal(s.secenekler.length, 4);
      assert.equal(new Set(s.secenekler).size, 4);
      assert.ok(s.dogru >= 0 && s.dogru < 4);
      if (tip === 'resimli') assert.equal(s.secenekler[s.dogru], `%${Math.round((11 / 47) * 100)}`);
    }
  }
});

test('siraliTamamlayanlar', () => {
  assert.deepEqual(siraliTamamlayanlar(['9s', '8s', '7d', '6c', '2h']), [5, 10]);
  assert.deepEqual(siraliTamamlayanlar(['Jd', 'Tc', '8h', '7s', '2c']), [9]);
  assert.deepEqual(siraliTamamlayanlar(['Ah', '2c', '3d', '4s', 'Kh']), [5]);
});

test('outSay üretimi: istenen çekiş, cevap outlariBul ile aynı', () => {
  const rng = tohumluRng(42);
  for (const cekis of ['flos', 'acikUcluSirali', 'icSirali', 'karisik']) {
    for (let i = 0; i < 25; i++) {
      const s = outSorusuUret(cekis, rng);
      assert.equal(s.kartlar.length, 2);
      assert.equal(s.board.length, 3);
      assert.equal(new Set([...s.kartlar, ...s.board]).size, 5);
      const dogru = Number(s.secenekler[s.dogru]);
      assert.equal(dogru, outlariBul(s.kartlar, s.board).toplam);
      assert.equal(new Set(s.secenekler).size, s.secenekler.length);
      if (cekis === 'flos') assert.equal(dogru, 9);
      if (cekis === 'acikUcluSirali') assert.equal(dogru, 8);
      if (cekis === 'icSirali') assert.equal(dogru, 4);
    }
  }
});

test('soruHazirla müfredattaki her soruyu çizilebilir biçime getirir', () => {
  const rng = tohumluRng(7);
  for (const s of SEVIYELER) {
    for (const q of s.alistirmalar) {
      const h = soruHazirla(q, { rng });
      assert.ok(['secmeli', 'hangisiGuclu', 'enIyi5'].includes(h.tur), `${s.id}: ${q.tur}`);
      assert.ok(h.soru, `${s.id}: soru metni`);
      if (h.tur === 'secmeli') assert.ok(h.dogru >= 0 && h.dogru < h.secenekler.length);
    }
  }
});

test('quizSorulariSec benzersiz n soru', () => {
  const r = quizSorulariSec(SEVIYELER[0].alistirmalar, 8, tohumluRng(3));
  assert.equal(r.length, 8);
  assert.equal(new Set(r).size, 8);
});
