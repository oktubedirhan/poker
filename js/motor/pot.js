// Ana pot ve yan potlar.

// oyuncular: [{ id, toplamBahis, dusuk }] → [{ miktar, hakSahipleri }]
// Potlar, elde kalan (fold etmemiş) oyuncuların farklı toplam bahis seviyelerinde dilimlenir.
// Fold edenin parası pota girer ama hak sahibi olamaz.
export function potlariHesapla(oyuncular) {
  const canlilar = oyuncular.filter((o) => !o.dusuk && o.toplamBahis > 0);
  const seviyeler = [...new Set(canlilar.map((o) => o.toplamBahis))].sort((a, b) => a - b);

  const potlar = [];
  let oncekiSeviye = 0;
  for (const seviye of seviyeler) {
    let miktar = 0;
    for (const o of oyuncular) {
      miktar += Math.max(0, Math.min(o.toplamBahis, seviye) - oncekiSeviye);
    }
    const hakSahipleri = canlilar.filter((o) => o.toplamBahis >= seviye).map((o) => o.id);
    if (miktar > 0) potlar.push({ miktar, hakSahipleri });
    oncekiSeviye = seviye;
  }

  // Fold edenin, kalanların en yüksek seviyesini aşan katkısı (olağan dışı) son pota eklenir.
  let artan = 0;
  for (const o of oyuncular) artan += Math.max(0, o.toplamBahis - oncekiSeviye);
  if (artan > 0) {
    if (potlar.length) potlar[potlar.length - 1].miktar += artan;
    else potlar.push({ miktar: artan, hakSahipleri: [] });
  }
  return potlar;
}

// kazananBul(hakSahipleri) → kazanan id[]
// dealerSonrasiSira: dealer'ın solundan başlayan oyuncu id sırası.
// Eşit bölünemeyen fişler, dealer'ın solundan ilk kazanana verilir.
// → { [id]: kazanılanMiktar }
export function potuDagit(potlar, kazananBul, dealerSonrasiSira) {
  const sonuc = {};
  const sira = (id) => {
    const i = dealerSonrasiSira.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  for (const pot of potlar) {
    if (pot.miktar <= 0) continue;
    const kazanan = [...kazananBul(pot.hakSahipleri)].sort((a, b) => sira(a) - sira(b));
    if (kazanan.length === 0) throw new Error('Pot için kazanan yok');
    const pay = Math.floor(pot.miktar / kazanan.length);
    const artanFis = pot.miktar - pay * kazanan.length;
    kazanan.forEach((id, i) => {
      sonuc[id] = (sonuc[id] || 0) + pay + (i === 0 ? artanFis : 0);
    });
  }
  return sonuc;
}
