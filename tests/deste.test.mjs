import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Deste } from '../js/motor/deste.js';
import { tohumluRng } from '../js/motor/rng.js';

test('yeni deste 52 kart, karılmış, dogrula geçer', () => {
  const d = new Deste({ rng: tohumluRng(1) });
  assert.equal(d.kalanSayisi(), 52);
  assert.equal(d.karistirmaSayisi, 1);
  assert.equal(d.dogrula(), true);
  const cekilen = Array.from({ length: 52 }, () => d.cek());
  assert.equal(new Set(cekilen).size, 52);
  assert.throws(() => d.cek(), /kalmadı/);
  d.dogrula();
});

test('aynı tohum aynı sıra', () => {
  const a = new Deste({ rng: tohumluRng(9) }), b = new Deste({ rng: tohumluRng(9) });
  assert.deepEqual(Array.from({ length: 10 }, () => a.cek()), Array.from({ length: 10 }, () => b.cek()));
});

test('elBasi modu: her yeniEl desteyi yeniden karar', () => {
  const d = new Deste({ mod: 'elBasi', rng: tohumluRng(2) });
  for (let i = 0; i < 10; i++) d.cek();
  assert.deepEqual(d.yeniEl(12), { karildi: true });
  assert.equal(d.kalanSayisi(), 52);
  assert.equal(d.cekilenler().length, 0);
  assert.equal(d.karistirmaSayisi, 2);
  d.dogrula();
});

test('ayakkabi modu: çekilen kartlar eller arası desteye dönmez', () => {
  const d = new Deste({ mod: 'ayakkabi', rng: tohumluRng(3) });
  const el1 = Array.from({ length: 12 }, () => d.cek());
  assert.deepEqual(d.yeniEl(12), { karildi: false });
  assert.equal(d.kalanSayisi(), 40);
  const el2 = Array.from({ length: 12 }, () => d.cek());
  assert.equal(new Set([...el1, ...el2]).size, 24);
  assert.deepEqual(d.cekilenler(), [...el1, ...el2]);
  d.dogrula();
  // 28 kart kaldı; 30 gerekirse karılır
  assert.deepEqual(d.yeniEl(30), { karildi: true });
  assert.equal(d.kalanSayisi(), 52);
  assert.equal(d.karistirmaSayisi, 2);
});

test('yak: kart çekilenlere ve yakılanlara eklenir', () => {
  const d = new Deste({ rng: tohumluRng(4) });
  d.cek();
  const y = d.yak();
  assert.deepEqual(d.yakilanlar(), [y]);
  assert.equal(d.cekilenler()[1], y);
  assert.equal(d.kalanSayisi(), 50);
  d.dogrula();
});

test('diz: verilen kartlar sırayla en üstte, kalanlar karışık', () => {
  const d = new Deste({ rng: tohumluRng(5) });
  d.cek();
  const ust = ['Ah', 'Kd', '2c', 'Ts'];
  d.diz(ust);
  assert.equal(d.kalanSayisi(), 52);
  assert.deepEqual(Array.from({ length: 4 }, () => d.cek()), ust);
  d.dogrula();
  assert.throws(() => d.diz(['Ah', 'Ah']), /Tekrarlanan/);
  assert.throws(() => d.diz(['Zz']), /Geçersiz/);
});

test('dogrula bozulmuş destede hata fırlatır', () => {
  const d = new Deste({ rng: tohumluRng(6) });
  d._kartlar[3] = d._kartlar[4];
  assert.throws(() => d.dogrula(), /tekrarlanan/);
  const d2 = new Deste({ rng: tohumluRng(6) });
  d2._kartlar.pop();
  assert.throws(() => d2.dogrula(), /51/);
});

test('geçersiz mod hata verir', () => {
  assert.throws(() => new Deste({ mod: 'yanlis' }));
});
