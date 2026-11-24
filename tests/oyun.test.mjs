import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Oyun } from '../js/motor/oyun.js';
import { tohumluRng } from '../js/motor/rng.js';

// p0..p(n-1), oturma sırası = dizi sırası. İlk elde dealer p0.
function oyunKur(ciplar, ayar = {}) {
  return new Oyun({
    oyuncular: ciplar.map((cip, i) => ({ id: `p${i}`, ad: `Oyuncu ${i}`, cip, bot: null })),
    kucukBlind: 5,
    buyukBlind: 10,
    rng: tohumluRng(ayar.tohum ?? 1),
    ...ayar,
  });
}

const turler = (olaylar) => olaylar.map((o) => o.tur);
const cipler = (oyun) => Object.fromEntries(oyun.durum().oyuncular.map((p) => [p.id, p.cip]));

// Rastgele ama geçerli bir eylem seç (bet/raise miktarı aralıktan).
function rastgeleEylem(g, rng) {
  const secenek = [];
  if (g.fold) secenek.push({ tur: 'fold' });
  if (g.check) secenek.push({ tur: 'check' }, { tur: 'check' });
  if (g.call !== null) secenek.push({ tur: 'call' }, { tur: 'call' });
  if (g.bet) secenek.push({ tur: 'bet', miktar: g.bet.min + rng.int(g.bet.max - g.bet.min + 1) });
  if (g.raise) secenek.push({ tur: 'raise', miktar: g.raise.min + rng.int(g.raise.max - g.raise.min + 1) });
  if (g.allin) secenek.push({ tur: 'allin' });
  return secenek[rng.int(secenek.length)];
}

test('dealer düğmesi her el bir sağa kayar, çipi olmayan atlanır', () => {
  const oyun = oyunKur([100, 0, 100, 100]);
  const dealerlar = [];
  for (let i = 0; i < 4; i++) {
    oyun.yeniEl();
    dealerlar.push(oyun.gorunum('p0').dealerId);
    while (!oyun.elBittiMi()) oyun.eylem(oyun.siradaki(), { tur: 'fold' });
  }
  assert.deepEqual(dealerlar, ['p0', 'p2', 'p3', 'p0']);
  assert.equal(oyun.gorunum('p0').oyuncular[1].oturuyor, false);
});

test('3+ oyuncu: SB/BB dealer\'ın solunda, preflop UTG, sonraki sokaklarda SB önce konuşur', () => {
  const oyun = oyunKur([1000, 1000, 1000, 1000]);
  const olaylar = oyun.yeniEl();
  const g = oyun.gorunum('p0');
  assert.equal(g.dealerId, 'p0');
  assert.equal(g.kucukBlindId, 'p1');
  assert.equal(g.buyukBlindId, 'p2');
  assert.deepEqual(g.oyuncular.map((p) => p.pozisyon), ['BTN', 'SB', 'BB', 'UTG']);
  assert.deepEqual(olaylar.filter((o) => o.tur === 'blind').map((o) => [o.oyuncuId, o.miktar, o.tip]),
    [['p1', 5, 'kucuk'], ['p2', 10, 'buyuk']]);
  assert.equal(oyun.siradaki(), 'p3');
  oyun.eylem('p3', { tur: 'call' });
  oyun.eylem('p0', { tur: 'call' });
  oyun.eylem('p1', { tur: 'call' });
  assert.equal(oyun.siradaki(), 'p2'); // BB'nin opsiyonu
  assert.equal(oyun.gecerliEylemler('p2').check, true);
  oyun.eylem('p2', { tur: 'check' });
  assert.equal(oyun.gorunum('p0').sokak, 'flop');
  assert.equal(oyun.siradaki(), 'p1');
});

