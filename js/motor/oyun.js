// Texas Hold'em (No-Limit) masa motoru. DOM'a dokunmaz; olay listesi döndürür.
//
// Oturma sırası = `oyuncular` dizisinin sırası. "Sol" = sonraki indeks (index + 1).
// Oyuncu alanları:
//   cip          — önündeki (henüz ortaya sürülmemiş) çip
//   bahis        — bu sokakta ortaya koyduğu toplam
//   toplamBahis  — bu elde pota koyduğu toplam
//   eldeMi       — bu ele kart aldı mı
//   konustu      — bu bahis turunda eylem yaptı mı
//   actigiSeviye — son eyleminde geçerli olan "tam bahis seviyesi" (raise hakkı takibi)

import { Deste } from './deste.js';
import { guvenliRng } from './rng.js';
import { tumKartlar, kartGecerliMi } from './kart.js';
import { degerlendir, karsilastir } from './degerlendirici.js';
import { potlariHesapla, potuDagit } from './pot.js';

const SOKAK_SIRASI = ['preflop', 'flop', 'turn', 'river'];
const YENI_KART_SAYISI = { flop: 3, turn: 1, river: 1 };
const BLIND_SONRASI_POZISYONLAR = { 0: [], 1: ['UTG'], 2: ['UTG', 'CO'], 3: ['UTG', 'MP', 'CO'] };

function hata(mesaj) {
  return new Error(`Geçersiz eylem: ${mesaj}`);
}

export class Oyun {
  constructor({
    oyuncular,
    kucukBlind,
    buyukBlind,
    desteModu = 'elBasi',
    rng = guvenliRng(),
    elSonuKartlariAc = false,
    blindArtis = null,
  }) {
    if (!Array.isArray(oyuncular) || oyuncular.length < 2) throw new Error('En az 2 oyuncu gerekir');
    if (new Set(oyuncular.map((o) => o.id)).size !== oyuncular.length) throw new Error('Oyuncu id\'leri benzersiz olmalı');
    for (const o of oyuncular) {
      if (!Number.isInteger(o.cip) || o.cip < 0) throw new Error(`Geçersiz çip: ${o.id}`);
    }
    if (!Number.isInteger(kucukBlind) || !Number.isInteger(buyukBlind) || kucukBlind <= 0 || buyukBlind < kucukBlind) {
      throw new Error('Geçersiz blind değerleri');
    }

    this.oyuncular = oyuncular.map((o) => ({
      id: o.id,
      ad: o.ad ?? o.id,
      cip: o.cip,
      bot: o.bot ?? null,
      oturuyor: o.cip > 0,
      eldeMi: false,
      kartlar: null,
      bahis: 0,
      toplamBahis: 0,
      dusuk: false,
      allIn: false,
      konustu: false,
      actigiSeviye: 0,
      acikKartlar: null,
      pozisyon: null,
    }));
    this.baslangicBlindleri = { kucuk: kucukBlind, buyuk: buyukBlind };
    this.kucukBlind = kucukBlind;
    this.buyukBlind = buyukBlind;
    this.rng = rng;
    this.elSonuKartlariAc = elSonuKartlariAc;
    this.blindArtis = blindArtis;
    this.deste = new Deste({ mod: desteModu, rng });
    this._bilinenKaristirma = this.deste.karistirmaSayisi; // kurulumdaki ilk karma bildirilmez

    this.elNo = 0;
    this.sokak = 'bitti';
    this.board = [];
    this.dealerIndex = -1;
    this.kucukBlindIndex = -1;
    this.buyukBlindIndex = -1;
    this.mevcutBahis = 0;      // bu sokakta karşılanması gereken seviye
    this.sonArtis = buyukBlind; // en az raise artışı
    this.tamBahisSeviyesi = 0; // son TAM bet/raise'in seviyesi (aksiyonu yeniden açan)
    this.sonAgresifId = null;
    this.gecmis = [];
    this._elAktif = false;
    this._siradakiIndex = -1;
    this._sonKonusanIndex = -1;
    this._otomatik = false;    // herkes all-in: board kendiliğinden açıldı
    this._yeniOlaylar = [];
  }

  // ---------- Genel API ----------

