import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  kodUret, kodNormalize, kodGecerliMi, kodGoster, kodMaskele, baglantiOlustur, hashtanKod, birlestir,
  seviyeleriHazirla, zamanOnce, esitlemeKur, ESLEME_ANAHTARI, ALFABE, KodHatasi, EsitlemeHatasi,
} from '../js/esitleme.js';
import { ANAHTAR, ilerlemeYukle, ilerlemeKaydet, seviyeSonucuIsle, varsayilanIlerleme } from '../js/ilerleme.js';

function sahteDepo(baslangic = {}) {
  const veri = { ...baslangic };
  return {
    veri,
    getItem: (k) => (k in veri ? veri[k] : null),
    setItem: (k, v) => { veri[k] = String(v); },
    removeItem: (k) => { delete veri[k]; },
  };
}

// Basit sahte Supabase: RPC'ler sözleşmedeki gibi (en yüksek yıldız, ayar anahtar bazında birleşir).
function sahteSunucu({ gecikme = 0 } = {}) {
  const kayitlar = new Map();
  const cagrilar = [];
  const fetch = async (url, secenek) => {
    const ad = String(url).split('/rpc/')[1];
    const g = JSON.parse(secenek.body);
    cagrilar.push({ ad, g, url: String(url), secenek });
    if (gecikme) await new Promise((r) => setTimeout(r, gecikme));
    const yanit = (kod, gov) => ({ ok: kod < 400, status: kod, json: async () => gov });
    if (!/^[A-HJ-NP-Z2-9]{12}$/.test(g.p_kod)) return yanit(400, { code: '22023', message: 'gecersiz_kod' });
    if (ad === 'ilerleme_cek') return yanit(200, kayitlar.get(g.p_kod) ?? null);
    if (ad === 'ilerleme_yaz') {
      const k = kayitlar.get(g.p_kod) ?? { seviyeler: {}, ayarlar: {}, guncelleme: 'x' };
      for (const [id, s] of Object.entries(g.p_seviyeler)) {
        if ((k.seviyeler[id]?.yildiz ?? 0) < s.yildiz) k.seviyeler[id] = { yildiz: s.yildiz };
      }
      Object.assign(k.ayarlar, g.p_ayarlar);
      kayitlar.set(g.p_kod, k);
      return yanit(200, structuredClone(k));
    }
    if (ad === 'ilerleme_sifirla') {
      const k = kayitlar.get(g.p_kod);
      if (k) k.seviyeler = {};
      return yanit(200, { seviyeler: {} });
    }
    return yanit(404, {});
  };
  return { fetch, kayitlar, cagrilar };
}

const KOD = 'ABCD2345WXYZ';

function cihaz(sunucu, ayar = {}) {
  const depo = sahteDepo();
  const e = esitlemeKur({ fetch: sunucu.fetch, depo, bekleme: 5, enAzAralik: 0, cevrimiciMi: () => true, ...ayar });
  return { depo, e };
}

// ---------- Kod ----------

test('kodUret: 12 karakter, yalnız alfabe, farklı çağrılar farklı', () => {
  const kodlar = new Set();
  for (let i = 0; i < 200; i++) {
    const k = kodUret();
    assert.match(k, /^[A-HJ-NP-Z2-9]{12}$/);
    kodlar.add(k);
  }
  assert.ok(kodlar.size > 195);
});

test('kodUret: & 31 eşlemesi her bayt değeri için alfabeye düşer (sapmasız, tüm 256 değer)', () => {
  const sayim = new Map();
  for (let b = 0; b < 256; b++) {
    const k = kodUret(() => new Uint8Array(12).fill(b));
    assert.equal(k[0], ALFABE[b & 31]);
    sayim.set(k[0], (sayim.get(k[0]) ?? 0) + 1);
  }
  assert.equal(sayim.size, 32);
  assert.ok([...sayim.values()].every((n) => n === 8));
});

test('kodNormalize: tire, boşluk ve küçük harfi kabul eder', () => {
  assert.equal(kodNormalize('abcd-2345-wxyz'), KOD);
  assert.equal(kodNormalize('  ABCD 2345 WXYZ '), KOD);
  assert.equal(kodNormalize(KOD), KOD);
});

