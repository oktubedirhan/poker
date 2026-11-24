// Seviye 2 — Elin akışı
export default {
  id: 2,
  baslik: 'Elin Akışı',
  ozet: 'Bir poker eli (hand) baştan sona nasıl oynanır? Düğme, blind\'ler, dört bahis turu ve showdown.',
  kazanim: [
    'Dealer düğmesini ve küçük/büyük blind\'i tanırsın.',
    'Preflop, flop, turn, river ve showdown sırasını bilirsin.',
    '7 karttan en iyi 5\'in sayıldığını bilirsin.',
    'Yakma kartının neden olduğunu açıklayabilirsin.',
  ],
  dersler: [
    {
      baslik: 'Düğme ve blind\'ler',
      metin:
        'Masada **dealer düğmesi** (D) vardır. Düğme her elde bir oyuncu sağa kayar. Böylece herkes sırayla en iyi ve en kötü yerde oturur.\n\n' +
        'Düğmenin hemen solundaki oyuncu **küçük blind** (small blind), bir sonraki oyuncu **büyük blind** (big blind) öder. Bunlar zorunlu bahislerdir; kimse pota para koymasa oyun başlamazdı.\n\n' +
        'Başa baş (heads-up, 2 kişi) oyunda ise düğmedeki oyuncu küçük blind\'i öder.',
    },
    {
      baslik: 'Kartlar dağıtılır: preflop',
      metin:
        'Her oyuncuya **2 kapalı kart** dağıtılır. Bunlara **hole cards** (cep kartları) denir; sadece sen görürsün.\n\n' +
        'İlk bahis turuna **preflop** denir ("flop\'tan önce"). Büyük blind\'in solundaki oyuncudan başlayarak herkes sırayla fold, call ya da raise yapar. Bahis eylemlerini bir sonraki seviyede ayrıntılı göreceğiz.',
      kartlar: ['Kh', 'Qh'],
    },
    {
      baslik: 'Flop, turn, river',
      metin:
        'Masanın ortasına sırayla 5 ortak kart açılır; herkes bunları kullanabilir. Buna **board** denir.\n\n' +
        '**Flop**: ilk 3 kart birden açılır. Ardından bahis turu. **Turn**: 4. kart. Bahis turu. **River**: 5. ve son kart. Son bahis turu.\n\n' +
        'Her açılıştan önce krupiye en üstteki kartı **yakar**, yani yüzü kapalı bir kenara atar. Böylece destenin üstündeki kart işaretli ya da görülmüş olsa bile kimse avantaj sağlayamaz.',
      board: ['Jh', 'Th', '4c', '9s', '2d'],
    },
    {
      baslik: 'Showdown ve en iyi 5',
      metin:
        'River\'dan sonra birden fazla oyuncu kaldıysa **showdown** olur: kartlar açılır. Her oyuncunun elinde 7 kart vardır (2 cep + 5 board). Bunlardan **en iyi 5\'lik** el sayılır.\n\n' +
        '2 cep kartını da kullanmak zorunda değilsin; 1 kartla, hatta hiç kullanmadan masayı da oynayabilirsin. En iyi eli yapan potu alır; beraberlikte pot bölünür.\n\n' +
        'Showdown\'a hiç gelmeyebilirsin: herkes fold ederse kalan oyuncu kartlarını göstermeden potu alır.',
      el: { kartlar: ['Kh', 'Qh'], board: ['Jh', 'Th', '4c', '9s', '2d'] },
    },
  ],
  alistirmalar: [
    { tur: 'secmeli', soru: 'Dealer düğmesi (D) her elde nasıl hareket eder?', secenekler: ['Hep aynı yerde kalır', 'Bir oyuncu sağa kayar', 'Rastgele seçilir', 'Kazanana geçer'], dogru: 1,
      aciklama: 'Düğme her el bir oyuncu sağa kayar. Böylece her oyuncu eşit sayıda iyi ve kötü pozisyonda oturur.' },
    { tur: 'secmeli', soru: 'Küçük blind\'i (heads-up olmayan masada) kim öder?', secenekler: ['Dealer', 'Dealer\'ın hemen solundaki oyuncu', 'En çok fişi olan', 'Herkes'], dogru: 1,
      aciklama: 'Düğmenin hemen solu küçük blind, onun solu büyük blind öder.' },
    { tur: 'secmeli', soru: 'Her oyuncuya başta kaç kapalı kart dağıtılır?', secenekler: ['1', '2', '3', '5'], dogru: 1,
      aciklama: 'Her oyuncu 2 kapalı kart (hole cards) alır. Masadaki 5 ortak kart sonradan açılır.' },
    { tur: 'secmeli', soru: 'Masaya açılan ilk 3 karta ne denir?', secenekler: ['Preflop', 'Flop', 'Turn', 'River'], dogru: 1,
      aciklama: 'İlk üçlü açılışa flop denir. Sonra turn (4. kart) ve river (5. kart) gelir.' },
    { tur: 'secmeli', soru: 'Her açılıştan önce neden bir kart yakılır (atılır)?', secenekler: ['Deste azalsın diye', 'Hileyi ve işaretli kartı önlemek için', 'Şans getirdiği için', 'Kazananı belirlemek için'], dogru: 1,
      aciklama: 'Üstteki kartı yakmak, işaretli ya da yanlışlıkla görülmüş bir kartın avantaj sağlamasını engeller.' },
    { tur: 'secmeli', soru: 'Showdown\'da kaç kartın en iyisi sayılır?', secenekler: ['Sadece 2 cep kartı', '7 karttan en iyi 5\'i', 'Sadece 5 board kartı', 'Hepsi toplanır'], dogru: 1,
      aciklama: '2 cep + 5 board = 7 kart. Bu yedi karttan, kombinasyon fark etmeksizin en iyi 5\'lik el sayılır.' },
    { tur: 'secmeli', soru: 'Masada 4 kart açıldı. Bu aşamaya ne denir?', board: ['Jh', 'Th', '4c', '9s'], secenekler: ['Flop', 'Turn', 'River', 'Showdown'], dogru: 1,
      aciklama: 'Dördüncü karta turn denir. Beşincisi river\'dır.' },
    { tur: 'enIyi5', kartlar: ['Ah', 'Ad', 'Ks', 'Kd', '7c', '4h', '2s'],
      aciklama: 'En iyi 5: A-A-K-K + 7 kicker (iki çift). 7, 4 ve 2\'den büyük olduğu için kicker 7 olur.' },
  ],
  gorev: {
    tur: 'yonlendirmeliEl',
    hazirKartlar: { insan: ['Kh', 'Qh'], bot1: ['Ac', 'Jc'], board: ['Jh', 'Th', '4c', '9s', '2d'] },
    botlar: ['pasifAcemi'],
    adimlar: [
      { sokak: 'preflop', metin: 'Kartların geldi: Kupa Papaz ve Kupa Kız. Aynı renk ve ardışık, güzel bir başlangıç. Blind\'lere ve düğmeye bak, sıran gelince call ya da check yap.' },
      { sokak: 'flop', metin: 'Flop: Kupa Vale, Kupa 10, Sinek 4. Elinle birlikte K-Q-J-10 oldu! As ya da 9 gelirse sıralı (straight) tamamlanır. Buna açık uçlu çekiş denir.' },
      { sokak: 'turn', metin: 'Turn: Maça 9. K-Q-J-10-9, sıralı tamam! Bu kart açılmadan önce bir kart yakıldı, fark ettin mi?' },
      { sokak: 'river', metin: 'River: Karo 2, işine yaramaz ama zarar da vermez. Elinde Papaz yüksek sıralı var. Rakip en fazla Vale çifti yapabilir.' },
      { sokak: 'showdown', metin: 'Showdown! 7 karttan en iyi 5\'in, K-Q-J-10-9 sıralı. Rakip sadece Vale çifti. Pot senin.' },
    ],
    yildiz: [1, 1, 1],
  },
  ozellikler: { koc: 'acik', saymaPaneli: false, outIpucu: false },
};