  yeniEl({ hazirKartlar } = {}) {
    if (this._elAktif) throw new Error('El hâlâ sürüyor');
    if (this.oyunBittiMi()) throw new Error('Oyun bitti');
    this._yeniOlaylar = [];
    this.gecmis = [];
    this.elNo++;
    this._blindleriGuncelle();

    for (const p of this.oyuncular) {
      Object.assign(p, {
        eldeMi: p.cip > 0, oturuyor: p.cip > 0, kartlar: null, bahis: 0, toplamBahis: 0, dusuk: false,
        allIn: false, konustu: false, actigiSeviye: 0, acikKartlar: null, pozisyon: null,
      });
    }
    this.board = [];
    this.sokak = 'preflop';
    this._otomatik = false;
    this.sonAgresifId = null;
    this._elAktif = true;

    // Dealer düğmesi bir sağa (sonraki oturan oyuncuya) kayar.
    this.dealerIndex = this._sonrakiEldeki(this.dealerIndex);
    const dagitimSirasi = this._dealerSonrasiIndeksler();
    const n = dagitimSirasi.length;
    if (n === 2) {
      // Heads-up: dealer küçük blind öder.
      this.kucukBlindIndex = this.dealerIndex;
      this.buyukBlindIndex = this._sonrakiEldeki(this.dealerIndex);
    } else {
      this.kucukBlindIndex = this._sonrakiEldeki(this.dealerIndex);
      this.buyukBlindIndex = this._sonrakiEldeki(this.kucukBlindIndex);
    }
    this._pozisyonlariAta(dagitimSirasi);

    // Deste
    if (hazirKartlar) this._hazirKartlariDiz(hazirKartlar, dagitimSirasi);
    else this.deste.yeniEl(2 * n + 5 + 3);

    this._olay({
      tur: 'elBasladi', elNo: this.elNo, dealerId: this.oyuncular[this.dealerIndex].id,
      kucukBlind: this.kucukBlind, buyukBlind: this.buyukBlind,
    });
    if (this.deste.karistirmaSayisi !== this._bilinenKaristirma) {
      this._bilinenKaristirma = this.deste.karistirmaSayisi;
      this._olay({ tur: 'karildi', mod: this.deste.mod });
    }

    // Blindler
    this._blindKoy(this.kucukBlindIndex, this.kucukBlind, 'kucuk');
    this._blindKoy(this.buyukBlindIndex, this.buyukBlind, 'buyuk');
    this.mevcutBahis = this.buyukBlind;
    this.sonArtis = this.buyukBlind;
    this.tamBahisSeviyesi = this.buyukBlind;

    // Dağıtım: dealer'ın solundan başlayarak birer birer, iki tur.
    for (const i of dagitimSirasi) this.oyuncular[i].kartlar = [];
    for (let tur = 0; tur < 2; tur++) {
      for (const i of dagitimSirasi) this.oyuncular[i].kartlar.push(this.deste.cek());
    }
    for (const i of dagitimSirasi) {
      const p = this.oyuncular[i];
      this._olay({ tur: 'kartDagitildi', oyuncuId: p.id, kartlar: [...p.kartlar] });
    }

    // Preflop ilk konuşan: büyük blind'ın solu (heads-up'ta bu dealer'dır).
    this._sonKonusanIndex = this.buyukBlindIndex;
    this._ilerle();
    return this._yeniOlaylar;
  }