test('kodNormalize: geçersiz girdi açık hata verir', () => {
  assert.throws(() => kodNormalize('ABCD-2345'), KodHatasi);
  assert.throws(() => kodNormalize('ABCD-2345-WXY0'), /geçersiz karakter/); // 0 alfabede yok
  assert.throws(() => kodNormalize('ABCD-2345-WXYZ-A'), /12 karakter/);
  assert.throws(() => kodNormalize(''), KodHatasi);
  assert.throws(() => kodNormalize(null), KodHatasi);
  assert.equal(kodGecerliMi('abcd 2345 wxyz'), true);
  assert.equal(kodGecerliMi('OOOO-IIII-1111'), false);
});

test('kodGoster ve kodMaskele', () => {
  assert.equal(kodGoster(KOD), 'ABCD-2345-WXYZ');
  assert.equal(kodMaskele(KOD), '••••-••••-WXYZ');
});

test('baglantiOlustur: yolu location üzerinden kurar', () => {
  assert.equal(baglantiOlustur(KOD, { origin: 'https://www.bedirhanoktu.dev', pathname: '/poker/' }),
    'https://www.bedirhanoktu.dev/poker/#esle=ABCD2345WXYZ');
  assert.equal(baglantiOlustur('abcd-2345-wxyz', { origin: 'http://localhost:4183', pathname: '/index.html' }),
    'http://localhost:4183/#esle=ABCD2345WXYZ');
});

test('hashtanKod: eşleme bağlantısını okur, diğer hash\'lere dokunmaz', () => {
  assert.equal(hashtanKod('#esle=abcd-2345-wxyz'), KOD);
  assert.equal(hashtanKod('#esle=ABCD2345WXYZ'), KOD);
  assert.equal(hashtanKod('#esle=ABCD%202345%20WXYZ'), KOD);
  assert.equal(hashtanKod('#esle=bozuk'), 'gecersiz');
  assert.equal(hashtanKod('#/seviye/3'), null);
  assert.equal(hashtanKod(''), null);
});

// ---------- Birleştirme ----------

test('birlestir: her seviyede yüksek yıldız', () => {
  const y = seviyeSonucuIsle(seviyeSonucuIsle(varsayilanIlerleme(), 0, 3), 1, 1);
  const uzak = { seviyeler: { 0: { yildiz: 1 }, 1: { yildiz: 2 }, 2: { yildiz: 3 } }, ayarlar: {} };
  const b = birlestir(y, uzak);
  assert.deepEqual([0, 1, 2].map((i) => b.seviyeler[i].yildiz), [3, 2, 3]);
  assert.equal(b.seviyeler[2].tamam, true);
});

test('birlestir: ayarlarda uzak kazanır; yerelAyar anahtarları yerel kalır; uzakta olmayan anahtar yerel', () => {
  const y = varsayilanIlerleme();
  y.ayarlar.koc = true;
  y.ayarlar.dortRenk = false;
  assert.equal(birlestir(y, { seviyeler: {}, ayarlar: { koc: false, dortRenk: true } }).ayarlar.koc, false);
  assert.equal(birlestir(y, { seviyeler: {}, ayarlar: { koc: false, dortRenk: true } }).ayarlar.dortRenk, true);
  const k = birlestir(y, { seviyeler: {}, ayarlar: { koc: false, dortRenk: true } }, { yerelAyar: ['koc'] });
  assert.equal(k.ayarlar.koc, true);
  assert.equal(k.ayarlar.dortRenk, true);
  assert.equal(birlestir(y, { seviyeler: {}, ayarlar: {} }).ayarlar.koc, true);
});

test('birlestir: bozuk sunucu verisi ilerlemeDuzelt\'ten geçer', () => {
  const b = birlestir(varsayilanIlerleme(), { seviyeler: { 0: { yildiz: 99 }, 77: { yildiz: 3 }, x: 1, 2: { yildiz: -4 } }, ayarlar: { koc: 'evet' } });
  assert.equal(b.seviyeler[0].yildiz, 3);
  assert.equal(b.seviyeler[77], undefined);
  assert.equal(b.seviyeler[2]?.yildiz ?? 0, 0);
  assert.equal(b.ayarlar.koc, true);
});

