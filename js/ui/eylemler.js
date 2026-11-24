// Eylem çubuğu (docs/TASARIM.md "Eylem çubuğu"). gecerliEylemler'den düğmeler; raise paneli; klavye.

import { el, bosalt } from './dom.js';
import { sayiBicim, hizliTutarlar, kaydiriciDegeri } from './mantik.js';

export class EylemCubugu {
  // onEylem({ tur, miktar }) ; onIpucu(): İ kısayolu (düğmeyi oturum masanın köşesine çizer)
  constructor({ onEylem, onIpucu = null }) {
    this.onEylem = onEylem;
    this.onIpucu = onIpucu;
    this.kok = el('div', { class: 'eylem-cubugu eylem-cubugu--yapisik eylem-cubugu--bekle', role: 'group', 'aria-label': 'Eylemler' });
    this.durum = null; // 'karar' | 'bekle' | 'sonraki'
    this.gecerli = null;
    this.panel = null;
    this._sonraki = null;
  }

  bekle(metin = '') {
    this.durum = 'bekle';
    this.gecerli = null;
    bosalt(this.kok);
    this.kok.classList.add('eylem-cubugu--bekle');
    if (metin) this.kok.append(el('p', { class: 'eylem-cubugu__durum', text: metin }));
    // Yer tutsun diye düğmeler soluk biçimde durur
    this.kok.append(el('div', { class: 'eylem-cubugu__butonlar' },
      el('button', { class: 'dugme eylem eylem--fold', type: 'button', disabled: true }, 'Fold'),
      el('button', { class: 'dugme eylem eylem--call', type: 'button', disabled: true }, 'Check'),
      el('button', { class: 'dugme eylem eylem--raise', type: 'button', disabled: true }, 'Raise'),
    ));
  }

  // Sonraki el / devam düğmesi
  devam(metin, fn) {
    this.durum = 'sonraki';
    this.gecerli = null;
    this._sonraki = fn;
    bosalt(this.kok);
    this.kok.classList.remove('eylem-cubugu--bekle');
    const d = el('button', { class: 'dugme dugme--birincil eylem', type: 'button', onclick: () => this._devamEt() }, metin, el('kbd', { text: 'Enter' }));
    this.kok.append(el('div', { class: 'eylem-cubugu__butonlar' }, d));
    d.focus({ preventScroll: true });
  }

  _devamEt() {
    if (this.durum !== 'sonraki') return;
    const fn = this._sonraki;
    this._sonraki = null;
    this.bekle('');
    fn?.();
  }