test('heads-up: dealer küçük blind öder, preflop ilk, sonra son konuşur', () => {
  const oyun = oyunKur([1000, 1000]);
  oyun.yeniEl();
  const g = oyun.gorunum('p0');
  assert.equal(g.dealerId, 'p0');
  assert.equal(g.kucukBlindId, 'p0');
  assert.equal(g.buyukBlindId, 'p1');
  assert.equal(oyun.siradaki(), 'p0');
  oyun.eylem('p0', { tur: 'call' });
  oyun.eylem('p1', { tur: 'check' });
  assert.equal(oyun.gorunum('p0').sokak, 'flop');
  assert.equal(oyun.siradaki(), 'p1');
  oyun.eylem('p1', { tur: 'check' });
  assert.equal(oyun.siradaki(), 'p0');
  // ikinci el: düğme p1'e geçer
  oyun.eylem('p0', { tur: 'fold' });
  oyun.yeniEl();
  assert.equal(oyun.gorunum('p0').dealerId, 'p1');
  assert.equal(oyun.gorunum('p0').kucukBlindId, 'p1');
  assert.equal(oyun.siradaki(), 'p1');
});

test('gerçek dağıtım sırası: dealer\'ın solundan birer birer; sokaklardan önce yakma', () => {
  const oyun = oyunKur([1000, 1000, 1000, 1000]);
  const olaylar = oyun.yeniEl();
  const d = oyun.durum();
  const kart = (i) => d.oyuncular[i].kartlar;
  // dealer p0 → sıra p1, p2, p3, p0
  assert.deepEqual(d.deste.cekilenler, [kart(1)[0], kart(2)[0], kart(3)[0], kart(0)[0], kart(1)[1], kart(2)[1], kart(3)[1], kart(0)[1]]);
  assert.deepEqual(olaylar.filter((o) => o.tur === 'kartDagitildi').map((o) => o.oyuncuId), ['p1', 'p2', 'p3', 'p0']);
  // herkes check/call ederek river'a kadar git
  while (!oyun.elBittiMi()) {
    const g = oyun.gecerliEylemler(oyun.siradaki());
    oyun.eylem(oyun.siradaki(), { tur: g.check ? 'check' : 'call' });
  }
  const son = oyun.durum();
  const c = son.deste.cekilenler;
  const yakilan = oyun.deste.yakilanlar();
  assert.deepEqual(yakilan, [c[8], c[12], c[14]]);
  assert.deepEqual(son.board, [c[9], c[10], c[11], c[13], c[15]]);
  assert.equal(son.gecmis.filter((o) => o.tur === 'yakildi').length, 3);
  assert.deepEqual(son.gecmis.find((o) => o.tur === 'yakildi'), { tur: 'yakildi' }); // yüz gizli
});

test('hazirKartlar: diz ile dağıtım ve board ayarlanır', () => {
  const oyun = oyunKur([1000, 1000, 1000]);
  const board = ['2c', '7d', '9h', 'Js', '3s'];
  oyun.yeniEl({ hazirKartlar: { p0: ['As', 'Ks'], p2: ['Qh', 'Qd'], board } });
  const d = oyun.durum();
  assert.deepEqual(d.oyuncular[0].kartlar, ['As', 'Ks']);
  assert.deepEqual(d.oyuncular[2].kartlar, ['Qh', 'Qd']);
  while (!oyun.elBittiMi()) {
    const g = oyun.gecerliEylemler(oyun.siradaki());
    oyun.eylem(oyun.siradaki(), { tur: g.check ? 'check' : 'call' });
  }
  assert.deepEqual(oyun.durum().board, board);
  oyun.deste.dogrula();
  assert.throws(() => oyunKur([100, 100]).yeniEl({ hazirKartlar: { p0: ['As', 'As'] } }), /tekrarlanan/);
  assert.throws(() => oyunKur([100, 100]).yeniEl({ hazirKartlar: { yok: ['As', 'Kd'] } }), /elde olmayan/);
});

test('hazirKartlar: ders anahtarı "insan" masadaki "sen" oyuncusuna gider', () => {
  const oyun = new Oyun({
    oyuncular: [{ id: 'sen', ad: 'Sen', cip: 100, bot: null }, { id: 'bot1', ad: 'Bot', cip: 100, bot: 'pasifAcemi' }],
    kucukBlind: 1, buyukBlind: 2, rng: tohumluRng(3),
  });
  oyun.yeniEl({ hazirKartlar: { insan: ['Ah', 'Ad'], bot1: ['7c', '2d'] } });
  assert.deepEqual(oyun.gorunum('sen').benimKartlarim, ['Ah', 'Ad']);
});

