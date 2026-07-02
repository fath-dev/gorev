// Admin Paneli JavaScript
const API_BASE = '';

// DOM Elementleri
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const notification = document.getElementById('notification');

// Sınav Tab
const sinavForm = document.getElementById('sinavForm');
const sinavSelect = document.getElementById('sinavSelect');
const resetFormBtn = document.getElementById('resetFormBtn');

// Görevli Tab
const gorevliSinavSelect = document.getElementById('gorevliSinavSelect');
const excelUploadForm = document.getElementById('excelUploadForm');
const excelFileInput = document.getElementById('excelFile');
const fileNameSpan = document.getElementById('fileName');
const gorevliForm = document.getElementById('gorevliForm');
const gorevliListesi = document.getElementById('gorevliListesi');

let selectedSinavId = null;
let currentGorevliSinavId = null;

// Tab Sistemi
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Tüm tab butonlarını pasif yap
        tabBtns.forEach(b => b.classList.remove('active'));
        // Tıklanan butonu aktif yap
        btn.classList.add('active');
        
        // Tüm tab içeriklerini gizle
        tabContents.forEach(content => content.classList.remove('active'));
        // İlgili içeriği göster
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        // Görevli tab'ına geçildiğinde sınavları yükle
        if (tabName === 'gorevli') {
            loadSinavlarForGorevli();
        }
    });
});

// Sayfa yüklendiğinde sınavları yükle
window.addEventListener('DOMContentLoaded', () => {
    loadSinavlar();
});

// Bildirim göster
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Sınav listesini yükle
async function loadSinavlar() {
    try {
        const response = await fetch(`${API_BASE}/api/sinav`);
        if (!response.ok) throw new Error('Sınav listesi yüklenemedi');
        
        const sinavlar = await response.json();
        
        // Select'i temizle
        sinavSelect.innerHTML = '<option value="">Yeni Sınav Oluştur</option>';
        
        // Sınavları ekle
        sinavlar.forEach(sinav => {
            const option = document.createElement('option');
            option.value = sinav.id;
            option.textContent = `${sinav.sinav_adi} - ${formatDate(sinav.sinav_tarihi)}`;
            sinavSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Sınav listesi yükleme hatası:', error);
        showNotification('Sınav listesi yüklenirken hata oluştu', 'error');
    }
}

// Sınav seçildiğinde formu doldur
sinavSelect.addEventListener('change', async (e) => {
    const sinavId = e.target.value;
    
    if (!sinavId) {
        // Yeni sınav - formu temizle
        sinavForm.reset();
        document.getElementById('sinavId').value = '';
        selectedSinavId = null;
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/sinav/${sinavId}`);
        if (!response.ok) throw new Error('Sınav bilgisi yüklenemedi');
        
        const sinav = await response.json();
        selectedSinavId = sinav.id;
        
        // Formu doldur
        document.getElementById('sinavId').value = sinav.id;
        document.getElementById('sinavAdi').value = sinav.sinav_adi;
        document.getElementById('sinavTarihi').value = sinav.sinav_tarihi;
        document.getElementById('sinavSaati').value = sinav.sinav_saati;
        document.getElementById('sinavSuresi').value = sinav.sinav_suresi || '180 dakika';
        document.getElementById('hazirBulunmaSaati').value = sinav.hazir_bulunma_saati || '1 saat önce';
        document.getElementById('sinavYeri').value = sinav.sinav_yeri;
        document.getElementById('binaAdi').value = sinav.bina_adi;
        document.getElementById('binaAdresi').value = sinav.bina_adresi;
        document.getElementById('koordinatorlukAdresi').value = sinav.koordinatorluk_adresi || '';
        document.getElementById('koordinatorlukTelefon').value = sinav.koordinatorluk_telefon || '';
        document.getElementById('kurallarMetni').value = sinav.kurallar_metni || '';
        
    } catch (error) {
        console.error('Sınav yükleme hatası:', error);
        showNotification('Sınav bilgisi yüklenirken hata oluştu', 'error');
    }
});

// Sınav formu submit
sinavForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(sinavForm);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE}/api/sinav`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Kayıt başarısız');
        }
        
        const result = await response.json();
        showNotification(result.message || 'Sınav bilgisi başarıyla kaydedildi', 'success');
        
        // Sınav listesini yenile
        await loadSinavlar();
        
        // Yeni eklenen sınavı seç
        if (result.id) {
            sinavSelect.value = result.id;
            selectedSinavId = result.id;
        }
        
    } catch (error) {
        console.error('Sınav kayıt hatası:', error);
        showNotification(error.message || 'Sınav kaydedilirken hata oluştu', 'error');
    }
});

// Formu temizle
resetFormBtn.addEventListener('click', () => {
    sinavForm.reset();
    document.getElementById('sinavId').value = '';
    sinavSelect.value = '';
    selectedSinavId = null;
});

// Görevli tab'ı için sınavları yükle
async function loadSinavlarForGorevli() {
    try {
        const response = await fetch(`${API_BASE}/api/sinav`);
        if (!response.ok) throw new Error('Sınav listesi yüklenemedi');
        
        const sinavlar = await response.json();
        
        // Select'i temizle
        gorevliSinavSelect.innerHTML = '<option value="">Lütfen sınav seçiniz</option>';
        
        // Sınavları ekle
        sinavlar.forEach(sinav => {
            const option = document.createElement('option');
            option.value = sinav.id;
            option.textContent = `${sinav.sinav_adi} - ${formatDate(sinav.sinav_tarihi)}`;
            gorevliSinavSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Sınav listesi yükleme hatası:', error);
        showNotification('Sınav listesi yüklenirken hata oluştu', 'error');
    }
}

// Görevli sınavı seçildiğinde
gorevliSinavSelect.addEventListener('change', (e) => {
    currentGorevliSinavId = e.target.value;
    
    if (currentGorevliSinavId) {
        loadGorevliListesi(currentGorevliSinavId);
    } else {
        gorevliListesi.innerHTML = '<p class="no-data">Lütfen önce bir sınav seçiniz</p>';
    }
});

// Excel dosyası seçildiğinde
excelFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameSpan.textContent = file.name;
    } else {
        fileNameSpan.textContent = '';
    }
});

