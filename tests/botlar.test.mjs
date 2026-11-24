import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { botKarar, elGucu } from '../js/botlar/bot.js';
import { PROFILLER } from '../js/botlar/profiller.js';
import { Oyun } from '../js/motor/oyun.js';
import { tohumluRng } from '../js/motor/rng.js';

const ID = Object.keys(PROFILLER);

// Eylemin gecerli içinden olduğunu doğrular; geçersizse açıklayıcı hata atar.
function gecerliMi(a, g) {
  assert.ok(a && typeof a.tur === 'string', `eylem yok: ${JSON.stringify(a)}`);
  switch (a.tur) {
    case 'fold': assert.ok(g.fold); assert.ok(!g.check, 'bedava check varken fold'); break;
    case 'check': assert.ok(g.check); break;
    case 'call': assert.ok(g.call !== null); break;
    case 'allin': assert.ok(g.allin); break;
    case 'bet':
    case 'raise': {
      const ar = g[a.tur];
      assert.ok(ar, `${a.tur} geçerli değil`);
      assert.ok(Number.isInteger(a.miktar), `miktar tam sayı değil: ${a.miktar}`);
      assert.ok(a.miktar >= ar.min && a.miktar <= ar.max, `miktar ${a.miktar} ∉ [${ar.min}, ${ar.max}]`);
      break;
    }
    default: assert.fail(`bilinmeyen tür ${a.tur}`);
  }
}

// n oyunculu bir el oynatır; her bot botKarar ile karar verir. Sayaçları günceller.
function elOyna(oyun, rng, kayit) {
  oyun.yeniEl();
  const vpip = new Set();
  const raisePre = new Set();
  let guvenlik = 0;
  while (!oyun.elBittiMi()) {
    if (++guvenlik > 200) throw new Error('el bitmiyor');
    const id = oyun.siradaki();
    const p = oyun.oyuncular.find((o) => o.id === id);
    const gecerli = oyun.gecerliEylemler(id);
    const gor = oyun.gorunum(id);
    const a = botKarar(p.bot, gor, gecerli, { rng });
    gecerliMi(a, gecerli);
    if (kayit) {
      const s = kayit[p.bot];
      if (gor.sokak === 'preflop') {
        if (['call', 'bet', 'raise', 'allin'].includes(a.tur)) vpip.add(p.bot);
        if (['bet', 'raise', 'allin'].includes(a.tur)) raisePre.add(p.bot);
      }
      if (['bet', 'raise', 'allin'].includes(a.tur)) s.agresif++;
      else if (a.tur === 'call' || a.tur === 'check') s.pasif++;
    }
    oyun.eylem(id, a); // geçersizse motor hata fırlatır
  }
  return { vpip, raisePre };
}

test('her profil 500 el boyunca hiç geçersiz eylem üretmez (karışık masa, değişken stack)', () => {
  for (const profil of ID) {
    const rng = tohumluRng(1000 + ID.indexOf(profil));
    let oynanan = 0;
    for (let el = 0; el < 500; el++) {
      const n = 2 + rng.int(4); // 2..5 oyuncu
      const diger = ID[(ID.indexOf(profil) + 1 + rng.int(4)) % ID.length];
      const oyuncular = Array.from({ length: n }, (_, i) => ({
        id: `b${i}`, cip: 40 + rng.int(3000), bot: i % 2 === 0 ? profil : diger,
      }));
      const oyun = new Oyun({ oyuncular, kucukBlind: 10, buyukBlind: 20, rng });
      // Dealer'ı döndürmek için birkaç el boşa oyna değil: yeni Oyun her elde; oturma sırası rastgele
      elOyna(oyun, rng);
      oyun.deste.dogrula();
      oynanan++;
    }
    assert.equal(oynanan, 500);
  }
});

test('bot, tek gerçek Oyun içinde art arda eller oynar (stack bitene kadar)', () => {
  const rng = tohumluRng(77);
  const oyun = new Oyun({
    oyuncular: ID.map((p, i) => ({ id: `b${i}`, cip: 800, bot: p })),
    kucukBlind: 10, buyukBlind: 20, rng, blindArtis: { herElde: 10, carpan: 1.5 },
  });
  let eller = 0;
  while (!oyun.oyunBittiMi() && eller < 300) { elOyna(oyun, rng); eller++; }
  assert.ok(eller > 10);
});

