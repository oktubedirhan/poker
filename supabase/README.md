# Eşitleme sunucusu (Supabase `poker`, ref puwingomlswswxxlsywl, eu-central-1)

Hesap yok. 12 karakterlik eşleme kodu (alfabe `A-HJ-NP-Z2-9`, 60 bit) anahtardır; sunucu yalnızca SHA-256 özetini tutar.
Tablo `public.ilerleme` RLS açık, politikasız, anon/authenticated'dan geri alınmış; istemci yalnızca şu RPC'leri çağırır (anon):

| RPC | Girdi | Döner |
|---|---|---|
| `ilerleme_cek` | `{p_kod}` | `{seviyeler, ayarlar, guncelleme}` ya da `null` (kod yoksa) |
| `ilerleme_yaz` | `{p_kod, p_seviyeler, p_ayarlar}` | birleşmiş `{seviyeler, ayarlar, guncelleme}`. Seviyede yüksek yıldız kazanır; ayarlar üzerine yazılır (yalnız `koc`, `dortRenk` boolean) |
| `ilerleme_sifirla` | `{p_kod}` | `{seviyeler:{}}` — seviyeleri sunucuda da temizler |

`seviyeler` biçimi: `{"0":{"yildiz":3}, ...}` (anahtar 0–10, yıldız 1–3; 0 yıldız saklanmaz). Geçersiz kod → HTTP 400, `message: "gecersiz_kod"`.
İstek: `POST https://puwingomlswswxxlsywl.supabase.co/rest/v1/rpc/<ad>`, başlık `apikey: sb_publishable_wC3YWSk4DhyX4Q9N_78cBQ_qvrcDD9H` (yayınlanabilir anahtar, istemcide durması normal).
Danışman uyarısı "anon SECURITY DEFINER çalıştırabilir" tasarım gereği beklenir.
Şema: Supabase migration'ları `ilerleme_esitleme`, `authenticated_yetkisini_kaldir`.
