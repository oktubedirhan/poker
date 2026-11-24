// Seviye 4 — Başlangıç elleri ve pozisyon
// Görev: quiz. Gerekçe: bu seviyede öğrenilen şey "hangi eli oynamalı" kararını hızlı ve çok tekrarla
// pekiştirmek; masa oyunu şansın etkisiyle bu kararı gürültüye boğar, sorular ise doğrudan ölçer.
export default {
  id: 4,
  baslik: 'Başlangıç Elleri ve Pozisyon',
  ozet: 'Her ele girmek para kaybettirir. Hangi iki kartla, nerede oturarak oynayacağını öğren.',
  kazanim: [
    'Premium çiftleri ve güçlü başlangıç ellerini tanırsın.',
    'Suited (aynı renk) ve connector (ardışık) kavramlarını bilirsin.',
    'Pozisyona göre hangi elleri oynayacağını seçebilirsin.',
  ],
  dersler: [
    {
      baslik: 'Güçlü ve zayıf başlangıç elleri',
      metin:
        'İki kartın 169 farklı biçimde gelebilir (renk farkı sayılmadan) ve hepsi eşit değil. En güçlü eller **premium** denilen ellerdir: **As-As** (pocket aces), **Papaz-Papaz**, **Kız-Kız** ve **As-Papaz**.\n\n' +
        'Cep çifti (pocket pair, iki kart aynı değer) en baştan bir çifttir; set (üçlü) yapma şansın da vardır. Yüksek kartlar (As, Papaz, Kız, Vale) da güçlüdür çünkü çift yaptıklarında büyük çift olurlar.\n\n' +
        'Elinin yarısından çoğu fold edilmelidir. Sabırlı olmak, yeni başlayanın en kârlı alışkanlığıdır.',
      kartlar: ['As', 'Ah'],
    },
    {
      baslik: 'Suited ve connector',
      metin:
        '**Suited** (aynı renk) eller, floş yapma şansı verir. A♥ 5♥ gibi bir el suited\'dır. **Offsuit** (farklı renk) eller bu şansı taşımaz; suited her zaman biraz daha değerlidir (yaklaşık %2-3 daha fazla kazanır).\n\n' +
        '**Connector** (ardışık kartlar, mesela 8-7 ya da J-10) sıralı yapma şansı verir. Suited connector (örn. 9♠ 8♠) hem floş hem sıralı çekişi sunar ve sürpriz eller kazandırır.\n\n' +
        'Ama dikkat: suited ya da connector olmak zayıf bir eli tek başına güçlü yapmaz. 7♥ 2♥ suited olsa da çöp bir eldir.',
      kartlar: ['9s', '8s'],
    },
    {
      baslik: 'Pozisyon: sonra konuşmak avantajdır',
      metin:
        'Flop\'tan sonra dealer (**BTN**, button) en son konuşur. Rakiplerin ne yaptığını görüp karar verirsin; bu büyük avantajdır. Preflop\'ta ilk konuşan ise **UTG** (under the gun, büyük blind\'in solu), en kötü pozisyondur.\n\n' +
        'Masada sırayla: UTG, MP (orta), CO (cutoff, düğmenin sağı), BTN, SB, BB. Düğmeye yaklaştıkça pozisyon iyileşir.\n\n' +
        '**Basit kural:** erken pozisyonda (UTG) sadece çok güçlü elleri oyna. BTN\'de ise çok daha geniş eller oynayabilirsin, çünkü rakiplerin hamlesini görüyorsun.',
    },
    {
      baslik: 'Başlangıç rehberi',
      metin:
        'Bu uygulamada kullanacağın basit rehber:\n\n' +
        '**UTG:** 77 ve üstü çiftler, A-Q ve üstü (AJ suited dahil), K-Q suited. **MP:** 66+, AJ+, KQ, ATs+, QJs. **CO:** her çift, her suited As (A2s-A9s dahil), suited ve ardışık el, AT+ ve KJ+.\n\n' +
        '**BTN:** CO\'daki tüm eller artı biraz daha: K9s+, Q9s+, suited connector, A9 offsuit gibi. Ama 9-2 ya da K-4 gibi zayıf offsuit ellerde BTN\'de bile fold.\n\n' +
        'Bu bir kural kitabı değil, başlangıç noktasıdır. İleride pozisyon ve rakip tipine göre esneteceksin.',
    },
  ],
  alistirmalar: [
    { tur: 'oynaAt', el: ['As', 'Ad'], pozisyon: 'UTG', dogru: 'oyna',
      aciklama: 'As-As en güçlü başlangıç elidir; her pozisyonda oynanır.' },
    { tur: 'oynaAt', el: ['7h', '2d'], pozisyon: 'UTG', dogru: 'at',
      aciklama: '7-2 offsuit, pokerin en zayıf ellerinden biri. Erken pozisyonda kesinlikle fold.' },
    { tur: 'oynaAt', el: ['Ks', 'Jd'], pozisyon: 'UTG', dogru: 'at',
      aciklama: 'K-J offsuit erken pozisyonda sorunlu: pek çok rakip K-Q ya da A-K ile seni geçer. Düğmeye yaklaşınca oynarsın.' },
    { tur: 'oynaAt', el: ['Js', 'Ts'], pozisyon: 'BTN', dogru: 'oyna',
      aciklama: 'Suited connector. Düğmede son konuştuğun için iyi bir oyun; floş ve sıralı şansı var.' },
    { tur: 'oynaAt', el: ['9d', '2c'], pozisyon: 'BTN', dogru: 'at',
      aciklama: '9-2 offsuit, düğmede bile zayıf. Hem düşük kart hem renk hem ardışık bağ yok.' },
    { tur: 'oynaAt', el: ['Ah', '5h'], pozisyon: 'CO', dogru: 'oyna',
      aciklama: 'Suited As, geç pozisyonda oynanır: As yüksek kart ve floş çekişi sunar.' },
    { tur: 'oynaAt', el: ['Ah', '5h'], pozisyon: 'UTG', dogru: 'at',
      aciklama: 'Aynı el UTG\'de fold. Erken pozisyonda arkanda çok oyuncu olduğu için zayıf As ile sorun yaşarsın.' },
    { tur: 'oynaAt', el: ['8c', '8d'], pozisyon: 'MP', dogru: 'oyna',
      aciklama: 'Cep çifti: set yapma şansı var. 8-8 orta pozisyonda rahatça oynanır.' },
    { tur: 'oynaAt', el: ['Kc', '4d'], pozisyon: 'BTN', dogru: 'at',
      aciklama: 'K-4 offsuit zayıf. Papaz çift yapsan bile 4 kicker\'ın çok zayıf olur; düğmede bile fold.' },
    { tur: 'oynaAt', el: ['Ts', '9s'], pozisyon: 'CO', dogru: 'oyna',
      aciklama: 'Suited connector, geç pozisyon. Floş ve sıralı çekişi, iyi bir spekülatif el.' },
    { tur: 'oynaAt', el: ['Ac', 'Qd'], pozisyon: 'UTG', dogru: 'oyna',
      aciklama: 'A-Q iki büyük kart; UTG\'de bile oynanabilir.' },
    { tur: 'secmeli', soru: 'Suited (aynı renk) bir el, aynı değerlerdeki offsuit ele göre neden daha iyidir?', secenekler: ['Daha yüksek çift yapar', 'Floş yapma şansı verir', 'Daha az fold edilir', 'Renk üstünlüğü vardır'], dogru: 1,
      aciklama: 'Aynı renk, 5 kartlık floş şansı demektir. Renklerin kendi gücü yoktur, ama floş ihtimali eli değerli kılar.' },
  ],
  gorev: { tur: 'quiz', soruSayisi: 10, yildiz: [7, 9, 10] },
  ozellikler: { koc: 'acik', saymaPaneli: false, outIpucu: false },
};