test('seviyeleriHazirla: 0 yıldız saklanmaz', () => {
  const y = seviyeSonucuIsle(seviyeSonucuIsle(varsayilanIlerleme(), 0, 2), 1, 0);
  assert.deepEqual(seviyeleriHazirla(y.seviyeler), { 0: { yildiz: 2 } });
});

test('zamanOnce', () => {
  const t = 1_000_000_000_000;
  assert.equal(zamanOnce(t, t + 10_000), 'az önce');
  assert.equal(zamanOnce(t, t + 120_000), '2 dk önce');
  assert.equal(zamanOnce(t, t + 3 * 3600_000), '3 sa önce');
  assert.equal(zamanOnce(t, t + 2 * 86400_000), '2 gün önce');
});

// ---------- Eşleme yokken ----------

test('eşleme yokken hiçbir ağ isteği yapılmaz', async () => {
  const s = sahteSunucu();
  const { e } = cihaz(s);
  assert.equal(e.esliMi(), false);
  const r = await e.esitle();
  assert.equal(r.ok, false);
  assert.equal(r.hata, 'esli_degil');
  await e.otomatik();
  e.planla(1);
  e.ayarDegisti('koc');
  await new Promise((r2) => setTimeout(r2, 20));
  assert.equal(s.cagrilar.length, 0);
  assert.equal(e.durum().durum, 'esli-degil');
});

// ---------- Eşitleme ----------

test('esle + esitle: yerel seviyeler sunucuya gider, başlıklar sözleşmeye uyar', async () => {
  const s = sahteSunucu();
  const { depo, e } = cihaz(s);
  let y = varsayilanIlerleme();
  y = seviyeSonucuIsle(seviyeSonucuIsle(seviyeSonucuIsle(y, 0, 3), 1, 2), 2, 1);
  y.ayarlar.dortRenk = true;
  ilerlemeKaydet(y, depo);
  const r = await e.esle(KOD);
  assert.equal(r.ok, true);
  const k = s.kayitlar.get(KOD);
  assert.deepEqual(k.seviyeler, { 0: { yildiz: 3 }, 1: { yildiz: 2 }, 2: { yildiz: 1 } });
  assert.equal(k.ayarlar.dortRenk, true); // ilk eşlemede yerel ayarlar gider
  const yaz = s.cagrilar.find((c) => c.ad === 'ilerleme_yaz');
  assert.equal(yaz.url, 'https://puwingomlswswxxlsywl.supabase.co/rest/v1/rpc/ilerleme_yaz');
  assert.equal(yaz.secenek.method, 'POST');
  assert.match(yaz.secenek.headers.apikey, /^sb_publishable_/);
  assert.equal(e.durum().durum, 'tamam');
  assert.ok(e.durum().sonEsitleme > 0);
  assert.equal(JSON.parse(depo.veri[ESLEME_ANAHTARI]).kod, KOD);
});

test('iki cihaz: A eşler, B katılır, B seviye 3 ekler, A görür; ayarlarda uzak kazanır', async () => {
  const s = sahteSunucu();
  const a = cihaz(s);
  const b = cihaz(s);
  let ya = varsayilanIlerleme();
  for (const [id, n] of [[0, 3], [1, 2], [2, 1]]) ya = seviyeSonucuIsle(ya, id, n);
  ya.ayarlar.koc = false;
  ilerlemeKaydet(ya, a.depo);
  await a.e.esle(KOD);

  const yb = varsayilanIlerleme(); // B'de koc varsayılan true
  ilerlemeKaydet(yb, b.depo);
  const r = await b.e.katil(KOD);
  assert.equal(r.ok, true);
  const bi = ilerlemeYukle(b.depo);
  assert.deepEqual([0, 1, 2].map((i) => bi.seviyeler[i].yildiz), [3, 2, 1]);
  assert.equal(bi.ayarlar.koc, false); // uzak kazandı

  ilerlemeKaydet(seviyeSonucuIsle(bi, 3, 2), b.depo);
  await b.e.esitle();
  let haber = null;
  a.e.ilerlemeDinle((o) => { haber = o; });
  const ra = await a.e.esitle();
  assert.equal(ra.degisti, true);
  assert.equal(ilerlemeYukle(a.depo).seviyeler[3].yildiz, 2);
  assert.equal(haber.ilerleme.seviyeler[3].yildiz, 2);
  const ra2 = await a.e.esitle();
  assert.equal(ra2.degisti, false);
});

