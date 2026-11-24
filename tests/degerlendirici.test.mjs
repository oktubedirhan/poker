import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KATEGORI, KATEGORI_AD, degerlendir, karsilastir, kazananlar, puanHesapla } from '../js/motor/degerlendirici.js';
import { tumKartlar } from '../js/motor/kart.js';

const d = (s) => degerlendir(s.split(' '));
const kars = (a, b) => karsilastir(d(a), d(b));

test('5 kartlık tüm C(52,5) el: kategori frekansları tam', () => {
  const baslangic = performance.now();
  const k = tumKartlar();
  const frekans = new Array(10).fill(0);
  const el = new Array(5);
  for (let a = 0; a < 52; a++)
    for (let b = a + 1; b < 52; b++)
      for (let c = b + 1; c < 52; c++)
        for (let x = c + 1; x < 52; x++)
          for (let y = x + 1; y < 52; y++) {
            el[0] = k[a]; el[1] = k[b]; el[2] = k[c]; el[3] = k[x]; el[4] = k[y];
            frekans[degerlendir(el).kategori]++;
          }
  const sure = performance.now() - baslangic;
  assert.deepEqual(frekans, [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 36, 4]);
  assert.equal(frekans.reduce((t, x) => t + x, 0), 2598960);
  assert.ok(sure < 30000, `süre ${sure} ms`);
});

test('kategori adları ve sonuç biçimi', () => {
  const r = d('Kh Kd Ac 7s 2d');
  assert.equal(r.kategori, KATEGORI.CIFT);
  assert.equal(r.ad, KATEGORI_AD[1]);
  assert.ok(Number.isInteger(r.puan));
  assert.equal(r.enIyi5.length, 5);
  assert.equal(KATEGORI_AD.length, 10);
});

test('Türkçe açıklamalar', () => {
  assert.equal(d('Kh Kd Ac 7s 2d').aciklama, 'Papaz çifti, As kicker');
  assert.equal(d('Ah Kh 9h 4h 2h').aciklama, 'Kupa floş, As yüksek');
  assert.equal(d('5c 4d 3h 2s Ac').aciklama, "5'e kadar sıralı");
  assert.equal(d('Ts 9d 8h 7s 6c').aciklama, "10'a kadar sıralı");
  assert.equal(d('As Ks Qs Js Ts').aciklama, 'Maça royal floş');
  assert.equal(d('9d 8d 7d 6d 5d').aciklama, "Karo sıralı floş, 9'a kadar");
  assert.equal(d('Qs Qd Qh 9c 9d').aciklama, 'Ful: üç Kız, iki 9');
  assert.equal(d('7s 7d 7c 7h Kd').aciklama, '7 dörtlüsü (kare), Papaz kicker');
  assert.equal(d('Js Jd Jc 4h 2d').aciklama, 'Vale üçlüsü, 4 kicker');
  assert.equal(d('Ks Kd 4c 4h Ad').aciklama, 'Papaz ve 4 iki çift, As kicker');
  assert.equal(d('As Jd 8c 4h 2d').aciklama, 'As yüksek');
});

test('enIyi5 okunuş sırası (grup önce, wheel\'de As sonda)', () => {
  assert.deepEqual(d('2d Kh 7s Kd Ac').enIyi5, ['Kh', 'Kd', 'Ac', '7s', '2d']);
  assert.deepEqual(d('Ac 2s 3h 4d 5c').enIyi5, ['5c', '4d', '3h', '2s', 'Ac']);
  assert.deepEqual(d('9c 9d Qs Qd Qh').enIyi5, ['Qs', 'Qd', 'Qh', '9c', '9d']);
});

test('7 kart: en iyi 5 seçilir', () => {
  const r = d('Ah 2h 7h 9h Kc Kd Jh');
  assert.equal(r.kategori, KATEGORI.FLOS);
  assert.deepEqual([...r.enIyi5].sort(), ['2h', '7h', '9h', 'Ah', 'Jh'].sort());
  // iki üçlü → ful (büyük üçlü + küçük üçlüden çift)
  const f = d('9s 9d 9h 4c 4d 4h 2s');
  assert.equal(f.kategori, KATEGORI.FUL);
  assert.equal(f.aciklama, 'Ful: üç 9, iki 4');
  // üç çift → en iyi iki çift + en iyi kicker
  const ic = d('As Ad Ks Kd 2c 2h Qd');
  assert.equal(ic.kategori, KATEGORI.IKI_CIFT);
  assert.equal(ic.aciklama, 'As ve Papaz iki çift, Kız kicker');
  // 6 sıralı kart: üst 5 sayılır
  assert.equal(d('4c 5d 6h 7s 8c 9d 2h').aciklama, "9'a kadar sıralı");
  // sıralı floş, floştan ve sıralıdan üstün
  assert.equal(d('5h 6h 7h 8h 9h Th 2c').aciklama, "Kupa sıralı floş, 10'a kadar");
  // 6 kart da çalışır
  assert.equal(d('Ah Ad As Kc 3d 2h').kategori, KATEGORI.UCLU);
});

