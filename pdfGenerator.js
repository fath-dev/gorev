const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// TC no'yu maskele (örn: 19******840)
function maskTcNo(tcNo) {
  if (!tcNo || tcNo.length !== 11) return tcNo;
  return tcNo.substring(0, 2) + '******' + tcNo.substring(9);
}

// Tarih formatla (örn: 21 Haziran 2026 (Pazar))
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  
  return `${date.getDate()} ${aylar[date.getMonth()]} ${date.getFullYear()} (${gunler[date.getDay()]})`;
}

// Türkçe karakterler için font yolu (sistem fontu veya custom font)
function getFontPath(fontName = 'regular') {
  // Önce custom fonts klasöründe ara
  const customFonts = {
    regular: path.join(__dirname, 'fonts', 'DejaVuSans.ttf'),
    bold: path.join(__dirname, 'fonts', 'DejaVuSans-Bold.ttf')
  };
  
  if (fs.existsSync(customFonts[fontName])) {
    return customFonts[fontName];
  }
  
  // macOS sistem fontları
  const systemFonts = {
    regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
    bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
  };
  
  if (fs.existsSync(systemFonts[fontName])) {
    return systemFonts[fontName];
  }
  
  // Linux sistem fontları
  const linuxFonts = {
    regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
  };
  
  if (fs.existsSync(linuxFonts[fontName])) {
    return linuxFonts[fontName];
  }
  
  return null; // Font bulunamadı
}

