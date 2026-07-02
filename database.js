const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Veritabanı dosya yolu
const DB_PATH = path.join(__dirname, 'gorevlendirme.db');

// Veritabanı bağlantısı
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Veritabanı bağlantı hatası:', err);
  } else {
    console.log('Veritabanına bağlandı: gorevlendirme.db');
    initDatabase();
  }
});

// Veritabanı tablolarını oluştur
function initDatabase() {
  // Sınav bilgileri tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS sinav_bilgileri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sinav_adi TEXT NOT NULL,
      sinav_tarihi TEXT NOT NULL,
      sinav_saati TEXT NOT NULL,
      sinav_yeri TEXT NOT NULL,
      bina_adi TEXT NOT NULL,
      bina_adresi TEXT NOT NULL,
      koordinatorluk_adresi TEXT,
      koordinatorluk_telefon TEXT,
      kurallar_metni TEXT,
      sinav_suresi TEXT DEFAULT '180 dakika',
      hazir_bulunma_saati TEXT DEFAULT '1 saat önce',
      olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('sinav_bilgileri tablosu oluşturma hatası:', err);
    } else {
      console.log('sinav_bilgileri tablosu hazır');
      
      // Mevcut tabloya yeni kolonları ekle (eğer yoksa)
      db.run(`ALTER TABLE sinav_bilgileri ADD COLUMN sinav_suresi TEXT DEFAULT '180 dakika'`, () => {});
      db.run(`ALTER TABLE sinav_bilgileri ADD COLUMN hazir_bulunma_saati TEXT DEFAULT '1 saat önce'`, () => {});
    }
  });

  // Görevliler tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS gorevliler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sinav_id INTEGER NOT NULL,
      tc_no TEXT NOT NULL,
      ad TEXT NOT NULL,
      soyad TEXT NOT NULL,
      unvan TEXT,
      gorevi TEXT NOT NULL,
      gorev_yeri TEXT NOT NULL,
      gorev_kodu TEXT,
      fotograf_yolu TEXT,
      olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sinav_id) REFERENCES sinav_bilgileri(id),
      UNIQUE(sinav_id, tc_no)
    )
  `, (err) => {
    if (err) {
      console.error('gorevliler tablosu oluşturma hatası:', err);
    } else {
      console.log('gorevliler tablosu hazır');
    }
  });
}

// Sınav bilgisi ekleme/güncelleme
function saveSinavBilgisi(data, callback) {
  const { id, sinav_adi, sinav_tarihi, sinav_saati, sinav_yeri, bina_adi, 
          bina_adresi, koordinatorluk_adresi, koordinatorluk_telefon, kurallar_metni,
          sinav_suresi, hazir_bulunma_saati } = data;
  
  if (id) {
    // Güncelleme
    const sql = `UPDATE sinav_bilgileri SET 
      sinav_adi = ?, sinav_tarihi = ?, sinav_saati = ?, sinav_yeri = ?,
      bina_adi = ?, bina_adresi = ?, koordinatorluk_adresi = ?, 
      koordinatorluk_telefon = ?, kurallar_metni = ?, sinav_suresi = ?, hazir_bulunma_saati = ?
      WHERE id = ?`;
    
    db.run(sql, [sinav_adi, sinav_tarihi, sinav_saati, sinav_yeri, bina_adi,
                 bina_adresi, koordinatorluk_adresi, koordinatorluk_telefon, 
                 kurallar_metni, sinav_suresi, hazir_bulunma_saati, id], callback);
  } else {
    // Yeni kayıt
    const sql = `INSERT INTO sinav_bilgileri 
      (sinav_adi, sinav_tarihi, sinav_saati, sinav_yeri, bina_adi, bina_adresi,
       koordinatorluk_adresi, koordinatorluk_telefon, kurallar_metni, sinav_suresi, hazir_bulunma_saati)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [sinav_adi, sinav_tarihi, sinav_saati, sinav_yeri, bina_adi,
                 bina_adresi, koordinatorluk_adresi, koordinatorluk_telefon, 
                 kurallar_metni, sinav_suresi, hazir_bulunma_saati], callback);
  }
}

// Tüm sınav bilgilerini getir
function getAllSinavlar(callback) {
  db.all('SELECT * FROM sinav_bilgileri ORDER BY id DESC', callback);
}

