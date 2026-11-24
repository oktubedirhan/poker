// Seviye 6 — Olasılık
export default {
  id: 6,
  baslik: 'Olasılık',
  ozet: 'Out sayını olasılığa çevir, pot oranıyla karşılaştır ve call mı fold mu kararını matematikle ver.',
  kazanim: [
    '2-4 kuralıyla out\'lardan yaklaşık olasılığı hesaplarsın.',
    'Pot oranını ve gereken equity\'yi hesaplarsın.',
    'Call ya da fold kararını bu iki sayıyı karşılaştırarak verirsin.',
  ],
  dersler: [
    {
      baslik: '2-4 kuralı',
      metin:
        'Out sayını olasılığa çevirmenin hızlı yolu: **flop\'tayken** (2 kart daha gelecek) out × **4**, **turn\'dayken** (1 kart kaldı) out × **2**. Sonuç yaklaşık yüzdedir.\n\n' +
        'Örnek: 9 out (floş çekişi). Flop\'ta 9 × 4 = **%36**, turn\'de 9 × 2 = **%18**. Gerçek değerler %35 ve %19,6\'dır. Kural kabaca doğru, masada kafadan hesaplamak için yeterli.\n\n' +
        'Büyük out sayılarında (12+) kural biraz abartır, ama başlangıç için yine işe yarar.',
      el: { kartlar: ['Ah', 'Kh'], board: ['Qh', '7h', '2c'] },
    },
    {
      baslik: 'Pot oranı',
      metin:
        'Rakip bahis açtı. Call etmek için ne kadar koyman gerek, karşılığında ne kazanırsın? Bu orana **pot oranı** (pot odds) denir.\n\n' +
        'Örnek: pot (rakibin bahsi dahil) 100, call etmen gereken 25. Toplam potun 125 olur; sen 25 koyarak 125\'i kazanma şansı alıyorsun. Pota göre 100\'e 25, yani "4\'e 1" oran.\n\n' +
        'Yüzde olarak: **gereken equity = call ÷ (pot + call)**. Burada 25 ÷ 125 = **%20**. Yani elinin kazanma şansı %20\'den büyükse call kâr beklentilidir.',
    },
    {
      baslik: 'Karar: call ya da fold',
      metin:
        'Kural basit: **out\'lardan hesapladığın olasılık, gereken equity\'den büyükse call; küçükse fold.**\n\n' +
        'Örnek: flop, 9 out → ~%36. Pot oranı sana %20 gerektiriyor: %36 > %20, call. Aynı elle turn\'dayken call %25 gerektiriyorsa: 9 × 2 = %18 < %25, fold.\n\n' +
        'Bu hesap sadece out\'lardan gelen şansı sayar; işin kolaylığı bu. Gerçek hayatta bazen "implied odds" (call ettikten sonra kazanabileceğin ekstra para) da hesaba girer, ama başlangıçta yukarıdaki kuralı kullan.',
    },
  ],
  alistirmalar: [
    { tur: 'potOrani', pot: 100, call: 25, outs: 9, kalanSokak: 2, dogru: 'call',
      aciklama: 'Gereken equity 25 ÷ 125 = %20. Flop\'ta 9 out ≈ %36 (2-4 kuralı). %36 > %20, call.' },
    { tur: 'potOrani', pot: 60, call: 40, outs: 4, kalanSokak: 2, dogru: 'fold',
      aciklama: 'Gereken equity 40 ÷ 100 = %40. 4 out ≈ %16. Çok düşük, fold.' },
    { tur: 'potOrani', pot: 150, call: 50, outs: 8, kalanSokak: 1, dogru: 'fold',
      aciklama: 'Gereken equity 50 ÷ 200 = %25. Turn\'de 8 out ≈ %16 (8 × 2). %16 < %25, fold.' },
    { tur: 'potOrani', pot: 300, call: 50, outs: 8, kalanSokak: 1, dogru: 'call',
      aciklama: 'Gereken equity 50 ÷ 350 ≈ %14. Turn\'de 8 out ≈ %16-17. Biraz büyük, call.' },
    { tur: 'potOrani', pot: 80, call: 20, outs: 4, kalanSokak: 2, dogru: 'fold',
      aciklama: 'Gereken equity 20 ÷ 100 = %20. 4 out ≈ %16 (4 × 4). Yetmiyor, fold.' },
    { tur: 'potOrani', pot: 120, call: 60, outs: 15, kalanSokak: 2, dogru: 'call',
      aciklama: 'Gereken equity 60 ÷ 180 ≈ %33. 15 out (floş + sıralı çekişi birlikte) ≈ %54. Rahat call.' },
    { tur: 'potOrani', pot: 50, call: 50, outs: 12, kalanSokak: 2, dogru: 'fold',
      aciklama: 'Gereken equity 50 ÷ 100 = %50. 12 out ≈ %45. Küçük ama yetersiz, fold.' },
    { tur: 'potOrani', pot: 180, call: 60, outs: 8, kalanSokak: 2, dogru: 'call',
      aciklama: 'Gereken equity 60 ÷ 240 = %25. Flop\'ta 8 out ≈ %31. %31 > %25, call.' },
    { tur: 'secmeli', soru: 'Pot 100, sen 25 call edeceksin. Gereken equity yaklaşık kaçtır?', secenekler: ['%10', '%20', '%25', '%50'], dogru: 1,
      aciklama: '25 ÷ (100 + 25) = %20.' },
    { tur: 'secmeli', soru: 'Flop\'tasın ve 9 out\'un var. 2-4 kuralıyla kazanma şansın yaklaşık kaçtır?', secenekler: ['%18', '%27', '%36', '%50'], dogru: 2,
      aciklama: 'Flop\'ta iki kart daha gelecek, bu yüzden 9 × 4 = %36.' },
    { tur: 'secmeli', soru: 'Turn\'dasın ve 8 out\'un var. 2-4 kuralıyla şansın yaklaşık kaçtır?', secenekler: ['%8', '%16', '%32', '%48'], dogru: 1,
      aciklama: 'Turn\'de tek kart kaldı: 8 × 2 = %16.' },
  ],
  gorev: {
    tur: 'masa', botlar: ['pasifAcemi', 'sikiPasif'], baslangicCip: 1000, kucukBlind: 10, buyukBlind: 20,
    desteModu: 'elBasi', elSayisi: 12,
    hedef: { tur: 'dogruKarar', miktar: 6 },
    yildiz: [6, 9, 12],
  },
  ozellikler: { koc: 'acik', saymaPaneli: true, outIpucu: true },
};