  eylem(oyuncuId, { tur, miktar } = {}) {
    if (!this._elAktif) throw hata('el sürmüyor');
    const index = this._index(oyuncuId);
    if (index !== this._siradakiIndex) throw hata(`sıra ${oyuncuId} oyuncusunda değil`);
    this._yeniOlaylar = [];
    const p = this.oyuncular[index];
    const g = this.gecerliEylemler(oyuncuId);
    const oncekiBahis = p.bahis;

    switch (tur) {
      case 'fold':
        p.dusuk = true;
        break;
      case 'check':
        if (!g.check) throw hata('check yapılamaz, karşılanacak bahis var');
        break;
      case 'call':
        if (g.call === null) throw hata('call edilecek bahis yok');
        this._ortayaKoy(p, g.call);
        break;
      case 'bet':
      case 'raise': {
        const aralik = g[tur];
        if (!aralik) throw hata(`${tur} şu an yapılamaz`);
        if (!Number.isInteger(miktar) || miktar < aralik.min || miktar > aralik.max) {
          throw hata(`${tur} miktarı ${aralik.min}–${aralik.max} arasında olmalı (verilen: ${miktar})`);
        }
        this._ortayaKoy(p, miktar - p.bahis);
        this._yukselt(p);
        break;
      }
      case 'allin':
        if (!g.allin) throw hata('all-in yapılamaz');
        this._ortayaKoy(p, g.allin);
        if (p.bahis > this.mevcutBahis) this._yukselt(p);
        break;
      default:
        throw hata(`bilinmeyen eylem türü: ${tur}`);
    }

    p.konustu = true;
    // Bahissiz check: oyuncu henüz bir bahse yanıt vermedi. Sonradan gelen (tam olmayan all-in
    // dahil) her açılış bahsine karşı raise hakkı kalır; -1 her tamBahisSeviyesi'nden küçüktür.
    p.actigiSeviye = tur === 'check' && this.mevcutBahis === 0 ? -1 : this.tamBahisSeviyesi;
    // Olayın kendi 'tur' alanı 'eylem' olduğu için eylem türü 'eylem' alanında taşınır.
    // miktar: oyuncunun bu sokaktaki toplam bahsi, eklenen: bu eylemle ortaya koyduğu.
    this._olay({ tur: 'eylem', oyuncuId, eylem: tur, miktar: p.bahis, eklenen: p.bahis - oncekiBahis });
    this._sonKonusanIndex = index;
    this._ilerle();
    return this._yeniOlaylar;
  }

  gecerliEylemler(oyuncuId) {
    const yok = { fold: false, check: false, call: null, bet: null, raise: null, allin: null };
    if (!this._elAktif) return yok;
    const index = this._index(oyuncuId);
    if (index !== this._siradakiIndex) return yok;
    const p = this.oyuncular[index];

    const cagri = Math.max(0, this.mevcutBahis - p.bahis);
    const enFazla = p.bahis + p.cip; // bu sokakta koyabileceği toplam
    const karsilikVerebilen = this.oyuncular.some((o) => o !== p && o.eldeMi && !o.dusuk && !o.allIn);
    const raiseHakki = karsilikVerebilen && (!p.konustu || p.actigiSeviye < this.tamBahisSeviyesi);
    const enAzRaise = this.mevcutBahis + this.sonArtis;

    // Raise hakkı yoksa all-in yalnızca call kadar olabilir (aksiyonu yeniden açamaz).
    const allin = raiseHakki ? p.cip : Math.min(p.cip, cagri);
    return {
      fold: true,
      check: cagri === 0,
      call: cagri > 0 ? Math.min(cagri, p.cip) : null,
      bet: this.mevcutBahis === 0 && raiseHakki && p.cip > 0
        ? { min: Math.min(this.buyukBlind, p.cip), max: p.cip }
        : null,
      raise: this.mevcutBahis > 0 && raiseHakki && enFazla >= enAzRaise
        ? { min: enAzRaise, max: enFazla }
        : null,
      allin: allin > 0 ? allin : null,
    };
  }

  siradaki() {
    return this._elAktif && this._siradakiIndex >= 0 ? this.oyuncular[this._siradakiIndex].id : null;
  }

  elBittiMi() {
    return !this._elAktif;
  }

  oyunBittiMi() {
    return !this._elAktif && this.oyuncular.filter((p) => p.cip > 0).length <= 1;
  }

