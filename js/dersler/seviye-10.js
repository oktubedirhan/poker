// Seviye 10 — Final turnuvası
export default {
  id: 10,
  baslik: 'Final Turnuvası',
  ozet: 'Beş rakip, artan blind\'ler, koç yok. Öğrendiğin her şeyi kullan ve son fişi alan ol.',
  kazanim: [
    'Turnuvada blind\'lerin artmasına göre stratejini ayarlarsın.',
    'Kısa yığınla (short stack) ne zaman all-in yapacağını bilirsin.',
    'Öğrendiklerini tek bir turnuvada birleştirirsin.',
  ],
  dersler: [
    {
      baslik: 'Turnuva nasıl işler?',
      metin:
        'Herkes aynı sayıda fişle başlar. Fişlerini kaybeden elenir; **tek kalan kazanır**. Normal masadan farkı, fişi geri alamayışındır.\n\n' +
        'Zamanla **blind\'ler artar**. Bu uygulamada her birkaç elde blind\'ler büyür; bu yüzden beklemek zamanla pahalıya mal olur. Blind\'ler seni eritmeden önce harekete geç.\n\n' +
        'Bu final seviyesinde koç kapalı: kararları artık sen veriyorsun.',
    },
    {
      baslik: 'Yığın büyüklüğü: BB ile ölç',
      metin:
        'Fiş sayını **büyük blind (BB)** cinsinden düşün. 400 fişin ve blind\'ler 20/40 ise, 400 ÷ 40 = **10 BB**\'in var.\n\n' +
        '**20+ BB:** rahat oyna, çekişlere gir, pozisyonu kullan. **10-20 BB:** seçici ol, güçlü ellerle ya da güçlü çekişlerle agresif oyna. **10 BB altı:** "push or fold" bölgesi. Ya all-in, ya fold. Küçük raise ya da call ile oyalanma.\n\n' +
        'Blind\'ler arttıkça BB sayın düşer; bu yüzden turnuvanın sonuna doğru daha agresif olmalısın.',
    },
    {
      baslik: 'Rakip tiplerini kullan',
      metin:
        'Masada her tip var: **pasifAcemi**, **sikiPasif**, **gevsekAgresif**, **blofcu**, **akilli**. İlk elleri onları tanımak için kullan, sonra stratejini onlara göre uyarla.\n\n' +
        'Güçlü elinle çağrı istasyonundan para topla, kayayı (sikiPasif) blind\'leriyle çal, blöfçüye call et, akilli\'ye karşı hata yapma.\n\n' +
        'Son hatırlatma: sabırlı ol, pozisyonu kullan, olasılığı hesapla. İyi şanslar!',
    },
  ],
  alistirmalar: [
    { tur: 'hangisiGuclu', board: ['Ah', '8d', '8c', '3s', '2h'], elA: ['Ac', 'Kd'], elB: ['8h', 'Qd'], dogru: 'B',
      aciklama: 'A: As-As-8-8 iki çift. B: 8-8-8 üçlü. Üçlü, iki çiftten güçlüdür.' },
    { tur: 'hangisiGuclu', board: ['Qc', 'Jc', '4c', '9d', '2s'], elA: ['Kc', '7c'], elB: ['Td', '8h'], dogru: 'A',
      aciklama: 'A: 5 sinekle floş (K-Q-J-7-4). B: 8-9-10-Vale-Kız sıralı. Floş sıralıdan güçlü.' },
    { tur: 'oynaAt', el: ['Qs', 'Qd'], pozisyon: 'CO', dogru: 'oyna',
      aciklama: 'Kız-Kız premium bir çift, her pozisyonda oynanır.' },
    { tur: 'oynaAt', el: ['9c', '4d'], pozisyon: 'UTG', dogru: 'at',
      aciklama: '9-4 offsuit erken pozisyonda fold edilir.' },
    { tur: 'potOrani', pot: 160, call: 40, outs: 9, kalanSokak: 2, dogru: 'call',
      aciklama: 'Gereken equity 40 ÷ 200 = %20. Flop\'ta 9 out ≈ %36. Call.' },
    { tur: 'potOrani', pot: 100, call: 50, outs: 4, kalanSokak: 1, dogru: 'fold',
      aciklama: 'Gereken equity 50 ÷ 150 ≈ %33. Turn\'de 4 out ≈ %9. Fold.' },
    { tur: 'secmeli', soru: 'Blind\'ler 20/40, fişin 400. Kaç BB\'in var?', secenekler: ['5', '10', '20', '40'], dogru: 1,
      aciklama: '400 ÷ 40 = 10 BB. Bu "push or fold" sınırı.' },
    { tur: 'secmeli', soru: '10 BB\'den azın var ve güçlü bir elin geldi. En iyi seçenek genelde nedir?', secenekler: ['Min-raise yapıp call etmek', 'All-in (push)', 'Limp', 'Sadece check'], dogru: 1,
      aciklama: 'Kısa yığınla oyalanmak yerine all-in yapmak hem fold ettirir hem de güçlü elin değerini korur.' },
    { tur: 'secmeli', soru: 'Turnuvada blind\'ler artarken beklemek neden riskli?', secenekler: ['Blind\'ler fişlerini eritir', 'Rakipler fişini alır', 'Kartlar kötüleşir', 'Risk yok'], dogru: 0,
      aciklama: 'Her elde blind ödersin. Fiş yığının küçüldükçe oyun gücün azalır, bu yüzden bekleyemezsin.' },
  ],
  gorev: {
    tur: 'masa', botlar: ['pasifAcemi', 'sikiPasif', 'gevsekAgresif', 'blofcu', 'akilli'],
    baslangicCip: 1500, kucukBlind: 10, buyukBlind: 20,
    desteModu: 'elBasi', elSayisi: 200,
    blindArtis: { herElde: 10, carpan: 1.5 },
    hedef: { tur: 'birinciOl', miktar: 1 },
    yildiz: [3, 2, 1],
  },
  ozellikler: { koc: 'kapali', saymaPaneli: true, outIpucu: false },
};