// Excel yükleme
excelUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentGorevliSinavId) {
        showNotification('Lütfen önce bir sınav seçiniz', 'error');
        return;
    }
    
    const file = excelFileInput.files[0];
    if (!file) {
        showNotification('Lütfen bir Excel dosyası seçiniz', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('excel', file);
    formData.append('sinav_id', currentGorevliSinavId);
    
    try {
        const response = await fetch(`${API_BASE}/api/gorevli/bulk`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Yükleme başarısız');
        }
        
        const result = await response.json();
        showNotification(result.message || 'Görevliler başarıyla yüklendi', 'success');
        
        // Formu temizle
        excelUploadForm.reset();
        fileNameSpan.textContent = '';
        
        // Listeyi yenile
        loadGorevliListesi(currentGorevliSinavId);
        
    } catch (error) {
        console.error('Excel yükleme hatası:', error);
        showNotification(error.message || 'Excel yüklenirken hata oluştu', 'error');
    }
});

// Tekli görevli ekleme
gorevliForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentGorevliSinavId) {
        showNotification('Lütfen önce bir sınav seçiniz', 'error');
        return;
    }
    
    try {
        let fotografYolu = null;
        
        // Fotoğraf varsa önce yükle
        const fotografInput = document.getElementById('gorevliFotograf');
        if (fotografInput.files.length > 0) {
            const formData = new FormData();
            formData.append('photo', fotografInput.files[0]);
            
            const uploadResponse = await fetch(`${API_BASE}/api/upload/photo`, {
                method: 'POST',
                body: formData
            });
            
            if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                fotografYolu = uploadResult.filename;
            }
        }
        
        // Görevli bilgilerini hazırla
        const data = {
            sinav_id: currentGorevliSinavId,
            tc_no: document.getElementById('gorevliTcNo').value,
            ad: document.getElementById('gorevliAd').value,
            soyad: document.getElementById('gorevliSoyad').value,
            unvan: document.getElementById('gorevliUnvan').value,
            gorevi: document.getElementById('gorevliGorevi').value,
            gorev_yeri: document.getElementById('gorevliGorevYeri').value,
            gorev_kodu: document.getElementById('gorevliGorevKodu').value,
            fotograf_yolu: fotografYolu
        };
        
        const response = await fetch(`${API_BASE}/api/gorevli`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Kayıt başarısız');
        }
        
        const result = await response.json();
        showNotification(result.message || 'Görevli başarıyla eklendi', 'success');
        
        // Formu temizle
        gorevliForm.reset();
        
        // Listeyi yenile
        loadGorevliListesi(currentGorevliSinavId);
        
    } catch (error) {
        console.error('Görevli ekleme hatası:', error);
        showNotification(error.message || 'Görevli eklenirken hata oluştu', 'error');
    }
});

