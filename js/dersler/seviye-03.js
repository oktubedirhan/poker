// Seviye 3 — Bahis eylemleri
export default {
  id: 3,
  baslik: 'Bahis Eylemleri',
  ozet: 'Sıran geldiğinde yapabileceğin altı hamle: check, bet, call, raise, fold ve all-in.',
  kazanim: [
    'Altı bahis eylemini ve ne zaman yapılabildiklerini bilirsin.',
    'Sıranın saat yönünde ilerlediğini bilirsin.',
    'En az raise miktarını hesaplayabilirsin.',
  ],
  dersler: [
    {
      baslik: 'Bahis yoksa: check ve bet',
      metin:
        'Sıranda henüz kimse bahis yapmadıysa iki seçeneğin var. **Check**: pas geç, para koymadan elini sürdür. **Bet**: ilk bahsi sen aç, pota fiş koy.\n\n' +
        'Check bedavadır, ama bahis yoksa ancak o zaman yapılabilir. Önünde bahis varken check yapamazsın.\n\n' +
        'Preflop\'ta büyük blind zaten bir bahis sayıldığı için "bet" yerine "raise" denir.',
    },
    {
      baslik: 'Önünde bahis varsa: call, raise, fold',
      metin:
        'Rakip bahis açtıysa üç seçeneğin var. **Call**: aynı miktarı koyup devam et. **Raise**: bahsi büyüt, rakibin ya da diğerleri yeniden karar versin. **Fold**: elini at, bu eli bırak.\n\n' +
        'Fold ettiğinde o ana kadar koyduğun fişler pot\'ta kalır, geri alınmaz. Ama o elde daha fazla para kaybetmezsin.\n\n' +
        'Raise edersen oyun "ne kadara çıkardığını" söyler: **raise to 100**, "toplamda 100 koyuyorum" demektir.',
    },
    {
      baslik: 'En az raise',
      metin:
        'Raise keyfi küçük olamaz: **en az, son bahis ya da raise artışı kadar** artırmalısın. Preflop\'ta bu artış en az büyük blind kadardır.\n\n' +
        'Örnek: blind\'ler 10/20. Rakip 60\'a raise etti (artış 40). Senin en az raise\'in 60 + 40 = **100\'e** olur.\n\n' +
        'Çok küçük bir "raise" ile kimseyi zorlamak mümkün olmasın diye bu kural var.',
    },
    {
      baslik: 'All-in ve sıra',
      metin:
        '**All-in**: elindeki bütün fişleri ortaya sürmek. Fişin bahisten azsa bile all-in ile oyunda kalabilirsin; sadece koyduğun kadarını kazanabilirsin.\n\n' +
        'Sıra **saat yönünde** ilerler. Preflop\'ta büyük blind\'in solundan başlanır. Flop, turn ve river\'da ise dealer\'ın solundaki ilk oyuncu konuşur; dealer en son konuşur. Heads-up\'ta (2 kişi) dealer preflop\'ta ilk, sonra hep son konuşur.\n\n' +
        'Bir tur, herkes ya fold ettiğinde ya da bahisleri eşitlediğinde biter.',
    },
  ],
  alistirmalar: [
    { tur: 'secmeli', soru: 'Önünde kimse bahis yapmadı. Para koymadan sırayı geçmek için ne yaparsın?', secenekler: ['Fold', 'Check', 'Call', 'Raise'], dogru: 1,
      aciklama: 'Bahis yokken check ile bedavaya devam edersin.' },
    { tur: 'secmeli', soru: 'Rakip 50 koydu. Sen de 50 koyup elini sürdürüyorsun. Bu eylemin adı nedir?', secenekler: ['Check', 'Raise', 'Call', 'All-in'], dogru: 2,
      aciklama: 'Aynı miktarı koyup devam etmek call\'dır.' },
    { tur: 'secmeli', soru: 'Rakip 50 bet yaptı, sen toplamda 150\'ye çıkardın. Bu eylem nedir?', secenekler: ['Call', 'Raise', 'Bet', 'Check'], dogru: 1,
      aciklama: 'Var olan bahsi büyütmek raise\'dir.' },
    { tur: 'secmeli', soru: 'Blind\'ler 10/20. Rakip 60\'a raise etti (artış 40). Senin en az raise\'in kaça olur?', secenekler: ['80', '100', '120', '60'], dogru: 1,
      aciklama: 'En az raise, son artış kadardır: 60 + 40 = 100.' },
    { tur: 'secmeli', soru: 'Fold ettiğinde bu ele koyduğun fişlere ne olur?', secenekler: ['Geri alırsın', 'Pot\'ta kalır', 'Rakip yarısını alır', 'Sonraki ele yazılır'], dogru: 1,
      aciklama: 'Fold edince koyduğun fişler potta kalır, kazanana gider. Daha fazlasını kaybetmezsin.' },
    { tur: 'secmeli', soru: 'Önünde 40\'lık bahis varken check yapabilir misin?', secenekler: ['Evet, her zaman', 'Hayır, call/raise/fold dersin', 'Sadece dealer ise', 'Sadece flop\'ta'], dogru: 1,
      aciklama: 'Bahis varsa check geçmez. Ya call, ya raise, ya fold.' },
    { tur: 'secmeli', soru: 'Heads-up\'ta (2 kişi) flop\'tan sonra kim son konuşur?', secenekler: ['Büyük blind', 'Dealer', 'En çok fişi olan', 'Rastgele'], dogru: 1,
      aciklama: 'Heads-up\'ta dealer preflop ilk, sonraki turlarda hep son konuşur. Son konuşmak avantajdır.' },
  ],
  gorev: {
    tur: 'masa', botlar: ['pasifAcemi'], baslangicCip: 1000, kucukBlind: 10, buyukBlind: 20,
    desteModu: 'elBasi', elSayisi: 12,
    hedef: { tur: 'cipKazan', miktar: 100 },
    yildiz: [100, 250, 500],
  },
  ozellikler: { koc: 'acik', saymaPaneli: false, outIpucu: false },
};
