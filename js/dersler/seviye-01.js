// Seviye 1 — El sıralaması
export default {
  id: 1,
  baslik: 'El Sıralaması',
  ozet: 'Beş kartlık eller 10 kategoriye ayrılır. Hangisinin hangisini yendiğini bilmeden poker oynanmaz.',
  kazanim: [
    '10 el kategorisini güçlüden zayıfa sıralayabilirsin.',
    'Kicker (yan kart) ile beraberliği bozmayı bilirsin.',
    'Yedi karttan en iyi 5\'lik eli seçebilirsin.',
  ],
  dersler: [
    {
      baslik: 'On el kategorisi',
      metin:
        'Güçlüden zayıfa: **Royal Floş** (aynı renkten 10-Vale-Kız-Papaz-As), **Sıralı Floş** (straight flush: aynı renkten 5 ardışık kart), **Dörtlü** (four of a kind: 4 aynı değer), **Ful** (full house: bir üçlü + bir çift), **Floş** (flush: aynı renkten 5 kart).\n\n' +
        'Sonra: **Sıralı** (straight: ardışık 5 kart, renk önemsiz), **Üçlü** (three of a kind / set), **İki Çift**, **Çift** ve en zayıfı **Yüksek Kart**.\n\n' +
        'Sıra size zor gelirse şu kural işe yarar: bir el ne kadar az sıklıkla gelirse o kadar güçlüdür.',
      kartlar: ['Ah', 'Kh', 'Qh', 'Jh', 'Th'],
    },
    {
      baslik: 'Sık karıştırılanlar',
      metin:
        '**Floş sıralıdan güçlüdür.** Aynı renkten 5 kart toplamak, ardışık 5 kart toplamaktan daha zordur.\n\n' +
        '**Ful, floştan güçlüdür.** Ful = 3 kart bir değer + 2 kart başka bir değer. Aşağıdaki el "Papazlar ve yediler" diye okunur.\n\n' +
        'Sıralıda As iki şekilde çalışır: A-K-Q-J-10 (en yüksek) ya da A-2-3-4-5 (en düşük sıralı, "wheel"). K-A-2-3-4 gibi köşeyi dönen sıralı **yoktur**.',
      kartlar: ['Ks', 'Kd', 'Kc', '7h', '7s'],
    },
    {
      baslik: 'Kicker: yan kart',
      metin:
        'İki oyuncunun aynı kategoride eli varsa önce kategorinin kartlarına bakılır. Eşitse **kicker** (kategoriye dahil olmayan en yüksek yan kart) devreye girer.\n\n' +
        'Aşağıdaki örnekte masada Q-8-5-3-2 var. Elinde Kız Çifti + As kicker var. Rakibinde Kız Çifti + Vale varsa, As > Vale olduğu için sen kazanırsın.\n\n' +
        'Hold\'em\'de 7 karttan **en iyi 5\'i** sayılır, yani kicker de bu 5 kartın içinden seçilir.',
      el: { kartlar: ['Qh', 'Ad'], board: ['Qs', '8c', '5d', '3h', '2s'] },
    },
    {
      baslik: 'Beraberlik (split pot)',
      metin:
        'İki oyuncunun en iyi 5\'lik eli birebir aynı güçteyse pot ikiye bölünür. Buna **split pot** denir.\n\n' +
        'En klasik örnek: masadaki 5 kart zaten en iyi eldir ve ikinizin kartları onu geçemez. Aşağıda masada Royal Floş var, kimsenin eli bunu geçemez, herkes masadaki 5 kartı oynar.\n\n' +
        'Renkler eşit olduğu için aynı değerli iki el (mesela Kupa As-Papaz ve Maça As-Papaz) her zaman berabere sayılır.',
      kartlar: ['As', 'Ks', 'Qs', 'Js', 'Ts'],
    },
  ],
  alistirmalar: [
    { tur: 'secmeli', soru: 'Hangisi daha güçlüdür?', secenekler: ['Floş', 'Sıralı', 'İkisi eşit', 'Duruma göre'], dogru: 0,
      aciklama: 'Floş (aynı renkten 5 kart) sıralıdan (ardışık 5 kart) daha güçlüdür.' },
    { tur: 'secmeli', soru: 'Hangisi en güçlü kategoridir?', secenekler: ['Ful', 'Dörtlü', 'Sıralı Floş', 'Floş'], dogru: 2,
      aciklama: 'Sıralı Floş (straight flush) listedeki en güçlüsüdür. Onun da en büyüğü Royal Floş\'tur.' },
    { tur: 'secmeli', soru: 'K-K-K-5-5 elinin adı nedir?', kartlar: ['Ks', 'Kd', 'Kc', '5h', '5s'], secenekler: ['Üçlü', 'İki Çift', 'Ful', 'Dörtlü'], dogru: 2,
      aciklama: 'Bir üçlü (Papaz) + bir çift (5) = Ful (full house).' },
    { tur: 'hangisiGuclu', board: ['Ks', '7d', '7c', '2h', '9s'], elA: ['Ah', 'Kd'], elB: ['7h', '3d'], dogru: 'B',
      aciklama: 'A\'nın eli Papaz-Yedi iki çift. B\'nin eli üç yedi (üçlü). Üçlü, iki çiftten güçlüdür.' },
    { tur: 'hangisiGuclu', board: ['Jh', 'Th', '9h', '2c', '3d'], elA: ['Ah', '4h'], elB: ['Qd', '8s'], dogru: 'A',
      aciklama: 'A, 5 kupa ile floş yaptı (A-J-10-9-4). B, 8-9-10-Vale-Kız ile sıralı yaptı. Floş sıralıdan güçlüdür.' },
    { tur: 'hangisiGuclu', board: ['Qs', '8d', '5c', '3h', '2s'], elA: ['Qh', 'Ad'], elB: ['Qd', 'Jc'], dogru: 'A',
      aciklama: 'İkisinde de Kız çifti var. Kicker\'a bakılır: As, Vale\'den büyük. A kazanır.' },
    { tur: 'hangisiGuclu', board: ['9c', '9d', '5c', 'Kc', '2c'], elA: ['9h', '5d'], elB: ['Ac', '3c'], dogru: 'A',
      aciklama: 'A: 9-9-9-5-5 ful. B: A-K-9-5-2 sineklerle floş. Ful, floştan güçlüdür.' },
    { tur: 'hangisiGuclu', board: ['5d', '4c', '3h', 'Kd', '9s'], elA: ['Ah', '2c'], elB: ['6s', '2d'], dogru: 'B',
      aciklama: 'A: As-2-3-4-5 sıralı (5 yüksek, "wheel"). B: 2-3-4-5-6 sıralı (6 yüksek). Yüksek olan sıralı kazanır, B.' },
    { tur: 'hangisiGuclu', board: ['As', 'Ks', 'Qs', 'Js', 'Ts'], elA: ['2h', '3d'], elB: ['9c', '8d'], dogru: 'esit',
      aciklama: 'Masada Royal Floş var. İkiniz de onu oynarsınız, kimse geçemez. Pot ikiye bölünür.' },
    { tur: 'enIyi5', kartlar: ['As', 'Ks', '7s', '2s', '9s', 'Kd', 'Kc'],
      aciklama: 'En iyi 5: A-K-9-7-2 maçalar, yani floş. Üç Papaz (üçlü) da var ama floş üçlüden güçlüdür.' },
    { tur: 'enIyi5', kartlar: ['9c', '9d', '9h', '4s', '4d', 'Ac', 'Kc'],
      aciklama: 'En iyi 5: 9-9-9-4-4 ful. As ve Papaz yan kart olarak işe yaramaz.' },
    { tur: 'enIyi5', kartlar: ['6d', '7d', '8c', '9s', 'Th', 'Tc', '2h'],
      aciklama: 'En iyi 5: 6-7-8-9-10 sıralı. İki tane 10 var ama yalnızca çift eder, sıralı çiftten güçlüdür.' },
  ],
  gorev: { tur: 'quiz', soruSayisi: 8, yildiz: [5, 7, 8] },
  ozellikler: { koc: 'acik', saymaPaneli: false, outIpucu: false },
};
