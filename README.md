# 🌌 Foton Vibe

> **Çevrimdışı Öncelikli (Offline-First) Mobil Astrofotografi Asistanı & Kozmik Yol Arkadaşı**

Foton Vibe; zifiri karanlık dağ başlarında, köyde veya internet erişiminin olmadığı en ücra köşelerde bile astrofotograflara rehberlik etmek için tasarlanmış, hafif, şık ve son derece optimize bir Çevrimdışı Öncelikli PWA (Progressive Web App) uygulamasıdır. 

Özellikle analog merceklerin (örneğin efsanevi 1984 Helios 44M-4 gibi) kusurlarındaki o büyüleyici karakteri arayan ve gökyüzünü sadece bir matematiksel veri olarak değil, felsefi bir tuval olarak gören fotoğrafçılar için geliştirilmiştir.

---

## 📸 Temel Özellikler

Uygulama, bir astrofotografın sahada ihtiyaç duyacağı tüm kritik araçları tek bir potada eritir:

### 1. 🌌 Gösterge Paneli (Dashboard)
* **Astronomik Zaman Motoru:** İnternet bağlantısı olmasa bile tamamen yerel matematiksel formüllerle Güneş batımını ve Samanyolu çekimi için en kritik an olan **Astronomik Karanlık** başlangıcını hesaplar.
* **Dinamik Ay Evresi:** Ay'ın anlık aydınlanma yüzdesini ve gökyüzündeki aktif konumunu simüle eder.
* **Canlı Hava Durumu:** Open-Meteo entegrasyonu ile rüzgar hızını ve bulutluluk oranını anlık olarak ekrana yansıtır.
* **Yapay Işık Kalibrasyonlu Hibrit Bortle Tahmini:** Sadece Ay ışığına bağımlı kalmaz. Kullanıcının seçtiği çevre tipine (Zifiri karanlık, kırsal/köy, kasaba, büyük şehir) göre Ay'ın o anki ışık gücünü matematiksel olarak ekleyerek kusursuz bir anlık ışık kirliliği (Bortle) analizi yapar.

### 2. ⏱️ Gelişmiş NPF Pozlama Laboratuvarı
* **Piksel Boyutu Hassasiyeti:** Sensör tipine (Full Frame, APS-C, Micro Four Thirds vb.) ve megapiksel değerine göre kamera sensörünün gerçek mikron boyutunu hesaplar.
* **İleri Düzey NPF Hesaplama:** Yıldızların uzamasını (star trailing) engellemek için odak uzaklığı, diyafram, piksel boyutu ve hedef bölgenin göksel sapmasını (declination/kutup yakınlığı) hesaba katan gelişmiş NPF formülünü kullanır.
* **Aşırı Pozlama Koruması (Overexposure Protection):** Işık kirliliği olan bölgelerde uzun süre tek kare pozlama yapıldığında sensörün patlamasını engellemek için toplam süreyi güvenli alt saniyelere böler ve ideal istifleme (stacking) reçetesi sunar.

### 3. ✍️ Foton Esintisi (Vibe)
* **Kozmik İlham:** Geliştiricinin felsefi dünyasından süzülen, anlık zamana ve kozmik saate göre değişen kompozisyon fikirleri ve sanatsal hatırlatıcılar sunar. Fotoğrafçının sadece deklanşöre basmasını değil, sahneyi hissetmesini amaçlar.

### 4. 📍 Rota Keşif Dedektörü
* **Overpass API Entegrasyonu:** Bulunduğun koordinatların 5 km yakınındaki tarihi kalıntıları, antik harabeleri, kaleleri ve ışık kirliliğinden uzak tepe noktalarını tarayarak ön plana (foreground) yerleştirebileceğin mükemmel kompozisyon noktalarını keşfeder.

---

## 🛠️ Teknik Altyapı (Tech Stack)

Uygulama, "amelelik" olarak nitelendirilen gereksiz yüklerden arındırılmış, olabildiğince minimal ve yüksek performanslı modern web teknolojileri üzerine inşa edilmiştir:

* **Çekirdek:** Pure Vanilla JS (ES6+ Modules), HTML5, CSS3
* **Tasarım Dili:** Google Material Design 3 esintili, gece çekimlerinde gözü yormayan derin kırmızı/siyah kontrastlı özel karanlık tema (Tailwind CSS)
* **PWA & Caching:** Özel yazılmış, ağ tıkanmalarına ve zombi kilitlenmelerine karşı korumalı dinamik Service Worker (`skipWaiting` ve `clients.claim` destekli). Çevrimdışıyken arayüzün çökmesini önlemek için Tailwind CDN'ini de lokal önbelleğe alır.
* **API'ler:** HTML5 Geolocation, Open-Meteo API, Overpass API (OpenStreetMap)

---

## 🤖 Yapay Zeka (AI) İş Birliği Bildirisi

Bu proje, geleneksel yazılım süreçlerinin dışına çıkılarak **insan sezgisi/fotoğraf tutkusu ile Yapay Zeka (Gemini) mühendisliğinin sıfır hata hedefli ortaklığıyla** geliştirilmiştir.

* **Fikir ve Mimari:** Yazılımcının doğada, sahada ve dağ başındaki pratik ihtiyaçlarından, analog mercek tutkusundan doğmuştur.
* **Kodlama ve Optimizasyon:** Projenin tüm modüler JavaScript yapısı, Service Worker'ın kurşun geçirmez çevrimdışı önbellek yönetimi, karmaşık astronomik formüllerin hata payı olmadan JS ortamına dökülmesi ve tarayıcı kilitlenmelerinin çözümü, **Gemini** ile birebir kod inceleme (code-review) ve saniyeler içinde lokal hata analizi yapılarak inşa edilmiştir.
* **Sonuç:** Tek bir satır gereksiz kütüphane veya ağır framework (React/Vue/Angular) kullanılmadan, sadece insan zihni ve yapay zeka hızının birleşimiyle 3 saat gibi kısa bir sürede sahada tıkır tıkır çalışan, taşınabilir bir PWA üretilmiştir.

---

## 🚀 Kurulum ve Yerel Çalıştırma

Projeyi bilgisayarınızda veya sunucunuzda çalıştırmak son derece basittir:

1. Depoyu bilgisayarınıza klonlayın:
   ```bash
   git clone [https://github.com/vellidr/foton-vibe.git](https://github.com/vellidr/foton-vibe.git)
   cd foton-vibe
2. Yerel bir sunucu (örneğin VS Code üzerindeki Live Server eklentisi) ile projeyi ayağa kaldırın.
3. Tarayıcınızda http://127.0.0.1:5500 adresine giderek uygulamayı gizli veya normal sekmede açın
4. Eğer hiç uğraşmak istemezseniz "https://vellidr.github.io/foton-vibe/" adresini Chrome veya Safari tarayıcınza yapıştırıp sol üstteki üç nokltadan uygulama olarak yükle seçip sorunsuzca çalıştırabilirsiniz
5. 
