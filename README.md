# Smart Greenhouse Manager

Dashboard web untuk monitoring dan kendali Smart Greenhouse. Data sensor dibaca dari Firebase Realtime Database, dengan kontrol aktuator dan setpoint fase yang hanya bisa dilakukan oleh admin.

Firmware ESP32-nya ada di repo terpisah: [smartgh-firmware](https://github.com/will-zx/smartgh-firmware). Setup RTDB, rules, akun, dan alur kontrol dijelaskan di [`docs/rtdb.md`](docs/rtdb.md).

## Fitur

- Monitoring metrik sensor: suhu, kelembapan, kadar air tanah, VPD, ETc, dosis irigasi, dan air terpakai.
- Grafik tren iklim mikro 6 jam / 24 jam.
- Kendali aktuator: misting, irigasi, dan blower dengan mode `ON` / `AUTO` / `OFF`.
- Pengaturan fase dan setpoint VPD dalam satu form.
- Multi-zone greenhouse dengan label yang bisa diubah admin.
- Log sensor dengan pencarian, pagination, dan export CSV.
- Dark/light mode dan layout responsif untuk mobile/desktop.
- Login admin menggunakan Firebase Authentication (REST API).

## Stack

- Vue 3 + Vite
- Tailwind CSS v4
- Chart.js
- vue-router
- Firebase Realtime Database + Authentication via REST API

## Menjalankan

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run preview
```

## Konfigurasi

Konfigurasi default ada di `src/config.js`:

- `DB_URL`: URL Firebase Realtime Database
- `ZONES`: daftar unit greenhouse (`id` device dan nama default)
- `ADMIN_UID` / `ADMIN_EMAIL`: akun yang dianggap admin
- `firebaseConfig`: `apiKey`, `projectId`, `authDomain`

Untuk menimpa konfigurasi tanpa mengubah bundle, isi `public/config.js` dengan format seperti `public/config.example.js`. File tersebut dimuat sebelum bundle utama.

Label zona disimpan di RTDB pada path `labels/{deviceId}`. Penulisan label memerlukan login admin dan aturan Firebase yang mengizinkan UID admin.

## Deploy

Project ini disiapkan untuk Cloudflare Pages dengan Git integration. Setiap push ke branch `main` akan memicu build dan deploy otomatis.

Pengaturan project di Cloudflare Pages:

- Production branch: `main`
- Framework preset: `Vite`
- Build command: `npm ci && npm run build`
- Build output directory: `dist`
- Deploy command: tidak ada di project Pages
- Node.js: `22` (lihat `.nvmrc`)

Pastikan project dibuat lewat jalur **Pages → Connect to Git**, bukan **Worker → Connect to Git**. Jika dashboard meminta **Deploy command**, berarti yang dibuat adalah project Worker, bukan Pages.

`public/_redirects` menangani fallback SPA agar route seperti `/log` tidak 404. `public/_headers` berisi header keamanan dan ikut tersalin ke `dist` saat build.

Untuk deploy manual via Wrangler:

```bash
npm run build
npx wrangler pages deploy
```

Pastikan domain hasil deploy, misalnya `smartgh-manager.pages.dev`, sudah ditambahkan ke **Firebase Authentication → Authorized domains** agar login admin berfungsi.

## Struktur Singkat

```text
src/
  components/   komponen UI
  lib/          Firebase client, store reaktif, formatter
  views/        halaman dashboard dan log
  config.js     konfigurasi publik
public/         asset statis, runtime config, header keamanan
```

## Lisensi

GNU General Public License v2.0. Lihat `LICENSE`.
