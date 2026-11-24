// Koç balonu (docs/TASARIM.md "Koç balonu") ve koç alanı.

import { el, bosalt } from './dom.js';
import { ayrintiSatirlari } from './mantik.js';

const NOTLAR = new Set(['iyi', 'supheli', 'hata', 'ipucu']);
const VARSAYILAN_BASLIK = { iyi: 'İyi karar', supheli: 'Şüpheli', hata: 'Hata', ipucu: 'İpucu' };

export function kocBalonu({ not = 'ipucu', baslik, mesaj, ayrinti, ekler } = {}, { onKapat } = {}) {
  const n = NOTLAR.has(not) ? not : 'ipucu';
  const govde = el('div', { class: 'koc__govde' },
    el('h3', { class: 'koc__baslik', text: baslik || VARSAYILAN_BASLIK[n] }),
    mesaj ? el('p', { class: 'koc__mesaj', text: mesaj }) : null,
  );
  const satirlar = ayrintiSatirlari(ayrinti);
  if (satirlar.length) {
    govde.append(el('dl', { class: 'koc__ayrinti' }, satirlar.map(([dt, dd]) => el('div', {}, el('dt', { text: dt }), el('dd', { text: dd })))));
  }
  if (ekler) govde.append(ekler);
  const kutu = el('aside', { class: 'koc koc--giris' }, // duyur() okur; role=status çift okuma yapardı
    el('span', { class: 'koc__simge', 'aria-hidden': 'true' }),
    govde,
    el('button', { class: 'ikon-dugme koc__kapat', type: 'button', 'aria-label': 'Notu kapat', text: '✕', onclick: () => { kutu.remove(); onKapat?.(); } }),
  );
  kutu.dataset.not = n;
  return kutu;
}

// Tek balon gösteren alan: yeni not eskisinin yerini alır.
export class KocAlani {
  constructor() {
    this.kok = el('div', { class: 'koc-alani' });
  }
  goster(veri) {
    bosalt(this.kok);
    if (veri) this.kok.append(kocBalonu(veri));
  }
  temizle() {
    bosalt(this.kok);
  }
}
