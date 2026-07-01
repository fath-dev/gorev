// Ana sayfa JavaScript
const API_BASE = '';

// DOM Elementleri
const searchForm = document.getElementById('searchForm');
const tcNoInput = document.getElementById('tcNo');
const searchCard = document.querySelector('.search-card');
const resultCard = document.getElementById('resultCard');
const errorCard = document.getElementById('errorCard');
const loadingCard = document.getElementById('loadingCard');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const newSearchBtn = document.getElementById('newSearchBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');

let currentTcNo = '';

// TC kimlik numarası sadece rakam girişi
tcNoInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

// Form submit
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const tcNo = tcNoInput.value.trim();
    
    if (tcNo.length !== 11) {
        showError('Lütfen 11 haneli TC kimlik numaranızı giriniz');
        return;
    }
    
    currentTcNo = tcNo;
    await searchGorevli(tcNo);
});

// Görevli sorgulama
async function searchGorevli(tcNo) {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/gorevli/${tcNo}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showError('Girdiğiniz TC kimlik numarası ile ilişkilendirilmiş bir görevlendirme kaydı bulunamadı.');
            } else {
                const error = await response.json();
                showError(error.error || 'Bir hata oluştu. Lütfen tekrar deneyiniz.');
            }
            return;
        }
        
        const data = await response.json();
        displayResult(data);
        
    } catch (error) {
        console.error('Sorgulama hatası:', error);
        showError('Bağlantı hatası. Lütfen internet bağlantınızı kontrol ediniz.');
    }
}

// Sonuçları göster
function displayResult(data) {
    hideAllCards();
    
    // TC no maskele
    const maskedTc = maskTcNo(data.tc_no);
    
    // Görevli bilgileri
    document.getElementById('adSoyad').textContent = `${data.ad} ${data.soyad}`;
    document.getElementById('tcKimlik').textContent = maskedTc;
    document.getElementById('unvan').textContent = data.unvan || '-';
    document.getElementById('gorevi').textContent = data.gorevi || '-';
    document.getElementById('gorevYeri').textContent = data.gorev_yeri || '-';
    document.getElementById('gorevKodu').textContent = data.gorev_kodu || '-';
    
    // Sınav bilgileri
    document.getElementById('sinavAdi').textContent = data.sinav_adi || '-';
    document.getElementById('sinavTarihi').textContent = formatDate(data.sinav_tarihi) || '-';
    document.getElementById('sinavSaati').textContent = data.sinav_saati || '-';
    document.getElementById('sinavYeri').textContent = data.sinav_yeri || '-';
    document.getElementById('binaAdi').textContent = data.bina_adi || '-';
    document.getElementById('binaAdresi').textContent = data.bina_adresi || '-';
    
    resultCard.style.display = 'block';
}

// Hata göster
function showError(message) {
    hideAllCards();
    document.getElementById('errorMessage').textContent = message;
    errorCard.style.display = 'block';
}

// Yükleniyor göster
function showLoading() {
    hideAllCards();
    loadingCard.style.display = 'block';
}

// Tüm kartları gizle
function hideAllCards() {
    resultCard.style.display = 'none';
    errorCard.style.display = 'none';
    loadingCard.style.display = 'none';
}

// PDF indir
downloadPdfBtn.addEventListener('click', async () => {
    if (!currentTcNo) return;
    
    try {
        downloadPdfBtn.disabled = true;
        downloadPdfBtn.innerHTML = '<span class="btn-icon">⏳</span> PDF Oluşturuluyor...';
        
        const response = await fetch(`${API_BASE}/api/pdf/${currentTcNo}`);
        
        if (!response.ok) {
            throw new Error('PDF oluşturulamadı');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gorevlendirme-${currentTcNo}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        downloadPdfBtn.innerHTML = '<span class="btn-icon">📄</span> Görevlendirme Belgesini İndir (PDF)';
        downloadPdfBtn.disabled = false;
        
    } catch (error) {
        console.error('PDF indirme hatası:', error);
        alert('PDF indirilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
        downloadPdfBtn.innerHTML = '<span class="btn-icon">📄</span> Görevlendirme Belgesini İndir (PDF)';
        downloadPdfBtn.disabled = false;
    }
});

// Yeni sorgulama
newSearchBtn.addEventListener('click', () => {
    hideAllCards();
    searchForm.reset();
    tcNoInput.focus();
    currentTcNo = '';
});

// Tekrar dene
tryAgainBtn.addEventListener('click', () => {
    hideAllCards();
    tcNoInput.focus();
});

// Yardımcı fonksiyonlar

// TC no maskele (19******840)
function maskTcNo(tcNo) {
    if (!tcNo || tcNo.length !== 11) return tcNo;
    return tcNo.substring(0, 2) + '******' + tcNo.substring(9);
}

// Tarih formatla
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    
    return `${date.getDate()} ${aylar[date.getMonth()]} ${date.getFullYear()} (${gunler[date.getDay()]})`;
}

// Sayfa yüklendiğinde TC input'a focus
window.addEventListener('DOMContentLoaded', () => {
    tcNoInput.focus();
});