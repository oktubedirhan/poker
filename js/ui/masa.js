// Masa görünümü (docs/TASARIM.md "Masa"). Oyun olaylarını animasyonlu uygular, gorunum'den durumu yansıtır.
// Oyun mantığı burada yok; denetleyici js/ui/oturum.js.

import { el, bosalt } from './dom.js';
import { kartYuzuAc, kartKapat, kartYuvaYap, yenidenOynat, arkaKart } from './kartlar.js';
import { sayiBicim, cipYigini, eylemEtiketi, sokakAdi, sonucMetni } from './mantik.js';

function cipSpan(miktar) {
  const { adet, deger } = cipYigini(miktar);
  const s = el('span', { class: 'cip-yigin', 'aria-hidden': 'true' });
  s.dataset.adet = String(adet);
  s.dataset.deger = String(deger);
  return s;
}

export class MasaGorunumu {
  constructor({ oyuncular, benimId = 'sen' }) {
    this.benimId = benimId;
    this.adlar = Object.fromEntries(oyuncular.map((o) => [o.id, o.id === benimId ? 'Sen' : o.ad]));
    this.potB = el('b', { text: '0' });
    this.potCip = cipSpan(0);
    this.yakilanKutu = el('span', { class: 'masa__yakilan', hidden: true });
    this.board = el('div', { class: 'masa__board', role: 'group', 'aria-label': 'Board (ortak kartlar)' });
    this.boardSlotlari = [];
    for (let i = 0; i < 5; i++) {
      const s = el('div', { class: 'kart kart--yuva', 'aria-hidden': 'true' });
      this.boardSlotlari.push(s);
      this.board.append(s);
    }
    this.sokakP = el('p', { class: 'masa__sokak', text: 'Preflop' });
    this.merkez = el('div', { class: 'masa__merkez' },
      el('div', { class: 'masa__pot' }, this.potCip, 'Pot ', this.potB, this.yakilanKutu),
      this.board,
      this.sokakP,
    );
    this.kok = el('section', { class: 'masa', 'aria-label': 'Poker masası' }, this.merkez);
    this.kok.dataset.oyuncuSayisi = String(oyuncular.length);

    this.koltuklar = new Map();
    oyuncular.forEach((o, i) => {
      const insan = o.id === benimId;
      const eylem = el('span', { class: 'koltuk__eylem' });
      const kartlar = el('div', { class: 'koltuk__kartlar' }, arkaKart(), arkaKart());
      const cip = el('span', { class: 'koltuk__cip', text: sayiBicim(o.cip ?? 0) });
      const kimlik = el('div', { class: 'koltuk__kimlik' }, el('span', { class: 'koltuk__ad', text: insan ? 'Sen' : o.ad }), cip);
      const bahis = el('span', { class: 'koltuk__bahis' });
      const kok = el('div', { class: `koltuk${insan ? ' koltuk--insan' : ''}`, role: 'group', 'aria-label': insan ? 'Sen' : o.ad }, eylem, kartlar, kimlik, bahis);
      kok.dataset.koltuk = String(i);
      this.koltuklar.set(o.id, { kok, eylem, kartlar, kimlik, cip, bahis, rozetler: null, kartElleri: [...kartlar.children] });
      this.kok.append(kok);
    });
    this.potOlaylari = [];
    this.yakilan = 0;
    this.sonucVar = false;
  }

  // ---------- Durum yansıtma ----------

