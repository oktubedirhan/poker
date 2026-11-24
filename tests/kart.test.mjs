import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEGERLER, RENKLER, RENK_AD, RENK_SEMBOL, DEGER_AD, tumKartlar, kartDeger, kartRenk, kartAdi, kartGecerliMi,
} from '../js/motor/kart.js';

test('tumKartlar 52 benzersiz geçerli kart, sabit sıra', () => {
  const k = tumKartlar();
  assert.equal(k.length, 52);
  assert.equal(new Set(k).size, 52);
  assert.ok(k.every(kartGecerliMi));
  assert.deepEqual(tumKartlar(), k);
  assert.equal(k[0], '2s');
  assert.equal(k[51], 'Ac');
});

test('sabitler', () => {
  assert.equal(DEGERLER.length, 13);
  assert.deepEqual(RENKLER, ['s', 'h', 'd', 'c']);
  assert.equal(RENK_AD.h, 'Kupa');
  assert.equal(RENK_SEMBOL.s, '♠');
  assert.equal(DEGER_AD.Q, 'Kız');
  assert.equal(DEGER_AD['7'], '7');
});

test('kartDeger, kartRenk, kartAdi', () => {
  assert.equal(kartDeger('2c'), 2);
  assert.equal(kartDeger('Td'), 10);
  assert.equal(kartDeger('Ah'), 14);
  assert.equal(kartRenk('Ks'), 's');
  assert.equal(kartAdi('Ah'), 'Kupa As');
  assert.equal(kartAdi('Td'), 'Karo 10');
  assert.equal(kartAdi('Ks'), 'Maça Papaz');
  assert.equal(kartAdi('2c'), 'Sinek 2');
});

test('kartGecerliMi ve geçersiz kartta hata', () => {
  for (const k of ['1h', 'Ax', 'ah', 'A', 'Ahh', '', null, 10, '10h']) {
    assert.equal(kartGecerliMi(k), false, String(k));
  }
  assert.throws(() => kartDeger('Zz'));
  assert.throws(() => kartAdi('1h'));
});
