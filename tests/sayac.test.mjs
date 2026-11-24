import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sayac } from '../js/analiz/sayac.js';
import { Oyun } from '../js/motor/oyun.js';
import { tohumluRng } from '../js/motor/rng.js';
import { tumKartlar } from '../js/motor/kart.js';

const sirali = (a) => [...a].sort();

test('birim: ders örneği (A♥K♥, board 7♥ 2♣ 9♦) → 47 bilinmeyen, 10 kupa', () => {
  const s = new Sayac({ perspektifId: 'sen' });
  s.olay({ tur: 'karildi', mod: 'elBasi' });
  s.olay({ tur: 'kartDagitildi', oyuncuId: 'sen', kartlar: ['Ah', 'Kh'] });
  s.olay({ tur: 'sokak', sokak: 'flop', yeniKartlar: ['7h', '2c', '9d'], board: ['7h', '2c', '9d'] });
  assert.equal(s.gorulen().length, 5);
  assert.equal(s.bilinmeyen().length, 47);
  const d = s.dagilim();
  assert.equal(d.renk.h, 10);
  assert.equal(d.renk.s, 13);
  assert.equal(d.deger.A, 3);
  assert.equal(d.deger['7'], 3);
  assert.equal(Object.values(d.deger).reduce((a, b) => a + b, 0), 47);
  assert.equal(s.olasilik((k) => k[1] === 'h'), 10 / 47);
  assert.equal(s.olasilik((k) => 'JQK'.includes(k[0])), 11 / 47); // K♥ görüldü
});

test('birim: başkasının kartı ve kartlar:null yok sayılır; olay tekrarı zararsız', () => {
  const s = new Sayac({ perspektifId: 'sen' });
  s.olay({ tur: 'kartDagitildi', oyuncuId: 'bot1', kartlar: null });
  s.olay({ tur: 'kartDagitildi', oyuncuId: 'bot1', kartlar: ['As', 'Ad'] }); // ham olay: yine sayılmaz
  s.olay({ tur: 'kartDagitildi', oyuncuId: 'sen', kartlar: ['2c', '3c'] });
  s.olay({ tur: 'kartDagitildi', oyuncuId: 'sen', kartlar: ['2c', '3c'] });
  s.olay({ tur: 'yakildi' });
  s.olay({ tur: 'eylem', oyuncuId: 'bot1', eylem: 'call', miktar: 20, eklenen: 20 });
  s.olay(undefined);
  assert.deepEqual(sirali(s.gorulen()), ['2c', '3c']);
});

test('birim: showdown ve kartlarAcildi açılan kartları ekler; elBasi sıfırlar, ayakkabı korur', () => {
  for (const mod of ['elBasi', 'ayakkabi']) {
    const s = new Sayac({ perspektifId: 'sen', mod });
    s.olay({ tur: 'kartDagitildi', oyuncuId: 'sen', kartlar: ['2c', '3c'] });
    s.olay({ tur: 'showdown', acilanlar: [{ oyuncuId: 'bot1', kartlar: ['As', 'Ad'], deger: {} }] });
    s.olay({ tur: 'kartlarAcildi', eller: [{ oyuncuId: 'bot2', kartlar: ['Kh', 'Kd'] }] });
    assert.equal(s.gorulen().length, 6);
    s.olay({ tur: 'elBasladi', elNo: 2 });
    assert.equal(s.gorulen().length, mod === 'elBasi' ? 0 : 6, mod);
    s.olay({ tur: 'karildi', mod });
    assert.equal(s.gorulen().length, 0);
  }
});

test('birim: geçersiz mod hata fırlatır', () => {
  assert.throws(() => new Sayac({ perspektifId: 'sen', mod: 'x' }));
});

// ---- Gerçek Oyun entegrasyonu ----

function herkesCallEder(oyun, sayaclar, oyuncuAdi) {
  const besle = (olaylar) => olaylar.forEach((e) => sayaclar.forEach((s) => s.olay(e)));
  let toplam = 0;
  besle(oyun.yeniEl());
  while (!oyun.elBittiMi()) {
    const id = oyun.siradaki();
    const g = oyun.gecerliEylemler(id);
    besle(oyun.eylem(id, g.check ? { tur: 'check' } : { tur: 'call' }));
    if (++toplam > 100) throw new Error('el bitmedi');
  }
  void oyuncuAdi;
}

function bilinenKartlar(oyun) {
  // Oyun içinden doğru cevap: sen + herkesin kartı + board (el sonu hepsi açık)
  const d = oyun.durum();
  const kartlar = new Set(d.board);
  for (const p of d.oyuncular) for (const k of p.kartlar ?? []) kartlar.add(k);
  return kartlar;
}

