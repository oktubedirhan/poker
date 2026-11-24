// Soru ekranı (docs/TASARIM.md "Soru (quiz)"). Hazır soru (soruUret.soruHazirla) çizer.

import { el } from './dom.js';
import { kartEl, kartSirasi } from './kartlar.js';
import { enIyi5Dogrula } from './mantik.js';

const HARF = ['A', 'B', 'C', 'D', 'E', 'F'];
let sayac = 0;

function gorsel(soru) {
  const parcalar = [];
  const coklu = (soru.kartlar?.length ?? 0) > 7;
  if (soru.kartlar?.length) {
    parcalar.push(kartSirasi(soru.kartlar, {
      tur: coklu ? 'sarmal' : '', kw: coklu ? 34 : soru.board ? 48 : 56,
      etiket: soru.kartEtiket ?? (soru.board ? 'Elin' : 'Kartlar'),
    }));
    if (soru.board) parcalar.push(el('p', { class: 'ders__gorsel-etiket', text: soru.kartEtiket ?? 'Elin' }));
    else if (soru.kartEtiket) parcalar.push(el('p', { class: 'ders__gorsel-etiket', text: soru.kartEtiket }));
  }
  if (soru.board?.length) {
    parcalar.push(kartSirasi(soru.board, { kw: 48, etiket: 'Board' }));
    parcalar.push(el('p', { class: 'ders__gorsel-etiket', text: 'Board' }));
  }
  return parcalar.length ? el('div', { class: 'soru__gorsel kece' }, parcalar) : null;
}

function geriBildirim(dogru, metin, ek) {
  return el('div', { class: `geri-bildirim${dogru ? '' : ' geri-bildirim--yanlis'}`, role: 'status' },
    el('strong', { text: dogru ? 'Doğru.' : 'Yanlış.' }),
    metin ? ` ${metin}` : '',
    ek ?? null,
  );
}

