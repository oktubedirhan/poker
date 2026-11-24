// Seviye 5 — Kart sayma 1: Out
export default {
  id: 5,
  baslik: 'Kart Sayma 1: Out',
  ozet: 'Out, elini güçlendirecek kartlardır. Kaç out\'un olduğunu saymak, pokerin matematik temelidir.',
  kazanim: [
    'Out\'un ne olduğunu ve nasıl sayıldığını bilirsin.',
    'Floş çekişi (9), açık uçlu sıralı (8), gutshot (4), iki over kart (6) ve set çekişi (2) out sayılarını ezberlersin.',
    '"Kirli out" kavramını ve tuzaklarını bilirsin.',
  ],
  dersler: [
    {
      baslik: 'Out nedir?',
      metin:
        '**Out**, destede kalan ve çıkarsa elini kazanan ya da güçlü yapan karttır. Önce neyi beklediğini bil: "Bir floşa 1 kart kalmış" demek, o floşu tamamlayan kartlar senin out\'undur.\n\n' +
        'Sayarken sadece **görmediğin** kartlara bakarsın: kendi 2 kartın ve masadaki kartlar görünür, diğer her şey bilinmeyendir. Flop\'ta 5 kart görürsün (2 + 3), yani 47 bilinmeyen kart kalır.\n\n' +
        'Out saymak, "elim şanslı mı?" sorusunu sayıya çevirir. Bir sonraki seviyede bu sayıyı olasılığa dönüştüreceğiz.',
      el: { kartlar: ['Ah', 'Kh'], board: ['Qh', '7h', '2c'] },
    },
    {
      baslik: 'Ezberlenecek out sayıları',
      metin:
        '**Floş çekişi** (flush draw: aynı renkten 4 kartın var): her renkte 13 kart olduğu için 13 − 4 = **9 out**.\n\n' +
        '**Açık uçlu sıralı** (open-ended straight draw: 4 ardışık kart, iki ucu da açık, örn. 9-8-7-6): iki ucu 4\'er kart, **8 out**.\n\n' +
        '**İç sıralı** (gutshot: ortada bir değer eksik, örn. J-10-8-7, eksik 9): tek bir değer 4 kart, **4 out**.\n\n' +
        '**İki over kart** (elindeki iki kart da masadan büyük, mesela A-K, board 9-5-2): bir A ya da K gelirse çift yaparsın, **6 out**. **Set çekişi**: cep çiftin var, 3. kartı bekliyorsun, **2 out**.',
      el: { kartlar: ['9s', '8s'], board: ['7d', '6c', '2h'] },
    },
    {
      baslik: 'Kirli out',
      metin:
        'Bazen bir out seni güçlendirir ama aynı anda rakibi de daha güçlü yapar. Buna **kirli out** (dirty out) denir.\n\n' +
        'Örnek: kupa floşu çekiyorsun ama masada çift var (K-6-6). Floşu tamamlasan da rakip ful yapmış olabilir. Ya da iki over kartla çift yapsan bile rakibin daha büyük bir çifti olabilir.\n\n' +
        'Kural: out sayını bulduktan sonra "bu out\'lar gerçekten temiz mi?" diye sor ve şüphe varsa 1-2 out düş. Koç da bunu sana hatırlatacak.',
      el: { kartlar: ['Ah', '9h'], board: ['Kh', '6h', '6d'] },
    },
  ],
  alistirmalar: [
    { tur: 'outSay', uret: { cekis: 'flos' } },
    { tur: 'outSay', uret: { cekis: 'acikUcluSirali' } },
    { tur: 'outSay', uret: { cekis: 'icSirali' } },
    { tur: 'outSay', uret: { cekis: 'karisik' } },
    { tur: 'secmeli', soru: 'Elinde iki kupa var, masada iki kupa daha. Floşa kaç out\'un var?', kartlar: ['Ah', 'Kh'], board: ['Qh', '7h', '2c'], secenekler: ['4', '8', '9', '13'], dogru: 2,
      aciklama: 'Kupa 13 kart, 4\'ünü görüyorsun (2 el + 2 board). 13 − 4 = 9 out.' },
    { tur: 'secmeli', soru: 'Sıralı için hangi kartlar out\'tur?', kartlar: ['9s', '8s'], board: ['7d', '6c', '2h'], secenekler: ['Sadece 5\'ler', '5\'ler ve 10\'lar (8 out)', 'Sadece 10\'lar', '4, 5, 10, Vale'], dogru: 1,
      aciklama: '5-6-7-8-9 ya da 6-7-8-9-10 yapmak için 5 veya 10 lazım: 4 + 4 = 8 out. Açık uçlu çekiş.' },
    { tur: 'secmeli', soru: 'Bu elde sıralı için kaç out\'un var?', kartlar: ['Jd', 'Tc'], board: ['8h', '7s', '2c'], secenekler: ['2', '4', '8', '9'], dogru: 1,
      aciklama: 'Sadece 9 işe yarar (J-10-9-8-7), 4 tane 9 var: gutshot, 4 out.' },
    { tur: 'secmeli', soru: 'Elinde A-K, masada 9-5-2. Çift yapmak için kaç out\'un var?', kartlar: ['Ac', 'Kd'], board: ['9h', '5s', '2c'], secenekler: ['2', '3', '6', '8'], dogru: 2,
      aciklama: '3 As + 3 Papaz = 6 out (iki over kart). Dikkat: çift yaparsan da rakipten büyük olmayabilir.' },
    { tur: 'secmeli', soru: 'Cep çiftin var (8-8), masada Papaz-4-2. Set için kaç out\'un var?', kartlar: ['8h', '8d'], board: ['Kc', '4d', '2h'], secenekler: ['1', '2', '4', '6'], dogru: 1,
      aciklama: 'Destede sadece 2 tane 8 kaldı (4 tane 8 − 2 elinde).' },
    { tur: 'secmeli', soru: 'Masada 6-6 çifti var ve sen kupa floşu çekiyorsun. Bu out\'lar için doğru yorum hangisi?', kartlar: ['Ah', '9h'], board: ['Kh', '6h', '6d'], secenekler: ['Hepsi tamamen temiz', 'Kirli olabilir, rakip ful yapmış olabilir', 'Out sayısı 18 olur', 'Out sayılmaz'], dogru: 1,
      aciklama: 'Masada çift varsa rakibin ful ihtimali yükselir; floşun değeri düşer. Bu out\'lar "kirli" olabilir.' },
  ],
  gorev: {
    tur: 'masa', botlar: ['pasifAcemi'], baslangicCip: 1000, kucukBlind: 10, buyukBlind: 20,
    desteModu: 'elBasi', elSayisi: 12,
    hedef: { tur: 'cipKazan', miktar: 100 },
    yildiz: [100, 250, 500],
    araSorular: { her: 3, tur: 'outSay' },
  },
  ozellikler: { koc: 'acik', saymaPaneli: true, outIpucu: true },
};
