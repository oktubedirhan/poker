// Masa oturumu: Oyun + botlar + koç + sayma + görev mantığı. Masa görevleri ve yönlendirmeli el.
// Görünüm js/ui/masa.js, eylemler js/ui/eylemler.js.

import { Oyun } from '../motor/oyun.js';
import { guvenliRng } from '../motor/rng.js';
import { Sayac } from '../analiz/sayac.js';
import { outlariBul } from '../analiz/outs.js';
import { kural24 } from '../analiz/olasilik.js';
import { kararDegerlendir, ipucu } from '../analiz/koc.js';
import { botKarar } from '../botlar/bot.js';
import { PROFILLER } from '../botlar/profiller.js';
import { el, bosalt, duyur, bildirim, hareketAzMi, modalAc, acikModalVarMi } from './dom.js';
import { MasaGorunumu } from './masa.js';
import { EylemCubugu } from './eylemler.js';
import { kocBalonu } from './koc.js';
import { SaymaPaneli } from './sayma.js';
import { soruCiz } from './sorular.js';
import { soruHazirla } from './soruUret.js';
import {
  gorunurOlay, olayMetni, masaSonucu, yonlendirmeliSonucu, hedefDurumMetni, hedefTarifi, siraHesapla,
  sokakAdi, ONERI_AD, sayiBicim, kararSay,
} from './mantik.js';

const IPTAL = Symbol('iptal');
const BOT_ADLARI = ['Zeynep', 'Mert', 'Elif', 'Can', 'Deniz'];
const BENIM = 'sen';

export class MasaOturumu {
  // tip: 'masa' | 'yonlendirmeli'
  constructor({ kok, seviye, gorev, tip = 'masa', ayarlar, onBitti, onAyar }) {
    this.kok = kok;
    this.seviye = seviye;
    this.gorev = gorev;
    this.tip = tip;
    this.ayarlar = ayarlar;
    this.onBitti = onBitti;
    this.onAyar = onAyar;
    this.ozellik = seviye.ozellikler ?? {};
    this.rng = guvenliRng();
    this.iptal = false;
    this._zaman = new Set();
    this._insanCoz = null;
    this._insanRed = null;
    this.hiz = hareketAzMi() ? 0.15 : 1;
    this.durum = { netCip: 0, iyiKarar: 0, onemliIyi: 0, hataKarar: 0, elendi: false, sira: null, oynananEl: 0, kalanOyuncu: 0, araDogru: 0, araToplam: 0, foldEtti: false };
    this.baslangic = Date.now();
    this._tus = (e) => this._tusIsle(e);
  }

  // ---------- Kurulum ----------

