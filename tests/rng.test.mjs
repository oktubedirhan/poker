import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guvenliRng, tohumluRng } from '../js/motor/rng.js';

test('tohumluRng aynı tohumla aynı diziyi üretir', () => {
  const a = tohumluRng(42), b = tohumluRng(42), c = tohumluRng(43);
  const da = Array.from({ length: 50 }, () => a.int(1000));
  const db = Array.from({ length: 50 }, () => b.int(1000));
  const dc = Array.from({ length: 50 }, () => c.int(1000));
  assert.deepEqual(da, db);
  assert.notDeepEqual(da, dc);
});

test('int(max) her zaman [0, max) aralığında tam sayı', () => {
  for (const rng of [guvenliRng(), tohumluRng(1)]) {
    for (const max of [1, 2, 7, 52, 1000, 2 ** 32]) {
      for (let i = 0; i < 200; i++) {
        const x = rng.int(max);
        assert.ok(Number.isInteger(x) && x >= 0 && x < max, `${x} / ${max}`);
      }
    }
  }
});

test('dağılım kabaca düzgün (her iki kaynak)', () => {
  for (const rng of [guvenliRng(), tohumluRng(7)]) {
    const kova = new Array(6).fill(0);
    const N = 60000;
    for (let i = 0; i < N; i++) kova[rng.int(6)]++;
    for (const k of kova) assert.ok(Math.abs(k - N / 6) < N / 6 * 0.05, `kova ${k}`);
  }
});

test('geçersiz üst sınır hata verir', () => {
  const rng = tohumluRng(1);
  for (const max of [0, -1, 1.5, NaN, 2 ** 32 + 1]) assert.throws(() => rng.int(max));
});
