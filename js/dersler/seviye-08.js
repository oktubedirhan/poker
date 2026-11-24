// Seviye 8 — Pozisyon ve agresyon
export default {
  id: 8,
  baslik: 'Pozisyon ve Agresyon',
  ozet: 'Nerede oturduğun ve nasıl bahis yaptığın, elinin kendisi kadar önemlidir.',
  kazanim: [
    'Pozisyonun neden güç olduğunu açıklarsın.',
    'Agresif oynamanın pasif oynamaya üstünlüğünü bilirsin.',
    'Continuation bet ve blind çalma (steal) kavramlarını tanırsın.',
  ],
  dersler: [
    {
      baslik: 'Pozisyon bir silahtır',
      metin:
        'Son konuşan oyuncu, rakiplerin ne yaptığını görüp karar verir. Bu yüzden düğmedeki (**BTN**) oyuncu en güçlü yerdedir; **UTG** (ilk konuşan) en zayıf yerdedir.\n\n' +
        'Pozisyonda olduğunda: rakip check ederse ucuz bir kart görebilirsin, bahis açarsa karar verirken daha çok bilgin vardır. Pozisyonsuzken ise körlemesine karar verirsin.\n\n' +
        'Aynı el, farklı pozisyonda farklı oynanır. BTN\'de oynayabileceğin bir elle UTG\'de elini atmak normaldir.',
    },
    {
      baslik: 'Agresif oyun',
      metin:
        'Pot kazanmanın iki yolu var: **en iyi eli yapmak** ya da **rakibi fold ettirmek**. Pasif oyuncu (sadece check ve call yapan) sadece ilk yolu kullanır. Agresif oyuncu (bet ve raise yapan) ikisini de kullanır.\n\n' +
        'Preflop\'ta sadece büyük blind\'i call etmek (**limp**) genelde zayıf bir harekettir; elin oynanacak kadar iyiyse raise et, değilse fold. Böylece pot büyür ve rakipler azalır.\n\n' +
        'Agresif olmak her elde bet yapmak demek değildir. Güçlü ellerde ya da iyi çekişlerde agresif ol, çöp ellerde sabırlı.',
    },
    {
      baslik: 'C-bet ve blind çalma',
      metin:
        'Preflop\'ta raise eden oyuncu flop\'ta genelde bahis açar. Buna **continuation bet** (c-bet) denir: "Preflop\'ta güçlü olduğumu söyledim, hikayeme devam ediyorum." Çoğu zaman rakip flop\'u tutturamamıştır ve fold eder.\n\n' +
        '**Steal** (blind çalma): düğmeden ya da cutoff\'tan raise edip küçük ve büyük blind\'i almaya çalışmak. Geç pozisyonda herkes fold ederse hemen blind\'leri toplarsın.\n\n' +
        'Ama dikkat: tüm botlar aynı değil. Birinin "hiç fold etmez" gibi bir tipi varsa onu çalmaya çalışma. Seviye 9\'da bunları ayıracağız.',
    },
  ],
  alistirmalar: [
    { tur: 'secmeli', soru: 'Pokerde en iyi pozisyon hangisidir?', secenekler: ['UTG', 'Büyük blind', 'BTN (dealer)', 'Küçük blind'], dogru: 2,
      aciklama: 'BTN flop\'tan sonra en son konuşur; her zaman bilgi avantajı vardır.' },
    { tur: 'secmeli', soru: 'Preflop\'ta ilk konuşan pozisyonun adı nedir?', secenekler: ['BTN', 'UTG', 'CO', 'SB'], dogru: 1,
      aciklama: 'UTG (under the gun), büyük blind\'in solundaki oyuncudur ve en kötü pozisyondur.' },
    { tur: 'secmeli', soru: 'Pozisyonda olmanın en büyük faydası nedir?', secenekler: ['Daha çok fişim olur', 'Rakibin hamlesini görüp karar veririm', 'Kartlarım daha iyi gelir', 'Blind ödemem'], dogru: 1,
      aciklama: 'Son konuştuğun için rakibin check ya da bet\'ini görüp karar verirsin.' },
    { tur: 'secmeli', soru: 'İyi bir eli olan ve oynayacağın bir elde, preflop\'ta büyük blind\'i sadece call etmek (limp) yerine ne yapmak genelde daha iyidir?', secenekler: ['Fold', 'Raise', 'Check', 'Her zaman all-in'], dogru: 1,
      aciklama: 'Raise potu büyütür, zayıf elleri eler ve inisiyatifi sana verir.' },
    { tur: 'secmeli', soru: 'Preflop\'ta raise ettin, flop geldi ve herkes check etti. Flop\'ta bahis açmaya ne denir?', secenekler: ['Limp', 'Continuation bet (c-bet)', 'Steal', 'Check-raise'], dogru: 1,
      aciklama: 'Preflop agresörünün flop\'ta bahis açmasına c-bet denir.' },
    { tur: 'secmeli', soru: 'BTN\'desin, herkes fold etti, küçük ve büyük blind kaldı. Raise yapıp blind\'leri almaya çalışmak ne denir?', secenekler: ['Steal', 'Limp', 'Bluff catch', 'Slowplay'], dogru: 0,
      aciklama: 'Geç pozisyondan blind\'leri çalmaya steal denir.' },
    { tur: 'secmeli', soru: 'Pasif (sadece check ve call yapan) oyuncunun agresif oyuncuya göre dezavantajı nedir?', secenekler: ['Pot\'u sadece en iyi elle kazanabilir', 'Daha çok fişi olur', 'Daha az fold eder', 'Dezavantajı yok'], dogru: 0,
      aciklama: 'Pasif oyuncu rakibini fold ettirme gücünü kullanmaz; sadece showdown\'da en iyi elle kazanabilir.' },
    { tur: 'oynaAt', el: ['8s', '7s'], pozisyon: 'BTN', dogru: 'oyna',
      aciklama: 'Suited connector, düğmede. Pozisyon avantajıyla rahatça oynanır.' },
    { tur: 'oynaAt', el: ['9h', '8h'], pozisyon: 'UTG', dogru: 'at',
      aciklama: 'Aynı el UTG\'de erken pozisyon, arkanda çok oyuncu var. Fold.' },
    { tur: 'oynaAt', el: ['Ad', 'Jd'], pozisyon: 'CO', dogru: 'oyna',
      aciklama: 'Suited As-Vale cutoff\'ta rahatça oynanır.' },
    { tur: 'oynaAt', el: ['Qc', '2d'], pozisyon: 'BTN', dogru: 'at',
      aciklama: 'Q-2 offsuit, düğmede bile çok zayıf: 2 kicker\'ı ile büyük çift yapsan da kaybedersin.' },
  ],
  gorev: {
    tur: 'masa', botlar: ['sikiPasif', 'gevsekAgresif', 'akilli'], baslangicCip: 1500, kucukBlind: 10, buyukBlind: 20,
    desteModu: 'elBasi', elSayisi: 15,
    hedef: { tur: 'cipKazan', miktar: 300 },
    yildiz: [300, 600, 1000],
  },
  ozellikler: { koc: 'istege', saymaPaneli: true, outIpucu: true },
};
