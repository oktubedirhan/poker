// Seviye haritası (docs/TASARIM.md "Seviye haritası") ve yıldız gösterimi.

import { el } from './dom.js';
import { seviyeAcikMi, seviyeYildizi, siradakiSeviye } from '../ilerleme.js';

export function yildizlar(n, { buyuk = false } = {}) {
  return el('span', { class: `yildizlar${buyuk ? ' yildizlar--buyuk' : ''}`, role: 'img', 'aria-label': `${n} yıldız` },
    [0, 1, 2].map((i) => el('span', { class: `yildiz${i < n ? ' yildiz--dolu' : ''}`, style: buyuk ? `--s:${i}` : null })));
}

export function haritaCiz(kok, seviyeler, ilerleme, { onSec, gosterge } = {}) {
  const sira = siradakiSeviye(ilerleme);
  const hicYok = Object.values(ilerleme.seviyeler).every((s) => !s.yildiz);
  const karsilama = el('section', { class: 'karsilama' },
    el('h1', { text: hicYok ? 'Poker\'e hoş geldin' : 'Merhaba, nerede kalmıştık?' }),
    el('p', {
      text: hicYok
        ? 'Hiç bilmesen de olur. 11 seviyede desteden turnuvaya kadar Texas Hold\'em\'i adım adım öğreneceksin. Her seviye kısa dersler, alıştırmalar ve bir görevden oluşur.'
        : sira === null ? 'Bütün seviyeleri açtın. İstediğin seviyeyi tekrar oynayıp yıldızlarını artırabilirsin.' : `Sıradaki: Seviye ${sira}, ${seviyeler[sira].baslik}.`,
    }),
  );
  if (sira !== null) {
    karsilama.append(el('button', { class: 'dugme dugme--birincil', type: 'button', text: hicYok ? 'İlk derse başla' : `Seviye ${sira}'e devam et`, onclick: () => onSec?.(sira) }));
  }
  const liste = el('ol', { class: 'harita', 'aria-label': 'Seviyeler' });
  for (const s of seviyeler) {
    const acik = seviyeAcikMi(ilerleme, s.id);
    const y = seviyeYildizi(ilerleme, s.id);
    const durum = !acik ? 'kilitli' : y > 0 ? 'tamam' : 'acik';
    const etiket = `Seviye ${s.id}: ${s.baslik}, ${durum === 'kilitli' ? 'kilitli' : durum === 'tamam' ? `tamamlandı, ${y} yıldız` : 'açık'}`;
    const dugum = el('button', {
      class: `dugum dugum--${durum}${s.id === 10 ? ' dugum--final' : ''}`,
      type: 'button', 'aria-label': etiket, disabled: !acik,
      onclick: () => onSec?.(s.id),
    }, el('span', { class: 'dugum__no', text: String(s.id) }));
    liste.append(el('li', { class: `harita__satir${acik ? '' : ' harita__satir--kilitli'}` },
      dugum,
      el('div', { class: 'harita__bilgi' },
        el('h3', { class: 'harita__ad', text: s.baslik }),
        el('p', { class: 'harita__ozet', text: acik ? s.ozet : `${s.ozet} Açmak için Seviye ${s.id - 1}'den en az 1 yıldız al.` }),
        acik ? yildizlar(y) : null,
      ),
    ));
  }
  if (gosterge) kok.append(gosterge);
  kok.append(karsilama, liste);
}
