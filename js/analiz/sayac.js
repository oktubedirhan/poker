// Kart sayacı: bir oyuncunun perspektifinden hangi kartları gördüğünü izler.
// Yalnız perspektifin gerçekten gördükleri sayılır: kendi kartları, board, showdown'da açılanlar
// ve (sayma antrenmanında) el sonu açılan eller. Başkalarının kapalı kartları ASLA sayılmaz.
//
// Modlar (Oyun'un desteModu ile aynı):
//   'elBasi'   — her el deste yeniden karılır; 'elBasladi' sayacı sıfırlar.
//   'ayakkabi' — görülen kartlar eller arası birikir; yalnız 'karildi' sıfırlar.

import { tumKartlar, kartGecerliMi, DEGERLER, RENKLER } from '../motor/kart.js';

export class Sayac {
  constructor({ perspektifId, mod = 'elBasi' } = {}) {
    if (mod !== 'elBasi' && mod !== 'ayakkabi') throw new Error(`Geçersiz sayaç modu: ${mod}`);
    this.perspektifId = perspektifId;
    this.mod = mod;
    this.destedeKalanFiziksel = 52;
    this._gorulen = new Set();
  }

  _ekle(kartlar) {
    if (!Array.isArray(kartlar)) return;
    for (const k of kartlar) if (kartGecerliMi(k)) this._gorulen.add(k);
  }

  // Oyun olaylarını besle (yeniEl/eylem dönüşleri ya da gorunum.gecmis). Aynı olayı iki kez vermek zararsızdır.
  olay(e) {
    if (!e) return;
    switch (e.tur) {
      case 'karildi':
        this._gorulen.clear();
        break;
      case 'elBasladi':
        if (this.mod === 'elBasi') this._gorulen.clear();
        break;
      case 'kartDagitildi':
        // Başkasının kartı (kartlar:null ya da ham olay) yok sayılır.
        if (e.oyuncuId === this.perspektifId) this._ekle(e.kartlar);
        break;
      case 'sokak':
        this._ekle(e.yeniKartlar ?? e.board);
        break;
      case 'showdown':
        for (const a of e.acilanlar ?? []) this._ekle(a.kartlar);
        break;
      case 'kartlarAcildi':
        for (const a of e.eller ?? []) this._ekle(a.kartlar);
        break;
      default:
        break;
    }
  }

  // Perspektifin gördüğü kartlar (deste sırasında).
  gorulen() {
    return tumKartlar().filter((k) => this._gorulen.has(k));
  }

  // 52 − görülen: destede, başkasının elinde ya da yakılmış olabilir.
  bilinmeyen() {
    return tumKartlar().filter((k) => !this._gorulen.has(k));
  }

  // Bilinmeyen kartların renk ve değer dağılımı.
  dagilim() {
    const renk = Object.fromEntries(RENKLER.map((r) => [r, 0]));
    const deger = Object.fromEntries(DEGERLER.map((d) => [d, 0]));
    for (const k of this.bilinmeyen()) {
      deger[k[0]]++;
      renk[k[1]]++;
    }
    return { renk, deger };
  }

  // filtre(kart) → bool; bilinmeyenler içindeki oran (0..1).
  olasilik(filtre) {
    const b = this.bilinmeyen();
    if (b.length === 0) return 0;
    let n = 0;
    for (const k of b) if (filtre(k)) n++;
    return n / b.length;
  }
}
