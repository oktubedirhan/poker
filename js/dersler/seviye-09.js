// Seviye 9 — Blöf ve rakip okuma
export default {
  id: 9,
  baslik: 'Blöf ve Rakip Okuma',
  ozet: 'Blöf nedir, ne zaman işe yarar? Ve rakibin kim olduğunu anlamak elinden daha çok kazandırır.',
  kazanim: [
    'Blöf ve yarı blöf (semi-bluff) arasındaki farkı bilirsin.',
    'Blöfün işe yaraması için gereken fold oranını hesaplarsın.',
    'Beş farklı rakip tipini tanır ve her birine karşı nasıl oynayacağını bilirsin.',
  ],
  dersler: [
    {
      baslik: 'Blöf nedir?',
      metin:
        '**Blöf** (bluff): zayıf elle güçlü bir el varmış gibi bahis yapıp rakibi fold ettirmektir. Eline değil, rakibin tepkisine oynarsın.\n\n' +
        '**Yarı blöf** (semi-bluff): şu an zayıf bir elin var ama güçlenme şansın yüksek (floş ya da sıralı çekişi gibi). Bet edersen iki yoldan kazanabilirsin: rakip fold eder ya da kart gelir. Blöfün en az riskli hali budur.\n\n' +
        'Blöfün tutması için rakibin fold edebilecek bir eli olmalı ve senin hikayen tutarlı görünmeli. Preflop\'ta pasif oynayıp river\'da dev bahis açmak inandırıcı değildir.',
    },
    {
      baslik: 'Blöf ne kadar fold gerektirir?',
      metin:
        'Pot 100, sen 50 bahis açtın. Rakip fold ederse 100 kazanırsın, call ederse 50 kaybedersin. Blöfün kâr getirmesi için rakibin en az **bahis ÷ (pot + bahis)** oranında fold etmesi gerekir: 50 ÷ 150 = **%33**.\n\n' +
        'Yani her üç rakipten birinden fazlası fold ediyorsa bu blöf kârlıdır. Küçük bahis küçük fold oranı yeter; ama rakip "hiç fold etmez" tipse hesap geçersiz.\n\n' +
        'Bu yüzden blöf yapmadan önce rakibin kim olduğunu bilmek gerekir.',
    },
    {
      baslik: 'Rakip tipleri: pasif taraf',
      metin:
        '**pasifAcemi** (çağrı istasyonu, "calling station"): çok el oynar, çok call eder, nadiren raise eder. Raise ederse çok güçlüdür. Ona **blöf yapma**, güçlü ellerde bahis aç, çünkü call eder.\n\n' +
        '**sikiPasif** ("nit", kaya): çok az el oynar, genellikle sadece check/call yapar. Bahis açtıysa ya da raise ettiyse ciddidir. Zayıf elinle onunla çekişme, fold. Blind\'lerini çalmak ise kolaydır.',
      kartlar: ['Ah', 'Kd'],
    },
    {
      baslik: 'Rakip tipleri: agresif taraf',
      metin:
        '**gevsekAgresif** (LAG): çok el oynar ve sık raise eder. Geniş aralıktan oynadığı için her bahsi güçlü sanma; orta güçte elinle call edebilirsin. Sabırlı ol, güçlü elin gelince cezalandır.\n\n' +
        '**blofcu**: sık sık, büyük bahislerle blöf yapar. Ona karşı korkma: orta güçte bir el ile (örn. top pair) call etmek çoğu zaman kârlıdır. Onu blöf yaparken yakala.\n\n' +
        '**akilli**: matematiği kullanır, dengeli oynar, pot oranını ve olasılığı bilir. Bariz bir zayıflığı yoktur; ona karşı en iyi yol kendi matematiğini doğru yapmak. Blöfü ona karşı çok seyrek kullan.',
    },
  ],
  alistirmalar: [
    { tur: 'secmeli', soru: 'Sıkı-pasif (sikiPasif) bir rakip flop\'ta bahis açtı, sonra turn\'de de raise etti. Elinde orta güçte bir çift var. Ne yaparsın?', secenekler: ['Call', 'Fold, o muhtemelen çok güçlü', 'Blöf raise', 'All-in'], dogru: 1,
      aciklama: 'sikiPasif botlar çok az bahis açar ve açtıklarında genelde gerçekten güçlüdür. Orta çift yetmez.' },
    { tur: 'secmeli', soru: 'pasifAcemi (çağrı istasyonu) bir rakibe karşı en iyi strateji hangisidir?', secenekler: ['Sürekli blöf yapmak', 'Güçlü ellerde bahis açıp değer almak', 'Hiç bahis açmamak', 'Her elde fold etmek'], dogru: 1,
      aciklama: 'Fold etmeyen rakibe blöf yapmak boşa gider. Ama güçlü elinle bahis açarsan call edip sana para öder.' },
    { tur: 'secmeli', soru: 'Blöfçü (blofcu) bot river\'da pot büyüklüğünde bahis açtı. Elinde top pair (en yüksek çift) var. Ne yapmalı?', secenekler: ['Her zaman fold', 'Call etmek mantıklı olabilir', 'Her zaman raise', 'Hiç karar vermek gerekmez'], dogru: 1,
      aciklama: 'Blöfçü sık blöf yaptığı için elin onu yeniyor olabilir. Pot oranı da uygunsa call kârlıdır.' },
    { tur: 'secmeli', soru: 'Pot 100, 50 bahis açıyorsun. Blöfün kâr getirmesi için rakibin en az yüzde kaçta fold etmesi gerekir?', secenekler: ['%20', '%33', '%50', '%66'], dogru: 1,
      aciklama: 'bahis ÷ (pot + bahis) = 50 ÷ 150 ≈ %33.' },
    { tur: 'secmeli', soru: 'Elinde floş çekişi var ve bahis açıyorsun. Buna ne denir?', secenekler: ['Saf blöf', 'Yarı blöf (semi-bluff)', 'Slowplay', 'Limp'], dogru: 1,
      aciklama: 'Şu an en iyi el sende değil ama güçlenme şansın yüksek. Rakip fold ederse kazanırsın, call ederse kart gelirse kazanırsın.' },
    { tur: 'secmeli', soru: 'gevsekAgresif (LAG) bir bot sık sık raise ediyor. Bu neden her raise\'in güçlü olduğu anlamına gelmez?', secenekler: ['Her zaman blöf yaptığı için', 'Çok geniş aralıktan oynadığı için', 'Hep elini gösterdiği için', 'Sadece fold ettiği için'], dogru: 1,
      aciklama: 'LAG çok el oynar. Bu yüzden orta güçte ellerle call etmek ona karşı kârlıdır.' },
    { tur: 'secmeli', soru: 'Preflop\'ta hep pasif oynadın, river\'da aniden dev bir bahis açtın. Bu blöf neden inandırıcı değildir?', secenekler: ['Hikaye tutarsız olduğu için', 'Fiş az olduğu için', 'Pozisyon kötü olduğu için', 'Gayet inandırıcı'], dogru: 0,
      aciklama: 'İyi blöf, önceki bahislerinle uyumlu bir hikaye anlatır. Tutarsız hikaye call yedirir.' },
    { tur: 'secmeli', soru: 'akilli (matematikçi) bota karşı hangi yaklaşım en mantıklıdır?', secenekler: ['Onun zayıf noktasını sömürmek', 'Kendi matematiğini ve pozisyonunu doğru kullanmak', 'Hep blöf yapmak', 'Hiç oynamamak'], dogru: 1,
      aciklama: 'Belirgin bir zayıflığı yok; en iyi yol hatasız oynayıp pot oranı ve pozisyonla kazanmaktır.' },
  ],
  gorev: {
    tur: 'masa', botlar: ['pasifAcemi', 'sikiPasif', 'gevsekAgresif', 'blofcu'], baslangicCip: 1500, kucukBlind: 10, buyukBlind: 20,
    desteModu: 'elBasi', elSayisi: 20,
    hedef: { tur: 'cipKazan', miktar: 200 },
    yildiz: [200, 500, 900],
  },
  ozellikler: { koc: 'istege', saymaPaneli: true, outIpucu: true },
};
