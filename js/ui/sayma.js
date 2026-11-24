// Sayma paneli (docs/TASARIM.md "Sayma paneli"): 4×13 ızgara, bilinmeyen sayısı, renk dağılımı.

import { DEGERLER, RENKLER, RENK_AD, kartAdi } from '../motor/kart.js';
import { el } from './dom.js';

export class SaymaPaneli {
  constructor() {
    this.hucreler = new Map();
    this.kalanB = el('b', { text: '52' });
    this.fizikselB = el('b', { text: '52' });
    const izgara = el('div', { class: 'sayma__izgara', role: 'group', 'aria-label': 'Kart ızgarası: üstü çizili kartları gördün' });
    for (const r of RENKLER) {
      const satir = el('div', { class: 'sayma__satir', role: 'list', 'aria-label': RENK_AD[r] }, el('span', { class: 'sayma__etiket', 'aria-hidden': 'true' }));
      satir.dataset.renk = r;
      for (const d of DEGERLER) {
        const k = d + r;
        const h = el('span', { class: 'say-hucre', role: 'listitem', 'aria-label': kartAdi(k) });
        h.dataset.kart = k;
        h.dataset.renk = r;
        this.hucreler.set(k, h);
        satir.append(h);
      }
      izgara.append(satir);
    }
    this.dagilim = new Map();
    const dagilim = el('div', { class: 'sayma__dagilim', role: 'list', 'aria-label': 'Bilinmeyen kartlarda renk dağılımı' });
    for (const r of RENKLER) {
      const etiket = el('span', { class: 'dagilim__etiket', text: '13' });
      const cubuk = el('span', { class: 'dagilim__cubuk', style: '--oran:1' });
      const satir = el('div', { class: 'dagilim', role: 'listitem', 'aria-label': `${RENK_AD[r]}: 13` }, etiket, cubuk);
      satir.dataset.renk = r;
      this.dagilim.set(r, { satir, etiket, cubuk });
      dagilim.append(satir);
    }
    this.notP = el('p', { class: 'sayma__not' }, 'Destede fiziksel olarak kalan: ', this.fizikselB, ' kart');
    this.kok = el('section', { class: 'sayma', 'aria-label': 'Kart sayma' },
      el('div', { class: 'sayma__baslik' }, el('h3', { text: 'Görmediğin kartlar' }), el('span', { class: 'sayma__kalan' }, this.kalanB, ' bilinmeyen')),
      izgara,
      dagilim,
      this.notP,
    );
  }

  // sayac: analiz/sayac.js Sayac; outlar: işaretlenecek out kartları
  guncelle(sayac, { outlar = [], destedeKalan } = {}) {
    const gorulen = new Set(sayac.gorulen());
    const outSet = new Set(outlar);
    for (const [k, h] of this.hucreler) {
      const g = gorulen.has(k);
      h.classList.toggle('say-hucre--goruldu', g);
      h.classList.toggle('say-hucre--out', !g && outSet.has(k));
      h.setAttribute('aria-label', `${kartAdi(k)}${g ? ', görüldü' : outSet.has(k) ? ', out' : ''}`);
    }
    const bilinmeyen = sayac.bilinmeyen().length;
    this.kalanB.textContent = String(bilinmeyen);
    const { renk } = sayac.dagilim();
    for (const r of RENKLER) {
      const { satir, etiket, cubuk } = this.dagilim.get(r);
      etiket.textContent = String(renk[r]);
      cubuk.style.setProperty('--oran', String(renk[r] / 13));
      satir.setAttribute('aria-label', `${RENK_AD[r]}: ${renk[r]} bilinmeyen`);
    }
    const fiziksel = destedeKalan ?? sayac.destedeKalanFiziksel;
    this.fizikselB.textContent = String(fiziksel);
  }
}