test('profil istatistikleri ayrışır (VPIP ve agresyon sırası)', () => {
  const kayit = Object.fromEntries(ID.map((p) => [p, { el: 0, vpip: 0, pfr: 0, agresif: 0, pasif: 0 }]));
  const rng = tohumluRng(2024);
  const ELLER = 600;
  for (let el = 0; el < ELLER; el++) {
    // Her elde taze 100bb stack; oturma sırası döndürülür ki pozisyon dengelensin.
    const sira = [...ID.slice(el % ID.length), ...ID.slice(0, el % ID.length)];
    const oyun = new Oyun({
      oyuncular: sira.map((p, i) => ({ id: `b${i}`, cip: 2000, bot: p })),
      kucukBlind: 10, buyukBlind: 20, rng,
    });
    const { vpip, raisePre } = elOyna(oyun, rng, kayit);
    for (const p of ID) kayit[p].el++;
    for (const p of vpip) kayit[p].vpip++;
    for (const p of raisePre) kayit[p].pfr++;
  }
  const v = {}, a = {}, pf = {};
  for (const p of ID) {
    const s = kayit[p];
    v[p] = s.vpip / s.el;
    pf[p] = s.pfr / s.el;
    a[p] = s.agresif / (s.agresif + s.pasif);
  }
  console.log('  [ölçüm] VPIP', JSON.stringify(Object.fromEntries(ID.map((p) => [p, +v[p].toFixed(2)]))));
  console.log('  [ölçüm] PFR ', JSON.stringify(Object.fromEntries(ID.map((p) => [p, +pf[p].toFixed(2)]))));
  console.log('  [ölçüm] agresyon', JSON.stringify(Object.fromEntries(ID.map((p) => [p, +a[p].toFixed(2)]))));

  // VPIP: sikiPasif en az; akilli seçici; pasifAcemi ve gevsekAgresif çok el oynar
  assert.ok(v.sikiPasif < 0.15, `sikiPasif VPIP ${v.sikiPasif}`);
  assert.ok(v.sikiPasif < v.akilli, 'sikiPasif < akilli');
  assert.ok(v.akilli < v.blofcu, 'akilli < blofcu');
  assert.ok(v.blofcu < v.pasifAcemi, 'blofcu < pasifAcemi');
  assert.ok(v.pasifAcemi > 0.35, `pasifAcemi VPIP ${v.pasifAcemi}`);
  assert.ok(v.gevsekAgresif > v.pasifAcemi, 'gevsekAgresif en geniş');
  // Agresyon: pasifAcemi neredeyse hiç raise etmez, gevsekAgresif en çok
  assert.ok(a.pasifAcemi < 0.12, `pasifAcemi agresyon ${a.pasifAcemi}`);
  assert.ok(a.pasifAcemi < a.sikiPasif + 0.08 && a.pasifAcemi < a.akilli);
  assert.ok(a.sikiPasif < a.blofcu, 'sikiPasif < blofcu');
  assert.ok(a.akilli < a.gevsekAgresif && a.blofcu < a.gevsekAgresif, 'gevsekAgresif en agresif');
  assert.ok(a.gevsekAgresif > 0.4);
  // Preflop raise: gevsekAgresif >> pasifAcemi, sikiPasif
  assert.ok(pf.gevsekAgresif > pf.akilli && pf.akilli > pf.pasifAcemi);
  assert.ok(pf.pasifAcemi < 0.05 && pf.sikiPasif < 0.05);
});

// Heads-up: 'sen' check/call ile river'a taşır, river'da botun kararını döndürür.
function nehirdeBotKarari(profil, botKartlari, senKartlari, board, rng) {
  const oyun = new Oyun({ oyuncular: [{ id: 'sen', cip: 5000 }, { id: 'bot1', cip: 5000, bot: profil }], kucukBlind: 10, buyukBlind: 20, rng });
  oyun.yeniEl({ hazirKartlar: { sen: senKartlari, bot1: botKartlari, board } });
  for (let i = 0; i < 40; i++) {
    const id = oyun.siradaki();
    const g = oyun.gecerliEylemler(id);
    if (oyun.sokak === 'river' && id === 'bot1') {
      return { karar: botKarar(profil, oyun.gorunum(id), g, { rng }), g };
    }
    // Botun river öncesi hamlelerini check/call ile geçiriyoruz (ölçülen şey river kararı)
    oyun.eylem(id, g.check ? { tur: 'check' } : { tur: 'call' });
  }
  return null;
}