  // Oyuncunun görebildiği durum. Başkalarının kapalı kartları ASLA burada yer almaz.
  gorunum(oyuncuId) {
    const ben = this.oyuncular.find((p) => p.id === oyuncuId);
    const idAl = (i) => (i >= 0 ? this.oyuncular[i].id : null);
    return {
      elNo: this.elNo,
      sokak: this.sokak,
      board: [...this.board],
      potToplam: this.oyuncular.reduce((t, p) => t + p.toplamBahis, 0),
      mevcutBahis: this.mevcutBahis,
      enAzRaise: this.mevcutBahis + this.sonArtis,
      kucukBlind: this.kucukBlind,
      buyukBlind: this.buyukBlind,
      dealerId: idAl(this.dealerIndex),
      kucukBlindId: idAl(this.kucukBlindIndex),
      buyukBlindId: idAl(this.buyukBlindIndex),
      siradakiId: this.siradaki(),
      benimId: oyuncuId,
      benimKartlarim: ben && ben.kartlar ? [...ben.kartlar] : null,
      oyuncular: this.oyuncular.map((p) => ({
        id: p.id,
        ad: p.ad,
        cip: p.cip,
        bahis: p.bahis,
        toplamBahis: p.toplamBahis,
        dusuk: p.dusuk,
        allIn: p.allIn,
        oturuyor: p.oturuyor,
        acikKartlar: p.acikKartlar ? [...p.acikKartlar] : null,
        pozisyon: p.pozisyon,
      })),
      gecmis: this.gecmis.map((o) => {
        const kopya = structuredClone(o);
        if (kopya.tur === 'kartDagitildi' && kopya.oyuncuId !== oyuncuId) kopya.kartlar = null;
        return kopya;
      }),
    };
  }

  // Tam durum (test / hata ayıklama). Bütün kartlar dahil.
  durum() {
    return structuredClone({
      elNo: this.elNo,
      sokak: this.sokak,
      board: this.board,
      kucukBlind: this.kucukBlind,
      buyukBlind: this.buyukBlind,
      dealerIndex: this.dealerIndex,
      kucukBlindIndex: this.kucukBlindIndex,
      buyukBlindIndex: this.buyukBlindIndex,
      siradakiId: this.siradaki(),
      mevcutBahis: this.mevcutBahis,
      sonArtis: this.sonArtis,
      tamBahisSeviyesi: this.tamBahisSeviyesi,
      sonAgresifId: this.sonAgresifId,
      oyuncular: this.oyuncular,
      gecmis: this.gecmis,
      deste: { kalan: this.deste.kalanSayisi(), cekilenler: this.deste.cekilenler() },
    });
  }

  // ---------- İç işleyiş ----------

  _olay(o) {
    this.gecmis.push(o);
    this._yeniOlaylar.push(o);
  }

  _index(id) {
    const i = this.oyuncular.findIndex((p) => p.id === id);
    if (i === -1) throw hata(`bilinmeyen oyuncu: ${id}`);
    return i;
  }

  // i'den sonraki (saat yönünde) ele katılan ilk oyuncu
  _sonrakiEldeki(i) {
    const n = this.oyuncular.length;
    for (let adim = 1; adim <= n; adim++) {
      const j = (((i + adim) % n) + n) % n;
      if (this.oyuncular[j].eldeMi) return j;
    }
    throw new Error('Elde oyuncu yok');
  }

  // Dealer'ın solundan başlayıp dealer'da biten indeks sırası (dağıtım sırası)
  _dealerSonrasiIndeksler() {
    const sira = [];
    let i = this.dealerIndex;
    do {
      i = this._sonrakiEldeki(i);
      sira.push(i);
    } while (i !== this.dealerIndex);
    return sira;
  }

  _blindleriGuncelle() {
    if (!this.blindArtis) return;
    const { herElde, carpan } = this.blindArtis;
    const seviye = Math.floor((this.elNo - 1) / herElde);
    const kucuk = Math.max(1, Math.round(this.baslangicBlindleri.kucuk * carpan ** seviye));
    const buyuk = Math.max(kucuk, Math.round(this.baslangicBlindleri.buyuk * carpan ** seviye));
    this.kucukBlind = kucuk;
    this.buyukBlind = buyuk;
  }

  _pozisyonlariAta(dagitimSirasi) {
    const n = dagitimSirasi.length;
    const dealer = this.oyuncular[this.dealerIndex];
    dealer.pozisyon = 'BTN';
    if (n === 2) {
      this.oyuncular[this.buyukBlindIndex].pozisyon = 'BB';
      return;
    }
    this.oyuncular[this.kucukBlindIndex].pozisyon = 'SB';
    this.oyuncular[this.buyukBlindIndex].pozisyon = 'BB';
    const kalan = dagitimSirasi.slice(2, n - 1); // BB'nin solundan dealer'a kadar
    const adlar = BLIND_SONRASI_POZISYONLAR[kalan.length]
      ?? ['UTG', ...Array(kalan.length - 2).fill('MP'), 'CO'];
    kalan.forEach((i, k) => { this.oyuncular[i].pozisyon = adlar[k]; });
  }