test('entegrasyon: ayakkabı modu, 6 el — görülen birikir, karıldığında sıfırlanır, 52 korunur', () => {
  const oyun = new Oyun({
    oyuncular: [{ id: 'sen', cip: 5000 }, { id: 'bot1', cip: 5000 }, { id: 'bot2', cip: 5000 }],
    kucukBlind: 10, buyukBlind: 20, desteModu: 'ayakkabi', elSonuKartlariAc: true, rng: tohumluRng(42),
  });
  const sayac = new Sayac({ perspektifId: 'sen', mod: 'ayakkabi' });
  const gecmisSayac = new Sayac({ perspektifId: 'sen', mod: 'ayakkabi' }); // gorunum.gecmis ile beslenen
  let beklenen = new Set();
  let oncekiKaristirma = 0;
  let karilmaSayisi = 0;

  for (let el = 1; el <= 6; el++) {
    herkesCallEder(oyun, [sayac]);
    if (oyun.deste.karistirmaSayisi !== oncekiKaristirma) {
      oncekiKaristirma = oyun.deste.karistirmaSayisi;
      beklenen = new Set();
      karilmaSayisi++;
    }
    for (const k of bilinenKartlar(oyun)) beklenen.add(k);

    assert.equal(oyun.sokak, 'bitti');
    assert.deepEqual(sirali(sayac.gorulen()), sirali(beklenen), `el ${el}: görülen kartlar`);

    // 52 = görülen + bilinmeyen, kesişim yok
    const g = new Set(sayac.gorulen()), b = new Set(sayac.bilinmeyen());
    assert.equal(g.size + b.size, 52);
    assert.equal(new Set([...g, ...b]).size, 52);
    for (const k of g) assert.ok(!b.has(k));
    assert.deepEqual(sirali([...g, ...b]), sirali(tumKartlar()));

    // görülen kartların hepsi gerçekten desteden çekilmiş
    const cekilen = new Set(oyun.deste.cekilenler());
    for (const k of g) assert.ok(cekilen.has(k), `${k} çekilmemiş`);

    // 3 oyuncu, hep call: her elde 3×2 + 5 board = 11 kart görülür
    const elBasinaKart = 11;
    const elIndeksi = (el - 1) % 3; // her karıştırmadan sonra 3 el (14 kart × 3 = 42, kalan 10 < 14)
    assert.equal(sayac.gorulen().length, elBasinaKart * (elIndeksi + 1), `el ${el}`);
    assert.equal(sayac.bilinmeyen().length, 52 - elBasinaKart * (elIndeksi + 1));

    // dağılım tutarlı
    const d = sayac.dagilim();
    assert.equal(Object.values(d.renk).reduce((x, y) => x + y, 0), sayac.bilinmeyen().length);
    assert.equal(Object.values(d.deger).reduce((x, y) => x + y, 0), sayac.bilinmeyen().length);

    // aynı olaylar gorunum.gecmis'ten okunursa sonuç değişmez (başkalarının kartDagitildi → kartlar:null)
    gecmisSayac.olay({ tur: 'elBasladi' });
    for (const e of oyun.gorunum('sen').gecmis) gecmisSayac.olay(e);
    assert.deepEqual(sirali(gecmisSayac.gorulen()), sirali(sayac.gorulen()), `el ${el}: gecmis ile beslenen`);
  }
  assert.equal(karilmaSayisi, 2, 'ilk dağıtım + 4. elde yeniden karıştırma');
});

test('entegrasyon: elBasi modunda her el sıfırdan sayılır', () => {
  const oyun = new Oyun({
    oyuncular: [{ id: 'sen', cip: 5000 }, { id: 'bot1', cip: 5000 }],
    kucukBlind: 10, buyukBlind: 20, desteModu: 'elBasi', elSonuKartlariAc: true, rng: tohumluRng(7),
  });
  const sayac = new Sayac({ perspektifId: 'sen', mod: 'elBasi' });
  for (let el = 0; el < 4; el++) {
    herkesCallEder(oyun, [sayac]);
    assert.equal(sayac.gorulen().length, 2 * 2 + 5, `el ${el + 1}`);
    assert.deepEqual(sirali(sayac.gorulen()), sirali(bilinenKartlar(oyun)));
  }
});

test('entegrasyon: başkalarının kapalı kartları sayılmaz (fold ile biten el, kartları açma yok)', () => {
  const oyun = new Oyun({
    oyuncular: [{ id: 'sen', cip: 1000 }, { id: 'bot1', cip: 1000 }, { id: 'bot2', cip: 1000 }],
    kucukBlind: 10, buyukBlind: 20, desteModu: 'ayakkabi', rng: tohumluRng(3),
  });
  const sayac = new Sayac({ perspektifId: 'sen', mod: 'ayakkabi' });
  const besle = (olaylar) => olaylar.forEach((e) => sayac.olay(e));
  besle(oyun.yeniEl());
  while (!oyun.elBittiMi()) {
    const id = oyun.siradaki();
    // Herkes fold eder; BB'ye kadar gelirse check
    const g = oyun.gecerliEylemler(id);
    besle(oyun.eylem(id, g.check ? { tur: 'check' } : { tur: 'fold' }));
  }
  const d = oyun.durum();
  const benim = d.oyuncular.find((p) => p.id === 'sen').kartlar;
  const gorulen = sayac.gorulen();
  for (const p of d.oyuncular) {
    if (p.id === 'sen') continue;
    for (const k of p.kartlar) assert.ok(!gorulen.includes(k) || d.board.includes(k) || benim.includes(k), `${p.id} kartı ${k} sayılmamalı`);
  }
  assert.ok(benim.every((k) => gorulen.includes(k)));
  assert.ok(gorulen.length <= 2 + d.board.length + 4);
});