test('blofcu: river\'da zayıf elle sık blöf eder; pasif profiller etmez', () => {
  const oran = (profil) => {
    let bet = 0, n = 300;
    const rng = tohumluRng(31);
    for (let i = 0; i < n; i++) {
      // Bot 7♥2♦ (hiçbir şey), board A♠ K♦ 9♣ 5♥ 3♠ kuru; sen de zayıfsın
      const r = nehirdeBotKarari(profil, ['7h', '2d'], ['8c', '4s'], ['As', 'Kd', '9c', '5h', '3s'], rng);
      assert.ok(r, 'river kararı alınamadı');
      gecerliMi(r.karar, r.g);
      if (r.karar.tur === 'bet' || r.karar.tur === 'raise' || r.karar.tur === 'allin') bet++;
    }
    return bet / n;
  };
  const blof = oran('blofcu');
  const siki = oran('sikiPasif');
  const acemi = oran('pasifAcemi');
  const akilli = oran('akilli');
  console.log(`  [ölçüm] river'da zayıf el bahis oranı: blofcu ${blof.toFixed(2)}, akilli ${akilli.toFixed(2)}, sikiPasif ${siki.toFixed(2)}, pasifAcemi ${acemi.toFixed(2)}`);
  assert.ok(blof > 0.4, `blofcu blöf oranı ${blof}`);
  assert.ok(siki < 0.05 && acemi < 0.05);
  assert.ok(akilli > 0 && akilli < 0.25, `akilli ara sıra blöf: ${akilli}`);
});

test('blofcu bahisleri büyüktür (pot civarı); sikiPasif güçlü elde bahis açar', () => {
  const rng = tohumluRng(5);
  let toplamOran = 0, adet = 0;
  for (let i = 0; i < 200; i++) {
    const r = nehirdeBotKarari('blofcu', ['7h', '2d'], ['8c', '4s'], ['As', 'Kd', '9c', '5h', '3s'], rng);
    if (r.karar.tur === 'bet') { toplamOran += r.karar.miktar / 40; adet++; } // river öncesi pot 40
  }
  assert.ok(adet > 50);
  assert.ok(toplamOran / adet > 0.8 && toplamOran / adet < 1.2, `ortalama bet/pot ${toplamOran / adet}`);
  // Set elde sikiPasif bahis açar
  let bet = 0;
  for (let i = 0; i < 100; i++) {
    const r = nehirdeBotKarari('sikiPasif', ['9h', '9d'], ['8c', '4s'], ['As', 'Kd', '9c', '5h', '3s'], rng);
    if (r.karar.tur === 'bet') bet++;
  }
  assert.ok(bet > 20 && bet < 70, `sikiPasif set bet sayısı ${bet}`);
});

test('akilli: pot oranına göre call/fold (floş çekişi ucuza call, çöp büyük bahse fold)', () => {
  const rng = tohumluRng(9);
  const kur = (botEl, senEl, board, senBahis) => {
    // bot dealer: flop'ta 'sen' önce konuşur ve bahis açar
    const oyun = new Oyun({ oyuncular: [{ id: 'bot1', cip: 5000, bot: 'akilli' }, { id: 'sen', cip: 5000 }], kucukBlind: 10, buyukBlind: 20, rng });
    oyun.yeniEl({ hazirKartlar: { sen: senEl, bot1: botEl, board } });
    // preflop: herkes call/check, flop: bot'tan önce sen bahis aç
    for (let i = 0; i < 20; i++) {
      const id = oyun.siradaki();
      const g = oyun.gecerliEylemler(id);
      if (oyun.sokak === 'flop' && id === 'sen' && g.bet) { oyun.eylem('sen', { tur: 'bet', miktar: senBahis }); break; }
      if (oyun.sokak === 'flop' && id === 'bot1') break;
      oyun.eylem(id, g.check ? { tur: 'check' } : { tur: 'call' });
    }
    return oyun;
  };
  const say = (botEl, senEl, board, senBahis) => {
    const t = { fold: 0, call: 0, agresif: 0 };
    for (let i = 0; i < 60; i++) {
      const oyun = kur(botEl, senEl, board, senBahis);
      const id = oyun.siradaki();
      if (id !== 'bot1') continue;
      const g = oyun.gecerliEylemler(id);
      const a = botKarar('akilli', oyun.gorunum(id), g, { rng });
      gecerliMi(a, g);
      if (a.tur === 'fold') t.fold++; else if (a.tur === 'call') t.call++; else t.agresif++;
    }
    return t;
  };
  const cekis = say(['Ah', '5h'], ['Qs', 'Qd'], ['Kh', '9h', '2c'], 20); // pot 40, yarım pot bahis, 9 out
  assert.ok(cekis.fold === 0, `ucuz bahse floş çekişi fold etmemeli: ${JSON.stringify(cekis)}`);
  const cop = say(['7h', '2d'], ['As', 'Ad'], ['Kc', '9s', '4d'], 200); // pot 40, 5x pot bahis
  assert.ok(cop.fold > 50, `çöp elle büyük bahse fold: ${JSON.stringify(cop)}`);
});