  // Ders için hazır kartlar: gerçek dağıtım + yakma sırasıyla destenin üstüne dizilir.
  // Sıra: 1. tur kartları, 2. tur kartları, yak, flop×3, yak, turn, yak, river.
  _hazirKartlariDiz(hazirKartlar, dagitimSirasi) {
    const n = dagitimSirasi.length;
    const dizi = new Array(2 * n + 8).fill(null);
    const boardYerleri = [2 * n + 1, 2 * n + 2, 2 * n + 3, 2 * n + 5, 2 * n + 7];

    for (const [anahtar, kartlar] of Object.entries(hazirKartlar)) {
      if (!Array.isArray(kartlar)) throw new Error(`hazirKartlar.${anahtar} dizi olmalı`);
      if (anahtar === 'board') {
        if (kartlar.length > 5) throw new Error('Board en fazla 5 kart');
        kartlar.forEach((k, i) => { dizi[boardYerleri[i]] = k; });
        continue;
      }
      // Dersler insan oyuncuyu 'insan' diye yazabilir; masadaki id'si 'sen'.
      let id = anahtar;
      if (anahtar === 'insan' && !this.oyuncular.some((p) => p.id === 'insan')) id = 'sen';
      const sira = dagitimSirasi.findIndex((i) => this.oyuncular[i].id === id);
      if (sira === -1) throw new Error(`hazirKartlar: elde olmayan oyuncu ${anahtar}`);
      if (kartlar.length > 2) throw new Error(`hazirKartlar.${anahtar} en fazla 2 kart`);
      kartlar.forEach((k, tur) => { dizi[tur * n + sira] = k; });
    }

    const kullanilan = dizi.filter((k) => k !== null);
    for (const k of kullanilan) if (!kartGecerliMi(k)) throw new Error(`Geçersiz kart: ${k}`);
    if (new Set(kullanilan).size !== kullanilan.length) throw new Error('hazirKartlar: tekrarlanan kart');

    // Boş yerler kalan kartlardan rastgele doldurulur.
    const bos = tumKartlar().filter((k) => !kullanilan.includes(k));
    for (let i = bos.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [bos[i], bos[j]] = [bos[j], bos[i]];
    }
    for (let i = 0; i < dizi.length; i++) if (dizi[i] === null) dizi[i] = bos.pop();
    this.deste.diz(dizi);
  }

  _blindKoy(index, miktar, tip) {
    const p = this.oyuncular[index];
    const koyulan = this._ortayaKoy(p, Math.min(miktar, p.cip));
    this._olay({ tur: 'blind', oyuncuId: p.id, miktar: koyulan, tip });
  }

  _ortayaKoy(p, miktar) {
    p.cip -= miktar;
    p.bahis += miktar;
    p.toplamBahis += miktar;
    if (p.cip === 0) p.allIn = true;
    return miktar;
  }

  // p'nin yeni bahsi mevcut seviyeyi aştı (bet / raise / yükselten all-in).
  // Artış en az son artış kadarsa TAM raise'dir: aksiyonu yeniden açar ve en az raise'i belirler.
  _yukselt(p) {
    const artis = p.bahis - this.mevcutBahis;
    if (artis >= this.sonArtis) {
      this.sonArtis = artis;
      this.tamBahisSeviyesi = p.bahis;
    }
    this.mevcutBahis = p.bahis;
    this.sonAgresifId = p.id;
  }

  _canlilar() {
    return this.oyuncular.filter((p) => p.eldeMi && !p.dusuk);
  }

  _konusabilenler() {
    return this._canlilar().filter((p) => !p.allIn);
  }

  _bahisTuruBittiMi() {
    const konusabilen = this._konusabilenler();
    if (konusabilen.length === 0) return true;
    if (konusabilen.length === 1) return konusabilen[0].bahis >= this.mevcutBahis;
    return konusabilen.every((p) => p.konustu && p.bahis === this.mevcutBahis);
  }