  baslat() {
    const g = this.gorev;
    const yon = this.tip === 'yonlendirmeli';
    const botlar = g.botlar ?? ['pasifAcemi'];
    this.baslangicCip = yon ? 1000 : g.baslangicCip;
    const oyuncular = [{ id: BENIM, ad: 'Sen', cip: this.baslangicCip, bot: null }];
    botlar.forEach((p, i) => oyuncular.push({ id: `bot${i + 1}`, ad: BOT_ADLARI[i] ?? `Bot ${i + 1}`, cip: this.baslangicCip, bot: p }));
    this.profiller = Object.fromEntries(oyuncular.filter((o) => o.bot).map((o) => [o.id, o.bot]));
    this.adlar = Object.fromEntries(oyuncular.map((o) => [o.id, o.ad]));

    this.oyun = new Oyun({
      oyuncular,
      kucukBlind: yon ? 10 : g.kucukBlind,
      buyukBlind: yon ? 20 : g.buyukBlind,
      desteModu: yon ? 'elBasi' : g.desteModu ?? 'elBasi',
      elSonuKartlariAc: !!g.elSonuKartlariAc,
      blindArtis: g.blindArtis ?? null,
      rng: this.rng,
    });
    this.sayac = this.ozellik.saymaPaneli ? new Sayac({ perspektifId: BENIM, mod: this.oyun.deste.mod }) : null;

    // DOM
    this.gorunum = new MasaGorunumu({ oyuncular, benimId: BENIM });
    this.cubuk = new EylemCubugu({
      onEylem: (e) => this._insanCoz?.(e),
      onIpucu: this.ozellik.koc !== 'kapali' && !yon ? () => this._ipucuGoster() : null,
    });
    this.kocKutu = el('div', { class: 'koc-alani' });
    this.outSatiri = el('p', { class: 'out-ipucu', hidden: true });
    this.sayma = this.sayac ? new SaymaPaneli() : null;
    this.durumP = el('p', { class: 'oturum__durum' });

    const ust = el('div', { class: 'oturum__ust' },
      el('p', { class: 'oturum__seviye', text: `Seviye ${this.seviye.id}: ${this.seviye.baslik}` }),
      el('h2', { class: 'oturum__baslik', tabindex: '-1', text: yon ? 'Görev: yönlendirmeli el' : 'Görev: masaya otur' }),
      el('p', { class: 'oturum__hedef', text: yon ? 'Koçun anlatımıyla bir eli baştan sona oyna. Sıra sende olunca eylem düğmelerini kullan.' : hedefTarifi(g) }),
      this.durumP,
    );
    const yan = [];
    if (this.ozellik.koc === 'istege' && !yon) {
      const kutu = el('input', { type: 'checkbox' });
      kutu.checked = !!this.ayarlar.koc;
      kutu.addEventListener('change', () => {
        this.ayarlar.koc = kutu.checked;
        this.onAyar?.({ koc: kutu.checked });
        if (!kutu.checked) bosalt(this.kocKutu);
      });
      yan.push(el('label', { class: 'anahtar oturum__koc-anahtar' }, kutu, el('span', { class: 'anahtar__ray' }), 'Koçu göster'));
    }
    const rakipler = el('details', { class: 'rakipler panel' },
      el('summary', { text: 'Rakiplerin' }),
      el('ul', {}, oyuncular.filter((o) => o.bot).map((o) => {
        const p = PROFILLER[o.bot];
        return el('li', {}, el('strong', { text: `${o.ad}: ${p?.ad ?? o.bot}. ` }), p?.aciklama ?? '');
      })),
    );
    this.ipucuDugme = null;
    if (this.ozellik.koc !== 'kapali' && !yon) {
      this.ipucuDugme = el('button', {
        class: 'ikon-dugme ipucu-dugme', type: 'button', disabled: true, title: 'İpucu (İ)',
        'aria-label': 'İpucu al', 'aria-keyshortcuts': 'I', text: '?', onclick: () => this._ipucuGoster(),
      });
    }
    this.alan = el('div', { class: 'oturum__alan' },
      el('div', { class: 'oturum__masa' }, this.gorunum.kok, this.ipucuDugme),
      el('div', { class: 'oturum__eylem' }, this.cubuk.kok),
      // Yan panel: telefonda display: contents (alt alta), masaüstünde masanın yanında tek sütun
      el('div', { class: 'oturum__yan' },
        el('div', { class: 'oturum__koc' }, yan, this.outSatiri, this.kocKutu),
        this.sayma ? el('div', { class: 'oturum__sayma' }, this.sayma.kok) : null,
        el('div', { class: 'oturum__rakip' }, rakipler),
      ),
    );
    this.kok.append(el('div', { class: 'oturum' }, ust, this.alan));
    this.cubuk.bekle('Kartlar dağıtılıyor…');
    this._durumYaz();
    if (this.sayma) this.sayma.guncelle(this.sayac, { destedeKalan: this.oyun.deste.kalanSayisi() });
    document.addEventListener('keydown', this._tus);
    ust.querySelector('.oturum__baslik').focus({ preventScroll: true });
    // Telefonda masa + eylem çubuğu ekrana sığsın: masayı en üste kaydır
    if (globalThis.innerWidth < 760) requestAnimationFrame(() => this.gorunum.kok.scrollIntoView({ block: 'start' }));

    this._dongu().catch((e) => {
      if (e === IPTAL) return;
      console.error(e);
      bildirim('Bir hata oldu; görevi yeniden başlat.');
    });
  }

  temizle() {
    this.iptal = true;
    for (const t of this._zaman) clearTimeout(t);
    this._zaman.clear();
    this._insanRed?.(IPTAL);
    document.removeEventListener('keydown', this._tus);
    this._araModal?.kapat('iptal');
  }

  // ---------- Yardımcılar ----------

  bekle(ms) {
    return new Promise((coz, red) => {
      if (this.iptal) { red(IPTAL); return; }
      const t = setTimeout(() => {
        this._zaman.delete(t);
        if (this.iptal) red(IPTAL);
        else coz();
      }, Math.max(0, ms));
      this._zaman.add(t);
    });
  }