test('en az raise: preflop BB, sonra son artış kadar; bet en az BB', () => {
  const oyun = oyunKur([1000, 1000, 1000]);
  oyun.yeniEl();
  assert.deepEqual(oyun.gecerliEylemler('p0').raise, { min: 20, max: 1000 });
  assert.throws(() => oyun.eylem('p0', { tur: 'raise', miktar: 19 }), /Geçersiz eylem/);
  oyun.eylem('p0', { tur: 'raise', miktar: 35 }); // artış 25
  assert.equal(oyun.gorunum('p1').enAzRaise, 60);
  assert.deepEqual(oyun.gecerliEylemler('p1').raise, { min: 60, max: 1000 });
  assert.equal(oyun.gecerliEylemler('p1').call, 30);
  oyun.eylem('p1', { tur: 'call' });
  oyun.eylem('p2', { tur: 'call' });
  // flop: bet en az BB
  assert.equal(oyun.gorunum('p1').sokak, 'flop');
  assert.deepEqual(oyun.gecerliEylemler('p1').bet, { min: 10, max: 965 });
  assert.equal(oyun.gecerliEylemler('p1').raise, null);
  oyun.eylem('p1', { tur: 'bet', miktar: 40 });
  assert.deepEqual(oyun.gecerliEylemler('p2').raise, { min: 80, max: 965 });
});

test('tam olmayan all-in raise aksiyonu yeniden açmaz; tam raise açar', () => {
  const kur = () => {
    const oyun = oyunKur([1000, 1000, 150]);
    oyun.yeniEl();
    oyun.eylem('p0', { tur: 'call' });
    oyun.eylem('p1', { tur: 'call' });
    oyun.eylem('p2', { tur: 'check' });
    oyun.eylem('p1', { tur: 'bet', miktar: 100 });
    oyun.eylem('p2', { tur: 'allin' }); // 140: artış 40 < 100 → tam değil
    return oyun;
  };
  const oyun = kur();
  assert.equal(oyun.gorunum('p0').mevcutBahis, 140);
  assert.equal(oyun.gorunum('p0').enAzRaise, 240);
  // p0 henüz konuşmadı: raise hakkı var
  assert.deepEqual(oyun.gecerliEylemler('p0').raise, { min: 240, max: 990 });
  oyun.eylem('p0', { tur: 'call' });
  // p1 zaten 100 bet ile konuştu: yalnız call / fold
  const g = oyun.gecerliEylemler('p1');
  assert.equal(g.raise, null);
  assert.equal(g.call, 40);
  assert.equal(g.allin, 40);
  assert.throws(() => oyun.eylem('p1', { tur: 'raise', miktar: 240 }), /Geçersiz eylem/);

  const oyun2 = kur();
  oyun2.eylem('p0', { tur: 'raise', miktar: 240 }); // artış 100 → tam raise
  assert.deepEqual(oyun2.gecerliEylemler('p1').raise, { min: 340, max: 990 });
});

test('tek kişi kalınca el biter, kart açılmaz', () => {
  const oyun = oyunKur([1000, 1000, 1000]);
  oyun.yeniEl();
  oyun.eylem('p0', { tur: 'raise', miktar: 50 });
  oyun.eylem('p1', { tur: 'fold' });
  const olaylar = oyun.eylem('p2', { tur: 'fold' });
  assert.ok(oyun.elBittiMi());
  assert.equal(oyun.siradaki(), null);
  assert.ok(!turler(olaylar).includes('showdown'));
  assert.ok(!turler(olaylar).includes('sokak'));
  assert.ok(!turler(olaylar).includes('kartlarAcildi'));
  const pot = olaylar.find((o) => o.tur === 'potKazanildi');
  assert.deepEqual(pot.kazananlar, ['p0']);
  assert.equal(pot.miktar, 25); // 50'nin karşılanmayan 40'ı iade: 10 + 5 + 10
  assert.equal(pot.deger, null);
  assert.deepEqual(cipler(oyun), { p0: 1015, p1: 995, p2: 990 });
  const g = oyun.gorunum('p1');
  assert.equal(g.sokak, 'bitti');
  assert.ok(g.oyuncular.every((p) => p.acikKartlar === null));
});

