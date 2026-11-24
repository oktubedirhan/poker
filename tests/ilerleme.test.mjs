import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANAHTAR, ilerlemeYukle, ilerlemeKaydet, ilerlemeSifirla, seviyeAcikMi, seviyeSonucuIsle,
  siradakiSeviye, varsayilanIlerleme, ilerlemeDuzelt,
} from '../js/ilerleme.js';

function sahteDepo(baslangic = {}) {
  const veri = { ...baslangic };
  return {
    veri,
    getItem: (k) => (k in veri ? veri[k] : null),
    setItem: (k, v) => { veri[k] = String(v); },
    removeItem: (k) => { delete veri[k]; },
  };
}

test('boş depoda varsayılan ilerleme', () => {
  const d = sahteDepo();
  assert.deepEqual(ilerlemeYukle(d), varsayilanIlerleme());
});

test('kaydet → yükle aynı veriyi verir, anahtar poker-okulu-v1', () => {
  const d = sahteDepo();
  let i = varsayilanIlerleme();
  i = seviyeSonucuIsle(i, 0, 2);
  i.ayarlar.dortRenk = true;
  assert.equal(ilerlemeKaydet(i, d), true);
  assert.ok(ANAHTAR in d.veri);
  assert.equal(ANAHTAR, 'poker-okulu-v1');
  const y = ilerlemeYukle(d);
  assert.deepEqual(y.seviyeler[0], { yildiz: 2, tamam: true });
  assert.equal(y.ayarlar.dortRenk, true);
});

test('bozuk JSON ya da hatalı depo çökmeye yol açmaz', () => {
  assert.deepEqual(ilerlemeYukle(sahteDepo({ [ANAHTAR]: '{bozuk' })), varsayilanIlerleme());
  const hatali = { getItem() { throw new Error('engelli'); }, setItem() { throw new Error('dolu'); } };
  assert.deepEqual(ilerlemeYukle(hatali), varsayilanIlerleme());
  assert.equal(ilerlemeKaydet(varsayilanIlerleme(), hatali), false);
});

test('ilerlemeDuzelt geçersiz alanları ayıklar', () => {
  const d = ilerlemeDuzelt({ seviyeler: { 0: { yildiz: 9 }, 50: { yildiz: 3 }, x: {}, 2: null }, ayarlar: { koc: 'evet' } });
  assert.deepEqual(d.seviyeler, { 0: { yildiz: 3, tamam: true } });
  assert.equal(d.ayarlar.koc, true);
});

test('seviyeAcikMi: 0 hep açık, n için n-1 en az 1 yıldız', () => {
  let i = varsayilanIlerleme();
  assert.equal(seviyeAcikMi(i, 0), true);
  assert.equal(seviyeAcikMi(i, 1), false);
  i = seviyeSonucuIsle(i, 0, 1);
  assert.equal(seviyeAcikMi(i, 1), true);
  assert.equal(seviyeAcikMi(i, 2), false);
  assert.equal(seviyeAcikMi(i, 11), false);
  assert.equal(seviyeAcikMi(i, -1), false);
});

test('seviyeSonucuIsle en iyi yıldızı korur, 0 yıldız tamam sayılmaz', () => {
  let i = seviyeSonucuIsle(varsayilanIlerleme(), 3, 0);
  assert.deepEqual(i.seviyeler[3], { yildiz: 0, tamam: false });
  i = seviyeSonucuIsle(i, 3, 3);
  i = seviyeSonucuIsle(i, 3, 1);
  assert.equal(i.seviyeler[3].yildiz, 3);
});

test('siradakiSeviye ve sıfırlama', () => {
  const d = sahteDepo();
  let i = seviyeSonucuIsle(varsayilanIlerleme(), 0, 3);
  assert.equal(siradakiSeviye(i), 1);
  ilerlemeKaydet(i, d);
  i = ilerlemeSifirla(d);
  assert.equal(d.getItem(ANAHTAR), null);
  assert.equal(siradakiSeviye(i), 0);
});