async function generatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        bufferPages: true
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Türkçe destekli fontları yükle
      const regularFont = getFontPath('regular');
      const boldFont = getFontPath('bold');
      
      if (!regularFont || !boldFont) {
        console.warn('UYARI: Türkçe destekli font bulunamadı. fonts/ klasörüne DejaVu Sans fontlarını ekleyin.');
        console.warn('İndirme: https://dejavu-fonts.github.io/Download.html');
      }

      // Tek sayfa: Görevlendirme Belgesi ve Görev Kartı
      generateSinglePage(doc, data, regularFont, boldFont);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generateSinglePage(doc, data, regularFont, boldFont) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 50;
  const fontRegular = regularFont || 'Times-Roman';
  const fontBold = boldFont || 'Times-Bold';
  
  let yPos = 35;
  
  // ========== BAŞLIK ==========
  doc.fillColor('#B71C1C')
     .fontSize(16)
     .font(fontBold)
     .text('GÖREVLENDİRME BELGESİ', margin, yPos, { align: 'center', width: pageWidth - 2 * margin });
  
  yPos += 18;
  doc.fillColor('black')
     .fontSize(7)
     .font(fontRegular)
     .text('(Bu belgeyi görev yapacağınız binaya girerken yanınızda bulundurunuz)', 
           margin, yPos, { align: 'center', width: pageWidth - 2 * margin });

  yPos += 15;
  doc.fillColor('#1565C0')
     .fontSize(11)
     .font(fontBold)
     .text(data.sinav_adi || 'Sınav Adı', margin, yPos, { align: 'center', width: pageWidth - 2 * margin });

  yPos += 18;
  
  // ========== GÖREVLİ VE SINAV BİLGİLERİ (TEK ÇERÇEVE) ==========
  const boxHeight = 135;
  doc.fillColor('black').rect(margin, yPos, pageWidth - 2 * margin, boxHeight).stroke();
  
  // Sol: Fotoğraf
  const photoX = margin + 8;
  const photoY = yPos + 8;
  const photoWidth = 65;
  const photoHeight = 85;
  
  doc.rect(photoX, photoY, photoWidth, photoHeight).stroke();
  
  if (data.fotograf_yolu && fs.existsSync(path.join(__dirname, 'uploads', data.fotograf_yolu))) {
    try {
      doc.image(path.join(__dirname, 'uploads', data.fotograf_yolu), 
                photoX + 2, photoY + 2, { 
                  width: photoWidth - 4, 
                  height: photoHeight - 4,
                  fit: [photoWidth - 4, photoHeight - 4],
                  align: 'center',
                  valign: 'center'
                });
    } catch (err) {
      doc.fontSize(7).font(fontRegular).text('FOTOĞRAF', photoX + 15, photoY + 38);
    }
  }
  
  // Sağ: Bilgiler (Görevli + Sınav)
  const infoX = photoX + photoWidth + 10;
  const infoY = yPos + 8;
  const lineH = 12;
  
  doc.fontSize(7).font(fontBold);
  
  // Görevli bilgileri
  doc.text('T.C. Kimlik No:', infoX, infoY);
  doc.font(fontRegular).text(maskTcNo(data.tc_no), infoX + 70, infoY);
  
  doc.font(fontBold).text('Adı, Soyadı:', infoX, infoY + lineH);
  doc.font(fontRegular).text(`${data.ad} ${data.soyad}`.toUpperCase(), infoX + 70, infoY + lineH);
  
  doc.font(fontBold).text('Unvanı:', infoX, infoY + lineH * 2);
  doc.font(fontRegular).text((data.unvan || '').toUpperCase(), infoX + 70, infoY + lineH * 2);
  
  doc.font(fontBold).text('Görevi:', infoX, infoY + lineH * 3);
  doc.font(fontRegular).text(data.gorevi || '', infoX + 70, infoY + lineH * 3);
  
  // Sınav bilgileri
  doc.font(fontBold).text('Sınav Tarihi:', infoX, infoY + lineH * 5);
  doc.font(fontRegular).text(formatDate(data.sinav_tarihi), infoX + 70, infoY + lineH * 5);
  
  doc.font(fontBold).text('Sınav Saati:', infoX, infoY + lineH * 6);
  const hazirBulunma = data.hazir_bulunma_saati || '1 saat önce';
  doc.font(fontRegular).text(`${data.sinav_saati || ''} (En geç ${hazirBulunma} görev yerinizde hazır bulununuz.)`, 
                              infoX + 70, infoY + lineH * 6, { width: pageWidth - infoX - 70 - margin - 5 });
  
  doc.font(fontBold).text('Sınav Süresi:', infoX, infoY + lineH * 7.5);
  doc.font(fontRegular).text(data.sinav_suresi || '180 dakika', infoX + 70, infoY + lineH * 7.5);
  
  doc.font(fontBold).text('Görev Yapacağı Merkez:', infoX, infoY + lineH * 8.5);
  doc.font(fontRegular).text(data.sinav_yeri || '', infoX + 105, infoY + lineH * 8.5, { width: pageWidth - infoX - 105 - margin - 5 });
  
  doc.font(fontBold).text('Bina:', infoX, infoY + lineH * 9.5);
  doc.font(fontRegular).text(data.bina_adi || '', infoX + 70, infoY + lineH * 9.5, { width: pageWidth - infoX - 70 - margin - 5 });
  
  doc.font(fontBold).text('Adres:', infoX, infoY + lineH * 10.5);
  doc.font(fontRegular).text(data.bina_adresi || '', infoX + 70, infoY + lineH * 10.5, { width: pageWidth - infoX - 70 - margin - 5 });
  
  yPos += boxHeight + 12;
  
  // ========== KOORDİNATÖRLÜK BİLGİLERİ (ÇERÇEVE İÇİNDE) ==========
  const koordinatorBoxH = 38;
  doc.rect(margin, yPos, pageWidth - 2 * margin, koordinatorBoxH).stroke();
  
  doc.fontSize(8).font(fontBold)
     .text('SINAV KOORDİNATÖRLÜĞÜ İLETİŞİM BİLGİLERİ', margin + 5, yPos + 5);
  
  doc.fontSize(7).font(fontBold).text('Adres:', margin + 5, yPos + 17);
  doc.font(fontRegular).text(data.koordinatorluk_adresi || '', margin + 40, yPos + 17, { width: pageWidth - 2 * margin - 45 });
  
  doc.font(fontBold).text('Telefon:', margin + 5, yPos + 27);
  doc.font(fontRegular).text(data.koordinatorluk_telefon || '', margin + 40, yPos + 27);
  
  yPos += koordinatorBoxH + 10;
  
  // ========== DİKKAT ==========
  doc.fillColor('#B71C1C')
     .fontSize(7)
     .font(fontBold)
     .text('DİKKAT: ', margin, yPos, { continued: true })
     .fillColor('black')
     .font(fontRegular)
     .text('Sınav binasına saat: 10.00\'dan sonra hiçbir aday alınmayacaktır.');
  
  yPos += 12;
  
  // ========== ÖNEMLİ UYARILAR (İKİ SÜTUN) ==========
  doc.fillColor('#B71C1C')
     .fontSize(8)
     .font(fontBold)
     .text('ÖNEMLİ UYARILAR', margin, yPos);
  
  yPos += 10;
  
  if (data.kurallar_metni) {
    const col1X = margin;
    const col2X = margin + (pageWidth - 2 * margin) / 2 + 5;
    const colWidth = (pageWidth - 2 * margin) / 2 - 7;
    
    doc.fillColor('black')
       .fontSize(6)
       .font(fontRegular)
       .text(data.kurallar_metni, col1X, yPos, {
         width: colWidth,
         align: 'justify',
         lineGap: 0.3,
         columns: 2,
         columnGap: 10
       });
  }
  
  // ========== KESME ÇİZGİSİ (SABIT KONUM) ==========
  const cutLineY = 625;
  doc.moveTo(margin, cutLineY)
     .lineTo(pageWidth - margin, cutLineY)
     .dash(5, { space: 3 })
     .stroke();
  doc.undash();
  
  doc.fontSize(6).font(fontRegular)
     .text('Buradan kesiniz. Sınav Görevli Kartı\'nızı sınav süresince yakanızda takılı tutunuz.', 
           margin, cutLineY + 5, { align: 'center', width: pageWidth - 2 * margin });
  
  // ========== GÖREVLİ KARTI (EN ALTA SABİT) ==========
  yPos = 645;
  
  doc.fillColor('#1565C0')
     .fontSize(10)
     .font(fontBold)
     .text(data.sinav_adi || 'Sınav Adı', margin, yPos, { align: 'center', width: pageWidth - 2 * margin });
  
  yPos += 14;
  doc.fillColor('black')
     .fontSize(9)
     .font(fontBold)
     .text('SINAV GÖREVLİ KARTI', margin, yPos, { align: 'center', width: pageWidth - 2 * margin });
  
  yPos += 16;
  
  const cardX = margin + 50;
  const cardWidth = pageWidth - 2 * margin - 100;
  const cardHeight = 110;
  
  doc.rect(cardX, yPos, cardWidth, cardHeight).lineWidth(1.5).stroke();
  
  // Sol: G/S.B. + Fotoğraf
  const leftW = 85;
  doc.rect(cardX, yPos, leftW, cardHeight).lineWidth(0.8).stroke();
  
  const gorevHarf = (data.gorevi && data.gorevi.toLowerCase().includes('salon başkanı')) ? 'S.B.' : 'G';
  const harfSize = gorevHarf === 'S.B.' ? 28 : 38;
  const harfX = gorevHarf === 'S.B.' ? cardX + 22 : cardX + 27;
  
  doc.fontSize(harfSize).font(fontBold)
     .text(gorevHarf, harfX, yPos + 5);
  
  const cardPhotoX = cardX + 8;
  const cardPhotoY = yPos + 40;
  const cardPhotoW = 69;
  const cardPhotoH = 65;
  
  doc.rect(cardPhotoX, cardPhotoY, cardPhotoW, cardPhotoH).lineWidth(0.5).stroke();
  
  if (data.fotograf_yolu && fs.existsSync(path.join(__dirname, 'uploads', data.fotograf_yolu))) {
    try {
      doc.image(path.join(__dirname, 'uploads', data.fotograf_yolu), 
                cardPhotoX + 1, cardPhotoY + 1, { 
                  width: cardPhotoW - 2, 
                  height: cardPhotoH - 2,
                  fit: [cardPhotoW - 2, cardPhotoH - 2],
                  align: 'center',
                  valign: 'center'
                });
    } catch (err) {
      doc.fontSize(6).text('Fotoğraf', cardPhotoX + 22, cardPhotoY + 28);
    }
  }
  
  // Sağ: Bilgiler (Görev Kodu Kaldırıldı)
  const cardInfoX = cardX + leftW + 6;
  const cardInfoY = yPos + 6;
  const cardLineH = 13;
  
  doc.fontSize(6.5).font(fontBold);
  
  doc.text('TARİH:', cardInfoX, cardInfoY);
  doc.font(fontRegular).text(formatDate(data.sinav_tarihi) + ' ' + (data.sinav_saati || ''), cardInfoX + 40, cardInfoY);
  
  doc.font(fontBold).text('T.C.:', cardInfoX, cardInfoY + cardLineH);
  doc.font(fontRegular).text(maskTcNo(data.tc_no), cardInfoX + 40, cardInfoY + cardLineH);
  
  doc.font(fontBold).text('ADI:', cardInfoX, cardInfoY + cardLineH * 2);
  doc.font(fontRegular).text((data.ad || '').toUpperCase(), cardInfoX + 40, cardInfoY + cardLineH * 2);
  
  doc.font(fontBold).text('SOYADI:', cardInfoX, cardInfoY + cardLineH * 3);
  doc.font(fontRegular).text((data.soyad || '').toUpperCase(), cardInfoX + 40, cardInfoY + cardLineH * 3);
  
  doc.font(fontBold).text('UNVANI:', cardInfoX, cardInfoY + cardLineH * 4);
  doc.font(fontRegular).text((data.unvan || '').toUpperCase(), cardInfoX + 40, cardInfoY + cardLineH * 4);
  
  doc.font(fontBold).text('GÖREVİ:', cardInfoX, cardInfoY + cardLineH * 5);
  doc.font(fontRegular).text((data.gorevi || '').toUpperCase(), cardInfoX + 40, cardInfoY + cardLineH * 5);
  
  doc.font(fontBold).text('KURUM:', cardInfoX, cardInfoY + cardLineH * 6);
  doc.font(fontRegular).text(data.gorev_yeri || '', cardInfoX + 40, cardInfoY + cardLineH * 6, { width: cardWidth - leftW - 50 });
  
  // Alt bilgi
  yPos += cardHeight + 8;
  doc.fontSize(6).font(fontRegular)
     .text(`Belge Döküm Tarihi: ${new Date().toLocaleString('tr-TR')}`, 
           margin, yPos, { align: 'center', width: pageWidth - 2 * margin });
}

