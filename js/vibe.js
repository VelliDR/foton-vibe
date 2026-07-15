/**
 * VIBE.JS - Fotoğrafçının Yol Arkadaşı (Şiirsel ve Felsefi Fikir Havuzu)
 */

const FIKIR_HAVUZU = {
    "sabah": [
        {
            baslik: "SABAH 100 PUAN",
            metin: "Kontrasta sonuna kadar zorlanmamış, gölgeleri yumuşak ve Helios lensinin o merkez dışı netlik kusurlarıyla yıkanmış organik bir kadraj ara."
        },
        {
            baslik: "AYAZDA IŞIK SERPİNTİSİ",
            metin: "Eski mekanik flaş gövdelerin perde kutusuna sadık kal. Kadrajın bir köşesinden içeri sızan, kontrolsüz bir ışık patlaması (lens flare) ile sabahın ilk çiğ ışığını yıka."
        },
        {
            baslik: "PUS VİZYONU",
            metin: "Çiğ, ayaz ve pus... Sisli bir sabahın sessizliğini hissettirecek şekilde loş ve sakin tonları barındıran, kadrajı asimetrik bölen bir kompozisyon kurgula."
        }
    ],
    "gunduz": [
        {
            baslik: "ANLAMSIZIN ANALİZİ",
            metin: "İnsan eliyle yapılmış paslı bir metal/beton blok ile bir bitkinin iç içe geçtiği, renk doygunluğu dengesiz bükülmüş, sanki başka bir zamana aitmiş gibi duran o absürt detayı kovala."
        },
        {
            baslik: "MUTLAK KOPUKLUK",
            metin: "Kadrajın en az %60'ını kaplayan mutlak bir boşluk inşa et. O boşluğun bir köşesine sıkışmış, tek bir zayıf ve aykırı figür bul."
        },
        {
            baslik: "SİMETRİK KAOS",
            metin: "Şehir hayatının o ritmik ama ruhsuz tekrarlarını kadraja hapset. Paralel çizgilerin ortasında duran tek bir düzensiz yaşam belirtisi ara."
        }
    ],
    "gece": [
        {
            baslik: "AYNASIZ SIZISI",
            metin: "Eski analog lenslerin o kusurlu ama organik dokusunu hisset. Kadraja giren bir sokak lambasının yarattığı hareler hatasız bir sensörün piksellerinden çok daha gerçektir."
        },
        {
            baslik: "SİLİK RUH",
            metin: "Manuel lensini tamamen odağın dışına (out of focus) al. Karşındaki dünyayı renk lekelerinden ibaret, soyut bir rüya gibi kaydet."
        },
        {
            baslik: "MUTLAK REPOZİSYON",
            metin: "Sokaktaki o sert gölgelerin içine gizlen. Sadece yapay ışığın vurduğu anlık yüzleri veya objeleri, çevresindeki karanlıktan tamamen yalıtarak yakala."
        }
    ],
    "her_zaman": [
        {
            baslik: "SİNSİ SIZI",
            metin: "Telefon kameranı cebinden çıkartırken yanlışlıkla çekilmiş gibi duran, fazla gerçek ve gelişigüzel kadrajlar üret. Kusurdaki samimiyeti hisset."
        },
        {
            baslik: "KİT-LENS SAMİMİYETİ",
            metin: "En pahalı ekipmanların o steril dünyasını reddet. Elindeki en basit optiğin sınırlarını zorla, onun optik bükülmelerini sanata dönüştür."
        }
    ]
};

/**
 * Saate göre zaman dilimini (slot) belirler.
 */
function getTimeSlot(hour) {
    if (hour >= 5 && hour < 11) {
        return "sabah";
    } else if (hour >= 11 && hour < 18) {
        return "gunduz";
    } else {
        return "gece";
    }
}

/**
 * Güncel saat dilimine göre rastgele bir vizyon/vibe seçer.
 */
export function getRandomVibe() {
    const currentHour = new Date().getHours();
    const slot = getTimeSlot(currentHour);
    
    // Aktif zaman dilimindeki fikirler ile her zaman geçerli olan fikirleri birleştiriyoruz
    const havuz = [...FIKIR_HAVUZU[slot], ...FIKIR_HAVUZU["her_zaman"]];
    
    // Rastgele birini seç
    const randomIndex = Math.floor(Math.random() * havuz.length);
    
    return {
        slot: slot.toUpperCase(),
        ...havuz[randomIndex]
    };
}