test('ayar değişikliği sonra eşitlemede gider ve diğer cihaza ulaşır', async () => {
  const s = sahteSunucu();
  const a = cihaz(s);
  const b = cihaz(s);
  await a.e.esle(KOD);
  await b.e.katil(KOD);
  const ya = ilerlemeYukle(a.depo);
  ya.ayarlar.dortRenk = true;
  ilerlemeKaydet(ya, a.depo);
  a.e.ayarDegisti('dortRenk');
  await new Promise((r) => setTimeout(r, 40)); // debounce
  assert.equal(s.kayitlar.get(KOD).ayarlar.dortRenk, true);
  assert.deepEqual(JSON.parse(a.depo.veri[ESLEME_ANAHTARI]).kirli, []);
  await b.e.esitle();
  assert.equal(ilerlemeYukle(b.depo).ayarlar.dortRenk, true);
});

test('katil: sunucuda olmayan kod kod_yok hatası verir ve eşleme kaydedilmez', async () => {
  const s = sahteSunucu();
  const { depo, e } = cihaz(s);
  await assert.rejects(() => e.katil(KOD), (h) => h instanceof EsitlemeHatasi && h.tur === 'kod_yok');
  assert.equal(e.esliMi(), false);
  assert.equal(depo.veri[ESLEME_ANAHTARI], undefined);
  assert.equal(s.cagrilar.filter((c) => c.ad === 'ilerleme_yaz').length, 0);
});

test('400 gecersiz_kod: sessizce hata durumu, yerel ilerleme dokunulmaz', async () => {
  const s = sahteSunucu();
  const { depo, e } = cihaz(s);
  const y = seviyeSonucuIsle(varsayilanIlerleme(), 0, 3);
  ilerlemeKaydet(y, depo);
  // sunucu kodu reddediyor (alfabe dışı kod doğrudan depoya yazılmışsa okuma da reddeder; geçerli biçimli ama sunucu 400 verirse):
  const reddeden = esitlemeKur({
    depo, bekleme: 5, cevrimiciMi: () => true,
    fetch: async () => ({ ok: false, status: 400, json: async () => ({ message: 'gecersiz_kod' }) }),
  });
  depo.setItem(ESLEME_ANAHTARI, JSON.stringify({ kod: KOD, kirli: [], uzakYildiz: 0 }));
  const r = await reddeden.esitle();
  assert.equal(r.ok, false);
  assert.equal(r.hata, 'gecersiz_kod');
  assert.equal(reddeden.durum().durum, 'hata');
  assert.equal(ilerlemeYukle(depo).seviyeler[0].yildiz, 3);
  void e;
});

test('5xx (sunucu uyuyor): sessiz hata, yerel ilerleme güvende, sonra toparlanır', async () => {
  const s = sahteSunucu();
  let coktu = true;
  const fetch = async (u, o) => (coktu ? { ok: false, status: 503, json: async () => { throw new Error('html'); } } : s.fetch(u, o));
  const depo = sahteDepo();
  const e = esitlemeKur({ fetch, depo, enAzAralik: 0, cevrimiciMi: () => true });
  ilerlemeKaydet(seviyeSonucuIsle(varsayilanIlerleme(), 0, 2), depo);
  await e.esle(KOD);
  assert.equal(e.durum().durum, 'hata');
  assert.equal(e.durum().hata, 'sunucu');
  assert.equal(e.durum().sonEsitleme, null);
  assert.equal(ilerlemeYukle(depo).seviyeler[0].yildiz, 2);
  assert.equal(e.esliMi(), true);
  coktu = false;
  const r = await e.esitle();
  assert.equal(r.ok, true);
  assert.equal(s.kayitlar.get(KOD).seviyeler[0].yildiz, 2);
});

test('zaman aşımı: AbortController ile kesilir, hata zaman_asimi', async () => {
  let iptalGordu = false;
  const fetch = (u, o) => new Promise((_, red) => {
    o.signal.addEventListener('abort', () => { iptalGordu = true; red(Object.assign(new Error('abort'), { name: 'AbortError' })); });
  });
  const depo = sahteDepo();
  const e = esitlemeKur({ fetch, depo, zamanAsimi: 30, cevrimiciMi: () => true });
  const t0 = Date.now();
  await e.esle(KOD);
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(iptalGordu, true);
  assert.equal(e.durum().durum, 'hata');
  assert.equal(e.durum().hata, 'zaman_asimi');
});

