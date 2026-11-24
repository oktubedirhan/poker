// Seviye 7 — Kart sayma 2: Sayma Antrenmanı
export default {
  id: 7,
  baslik: 'Kart Sayma 2: Sayma Antrenmanı',
  ozet: 'Görülen kartları takip et, kalan destenin bileşimini bil. Sayma antrenmanı: dikkat ve olasılık kası çalışır.',
  kazanim: [
    'Görülen kartları takip edip bilinmeyen kartları çıkarırsın.',
    'Kalan destede bir rengin ya da değerin olasılığını hesaplarsın.',
    'Kart saymanın pokerde nerede işe yaradığını, nerede yaramadığını bilirsin.',
  ],
  dersler: [
    {
      baslik: 'Dürüst bir uyarı',
      metin:
        'Gerçek pokerde (kasinoda ya da online) deste **her elde yeniden karılır**. Yani bir önceki elden kalan kartları saymanın hiçbir faydası yoktur; bu blackjack\'ten farklıdır.\n\n' +
        'Bu uygulamada **Sayma Antrenmanı** modu özel olarak, eller arasında desteyi karmaz. Böylece görülen kartları gerçekten takip etmeyi çalışabilirsin. Bu, gerçek oyunda doğrudan para kazandırmaz.\n\n' +
        'Peki neden çalışıyoruz? Çünkü **el içi sayma** ve dikkat, gerçek pokerde işe yarar. Bir elin içinde hangi kartların açıldığını ve kaç out\'un kaldığını sayabilmek, her kararını iyileştirir.',
    },
    {
      baslik: 'Bilinmeyen kartları takip et',
      metin:
        'Destede 52 kart var. Gördüğün her kart (kendi 2 kartın, masa ve açılan eller) bilinmeyen kartlardan düşer.\n\n' +
        'Örnek: elinde Kupa As ve Kupa Papaz, masada Kupa 7, Sinek 2 ve Karo 9 var. 5 kart gördün, geriye **47 bilinmeyen kart** kalır. Bunlardan kupa olanlar: 13 − 3 = **10**.\n\n' +
        'Sayma modunda her elin sonunda tüm kartlar açılır. Hangi kartların oynandığını yaz, 52\'den çıkar ve kalan destenin dağılımını (renk ve değer) takip et.',
      kartlar: ['Ah', 'Kh', '7h', '2c', '9d'],
    },
    {
      baslik: '"Sonraki kart kupa olur mu?"',
      metin:
        'Bir kartın gelme olasılığı = **kalan o türden kart ÷ bilinmeyen kart**. Yukarıdaki örnekte 10 ÷ 47 ≈ **%21**.\n\n' +
        'Resimli kart (Vale, Kız, Papaz) için: 12 resimli kart var; 2 tanesini gördüysen 10 ÷ 50 = %20. Belli bir değer (As gibi) için de aynı: destede kalan As sayısı ÷ bilinmeyen kart sayısı.\n\n' +
        'Pratik hile: gördüğün her kartta payda 1 azalır, o türden kartta pay da 1 azalır. Bu hesabı hızlı yapmaya alıştıkça outs ve pot oranı hesabı da kolaylaşır.',
    },
  ],
  alistirmalar: [
    { tur: 'sonrakiKart', uret: { soru: 'renk' } },
    { tur: 'sonrakiKart', uret: { soru: 'deger' } },
    { tur: 'sonrakiKart', uret: { soru: 'resimli' } },
    { tur: 'secmeli', soru: 'Elinde Kupa As, Kupa Papaz; masada Kupa 7, Sinek 2, Karo 9. Sonraki kartın kupa olma olasılığı yaklaşık?', kartlar: ['Ah', 'Kh', '7h', '2c', '9d'], secenekler: ['%25', '%21', '%13', '%50'], dogru: 1,
      aciklama: '5 kart gördün, 47 bilinmeyen. Kupadan 3 gördün, 10 kaldı: 10 ÷ 47 ≈ %21.' },
    { tur: 'secmeli', soru: 'Sadece 2 kart gördün: Karo Papaz ve Maça Kız. Sonraki kartın resimli (V, K, Q) olma olasılığı?', kartlar: ['Kd', 'Qs'], secenekler: ['%12', '%20', '%23', '%25'], dogru: 1,
      aciklama: '12 resimli kartın 2\'sini gördün, 10 kaldı. Bilinmeyen 50 kart: 10 ÷ 50 = %20. %23 (12/52) tuzak: 2 kartı çıkarmayı unutmuşsun.' },
    { tur: 'secmeli', soru: '6 kart gördün ve bunların 3\'ü As. Sonraki kartın As olma olasılığı yaklaşık?', kartlar: ['Ah', 'As', 'Ad', '5c', '8d', 'Kc'], secenekler: ['%2', '%8', '%10', '%25'], dogru: 0,
      aciklama: '4 Asın 3\'ünü gördün, 1 As kaldı. Bilinmeyen 46 kart: 1 ÷ 46 ≈ %2.' },
    { tur: 'secmeli', soru: 'Gerçek bir pokerde, bir önceki elde açılan kartları saymak sonraki ele ne kadar yardım eder?', secenekler: ['Çok yardım eder', 'Hiç yardım etmez, deste her el karılır', 'Sadece turnuvada eder', 'Sadece BTN\'de eder'], dogru: 1,
      aciklama: 'Deste her el karılır, dolayısıyla eller arası sayma işe yaramaz. İşe yarayan: el içi sayma.' },
    { tur: 'secmeli', soru: 'Sayma Antrenmanı modu en çok hangi beceriyi geliştirir?', secenekler: ['Blöf yapmayı', 'Dikkati ve el içi sayma hızını', 'Rakip tahminini', 'Şansı'], dogru: 1,
      aciklama: 'Görülen kartları takip etmek ve kalanı hesaplamak dikkat ve hızı çalıştırır, el içi out hesabına da yarar.' },
  ],
  gorev: {
    tur: 'masa', botlar: ['pasifAcemi', 'gevsekAgresif'], baslangicCip: 1000, kucukBlind: 10, buyukBlind: 20,
    desteModu: 'ayakkabi', elSayisi: 10, elSonuKartlariAc: true,
    hedef: { tur: 'dogruKarar', miktar: 6 },
    yildiz: [6, 8, 10],
    araSorular: { her: 2, tur: 'sonrakiKart' },
  },
  ozellikler: { koc: 'istege', saymaPaneli: true, outIpucu: true },
};