  guncelle(g) {
    for (const o of g.oyuncular) {
      const k = this.koltuklar.get(o.id);
      if (!k) continue;
      k.cipDeger = o.cip;
      k.cip.textContent = sayiBicim(o.cip);
      this._bahisCiz(k, o.bahis);
      k.kok.classList.toggle('koltuk--fold', o.dusuk);
      k.kok.classList.toggle('koltuk--allin', o.allIn && !o.dusuk && g.sokak !== 'bitti');
      k.kok.classList.toggle('koltuk--sirada', g.siradakiId === o.id);
      k.kok.classList.toggle('koltuk--elendi', !o.oturuyor);

      const rozetler = [];
      if (g.dealerId === o.id) rozetler.push(['dealer', 'D', 'Dealer']);
      if (g.kucukBlindId === o.id) rozetler.push(['sb', 'SB', 'Küçük blind']);
      if (g.buyukBlindId === o.id) rozetler.push(['bb', 'BB', 'Büyük blind']);
      k.rozetler?.remove();
      k.rozetler = null;
      if (rozetler.length && o.oturuyor) {
        k.rozetler = el('span', { class: 'koltuk__rozetler' }, rozetler.map(([s, t, ad]) => el('span', { class: `rozet rozet--${s}`, title: ad, 'aria-label': ad, text: t })));
        k.kimlik.append(k.rozetler);
      }
      // Kendi kartlarım (animasyonsuz senkron)
      if (o.id === this.benimId && g.benimKartlarim && g.sokak !== 'bitti') {
        g.benimKartlarim.forEach((kart, i) => {
          const d = k.kartElleri[i];
          if (d.dataset.kart !== kart) kartYuzuAc(d, kart, { animasyon: false });
        });
      }
      if (o.acikKartlar) {
        o.acikKartlar.forEach((kart, i) => {
          const d = k.kartElleri[i];
          if (d.dataset.kart !== kart) kartYuzuAc(d, kart);
        });
      }
    }
    if (g.sokak !== 'bitti' || g.potToplam > 0) this._potCiz(g.potToplam);
    // Board senkron (animasyonlar olay sırasında yapıldı)
    g.board.forEach((kart, i) => {
      const d = this.boardSlotlari[i];
      if (d.dataset.kart !== kart) kartYuzuAc(d, kart, { animasyon: false });
    });
    if (!this.sonucVar && ['preflop', 'flop', 'turn', 'river'].includes(g.sokak)) this.sokakP.textContent = sokakAdi(g.sokak);
  }

  siraSende(var_) {
    this.koltuklar.get(this.benimId)?.kok.classList.toggle('koltuk--sirada', var_);
  }

  // Board'un boş yuvalarının üstünde kısa not (ör. "Deste karıldı"). Deste yalnızca el başında
  // karıldığı için o an board boştur; not süre dolunca ya da ilk ortak kart gelince kalkar.
  // Ekran okuyucuya duyuru ayrıca yapılır (olayMetni), bu yüzden not aria-hidden.
  boardNotu(metin, sure = 3000) {
    this.boardNotuKaldir();
    const not = el('p', { class: 'masa__not', 'aria-hidden': 'true', text: metin });
    this.board.append(not);
    this._not = not;
    this._notZaman = setTimeout(() => this.boardNotuKaldir(), sure);
  }

  boardNotuKaldir() {
    clearTimeout(this._notZaman);
    this._not?.remove();
    this._not = null;
  }