test('herkes all-in: board otomatik açılır, tüm eller açılır; karşılanmayan fazla iade', () => {
  const oyun = oyunKur([1000, 100]);
  oyun.yeniEl({ hazirKartlar: { p0: ['Kh', 'Kd'], p1: ['Ah', 'Ad'], board: ['2c', '7d', '9h', 'Js', '3s'] } });
  oyun.eylem('p0', { tur: 'allin' });
  const olaylar = oyun.eylem('p1', { tur: 'call' });
  assert.deepEqual(olaylar.filter((o) => o.tur === 'sokak').map((o) => o.sokak), ['flop', 'turn', 'river']);
  assert.equal(olaylar.filter((o) => o.tur === 'yakildi').length, 3);
  const sd = olaylar.find((o) => o.tur === 'showdown');
  assert.deepEqual(sd.acilanlar.map((a) => a.oyuncuId).sort(), ['p0', 'p1']);
  assert.equal(sd.acilanlar.find((a) => a.oyuncuId === 'p1').deger.aciklama, 'As çifti, Vale kicker');
  assert.deepEqual(cipler(oyun), { p0: 900, p1: 200 });
  assert.deepEqual(oyun.gorunum('p1').oyuncular[0].acikKartlar, ['Kh', 'Kd']);
});

test('showdown sırası: son agresif önce; kaybeden elini açmaz', () => {
  const oyun = oyunKur([1000, 1000, 1000]);
  oyun.yeniEl({ hazirKartlar: { p0: ['Ah', 'Ad'], p1: ['4c', '5d'], p2: ['Kh', 'Kd'], board: ['2c', '7d', '9h', 'Js', '3s'] } });
  oyun.eylem('p0', { tur: 'call' });
  oyun.eylem('p1', { tur: 'call' });
  oyun.eylem('p2', { tur: 'check' });
  for (let i = 0; i < 6; i++) oyun.eylem(oyun.siradaki(), { tur: 'check' }); // flop, turn
  oyun.eylem('p1', { tur: 'check' });
  oyun.eylem('p2', { tur: 'bet', miktar: 50 });
  oyun.eylem('p0', { tur: 'call' });
  const olaylar = oyun.eylem('p1', { tur: 'call' });
  const sd = olaylar.find((o) => o.tur === 'showdown');
  // p2 bet etti → önce p2, sonra p0 (daha iyi, açar), p1 (kaybediyor, açmaz)
  assert.deepEqual(sd.acilanlar.map((a) => a.oyuncuId), ['p2', 'p0']);
  const pot = olaylar.find((o) => o.tur === 'potKazanildi');
  assert.deepEqual(pot.kazananlar, ['p0']);
  assert.equal(pot.deger.aciklama, 'As çifti, Vale kicker');
  const g = oyun.gorunum('p0');
  assert.equal(g.oyuncular[1].acikKartlar, null);
  assert.ok(!JSON.stringify(g).includes('4c'));
});

test('showdown sırası: river\'da bahis yoksa dealer\'ın solundaki ilk', () => {
  const oyun = oyunKur([1000, 1000, 1000]);
  oyun.yeniEl({ hazirKartlar: { p0: ['Ah', 'Ad'], p1: ['Kc', 'Kd'], p2: ['Qh', 'Qd'], board: ['2c', '7d', '9h', 'Js', '3s'] } });
  oyun.eylem('p0', { tur: 'raise', miktar: 30 });
  oyun.eylem('p1', { tur: 'call' });
  oyun.eylem('p2', { tur: 'call' });
  let olaylar = [];
  while (!oyun.elBittiMi()) olaylar = oyun.eylem(oyun.siradaki(), { tur: 'check' });
  const sd = olaylar.find((o) => o.tur === 'showdown');
  // p1 önce (Papaz çifti), p2 (Kız çifti, daha kötü → açmaz), p0 (As, açar)
  assert.deepEqual(sd.acilanlar.map((a) => a.oyuncuId), ['p1', 'p0']);
});

