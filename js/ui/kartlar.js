// Kart DOM'u (docs/TASARIM.md "Kart"). Değer ve sembol CSS'te data-kart'tan gelir.

import { kartAdi } from '../motor/kart.js';
import { el } from './dom.js';

const BOYUT = { mini: 'kart--mini', kucuk: 'kart--kucuk', orta: 'kart--orta', buyuk: 'kart--buyuk' };

export function kartEl(k, { boyut, sinif = '', secilebilir = false } = {}) {
  const d = el('div', {
    class: ['kart', BOYUT[boyut], secilebilir && 'kart--secilebilir', sinif].filter(Boolean).join(' '),
    role: 'img',
    'aria-label': kartAdi(k),
  });
  d.dataset.kart = k;
  d.dataset.renk = k[1];
  return d;
}

export function arkaKart({ boyut, sinif = '' } = {}) {
  return el('div', {
    class: ['kart', 'kart--arka', BOYUT[boyut], sinif].filter(Boolean).join(' '),
    role: 'img',
    'aria-label': 'Kapalı kart',
  });
}

export function yuvaKart(etiket) {
  const d = el('div', { class: 'kart kart--yuva', 'aria-hidden': 'true' });
  if (etiket) d.dataset.etiket = etiket;
  return d;
}

// tur: '' | 'ortusen' | 'sarmal'
export function kartSirasi(kartlar, { kw, tur = '', boyut, sinif = '', etiket } = {}) {
  const s = el('div', {
    class: ['kart-sirasi', tur && `kart-sirasi--${tur}`, sinif].filter(Boolean).join(' '),
    style: kw ? `--kw:${kw}px` : null,
    role: etiket ? 'group' : null,
    'aria-label': etiket ?? null,
  });
  for (const k of kartlar) s.append(kartEl(k, { boyut }));
  return s;
}

// Var olan kart öğesini açık yüze çevirir (gerekirse çevirme animasyonuyla).
export function kartYuzuAc(d, k, { animasyon = true } = {}) {
  if (d.dataset.kart === k && !d.classList.contains('kart--arka')) return d;
  d.classList.remove('kart--arka', 'kart--yuva', 'kart--cevir', 'kart--vurgulu', 'kart--soluk');
  d.dataset.kart = k;
  d.dataset.renk = k[1];
  delete d.dataset.etiket;
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', kartAdi(k));
  d.removeAttribute('aria-hidden');
  if (animasyon) yenidenOynat(d, 'kart--cevir');
  return d;
}

export function kartKapat(d) {
  d.classList.remove('kart--yuva', 'kart--cevir', 'kart--vurgulu', 'kart--soluk');
  d.classList.add('kart--arka');
  delete d.dataset.kart;
  delete d.dataset.renk;
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', 'Kapalı kart');
  return d;
}

export function kartYuvaYap(d, etiket) {
  d.className = 'kart kart--yuva';
  delete d.dataset.kart;
  delete d.dataset.renk;
  if (etiket) d.dataset.etiket = etiket;
  d.removeAttribute('role');
  d.removeAttribute('aria-label');
  d.setAttribute('aria-hidden', 'true');
  return d;
}

// Animasyon sınıfını yeniden tetikler; bitince kaldırır.
export function yenidenOynat(d, sinif) {
  d.classList.remove(sinif);
  void d.offsetWidth; // reflow: animasyon baştan başlasın
  d.classList.add(sinif);
  const bitir = () => d.classList.remove(sinif);
  d.addEventListener('animationend', bitir, { once: true });
  setTimeout(bitir, 1200); // animasyon hiç çalışmazsa (hareket azaltma) yine de temizle
}