// Görevli listesini yükle
async function loadGorevliListesi(sinavId) {
    try {
        const response = await fetch(`${API_BASE}/api/gorevli/sinav/${sinavId}`);
        if (!response.ok) throw new Error('Görevli listesi yüklenemedi');
        
        const gorevliler = await response.json();
        
        if (gorevliler.length === 0) {
            gorevliListesi.innerHTML = '<p class="no-data">Bu sınav için henüz görevli eklenmemiş</p>';
            return;
        }
        
        // Tablo oluştur
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>TC No</th>
                        <th>Ad Soyad</th>
                        <th>Unvan</th>
                        <th>Görevi</th>
                        <th>Görev Yeri</th>
                        <th>Görev Kodu</th>
                        <th>İşlem</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        gorevliler.forEach(gorevli => {
            html += `
                <tr>
                    <td>${maskTcNo(gorevli.tc_no)}</td>
                    <td>${gorevli.ad} ${gorevli.soyad}</td>
                    <td>${gorevli.unvan || '-'}</td>
                    <td>${gorevli.gorevi}</td>
                    <td>${gorevli.gorev_yeri}</td>
                    <td>${gorevli.gorev_kodu || '-'}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="editGorevli(${gorevli.id})" style="margin-right: 8px;">
                            ✏️ Düzenle
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="deleteGorevli(${gorevli.id})">
                            🗑️ Sil
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        gorevliListesi.innerHTML = html;
        
    } catch (error) {
        console.error('Görevli listesi yükleme hatası:', error);
        gorevliListesi.innerHTML = '<p class="no-data">Görevli listesi yüklenirken hata oluştu</p>';
    }
}

// Görevli silme
window.deleteGorevli = async function(id) {
    if (!confirm('Bu görevliyi silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/gorevli/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Silme işlemi başarısız');
        }
        
        showNotification('Görevli başarıyla silindi', 'success');
        
        // Listeyi yenile
        if (currentGorevliSinavId) {
            loadGorevliListesi(currentGorevliSinavId);
        }
        
    } catch (error) {
        console.error('Görevli silme hatası:', error);
        showNotification('Görevli silinirken hata oluştu', 'error');
    }
};

// TC no sadece rakam girişi
document.getElementById('gorevliTcNo').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
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
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
}

// Görevli düzenleme
let editingGorevliId = null;

window.editGorevli = async function(id) {
    editingGorevliId = id;
    
    try {
        // Görevli bilgilerini al
        const response = await fetch(`${API_BASE}/api/gorevli/detail/${id}`);
        if (!response.ok) throw new Error('Görevli bilgisi alınamadı');
        
        const gorevli = await response.json();
        
        // Modal formu doldur
        document.getElementById('editGorevliId').value = gorevli.id;
        document.getElementById('editTcNo').value = gorevli.tc_no;
        document.getElementById('editAd').value = gorevli.ad;
        document.getElementById('editSoyad').value = gorevli.soyad;
        document.getElementById('editUnvan').value = gorevli.unvan || '';
        document.getElementById('editGorevi').value = gorevli.gorevi;
        document.getElementById('editGorevYeri').value = gorevli.gorev_yeri;
        document.getElementById('editGorevKodu').value = gorevli.gorev_kodu || '';
        document.getElementById('currentFotografYolu').value = gorevli.fotograf_yolu || '';
        
        // Mevcut fotoğraf varsa göster
        const currentPhotoDiv = document.getElementById('currentPhotoPreview');
        if (gorevli.fotograf_yolu) {
            currentPhotoDiv.innerHTML = `
                <img src="/uploads/${gorevli.fotograf_yolu}" 
                     alt="Mevcut Fotoğraf" 
                     style="max-width: 150px; max-height: 150px; border-radius: 8px;">
                <p style="margin-top: 8px; font-size: 13px; color: #666;">Mevcut Fotoğraf</p>
            `;
        } else {
            currentPhotoDiv.innerHTML = '<p style="color: #999;">Fotoğraf yok</p>';
        }
        
        // Modal'ı aç
        document.getElementById('editModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Görevli bilgisi yükleme hatası:', error);
        showNotification('Görevli bilgisi yüklenirken hata oluştu', 'error');
    }
};

// Modal kapat
window.closeEditModal = function() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editGorevliForm').reset();
    editingGorevliId = null;
};

// Düzenleme formunu kaydet
document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editGorevliForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!editingGorevliId) return;
            
            try {
                let fotografYolu = document.getElementById('currentFotografYolu').value;
                
                // Yeni fotoğraf yüklendiyse
                const newPhotoInput = document.getElementById('editFotograf');
                if (newPhotoInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('photo', newPhotoInput.files[0]);
                    
                    const uploadResponse = await fetch(`${API_BASE}/api/upload/photo`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (uploadResponse.ok) {
                        const uploadResult = await uploadResponse.json();
                        fotografYolu = uploadResult.filename;
                    }
                }
                
                // Görevli bilgilerini hazırla
                const data = {
                    tc_no: document.getElementById('editTcNo').value,
                    ad: document.getElementById('editAd').value,
                    soyad: document.getElementById('editSoyad').value,
                    unvan: document.getElementById('editUnvan').value,
                    gorevi: document.getElementById('editGorevi').value,
                    gorev_yeri: document.getElementById('editGorevYeri').value,
                    gorev_kodu: document.getElementById('editGorevKodu').value,
                    fotograf_yolu: fotografYolu
                };
                
                const response = await fetch(`${API_BASE}/api/gorevli/${editingGorevliId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Güncelleme başarısız');
                }
                
                showNotification('Görevli başarıyla güncellendi', 'success');
                closeEditModal();
                
                // Listeyi yenile
                if (currentGorevliSinavId) {
                    loadGorevliListesi(currentGorevliSinavId);
                }
                
            } catch (error) {
                console.error('Görevli güncelleme hatası:', error);
                showNotification(error.message || 'Görevli güncellenirken hata oluştu', 'error');
            }
        });
    }
});

// TC no sadece rakam girişi (edit modal)
document.addEventListener('DOMContentLoaded', () => {
    const editTcInput = document.getElementById('editTcNo');
    if (editTcInput) {
        editTcInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
});