  _kocGorunur() {
    if (this.tip === 'yonlendirmeli') return true;
    const k = this.ozellik.koc;
    if (k === 'acik') return true;
    if (k === 'istege') return !!this.ayarlar.koc;
    return false;
  }

  _kocNotu(veri) {
    const b = kocBalonu(veri);
    this.kocKutu.prepend(b);
    const enFazla = this.tip === 'yonlendirmeli' ? 2 : 1;
    while (this.kocKutu.childElementCount > enFazla) this.kocKutu.lastElementChild.remove();
  }

  _durumYaz() {
    const g = this.gorev;
    const oyunc = this.oyun.gorunum(BENIM).oyuncular;
    this.durum.kalanOyuncu = oyunc.filter((o) => o.oturuyor).length;
    if (this.tip === 'yonlendirmeli') {
      this.durumP.textContent = '';
      return;
    }
    const elSayi = Math.min(this.durum.oynananEl + (this.oyun.elBittiMi() ? 0 : 1), g.elSayisi);
    const bl = `Blind ${this.oyun.kucukBlind}/${this.oyun.buyukBlind}`;
    this.durumP.textContent = `El ${Math.max(1, elSayi)} / ${g.elSayisi} · ${hedefDurumMetni(g, this.durum)}${g.blindArtis ? ` · ${bl}` : ''}`;
  }

  async _olaylariOynat(ham) {
    for (const h of ham) {
      const o = gorunurOlay(h, BENIM); // rakip kartı asla arayüze girmez
      this.sayac?.olay(o);
      if (o.tur === 'karildi' && o.mod === 'ayakkabi') bildirim('Deste karıldı: sayma sıfırlandı');
      const metin = olayMetni(o, this.adlar, BENIM);
      if (o.tur !== 'kartDagitildi') duyur(metin);
      if (o.tur === 'yakildi' && this.tip === 'yonlendirmeli') duyur('Bir kart yakıldı.');
      await this.gorunum.olay(o, null, (ms) => this.bekle(ms), this.hiz);
      if (o.tur === 'sokak' || o.tur === 'showdown') this._adimGoster(o.tur === 'showdown' ? 'showdown' : o.sokak);
      if (o.tur === 'kartDagitildi' && o.oyuncuId === BENIM) this._benimKartlarMetni = metin;
      if (o.tur === 'oyuncuElendi' && o.oyuncuId === BENIM) this.durum.elendi = true;
      if (o.tur === 'eylem' && o.oyuncuId === BENIM && o.eylem === 'fold') this.durum.foldEtti = true;
      if (o.tur === 'potKazanildi') this._sonPotlar.push(o);
    }
    await this.gorunum.dagitimiBitir((ms) => this.bekle(ms), this.hiz);
    if (this._benimKartlarMetni) {
      duyur(this._benimKartlarMetni);
      this._benimKartlarMetni = null;
    }
    this.gorunum.guncelle(this.oyun.gorunum(BENIM));
    this._saymaGuncelle();
  }

  _saymaGuncelle(outlar = []) {
    if (!this.sayma) return;
    this.sayac.destedeKalanFiziksel = this.oyun.deste.kalanSayisi();
    this.sayma.guncelle(this.sayac, { outlar, destedeKalan: this.oyun.deste.kalanSayisi() });
  }

  _adimGoster(sokak) {
    if (this.tip !== 'yonlendirmeli') return;
    const adim = this.gorev.adimlar?.find((a) => a.sokak === sokak);
    if (!adim || this._gosterilenAdim?.has(sokak)) return;
    (this._gosterilenAdim ??= new Set()).add(sokak);
    this._kocNotu({ not: 'ipucu', baslik: sokakAdi(sokak), mesaj: adim.metin });
    duyur(`Koç: ${adim.metin}`);
  }

  // ---------- Akış ----------

