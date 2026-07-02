# Görevlendirme Belgesi Sistemi

Web tabanlı sınav görevlendirme belgesi yönetim sistemi. Admin panelinden sınav bilgileri ve görevli verilerini yönetin, görevliler TC kimlik numarası ile sorgulama yapıp PDF belge indirebilsin.

## Özellikler

✅ Admin paneli ile sınav ve görevli yönetimi
✅ Excel'den toplu görevli yükleme
✅ TC kimlik numarası ile sorgulama
✅ 2 sayfalık PDF görevlendirme belgesi (Belge + Görevli Kartı)
✅ Fotoğraf yükleme desteği
✅ Türkçe karakter desteği
✅ Modern, responsive tasarım

## Kurulum

### Gereksinimler
- Node.js 14+ 
- npm veya yarn

### Yerel Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Sunucuyu başlatın:
```bash
npm start
```

3. Tarayıcınızda açın:
- Ana sayfa: http://localhost:3000
- Admin paneli: http://localhost:3000/admin

## Kullanım

### Admin Paneli

1. **Sınav Bilgileri Yönetimi**
   - Sınav oluşturun veya mevcut sınavı seçin
   - Sınav adı, tarih, saat, yer bilgilerini girin
   - Kurallar ve uyarılar metnini ekleyin
   - Kaydet butonuna tıklayın

2. **Görevli Yönetimi**
   - Sınav seçin
   - Excel'den toplu yükleme veya tekli ekleme yapın
   - Görevli listesini görüntüleyin

### Excel Formatı

Excel dosyanız şu sütunlara sahip olmalıdır:

| TC No | Ad | Soyad | Unvan | Görevi | Görev Yeri | Görev Kodu |
|-------|-----|--------|--------|---------|------------|------------|
| 12345678901 | Ahmet | Yılmaz | Öğretmen | Salon Başkanı | İstanbul | SB-001 |

### Ana Sayfa

Görevliler TC kimlik numaralarını girerek:
- Görevlendirme bilgilerini görüntüleyebilir
- PDF görevlendirme belgesini indirebilir

## Türkçe Karakter Desteği

Sistem otomatik olarak Türkçe destekli font arar:
1. Önce `fonts/` klasöründeki DejaVu Sans
2. macOS sistem fontu (Arial)
3. Linux sistem fontu (DejaVu Sans)

### Özel Font Ekleme (Opsiyonel)

Daha iyi Türkçe karakter desteği için:

1. DejaVu Sans fontunu indirin: https://dejavu-fonts.github.io/Download.html
2. Proje klasöründe `fonts/` klasörü oluşturun
3. Şu dosyaları kopyalayın:
   - `DejaVuSans.ttf` → `fonts/DejaVuSans.ttf`
   - `DejaVuSans-Bold.ttf` → `fonts/DejaVuSans-Bold.ttf`

## Hosting / Sunucuya Yükleme

### 1. Railway (Önerilen - Kolay)

Railway ücretsiz plan ile başlayabilirsiniz.

**Adımlar:**
1. https://railway.app adresine gidin ve GitHub ile giriş yapın
2. "New Project" → "Deploy from GitHub repo" seçin
3. Bu projeyi seçin
4. Railway otomatik olarak algılar ve deploy eder
5. Environment variables gerekirse ekleyin
6. Domain adresi otomatik oluşturulur

**Environment Variables:**
```
PORT=3000
NODE_ENV=production
```

### 2. Render (Ücretsiz Plan Var)

**Adımlar:**
1. https://render.com adresine gidin
2. "New" → "Web Service" seçin
3. GitHub repo'nuzu bağlayın
4. Ayarlar:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
5. "Create Web Service" tıklayın

**Environment Variables:**
```
PORT=3000
NODE_ENV=production
```

### 3. DigitalOcean App Platform

**Adımlar:**
1. DigitalOcean hesabı oluşturun
2. "Apps" → "Create App" seçin
3. GitHub repo'nuzu bağlayın
4. Otomatik algılama ile deploy edin
5. Domain ayarlarını yapın

**Maliyet:** $5/ay'dan başlar

### 4. VPS (DigitalOcean Droplet, Linode vb.)

En fazla kontrol için VPS kullanabilirsiniz.

**Kurulum Adımları:**

1. VPS'e bağlanın:
```bash
ssh root@your-server-ip
```

2. Node.js yükleyin:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. PM2 yükleyin (process manager):
```bash
sudo npm install -g pm2
```

4. Projeyi yükleyin:
```bash
cd /var/www
git clone your-repo-url gorevlendirme
cd gorevlendirme
npm install
```

5. PM2 ile başlatın:
```bash
pm2 start server.js --name gorevlendirme
pm2 save
pm2 startup
```

6. Nginx reverse proxy kurun:
```bash
sudo apt install nginx
```

Nginx config (`/etc/nginx/sites-available/gorevlendirme`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifleştir:
```bash
sudo ln -s /etc/nginx/sites-available/gorevlendirme /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

7. SSL sertifikası (Let's Encrypt):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Dosya Yükleme Klasörü

Sunucuda `uploads/` klasörünün yazılabilir olduğundan emin olun:
```bash
mkdir -p uploads
chmod 755 uploads
```

## Proje Yapısı

```
gorevlendirme/
├── server.js              # Express sunucu
├── database.js            # SQLite veritabanı
├── pdfGenerator.js        # PDF oluşturma
├── package.json           # Bağımlılıklar
├── public/                # Frontend dosyaları
│   ├── index.html         # Ana sayfa
│   ├── admin.html         # Admin paneli
│   ├── style.css          # Stil dosyası
│   ├── main.js            # Ana sayfa JS
│   └── admin.js           # Admin paneli JS
├── uploads/               # Fotoğraf yüklemeleri
├── fonts/                 # Özel fontlar (opsiyonel)
└── gorevlendirme.db       # SQLite veritabanı
```

## API Endpoints

### Sınav İşlemleri
- `GET /api/sinav` - Tüm sınavları listele
- `GET /api/sinav/:id` - Belirli sınav bilgisi
- `POST /api/sinav` - Sınav oluştur/güncelle

### Görevli İşlemleri
- `GET /api/gorevli/:tc_no` - TC ile görevli sorgula
- `GET /api/gorevli/sinav/:sinav_id` - Sınava ait görevliler
- `POST /api/gorevli` - Tekli görevli ekle
- `POST /api/gorevli/bulk` - Excel'den toplu yükleme
- `DELETE /api/gorevli/:id` - Görevli sil

### Diğer
- `GET /api/pdf/:tc_no` - PDF belge oluştur
- `POST /api/upload/photo` - Fotoğraf yükle

## Teknolojiler

- **Backend:** Node.js, Express
- **Veritabanı:** SQLite
- **PDF:** PDFKit
- **Excel:** xlsx
- **Frontend:** Vanilla JavaScript, Modern CSS

## Güvenlik Notları

Production ortamında:
- Admin paneline şifre koruması ekleyin
- HTTPS kullanın (Let's Encrypt)
- Rate limiting uygulayın
- Input validation yapın
- CORS ayarlarını yapın

## Lisans

MIT

## Destek

Sorun bildirimi veya öneride bulunmak için:
- Issue açın
- Pull request gönderin