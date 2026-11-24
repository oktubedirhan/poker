// Cihaz eşleme arayüzü: ayarlardaki bölüm, harita göstergesi, #esle=KOD onay penceresi.
// Metinler hep textContent (el yardımcısı); kod log'a ya da konsola yazılmaz.

import {
  esitlemeKur, kodUret, kodGoster, kodMaskele, kodNormalize, baglantiOlustur, hashtanKod, zamanOnce,
  KodHatasi, EsitlemeHatasi,
} from '../esitleme.js';
import { el, bosalt, modalAc, bildirim, duyur } from './dom.js';

export const esitleme = esitlemeKur();

const HATA_METNI = {
  kod_yok: 'Bu kod bulunamadı. Kodu kontrol edip tekrar dene.',
  cevrimdisi: 'İnternet yok gibi görünüyor. Bağlanınca tekrar dene.',
  ag: 'Şu an bağlanılamadı. Biraz sonra tekrar dene.',
  zaman_asimi: 'Sunucu yanıt vermedi. Biraz sonra tekrar dene.',
  sunucu: 'Sunucu şu an kullanılamıyor. Biraz sonra tekrar dene.',
  yanit: 'Sunucudan beklenmeyen bir yanıt geldi. Biraz sonra tekrar dene.',
  gecersiz_kod: 'Bu kod geçersiz.',
};

function hataMetni(h) {
  if (h instanceof KodHatasi) return h.message;
  if (h instanceof EsitlemeHatasi) return HATA_METNI[h.tur] ?? HATA_METNI.ag;
  return HATA_METNI.ag;
}

const SORUN_YAZISI = 'Şu an eşitlenemiyor, ilerlemen bu cihazda güvende';

function durumMetni(d) {
  if (d.durum === 'esitleniyor') return 'Eşitleniyor…';
  if (d.durum === 'tamam') return `Eşitlendi · ${zamanOnce(d.sonEsitleme)}`;
  if (d.durum === 'hata') return SORUN_YAZISI;
  return '';
}

// Bir düğümün canlı durum metnini güncel tutar; düğüm DOM'dan çıkınca kendini söker.
function durumaBagla(dugum, yaz) {
  const guncelle = () => {
    if (!dugum.isConnected) { kes(); return; }
    yaz(esitleme.durum());
  };
  const kes = () => { off(); clearInterval(sayac); };
  const off = esitleme.durumDinle(guncelle);
  const sayac = setInterval(guncelle, 20000);
  yaz(esitleme.durum());
}

