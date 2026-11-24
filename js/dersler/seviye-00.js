// Seviye 0 — Deste
export default {
  id: 0,
  baslik: 'Deste',
  ozet: 'Poker 52 kartlık bir destenin kartlarıyla oynanır. Önce kartları tanıyalım.',
  kazanim: [
    'Destede 52 kart, 4 renk ve her renkte 13 değer olduğunu bilirsin.',
    'As, Papaz, Kız ve Vale kartlarını tanırsın.',
    'Poker\'de renklerin birbirine üstünlüğü olmadığını bilirsin.',
  ],
  dersler: [
    {
      baslik: '52 kartlık deste',
      metin:
        'Poker standart bir iskambil destesiyle oynanır. Destede **52 kart** vardır ve joker yoktur.\n\n' +
        'Kartlar **4 renge** ayrılır: Maça ♠, Kupa ♥, Karo ♦ ve Sinek ♣. Kupa ve Karo kırmızı, Maça ve Sinek siyahtır.\n\n' +
        'Her renkte **13 kart** vardır: 4 renk × 13 değer = 52.',
      kartlar: ['As', 'Kh', 'Qd', 'Jc'],
    },
    {
      baslik: 'Değerler ve kart adları',
      metin:
        'Sayılı kartlar 2\'den 10\'a kadar gider. Üstüne 4 tane "resimli" kart gelir: **Vale** (J), **Kız** (Q), **Papaz** (K) ve **As** (A).\n\n' +
        'Sıralama küçükten büyüğe: 2, 3, 4, 5, 6, 7, 8, 9, 10, Vale, Kız, Papaz, As. Yani As en büyük karttır.\n\n' +
        'Bu uygulamada kartlar kısa yazılır: **K♥** Kupa Papaz, **10♦** Karo 10 demektir. Ekranda hep resmini göreceksin.',
      kartlar: ['2c', 'Td', 'Jh', 'Qs', 'Kd', 'Ac'],
    },
    {
      baslik: 'Renkler eşittir',
      metin:
        'Pokerde renkler birbirinden üstün değildir. Kupa As ile Maça As tamamen aynı güçtedir.\n\n' +
        'Renk tek bir yerde işe yarar: **aynı renkten 5 kart** toplarsan güçlü bir el (floş) yapmış olursun. Bunu Seviye 1\'de göreceğiz.\n\n' +
        'Bir de As\'ın özel bir huyu var: genelde en büyük karttır, ama A-2-3-4-5 sırasında en küçük gibi de davranabilir. Yine Seviye 1\'de.',
      kartlar: ['Ah', 'As', 'Ad', 'Ac'],
    },
  ],
  alistirmalar: [
    { tur: 'secmeli', soru: 'Standart bir destede kaç kart vardır?', secenekler: ['48', '52', '54', '56'], dogru: 1,
      aciklama: '4 renk × 13 değer = 52 kart. 54 olması için 2 joker gerekirdi, pokerde joker yok.' },
    { tur: 'secmeli', soru: 'Destede kaç renk vardır?', secenekler: ['2', '3', '4', '13'], dogru: 2,
      aciklama: 'Maça, Kupa, Karo ve Sinek: 4 renk.' },
    { tur: 'secmeli', soru: 'Her renkte kaç kart vardır?', secenekler: ['10', '12', '13', '14'], dogru: 2,
      aciklama: '2\'den 10\'a 9 sayılı kart, ayrıca Vale, Kız, Papaz ve As: 9 + 4 = 13.' },
    { tur: 'secmeli', soru: 'Bu kartın adı nedir?', kartlar: ['Kd'], secenekler: ['Kupa Papaz', 'Karo Papaz', 'Karo Kız', 'Maça Papaz'], dogru: 1,
      aciklama: 'K = Papaz, d = Karo. Yani Karo Papaz.' },
    { tur: 'secmeli', soru: 'Bu kart hangisidir?', kartlar: ['Qs'], secenekler: ['Maça Kız', 'Maça Vale', 'Sinek Kız', 'Kupa Kız'], dogru: 0,
      aciklama: 'Q = Kız (Queen), s = Maça. Kız kartında bir kadın resmi olur.' },
    { tur: 'secmeli', soru: 'Hangisi Vale\'dir?', kartlar: ['Jc', 'Kc', 'Qc', 'Ac'], secenekler: ['1. kart (J)', '2. kart (K)', '3. kart (Q)', '4. kart (A)'], dogru: 0,
      aciklama: 'J, Jack yani Vale demektir. K Papaz, Q Kız, A As.' },
    { tur: 'secmeli', soru: 'Hangisi en büyük karttır?', secenekler: ['Papaz', 'Kız', 'As', '10'], dogru: 2,
      aciklama: 'Sıralama: ... 10, Vale, Kız, Papaz, As. As en büyüktür.' },
    { tur: 'secmeli', soru: 'Kupa As ile Maça As karşılaşırsa hangisi güçlüdür?', secenekler: ['Kupa As', 'Maça As', 'İkisi eşit', 'Sırasına göre değişir'], dogru: 2,
      aciklama: 'Pokerde renklerin üstünlüğü yoktur. İkisi de As, ikisi de aynı güçte.' },
    { tur: 'secmeli', soru: 'Destede kaç tane resimli kart (Vale, Kız, Papaz) vardır?', secenekler: ['9', '12', '16', '20'], dogru: 1,
      aciklama: '3 resimli değer × 4 renk = 12. As\'ı da eklesek 16 olurdu ama soru As\'ı saymıyor.' },
  ],
  gorev: { tur: 'quiz', soruSayisi: 8, yildiz: [5, 7, 8] },
  ozellikler: { koc: 'acik', saymaPaneli: false, outIpucu: false },
};
