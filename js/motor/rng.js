// Rastgele sayı kaynakları. İkisi de aynı arayüzü verir: { int(max) } → [0, max) tam sayı.

const IKI_UZERI_32 = 0x100000000;

function maxDogrula(max) {
  if (!Number.isInteger(max) || max <= 0 || max > IKI_UZERI_32) {
    throw new Error(`Geçersiz üst sınır: ${max}`);
  }
}

// 32 bitlik bir üreticiden modulo sapması olmadan [0, max) üretir.
// limit, max'ın tam katı olan en büyük değer; onun üstündekiler reddedilip yeniden çekilir.
function sapmasizInt(uint32Uret, max) {
  maxDogrula(max);
  const limit = Math.floor(IKI_UZERI_32 / max) * max;
  let x;
  do {
    x = uint32Uret();
  } while (x >= limit);
  return x % max;
}

// Kriptografik olarak güvenli kaynak (tarayıcı ve Node'da globalThis.crypto).
export function guvenliRng() {
  const c = globalThis.crypto;
  if (!c || !c.getRandomValues) {
    // Çok eski ortamlar için yedek; oyun yine çalışsın.
    return { int: (max) => sapmasizInt(() => Math.floor(Math.random() * IKI_UZERI_32), max) };
  }
  const tampon = new Uint32Array(1);
  const uret = () => {
    c.getRandomValues(tampon);
    return tampon[0];
  };
  return { int: (max) => sapmasizInt(uret, max) };
}

// Tohumlu, tekrarlanabilir kaynak (mulberry32). Testler ve ders tekrarları için.
export function tohumluRng(tohum) {
  let durum = tohum >>> 0;
  const uret = () => {
    durum = (durum + 0x6d2b79f5) >>> 0;
    let t = durum;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  return { int: (max) => sapmasizInt(uret, max) };
}
