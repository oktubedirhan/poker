// Uygulama girişi: yönlendirme (hash), ekranlar, ayarlar, sonuç. Her şey #uygulama içine çizilir.

import { SEVIYELER } from '../dersler/mufredat.js';
import { guvenliRng } from '../motor/rng.js';
import {
  ilerlemeYukle, ilerlemeKaydet, ilerlemeSifirla, seviyeAcikMi, seviyeSonucuIsle, seviyeYildizi,
} from '../ilerleme.js';
import { el, bosalt, modalAc, duyur, bildirim, tumModallariKapat } from './dom.js';
import { haritaCiz, yildizlar } from './harita.js';
import { dersEkrani, soruAkisi } from './ders.js';
import { MasaOturumu } from './oturum.js';
import { quizSonucu, quizSorulariSec } from './mantik.js';

const kok = document.getElementById('uygulama');
const araclar = document.getElementById('ust-araclar');
let ilerleme = ilerlemeYukle();
let temizle = null;

// ---------- Ayarlar ----------

function ayarlariUygula() {
  document.documentElement.classList.toggle('dort-renk', !!ilerleme.ayarlar.dortRenk);
}

function kaydet() {
  if (!ilerlemeKaydet(ilerleme)) bildirim('İlerleme bu tarayıcıda kaydedilemiyor (gizli pencere olabilir).');
}

function anahtar(metin, deger, degisti, aciklama) {
  const kutu = el('input', { type: 'checkbox' });
  kutu.checked = deger;
  kutu.addEventListener('change', () => degisti(kutu.checked));
  return el('div', { class: 'ayar' },
    el('label', { class: 'anahtar' }, kutu, el('span', { class: 'anahtar__ray' }), metin),
    aciklama ? el('p', { class: 'ayar__not', text: aciklama }) : null,
  );
}

function ayarlarAc() {
  const sifirAlan = el('div', { class: 'ayar ayar--tehlike' });
  const sifirDugme = el('button', { class: 'dugme', type: 'button', text: 'İlerlemeyi sıfırla', onclick: () => onayIste() });
  sifirAlan.append(sifirDugme);
  function onayIste() {
    bosalt(sifirAlan);
    const evet = el('button', {
      class: 'dugme dugme--ikincil', type: 'button', text: 'Evet, sıfırla',
      onclick: () => {
        ilerleme = ilerlemeSifirla();
        ayarlariUygula();
        m.kapat('sifir');
        bildirim('İlerleme sıfırlandı.');
        location.hash = '#/';
        cizim();
      },
    });
    const vazgec = el('button', { class: 'dugme dugme--sade', type: 'button', text: 'Vazgeç', onclick: () => { bosalt(sifirAlan); sifirAlan.append(sifirDugme); sifirDugme.focus(); } });
    sifirAlan.append(el('p', { class: 'ayar__not', text: 'Bütün yıldızların ve açtığın seviyeler silinecek. Emin misin?' }), el('div', { class: 'sonuc__butonlar' }, evet, vazgec));
    evet.focus();
  }
  const m = modalAc({
    etiketId: 'ayarlar-baslik',
    sinif: 'ayarlar',
    icerik: [
      el('h2', { class: 'sonuc__baslik', id: 'ayarlar-baslik', text: 'Ayarlar' }),
      anahtar('Dört renkli deste', !!ilerleme.ayarlar.dortRenk, (v) => { ilerleme.ayarlar.dortRenk = v; ayarlariUygula(); kaydet(); },
        'Karo mavi, sinek yeşil olur. Renkleri ayırt etmek kolaylaşır.'),
      anahtar('Koç (isteğe bağlı seviyelerde)', !!ilerleme.ayarlar.koc, (v) => { ilerleme.ayarlar.koc = v; kaydet(); },
        'Seviye 7–9\'da her kararından sonra koçun notunu gösterir. İlk seviyelerde koç hep açık, finalde kapalı.'),
      el('p', { class: 'ayar__not', text: 'Ses: uygulamada ses yok; önemli olaylar ekran okuyucuya yazıyla bildirilir.' }),
      sifirAlan,
      el('div', { class: 'sonuc__butonlar' }, el('button', { class: 'dugme dugme--birincil', type: 'button', text: 'Kapat', onclick: () => m.kapat('kapat') })),
    ],
  });
}