// secenekler: { no, toplam, sonrakiMetin, onCevap(dogru), onSonraki() }
export function soruCiz(soru, { no, toplam, sonrakiMetin = 'Sonraki soru', onCevap, onSonraki, ustMetin } = {}) {
  const metinId = `soru-metin-${++sayac}`;
  const kok = el('section', { class: 'soru', 'aria-labelledby': metinId });
  if (toplam) {
    kok.append(el('div', { class: 'soru__ust' },
      el('span', { text: ustMetin ?? `Soru ${no} / ${toplam}` }),
      el('div', { class: 'ilerleme', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(toplam), 'aria-valuenow': String(no - 1), 'aria-label': 'İlerleme' },
        el('div', { class: 'ilerleme__dolu', style: `width:${Math.round(((no - 1) / toplam) * 100)}%` })),
    ));
  }
  const baslik = el('h3', { class: 'soru__metin', id: metinId, tabindex: '-1', text: soru.soru });
  kok.append(baslik);
  const alt = el('div', { class: 'soru__alt' });
  const bildirimYeri = el('div', { class: 'soru__bildirim' });
  let cevaplandi = false;

  function bitir(dogru, metin, ek) {
    if (cevaplandi) return;
    cevaplandi = true;
    bildirimYeri.append(geriBildirim(dogru, metin, ek));
    onCevap?.(dogru);
    const d = el('button', { class: 'dugme dugme--birincil', type: 'button', text: sonrakiMetin, onclick: () => onSonraki?.() });
    alt.append(d);
    d.focus({ preventScroll: false });
  }

  if (soru.tur === 'secmeli') {
    const g = gorsel(soru);
    if (g) kok.append(g);
    const grup = el('div', { class: 'secenekler', role: 'radiogroup', 'aria-labelledby': metinId });
    const dugmeler = soru.secenekler.map((metin, i) => el('button', {
      class: 'secenek', type: 'button', role: 'radio', 'aria-checked': 'false',
      onclick: () => sec(i),
    }, el('span', { class: 'secenek__harf', 'aria-hidden': 'true', text: HARF[i] }), el('span', { text: metin })));
    grup.append(...dugmeler);
    grup.addEventListener('keydown', (e) => {
      const i = dugmeler.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); dugmeler[(i + 1) % dugmeler.length].focus(); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); dugmeler[(i - 1 + dugmeler.length) % dugmeler.length].focus(); }
    });
    function sec(i) {
      if (cevaplandi) return;
      const dogru = i === soru.dogru;
      dugmeler.forEach((d, j) => {
        d.disabled = true;
        d.setAttribute('aria-checked', String(j === i));
        if (j === soru.dogru) d.classList.add('secenek--dogru');
        else if (j === i) d.classList.add('secenek--yanlis');
        else d.classList.add('secenek--soluk');
      });
      const ek = soru.ekKartlar?.length
        ? el('div', { class: 'soru__ek' }, el('span', { class: 'soru__ek-etiket', text: soru.ekEtiket ?? 'Kartlar' }), kartSirasi(soru.ekKartlar, { tur: 'sarmal', kw: 28, etiket: soru.ekEtiket ?? 'Kartlar' }))
        : null;
      bitir(dogru, soru.aciklama, ek);
    }
    kok.append(grup);
  } else if (soru.tur === 'hangisiGuclu') {
    if (soru.board?.length) {
      kok.append(el('div', { class: 'soru__gorsel kece' }, kartSirasi(soru.board, { kw: 48, etiket: 'Board' }), el('p', { class: 'ders__gorsel-etiket', text: 'Board' })));
    }
    const kw = soru.board ? 48 : 40;
    const elDugme = (harf, kartlar) => el('button', { class: 'el-secenek', type: 'button', 'aria-label': `El ${harf}`, onclick: () => sec(harf) },
      el('span', { text: harf }), kartSirasi(kartlar, { kw }));
    const a = elDugme('A', soru.elA), b = elDugme('B', soru.elB);
    const esit = el('button', { class: 'dugme karsilastirma__esit', type: 'button', text: 'Eşit', onclick: () => sec('esit') });
    kok.append(el('div', { class: 'karsilastirma' }, a, b, esit));
    function sec(h) {
      if (cevaplandi) return;
      const dogru = h === soru.dogru;
      for (const [d, k] of [[a, 'A'], [b, 'B']]) {
        d.disabled = true;
        if (k === soru.dogru) d.classList.add('el-secenek--dogru');
        else if (k === h) d.classList.add('el-secenek--yanlis');
      }
      esit.disabled = true;
      if (soru.dogru === 'esit') esit.classList.add('secenek--dogru');
      const motor = `A: ${soru.degerA.ad} (${soru.degerA.aciklama}). B: ${soru.degerB.ad} (${soru.degerB.aciklama}).`;
      bitir(dogru, `${soru.aciklama ?? ''} ${motor}`.trim());
    }
  } else if (soru.tur === 'enIyi5') {
    const secili = new Set();
    const kontrol = el('button', { class: 'dugme dugme--birincil', type: 'button', text: '5 kart seç', disabled: true, onclick: () => dogrula() });
    const secimSayaci = el('p', { class: 'soru__sayac', 'aria-live': 'polite', text: '0 / 5 seçildi' });
    const kartlar = soru.kartlar.map((k) => {
      const d = kartEl(k, { secilebilir: true });
      d.setAttribute('role', 'button');
      d.setAttribute('tabindex', '0');
      d.setAttribute('aria-pressed', 'false');
      const degistir = () => {
        if (cevaplandi) return;
        if (secili.has(k)) secili.delete(k);
        else if (secili.size < 5) secili.add(k);
        d.classList.toggle('kart--secili', secili.has(k));
        d.setAttribute('aria-pressed', String(secili.has(k)));
        secimSayaci.textContent = `${secili.size} / 5 seçildi`;
        kontrol.disabled = secili.size !== 5;
        kontrol.textContent = secili.size === 5 ? 'Kontrol et' : '5 kart seç';
      };
      d.addEventListener('click', degistir);
      d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); degistir(); } });
      return d;
    });
    kok.append(el('div', { class: 'soru__gorsel kece' }, el('div', { class: 'kart-sirasi kart-sirasi--sarmal', style: '--kw:52px', role: 'group', 'aria-label': '7 kart' }, kartlar)));
    kok.append(secimSayaci);
    const kontrolAlani = el('div', { class: 'soru__alt' }, kontrol);
    kok.append(kontrolAlani);
    function dogrula() {
      const r = enIyi5Dogrula(soru.kartlar, [...secili]);
      const enIyi = new Set(r.enIyi.enIyi5);
      kartlar.forEach((d) => {
        d.classList.remove('kart--secili', 'kart--secilebilir');
        d.classList.add(enIyi.has(d.dataset.kart) ? 'kart--vurgulu' : 'kart--soluk');
        d.setAttribute('tabindex', '-1');
        d.setAttribute('aria-disabled', 'true');
      });
      kontrolAlani.remove();
      const secilenNot = r.secilenDeger && !r.dogru ? ` Senin seçtiğin: ${r.secilenDeger.ad}.` : '';
      bitir(r.dogru, `En iyi 5: ${r.enIyi.ad} (${r.enIyi.aciklama}).${secilenNot} ${soru.aciklama ?? ''}`.trim());
    }
  }

  kok.append(bildirimYeri, alt);
  return kok;
}
