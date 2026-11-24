// Cihazlar arası ilerleme eşitleme (sunucu sözleşmesi: supabase/README.md). DOM'a dokunmaz.
// Hesap yok: 12 karakterlik eşleme kodu anahtardır. Kod hiçbir yere yazılmaz (log, hata mesajı, URL).
// fetch ve depo parametreyle verilebilir (testler için). Ağ sorunları oyunu ve yerel ilerlemeyi etkilemez.

import { ilerlemeYukle, ilerlemeKaydet, ilerlemeSifirla, ilerlemeDuzelt, SEVIYE_SAYISI } from './ilerleme.js';

export const ESLEME_ANAHTARI = 'poker-okulu-esleme';
export const SUNUCU = 'https://puwingomlswswxxlsywl.supabase.co/rest/v1/rpc/';
export const YAYINLANABILIR_ANAHTAR = 'sb_publishable_wC3YWSk4DhyX4Q9N_78cBQ_qvrcDD9H';
export const ALFABE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const KOD_UZUNLUGU = 12;
export const AYAR_ANAHTARLARI = ['koc', 'dortRenk'];
export const ZAMAN_ASIMI = 8000;
export const BEKLEME = 1500;
export const EN_AZ_ARALIK = 10000;

// ---------- Kod ----------

export class KodHatasi extends Error {
  constructor(mesaj) {
    super(mesaj);
    this.name = 'KodHatasi';
  }
}

function guvenliBayt(n) {
  const c = globalThis.crypto;
  if (!c?.getRandomValues) throw new Error('Güvenli rastgele sayı üreteci bu tarayıcıda yok.');
  return c.getRandomValues(new Uint8Array(n));
}

// 32 karakterlik alfabe: `& 31` modulo sapması yaratmaz. Döner: 12 karakter (tiresiz).
export function kodUret(bayt = guvenliBayt) {
  const b = bayt(KOD_UZUNLUGU);
  let s = '';
  for (let i = 0; i < KOD_UZUNLUGU; i++) s += ALFABE[b[i] & 31];
  return s;
}

// Girdideki boşluk/tire/küçük harf toleranslı; geçersizse KodHatasi. Döner: 12 karakter büyük harf.
export function kodNormalize(girdi) {
  if (typeof girdi !== 'string') throw new KodHatasi('Kod yazı olmalı.');
  const temiz = girdi.replace(/[\s\-_]+/g, '').toUpperCase();
  if (temiz.length !== KOD_UZUNLUGU) throw new KodHatasi(`Kod ${KOD_UZUNLUGU} karakter olmalı (XXXX-XXXX-XXXX).`);
  for (const ch of temiz) {
    if (!ALFABE.includes(ch)) throw new KodHatasi('Kodda geçersiz karakter var. Kodlarda 0, 1, I ve O kullanılmaz.');
  }
  return temiz;
}

export function kodGecerliMi(girdi) {
  try {
    kodNormalize(girdi);
    return true;
  } catch {
    return false;
  }
}

export function kodGoster(kod) {
  const k = kodNormalize(kod);
  return `${k.slice(0, 4)}-${k.slice(4, 8)}-${k.slice(8)}`;
}

// Son 4 hane görünür: ••••-••••-AB3K
export function kodMaskele(kod) {
  const k = kodNormalize(kod);
  return `••••-••••-${k.slice(8)}`;
}

// konum: { origin, pathname } (location). Yolu göreli kurar; yerelde de çalışır.
export function baglantiOlustur(kod, konum) {
  const k = kodNormalize(kod);
  const yol = String(konum.pathname ?? '/').replace(/index\.html$/, '');
  return `${konum.origin}${yol}#esle=${k}`;
}

// '#esle=KOD' → 12 karakterlik kod; hash eşleme bağlantısı değilse null; kod bozuksa 'gecersiz'.
export function hashtanKod(hash) {
  const m = /^#esle=(.*)$/i.exec(String(hash ?? ''));
  if (!m) return null;
  let ham = m[1];
  try { ham = decodeURIComponent(ham); } catch { /* ham kalsın */ }
  try { return kodNormalize(ham); } catch { return 'gecersiz'; }
}

