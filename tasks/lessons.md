# Lessons Learned

## 1. mbar → mmHg Dönüşüm Katsayısı
- `1013.25 mbar * 0.7502 = 760.14 mmHg` (759.94 değil).
- Test yazarken bağımsız hesaplama ile doğrula.

## 2. Vite Scaffold
- Mevcut dosya olan dizinde `create-vite` interaktif moda girer.
- Geçici dizinde scaffold edip dosyaları kopyalamak daha güvenli.

## 3. Formül Doğrulama Test Vakası
- 0.5g, 24°C, 759mmHg, 15cm³ → e: 22.2506, V0: ~13.36, %CaCO3: ~11.93 (Orta derecede kireçli) ✓

## 4. CSV Export — Türkçe Uyumluluğu
- Excel'de Türkçe karakter desteği için BOM (`\uFEFF`) gerekiyor.
- Türkiye'de noktalı virgül (`;`) ayraç olarak kullanılmalı (virgül ondalık ayracı).

## 5. LocalStorage Kalıcılığı
- `JSON.parse/stringify` ile basit state management yeterli, Redux/Zustand gereksiz.
- `useEffect` ile her state değişikliğinde kaydet.

## 6. Sidebar Layout
- Lab uygulamaları için sidebar+main layout, mobil app tarzından daha uygun.
- `position: sticky` ile sidebar sabit tutulmalı.