test('board oynar: pot bölünür, bölünemeyen fiş dealer\'ın solundan ilk kazanana', () => {
  const oyun = oyunKur([1000, 1000, 1000]);
  oyun.yeniEl({ hazirKartlar: { p0: ['2c', '3d'], p1: ['4h', '5h'], p2: ['2d', '3c'], board: ['As', 'Ks', 'Qs', 'Js', 'Ts'] } });
  oyun.eylem('p0', { tur: 'call' });
  oyun.eylem('p1', { tur: 'fold' }); // 5 ölü fiş
  oyun.eylem('p2', { tur: 'check' });
  let olaylar = [];
  while (!oyun.elBittiMi()) olaylar = oyun.eylem(oyun.siradaki(), { tur: 'check' });
  const pot = olaylar.find((o) => o.tur === 'potKazanildi');
  assert.equal(pot.miktar, 25);
  assert.deepEqual(pot.kazananlar.sort(), ['p0', 'p2']);
  assert.equal(pot.deger.kategori, 9);
  // dealer p0 → solundan sıra p1, p2, p0: tek fiş p2'ye
  assert.deepEqual(cipler(oyun), { p0: 1002, p1: 995, p2: 1003 });
});

test('yan potlar oyunda doğru dağıtılır', () => {
  const oyun = oyunKur([300, 50, 120, 300]);
  // dealer p0, SB p1, BB p2, UTG p3
  oyun.yeniEl({ hazirKartlar: {
    p0: ['2h', '3h'], p1: ['Ah', 'Ad'], p2: ['Kh', 'Kd'], p3: ['Qh', 'Qd'],
    board: ['7c', '8d', '9s', 'Jc', '4s'],
  } });
  oyun.eylem('p3', { tur: 'allin' });
  oyun.eylem('p0', { tur: 'call' });
  oyun.eylem('p1', { tur: 'allin' });
  const olaylar = oyun.eylem('p2', { tur: 'allin' });
  const potlar = olaylar.filter((o) => o.tur === 'potKazanildi');
  assert.deepEqual(potlar.map((p) => [p.miktar, p.kazananlar]), [
    [200, ['p1']], [210, ['p2']], [360, ['p3']],
  ]);
  assert.deepEqual(cipler(oyun), { p0: 0, p1: 200, p2: 210, p3: 360 });
  assert.ok(turler(olaylar).includes('oyuncuElendi'));
  assert.deepEqual(olaylar.filter((o) => o.tur === 'oyuncuElendi').map((o) => o.oyuncuId), ['p0']);
});

test('elenme ve oyunBitti', () => {
  const oyun = oyunKur([100, 100]);
  oyun.yeniEl({ hazirKartlar: { p0: ['Ah', 'Ad'], p1: ['7c', '2d'], board: ['Kc', '8d', '9s', 'Jc', '4s'] } });
  oyun.eylem('p0', { tur: 'allin' });
  const olaylar = oyun.eylem('p1', { tur: 'call' });
  assert.deepEqual(olaylar.find((o) => o.tur === 'oyuncuElendi'), { tur: 'oyuncuElendi', oyuncuId: 'p1' });
  assert.deepEqual(olaylar.at(-1), { tur: 'oyunBitti', kazananId: 'p0' });
  assert.deepEqual(olaylar.find((o) => o.tur === 'elBitti').cipler, { p0: 200, p1: 0 });
  assert.ok(oyun.oyunBittiMi());
  assert.throws(() => oyun.yeniEl(), /Oyun bitti/);
});

test('blindArtis: her n elde blindler çarpanla artar', () => {
  const oyun = oyunKur([10000, 10000], { blindArtis: { herElde: 2, carpan: 2 } });
  const blindler = [];
  for (let i = 0; i < 5; i++) {
    const olaylar = oyun.yeniEl();
    const b = olaylar.find((o) => o.tur === 'elBasladi');
    blindler.push([b.kucukBlind, b.buyukBlind]);
    oyun.eylem(oyun.siradaki(), { tur: 'fold' });
  }
  assert.deepEqual(blindler, [[5, 10], [5, 10], [10, 20], [10, 20], [20, 40]]);
});