// ---------- Birleştirme (sunucu kuralıyla aynı) ----------

function sunucuSeviyeleri(ham) {
  return ilerlemeDuzelt({ seviyeler: ham?.seviyeler }).seviyeler;
}

export function toplamYildiz(seviyeler) {
  let t = 0;
  for (const s of Object.values(seviyeler ?? {})) t += s?.yildiz ?? 0;
  return t;
}

// Her seviyede yüksek yıldız. Ayarlar: uzakta varsa uzak kazanır; yerelAyar'daki (henüz gönderilmemiş
// yerel değişiklik) anahtarlar yerel kalır. `uzak` null ise yerel olduğu gibi döner.
export function birlestir(yerel, uzak, { yerelAyar = [] } = {}) {
  const y = ilerlemeDuzelt(yerel);
  if (!uzak || typeof uzak !== 'object') return y;
  const sonuc = ilerlemeDuzelt(y);
  const uSev = sunucuSeviyeleri(uzak);
  for (const [id, s] of Object.entries(uSev)) {
    const eski = sonuc.seviyeler[id]?.yildiz ?? 0;
    if (s.yildiz > eski) sonuc.seviyeler[id] = { yildiz: s.yildiz, tamam: true };
  }
  const uAyar = uzak.ayarlar && typeof uzak.ayarlar === 'object' ? uzak.ayarlar : {};
  for (const k of AYAR_ANAHTARLARI) {
    if (yerelAyar.includes(k)) continue;
    if (typeof uAyar[k] === 'boolean') sonuc.ayarlar[k] = uAyar[k];
  }
  return sonuc;
}

// Sunucuya gidecek biçim: {"0":{"yildiz":3}}, 0 yıldız saklanmaz.
export function seviyeleriHazirla(seviyeler) {
  const cikti = {};
  for (const [id, s] of Object.entries(seviyeler ?? {})) {
    const n = Number(id);
    const y = s?.yildiz ?? 0;
    if (Number.isInteger(n) && n >= 0 && n < SEVIYE_SAYISI && y > 0) cikti[n] = { yildiz: Math.min(3, y) };
  }
  return cikti;
}

function ayniMi(a, b) {
  return JSON.stringify(ilerlemeDuzelt(a)) === JSON.stringify(ilerlemeDuzelt(b));
}

