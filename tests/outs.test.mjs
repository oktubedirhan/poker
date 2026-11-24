import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outlariBul } from '../js/analiz/outs.js';
import { tumKartlar } from '../js/motor/kart.js';

const grup = (s, ad) => s.gruplar.find((g) => g.ad === ad);

test('floş çekişi: 9 out', () => {
  const s = outlariBul(['9h', '4h'], ['Kh', 'Jh', '2c']);
  assert.equal(s.toplam, 9);
  assert.equal(grup(s, 'Floş çekişi').kartlar.length, 9);
  assert.ok(s.kartlar.every((k) => k[1] === 'h'));
  assert.ok(!s.kartlar.some((k) => ['9h', '4h', 'Kh', 'Jh'].includes(k)));
});

test('ders örneği: A♥K♥ / Q♥7♥2♣ floş çekişi 9 out (over kartlar ana çekişin yanında sayılmaz)', () => {
  const s = outlariBul(['Ah', 'Kh'], ['Qh', '7h', '2c']);
  assert.equal(s.toplam, 9);
});

test('açık uçlu sıralı çekişi: 8 out', () => {
  const s = outlariBul(['9s', '8d'], ['7c', '6h', '2s']);
  assert.equal(s.toplam, 8);
  assert.equal(grup(s, 'Açık uçlu sıralı çekişi').kartlar.length, 8);
  assert.ok(s.kartlar.every((k) => k[0] === '5' || k[0] === 'T'));
});

test('ders örneği: 9♠8♠ / 7♦6♣2♥ → 8 out (over eşleşmeleri sayılmaz)', () => {
  assert.equal(outlariBul(['9s', '8s'], ['7d', '6c', '2h']).toplam, 8);
});

test('iç sıralı (gutshot): 4 out', () => {
  const s = outlariBul(['8d', '7c'], ['Js', '9h', '2d']);
  assert.equal(s.toplam, 4);
  assert.equal(s.gruplar[0].ad, 'İç sıralı çekişi (gutshot)');
  assert.ok(s.kartlar.every((k) => k[0] === 'T'));
});

test('floş çekişi + açık uçlu sıralı: 15 out (çakışanlar bir kez sayılır)', () => {
  const s = outlariBul(['9h', '8h'], ['7h', '6h', '2c']);
  assert.equal(s.toplam, 15);
  assert.equal(grup(s, 'Floş çekişi').kartlar.length, 9);
  assert.equal(grup(s, 'Açık uçlu sıralı çekişi').kartlar.length, 8);
  assert.equal(new Set(s.kartlar).size, 15);
  assert.match(s.aciklama, /bir kez sayıldı/);
});

test('set çekişi: cep çifti 2 out', () => {
  const s = outlariBul(['8h', '8d'], ['Kc', '4d', '2h']);
  assert.equal(s.toplam, 2);
  assert.equal(s.gruplar[0].ad, 'Set çekişi');
  assert.deepEqual([...s.kartlar].sort(), ['8c', '8s']);
});

test('iki over kart: 6 out', () => {
  const s = outlariBul(['Ac', 'Kd'], ['9h', '5s', '2c']);
  assert.equal(s.toplam, 6);
  assert.equal(s.gruplar[0].ad, 'İki over kart');
  assert.ok(s.kartlar.every((k) => k[0] === 'A' || k[0] === 'K'));
});

test('tek over kart: 3 out', () => {
  const s = outlariBul(['Ac', '7d'], ['9h', '5s', '2c']);
  assert.equal(s.gruplar[0].ad, 'Over kart');
  assert.equal(s.toplam, 3);
});

test('görülen kartlar out\'tan düşülür', () => {
  const s = outlariBul(['9h', '4h'], ['Kh', 'Jh', '2c'], { gorulen: ['Ah', '5h', '8s'] });
  assert.equal(s.toplam, 7);
  assert.ok(!s.kartlar.includes('Ah') && !s.kartlar.includes('5h'));
  const sa = outlariBul(['8h', '8d'], ['Kc', '4d', '2h'], { gorulen: ['8c'] });
  assert.equal(sa.toplam, 1);
});

test('yalnız board\'dan gelen iyileşme sayılmaz', () => {
  // Board 9-9-2: bir 9 daha gelirse board'da üçlü olur; elde çekiş yok → out yok.
  const s = outlariBul(['7h', '3d'], ['9s', '9h', '2c']);
  assert.equal(s.toplam, 0);
  assert.match(s.aciklama, /out/);
  // Board'da 4'lü floş, elde o renkten kart yok: floş board'dan gelir, out değil.
  const f = outlariBul(['2c', '3d'], ['Ah', 'Kh', 'Qh', '9h']);
  assert.equal(f.toplam, 0);
});

test('turn\'de çekişler: floş 9, gutshot 4', () => {
  assert.equal(outlariBul(['Ah', '5h'], ['Kh', '9h', '2c', '8d']).toplam, 9);
  assert.equal(outlariBul(['8d', '7c'], ['Js', '9h', '2d', 'Kc']).toplam, 4);
});

test('iki çiftten ful: 4 out; river\'da out yok', () => {
  const s = outlariBul(['8h', '4c'], ['8d', '4d', 'Kc']);
  assert.equal(s.toplam, 4);
  assert.equal(s.gruplar[0].ad, 'Ful çekişi');
  assert.equal(outlariBul(['8h', '4c'], ['8d', '4d', 'Kc', '2s', '9s']).toplam, 0);
});

test('kirli out uyarısı: masada çift + floş çekişi', () => {
  const s = outlariBul(['Ah', '9h'], ['Kh', '6h', '6d']);
  assert.equal(s.toplam, 9);
  assert.match(s.aciklama, /kirli/);
});

test('çıktı tutarlılığı: kartlar benzersiz, bilinen kart yok, gruplar toplamı kapsar', () => {
  const el = ['Jh', 'Th'], board = ['9h', '8c', '2h'];
  const s = outlariBul(el, board);
  const bilinen = new Set([...el, ...board]);
  assert.equal(new Set(s.kartlar).size, s.kartlar.length);
  assert.ok(s.kartlar.every((k) => !bilinen.has(k) && tumKartlar().includes(k)));
  assert.equal(s.toplam, s.kartlar.length);
  for (const g of s.gruplar) assert.ok(g.kartlar.every((k) => s.kartlar.includes(k)));
});

test('geçersiz girdi hata fırlatır', () => {
  assert.throws(() => outlariBul(['Ah'], ['Kh', 'Qh', '2c']));
  assert.throws(() => outlariBul(['Ah', 'Kh'], ['Qh', '2c']));
});