  // gecerli: gecerliEylemler; gorunum: oyun.gorunum('sen'); kisit: yalnız izinli tür (yönlendirmeli el)
  karar(gecerli, gorunum, { kisit = null } = {}) {
    this.durum = 'karar';
    this.gecerli = gecerli;
    this.gorunum = gorunum;
    this.kisit = kisit;
    bosalt(this.kok);
    this.kok.classList.remove('eylem-cubugu--bekle');
    const izin = (tur) => !kisit || kisit === tur || (kisit === 'call' && tur === 'check') || (kisit === 'check' && tur === 'call');

    const ben = gorunum.oyuncular.find((o) => o.id === gorunum.benimId);
    const cagri = gecerli.call ?? 0;
    const aralik = gecerli.raise ?? gecerli.bet;
    const tur = gecerli.raise ? 'raise' : 'bet';
    const kisaAllin = !aralik && gecerli.allin && gecerli.allin > cagri;

    // Raise paneli
    this.panel = null;
    if (aralik) {
      const adim = Math.max(1, gorunum.kucukBlind || 1);
      const hizli = hizliTutarlar(gorunum, cagri, aralik, adim);
      let deger = aralik.min;
      const cikti = el('output', { class: 'raise-paneli__miktar', text: sayiBicim(deger) });
      const kaydirici = el('input', {
        class: 'kaydirici', type: 'range', min: aralik.min, max: aralik.max, step: 1, value: aralik.min,
        'aria-label': tur === 'raise' ? 'Raise miktarı (bu sokaktaki toplam bahsin)' : 'Bet miktarı',
      });
      const onay = el('button', { class: 'dugme dugme--ikincil', type: 'button', onclick: () => this._raiseOnay() });
      const hizliDugmeler = [
        ['½ pot', hizli.yarimPot], ['Pot', hizli.pot], ['All-in', hizli.allin],
      ].map(([ad, v]) => el('button', {
        class: 'hizli', type: 'button', 'aria-pressed': 'false', dataset: { tutar: String(v) },
        onclick: () => ayarla(v, true),
      }, ad));
      const ayarla = (v, hizliMi = false) => {
        deger = kaydiriciDegeri(v, aralik, adim);
        kaydirici.value = String(deger);
        const oran = aralik.max > aralik.min ? ((deger - aralik.min) / (aralik.max - aralik.min)) * 100 : 100;
        kaydirici.style.setProperty('--dolu', `${oran}%`);
        cikti.textContent = sayiBicim(deger);
        const allin = deger >= aralik.max;
        onay.textContent = allin ? `All-in ${sayiBicim(deger)}` : `${tur === 'raise' ? 'Raise' : 'Bet'} ${sayiBicim(deger)}`;
        kaydirici.setAttribute('aria-valuetext', `${sayiBicim(deger)} fiş`);
        for (const h of hizliDugmeler) h.setAttribute('aria-pressed', String(hizliMi && Number(h.dataset.tutar) === deger));
        this._raiseDegeri = deger;
      };
      kaydirici.addEventListener('input', () => ayarla(kaydirici.value));
      this.panel = el('div', { class: 'raise-paneli', hidden: true },
        el('div', { class: 'raise-paneli__ust' }, el('span', { text: 'Bu sokakta toplam bahsin' }), cikti),
        kaydirici,
        el('div', { class: 'hizli-tutarlar' }, hizliDugmeler),
        onay,
      );
      this._aralik = aralik;
      this._raiseTur = tur;
      this._kaydirici = kaydirici;
      ayarla(aralik.min);
      this.kok.append(this.panel);
    }

    const butonlar = el('div', { class: 'eylem-cubugu__butonlar' });
    this._fold = el('button', { class: 'dugme eylem eylem--fold', type: 'button', disabled: !izin('fold'), onclick: () => this._gonder({ tur: 'fold' }) }, 'Fold', el('kbd', { text: 'F' }));
    butonlar.append(this._fold);
    this._cc = null;
    if (gecerli.check) {
      this._cc = el('button', { class: 'dugme eylem eylem--check', type: 'button', disabled: !izin('check'), onclick: () => this._gonder({ tur: 'check' }) }, 'Check', el('kbd', { text: 'C' }));
    } else if (gecerli.call !== null) {
      const allinCall = ben && gecerli.call >= ben.cip;
      this._cc = el('button', {
        class: 'dugme eylem eylem--call', type: 'button', disabled: !izin('call'),
        onclick: () => this._gonder({ tur: 'call' }),
        'aria-label': `Call ${gecerli.call}${allinCall ? ', all-in' : ''}`,
      }, allinCall ? 'All-in' : 'Call', el('span', { class: 'eylem__tutar', text: sayiBicim(gecerli.call) }), el('kbd', { text: 'C' }));
    }
    if (this._cc) butonlar.append(this._cc);
    this._raise = null;
    if (aralik) {
      this._raise = el('button', {
        class: 'dugme eylem eylem--raise', type: 'button', 'aria-expanded': 'false', disabled: !izin(tur) && !izin('raise') && !izin('bet'),
        onclick: () => this._paneliAcKapa(),
      }, tur === 'raise' ? 'Raise' : 'Bet', el('kbd', { text: 'R' }));
    } else if (kisaAllin) {
      this._raise = el('button', {
        class: 'dugme eylem eylem--raise', type: 'button', disabled: !izin('allin'),
        onclick: () => this._gonder({ tur: 'allin' }),
      }, 'All-in', el('span', { class: 'eylem__tutar', text: sayiBicim(ben ? ben.bahis + gecerli.allin : gecerli.allin) }), el('kbd', { text: 'R' }));
    }
    if (this._raise) butonlar.append(this._raise);
    this.kok.append(butonlar);
    const ilk = this._cc && !this._cc.disabled ? this._cc : butonlar.querySelector('button:not([disabled])');
    ilk?.focus({ preventScroll: true });
  }

  _paneliAcKapa(ac) {
    if (!this.panel) return;
    const acik = ac ?? this.panel.hidden;
    this.panel.hidden = !acik;
    this._raise?.setAttribute('aria-expanded', String(acik));
    if (acik) this._kaydirici?.focus({ preventScroll: true });
    else this._raise?.focus({ preventScroll: true });
  }

  _raiseOnay() {
    const v = this._raiseDegeri;
    if (v >= this._aralik.max && this.gecerli.allin) this._gonder({ tur: 'allin' });
    else this._gonder({ tur: this._raiseTur, miktar: v });
  }

  _gonder(eylem) {
    if (this.durum !== 'karar') return;
    this.durum = 'gonderildi';
    this.onEylem(eylem);
  }

  // Klavye: F fold, C check/call, R raise, Enter onay/devam, Esc paneli kapat. İşlendiyse true.
  tus(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const k = e.key.toLocaleLowerCase('tr');
    if (this.durum === 'sonraki') {
      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement?.closest?.('.eylem-cubugu') !== this.kok && document.activeElement?.tagName === 'BUTTON') return false;
        e.preventDefault();
        this._devamEt();
        return true;
      }
      return false;
    }
    if (this.durum !== 'karar') return false;
    const tikla = (b) => { if (b && !b.disabled) { e.preventDefault(); b.click(); return true; } return false; };
    if (k === 'f') return tikla(this._fold);
    if (k === 'c') return tikla(this._cc);
    if (k === 'r') {
      if (this.panel && this.panel.hidden) return tikla(this._raise);
      if (!this.panel) return tikla(this._raise);
      return false;
    }
    if ((k === 'i' || k === 'ı') && this.onIpucu) { e.preventDefault(); this.onIpucu(); return true; }
    if (e.key === 'Enter' && this.panel && !this.panel.hidden) {
      if (document.activeElement?.tagName === 'BUTTON' && this.panel.contains(document.activeElement)) return false;
      e.preventDefault();
      this._raiseOnay();
      return true;
    }
    if (e.key === 'Escape' && this.panel && !this.panel.hidden) {
      e.preventDefault();
      this._paneliAcKapa(false);
      return true;
    }
    return false;
  }
}
