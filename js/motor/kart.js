// Kart = 2 karakterlik string: değer + renk. 'Ah' = Kupa As, 'Td' = Karo 10.

export const DEGERLER = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const RENKLER = ['s', 'h', 'd', 'c'];
export const RENK_AD = { s: 'Maça', h: 'Kupa', d: 'Karo', c: 'Sinek' };
export const RENK_SEMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const DEGER_AD = {
  A: 'As', K: 'Papaz', Q: 'Kız', J: 'Vale', T: '10',
  9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2',
};

// 52 kart, sabit sıra: önce renk (s, h, d, c), her renkte 2'den As'a.
export function tumKartlar() {
  const kartlar = [];
  for (const r of RENKLER) for (const d of DEGERLER) kartlar.push(d + r);
  return kartlar;
}

export function kartGecerliMi(k) {
  return typeof k === 'string' && k.length === 2 && DEGERLER.includes(k[0]) && RENKLER.includes(k[1]);
}

function gecerliOlmali(k) {
  if (!kartGecerliMi(k)) throw new Error(`Geçersiz kart: ${k}`);
}

// 2..14 (As = 14)
export function kartDeger(k) {
  gecerliOlmali(k);
  return DEGERLER.indexOf(k[0]) + 2;
}

export function kartRenk(k) {
  gecerliOlmali(k);
  return k[1];
}

// 'Kupa As', 'Karo 10'
export function kartAdi(k) {
  gecerliOlmali(k);
  return `${RENK_AD[k[1]]} ${DEGER_AD[k[0]]}`;
}