async function panoyaKopyala(metin) {
  try {
    await navigator.clipboard.writeText(metin);
    return true;
  } catch {
    try {
      const t = el('textarea', { 'aria-hidden': 'true', tabindex: '-1', readonly: true, style: 'position:fixed;opacity:0;top:0;left:0' });
      t.value = metin;
      document.body.append(t);
      t.select();
      const ok = document.execCommand('copy');
      t.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function baglanti(kod) {
  return baglantiOlustur(kod, { origin: location.origin, pathname: location.pathname });
}

// ---------- Harita göstergesi ----------

export function eslemeGostergesi() {
  const ikon = el('span', { class: 'esitleme-gosterge__ikon', 'aria-hidden': 'true' });
  const metin = el('span', { class: 'esitleme-gosterge__metin' });
  const kutu = el('p', { class: 'esitleme-gosterge', hidden: true }, ikon, metin);
  durumaBagla(kutu, (d) => {
    const esli = esitleme.esliMi();
    kutu.hidden = !esli;
    kutu.dataset.durum = d.durum;
    if (!esli) return;
    ikon.textContent = d.durum === 'tamam' ? '✓' : d.durum === 'hata' ? '○' : '↻';
    if (d.durum === 'hata') {
      // dikkat çekmez: yalnız küçük ikon, ayrıntı title'da
      metin.className = 'gorunmez';
      metin.textContent = SORUN_YAZISI;
      kutu.title = SORUN_YAZISI;
    } else {
      metin.className = 'esitleme-gosterge__metin';
      metin.textContent = durumMetni(d);
      kutu.title = d.durum === 'tamam' ? 'Cihazlar arası eşitleme açık' : '';
      if (!kutu.title) kutu.removeAttribute('title');
    }
  });
  return kutu;
}

// ---------- Ayarlar bölümü ----------

export function eslemeBolumu() {
  const kok = el('section', { class: 'ayar eslesme', 'aria-labelledby': 'esleme-baslik' });
  let goster = false;      // kod açık mı
  let girisAcik = false;   // "Kodum var" alanı
  let kaldirOnayi = false;
  let mesgul = false;

  function ciz() {
    bosalt(kok);
    kok.append(el('h3', { class: 'eslesme__baslik', id: 'esleme-baslik', text: 'Cihazlarını eşle' }));
    if (esitleme.esliMi()) eslidenCiz();
    else eslesizCiz();
  }

  async function katilDene(girdi, hataYeri, dugme) {
    hataYeri.textContent = '';
    let kod;
    try { kod = kodNormalize(girdi); } catch (h) { hataYeri.textContent = hataMetni(h); return; }
    mesgul = true;
    dugme.disabled = true;
    dugme.textContent = 'Eşleniyor…';
    try {
      await esitleme.katil(kod);
      goster = false;
      girisAcik = false;
      bildirim('Cihaz eşlendi.');
      duyur('Cihaz eşlendi. İlerlemen birleştirildi.');
      mesgul = false;
      ciz();
    } catch (h) {
      mesgul = false;
      dugme.disabled = false;
      dugme.textContent = 'Eşle';
      hataYeri.textContent = hataMetni(h);
    }
  }

  function eslesizCiz() {
    kok.append(el('p', { class: 'ayar__not', text: 'İlerlemeni telefonunla bilgisayarın arasında eşitle. Hesap gerekmez; bir kod yeter.' }));
    const dugmeler = el('div', { class: 'eslesme__dugmeler' },
      el('button', {
        class: 'dugme dugme--birincil', type: 'button', text: 'Yeni eşleme kodu oluştur',
        onclick: () => {
          esitleme.esle(kodUret());
          goster = true;
          girisAcik = false;
          ciz();
          kok.querySelector('.eslesme__kod')?.focus();
        },
      }),
      el('button', {
        class: 'dugme', type: 'button', text: 'Kodum var', 'aria-expanded': String(girisAcik),
        onclick: () => { girisAcik = !girisAcik; ciz(); kok.querySelector('.eslesme__giris')?.focus(); },
      }),
    );
    kok.append(dugmeler);
    if (girisAcik) {
      const giris = el('input', {
        class: 'eslesme__giris', type: 'text', id: 'esleme-giris', autocomplete: 'off', autocapitalize: 'characters',
        spellcheck: 'false', inputmode: 'text', maxlength: '24', placeholder: 'XXXX-XXXX-XXXX', 'aria-describedby': 'esleme-hata',
      });
      const hata = el('p', { class: 'eslesme__hata', id: 'esleme-hata', role: 'alert' });
      const gonder = el('button', { class: 'dugme dugme--ikincil', type: 'button', text: 'Eşle', onclick: () => katilDene(giris.value, hata, gonder) });
      giris.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !mesgul) { e.preventDefault(); katilDene(giris.value, hata, gonder); } });
      kok.append(
        el('label', { class: 'eslesme__etiket', for: 'esleme-giris', text: 'Diğer cihazdaki kod' }),
        el('div', { class: 'eslesme__satir' }, giris, gonder),
        hata,
      );
    }
  }

  function eslidenCiz() {
    const kod = esitleme.eslemeKodu();
    const durum = el('p', { class: 'eslesme__durum', role: 'status' });
    durumaBagla(durum, (d) => {
      durum.dataset.durum = d.durum;
      durum.textContent = durumMetni(d) || (esitleme.esliMi() ? 'Eşli' : '');
    });
    kok.append(durum);

    const kodKutu = el('p', { class: 'eslesme__kod', tabindex: '-1', 'aria-label': goster ? `Eşleme kodu ${kodGoster(kod).split('').join(' ')}` : 'Eşleme kodu gizli' },
      goster ? kodGoster(kod) : kodMaskele(kod));
    const gosterDugme = el('button', {
      class: 'dugme dugme--kucuk', type: 'button', text: goster ? 'Gizle' : 'Göster', 'aria-pressed': String(goster),
      onclick: () => { goster = !goster; ciz(); kok.querySelector('.eslesme__kodsatir button')?.focus(); },
    });
    kok.append(el('div', { class: 'eslesme__kodsatir' }, kodKutu, gosterDugme));

    if (goster) {
      const url = baglanti(kod);
      const paylasimlar = [el('button', {
        class: 'dugme dugme--kucuk', type: 'button', text: 'Bağlantıyı kopyala',
        onclick: async () => bildirim((await panoyaKopyala(url)) ? 'Bağlantı kopyalandı.' : 'Kopyalanamadı. Kodu elle girebilirsin.'),
      })];
      if (typeof navigator.share === 'function') {
        paylasimlar.push(el('button', {
          class: 'dugme dugme--kucuk', type: 'button', text: 'Paylaş',
          onclick: () => { navigator.share({ title: 'Poker Okulu', text: 'Poker Okulu ilerlememi eşle', url }).catch(() => {}); },
        }));
      }
      kok.append(
        el('div', { class: 'eslesme__dugmeler' }, paylasimlar),
        el('p', { class: 'ayar__not', text: 'Bu kodu diğer cihazına gir; ilerlemen iki cihazda da aynı olur. Kodu kimseyle paylaşma — kodu bilen ilerlemeni görebilir ve değiştirebilir.' }),
      );
    }

    const simdi = el('button', {
      class: 'dugme', type: 'button', text: 'Şimdi eşitle',
      onclick: async () => {
        simdi.disabled = true;
        const r = await esitleme.esitle();
        simdi.disabled = false;
        if (r.ok) bildirim('Eşitlendi.');
      },
    });
    const alt = el('div', { class: 'eslesme__dugmeler' }, simdi);
    if (!kaldirOnayi) {
      alt.append(el('button', { class: 'dugme dugme--sade', type: 'button', text: 'Bu cihazda eşlemeyi kaldır', onclick: () => { kaldirOnayi = true; ciz(); kok.querySelector('.eslesme__onay .dugme--ikincil')?.focus(); } }));
      kok.append(alt);
    } else {
      kok.append(alt, el('div', { class: 'eslesme__onay' },
        el('p', { class: 'ayar__not', text: 'Bu cihaz kodu unutur ve eşitleme durur. İlerlemen bu cihazda kalır, diğer cihazdakine dokunulmaz. Kodu not etmediysen sonra diğer cihazdan görebilirsin.' }),
        el('div', { class: 'sonuc__butonlar' },
          el('button', { class: 'dugme dugme--ikincil', type: 'button', text: 'Evet, kaldır', onclick: () => { esitleme.eslemeyiKaldir(); kaldirOnayi = false; goster = false; bildirim('Eşleme bu cihazdan kaldırıldı.'); ciz(); } }),
          el('button', { class: 'dugme dugme--sade', type: 'button', text: 'Vazgeç', onclick: () => { kaldirOnayi = false; ciz(); } }),
        ),
      ));
    }
  }

  ciz();
  return kok;
}

