import { test } from 'node:test';
import assert from 'node:assert/strict';
import { equity, rastgeleRakibeKarsi, potOrani, kural24, kesinCekmeOlasiligi } from '../js/analiz/olasilik.js';
import { tohumluRng } from '../js/motor/rng.js';

const yakin = (a, b, tol, mesaj) => assert.ok(Math.abs(a - b) <= tol, `${mesaj ?? ''} beklenen ≈${b}±${tol}, gelen ${a}`);

test('AA vs KK preflop ≈ %82 (20000 iterasyon)', () => {
  const [aa, kk] = equity([['As', 'Ah'], ['Kd', 'Kc']], [], { iterasyon: 20000, rng: tohumluRng(11) });
  yakin(aa.equity, 0.82, 0.015, 'AA');
  yakin(kk.equity, 0.18, 0.015, 'KK');
  yakin(aa.equity + kk.equity, 1, 1e-9, 'toplam');
});

test('AKs vs 22 yazı tura civarı ≈ %50', () => {
  const [ak, iki] = equity([['As', 'Ks'], ['2h', '2d']], [], { iterasyon: 20000, rng: tohumluRng(5) });
  yakin(ak.equity, 0.5, 0.02, 'AKs');
  yakin(ak.equity + iki.equity, 1, 1e-9);
});

test('flop\'ta floş çekişi, river\'a kadar kesin sayım ≈ %36', () => {
  // Kahraman 5♥4♥ (floş çekişi) vs As Ad; 9 kupa out'u, 45 bilinmeyen kart.
  const [k, r] = equity([['5h', '4h'], ['As', 'Ad']], ['Kh', '9h', 'Qc']);
  yakin(k.equity, kesinCekmeOlasiligi(9, 45, 2), 0.02, 'floş çekişi');
  yakin(k.equity, 0.36, 0.02);
  yakin(k.equity + r.equity, 1, 1e-9);
});

test('kesin sayım deterministiktir; turn ve river\'da da çalışır', () => {
  const eller = [['Ah', 'Qh'], ['Jd', 'Jc']];
  const board = ['Kh', '7h', '2s'];
  assert.deepEqual(equity(eller, board), equity(eller, board));
  const turn = equity(eller, [...board, '3c']);
  assert.ok(turn[0].equity > 0 && turn[0].equity < 1);
  yakin(turn[0].equity + turn[1].equity, 1, 1e-9);
  const nehir = equity(eller, [...board, '3c', '9d']);
  assert.equal(nehir[0].equity + nehir[1].equity, 1);
  assert.ok(nehir[0].equity === 0 || nehir[0].equity === 1 || nehir[0].beraberlik > 0);
});

test('Monte Carlo, kesin sayıma yakınsar', () => {
  // 2 kartlık board'da kalan 3 kart: MC. Referans: her 3. kart için kesin sayımın ortalaması.
  const eller = [['Ah', 'Qh'], ['Jd', 'Jc']];
  const board = ['Kh', '7h'];
  const mc = equity(eller, board, { iterasyon: 30000, rng: tohumluRng(3) })[0].equity;
  const kullanilan = new Set([...eller.flat(), ...board]);
  let toplam = 0, n = 0;
  for (const d of '23456789TJQKA') {
    for (const r of 'shdc') {
      if (kullanilan.has(d + r)) continue;
      toplam += equity(eller, [...board, d + r])[0].equity;
      n++;
    }
  }
  yakin(mc, toplam / n, 0.01, 'MC ≈ kesin');
});

test('beraberlik ve çoklu el: payların toplamı 1', () => {
  // Board'daki royal: herkes beraber
  const r = equity([['2c', '3d'], ['4c', '5d']], ['As', 'Ks', 'Qs', 'Js', 'Ts']);
  assert.equal(r[0].kazanma, 0);
  assert.equal(r[0].beraberlik, 1);
  yakin(r[0].equity, 0.5, 1e-9);
  const uc = equity([['As', 'Ah'], ['Kd', 'Kc'], ['Qh', 'Qd']], [], { iterasyon: 4000, rng: tohumluRng(2) });
  yakin(uc.reduce((t, x) => t + x.equity, 0), 1, 1e-9);
  assert.ok(uc[0].equity > uc[1].equity && uc[1].equity > uc[2].equity);
});