  // i'den sonra eylem yapması gereken ilk oyuncu
  _eylemBekleyen(i) {
    const n = this.oyuncular.length;
    for (let adim = 1; adim <= n; adim++) {
      const j = (i + adim) % n;
      const p = this.oyuncular[j];
      if (p.eldeMi && !p.dusuk && !p.allIn && (!p.konustu || p.bahis < this.mevcutBahis)) return j;
    }
    throw new Error('Eylem bekleyen oyuncu bulunamadı');
  }

  // Eylemden sonra eli ilerletir: sıradakini bulur, sokak açar ya da eli bitirir.
  _ilerle() {
    for (;;) {
      if (this._canlilar().length === 1) {
        this._eliBitir(); // herkes fold etti: kart açılmaz
        return;
      }
      if (!this._bahisTuruBittiMi()) {
        this._siradakiIndex = this._eylemBekleyen(this._sonKonusanIndex);
        return;
      }
      this._bahisleriTopla();
      if (this.sokak === 'river') {
        this._showdown();
        return;
      }
      // Konuşabilecek en fazla bir kişi kaldıysa kalan board kendiliğinden açılır.
      if (this._konusabilenler().length <= 1) this._otomatik = true;
      this._sokakAc();
      this._sonKonusanIndex = this.dealerIndex; // sonraki sokaklarda dealer'ın solu başlar
      if (!this._otomatik) this.sonAgresifId = null;
    }
  }

  _bahisleriTopla() {
    for (const p of this.oyuncular) {
      p.bahis = 0;
      p.konustu = false;
      p.actigiSeviye = 0;
    }
    this.mevcutBahis = 0;
    this.sonArtis = this.buyukBlind;
    this.tamBahisSeviyesi = 0;
    this._siradakiIndex = -1;
  }

  _sokakAc() {
    const yeniSokak = SOKAK_SIRASI[SOKAK_SIRASI.indexOf(this.sokak) + 1];
    this.deste.yak();
    this._olay({ tur: 'yakildi' });
    const yeniKartlar = [];
    for (let i = 0; i < YENI_KART_SAYISI[yeniSokak]; i++) yeniKartlar.push(this.deste.cek());
    this.board.push(...yeniKartlar);
    this.sokak = yeniSokak;
    this._olay({ tur: 'sokak', sokak: yeniSokak, yeniKartlar, board: [...this.board] });
  }

  // Karşılanmamış (kimsenin eşleyemediği) bahis fazlası sahibine geri döner.
  _karsilanmayaniIadeEt() {
    const elde = this.oyuncular.filter((p) => p.eldeMi);
    const sirali = [...elde].sort((a, b) => b.toplamBahis - a.toplamBahis);
    const [enCok, ikinci] = sirali;
    if (!enCok || enCok.dusuk) return;
    const fark = enCok.toplamBahis - (ikinci ? ikinci.toplamBahis : 0);
    if (fark <= 0) return;
    enCok.toplamBahis -= fark;
    enCok.bahis = Math.max(0, enCok.bahis - fark);
    enCok.cip += fark;
    enCok.allIn = enCok.cip === 0;
  }

  _potlar() {
    return potlariHesapla(this.oyuncular.filter((p) => p.eldeMi)
      .map((p) => ({ id: p.id, toplamBahis: p.toplamBahis, dusuk: p.dusuk })));
  }