// ---------- #esle=KOD ----------

function hashTemizle() {
  try { history.replaceState(null, '', '#/'); } catch { /* yok say */ }
}

// Adres çubuğunda #esle=KOD varsa onay penceresi açar. Döner: ilgilendiyse true.
// eslesti: eşleme tamamlanınca çağrılır (ekranı yenilemek için).
export function esleHashiniIsle({ eslesti } = {}) {
  const sonuc = hashtanKod(location.hash);
  if (sonuc === null) return false;
  if (sonuc === 'gecersiz') {
    hashTemizle();
    bildirim('Eşleme bağlantısı geçersiz.');
    return true;
  }
  const kod = sonuc;
  if (esitleme.eslemeKodu() === kod) {
    hashTemizle();
    bildirim('Bu cihaz zaten eşli.');
    return true;
  }
  const baskaKod = esitleme.esliMi();
  const hata = el('p', { class: 'eslesme__hata', role: 'alert' });
  const onayla = el('button', {
    class: 'dugme dugme--birincil', type: 'button', text: 'Eşle',
    onclick: async () => {
      onayla.disabled = true;
      onayla.textContent = 'Eşleniyor…';
      hata.textContent = '';
      try {
        await esitleme.katil(kod);
        m.kapat('tamam');
        bildirim('Cihaz eşlendi.');
        duyur('Cihaz eşlendi. İlerlemen birleştirildi.');
        eslesti?.();
      } catch (h) {
        onayla.disabled = false;
        onayla.textContent = 'Eşle';
        hata.textContent = hataMetni(h);
      }
    },
  });
  const m = modalAc({
    etiketId: 'esle-baslik',
    sinif: 'sonuc',
    icerik: [
      el('h2', { class: 'sonuc__baslik', id: 'esle-baslik', text: 'Bu cihazı eşle?' }),
      el('p', { class: 'sonuc__ozet', text: 'Bu cihazdaki ilerleme diğeriyle birleşir, hiçbir yıldız kaybolmaz.' }),
      baskaKod ? el('p', { class: 'ayar__not', text: 'Bu cihaz şu an başka bir kodla eşli; yeni kodla eşlenirsen eski eşleme kalkar.' }) : null,
      hata,
      el('div', { class: 'sonuc__butonlar' }, onayla, el('button', { class: 'dugme dugme--sade', type: 'button', text: 'Vazgeç', onclick: () => m.kapat('vazgec') })),
    ],
    onKapat: hashTemizle,
  });
  return true;
}
