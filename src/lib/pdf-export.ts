import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project } from './store';

async function loadLogoAsBase64(): Promise<string> {
  const response = await fetch('/logo.png');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportProjectPDF(project: Project): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let logoLoaded = false;
  try {
    const logoBase64 = await loadLogoAsBase64();
    doc.addImage(logoBase64, 'PNG', 12, 8, 22, 22);
    logoLoaded = true;
  } catch {}

  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${dateStr}`, pageWidth - 14, 14, { align: 'right' });
  doc.text(`${timeStr}`, pageWidth - 14, 19, { align: 'right' });

  const titleX = logoLoaded ? 40 : 14;
  const titleMaxW = pageWidth - titleX - 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 82);
  doc.text('Eskisehir Osmangazi Universitesi', pageWidth / 2, 12, { align: 'center', maxWidth: titleMaxW });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 100);
  doc.text('Toprak Bilimi ve Bitki Besleme Bolumu', pageWidth / 2, 18, { align: 'center', maxWidth: titleMaxW });
  doc.text('Analiz Laboratuvari', pageWidth / 2, 23, { align: 'center', maxWidth: titleMaxW });

  const reportTitle = 'Toprak Analiz Sonuclari (Kirec, Tekstur, Tuz)';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 82);
  doc.text(reportTitle, pageWidth / 2, 30, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Proje: ${project.name}`, 14, 36);
  doc.text(`Toplam Ornek: ${project.samples.length}`, pageWidth - 14, 36, { align: 'right' });

  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(14, 38, pageWidth - 14, 38);

  const headers = [
    'Ornek No', 'Guncelleme Tarihi', 
    '% CaCO3', 'Kirec Sinifi', 
    'Kum-Silt-Kil (%)', 'Tekstur Sinifi', 
    '% Toplam Tuz', 'ECe (dS/m)', 'Tuz Sinifi'
  ];

  const rows = project.samples.map((s) => {
    const d = new Date(s.timestamp);
    const dateFormatted = d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    return [
      s.ornekNo,
      dateFormatted,
      s.calcimeterResult ? `%${s.calcimeterResult.caco3Yuzde.toFixed(2)}` : '-',
      s.calcimeterResult ? s.calcimeterResult.sinif : '-',
      s.textureResult ? `${s.textureResult.sand.toFixed(0)}-${s.textureResult.silt.toFixed(0)}-${s.textureResult.clay.toFixed(0)}` : '-',
      s.textureResult ? s.textureResult.textureClassTR : '-',
      s.tuzResult ? `%${s.tuzResult.saltPct.toFixed(2)}` : '-',
      s.tuzResult ? s.tuzResult.ece.toFixed(1) : '-',
      s.tuzResult ? s.tuzResult.saltClassEce : '-',
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, lineColor: [200, 200, 210], lineWidth: 0.2 },
    headStyles: { fillColor: [30, 41, 82], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
    bodyStyles: { textColor: [40, 40, 50], halign: 'center' },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    columnStyles: { 
      0: { halign: 'left', fontStyle: 'bold' }, 
      2: { fontStyle: 'bold', textColor: [74, 124, 222] }, // Kirec %
      4: { halign: 'center', textColor: [100, 100, 100] }, // Kum-Silt-Kil
      5: { fontStyle: 'bold', textColor: [34, 139, 34] }, // Tekstur
      6: { fontStyle: 'bold', textColor: [220, 53, 69] }, // Tuz %
      7: { fontStyle: 'bold', textColor: [220, 53, 69] }, // ECe
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`Sayfa ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.text('Analiz Raporu', 14, pageHeight - 8);
      doc.text(dateStr, pageWidth - 14, pageHeight - 8, { align: 'right' });

      if (data.pageNumber > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 82);
        doc.text(reportTitle, 14, 10);
        doc.text(`Proje: ${project.name}`, pageWidth - 14, 10, { align: 'right' });
        doc.setDrawColor(200, 200, 210);
        doc.line(14, 13, pageWidth - 14, 13);
      }
    },
  });

  const safeName = project.name.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, '').replace(/\s+/g, '_');
  doc.save(`${safeName}_Tum_Analizler.pdf`);
}