  // Açılma sırası: son agresif oyuncu önce, yoksa dealer'ın solundaki ilk oyuncu; sonra saat yönünde.
  // Herkes all-in ise ya da en az bir oyuncu all-in ise tüm eller açılır. Değilse bir oyuncu, hak sahibi olduğu çekişmeli potların
  // hiçbirinde açılmış en iyi eli yenemiyor/eşitleyemiyorsa elini açmaz (muck).
  _showdown() {
    this.sokak = 'showdown';
    this._karsilanmayaniIadeEt();
    const potlar = this._potlar().filter((pot) => pot.hakSahipleri.length >= 2);

    const baslangic = this.sonAgresifId !== null && this._canlilar().some((p) => p.id === this.sonAgresifId)
      ? this._index(this.sonAgresifId)
      : this._sonrakiEldeki(this.dealerIndex);
    const sira = [];
    for (let adim = 0; adim < this.oyuncular.length; adim++) {
      const p = this.oyuncular[(baslangic + adim) % this.oyuncular.length];
      if (p.eldeMi && !p.dusuk) sira.push(p);
    }

    // En az bir oyuncu all-in ise (ya da board kendiliğinden açıldıysa) kimse muck etmez.
    const herkesAcar = this._otomatik || sira.some((p) => p.allIn);
    const enIyiAcilan = new Map(); // potIndex → deger
    const acilanlar = [];
    for (const p of sira) {
      const deger = degerlendir([...p.kartlar, ...this.board]);
      const potIndeksleri = potlar.map((pot, i) => (pot.hakSahipleri.includes(p.id) ? i : -1)).filter((i) => i >= 0);
      const acar = herkesAcar || potIndeksleri.some((i) => !enIyiAcilan.has(i) || karsilastir(deger, enIyiAcilan.get(i)) >= 0);
      if (!acar) continue;
      for (const i of potIndeksleri) {
        if (!enIyiAcilan.has(i) || karsilastir(deger, enIyiAcilan.get(i)) > 0) enIyiAcilan.set(i, deger);
      }
      p.acikKartlar = [...p.kartlar];
      acilanlar.push({ oyuncuId: p.id, kartlar: [...p.kartlar], deger });
    }
    this._olay({ tur: 'showdown', acilanlar });
    this._eliBitir();
  }

  _eliBitir() {
    this._karsilanmayaniIadeEt();
    const elde = this.oyuncular.filter((p) => p.eldeMi);
    const canlilar = this._canlilar();

    if (this.elSonuKartlariAc) {
      for (const p of elde) p.acikKartlar = [...p.kartlar];
      this._olay({ tur: 'kartlarAcildi', eller: elde.map((p) => ({ oyuncuId: p.id, kartlar: [...p.kartlar] })) });
    }

    // Değerler yalnız showdown'a gidildiyse hesaplanır (fold ile bitende board eksik olabilir).
    const degerler = new Map();
    if (canlilar.length > 1) {
      for (const p of canlilar) degerler.set(p.id, degerlendir([...p.kartlar, ...this.board]));
    }
    const kazananBul = (hakSahipleri) => {
      if (hakSahipleri.length <= 1 || degerler.size === 0) return hakSahipleri;
      let enIyi = null, sonuc = [];
      for (const id of hakSahipleri) {
        const d = degerler.get(id);
        const k = enIyi ? karsilastir(d, enIyi) : 1;
        if (k > 0) { enIyi = d; sonuc = [id]; }
        else if (k === 0) sonuc.push(id);
      }
      return sonuc;
    };
    const dealerSonrasi = this._dealerSonrasiIndeksler().map((i) => this.oyuncular[i].id);

    this._potlar().forEach((pot, potIndex) => {
      const dagilim = potuDagit([pot], kazananBul, dealerSonrasi);
      const kazananlar = Object.keys(dagilim);
      for (const id of kazananlar) this.oyuncular[this._index(id)].cip += dagilim[id];
      this._olay({
        tur: 'potKazanildi', potIndex, miktar: pot.miktar, kazananlar,
        deger: degerler.get(kazananlar[0]) ?? null,
      });
    });

    for (const p of this.oyuncular) {
      p.bahis = 0;
      p.toplamBahis = 0;
    }
    this._elAktif = false;
    this._siradakiIndex = -1;
    this.mevcutBahis = 0;
    this.sokak = 'bitti';

    const cipler = {};
    for (const p of this.oyuncular) cipler[p.id] = p.cip;
    this._olay({ tur: 'elBitti', cipler });

    for (const p of elde) {
      if (p.cip === 0) {
        p.oturuyor = false;
        this._olay({ tur: 'oyuncuElendi', oyuncuId: p.id });
      }
    }
    if (this.oyunBittiMi()) {
      const kalan = this.oyuncular.find((p) => p.cip > 0);
      this._olay({ tur: 'oyunBitti', kazananId: kalan ? kalan.id : null });
    }
  }
}