function generatePage2(doc, data, regularFont, boldFont) {
  const pageWidth = doc.page.width;
  const margin = 50;
  
  // Font ayarla (custom font varsa kullan, yoksa Times-Roman)
  const fontRegular = regularFont || 'Times-Roman';
  const fontBold = boldFont || 'Times-Bold';
  
  // Üst bilgi - kesikli çizgi efekti
  doc.moveTo(margin, 50)
     .lineTo(pageWidth - margin, 50)
     .dash(5, { space: 3 })
     .stroke();
  
  doc.undash();
  
  doc.fontSize(8).font(fontRegular)
     .text('Buradan kesiniz. Sınav Görevli Kartı\'nızı sınav süresince yakanızda takılı tutunuz.', 
           margin, 60, { align: 'center', width: pageWidth - 2 * margin });

  // Kart başlık
  doc.fontSize(16).font(fontBold)
     .text(data.sinav_adi || 'Sınav Adı', margin, 95, { align: 'center', width: pageWidth - 2 * margin });

  doc.fontSize(13).font(fontBold)
     .text('SINAV GÖREVLİ KARTI', margin, 120, { align: 'center', width: pageWidth - 2 * margin });

  // Kart çerçevesi
  const cardX = margin + 20;
  const cardY = 150;
  const cardWidth = pageWidth - 2 * margin - 40;
  const cardHeight = 300;

  // Ana çerçeve - kalın çizgi
  doc.rect(cardX, cardY, cardWidth, cardHeight).lineWidth(2.5).stroke();

  // Sol sütun - Fotoğraf ve G harfi
  const leftColWidth = 130;
  doc.rect(cardX, cardY, leftColWidth, cardHeight).lineWidth(1.5).stroke();

  // "G" harfi (Görevli) - daha büyük ve belirgin
  doc.fontSize(70).font(fontBold)
     .text('G', cardX + 45, cardY + 15);

  // Fotoğraf alanı
  const photoX = cardX + 15;
  const photoY = cardY + 100;
  const photoWidth = 100;
  const photoHeight = 140;

  doc.rect(photoX, photoY, photoWidth, photoHeight).lineWidth(1).stroke();

  if (data.fotograf_yolu && fs.existsSync(path.join(__dirname, 'uploads', data.fotograf_yolu))) {
    try {
      doc.image(path.join(__dirname, 'uploads', data.fotograf_yolu), 
                photoX + 2, photoY + 2, { 
                  width: photoWidth - 4, 
                  height: photoHeight - 4,
                  fit: [photoWidth - 4, photoHeight - 4],
                  align: 'center',
                  valign: 'center'
                });
    } catch (err) {
      doc.fontSize(9).font(fontRegular).text('Fotoğraf', photoX + 30, photoY + 65);
    }
  }

  // Sağ sütun - Bilgiler
  const infoX = cardX + leftColWidth + 20;
  let yPos = cardY + 25;
  const lineHeight = 24;

  doc.fontSize(10).font(fontBold);

  doc.text('SINAV GÖREV KODU:', infoX, yPos);
  doc.font(fontRegular).text(data.gorev_kodu || '', infoX + 140, yPos);
  yPos += lineHeight;

  doc.font(fontBold).text('TARİH:', infoX, yPos);
  doc.font(fontRegular).text(formatDate(data.sinav_tarihi), infoX + 140, yPos);
  yPos += lineHeight;

  doc.font(fontBold).text('T.C.:', infoX, yPos);
  doc.font(fontRegular).text(maskTcNo(data.tc_no), infoX + 140, yPos);
  yPos += lineHeight;

  doc.font(fontBold).text('ADI:', infoX, yPos);
  doc.font(fontRegular).text((data.ad || '').toUpperCase(), infoX + 140, yPos);
  yPos += lineHeight;

  doc.font(fontBold).text('SOYADI:', infoX, yPos);
  doc.font(fontRegular).text((data.soyad || '').toUpperCase(), infoX + 140, yPos);
  yPos += lineHeight;

  doc.font(fontBold).text('UNVANI:', infoX, yPos);
  doc.font(fontRegular).text((data.unvan || '').toUpperCase(), infoX + 140, yPos);
  yPos += lineHeight;

  doc.font(fontBold).text('GÖREVİ:', infoX, yPos);
  doc.font(fontRegular).text(data.gorevi || '', infoX + 140, yPos);
  yPos += lineHeight;

  doc.font(fontBold).text('KURUM:', infoX, yPos);
  doc.font(fontRegular).text(data.gorev_yeri || '', infoX + 140, yPos, { width: cardWidth - leftColWidth - 160 });

  // Alt bilgi
  yPos = cardY + cardHeight + 15;
  doc.fontSize(8).font(fontRegular)
     .text(`Belge Döküm Tarihi: ${new Date().toLocaleString('tr-TR')}`, 
           margin, yPos, { align: 'center', width: pageWidth - 2 * margin });
}

module.exports = { generatePDF };