test('ağ hatası: sessiz, asla fırlatmaz', async () => {
  const depo = sahteDepo();
  const e = esitlemeKur({ fetch: async () => { throw new TypeError('Failed to fetch'); }, depo, cevrimiciMi: () => true });
  ilerlemeKaydet(seviyeSonucuIsle(varsayilanIlerleme(), 1, 1), depo);
  const r = await e.esle(KOD);
  assert.equal(r.ok, false);
  assert.equal(r.hata, 'ag');
  assert.equal(ilerlemeYukle(depo).seviyeler[1].yildiz, 1);
});

test('çevrimdışıyken fetch çağrılmaz', async () => {
  const s = sahteSunucu();
  const depo = sahteDepo();
  depo.setItem(ESLEME_ANAHTARI, JSON.stringify({ kod: KOD, kirli: [], uzakYildiz: 0 }));
  const e = esitlemeKur({ fetch: s.fetch, depo, cevrimiciMi: () => false });
  const r = await e.esitle();
  assert.equal(r.hata, 'cevrimdisi');
  assert.equal(s.cagrilar.length, 0);
});

test('eşzamanlı iki esitle çağrısı tek isteğe iner', async () => {
  const s = sahteSunucu({ gecikme: 15 });
  const depo = sahteDepo();
  depo.setItem(ESLEME_ANAHTARI, JSON.stringify({ kod: KOD, kirli: [], uzakYildiz: 0 }));
  ilerlemeKaydet(seviyeSonucuIsle(varsayilanIlerleme(), 0, 1), depo);
  const e = esitlemeKur({ fetch: s.fetch, depo, cevrimiciMi: () => true, enAzAralik: 0 });
  const [r1, r2, r3] = await Promise.all([e.esitle(), e.esitle(), e.otomatik()]);
  assert.equal(r1, r2);
  assert.equal(r1, r3);
  // tek geçiş: bir cek + (yerelde fazla olduğu için) bir yaz
  assert.deepEqual(s.cagrilar.map((c) => c.ad), ['ilerleme_cek', 'ilerleme_yaz']);
});

test('otomatik: çok yakın zamanda eşitlendiyse atlar', async () => {
  const s = sahteSunucu();
  const depo = sahteDepo();
  const e = esitlemeKur({ fetch: s.fetch, depo, cevrimiciMi: () => true, enAzAralik: 60_000 });
  await e.esle(KOD);
  const n = s.cagrilar.length;
  const r = await e.otomatik();
  assert.equal(r.atlandi, true);
  assert.equal(s.cagrilar.length, n);
  await e.esitle(); // elle istek her zaman çalışır
  assert.ok(s.cagrilar.length > n);
});

test('istek sırasında oluşan yerel değişiklik kaybolmaz', async () => {
  const s = sahteSunucu({ gecikme: 10 });
  const depo = sahteDepo();
  depo.setItem(ESLEME_ANAHTARI, JSON.stringify({ kod: KOD, kirli: [], uzakYildiz: 0 }));
  const e = esitlemeKur({ fetch: s.fetch, depo, cevrimiciMi: () => true, enAzAralik: 0 });
  const p = e.esitle();
  await new Promise((r) => setTimeout(r, 3));
  ilerlemeKaydet(seviyeSonucuIsle(ilerlemeYukle(depo), 4, 3), depo); // istek uçarken seviye bitti
  await p;
  assert.equal(ilerlemeYukle(depo).seviyeler[4].yildiz, 3);
  assert.equal(s.kayitlar.get(KOD).seviyeler[4].yildiz, 3); // ek tur gönderdi
});

