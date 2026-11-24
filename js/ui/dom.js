// Küçük DOM yardımcıları. Kullanıcıya görünen metin hep textContent ile basılır; innerHTML yok.

import { metinParcala } from './mantik.js';

// el('button', { class: 'dugme', type: 'button', onclick: fn, text: 'Tamam' }, ...cocuklar)
export function el(etiket, ozellik = {}, ...cocuklar) {
  const d = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozellik || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') d.className = v;
    else if (k === 'text') d.textContent = String(v);
    else if (k === 'dataset') Object.assign(d.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') d.addEventListener(k.slice(2), v);
    else if (k === 'hidden') d.hidden = true;
    else if (k === 'disabled') d.disabled = true;
    else if (k === 'value') d.value = v;
    else if (v === true) d.setAttribute(k, '');
    else d.setAttribute(k, String(v));
  }
  ekle(d, cocuklar);
  return d;
}

export function ekle(ebeveyn, cocuklar) {
  for (const c of [cocuklar].flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    ebeveyn.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return ebeveyn;
}

export function bosalt(d) {
  while (d.firstChild) d.firstChild.remove();
  return d;
}

// '\n\n' → <p>, **x** → <strong>. Ham HTML asla yorumlanmaz.
export function zenginMetin(metin, { etiket = 'p' } = {}) {
  const parca = document.createDocumentFragment();
  for (const paragraf of metinParcala(metin)) {
    const p = document.createElement(etiket);
    for (const s of paragraf) {
      if (s.kalin) {
        const b = document.createElement('strong');
        b.textContent = s.metin;
        p.append(b);
      } else {
        p.append(document.createTextNode(s.metin));
      }
    }
    parca.append(p);
  }
  return parca;
}

export function hareketAzMi() {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

// ---------- Ekran okuyucu duyuruları ----------
let duyuruKutusu = null;
function duyuruAl() {
  if (duyuruKutusu && duyuruKutusu.isConnected) return duyuruKutusu;
  duyuruKutusu = el('div', { class: 'gorunmez', 'aria-live': 'polite', 'aria-relevant': 'additions', id: 'duyurular' });
  document.body.append(duyuruKutusu);
  return duyuruKutusu;
}
export function duyur(metin) {
  if (!metin) return;
  const kutu = duyuruAl();
  kutu.append(el('p', { text: metin }));
  while (kutu.childElementCount > 6) kutu.firstElementChild.remove();
}

// ---------- Bildirim (alt ortada, 3 sn) ----------
export function bildirim(metin, sure = 3000) {
  const b = el('div', { class: 'bildirim', role: 'status', text: metin });
  document.body.append(b);
  setTimeout(() => b.remove(), sure);
  return b;
}

// ---------- Modal ----------
// icerik: .modal__kutu içine konacak düğümler. Döner: { kutu, kapat }.
const odaklanabilir = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

const acikModallar = new Set();

export function modalAc({ icerik, sinif = '', etiketId, kapatilabilir = true, onKapat } = {}) {
  const onceki = document.activeElement;
  const kutu = el('div', { class: `modal__kutu ${sinif}`.trim() });
  ekle(kutu, icerik);
  const perde = el('div', { class: 'modal__perde' });
  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': etiketId }, perde, kutu);
  let kapandi = false;

  function kapat(neden) {
    if (kapandi) return;
    kapandi = true;
    acikModallar.delete(kapat);
    document.removeEventListener('keydown', tus, true);
    modal.remove();
    if (onceki && onceki.isConnected && typeof onceki.focus === 'function') onceki.focus();
    onKapat?.(neden);
  }
  function tus(e) {
    if (e.key === 'Escape' && kapatilabilir) {
      e.preventDefault();
      e.stopPropagation();
      kapat('esc');
      return;
    }
    if (e.key === 'Tab') {
      const liste = [...kutu.querySelectorAll(odaklanabilir)].filter((x) => !x.hidden && x.offsetParent !== null);
      if (!liste.length) return;
      const ilk = liste[0], son = liste[liste.length - 1];
      if (e.shiftKey && document.activeElement === ilk) { e.preventDefault(); son.focus(); }
      else if (!e.shiftKey && document.activeElement === son) { e.preventDefault(); ilk.focus(); }
      else if (!kutu.contains(document.activeElement)) { e.preventDefault(); ilk.focus(); }
    }
  }
  if (kapatilabilir) perde.addEventListener('click', () => kapat('perde'));
  document.addEventListener('keydown', tus, true);
  acikModallar.add(kapat);
  document.body.append(modal);
  const ilk = kutu.querySelector(odaklanabilir);
  (ilk ?? kutu).focus?.();
  return { modal, kutu, kapat };
}

export function tumModallariKapat() {
  for (const k of [...acikModallar]) k('iptal');
}

export function acikModalVarMi() {
  return !!document.querySelector('.modal');
}