test('bot yalnızca gorunum görür: gizli kartlar kararı değiştirmez, gorunum donmuş olsa da çalışır', () => {
  const kur = (senKartlari) => {
    const oyun = new Oyun({ oyuncular: [{ id: 'sen', cip: 2000 }, { id: 'bot1', cip: 2000, bot: 'x' }], kucukBlind: 10, buyukBlind: 20, rng: tohumluRng(1) });
    oyun.yeniEl({ hazirKartlar: { sen: senKartlari, bot1: ['Jh', 'Td'], board: ['9h', '8s', '2c', 'Kd', '3s'] } });
    return oyun;
  };
  const derinDondur = (o) => { Object.values(o).forEach((v) => { if (v && typeof v === 'object') derinDondur(v); }); return Object.freeze(o); };
  for (const profil of ID) {
    const a = kur(['As', 'Ad']);
    const b = kur(['2h', '7d']);
    // sen preflop call, bot1'in sırası gelir
    for (const o of [a, b]) o.eylem('sen', { tur: 'call' });
    const ga = a.gorunum('bot1'), gb = b.gorunum('bot1');
    assert.deepEqual(ga, gb, 'başkasının kartı görünümde yok');
    assert.ok(!JSON.stringify(ga).includes('"As"') || ga.benimKartlarim.includes('As'));
    derinDondur(ga);
    const ka = botKarar(profil, ga, a.gecerliEylemler('bot1'), { rng: tohumluRng(123) });
    const kb = botKarar(profil, gb, b.gecerliEylemler('bot1'), { rng: tohumluRng(123) });
    assert.deepEqual(ka, kb, `${profil}: aynı görünüm, aynı karar`);
  }
});

test('bot.js ve profiller.js motor iç durumuna (Oyun, Deste) bağımlı değil', () => {
  for (const dosya of ['bot.js', 'profiller.js']) {
    const kaynak = readFileSync(new URL(`../js/botlar/${dosya}`, import.meta.url), 'utf8');
    const importlar = [...kaynak.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    for (const yol of importlar) {
      assert.ok(!/oyun\.js|deste\.js|pot\.js/.test(yol), `${dosya} şunu içe aktarıyor: ${yol}`);
    }
    assert.ok(!/\.durum\(|\.deste\b|\.oyuncular\.map\(\(p\) => p\.kartlar/.test(kaynak), `${dosya} gizli duruma erişiyor`);
  }
});

test('profil sözleşmesi: 5 profil, alanlar dolu, bilinmeyen profil hata', () => {
  assert.deepEqual(ID.sort(), ['akilli', 'blofcu', 'gevsekAgresif', 'pasifAcemi', 'sikiPasif']);
  for (const p of Object.values(PROFILLER)) {
    assert.ok(p.id && p.ad && p.aciklama.length > 20);
    assert.ok(Array.isArray(p.ipuclari) && p.ipuclari.length >= 3);
    assert.ok(p.params && p.params.preflop && p.params.postflop);
  }
  const oyun = new Oyun({ oyuncular: [{ id: 'a', cip: 500 }, { id: 'b', cip: 500 }], kucukBlind: 10, buyukBlind: 20, rng: tohumluRng(1) });
  oyun.yeniEl();
  const id = oyun.siradaki();
  assert.throws(() => botKarar('yok', oyun.gorunum(id), oyun.gecerliEylemler(id), { rng: tohumluRng(1) }));
});

test('elGucu: temel sıralama (set > üst çift > çöp), çekiş bonusu', () => {
  const board = ['9c', '7d', '2s'];
  const set = elGucu(['9h', '9d'], board);
  const ust = elGucu(['9h', 'Ad'], board);
  const cop = elGucu(['Kh', '3d'], board);
  const flos = elGucu(['Ah', '5h'], ['Kh', '9h', '2c']);
  assert.ok(set > ust && ust > cop, `${set} ${ust} ${cop}`);
  assert.ok(flos > 0.3, `floş çekişi ${flos}`);
  assert.ok(elGucu(['7h', '2d'], ['As', 'Ks', 'Qs', 'Js', 'Ts']) < 0.3, 'board\'daki royal elin değil');
});
