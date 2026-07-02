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
let currentGorevliId = null;
let allExams = [];

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
        
        const rows = await response.json();
        allExams = rows;
        
        // Eğer tek sınav varsa direkt göster
        if (rows.length === 1) {
            currentGorevliId = rows[0].id;
            displayResult(rows[0]);
        } else {
            // Birden fazla sınav varsa seçim ekranı göster
            displayExamSelection(rows);
        }
        
    } catch (error) {
        console.error('Sorgulama hatası:', error);
        showError('Bağlantı hatası. Lütfen internet bağlantınızı kontrol ediniz.');
    }
}

// Sınav seçim ekranını göster
function displayExamSelection(exams) {
    hideAllCards();
    
    const selectionHtml = `
        <div class="info-card" style="display: block;">
            <div class="card-header">
                <h2>🎯 Sınav Seçimi</h2>
                <p style="color: #666; font-size: 14px; margin-top: 8px;">
                    ${exams[0].ad} ${exams[0].soyad} adına ${exams.length} adet görevlendirme kaydı bulundu. 
                    Lütfen görmek istediğiniz sınavı seçiniz:
                </p>
            </div>
            <div class="card-body">
                <div class="exam-list" style="display: flex; flex-direction: column; gap: 12px;">
                    ${exams.map(exam => `
                        <button class="exam-button" onclick="selectExam(${exam.id})" 
                                style="padding: 16px; border: 2px solid #e1e8ed; border-radius: 8px; 
                                       background: white; cursor: pointer; text-align: left; transition: all 0.2s;
                                       font-family: inherit;">
                            <div style="font-weight: 600; font-size: 16px; color: #1a202c; margin-bottom: 4px;">
                                ${exam.sinav_adi || 'Sınav'}
                            </div>
                            <div style="font-size: 14px; color: #666;">
                                📅 ${formatDate(exam.sinav_tarihi)} • 🕐 ${exam.sinav_saati}
                            </div>
                            <div style="font-size: 13px; color: #888; margin-top: 4px;">
                                ${exam.gorevi} - ${exam.gorev_kodu || ''}
                            </div>
                        </button>
                    `).join('')}
                </div>
                <button class="btn btn-secondary" onclick="newSearch()" style="margin-top: 20px; width: 100%;">
                    ← Yeni Sorgulama
                </button>
            </div>
        </div>
        <style>
            .exam-button:hover {
                border-color: #4a90e2 !important;
                background: #f8fafc !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
        </style>
    `;
    
    // resultCard içine ekle
    resultCard.innerHTML = selectionHtml;
    resultCard.style.display = 'block';
}

// Sınav seçildiğinde
function selectExam(gorevliId) {
    const selectedExam = allExams.find(exam => exam.id === gorevliId);
    if (selectedExam) {
        currentGorevliId = gorevliId;
        displayResult(selectedExam);
    }
}

// Yeni sorgulama (global fonksiyon)
function newSearch() {
    hideAllCards();
    searchForm.reset();
    tcNoInput.focus();
    currentTcNo = '';
    currentGorevliId = null;
    allExams = [];
}

// Sonuçları göster
function displayResult(data) {
    hideAllCards();
    
    // TC no maskele
    const maskedTc = maskTcNo(data.tc_no);
    
    const resultHtml = `
        <div class="card-header">
            <h2>✅ Görevlendirme Bilgileri</h2>
        </div>
        <div class="card-body">
            ${allExams.length > 1 ? `
                <div class="info-section" style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #1976d2; font-size: 14px;">
                        ℹ️ ${allExams.length} sınavdan biri gösteriliyor. 
                        <button onclick="displayExamSelection(allExams)" 
                                style="background: none; border: none; color: #1976d2; text-decoration: underline; 
                                       cursor: pointer; font-weight: 600; padding: 0;">
                            Diğer sınavları görmek için tıklayın
                        </button>
                    </p>
                </div>
            ` : ''}
            
            <div class="info-section">
                <h3>👤 Görevli Bilgileri</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Ad Soyad:</label>
                        <span id="adSoyad">${data.ad} ${data.soyad}</span>
                    </div>
                    <div class="info-item">
                        <label>TC Kimlik No:</label>
                        <span id="tcKimlik">${maskedTc}</span>
                    </div>
                    <div class="info-item">
                        <label>Unvan:</label>
                        <span id="unvan">${data.unvan || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Görevi:</label>
                        <span id="gorevi">${data.gorevi || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Görev Yeri:</label>
                        <span id="gorevYeri">${data.gorev_yeri || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Görev Kodu:</label>
                        <span id="gorevKodu">${data.gorev_kodu || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h3>📋 Sınav Bilgileri</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Sınav Adı:</label>
                        <span id="sinavAdi">${data.sinav_adi || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Sınav Tarihi:</label>
                        <span id="sinavTarihi">${formatDate(data.sinav_tarihi) || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Sınav Saati:</label>
                        <span id="sinavSaati">${data.sinav_saati || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Sınav Yeri:</label>
                        <span id="sinavYeri">${data.sinav_yeri || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Bina:</label>
                        <span id="binaAdi">${data.bina_adi || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Bina Adresi:</label>
                        <span id="binaAdresi">${data.bina_adresi || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div class="button-group">
                <button id="downloadPdfBtn" class="btn btn-primary">
                    <span class="btn-icon">📄</span> Görevlendirme Belgesini İndir (PDF)
                </button>
                <button id="newSearchBtn" class="btn btn-secondary">
                    <span class="btn-icon">🔍</span> Yeni Sorgulama
                </button>
            </div>
        </div>
    `;
    
    resultCard.innerHTML = resultHtml;
    resultCard.style.display = 'block';
    
    // Event listener'ları yeniden ekle
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPdf);
    document.getElementById('newSearchBtn').addEventListener('click', newSearch);
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
async function downloadPdf() {
    if (!currentGorevliId) return;
    
    const btn = document.getElementById('downloadPdfBtn');
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> PDF Oluşturuluyor...';
        
        const response = await fetch(`${API_BASE}/api/pdf/gorevli/${currentGorevliId}`);
        
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
        
        btn.innerHTML = '<span class="btn-icon">📄</span> Görevlendirme Belgesini İndir (PDF)';
        btn.disabled = false;
        
    } catch (error) {
        console.error('PDF indirme hatası:', error);
        alert('PDF indirilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
        btn.innerHTML = '<span class="btn-icon">📄</span> Görevlendirme Belgesini İndir (PDF)';
        btn.disabled = false;
    }
}

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