  // ---------- Olaylar ----------
  // bekle(ms) iptal edilebilir bekleme (denetleyiciden). Olayın görsel etkisini uygular.
  async olay(o, g, bekle, hiz = 1) {
    this._hiz = hiz;
    const t = (ms) => bekle(ms * hiz);
    switch (o.tur) {
      case 'elBasladi':
        this._sifirla();
        break;
      case 'kartDagitildi':
        this._dagitimSirasi = this._dagitimSirasi ?? [];
        this._dagitimSirasi.push(o);
        break;
      case 'blind':
        this._koy(o.oyuncuId, o.miktar, o.miktar);
        break;
      case 'yakildi':
        if (this._dagitimSirasi) await this._dagit(t);
        this.yakilan++;
        this._yakilanCiz(true);
        await t(260);
        break;
      case 'sokak': {
        this.boardNotuKaldir();
        this._eylemleriTemizle();
        for (const k of this.koltuklar.values()) this._bahisCiz(k, 0);
        const bas = o.board.length - o.yeniKartlar.length;
        this.sokakP.textContent = sokakAdi(o.sokak);
        for (let i = 0; i < o.yeniKartlar.length; i++) {
          kartYuzuAc(this.boardSlotlari[bas + i], o.yeniKartlar[i]);
          await t(160);
        }
        await t(260);
        break;
      }
      case 'eylem': {
        if (this._dagitimSirasi) await this._dagit(t);
        const k = this.koltuklar.get(o.oyuncuId);
        if (!k) break;
        const { metin, tur } = eylemEtiketi(o);
        k.eylem.className = `koltuk__eylem${tur ? ` koltuk__eylem--${tur}` : ''}`;
        k.eylem.textContent = metin;
        if (o.eylem === 'fold') k.kok.classList.add('koltuk--fold');
        else this._koy(o.oyuncuId, o.eklenen, o.miktar);
        break;
      }
      case 'showdown':
        this.sokakP.textContent = 'Showdown';
        for (const a of o.acilanlar) {
          const k = this.koltuklar.get(a.oyuncuId);
          if (!k) continue;
          a.kartlar.forEach((kart, i) => kartYuzuAc(k.kartElleri[i], kart, { animasyon: a.oyuncuId !== this.benimId }));
          if (a.deger) {
            k.eylem.className = 'koltuk__eylem koltuk__eylem--el';
            k.eylem.textContent = a.deger.ad;
          }
          await t(450);
        }
        break;
      case 'kartlarAcildi':
        for (const e of o.eller) {
          const k = this.koltuklar.get(e.oyuncuId);
          if (!k) continue;
          e.kartlar.forEach((kart, i) => {
            const d = k.kartElleri[i];
            if (d.dataset.kart !== kart) kartYuzuAc(d, kart);
          });
        }
        await t(300);
        break;
      case 'potKazanildi': {
        if (this._dagitimSirasi) await this._dagit(t);
        this.potOlaylari.push(o);
        this._potCiz(this.potOlaylari.reduce((t, p) => t + p.miktar, 0));
        for (const id of o.kazananlar) this.koltuklar.get(id)?.kok.classList.add('koltuk--kazanan');
        if (o.deger && o.potIndex === 0) this._vurgula(o.deger.enIyi5, o.kazananlar);
        this.sonucVar = true;
        this.sokakP.className = 'masa__sokak masa__sokak--sonuc';
        const ozet = sonucMetni(this.potOlaylari, this.adlar, this.benimId);
        const aciklama = this.potOlaylari[0]?.deger?.aciklama;
        this.sokakP.textContent = aciklama ? `${ozet}: ${aciklama}` : ozet;
        await t(500);
        break;
      }
      case 'elBitti':
        this.koltuklar.forEach((k) => k.kok.classList.remove('koltuk--sirada'));
        break;
      case 'oyuncuElendi':
        this.koltuklar.get(o.oyuncuId)?.kok.classList.add('koltuk--elendi');
        break;
      default:
        break;
    }
    if (g) this.guncelle(g);
  }

  // Bekleyen dağıtım olaylarını gerçek sırayla (birer birer, iki tur) canlandırır.
  async dagitimiBitir(bekle, hiz = 1) {
    this._hiz = hiz;
    if (this._dagitimSirasi) await this._dagit((ms) => bekle(ms * hiz));
  }

  async _dagit(t) {
    const olaylar = this._dagitimSirasi ?? [];
    this._dagitimSirasi = null;
    const n = olaylar.length;
    if (!n) return;
    const adim = 90;
    const m = this.merkez.getBoundingClientRect();
    const mx = m.left + m.width / 2, my = m.top + m.height / 2;
    olaylar.forEach((o, sira) => {
      const k = this.koltuklar.get(o.oyuncuId);
      if (!k) return;
      k.kartElleri.forEach((d, tur) => {
        if (o.oyuncuId === this.benimId && o.kartlar) kartYuzuAc(d, o.kartlar[tur], { animasyon: false });
        else kartKapat(d);
        const r = d.getBoundingClientRect();
        d.style.setProperty('--dx', `${Math.round(mx - (r.left + r.width / 2))}px`);
        d.style.setProperty('--dy', `${Math.round(my - (r.top + r.height / 2))}px`);
        d.style.setProperty('--gecikme', `${Math.round((tur * n + sira) * adim * (this._hiz ?? 1))}ms`);
        yenidenOynat(d, 'kart--dagit');
      });
    });
    await t(2 * n * adim + 350);
  }

