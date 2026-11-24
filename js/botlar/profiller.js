// Bot profilleri. Her profil oyuncunun okuyabileceği bir "tarz" taşır.
// params, bot.js'in karar motorunu şekillendirir:
//   preflop: {
//     esik        — Chen puanı eşiği (bu ve üstü el oynanır; 20 = AA, 8 ≈ en iyi %11, 4 ≈ %52)
//     pozEtki     — pozisyonun eşiği oynatma gücü (0 = pozisyonu hiç umursamaz)
//     raiseKorku  — rakip raise ettiğinde, raise'in her büyük blind'i için eşiğe eklenen puan
//     raiseSkor   — raise etmeyi düşünmek için en az Chen puanı
//     raiseOran   — raiseSkor'u geçen elde call yerine raise etme olasılığı
//     yenidenRaiseSkor / yenidenRaiseOran — raise'e karşı re-raise (3-bet)
//     steal       — oynanmayacak elle, geç pozisyonda ilk giren olarak raise etme olasılığı
//     boyut       — preflop raise büyüklüğü (büyük blind cinsinden)
//   }
//   postflop: {
//     guclu / orta / zayif — { bet, raise }: check edilmiş potta bahis açma ve bahse raise etme olasılığı
//     blof                 — { turn, river }: zayıf elle, check'e karşı ek blöf olasılığı
//     callEsik, callDuyarlilik — bahse call için gereken el gücü = callEsik + duyarlilik × gereken equity
//     boyut                — bahis büyüklüğü (potun oranı)
//   }

