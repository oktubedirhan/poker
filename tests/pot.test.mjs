import { test } from 'node:test';
import assert from 'node:assert/strict';
import { potlariHesapla, potuDagit } from '../js/motor/pot.js';

const o = (id, toplamBahis, dusuk = false) => ({ id, toplamBahis, dusuk });

test('tek pot: herkes eşit', () => {
  assert.deepEqual(potlariHesapla([o('a', 100), o('b', 100), o('c', 100)]), [
    { miktar: 300, hakSahipleri: ['a', 'b', 'c'] },
  ]);
});

test('3 farklı all-in seviyesi → ana pot + 2 yan pot (+ üst seviye)', () => {
  // a 50 all-in, b 120 all-in, c 300 all-in, d 300 call
  const potlar = potlariHesapla([o('a', 50), o('b', 120), o('c', 300), o('d', 300)]);
  assert.deepEqual(potlar, [
    { miktar: 200, hakSahipleri: ['a', 'b', 'c', 'd'] },
    { miktar: 210, hakSahipleri: ['b', 'c', 'd'] },
    { miktar: 360, hakSahipleri: ['c', 'd'] },
  ]);
  assert.equal(potlar.reduce((t, p) => t + p.miktar, 0), 770);
});

test('fold edenin katkısı pota girer, hak sahibi olamaz', () => {
  const potlar = potlariHesapla([o('a', 40), o('b', 100, true), o('c', 200), o('d', 200)]);
  // seviyeler (canlı): 40, 200. b'nin 100'ünün 40'ı ana pota, 60'ı yan pota
  assert.deepEqual(potlar, [
    { miktar: 160, hakSahipleri: ['a', 'c', 'd'] },
    { miktar: 380, hakSahipleri: ['c', 'd'] },
  ]);
});

test('herkes fold etti, tek kalan her şeyi alır', () => {
  const potlar = potlariHesapla([o('a', 10, true), o('b', 30), o('c', 5, true)]);
  assert.deepEqual(potlar, [{ miktar: 45, hakSahipleri: ['b'] }]);
});

test('potuDagit: yan potları farklı kazananlara dağıtır', () => {
  const potlar = potlariHesapla([o('a', 50), o('b', 120), o('c', 300), o('d', 300)]);
  // güç: a > b > d > c
  const guc = { a: 4, b: 3, d: 2, c: 1 };
  const kazananBul = (hak) => {
    const enIyi = Math.max(...hak.map((id) => guc[id]));
    return hak.filter((id) => guc[id] === enIyi);
  };
  assert.deepEqual(potuDagit(potlar, kazananBul, ['a', 'b', 'c', 'd']), { a: 200, b: 210, d: 360 });
});

test('bölünemeyen fiş dealer\'ın solundan ilk kazanana', () => {
  const potlar = [{ miktar: 25, hakSahipleri: ['x', 'y', 'z'] }];
  const hepsi = (hak) => hak;
  // dealer z; solundan sıra: x, y, z → x 9, y 8, z 8
  assert.deepEqual(potuDagit(potlar, hepsi, ['x', 'y', 'z']), { x: 9, y: 8, z: 8 });
  // dealer x; sıra: y, z, x → y 9
  assert.deepEqual(potuDagit(potlar, hepsi, ['y', 'z', 'x']), { y: 9, z: 8, x: 8 });
  // iki kazanan, tek fiş fazla
  const iki = (hak) => hak.filter((id) => id !== 'x');
  assert.deepEqual(potuDagit(potlar, iki, ['z', 'x', 'y']), { z: 13, y: 12 });
});
