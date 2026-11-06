# Dimensi Tarik - AR Hand-Tracked Block

Aplikasi AR berbasis web untuk menguji interaksi hand-tracking sebelum build native.

## Cara Menjalankan Lokal

1. Clone/download repo ini
2. Buka `index.html` di browser (Chrome/Edge recommended)
3. Izinkan akses kamera depan
4. Kepalkan tangan 70% untuk spawn balok

## Deploy ke GitHub Pages

1. Push semua file ke repository GitHub
2. Pergi ke Settings > Pages
3. Pilih branch `main` dan folder `root`
4. Save, tunggu deploy selesai
5. Buka URL GitHub Pages di HP Android

## Kontrol Gestur

| Gestur | Aksi |
|--------|------|
| Kepalan 70% | Spawn/Genggam balok |
| Jarak jempol-tengah | Scale balok (2cm-50cm) |
| Tarik tangan | Directional stretch |
| Tekuk kelingking >60° | Tension mode (balok mengecil, solid) |
| Kelingking + Jempol | Mode Fusi (lock ukuran, follow kelingking) |
| Lepas kepalan | Balok snap-back, lalu fade out |

## Struktur File