test('sunucudan gelen bozuk yanıt yerel ilerlemeyi bozmaz', async () => {
  const depo = sahteDepo();
  depo.setItem(ESLEME_ANAHTARI, JSON.stringify({ kod: KOD, kirli: [], uzakYildiz: 0 }));
  ilerlemeKaydet(seviyeSonucuIsle(varsayilanIlerleme(), 0, 2), depo);
  const e = esitlemeKur({
    depo, cevrimiciMi: () => true,
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ seviyeler: { 0: { yildiz: 'x' }, 99: { yildiz: 3 }, 5: null }, ayarlar: { koc: 7 } }) }),
  });
  const r = await e.esitle();
  assert.equal(r.ok, true);
  const y = ilerlemeYukle(depo);
  assert.equal(y.seviyeler[0].yildiz, 2);
  assert.equal(y.seviyeler[99], undefined);
  assert.equal(y.ayarlar.koc, true);
  const e2 = esitlemeKur({ depo, cevrimiciMi: () => true, fetch: async () => ({ ok: true, status: 200, json: async () => [1, 2] }) });
  assert.equal((await e2.esitle()).hata, 'yanit');
});

test('başka cihazda sıfırlanınca bu cihaz da sıfırlanır; yıldızlar geri yüklenmez', async () => {
  const s = sahteSunucu();
  const a = cihaz(s);
  const b = cihaz(s);
  ilerlemeKaydet(seviyeSonucuIsle(seviyeSonucuIsle(varsayilanIlerleme(), 0, 3), 1, 2), a.depo);
  await a.e.esle(KOD);
  await b.e.katil(KOD);
  assert.equal(ilerlemeYukle(b.depo).seviyeler[1].yildiz, 2);
  await a.e.herYerdeSifirla();
  assert.deepEqual(ilerlemeYukle(a.depo).seviyeler, {});
  assert.deepEqual(s.kayitlar.get(KOD).seviyeler, {});
  await b.e.esitle();
  assert.deepEqual(ilerlemeYukle(b.depo).seviyeler, {});
  assert.deepEqual(s.kayitlar.get(KOD).seviyeler, {}); // geri yazılmadı
});

test('herYerdeSifirla: sunucu ulaşılamazsa fırlatır ve yerel ilerleme silinmez', async () => {
  const depo = sahteDepo();
  depo.setItem(ESLEME_ANAHTARI, JSON.stringify({ kod: KOD, kirli: [], uzakYildiz: 0 }));
  ilerlemeKaydet(seviyeSonucuIsle(varsayilanIlerleme(), 0, 3), depo);
  const e = esitlemeKur({ depo, cevrimiciMi: () => true, fetch: async () => { throw new TypeError('x'); } });
  await assert.rejects(() => e.herYerdeSifirla(), EsitlemeHatasi);
  assert.equal(ilerlemeYukle(depo).seviyeler[0].yildiz, 3);
});

test('herYerdeSifirla: eşli değilse yalnız yerel sıfırlanır, ağ yok', async () => {
  const s = sahteSunucu();
  const { depo, e } = cihaz(s);
  ilerlemeKaydet(seviyeSonucuIsle(varsayilanIlerleme(), 0, 3), depo);
  await e.herYerdeSifirla();
  assert.equal(depo.veri[ANAHTAR], undefined);
  assert.equal(s.cagrilar.length, 0);
});

test('eslemeyiKaldir: yalnız yerel kodu unutur; ilerleme ve sunucu verisi kalır', async () => {
  const s = sahteSunucu();
  const { depo, e } = cihaz(s);
  ilerlemeKaydet(seviyeSonucuIsle(varsayilanIlerleme(), 0, 3), depo);
  await e.esle(KOD);
  const n = s.cagrilar.length;
  e.eslemeyiKaldir();
  assert.equal(e.esliMi(), false);
  assert.equal(depo.veri[ESLEME_ANAHTARI], undefined);
  assert.equal(e.durum().durum, 'esli-degil');
  assert.equal(ilerlemeYukle(depo).seviyeler[0].yildiz, 3);
  assert.equal(s.kayitlar.get(KOD).seviyeler[0].yildiz, 3);
  await e.esitle();
  assert.equal(s.cagrilar.length, n);
});

test('kod hata mesajlarına ve durum nesnesine sızmaz', async () => {
  const depo = sahteDepo();
  const e = esitlemeKur({ depo, cevrimiciMi: () => true, fetch: async () => { throw new TypeError('Failed to fetch ' + KOD); } });
  const r = await e.esle(KOD);
  assert.ok(!JSON.stringify(r).includes(KOD));
  assert.ok(!JSON.stringify(e.durum()).includes(KOD));
});
