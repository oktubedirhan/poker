// Oyuncu ilerlemesi ve ayarlar: localStorage 'poker-okulu-v1'.
// DOM'a dokunmaz; depo (storage) parametreyle verilebilir (testler için).

export const ANAHTAR = 'poker-okulu-v1';
export const SEVIYE_SAYISI = 11;

export function varsayilanIlerleme() {
  return {
    seviyeler: {},
    // ses: uygulamada ses yok (hep false). koc: 'istege' seviyelerinde koç açık mı. dortRenk: dört renkli deste.
    ayarlar: { ses: false, koc: true, dortRenk: false },
  };
}

function depoAl(depo) {
  if (depo) return depo;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // gizli pencere / engelli depolama
  }
}

// Bozuk ya da eski veriyi güvenli biçime getirir.
export function ilerlemeDuzelt(ham) {
  const sonuc = varsayilanIlerleme();
  if (!ham || typeof ham !== 'object') return sonuc;
  if (ham.seviyeler && typeof ham.seviyeler === 'object') {
    for (const [id, s] of Object.entries(ham.seviyeler)) {
      const n = Number(id);
      if (!Number.isInteger(n) || n < 0 || n >= SEVIYE_SAYISI || !s || typeof s !== 'object') continue;
      const yildiz = Math.max(0, Math.min(3, Math.floor(Number(s.yildiz) || 0)));
      sonuc.seviyeler[n] = { yildiz, tamam: yildiz > 0 || s.tamam === true };
    }
  }
  if (ham.ayarlar && typeof ham.ayarlar === 'object') {
    if (typeof ham.ayarlar.koc === 'boolean') sonuc.ayarlar.koc = ham.ayarlar.koc;
    if (typeof ham.ayarlar.dortRenk === 'boolean') sonuc.ayarlar.dortRenk = ham.ayarlar.dortRenk;
  }
  return sonuc;
}

export function ilerlemeYukle(depo) {
  const d = depoAl(depo);
  if (!d) return varsayilanIlerleme();
  try {
    const metin = d.getItem(ANAHTAR);
    return metin ? ilerlemeDuzelt(JSON.parse(metin)) : varsayilanIlerleme();
  } catch {
    return varsayilanIlerleme();
  }
}

export function ilerlemeKaydet(ilerleme, depo) {
  const d = depoAl(depo);
  if (!d) return false;
  try {
    d.setItem(ANAHTAR, JSON.stringify(ilerlemeDuzelt(ilerleme)));
    return true;
  } catch {
    return false;
  }
}

export function ilerlemeSifirla(depo) {
  const d = depoAl(depo);
  try {
    d?.removeItem(ANAHTAR);
  } catch {
    /* yok say */
  }
  return varsayilanIlerleme();
}

// id 0 hep açık; id n için n-1 en az 1 yıldız.
export function seviyeAcikMi(ilerleme, id) {
  if (!Number.isInteger(id) || id < 0 || id >= SEVIYE_SAYISI) return false;
  if (id === 0) return true;
  return (ilerleme?.seviyeler?.[id - 1]?.yildiz ?? 0) >= 1;
}

export function seviyeYildizi(ilerleme, id) {
  return ilerleme?.seviyeler?.[id]?.yildiz ?? 0;
}

// Sonucu işler: en iyi yıldız saklanır. Yeni nesne döner.
export function seviyeSonucuIsle(ilerleme, id, yildiz) {
  const yeni = ilerlemeDuzelt(ilerleme);
  const eski = yeni.seviyeler[id]?.yildiz ?? 0;
  const enIyi = Math.max(eski, Math.max(0, Math.min(3, Math.floor(yildiz))));
  yeni.seviyeler[id] = { yildiz: enIyi, tamam: enIyi > 0 };
  return yeni;
}

// Haritada "sıradaki" seviye: açık ama henüz yıldızı olmayan ilk seviye.
export function siradakiSeviye(ilerleme) {
  for (let id = 0; id < SEVIYE_SAYISI; id++) {
    if (seviyeAcikMi(ilerleme, id) && seviyeYildizi(ilerleme, id) === 0) return id;
  }
  return null;
}