test('elSonuKartlariAc: fold ile biten elde bile tüm eller açılır', () => {
  const oyun = oyunKur([1000, 1000, 1000], { elSonuKartlariAc: true });
  oyun.yeniEl();
  oyun.eylem('p0', { tur: 'fold' });
  const olaylar = oyun.eylem('p1', { tur: 'fold' });
  const acilan = olaylar.find((o) => o.tur === 'kartlarAcildi');
  assert.equal(acilan.eller.length, 3);
  const d = oyun.durum();
  for (const e of acilan.eller) assert.deepEqual(e.kartlar, d.oyuncular.find((p) => p.id === e.oyuncuId).kartlar);
  assert.ok(oyun.gorunum('p0').oyuncular.every((p) => p.acikKartlar && p.acikKartlar.length === 2));
});

test('ayakkabı modu: eller arası kartlar desteye dönmez, karildi yalnız karınca', () => {
  const oyun = oyunKur([1000, 1000], { desteModu: 'ayakkabi' });
  const ilk = oyun.yeniEl();
  assert.deepEqual(ilk.find((o) => o.tur === 'karildi'), { tur: 'karildi', mod: 'ayakkabi' });
  const el1 = oyun.durum().deste.cekilenler;
  oyun.eylem('p0', { tur: 'fold' });
  const ikinci = oyun.yeniEl();
  assert.ok(!turler(ikinci).includes('karildi'));
  const el2 = oyun.durum().deste.cekilenler;
  assert.deepEqual(el2.slice(0, el1.length), el1);
  assert.equal(el2.length, el1.length + 4);
  // elBasi modunda her el karildi olayı gelir
  const normal = oyunKur([1000, 1000]);
  normal.yeniEl();
  normal.eylem('p0', { tur: 'fold' });
  assert.ok(turler(normal.yeniEl()).includes('karildi'));
});

test('geçersiz eylemler hata verir', () => {
  const oyun = oyunKur([1000, 1000, 1000]);
  assert.throws(() => oyun.eylem('p0', { tur: 'call' }), /Geçersiz eylem/); // el yok
  oyun.yeniEl();
  assert.throws(() => oyun.eylem('p1', { tur: 'call' }), /Geçersiz eylem/); // sıra p0'da
  assert.throws(() => oyun.eylem('p0', { tur: 'check' }), /Geçersiz eylem/);
  assert.throws(() => oyun.eylem('p0', { tur: 'bet', miktar: 50 }), /Geçersiz eylem/);
  assert.throws(() => oyun.eylem('p0', { tur: 'raise', miktar: 5000 }), /Geçersiz eylem/);
  assert.throws(() => oyun.eylem('p0', { tur: 'raise', miktar: 25.5 }), /Geçersiz eylem/);
  assert.throws(() => oyun.eylem('p0', { tur: 'zipla' }), /Geçersiz eylem/);
  assert.throws(() => oyun.yeniEl(), /sürüyor/);
  assert.deepEqual(oyun.gecerliEylemler('p1'), { fold: false, check: false, call: null, bet: null, raise: null, allin: null });
});

test('eylem olayı: eylem türü, sokak toplamı ve eklenen miktar', () => {
  const oyun = oyunKur([1000, 1000, 1000]);
  oyun.yeniEl();
  const [o] = oyun.eylem('p0', { tur: 'raise', miktar: 30 });
  assert.deepEqual(o, { tur: 'eylem', oyuncuId: 'p0', eylem: 'raise', miktar: 30, eklenen: 30 });
  const [o2] = oyun.eylem('p1', { tur: 'call' });
  assert.deepEqual(o2, { tur: 'eylem', oyuncuId: 'p1', eylem: 'call', miktar: 30, eklenen: 25 });
});

test('tohumlu rng ile eller tekrarlanabilir', () => {
  const oyna = () => {
    const oyun = oyunKur([500, 500, 500, 500], { tohum: 77 });
    const rng = tohumluRng(5);
    for (let el = 0; el < 30 && !oyun.oyunBittiMi(); el++) {
      oyun.yeniEl();
      while (!oyun.elBittiMi()) oyun.eylem(oyun.siradaki(), rastgeleEylem(oyun.gecerliEylemler(oyun.siradaki()), rng));
    }
    return oyun.durum();
  };
  assert.deepEqual(oyna(), oyna());
});