test('olu kartlar hesaba katılır; tekrarlanan kart hata', () => {
  const a = equity([['5h', '4h'], ['As', 'Ad']], ['Kh', '9h', 'Qc']);
  const b = equity([['5h', '4h'], ['As', 'Ad']], ['Kh', '9h', 'Qc'], { olu: ['2h', '3h', '6h', '7h', '8h'] });
  assert.ok(b[0].equity < a[0].equity, 'ölü kupalar floş şansını düşürür');
  assert.throws(() => equity([['As', 'Ah'], ['As', 'Kd']], []));
});

test('rastgeleRakibeKarsi: AA tek rakibe karşı ≈ %85, 4 rakibe karşı ≈ %56', () => {
  const bir = rastgeleRakibeKarsi(['As', 'Ah'], [], 1, { iterasyon: 20000, rng: tohumluRng(4) });
  yakin(bir.equity, 0.852, 0.015);
  const dort = rastgeleRakibeKarsi(['As', 'Ah'], [], 4, { iterasyon: 20000, rng: tohumluRng(6) });
  yakin(dort.equity, 0.56, 0.03);
  assert.ok(bir.kazanma + bir.beraberlik <= 1);
});

test('rastgeleRakibeKarsi: board biliniyorsa tutarlı; yakalanan el eşitlenir', () => {
  // Nut flush + set: river'da güçlü
  const g = rastgeleRakibeKarsi(['Ah', 'Kh'], ['Qh', '7h', '2h', '9c', '3d'], 2, { iterasyon: 5000, rng: tohumluRng(8) });
  assert.ok(g.equity > 0.95);
  const z = rastgeleRakibeKarsi(['7c', '2d'], ['As', 'Ks', 'Qh', 'Jd', '9c'], 1, { iterasyon: 5000, rng: tohumluRng(8) });
  assert.ok(z.equity < 0.35);
});

test('aynı tohum aynı sonucu verir', () => {
  const a = rastgeleRakibeKarsi(['Jh', 'Th'], ['9h', '2c', '3d'], 2, { iterasyon: 2000, rng: tohumluRng(21) });
  const b = rastgeleRakibeKarsi(['Jh', 'Th'], ['9h', '2c', '3d'], 2, { iterasyon: 2000, rng: tohumluRng(21) });
  assert.deepEqual(a, b);
});

test('potOrani, kural24, kesinCekmeOlasiligi', () => {
  yakin(potOrani(100, 25), 0.2, 1e-12);
  yakin(potOrani(60, 40), 0.4, 1e-12);
  assert.equal(potOrani(100, 0), 0);
  assert.equal(kural24(9, 2), 36);
  assert.equal(kural24(9, 1), 18);
  assert.equal(kural24(8, 1), 16);
  yakin(kesinCekmeOlasiligi(9, 47, 2), 0.3497, 0.0001);
  yakin(kesinCekmeOlasiligi(9, 47, 1), 9 / 47, 1e-12);
  yakin(kesinCekmeOlasiligi(9, 46, 1), 0.1957, 0.0001);
  assert.equal(kesinCekmeOlasiligi(0, 47, 2), 0);
});

test('hız: Monte Carlo 20000 iterasyon makul sürede', () => {
  const t0 = performance.now();
  equity([['As', 'Ah'], ['Kd', 'Kc']], [], { iterasyon: 20000, rng: tohumluRng(1) });
  const ms = performance.now() - t0;
  console.log(`  [ölçüm] equity 20000 it. (2 el): ${ms.toFixed(0)} ms`);
  assert.ok(ms < 1000, `çok yavaş: ${ms} ms`);
});