test('kicker ve beraberlik', () => {
  assert.equal(kars('Ah Ad Kc 7s 2d', 'As Ac Qc 7d 2c'), 1); // Papaz kicker > Kız
  assert.equal(kars('Ah Ad Kc 7s 2d', 'As Ac Kd 7d 2c'), 0); // tam beraberlik
  assert.equal(kars('Ah Ad Kc 7s 3d', 'As Ac Kd 7d 2c'), 1); // 5. kart belirler
  assert.equal(kars('Kh Kd 4c 4s 9d', 'Kc Ks 4d 4h 8d'), 1); // iki çiftte kicker
  assert.equal(kars('Kh Kd 5c 5s 2d', 'Kc Ks 4d 4h Ad'), 1); // ikinci çift kickerdan önemli
  assert.equal(kars('7h 7d 7c 2s 2d', '6h 6d 6c As Ad'), 1); // fulde üçlü önce
  assert.equal(kars('2h 3d 4c 5s 7d', 'Ah 2s 3c 4h 5d'), -1); // 7 yüksek < wheel
});

test('wheel en düşük sıralı', () => {
  assert.equal(kars('Ah 2s 3c 4h 5d', '2h 3s 4d 5c 6h'), -1);
  assert.equal(d('Ah 2s 3c 4h 5d').kategori, KATEGORI.SIRALI);
  assert.equal(d('Ah 2h 3h 4h 5h').kategori, KATEGORI.SIRALI_FLOS);
  assert.equal(kars('Ah 2h 3h 4h 5h', '2c 3c 4c 5c 6c'), -1);
  // As-K-Q-J-T en yüksek sıralı; K-A-2-3-4 sıralı değil
  assert.equal(d('Kh As 2c 3d 4h').kategori, KATEGORI.YUKSEK);
});

test('iki farklı floş karşılaştırma', () => {
  assert.equal(kars('Ah Jh 9h 4h 2h', 'Kd Qd Jd 9d 7d'), 1);
  assert.equal(kars('Ah Kh 9h 4h 2h', 'As Ks 9s 4s 3s'), -1);
  assert.equal(kars('Ah Kh 9h 4h 2h', 'As Ks 9s 4s 2s'), 0);
  // board'da 4 kupa: elinde büyük kupası olan kazanır
  const board = ['2h', '7h', '9h', 'Jh', 'Kc'];
  assert.deepEqual(kazananlar([
    { id: 'a', kartlar: ['Ah', '3c', ...board] },
    { id: 'b', kartlar: ['Qh', 'Kh', ...board] },
  ]), ['a']);
});

test('board oynar → pot bölünür', () => {
  const board = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
  assert.deepEqual(kazananlar([
    { id: 'a', kartlar: ['2c', '3d', ...board] },
    { id: 'b', kartlar: ['9s', '9d', ...board] },
    { id: 'c', kartlar: ['4h', '5h', ...board] },
  ]), ['a', 'b', 'c']);
  const board2 = ['5c', '6d', '7h', '8s', '9c'];
  assert.deepEqual(kazananlar([
    { id: 'a', kartlar: ['Ac', 'Kd', ...board2] },
    { id: 'b', kartlar: ['2c', '2d', ...board2] },
    { id: 'c', kartlar: ['Tc', '2h', ...board2] },
  ]), ['c']);
});

test('puanHesapla degerlendir ile aynı puanı verir', () => {
  const s = ['Ah', '2h', '7h', '9h', 'Kc', 'Kd', 'Jh'];
  assert.equal(puanHesapla(s), degerlendir(s).puan);
});

test('geçersiz giriş hata verir', () => {
  assert.throws(() => degerlendir(['Ah', 'Kh', 'Qh', 'Jh']));
  assert.throws(() => degerlendir(['Ah', 'Kh', 'Qh', 'Jh', 'Th', '9h', '8h', '7h']));
  assert.throws(() => degerlendir(['Ah', 'Ah', 'Qh', 'Jh', 'Th']), /Tekrarlanan/);
  assert.throws(() => degerlendir(['Ah', 'Zz', 'Qh', 'Jh', 'Th']), /Geçersiz/);
});
