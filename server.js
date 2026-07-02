const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const db = require('./database');
const { generatePDF } = require('./pdfGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Uploads klasörünü oluştur
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer yapılandırması - Fotoğraf yükleme
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece JPG, JPEG ve PNG formatları desteklenir!'));
    }
  }
});

// Multer yapılandırması - Excel yükleme
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece Excel dosyaları (.xlsx, .xls) desteklenir!'));
    }
  }
});

// API Routes

// Sınav bilgisi kaydetme/güncelleme
app.post('/api/sinav', (req, res) => {
  db.saveSinavBilgisi(req.body, function(err) {
    if (err) {
      console.error('Sınav kaydı hatası:', err);
      return res.status(500).json({ error: 'Sınav bilgisi kaydedilemedi', details: err.message });
    }
    res.json({ success: true, id: this.lastID, message: 'Sınav bilgisi kaydedildi' });
  });
});

// Tüm sınavları listele
app.get('/api/sinav', (req, res) => {
  db.getAllSinavlar((err, rows) => {
    if (err) {
      console.error('Sınav listesi hatası:', err);
      return res.status(500).json({ error: 'Sınav listesi alınamadı' });
    }
    res.json(rows);
  });
});

// Belirli bir sınavı getir
app.get('/api/sinav/:id', (req, res) => {
  db.getSinavById(req.params.id, (err, row) => {
    if (err) {
      console.error('Sınav getirme hatası:', err);
      return res.status(500).json({ error: 'Sınav bilgisi alınamadı' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Sınav bulunamadı' });
    }
    res.json(row);
  });
});

// Fotoğraf yükleme
app.post('/api/upload/photo', photoUpload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fotoğraf yüklenmedi' });
  }
  res.json({ 
    success: true, 
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`
  });
});

// Uploads klasörüne erişim
app.use('/uploads', express.static(uploadsDir));

// Tekli görevli ekleme
app.post('/api/gorevli', (req, res) => {
  db.addGorevli(req.body, function(err) {
    if (err) {
      console.error('Görevli ekleme hatası:', err);
      return res.status(500).json({ error: 'Görevli eklenemedi', details: err.message });
    }
    res.json({ success: true, id: this.lastID, message: 'Görevli eklendi' });
  });
});

// Excel'den toplu görevli yükleme
app.post('/api/gorevli/bulk', excelUpload.single('excel'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Excel dosyası yüklenmedi' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel dosyası boş' });
    }

    const sinav_id = req.body.sinav_id;
    if (!sinav_id) {
      return res.status(400).json({ error: 'Sınav ID belirtilmedi' });
    }

    // Excel verilerini dönüştür
    const gorevliler = data.map(row => ({
      sinav_id: sinav_id,
      tc_no: String(row['TC No'] || row['tc_no'] || row['TC'] || '').trim(),
      ad: String(row['Ad'] || row['ad'] || row['Adı'] || '').trim(),
      soyad: String(row['Soyad'] || row['soyad'] || row['Soyadı'] || '').trim(),
      unvan: String(row['Unvan'] || row['unvan'] || '').trim(),
      gorevi: String(row['Görevi'] || row['gorevi'] || row['Görev'] || '').trim(),
      gorev_yeri: String(row['Görev Yeri'] || row['gorev_yeri'] || row['Görev Yeri'] || '').trim(),
      gorev_kodu: String(row['Görev Kodu'] || row['gorev_kodu'] || '').trim(),
      fotograf_yolu: null
    }));

    // Geçersiz kayıtları filtrele
    const validGorevliler = gorevliler.filter(g => g.tc_no && g.ad && g.soyad && g.gorevi && g.gorev_yeri);

    if (validGorevliler.length === 0) {
      return res.status(400).json({ 
        error: 'Geçerli görevli kaydı bulunamadı. Excel dosyasında "TC No", "Ad", "Soyad", "Görevi" ve "Görev Yeri" sütunları olmalıdır.' 
      });
    }

    // Toplu ekleme
    db.addGorevlilerBulk(validGorevliler, (err) => {
      if (err) {
        console.error('Toplu görevli ekleme hatası:', err);
        return res.status(500).json({ error: 'Görevliler eklenemedi', details: err.message });
      }
      res.json({ 
        success: true, 
        message: `${validGorevliler.length} görevli başarıyla eklendi`,
        total: data.length,
        success_count: validGorevliler.length,
        skipped: data.length - validGorevliler.length
      });
    });

  } catch (error) {
    console.error('Excel işleme hatası:', error);
    res.status(500).json({ error: 'Excel dosyası işlenirken hata oluştu', details: error.message });
  }
});

// TC no ile görevli sorgulama (tüm sınavlar)
app.get('/api/gorevli/:tc', (req, res) => {
  const tc_no = req.params.tc;
  
  db.getGorevliByTcNo(tc_no, (err, rows) => {
    if (err) {
      console.error('Görevli sorgulama hatası:', err);
      return res.status(500).json({ error: 'Görevli sorgulanamadı' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Görevli bulunamadı' });
    }
    res.json(rows);
  });
});

// Sınava göre görevlileri listele
app.get('/api/gorevli/sinav/:id', (req, res) => {
  db.getGorevlilerBySinavId(req.params.id, (err, rows) => {
    if (err) {
      console.error('Görevli listesi hatası:', err);
      return res.status(500).json({ error: 'Görevli listesi alınamadı' });
    }
    res.json(rows);
  });
});

// Görevli detay (ID ile)
app.get('/api/gorevli/detail/:id', (req, res) => {
  db.getGorevliById(req.params.id, (err, row) => {
    if (err) {
      console.error('Görevli detay hatası:', err);
      return res.status(500).json({ error: 'Görevli detayı alınamadı' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Görevli bulunamadı' });
    }
    res.json(row);
  });
});

// Görevli güncelleme
app.put('/api/gorevli/:id', (req, res) => {
  const { id } = req.params;
  const data = {
    tc_no: req.body.tc_no,
    ad: req.body.ad,
    soyad: req.body.soyad,
    unvan: req.body.unvan,
    gorevi: req.body.gorevi,
    gorev_yeri: req.body.gorev_yeri,
    gorev_kodu: req.body.gorev_kodu,
    fotograf_yolu: req.body.fotograf_yolu
  };
  
  db.updateGorevli(id, data, function(err) {
    if (err) {
      console.error('Görevli güncelleme hatası:', err);
      return res.status(500).json({ error: 'Görevli güncellenemedi', details: err.message });
    }
    res.json({ success: true, message: 'Görevli güncellendi' });
  });
});

// Görevli silme
app.delete('/api/gorevli/:id', (req, res) => {
  db.deleteGorevli(req.params.id, function(err) {
    if (err) {
      console.error('Görevli silme hatası:', err);
      return res.status(500).json({ error: 'Görevli silinemedi' });
    }
    res.json({ success: true, message: 'Görevli silindi' });
  });
});

// PDF oluşturma ve indirme (TC ile - ilk sınav)
app.get('/api/pdf/:tc', async (req, res) => {
  const tc_no = req.params.tc;
  
  db.getGorevliByTcNo(tc_no, async (err, rows) => {
    if (err) {
      console.error('Görevli sorgulama hatası:', err);
      return res.status(500).json({ error: 'Görevli sorgulanamadı' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Görevli bulunamadı' });
    }

    try {
      // İlk sınavı al
      const data = rows[0];
      const pdfBuffer = await generatePDF(data);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=gorevlendirme-${tc_no}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      res.status(500).json({ error: 'PDF oluşturulamadı', details: error.message });
    }
  });
});

// PDF oluşturma (Görevli ID ile)
app.get('/api/pdf/gorevli/:id', async (req, res) => {
  const gorevli_id = req.params.id;
  
  // Önce görevli bilgisini al
  db.getGorevliById(gorevli_id, async (err, gorevli) => {
    if (err) {
      console.error('Görevli sorgulama hatası:', err);
      return res.status(500).json({ error: 'Görevli sorgulanamadı' });
    }
    if (!gorevli) {
      return res.status(404).json({ error: 'Görevli bulunamadı' });
    }

    // Sınav bilgisini al
    db.getSinavById(gorevli.sinav_id, async (err, sinav) => {
      if (err) {
        console.error('Sınav sorgulama hatası:', err);
        return res.status(500).json({ error: 'Sınav bilgisi alınamadı' });
      }
      if (!sinav) {
        return res.status(404).json({ error: 'Sınav bulunamadı' });
      }

      try {
        // Görevli ve sınav bilgilerini birleştir
        const data = { ...gorevli, ...sinav };
        const pdfBuffer = await generatePDF(data);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=gorevlendirme-${gorevli.tc_no}-${sinav.id}.pdf`);
        res.send(pdfBuffer);
      } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        res.status(500).json({ error: 'PDF oluşturulamadı', details: error.message });
      }
    });
  });
});

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin paneli
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Server başlat
app.listen(PORT, () => {
  console.log(`Server çalışıyor: http://localhost:${PORT}`);
  console.log(`Admin paneli: http://localhost:${PORT}/admin`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nServer kapatılıyor...');
  db.closeDatabase();
  process.exit(0);
});