  async _dongu() {
    const yon = this.tip === 'yonlendirmeli';
    for (;;) {
      await this._elOyna();
      this.durum.oynananEl++;
      const g = this.oyun.gorunum(BENIM);
      const ben = g.oyuncular.find((o) => o.id === BENIM);
      this.durum.netCip = ben.cip - this.baslangicCip;
      const digerCipler = g.oyuncular.filter((o) => o.id !== BENIM).map((o) => o.cip);
      if (this.durum.elendi) this.durum.sira = siraHesapla({ benimCip: 0, digerCipler, elendi: true });
      this._durumYaz();

      const bitti = yon || this.durum.elendi || this.oyun.oyunBittiMi() || this.durum.oynananEl >= this.gorev.elSayisi;
      if (bitti) {
        if (!this.durum.elendi) this.durum.sira = siraHesapla({ benimCip: ben.cip, digerCipler, elendi: false });
        this.cubuk.bekle('');
        await this.bekle(900 * this.hiz);
        const ek = this.durum.elendi ? 'Fişlerin bitti.' : 'Görev bitti.';
        this.cubuk.devam('Sonucu gör', () => this._bitir());
        duyur(ek);
        return;
      }
      const ara = this.gorev.araSorular;
      if (ara && this.durum.oynananEl % ara.her === 0) {
        await this.bekle(500 * this.hiz);
        await this._araSoru(ara.tur);
      }
      await new Promise((coz, red) => {
        this._insanRed = red;
        this.cubuk.devam('Sonraki el', coz);
      });
    }
  }

  _bitir() {
    const sure = Math.round((Date.now() - this.baslangic) / 1000);
    let sonuc;
    if (this.tip === 'yonlendirmeli') sonuc = yonlendirmeliSonucu(this.gorev, { tamamlandi: true, foldEtti: this.durum.foldEtti });
    else sonuc = masaSonucu(this.gorev, this.durum);
    if (this.durum.araToplam) sonuc.istatistik.push(['Ara soru', `${this.durum.araDogru}/${this.durum.araToplam}`]);
    sonuc.sure = sure;
    this.onBitti?.(sonuc);
  }

  async _elOyna() {
    this._sonPotlar = [];
    this._gosterilenAdim = new Set();
    this.outSatiri.hidden = true;
    const hazir = this.tip === 'yonlendirmeli' ? { hazirKartlar: this.gorev.hazirKartlar } : {};
    if (this.tip !== 'yonlendirmeli') bosalt(this.kocKutu);
    this.cubuk.bekle('Kartlar dağıtılıyor…');
    await this._olaylariOynat(this.oyun.yeniEl(hazir));
    this._adimGoster('preflop');
    this._durumYaz();

    while (!this.oyun.elBittiMi()) {
      const id = this.oyun.siradaki();
      if (id === null) break;
      if (id === BENIM) {
        const once = this.oyun.gorunum(BENIM);
        const karar = await this._insanKarari(once);
        this.outSatiri.hidden = true;
        this.cubuk.bekle('');
        let olaylar;
        try {
          olaylar = this.oyun.eylem(BENIM, karar);
        } catch (e) {
          console.warn(e);
          continue; // geçersizse yeniden sor
        }
        this._kararNotu(once, karar);
        await this._olaylariOynat(olaylar);
      } else {
        this.cubuk.bekle(`Sıra ${this.adlar[id]}'de…`);
        this.gorunum.guncelle(this.oyun.gorunum(BENIM));
        await this.bekle(this._botGecikme());
        const karar = this._botKarari(id);
        let olaylar;
        try {
          olaylar = this.oyun.eylem(id, karar);
        } catch (e) {
          console.warn('Bot geçersiz eylem:', e.message);
          const g = this.oyun.gecerliEylemler(id);
          olaylar = this.oyun.eylem(id, { tur: g.check ? 'check' : 'fold' });
        }
        await this._olaylariOynat(olaylar);
      }
      this._durumYaz();
    }
  }

  _botGecikme() {
    if (hareketAzMi()) return 150;
    return 400 + this.rng.int(501);
  }

  _botKarari(id) {
    const gecerli = this.oyun.gecerliEylemler(id);
    if (this.tip === 'yonlendirmeli') return { tur: gecerli.check ? 'check' : gecerli.call !== null ? 'call' : 'fold' };
    try {
      return botKarar(this.profiller[id], this.oyun.gorunum(id), gecerli, { rng: this.rng });
    } catch (e) {
      console.warn(e);
      return { tur: gecerli.check ? 'check' : 'fold' };
    }
  }

  _insanKarari(g) {
    const gecerli = this.oyun.gecerliEylemler(BENIM);
    let kisit = null;
    if (this.tip === 'yonlendirmeli') kisit = this.gorev.adimlar?.find((a) => a.sokak === g.sokak)?.beklenen ?? null;
    this._outIpucu(g);
    this.cubuk.karar(gecerli, g, { kisit });
    if (this.ipucuDugme) this.ipucuDugme.disabled = false;
    this.gorunum.siraSende(true);
    const secenek = [gecerli.check ? 'check' : gecerli.call !== null ? `call ${gecerli.call}` : null, 'fold', gecerli.raise || gecerli.bet ? 'raise' : null].filter(Boolean);
    duyur(`Sıra sende: ${secenek.join(', ')}.`);
    return new Promise((coz, red) => {
      this._insanCoz = (e) => {
        this._insanCoz = null;
        if (this.ipucuDugme) this.ipucuDugme.disabled = true;
        coz(e);
      };
      this._insanRed = red;
    });
  }