// Belirli bir sınav bilgisini getir
function getSinavById(id, callback) {
  db.get('SELECT * FROM sinav_bilgileri WHERE id = ?', [id], callback);
}

// Görevli ekleme (tekli)
function addGorevli(data, callback) {
  const { sinav_id, tc_no, ad, soyad, unvan, gorevi, gorev_yeri, gorev_kodu, fotograf_yolu } = data;
  
  const sql = `INSERT OR REPLACE INTO gorevliler 
    (sinav_id, tc_no, ad, soyad, unvan, gorevi, gorev_yeri, gorev_kodu, fotograf_yolu)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [sinav_id, tc_no, ad, soyad, unvan, gorevi, gorev_yeri, gorev_kodu, fotograf_yolu], callback);
}

// Görevli ekleme (toplu)
function addGorevlilerBulk(gorevliler, callback) {
  const sql = `INSERT OR REPLACE INTO gorevliler 
    (sinav_id, tc_no, ad, soyad, unvan, gorevi, gorev_yeri, gorev_kodu, fotograf_yolu)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.serialize(() => {
    const stmt = db.prepare(sql);
    
    gorevliler.forEach(g => {
      stmt.run([g.sinav_id, g.tc_no, g.ad, g.soyad, g.unvan, g.gorevi, 
                g.gorev_yeri, g.gorev_kodu, g.fotograf_yolu]);
    });
    
    stmt.finalize(callback);
  });
}

// TC no ile görevli sorgulama (tüm sınavlar)
function getGorevliByTcNo(tc_no, callback) {
  const sql = `
    SELECT 
      g.id,
      g.sinav_id,
      g.tc_no,
      g.ad,
      g.soyad,
      g.unvan,
      g.gorevi,
      g.gorev_yeri,
      g.gorev_kodu,
      g.fotograf_yolu,
      s.sinav_adi,
      s.sinav_tarihi,
      s.sinav_saati,
      s.sinav_yeri,
      s.bina_adi,
      s.bina_adresi,
      s.koordinatorluk_adresi,
      s.koordinatorluk_telefon,
      s.kurallar_metni,
      s.sinav_suresi,
      s.hazir_bulunma_saati
    FROM gorevliler g
    INNER JOIN sinav_bilgileri s ON g.sinav_id = s.id
    WHERE g.tc_no = ?
    ORDER BY s.sinav_tarihi DESC
  `;
  
  db.all(sql, [tc_no], callback);
}

// ID ile görevli getir
function getGorevliById(id, callback) {
  db.get('SELECT * FROM gorevliler WHERE id = ?', [id], callback);
}

// Görevli güncelleme
function updateGorevli(id, data, callback) {
  const { tc_no, ad, soyad, unvan, gorevi, gorev_yeri, gorev_kodu, fotograf_yolu } = data;
  
  const sql = `UPDATE gorevliler SET 
    tc_no = ?, ad = ?, soyad = ?, unvan = ?, gorevi = ?, 
    gorev_yeri = ?, gorev_kodu = ?, fotograf_yolu = ?
    WHERE id = ?`;
  
  db.run(sql, [tc_no, ad, soyad, unvan, gorevi, gorev_yeri, gorev_kodu, fotograf_yolu, id], callback);
}

// Sınava göre görevlileri listele
function getGorevlilerBySinavId(sinav_id, callback) {
  db.all('SELECT * FROM gorevliler WHERE sinav_id = ? ORDER BY soyad, ad', [sinav_id], callback);
}

// Görevli silme
function deleteGorevli(id, callback) {
  db.run('DELETE FROM gorevliler WHERE id = ?', [id], callback);
}

// Sınava ait tüm görevlileri silme
function deleteGorevlilerBySinavId(sinav_id, callback) {
  db.run('DELETE FROM gorevliler WHERE sinav_id = ?', [sinav_id], callback);
}

// Veritabanını kapat
function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('Veritabanı kapatma hatası:', err);
    } else {
      console.log('Veritabanı bağlantısı kapatıldı');
    }
  });
}

module.exports = {
  db,
  saveSinavBilgisi,
  getAllSinavlar,
  getSinavById,
  addGorevli,
  addGorevlilerBulk,
  getGorevliByTcNo,
  getGorevliById,
  updateGorevli,
  getGorevlilerBySinavId,
  deleteGorevli,
  deleteGorevlilerBySinavId,
  closeDatabase
};