// "az önce", "2 dk önce", "3 sa önce", "2 gün önce"
export function zamanOnce(zaman, simdi = Date.now()) {
  if (!Number.isFinite(zaman)) return '';
  const sn = Math.max(0, Math.round((simdi - zaman) / 1000));
  if (sn < 45) return 'az önce';
  const dk = Math.round(sn / 60);
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.round(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  return `${Math.round(sa / 24)} gün önce`;
}

// ---------- Hata ----------

export class EsitlemeHatasi extends Error {
  // tur: 'ag' | 'zaman_asimi' | 'cevrimdisi' | 'sunucu' | 'gecersiz_kod' | 'yanit' | 'kod_yok' | 'esli_degil'
  constructor(tur, durum = 0) {
    super(tur);
    this.name = 'EsitlemeHatasi';
    this.tur = tur;
    this.durum = durum;
  }
}

// ---------- Eşleme deposu ----------
// Kayıt: { kod, kirli: [ayar anahtarları], uzakYildiz }. kirli: sunucuya henüz gönderilmemiş yerel ayar değişikliği.

function depoAl(depo) {
  if (depo) return depo;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function eslemeOku(depo) {
  const d = depoAl(depo);
  if (!d) return null;
  try {
    const ham = d.getItem(ESLEME_ANAHTARI);
    if (!ham) return null;
    const o = JSON.parse(ham);
    const kod = kodNormalize(o?.kod);
    const kirli = Array.isArray(o.kirli) ? o.kirli.filter((k) => AYAR_ANAHTARLARI.includes(k)) : [];
    return { kod, kirli: [...new Set(kirli)], uzakYildiz: Math.max(0, Number(o.uzakYildiz) || 0) };
  } catch {
    return null;
  }
}

function eslemeYaz(esleme, depo) {
  const d = depoAl(depo);
  if (!d) return false;
  try {
    if (!esleme) d.removeItem(ESLEME_ANAHTARI);
    else d.setItem(ESLEME_ANAHTARI, JSON.stringify(esleme));
    return true;
  } catch {
    return false;
  }
}

// ---------- Eşitleyici ----------

export function esitlemeKur({
  fetch: fetchFn = globalThis.fetch?.bind(globalThis),
  depo, // ilerleme deposu (localStorage benzeri)
  eslemeDepo = depo,
  zamanAsimi = ZAMAN_ASIMI,
  bekleme = BEKLEME,
  enAzAralik = EN_AZ_ARALIK,
  simdi = () => Date.now(),
  cevrimiciMi = () => globalThis.navigator?.onLine !== false,
  sunucu = SUNUCU,
  anahtar = YAYINLANABILIR_ANAHTAR,
} = {}) {
  let durum = 'esli-degil';
  let sonEsitleme = null;
  let sonHata = null;
  let sonDeneme = 0;
  let ucustaki = null;
  let zamanlayici = null;
  const durumDinleyenler = new Set();
  const ilerlemeDinleyenler = new Set();

  const esleme = () => eslemeOku(eslemeDepo);
  const kayit = (e) => eslemeYaz(e, eslemeDepo);

  function bildir(kume, veri) {
    for (const fn of [...kume]) {
      try { fn(veri); } catch { /* dinleyici hatası eşitlemeyi bozmaz */ }
    }
  }
  function durumAyarla(yeni, hata = null) {
    durum = yeni;
    sonHata = hata;
    bildir(durumDinleyenler, durumAl());
  }
  function durumAl() {
    return { durum, sonEsitleme, hata: sonHata };
  }

  async function rpc(ad, govde) {
    if (typeof fetchFn !== 'function') throw new EsitlemeHatasi('ag');
    const kontrol = new AbortController();
    let doldu = false;
    const sayac = setTimeout(() => { doldu = true; kontrol.abort(); }, zamanAsimi);
    try {
      let yanit;
      try {
        yanit = await fetchFn(`${sunucu}${ad}`, {
          method: 'POST',
          headers: { apikey: anahtar, 'content-type': 'application/json' },
          body: JSON.stringify(govde),
          signal: kontrol.signal,
          cache: 'no-store',
          credentials: 'omit',
        });
      } catch {
        throw new EsitlemeHatasi(doldu ? 'zaman_asimi' : 'ag');
      }
      if (!yanit.ok) {
        let mesaj = '';
        try { mesaj = String((await yanit.json())?.message ?? ''); } catch { /* gövde yok */ }
        if (yanit.status === 400 && mesaj === 'gecersiz_kod') throw new EsitlemeHatasi('gecersiz_kod', 400);
        throw new EsitlemeHatasi('sunucu', yanit.status);
      }
      try {
        return await yanit.json();
      } catch {
        throw new EsitlemeHatasi(doldu ? 'zaman_asimi' : 'yanit', yanit.status);
      }
    } finally {
      clearTimeout(sayac);
    }
  }

  function uzakDogrula(uzak) {
    if (uzak === null) return null;
    if (!uzak || typeof uzak !== 'object' || Array.isArray(uzak)) throw new EsitlemeHatasi('yanit');
    return uzak;
  }

  // Yerel ilerlemeyi depoya yazar; değiştiyse dinleyicilere haber verir.
  function yerelUygula(eski, yeni) {
    if (ayniMi(eski, yeni)) return false;
    ilerlemeKaydet(yeni, depo);
    bildir(ilerlemeDinleyenler, { ilerleme: ilerlemeYukle(depo) });
    return true;
  }

  async function gecis(kod) {
    let degisti = false;
    for (let tur = 0; tur < 3; tur++) {
      let e = esleme();
      if (!e || e.kod !== kod) throw new EsitlemeHatasi('esli_degil');

      // 1) sunucudaki durumu oku
      const uzak = uzakDogrula(await rpc('ilerleme_cek', { p_kod: kod }));
      e = esleme();
      if (!e || e.kod !== kod) throw new EsitlemeHatasi('esli_degil');
      let yerel = ilerlemeYukle(depo);

      // Başka cihaz "her yerde sıfırla" yaptıysa: sunucuda hiç yıldız yok, oysa bu cihaz sunucuda yıldız görmüştü.
      if (uzak && toplamYildiz(sunucuSeviyeleri(uzak)) === 0 && e.uzakYildiz > 0) {
        const bos = { seviyeler: {}, ayarlar: { ...yerel.ayarlar } };
        if (yerelUygula(yerel, bos)) degisti = true;
        yerel = ilerlemeYukle(depo);
        e.uzakYildiz = 0;
        kayit(e);
      }

      let birlesik = birlestir(yerel, uzak, { yerelAyar: e.kirli });
      let sonUzak = uzak;
      let gonderilenAyar = {};

      // 2) yerelde sunucuda olmayan bir şey varsa yaz (sunucu da birleştirip döner)
      const yereldeFazla = Object.entries(yerel.seviyeler).some(([id, s]) => s.yildiz > (uzak ? sunucuSeviyeleri(uzak)[id]?.yildiz ?? 0 : 0));
      if (!uzak || yereldeFazla || e.kirli.length) {
        for (const k of e.kirli) gonderilenAyar[k] = yerel.ayarlar[k];
        const yazilan = uzakDogrula(await rpc('ilerleme_yaz', {
          p_kod: kod,
          p_seviyeler: seviyeleriHazirla(birlesik.seviyeler),
          p_ayarlar: gonderilenAyar,
        }));
        if (yazilan === null) throw new EsitlemeHatasi('yanit');
        sonUzak = yazilan;
      }

      // 3) bekleme sırasında yerel değişmiş olabilir: taze oku, kirliyi güncelle, sonucu birleştir
      e = esleme();
      if (!e || e.kod !== kod) throw new EsitlemeHatasi('esli_degil');
      const taze = ilerlemeYukle(depo);
      e.kirli = e.kirli.filter((k) => !(k in gonderilenAyar) || taze.ayarlar[k] !== gonderilenAyar[k]);
      const son = birlestir(taze, sonUzak, { yerelAyar: e.kirli });
      e.uzakYildiz = toplamYildiz(sunucuSeviyeleri(sonUzak));
      kayit(e);
      if (yerelUygula(taze, son)) degisti = true;

      // yazma sırasında yeni yerel veri geldiyse bir tur daha
      const eksik = Object.entries(son.seviyeler).some(([id, s]) => s.yildiz > (sunucuSeviyeleri(sonUzak)[id]?.yildiz ?? 0));
      if (!eksik && !e.kirli.length) return degisti;
    }
    return degisti;
  }

  async function calistir() {
    const e = esleme();
    if (!e) {
      if (durum !== 'esli-degil') durumAyarla('esli-degil');
      return { ok: false, degisti: false, hata: 'esli_degil' };
    }
    sonDeneme = simdi();
    if (!cevrimiciMi()) {
      durumAyarla('hata', 'cevrimdisi');
      return { ok: false, degisti: false, hata: 'cevrimdisi' };
    }
    durumAyarla('esitleniyor');
    try {
      const degisti = await gecis(e.kod);
      sonEsitleme = simdi();
      durumAyarla('tamam');
      return { ok: true, degisti };
    } catch (h) {
      const tur = h instanceof EsitlemeHatasi ? h.tur : 'ag';
      if (tur === 'esli_degil') {
        durumAyarla('esli-degil');
        return { ok: false, degisti: false, hata: tur };
      }
      durumAyarla('hata', tur);
      return { ok: false, degisti: false, hata: tur };
    }
  }

  // Eşzamanlı çağrılar tek isteğe iner. Hiçbir zaman reddetmez.
  function esitle() {
    if (ucustaki) return ucustaki;
    if (!esleme()) {
      if (durum !== 'esli-degil') durumAyarla('esli-degil');
      return Promise.resolve({ ok: false, degisti: false, hata: 'esli_degil' });
    }
    ucustaki = calistir().finally(() => { ucustaki = null; });
    return ucustaki;
  }

  // Açılış, sekme görünür, online gibi sık gelen tetikler için: çok yakın zamanda denendiyse atla.
  function otomatik() {
    if (!esleme()) return Promise.resolve({ ok: false, degisti: false, hata: 'esli_degil' });
    if (!ucustaki && sonDeneme && simdi() - sonDeneme < enAzAralik && durum === 'tamam') {
      return Promise.resolve({ ok: true, degisti: false, atlandi: true });
    }
    return esitle();
  }

  // Seviye sonucu / ayar kaydından sonra: kısa gecikmeyle (debounce) tek eşitleme.
  function planla(ms = bekleme) {
    if (!esleme()) return;
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(() => { zamanlayici = null; esitle(); }, ms);
  }

  function ayarDegisti(anahtarlar) {
    const e = esleme();
    if (!e) return;
    const liste = [anahtarlar].flat().filter((k) => AYAR_ANAHTARLARI.includes(k));
    if (!liste.length) return;
    e.kirli = [...new Set([...e.kirli, ...liste])];
    kayit(e);
    planla();
  }

  // Yeni oluşturulan kodla eşle: yerel ayarlar da sunucuya gider (ilk eşleme).
  function esle(kod) {
    const k = kodNormalize(kod);
    clearTimeout(zamanlayici);
    kayit({ kod: k, kirli: [...AYAR_ANAHTARLARI], uzakYildiz: 0 });
    durumAyarla('esitleniyor');
    return esitle();
  }

  // Var olan kodla katıl: önce kodun sunucuda var olduğunu doğrular; ayarlarda uzak kazanır, seviyeler birleşir.
  async function katil(kod) {
    const k = kodNormalize(kod);
    if (!cevrimiciMi()) throw new EsitlemeHatasi('cevrimdisi');
    const uzak = uzakDogrula(await rpc('ilerleme_cek', { p_kod: k }));
    if (uzak === null) throw new EsitlemeHatasi('kod_yok');
    clearTimeout(zamanlayici);
    kayit({ kod: k, kirli: [], uzakYildiz: 0 });
    durumAyarla('esitleniyor');
    return esitle();
  }

  // Yalnız bu cihazdaki kodu unutur; sunucudaki veri ve yerel ilerleme olduğu gibi kalır.
  function eslemeyiKaldir() {
    clearTimeout(zamanlayici);
    zamanlayici = null;
    kayit(null);
    sonEsitleme = null;
    durumAyarla('esli-degil');
  }

  // Sunucudaki ilerlemeyi siler (sonra bu cihazdakini). Başarısızsa EsitlemeHatasi fırlatır ve hiçbir şey silinmez.
  async function herYerdeSifirla() {
    const e0 = esleme();
    if (!e0) return ilerlemeSifirla(depo);
    if (ucustaki) await ucustaki;
    const e = esleme();
    if (!e) return ilerlemeSifirla(depo);
    if (!cevrimiciMi()) throw new EsitlemeHatasi('cevrimdisi');
    clearTimeout(zamanlayici);
    await rpc('ilerleme_sifirla', { p_kod: e.kod });
    const bos = ilerlemeSifirla(depo);
    // sıfırlanan ayarlar da diğer cihaza gitsin
    kayit({ kod: e.kod, kirli: [...AYAR_ANAHTARLARI], uzakYildiz: 0 });
    bildir(ilerlemeDinleyenler, { ilerleme: bos });
    planla();
    return bos;
  }

  return {
    esitle,
    otomatik,
    planla,
    ayarDegisti,
    esle,
    katil,
    eslemeyiKaldir,
    herYerdeSifirla,
    eslemeKodu: () => esleme()?.kod ?? null,
    esliMi: () => esleme() !== null,
    durum: durumAl,
    durumDinle(fn) { durumDinleyenler.add(fn); return () => durumDinleyenler.delete(fn); },
    ilerlemeDinle(fn) { ilerlemeDinleyenler.add(fn); return () => ilerlemeDinleyenler.delete(fn); },
    // Açılışta durumu eşli/değil olarak başlatır (ağ isteği yapmaz).
    baslat() { if (esleme() && durum === 'esli-degil') durumAyarla('esitleniyor'); },
  };
}