  _outIpucu(g) {
    if (!this.ozellik.outIpucu || !['flop', 'turn'].includes(g.sokak) || !g.benimKartlarim) {
      this.outSatiri.hidden = true;
      this._saymaGuncelle();
      return;
    }
    try {
      const bilinen = new Set([...g.benimKartlarim, ...g.board]);
      const gorulen = this.sayac ? this.sayac.gorulen().filter((k) => !bilinen.has(k)) : [];
      const r = outlariBul(g.benimKartlarim, g.board, { gorulen });
      const kalan = g.sokak === 'flop' ? 2 : 1;
      bosalt(this.outSatiri);
      if (r.toplam > 0) {
        this.outSatiri.append(
          el('strong', { text: `${r.toplam} out` }),
          ` · 2-4 kuralı: ~%${kural24(r.toplam, kalan)} (${kalan} kart gelecek). `,
          r.aciklama,
        );
      } else {
        this.outSatiri.append(el('strong', { text: 'Out yok. ' }), r.aciklama);
      }
      this.outSatiri.hidden = false;
      this._saymaGuncelle(r.kartlar);
    } catch (e) {
      console.warn(e);
      this.outSatiri.hidden = true;
    }
  }

  _kararNotu(once, karar) {
    if (this.tip === 'yonlendirmeli') return;
    let d;
    try {
      d = kararDegerlendir(once, karar, { rng: this.rng });
    } catch (e) {
      console.warn(e);
      return;
    }
    if (!d) return;
    kararSay(this.durum, d);
    if (this._kocGorunur()) {
      this._kocNotu(d);
      duyur(`Koç: ${d.baslik}. ${d.mesaj}`);
    }
  }

  _ipucuGoster() {
    if (this.cubuk.durum !== 'karar') return;
    const g = this.oyun.gorunum(BENIM);
    let r;
    try {
      r = ipucu(g, { rng: this.rng });
    } catch (e) {
      console.warn(e);
      return;
    }
    const tutar = r.ayrinti?.miktar ? ` ${sayiBicim(r.ayrinti.miktar)}` : '';
    const baslik = `İpucu: ${ONERI_AD[r.onerilen] ?? r.onerilen}${tutar}`;
    this._kocNotu({ not: 'ipucu', baslik, mesaj: r.mesaj, ayrinti: r.ayrinti });
    duyur(`${baslik}. ${r.mesaj}`);
  }

  async _araSoru(tur) {
    let hazir;
    try {
      hazir = soruHazirla(tur === 'sonrakiKart' ? { tur: 'sonrakiKart', uret: { soru: ['renk', 'deger', 'resimli'][this.rng.int(3)] } } : { tur: 'outSay', uret: { cekis: ['flos', 'acikUcluSirali', 'icSirali', 'karisik'][this.rng.int(4)] } }, { rng: this.rng, sayac: this.sayac });
    } catch (e) {
      console.warn(e);
      return;
    }
    await new Promise((coz, red) => {
      this._insanRed = red;
      const baslikId = 'ara-soru-baslik';
      const soru = soruCiz(hazir, {
        sonrakiMetin: 'Masaya dön',
        onCevap: (d) => { this.durum.araToplam++; if (d) this.durum.araDogru++; },
        onSonraki: () => this._araModal?.kapat('tamam'),
      });
      this._araModal = modalAc({
        etiketId: baslikId,
        sinif: 'ara-soru',
        kapatilabilir: true,
        icerik: [el('p', { class: 'ara-soru__ust', id: baslikId, text: tur === 'sonrakiKart' ? 'Ara soru: sayma' : 'Ara soru: out say' }), soru],
        onKapat: () => { this._araModal = null; coz(); },
      });
      soru.querySelector('.secenek, .soru__metin')?.focus();
    });
  }

  _tusIsle(e) {
    if (acikModalVarMi()) return;
    if (e.target?.closest?.('input[type="checkbox"], summary, textarea')) return;
    this.cubuk.tus(e);
  }
}