test('gorunum başkalarının kapalı kartlarını asla sızdırmaz', () => {
  const rng = tohumluRng(11);
  for (let oyunNo = 0; oyunNo < 20; oyunNo++) {
    const n = 2 + rng.int(5);
    const oyun = oyunKur(Array(n).fill(300), { tohum: 100 + oyunNo });
    for (let el = 0; el < 15 && !oyun.oyunBittiMi(); el++) {
      oyun.yeniEl();
      const kontrol = () => {
        const d = oyun.durum();
        for (const ben of d.oyuncular) {
          const g = oyun.gorunum(ben.id);
          const metin = JSON.stringify(g);
          for (const diger of d.oyuncular) {
            if (diger.id === ben.id || !diger.kartlar || diger.acikKartlar) continue;
            for (const k of diger.kartlar) assert.ok(!metin.includes(`"${k}"`), `${ben.id} görünümünde ${diger.id} kartı ${k}`);
          }
          if (ben.kartlar) assert.deepEqual(g.benimKartlarim, ben.kartlar);
          for (const o of g.gecmis) {
            if (o.tur === 'kartDagitildi' && o.oyuncuId !== ben.id) assert.equal(o.kartlar, null);
          }
        }
      };
      kontrol();
      while (!oyun.elBittiMi()) {
        oyun.eylem(oyun.siradaki(), rastgeleEylem(oyun.gecerliEylemler(oyun.siradaki()), rng));
        kontrol();
      }
    }
  }
});

test('gorunum kopyadır: değiştirmek oyunu etkilemez', () => {
  const oyun = oyunKur([1000, 1000]);
  oyun.yeniEl();
  const g = oyun.gorunum('p0');
  g.benimKartlarim[0] = 'XX';
  g.gecmis[0].tur = 'bozuk';
  g.oyuncular[0].cip = 0;
  const g2 = oyun.gorunum('p0');
  assert.notEqual(g2.benimKartlarim[0], 'XX');
  assert.equal(g2.gecmis[0].tur, 'elBasladi');
  assert.equal(g2.oyuncular[0].cip, 995);
});

test('çip korunumu: 2000 rastgele el, 2–6 oyuncu, deste dogrula, kart tekrarı yok', () => {
  const rng = tohumluRng(2024);
  let elSayisi = 0, oyunSayisi = 0;
  while (elSayisi < 2000) {
    const n = 2 + rng.int(5);
    const baslangic = Array.from({ length: n }, () => 20 + rng.int(600));
    const toplam = baslangic.reduce((t, x) => t + x, 0);
    const oyun = oyunKur(baslangic, {
      tohum: rng.int(1e9),
      desteModu: rng.int(2) ? 'elBasi' : 'ayakkabi',
      blindArtis: rng.int(3) === 0 ? { herElde: 5, carpan: 1.5 } : null,
    });
    oyunSayisi++;
    while (!oyun.oyunBittiMi() && elSayisi < 2000) {
      oyun.yeniEl();
      elSayisi++;
      let adim = 0;
      while (!oyun.elBittiMi()) {
        const id = oyun.siradaki();
        oyun.eylem(id, rastgeleEylem(oyun.gecerliEylemler(id), rng));
        const d = oyun.durum();
        const eldeki = d.oyuncular.reduce((t, p) => t + p.cip + p.toplamBahis, 0);
        assert.equal(eldeki, toplam, 'el ortasında çip korunumu');
        assert.ok(++adim < 500, 'sonsuz döngü');
      }
      oyun.deste.dogrula();
      const d = oyun.durum();
      assert.equal(d.oyuncular.reduce((t, p) => t + p.cip, 0), toplam);
      assert.ok(d.oyuncular.every((p) => p.cip >= 0 && Number.isInteger(p.cip)));
      const gorulen = [...d.board, ...oyun.deste.yakilanlar()];
      for (const p of d.oyuncular) if (p.kartlar) gorulen.push(...p.kartlar);
      assert.equal(new Set(gorulen).size, gorulen.length, 'kart tekrarı');
      const cekilen = new Set(d.deste.cekilenler);
      assert.ok(gorulen.every((k) => cekilen.has(k)));
    }
  }
  assert.ok(oyunSayisi > 1);
});
