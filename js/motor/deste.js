// Fiziksel deste. Kartlar sabit bir dizide durur; `ust` sıradaki çekilecek kartın indeksidir.
// [0, ust) çekilenler (yakılanlar dahil), [ust, 52) destede kalanlar.
//
// Modlar:
//   'elBasi'   — her elden önce 52 kart yeniden karılır (normal oyun).
//   'ayakkabi' — eller arası çekilen kartlar desteye dönmez; kart yetmeyince karılır (sayma antrenmanı).

import { guvenliRng } from './rng.js';
import { tumKartlar, kartGecerliMi } from './kart.js';

const MODLAR = ['elBasi', 'ayakkabi'];

export class Deste {
  constructor({ mod = 'elBasi', rng = guvenliRng() } = {}) {
    if (!MODLAR.includes(mod)) throw new Error(`Geçersiz deste modu: ${mod}`);
    this.mod = mod;
    this.rng = rng;
    this.karistirmaSayisi = 0;
    this._kartlar = tumKartlar();
    this._ust = 0;
    this._yakilanlar = [];
    this._kar();
  }

  // Fisher–Yates: 52 kartın hepsi desteye döner ve karılır.
  _kar() {
    const a = this._kartlar;
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    this._ust = 0;
    this._yakilanlar = [];
    this.karistirmaSayisi++;
  }

  // Yeni el öncesi. elBasi: her zaman karar. ayakkabi: kalan kart yetmiyorsa karar.
  yeniEl(gerekenKart) {
    if (this.mod === 'elBasi' || this.kalanSayisi() < gerekenKart) {
      this._kar();
      return { karildi: true };
    }
    return { karildi: false };
  }

  // Ders için: desteyi kar, verilen kartları bu sırayla en üste koy (ilk eleman ilk çekilir).
  diz(ustKartlar) {
    const gorulen = new Set();
    for (const k of ustKartlar) {
      if (!kartGecerliMi(k)) throw new Error(`Geçersiz kart: ${k}`);
      if (gorulen.has(k)) throw new Error(`Tekrarlanan kart: ${k}`);
      gorulen.add(k);
    }
    this._kar();
    const a = this._kartlar;
    ustKartlar.forEach((k, i) => {
      const j = a.indexOf(k); // önceki konumlar zaten yerleşti, j >= i
      [a[i], a[j]] = [a[j], a[i]];
    });
  }

  cek() {
    if (this._ust >= this._kartlar.length) throw new Error('Destede kart kalmadı');
    return this._kartlar[this._ust++];
  }

  // Yakma kartı: yüzü kapalı kenara konur.
  yak() {
    const k = this.cek();
    this._yakilanlar.push(k);
    return k;
  }

  kalanSayisi() {
    return this._kartlar.length - this._ust;
  }

  // Son karıştırmadan beri çekilen tüm kartlar (yakılanlar dahil).
  cekilenler() {
    return this._kartlar.slice(0, this._ust);
  }

  yakilanlar() {
    return [...this._yakilanlar];
  }

  // Değişmez: kalan ∪ çekilen = 52 benzersiz geçerli kart.
  dogrula() {
    const tum = [...this.cekilenler(), ...this._kartlar.slice(this._ust)];
    if (tum.length !== 52) throw new Error(`Deste bozuk: ${tum.length} kart`);
    const set = new Set(tum);
    if (set.size !== 52) throw new Error('Deste bozuk: tekrarlanan kart');
    for (const k of tum) if (!kartGecerliMi(k)) throw new Error(`Deste bozuk: geçersiz kart ${k}`);
    if (this._ust < 0 || this._ust > 52) throw new Error('Deste bozuk: üst indeks');
    const cekilenSet = new Set(this.cekilenler());
    for (const k of this._yakilanlar) {
      if (!cekilenSet.has(k)) throw new Error(`Deste bozuk: yakılan ${k} çekilenlerde yok`);
    }
    return true;
  }
}