export const PROFILLER = {
  pasifAcemi: {
    id: 'pasifAcemi',
    ad: 'Pasif Acemi',
    aciklama:
      'Çağrı istasyonu (calling station): çok el oynar, hemen her bahsi call eder, nadiren bahis açar ya da raise eder. ' +
      'Onu fold ettirmek zordur; ama raise ettiyse eli gerçekten güçlüdür.',
    ipuclari: [
      'Çok sayıda ele katılır: flop\'ta hemen hep birkaç rakip olur.',
      'Sürekli check ve call yapar; bahis açması çok nadirdir.',
      'Blöf işe yaramaz çünkü fold etmez. Güçlü elinle bahis aç, call eder ve sana ödeme yapar.',
      'Raise ettiği an dikkat et: bunu çok az yapar, yaptığında eli güçlüdür.',
    ],
    params: {
      preflop: { esik: 4, pozEtki: 0, raiseKorku: 0.25, raiseSkor: 14, raiseOran: 0.5, yenidenRaiseSkor: 16, yenidenRaiseOran: 0.3, steal: 0, boyut: 3 },
      postflop: {
        guclu: { bet: 0.3, raise: 0.12 }, orta: { bet: 0.06, raise: 0.01 }, zayif: { bet: 0.01, raise: 0 },
        blof: { turn: 0, river: 0 }, callEsik: 0.12, callDuyarlilik: 0.25, boyut: 0.4,
      },
    },
  },

  sikiPasif: {
    id: 'sikiPasif',
    ad: 'Sıkı Pasif',
    aciklama:
      'Kaya (nit): çok az el oynar ve çoğunlukla check/call yapar. Bahis açtıysa ya da raise ettiyse ciddidir. ' +
      'Blind\'lerini çalmak kolaydır, ama bahis açtığında onunla çekişme.',
    ipuclari: [
      'Çok az ele katılır; çoğu eli preflop\'ta fold eder.',
      'Nadiren bahis açar. Açtıysa ya da raise ettiyse eli büyük ihtimalle güçlüdür.',
      'Zayıf elinle onunla çekişme; fold etmek çoğu zaman doğrudur.',
      'Blind\'lerini çalmayı dene: tehlike yoksa fold eder.',
    ],
    params: {
      preflop: { esik: 8, pozEtki: 0, raiseKorku: 0.6, raiseSkor: 11, raiseOran: 0.25, yenidenRaiseSkor: 16, yenidenRaiseOran: 0.5, steal: 0, boyut: 3 },
      postflop: {
        guclu: { bet: 0.45, raise: 0.25 }, orta: { bet: 0.08, raise: 0 }, zayif: { bet: 0, raise: 0 },
        blof: { turn: 0, river: 0 }, callEsik: 0.45, callDuyarlilik: 0.2, boyut: 0.55,
      },
    },
  },

  gevsekAgresif: {
    id: 'gevsekAgresif',
    ad: 'Gevşek Agresif',
    aciklama:
      'LAG: çok el oynar ve sık sık bahis açıp raise eder. Geniş aralıktan oynadığı için her bahsi güçlü sanma; ' +
      'orta güçte eliyle call edebilirsin. Güçlü elin gelince onu cezalandır.',
    ipuclari: [
      'Çok sayıda ele katılır ve çoğunda raise eder.',
      'Sık bahis açar; bahsi her zaman güçlü el anlamına gelmez.',
      'Orta güçte elinle call etmek ona karşı çoğu zaman kârlıdır.',
      'Sabırlı ol; güçlü elinle onu bahse itip pot\'u büyüt.',
    ],
    params: {
      preflop: { esik: 3, pozEtki: 0.2, raiseKorku: 0.12, raiseSkor: 4, raiseOran: 0.6, yenidenRaiseSkor: 8, yenidenRaiseOran: 0.35, steal: 0.5, boyut: 3 },
      postflop: {
        guclu: { bet: 0.85, raise: 0.5 }, orta: { bet: 0.7, raise: 0.3 }, zayif: { bet: 0.5, raise: 0.15 },
        blof: { turn: 0.15, river: 0.1 }, callEsik: 0.12, callDuyarlilik: 0.2, boyut: 0.65,
      },
    },
  },

  blofcu: {
    id: 'blofcu',
    ad: 'Blöfçü',
    aciklama:
      'Sık sık, büyük bahislerle blöf yapar; özellikle turn ve river\'da. Ona karşı korkma: ' +
      'orta güçte bir eli (örn. top pair) ile call etmek çoğu zaman kârlıdır. Onu blöf yaparken yakala.',
    ipuclari: [
      'Turn ve river\'da, check\'e karşı sık sık büyük bahis açar.',
      'Bahsi büyük ama eli çoğu zaman zayıf; orta güçte elinle call et.',
      'Preflop\'ta orta genişlikte oynar, flop\'ta daha temkinlidir; asıl blöfü sonra yapar.',
      'Sen bahis açınca kolay fold eder; ama check\'ledikçe o bahsi alır.',
    ],
    params: {
      preflop: { esik: 6, pozEtki: 0.2, raiseKorku: 0.4, raiseSkor: 9, raiseOran: 0.4, yenidenRaiseSkor: 12, yenidenRaiseOran: 0.3, steal: 0.25, boyut: 3 },
      postflop: {
        guclu: { bet: 0.6, raise: 0.3 }, orta: { bet: 0.3, raise: 0.08 }, zayif: { bet: 0.12, raise: 0.1 },
        blof: { turn: 0.55, river: 0.65 }, callEsik: 0.38, callDuyarlilik: 0.25, boyut: 0.95,
      },
    },
  },

  akilli: {
    id: 'akilli',
    ad: 'Akıllı',
    aciklama:
      'Matematikçi: pozisyona göre el seçer, equity\'sini pot oranıyla karşılaştırır ve nadiren, hesaplı blöf yapar. ' +
      'Bariz bir zayıflığı yok; ona karşı en iyi yol kendi matematiğini ve pozisyonunu doğru kullanmaktır.',
    ipuclari: [
      'Geç pozisyonda geniş, erken pozisyonda dar oynar.',
      'Bahisleri potun yarısı-üçte ikisi civarındadır; pot oranına göre call eder.',
      'Güçlü eller ve iyi çekişlerle bahis açar; ara sıra blöf yapar ama çok seyrek.',
      'Bariz zayıflığı yok: ona karşı hatasız oynamaya çalış, pozisyon avantajını kullan.',
    ],
    params: {
      preflop: { esik: 8, pozEtki: 1, raiseKorku: 0.55, raiseSkor: 8, raiseOran: 0.85, yenidenRaiseSkor: 11.5, yenidenRaiseOran: 0.7, steal: 0.15, boyut: 3 },
      postflop: {
        iterasyon: 700, degerEsigi: 0.62, inceDegerEsigi: 0.45, blof: 0.07, yariBlof: 0.35, boyut: 0.6,
      },
    },
  },
};