  _bahisCiz(k, miktar) {
    bosalt(k.bahis);
    if (miktar > 0) k.bahis.append(cipSpan(miktar), sayiBicim(miktar));
  }

  _potCiz(miktar) {
    this.potDeger = miktar;
    this.potB.textContent = sayiBicim(miktar);
    const { adet, deger } = cipYigini(miktar);
    this.potCip.dataset.adet = String(adet);
    this.potCip.dataset.deger = String(deger);
  }

  // Olay anında çip/bahis/pot göstergesini ilerletir (el sonunda guncelle kesinleştirir).
  _koy(id, eklenen, sokakBahsi) {
    const k = this.koltuklar.get(id);
    if (!k) return;
    if (typeof k.cipDeger === 'number') {
      k.cipDeger -= eklenen;
      k.cip.textContent = sayiBicim(k.cipDeger);
    }
    this._bahisCiz(k, sokakBahsi);
    this._potCiz((this.potDeger ?? 0) + eklenen);
  }

  _vurgula(enIyi5, kazananlar) {
    const set = new Set(enIyi5 || []);
    for (const d of this.boardSlotlari) {
      if (!d.dataset.kart) continue;
      d.classList.toggle('kart--vurgulu', set.has(d.dataset.kart));
      d.classList.toggle('kart--soluk', !set.has(d.dataset.kart));
    }
    for (const id of kazananlar) {
      const k = this.koltuklar.get(id);
      if (!k) continue;
      for (const d of k.kartElleri) {
        if (!d.dataset.kart) continue;
        d.classList.toggle('kart--vurgulu', set.has(d.dataset.kart));
        d.classList.toggle('kart--soluk', !set.has(d.dataset.kart));
      }
    }
  }

  _eylemleriTemizle() {
    for (const k of this.koltuklar.values()) {
      if (k.eylem.classList.contains('koltuk__eylem--fold')) continue;
      k.eylem.className = 'koltuk__eylem';
      k.eylem.textContent = '';
    }
  }

  _sifirla() {
    this.potOlaylari = [];
    this.sonucVar = false;
    this.yakilan = 0;
    this._yakilanCiz(false);
    this._potCiz(0);
    for (const k of this.koltuklar.values()) this._bahisCiz(k, 0);
    this._dagitimSirasi = null;
    this.sokakP.className = 'masa__sokak';
    this.sokakP.textContent = 'Preflop';
    this.boardSlotlari.forEach((d) => kartYuvaYap(d));
    for (const k of this.koltuklar.values()) {
      k.eylem.className = 'koltuk__eylem';
      k.eylem.textContent = '';
      k.kok.classList.remove('koltuk--kazanan', 'koltuk--fold', 'koltuk--allin');
      k.kartElleri.forEach((d) => {
        kartKapat(d);
        d.classList.remove('kart--dagit');
      });
    }
  }

  _yakilanCiz(yeni) {
    bosalt(this.yakilanKutu);
    this.yakilanKutu.hidden = this.yakilan === 0;
    if (!this.yakilan) return;
    for (let i = 0; i < this.yakilan; i++) {
      this.yakilanKutu.append(el('span', { class: 'kart kart--arka', 'aria-hidden': 'true' }));
    }
    this.yakilanKutu.append(el('span', { class: 'masa__yakilan-yazi', text: 'yakıldı' }));
    this.yakilanKutu.setAttribute('aria-label', `${this.yakilan} kart yakıldı`);
    this.yakilanKutu.setAttribute('role', 'img');
    if (yeni) yenidenOynat(this.yakilanKutu, 'masa__yakilan--yeni');
  }
}