// ---------- Sonuç ----------

function sureBicim(sn) {
  const d = Math.floor(sn / 60), s = sn % 60;
  return `${d}:${String(s).padStart(2, '0')}`;
}

function sonucGoster(seviye, sonuc, tekrar) {
  const eski = seviyeYildizi(ilerleme, seviye.id);
  ilerleme = seviyeSonucuIsle(ilerleme, seviye.id, sonuc.yildiz);
  kaydet();
  const sonraki = SEVIYELER[seviye.id + 1];
  const basarili = sonuc.yildiz > 0;
  const istatistik = [...(sonuc.istatistik ?? [])];
  if (sonuc.sure) istatistik.push(['Süre', sureBicim(sonuc.sure)]);
  istatistik.push(['Yıldız', String(sonuc.yildiz)]);
  const butonlar = [];
  if (basarili && sonraki) butonlar.push(el('button', { class: 'dugme dugme--birincil', type: 'button', text: 'Sıradaki seviye', onclick: () => { m.kapat('ileri'); git(`#/seviye/${sonraki.id}`); } }));
  butonlar.push(el('button', { class: `dugme${basarili && sonraki ? '' : ' dugme--birincil'}`, type: 'button', text: 'Tekrar dene', onclick: () => { m.kapat('tekrar'); tekrar(); } }));
  butonlar.push(el('button', { class: 'dugme dugme--sade', type: 'button', text: 'Haritaya dön', onclick: () => { m.kapat('harita'); git('#/'); } }));
  const baslik = basarili ? (seviye.id === 10 ? 'Poker Okulu bitti!' : `Seviye ${seviye.id} tamam`) : 'Bu sefer olmadı';
  const m = modalAc({
    etiketId: 'sonuc-baslik',
    sinif: 'sonuc',
    icerik: [
      yildizlar(sonuc.yildiz, { buyuk: true }),
      el('h2', { class: 'sonuc__baslik', id: 'sonuc-baslik', text: baslik }),
      el('p', { class: 'sonuc__ozet', text: `${sonuc.ozet}${basarili && sonraki && eski === 0 ? ` Seviye ${sonraki.id} açıldı.` : ''}` }),
      el('dl', { class: 'sonuc__istatistik' }, istatistik.map(([dt, dd]) => el('div', {}, el('dt', { text: dt }), el('dd', { text: dd })))),
      el('div', { class: 'sonuc__butonlar' }, butonlar),
    ],
    onKapat: (neden) => { if (neden === 'esc' || neden === 'perde') git('#/'); },
  });
  duyur(`${baslik}. ${sonuc.yildiz} yıldız. ${sonuc.ozet}`);
}

// ---------- Ekranlar ----------

