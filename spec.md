# ChessRoom — Kritik Özellikler v69

## Current State
- Jeton sistemi tamamen offlineStorage (local) üzerinde çalışıyor; kullanıcılar jeton kazanıyor ama harcayabileceği bir yer yok
- Giriş ekranında kod kaybı için kullanıcıya hiçbir mesaj verilmiyor
- Online oyun bitince (mat/beraberlik) sadece `toast` ile kısa bildirim var; karşı oyuncuya popup gösterilmiyor

## Requested Changes (Diff)

### Add
- **Jeton Mağazası (JetonShop)**: MainScreen'de ulaşılabilir bir mağaza. Tahta temaları ve profil rozetleri satın alınabilsin. Satın alınan itemlar offlineStorage'da "inventory" olarak saklanır. Temalar mevcut 2D tema sistemiyle entegre olur; rozet kullanıcı profil kartında görünür.
- **Giriş ekranı kod kayıp mesajı**: EntryScreen'de kayıt/giriş alanının altına "Kodunu kaybettiysen yeni hesap açabilirsin" mesajı eklensin.
- **Online oyun sonuç popup'ı**: Hem AI hem online modda oyun bitince (mat, süre dolumu, beraberlik, disconnect) tam ekran animasyonlu bir sonuç popup'ı gösterilsin. Kazanan/kaybeden/beraberlik durumu net şekilde gösterilsin, XP ve jeton değişimi özetlensin, "Ana Menü" butonu olsun.

### Modify
- `EntryScreen.tsx`: Kod kaybı mesajı ekle
- `GameScreen.tsx`: `handleGameEnd` / `handleMatchEnd` callback'lerine sonuç popup'ı bağla; online disconnect sonucunda da popup tetiklensin
- `ChessBoard.tsx`: Oyun sonu callback'i popup data ile zenginleştir (kazanan taraf, XP, jeton bilgisi)
- `MainScreen.tsx`: Mağaza butonu ve JetonShop bileşenine erişim ekle

### Remove
- Yok

## Implementation Plan
1. `JetonShop.tsx` bileşeni oluştur: tahta temaları (6 adet) ve profil rozetleri (6 adet) listesi, fiyat, satın al butonu, offlineStorage inventory entegrasyonu
2. `GameResultPopup.tsx` bileşeni oluştur: animasyonlu kazanma/kaybetme/beraberlik ekranı, XP/jeton özeti, ana menüye dön butonu
3. `EntryScreen.tsx` güncelle: kod kayıp mesajı ekle
4. `GameScreen.tsx` güncelle: `handleMatchEnd` içinde popup state'ini set et; online disconnect için de popup göster
5. `MainScreen.tsx` güncelle: profil bölümüne veya nav'a "Mağaza" butonu ekle; rozeti kullanıcı stat kartında göster
6. `offlineStorage.ts` güncelle: inventory CRUD (purchaseItem, getInventory, hasItem) ekle
7. `translations.ts` güncelle: mağaza ve popup için tüm 11 dilde çeviri anahtarları
