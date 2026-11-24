// Ders ekranı (docs/TASARIM.md "Ders ekranı") ve soru akışları (alıştırma, quiz).

import { el, bosalt, zenginMetin, duyur } from './dom.js';
import { kartSirasi } from './kartlar.js';
import { soruCiz } from './sorular.js';
import { soruHazirla } from './soruUret.js';
import { degerlendir } from '../motor/degerlendirici.js';

function dersGorseli(ders) {
  const parcalar = [];
  if (ders.el) {
    const enIyi = ders.el.board?.length >= 3 ? degerlendir([...ders.el.kartlar, ...ders.el.board]) : null;
    const set = new Set(enIyi?.enIyi5 ?? []);
    const isaretle = (sira) => {
      if (!enIyi || ders.el.board.length < 5) return sira;
      for (const d of sira.children) d.classList.add(set.has(d.dataset.kart) ? 'kart--vurgulu' : 'kart--soluk');
      return sira;
    };
    parcalar.push(isaretle(kartSirasi(ders.el.kartlar, { kw: 52, etiket: 'Elin' })));
    parcalar.push(el('p', { class: 'ders__gorsel-etiket', text: 'Elin' }));
    if (ders.el.board?.length) {
      parcalar.push(isaretle(kartSirasi(ders.el.board, { kw: 48, etiket: 'Board' })));
      parcalar.push(el('p', { class: 'ders__gorsel-etiket', text: enIyi && ders.el.board.length >= 5 ? `Board · en iyi 5: ${enIyi.ad}` : 'Board' }));
    }
  } else {
    if (ders.kartlar?.length) parcalar.push(kartSirasi(ders.kartlar, { kw: ders.kartlar.length > 5 ? 44 : 52, tur: ders.kartlar.length > 6 ? 'sarmal' : '', etiket: 'Örnek kartlar' }));
    if (ders.board?.length) {
      parcalar.push(kartSirasi(ders.board, { kw: 48, etiket: 'Board' }));
      parcalar.push(el('p', { class: 'ders__gorsel-etiket', text: 'Board' }));
    }
  }
  return parcalar.length ? el('div', { class: 'ders__gorsel kece' }, parcalar) : null;
}

// Ders kartları. onBitti(): son dersten sonra.
export function dersEkrani(kok, seviye, { baslangic = 0, sonMetin = 'Alıştırmalara geç', onBitti, onGeri } = {}) {
  let i = Math.max(0, Math.min(baslangic, seviye.dersler.length - 1));
  const kap = el('div', { class: 'ders' });
  kok.append(kap);

  function ciz(odak = true) {
    bosalt(kap);
    const ders = seviye.dersler[i];
    const n = seviye.dersler.length;
    const baslik = el('h2', { class: 'ders__baslik', tabindex: '-1', text: ders.baslik });
    const geri = el('button', { class: 'dugme', type: 'button', text: 'Geri', onclick: () => { if (i > 0) { i--; ciz(); } else onGeri?.(); } });
    const ileri = el('button', {
      class: 'dugme dugme--birincil', type: 'button', text: i === n - 1 ? sonMetin : 'İleri',
      onclick: () => { if (i < n - 1) { i++; ciz(); } else onBitti?.(); },
    });
    const noktalar = el('div', { class: 'noktalar', role: 'img', 'aria-label': `${i + 1}. ders, toplam ${n}` },
      seviye.dersler.map((_, j) => el('span', { class: `nokta${j < i ? ' nokta--bitti' : ''}`, 'aria-current': j === i ? 'step' : null })));
    kap.append(
      el('div', { class: 'ders__ust' }, el('span', { text: `Seviye ${seviye.id}: ${seviye.baslik}` }), el('span', { text: `Ders ${i + 1} / ${n}` })),
      el('article', { class: 'ders__kart' },
        baslik,
        dersGorseli(ders),
        el('div', { class: 'ders__metin' }, zenginMetin(ders.metin)),
        el('nav', { class: 'ders__gezinti', 'aria-label': 'Ders gezintisi' }, geri, noktalar, ileri),
      ),
    );
    if (odak) baslik.focus({ preventScroll: true });
    globalThis.scrollTo?.({ top: 0 });
  }
  function tus(e) {
    if (e.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
    if (e.key === 'ArrowRight' && i < seviye.dersler.length - 1) { i++; ciz(); }
    if (e.key === 'ArrowLeft' && i > 0) { i--; ciz(); }
  }
  document.addEventListener('keydown', tus);
  ciz(false);
  return () => document.removeEventListener('keydown', tus);
}

// Sıralı soru akışı. sorular: ham soru listesi. onBitti({ dogru, toplam })
export function soruAkisi(kok, sorular, { rng, baslik, sonMetin = 'Bitir', onBitti } = {}) {
  let i = 0, dogru = 0;
  const kap = el('div', { class: 'soru-akisi' });
  kok.append(kap);
  function ciz() {
    bosalt(kap);
    if (baslik) kap.append(el('p', { class: 'akis__baslik', text: baslik }));
    let hazir;
    try {
      hazir = soruHazirla(sorular[i], { rng });
    } catch (e) {
      console.error(e);
      hazir = { tur: 'secmeli', soru: 'Bu soru üretilemedi.', secenekler: ['Geç'], dogru: 0, aciklama: '' };
    }
    const son = i === sorular.length - 1;
    const s = soruCiz(hazir, {
      no: i + 1, toplam: sorular.length,
      sonrakiMetin: son ? sonMetin : 'Sonraki soru',
      onCevap: (d) => { if (d) dogru++; duyur(d ? 'Doğru.' : 'Yanlış.'); },
      onSonraki: () => {
        if (son) onBitti?.({ dogru, toplam: sorular.length });
        else { i++; ciz(); }
      },
    });
    kap.append(s);
    s.querySelector('.soru__metin')?.focus({ preventScroll: true });
    globalThis.scrollTo?.({ top: 0 });
  }
  ciz();
  return () => {};
}