function baslikOdakla() {
  const h = kok.querySelector('h1, h2');
  if (h) {
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
}

function geriBag(metin, hedef) {
  return el('a', { class: 'geri-bag', href: hedef, text: metin });
}

const GOREV_DUGME = { quiz: 'Quiz\'e başla', yonlendirmeliEl: 'Eli oyna', masa: 'Masaya otur' };

function seviyeGiris(seviye) {
  const y = seviyeYildizi(ilerleme, seviye.id);
  const ozellik = [];
  if (seviye.ozellikler?.koc === 'acik') ozellik.push('Koç her kararında yanında.');
  if (seviye.ozellikler?.koc === 'istege') ozellik.push('Koçu ayarlardan ya da masada açıp kapatabilirsin.');
  if (seviye.ozellikler?.koc === 'kapali') ozellik.push('Bu seviyede koç yok; tek başınasın.');
  if (seviye.ozellikler?.saymaPaneli) ozellik.push('Masada kart sayma paneli açık.');
  const kart = el('section', { class: 'panel seviye-giris' },
    el('div', { class: 'panel__baslik' }, el('h2', { tabindex: '-1', text: `Seviye ${seviye.id}: ${seviye.baslik}` }), yildizlar(y)),
    el('p', { class: 'seviye-giris__ozet', text: seviye.ozet }),
    el('h3', { class: 'seviye-giris__ara', text: 'Bu seviyede öğreneceklerin' }),
    el('ul', { class: 'seviye-giris__liste' }, seviye.kazanim.map((k) => el('li', { text: k }))),
    ozellik.length ? el('p', { class: 'soluk-yazi', text: ozellik.join(' ') }) : null,
    el('div', { class: 'seviye-giris__butonlar' },
      el('a', { class: 'dugme dugme--birincil', href: `#/seviye/${seviye.id}/ders`, text: `Derse başla (${seviye.dersler.length} ders)` }),
      seviye.gorev.tur !== 'quiz' ? el('a', { class: 'dugme', href: `#/seviye/${seviye.id}/alistirma`, text: `Alıştırmalar (${seviye.alistirmalar.length})` }) : null,
      el('a', { class: 'dugme dugme--ikincil', href: `#/seviye/${seviye.id}/gorev`, text: GOREV_DUGME[seviye.gorev.tur] ?? 'Göreve geç' }),
    ),
  );
  kok.append(geriBag('← Harita', '#/'), kart);
}

function gorevEkrani(seviye) {
  const g = seviye.gorev;
  const tekrar = () => { cizim(); };
  if (g.tur === 'quiz') {
    const rng = guvenliRng();
    const sorular = quizSorulariSec(seviye.alistirmalar, g.soruSayisi, rng);
    const bas = Date.now();
    kok.append(geriBag(`← Seviye ${seviye.id}`, `#/seviye/${seviye.id}`), el('h2', { class: 'ekran-baslik', tabindex: '-1', text: `Seviye ${seviye.id} görevi: ${g.soruSayisi} soruluk quiz` }));
    return soruAkisi(kok, sorular, {
      rng,
      sonMetin: 'Sonucu gör',
      onBitti: ({ dogru, toplam }) => {
        const s = quizSonucu(g, dogru, toplam);
        s.sure = Math.round((Date.now() - bas) / 1000);
        sonucGoster(seviye, s, tekrar);
      },
    });
  }
  kok.append(geriBag(`← Seviye ${seviye.id}`, `#/seviye/${seviye.id}`));
  const oturum = new MasaOturumu({
    kok, seviye, gorev: g,
    tip: g.tur === 'yonlendirmeliEl' ? 'yonlendirmeli' : 'masa',
    ayarlar: ilerleme.ayarlar,
    onAyar: () => kaydet(),
    onBitti: (s) => sonucGoster(seviye, s, tekrar),
  });
  oturum.baslat();
  return () => oturum.temizle();
}

function alistirmaEkrani(seviye) {
  const rng = guvenliRng();
  kok.append(geriBag(`← Seviye ${seviye.id}`, `#/seviye/${seviye.id}`), el('h2', { class: 'ekran-baslik', tabindex: '-1', text: `Seviye ${seviye.id}: alıştırmalar` }));
  const kap = el('div');
  kok.append(kap);
  return soruAkisi(kap, seviye.alistirmalar, {
    rng,
    sonMetin: 'Alıştırmaları bitir',
    onBitti: ({ dogru, toplam }) => {
      bosalt(kap);
      const gorevD = el('a', { class: 'dugme dugme--birincil', href: `#/seviye/${seviye.id}/gorev`, text: GOREV_DUGME[seviye.gorev.tur] ?? 'Göreve geç' });
      kap.append(el('section', { class: 'panel alistirma-sonu' },
        el('h3', { text: 'Alıştırmalar bitti' }),
        el('p', { text: `${toplam} sorudan ${dogru} tanesini doğru yaptın. Alıştırmalar puanlanmaz; şimdi göreve geçebilirsin.` }),
        el('div', { class: 'seviye-giris__butonlar' }, gorevD, el('a', { class: 'dugme', href: `#/seviye/${seviye.id}/alistirma`, text: 'Tekrar çöz', onclick: (e) => { e.preventDefault(); cizim(); } })),
      ));
      gorevD.focus();
    },
  });
}

// ---------- Yönlendirme ----------

function git(hash) {
  if (location.hash === hash) cizim();
  else location.hash = hash;
}

function rotaCoz() {
  const m = location.hash.match(/^#\/seviye\/(\d+)(?:\/(ders|alistirma|gorev))?\/?$/);
  if (!m) return { ekran: 'harita' };
  return { ekran: m[2] ?? 'giris', id: Number(m[1]) };
}

function cizim() {
  try { temizle?.(); } catch (e) { console.warn(e); }
  temizle = null;
  tumModallariKapat();
  bosalt(kok);
  const r = rotaCoz();
  const seviye = SEVIYELER[r.id];
  if (r.ekran !== 'harita' && (!seviye || !seviyeAcikMi(ilerleme, r.id))) {
    if (seviye) bildirim(`Seviye ${r.id} kilitli. Önce Seviye ${r.id - 1}'den yıldız al.`);
    history.replaceState(null, '', '#/');
    r.ekran = 'harita';
  }
  kok.dataset.ekran = r.ekran;
  if (r.ekran === 'harita') {
    document.title = 'Poker Okulu';
    haritaCiz(kok, SEVIYELER, ilerleme, { onSec: (id) => git(`#/seviye/${id}`) });
  } else if (r.ekran === 'giris') {
    document.title = `Seviye ${seviye.id}: ${seviye.baslik} · Poker Okulu`;
    seviyeGiris(seviye);
  } else if (r.ekran === 'ders') {
    document.title = `Ders · Seviye ${seviye.id} · Poker Okulu`;
    kok.append(geriBag(`← Seviye ${seviye.id}`, `#/seviye/${seviye.id}`));
    const quiz = seviye.gorev.tur === 'quiz';
    temizle = dersEkrani(kok, seviye, {
      sonMetin: quiz ? 'Quiz\'e geç' : 'Alıştırmalara geç',
      onBitti: () => git(`#/seviye/${seviye.id}/${quiz ? 'gorev' : 'alistirma'}`),
      onGeri: () => git(`#/seviye/${seviye.id}`),
    });
  } else if (r.ekran === 'alistirma') {
    document.title = `Alıştırma · Seviye ${seviye.id} · Poker Okulu`;
    temizle = alistirmaEkrani(seviye);
  } else if (r.ekran === 'gorev') {
    document.title = `Görev · Seviye ${seviye.id} · Poker Okulu`;
    temizle = gorevEkrani(seviye);
  }
  globalThis.scrollTo?.({ top: 0 });
  if (r.ekran !== 'gorev') baslikOdakla();
}

// ---------- Başlangıç ----------

function ustAraclar() {
  bosalt(araclar);
  araclar.append(
    el('a', { class: 'ikon-dugme', href: '#/', 'aria-label': 'Seviye haritası', title: 'Harita', text: '◳' }),
    el('button', { class: 'ikon-dugme', type: 'button', 'aria-label': 'Ayarlar', title: 'Ayarlar', text: '⚙', onclick: () => ayarlarAc() }),
  );
  const marka = document.querySelector('.marka');
  marka?.addEventListener('click', (e) => { e.preventDefault(); git('#/'); });
}

ayarlariUygula();
ustAraclar();
window.addEventListener('hashchange', cizim);
cizim();
