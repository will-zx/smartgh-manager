# Tutorial: Firebase RTDB + Auth + multi-zone

> Status: **sudah deployed.** RTDB rules sudah terkunci + allowlist UID (§2b). Dashboard di
> https://smartgh-manager.pages.dev/ (**Cloudflare Pages**, lihat §3). Dokumen ini tinggal di
> repo dashboard; bagian firmware hanya dirujuk lewat path `../smartgh-firmware/`. Dipakai
> sebagai rujukan saat menambah greenhouse baru atau pindah project.

Arsitektur multi-zone (greenhouse-in-greenhouse): satu dashboard, banyak unit ESP32. Tiap unit
punya `DEVICE_ID` sendiri dan menulis ke subtree-nya sendiri.

```
ESP32 --20s POST--> zones/{DEVICE_ID}/sensor_logs  <--fetch per zona-- dashboard
ESP32 <--5s poll-- commands/{DEVICE_ID}           <--POST(switch)-- dashboard (admin)
ESP32 --DELETE--> commands/{DEVICE_ID}/{key}      (selesai dieksekusi)
admin --PUT-----> labels/{DEVICE_ID}              (nama greenhouse, menang atas default)
```

Dashboard adalah proyek **Vue 3 + Vite + Tailwind 4 + Chart.js** dengan `vue-router`
(halaman Dashboard dan Log):

```text
src/
  main.js         createApp(App).use(router).mount('#app')
  router.js       route "/" (DashboardView) dan "/log" (LogView)
  config.js       DB_URL, ZONES, ADMIN_UID/ADMIN_EMAIL, firebaseConfig — **di-commit**
                  (apiKey client bukan rahasia keras; yang melindungi = RTDB rules).
                  Vite memasukkannya ke bundle, jadi tidak perlu env var.
  lib/
    firebase.js   klien RTDB + auth REST, cache idToken
    store.js      satu reactive() + seluruh fetch RTDB dan aksi
    format.js     formatter angka, waktu, dan durasi
  views/          DashboardView, LogView
  components/     ActuatorPanel, PhasePanel, MetricsGrid, MetricCard,
                  TrendChart, Sparkline, ZoneMenu, LoginModal, CommandToast, Icon
  style.css       @import "tailwindcss" + @theme (palet terang & gelap)
public/
  config.js       (opsional) timpa konfigurasi tanpa build ulang:
                  window.__GH_CONFIG__ = { DB_URL, ZONES, ADMIN_UID, ... }
  _redirects      fallback SPA: /* /index.html 200
  _headers        header keamanan (CSP, X-Frame-Options, ...)
```

Dua jebakan yang sudah pernah menimpa dan tidak akan terulang:

1. **Konfigurasi runtime hanya lewat `window.__GH_CONFIG__`.** `public/config.js` dimuat
   sebelum bundle, lalu `src/config.js` membacanya dan mengekspor nilai final. Komponen
   WAJIB meng-`import` dari sana; **jangan** memakai identifier telanjang di template —
   template Vue dikompilasi jadi `_ctx.X` yang hanya mencari di `globalThis`, hasilnya
   `undefined` dan daftar unit terender kosong.
2. **`ZONES[].id` harus sama persis dengan `DEVICE_ID` di firmware** (`secrets.h`). Kalau
   beda, perangkat menulis ke subtree yang tidak dibaca dashboard, dan rules menolak 401.

## 1. Set up Firebase Realtime Database + Auth (15 menit)

1. Buka https://console.firebase.google.com → **Add project** (nama bebas). Firebase di luar
   "no-cost Spark plan" tidak butuh kartu kredit.
2. Kiri: **Build** → **Realtime Database** → **Create database** → pilih region terdekat
   (mis. `asia-southeast1`).
3. Salin **database URL** (bentuknya `https://<project-id>-default-rtdb.firebaseio.com`):
   - Tempel ke `../smartgh-firmware/firmware/src/config.h` sebagai `FIREBASE_DB_URL`.
   - Tempel juga ke `src/config.js` sebagai `DB_URL`.
4. **Aktifkan Authentication** (dashboard butuh login):
   - Kiri: **Build** → **Authentication** → **Get started**.
   - **Sign-in method** → aktifkan **Email/Password** → **Save**.
   - Tab **Users** → **Add user** → dua akun saja: satu **admin** dan satu akun
     **perangkat per unit greenhouse** (lihat §2b). Pengunjung lain tidak perlu akun.
5. **Get firebaseConfig** untuk `src/config.js`:
   - Kiri: ikon gerigi **Project settings** → **Your apps** → **</>** (web).
   - Salin blok `firebaseConfig` ke `src/config.js` (nilai project yang sekarang sudah ada di sana;
     `public/config.example.js` menunjukkan cara menimpanya tanpa build ulang).
   - Isi juga `DB_URL`, `ZONES`, dan `ADMIN_EMAIL` di file yang sama.

## 2. Rules Realtime Database

### 2a. Mode demo/test (hanya saat setup awal)

Mengizinkan siapa pun membaca & menulis. Dipakai hanya di awal supaya bisapush data tanpa
setup auth, **lalu langsung diganti §2b**. Pilih **Start in test mode** saat bikin DB, atau di
**Realtime Database → Rules**, tempel lalu **Publish**:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ Ini publik — siapa pun dengan URL bisa baca/tulis. Cocok untuk demo capstone.

### 2b. Rules terkunci + allowlist UID (KONDISI SEKARANG)

Database sudah **tidak lagi** test mode. Dashboard **terbuka untuk semua orang** (mode Tamu,
baca data sensor tanpa login); hanya **tulis** yang dikunci: kontrol aktuator + ganti nama
greenhouse untuk admin, dan push sensor untuk tiap ESP32.

> ⚠️ Perbaikan dari versi lama: `request.query.auth` adalah sintaks **Firestore**, tidak berlaku
> di Realtime Database. Variabelnya `auth`.

#### Struktur data

```
zones/{deviceId}/sensor_logs/{pushKey}   ← ESP32 tulis, semua akun login baca
commands/{deviceId}/{pushKey}           ← admin tulis, ESP32 baca lalu DELETE
labels/{deviceId}                       ← nama greenhouse, admin tulis
```

`deviceId` = `DEVICE_ID` di `../smartgh-firmware/firmware/src/secrets.h` unit tersebut, harus sama persis dengan
`ZONES[].id` di `src/config.js`. Node lain (termasuk `/sensor_logs` versi lama) otomatis `deny`
karena tidak ada rule-nya.

#### Rules final

```json
{
  "rules": {
    "zones": {
      "$zone": {
        "sensor_logs": {
          ".read":  true,
          ".write": "$zone === 'esp32-gh-01' && auth.uid === 'p1Q4MrmL2ROBqoZh6UujwJHSIfW2'"
        }
      }
    },
    "commands": {
      "$zone": {
        ".read":  "$zone === 'esp32-gh-01' && auth.uid === 'p1Q4MrmL2ROBqoZh6UujwJHSIfW2'",
        ".write": "auth.uid === 'QpW484FycYRnq5S5rzNpON297F83'"
      }
    },
    "labels": {
      ".read":  true,
      ".write": "auth.uid === 'QpW484FycYRnq5S5rzNpON297F83'"
    }
  }
}
```

Empat hal yang perlu diingat:
- **Baca = publik, tulis = terkunci.** Dashboard dibuka untuk semua orang (mode "Tamu"), jadi
  `sensor_logs` dan `labels` memakai `.read: true`. Penulisan tetap memakai allowlist UID.
  Konsekuensinya: siapa pun yang mengetahui `DB_URL` (ada di `src/config.js`, memang ter-commit)
  bisa membaca seluruh riwayat sensor semua greenhouse. Isinya hanya telemetri, bukan rahasia.
- **Tulisan memakai allowlist UID, bukan pola email.** Sebelumnya rules memakai
  `auth.token.email.matches(/.*@device[.]local$/)`. Itu **tidak aman**: provider Email/Password
  tidak punya tombol "matikan pendaftaran", jadi siapa pun yang memegang apiKey (memang publik di
  dashboard) bisa `signUp` dengan email `siapa-saja@device.local` dan langsung lolos regex.
  Dengan `auth.uid`, akun hasil signup (UID acak) **nol akses tulis**.
- **Izin device dibatasi per zona** — wildcard `$zone` tetap dipakai untuk struktur, tetapi syarat
  `$zone` dan UID harus cocok bersama. Saat menambah greenhouse, tambahkan pasangan zona–UID pada
  ekspresi rules untuk `sensor_logs.write` dan `commands.read`; jangan memberi satu UID akses ke
  semua zona.
- **UID, bukan email** — kalau email device/admin diganti, rules tidak perlu diubah (UID tetap).
- **Tidak ada rule di root** → semua yang tidak disebut di atas otomatis tertutup. Jangan pernah
  menaruh `.read`/`.write` di root atau di `zones`, karena yang lebih dangkal menang dan akan
  membuka seluruh isinya.

#### Akun

| Akun | UID (dipakai di rules) | Peran |
|---|---|---|
| `mr.pman@mail.unnes.ac.id` | `QpW484FycYRnq5S5rzNpON297F83` | admin — kontrol aktuator + set label |
| `esp32-gh-01@device.local` | `p1Q4MrmL2ROBqoZh6UujwJHSIfW2` | perangkat (satu UID per unit) |

Cukup dua akun: **admin** dan **ESP32**. Pengunjung lain tidak perlu akun sama sekali —
dashboard terbuka sebagai **Tamu**, dan hanya perlu login untuk kontrol.

Akun `pluto@jmail.org` (`Y2TvgUGK8DebsgBZkXOrlNm4NtJ3`) **tidak lagi dipakai** sejak pembacaan
dibuka ke publik; UID-nya boleh dihapus dari Authentication → Users.

Akun dibuat di **Authentication → Users**; UID diambil dari kolom **User UID** di halaman yang sama,
atau dari `localId` pada respons `accounts:signInWithPassword` (praktis untuk device — tidak perlu
buka console):

```bash
curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"email":"esp32-gh-01@device.local","password":"<isi>","returnSecureToken":true}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["localId"])'
```

Tambahkan domain dashboard di **Authentication → Settings → Authorized domains** kalau login
dari domain deploy (`localhost` sudah default untuk pengembangan).

#### Verifikasi dengan curl

Rules hanya menolak yang tidak berwenang — jadi yang diuji adalah kombinasiactor:

```bash
API_KEY=AIzaSyC1ox01jTx12i9-jBFZ3JaYVgnBfcYOjA0
DB=https://smart-greenhouse-e214c-default-rtdb.asia-southeast1.firebasedatabase.app
Z=esp32-gh-01

tok() { curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"$2\",\"returnSecureToken\":true}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin).get("idToken",""))'; }
ADMIN=$(tok mr.pman@mail.unnes.ac.id PASSWORD)
DEV=$(tok esp32-gh-01@device.local PASSWORD)
echo "admin=${#ADMIN} device=${#DEV}"   # keduanya harus > 0

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
row()  { printf '%-26s dapat %-4s (harus %s)\n' "$1" "$2" "$3"; }

# Baca telemetry publik (mode Tamu dashboard)
row "anon baca logs"      "$(code "$DB/zones/$Z/sensor_logs.json")" 200
row "anon baca labels"    "$(code "$DB/labels.json")" 200
# Tulis tetap terkunci: hanya admin (dan device untuk sensor_logs)
row "anon tulis cmd"      "$(code -X PUT "$DB/commands/$Z/cmd-test.json" -H 'Content-Type: application/json' -d '{"action":"mist","value":true}')" 401
row "anon tulis label"    "$(code -X PUT "$DB/labels/$Z.json" -H 'Content-Type: application/json' -d '"x"')" 401
row "admin tulis cmd"     "$(code -X PUT "$DB/commands/$Z/cmd-test.json?auth=$ADMIN" -H 'Content-Type: application/json' -d '{"action":"mist","value":true}')" 200
row "admin tulis label"   "$(code -X PUT "$DB/labels/$Z.json?auth=$ADMIN" -H 'Content-Type: application/json' -d '"Cabai merah"')" 200
row "admin baca commands" "$(code "$DB/commands/$Z.json?auth=$ADMIN")" 401
row "device tulis log"    "$(code -X PUT "$DB/zones/$Z/sensor_logs/t.json?auth=$DEV" -H 'Content-Type: application/json' -d '{}')" 200
row "device baca commands" "$(code "$DB/commands/$Z.json?auth=$DEV")" 200
row "path lama logs"      "$(code "$DB/sensor_logs.json?auth=$ADMIN")" 401

# bersihkan sisa tes
curl -s -X DELETE "$DB/commands/$Z.json?auth=$ADMIN" >/dev/null
curl -s -X DELETE "$DB/zones/$Z/sensor_logs/t.json?auth=$DEV" >/dev/null
```

> Perintah ditulis sebagai **entri anak**: `commands/{deviceId}/{kunci}`. Bentuk lama
> (`POST` `{action, value}` ke `commands/{deviceId}`) sebenarnya juga terbaca firmware, karena
> `POST` di REST Firebase setara `push()` → objek itu berakhir sebagai anak ber-push-ID. Kunci
> eksplisit dipakai supaya antrean perintah urutannya jelas — lihat §5.

> **Akun signup tetap 401 untuk semua jalur tulis.** Akun yang dibuat lewat `accounts:signUp`
> (mis. `siapa-saja@device.local`) punya UID acak → `commands` dan `labels` tetap **401**.
> Itu bukti celah signup tertutup di sisi tulis; tidak perlu benar-benar membuat akun — cukup
> pastikan rules memakai `auth.uid`, bukan pola email. (Jalur *baca* memang publik by design.)

> **Penting:** Firebase RTDB **tidak menerima** header `Authorization: Bearer <idToken>` untuk
> ID token — selalu balas `Unauthorized request`. Yang benar adalah query `?auth=<idToken>`.
> (Header itu hanya untuk OAuth2 access token dari service account.)

#### Kalau hasil tes tidak sesuai

| Gejala | Penyebab | Aksi |
|---|---|---|
| Semua dapat 401 | token kosong (login gagal) | cetak respons error: `EMAIL_NOT_FOUND`, `INVALID_PASSWORD`, `OPERATION_NOT_ALLOWED` (sign-in method belum aktif) |
| `PERMISSION_DENIED` | path tidak ada rule-nya | pastikan `zones/{id}/sensor_logs`, bukan `/sensor_logs` |
| Dashboard 401 setelah publish | rules belum di-publish, atau `ZONES[].id` ≠ `DEVICE_ID` | samakan keduanya |
| Semua 200 (test mode belum diganti) | rules lama masih aktif | paste rules §2b lalu **Publish** |
| Akun signup dapat 200 | rules masih memakai pola email/domain | ganti ke allowlist `auth.uid` (§2b) |

#### Rollback

Simpan `{"rules":{".read":true,".write":true}}` di file lokal sebelum publish. Kalau terkunci di
luar, paste ulang rules itu → **Publish**. Butuh ~30 detik, tidak ada data yang hilang.

#### Catatan produksi

- **`setInsecure(true)`** di `firebase_db.cpp` melepas verifikasi sertifikat TLS. Untuk rilis,
  pakai `client.setCACert(<root cert Google>)` — menambah ~2 KB flash.
- **API key memang publik** — dashboard mengirimkannya ke browser, jadi jangan andalkan
  kerahasiaannya. Provider Email/Password tidak bisa mematikan pendaftaran mandiri, jadi siapa pun
  bisa `signUp` (mis. `siapa-saja@device.local`) hanya berbekal apiKey. Karena itu rules memakai
  **allowlist UID**: akun hasil signup ber-UID acak → nol akses. (Menutup pendaftaran sepenuhnya
  butuh upgrade ke Identity Platform + blocking function — tidak perlu untuk capstone.)
- **Daftar UID dan zona ada di rules** — rules contoh membatasi device `esp32-gh-01` ke zona yang
  sama. Untuk unit baru, tambahkan kondisi pasangan zona–UID pada `sensor_logs.write` dan
  `commands.read`, lalu publish rules tersebut di Firebase Console. Perubahan dokumentasi ini
  tidak mengubah rules yang sedang aktif di Firebase.
- **Legacy database secret**: firmware tidak memakainya lagi (murni ID token `?auth=<idToken>`).
  Kalau di **Project settings → Service accounts → Database secrets** masih ada entri, revoke.
- **Password device** ikut ter-compile ke `firmware.bin`, jadi jangan dipakai ulang di layanan lain.

## 3. Deploy dashboard ke Cloudflare Pages

Hosting: **Cloudflare Pages**, project `smartgh-manager`, production branch `main`, domain
**https://smartgh-manager.pages.dev/**. Alurnya: push ke `main` → Cloudflare menjalankan
build → selesai.

Setting di **Workers & Pages → smartgh-manager → Settings → Builds** (satu kali):

| Setting | Nilai |
|---|---|
| Framework preset | Vite |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Node.js | 22 (lihat `.nvmrc`) |

> **`npm ci` wajib ada.** Cloudflare hanya menjalankan build command yang ditulis di
> dashboard — ia tidak memasang dependency sendiri. Tanpa `npm ci`, `vite` tidak ada dan
> build gagal dengan `Cannot find module 'vite'`.

> **Project harus dibuat lewat Pages → Connect to Git**, bukan Worker → Connect to Git.
> Kalau dashboard meminta **Deploy command**, yang dibuat adalah project Worker, bukan Pages.
> Repo ini dulu memang Worker (`wrangler deploy`, Worker `smartgh`) dan sudah dipindah.

`wrangler.jsonc` hanya menunjuk `pages_build_output_dir: ./dist`. Deploy manual, kalau perlu:

```bash
npm run build
npx wrangler pages deploy
```

Langkah deploy:

1. Cek lokal: `npm run build && npm run preview`.
2. `git add` + `commit` + `push` ke `main`.
3. Tunggu build selesai (±2 menit), lalu verifikasi:
   ```bash
   curl -s https://smartgh-manager.pages.dev/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.(js|css)'
   ```
   Munculnya nama berkas ber-hash = deploy sukses. **Cache-buster manual tidak perlu**: Vite
   memberi nama ber-hash, jadi isi yang berubah selalu punya URL baru.
4. Tambahkan `smartgh-manager.pages.dev` ke **Firebase Authentication → Authorized domains**,
   kalau tidak login admin dari domain itu ditolak (`auth/unauthorized-domain`).
5. Buka halamannya → terbuka sebagai **Tamu** (status aktuator terlihat, sakelar
   disembunyikan). Klik avatar → **Login** untuk kontrol.

### Kalau build gagal

Penyebab paling sering: build command masih `npm run build` saja (tanpa `npm ci`), atau
output directory bukan `dist`. Cek log build di tab **Deployments**.

### Kalau situs masih menyajikan versi lama

Cloudflare memakai `cache-control: max-age=0, must-revalidate`. Muat ulang keras
(`Ctrl+Shift+R`); kalau masih basi, cek **Deployments** — build mungkin gagal diam-diam dan
production tetap versi terakhir yang sukses.

### Header keamanan (file `_headers`)

Pages membaca `public/_headers`, yang ikut tersalin ke `dist/` saat build:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' https://www.gstatic.com; ...
```

CSP **wajib** longgar untuk dua host: `www.gstatic.com` (SDK Firebase compat) dan
`*.firebasedatabase.app` + `*.googleapis.com` (RTDB & Auth REST). Kalau `connect-src` terlalu
ketat, login dan pembacaan data ikut terblokir — gejalanya dashboard kosong + error
"CSP violation" di console.

## 4. Pastikan berjalan

**Serial ESP32** — tanda sehat:
```
Device ID: esp32-gh-01
[fb] login perangkat OK (esp32-gh-01@device.local), token 60 menit
T:29.1C H:62% Soil:38% VPD:1.42kPa ETc:5.2mm [Normal] Mist:OFF Irig:OFF Blower:OFF(lv0%)
```

| Gejala di serial | Penyebab | Aksi |
|---|---|---|
| `[fb] login gagal: HTTP 400 ...` | email/password akun perangkat salah, atau akun belum dibuat | cek `DEVICE_EMAIL`/`DEVICE_PASSWORD` di `secrets.h` vs Authentication → Users |
| `[fb] push log gagal (akan diantrekan ke SD)` + `401` | rules menolak path | pastikan `LOGS_PATH` = `/zones/<DEVICE_ID>/sensor_logs` dan akun berakhiran `@device.local` |
| `[fb] push log gagal` + `404` | `FIREBASE_DB_URL` salah | cek di Firebase console |
| `[wifi] putus, mencoba reconnect...` → `[wifi] tersambung kembali` | normal saat router restart | tidak perlu tindakan |
| `restart dibatalkan: DELETE perintah gagal` | perintah `restart` tidak dihapus, jadi tidak direstart (mencegah reboot loop) | cek konektivitas; restart manual boleh |

**Dashboard** → **login muncul tapi tidak bisa masuk** → cek provider Email/Password aktif & akun
dibuat. **Login OK tapi kosong** → cek `ZONES[].id` di `src/config.js` sama persis dengan `DEVICE_ID`,
dan ESP32 sudah push minimal satu log (tunggu ~20s). Cek `F12 → Network` untuk kode HTTP.

**Badge "diam N menit"** → fetch berhasil tapi log terakhir sudah basi (>60 detik). ESP32 hidup
tapi tidak push, atau push-nya gagal terus dan data ada di antrean MicroSD.

## 5. Alur kontrol (dashboard → aktuator)

1. Admin memilih mode di dashboard → `PUT` JSON ke `commands/{DEVICE_ID}/{entri}` (kunci entri
   dibuat dashboard sendiri, mirip push-ID Firebase) dengan `?auth=<idToken>`.
   Firmware `pollCommands()` membaca `commands/{DEVICE_ID}` sebagai DAFTAR entri, mengambil anak
   paling lama, lalu `DELETE` entri itu. Bentuk lama (`POST` `{action, value}` ke
   `commands/{DEVICE_ID}`) juga sebenarnya terbaca — `POST` di REST Firebase setara `push()`,
   jadi objek itu berakhir sebagai anak ber-push-ID. Kunci eksplisit dipakai supaya urutan
   antrean perintah jelas, bukan karena bentuk lama tidak terbaca.
2. ESP32 `pollCommands()` tiap 5 dtk → ambil 1 perintah terlama (push-ID Firebase terurut waktu)
   → `controlSet*` / `controlRelease` → `DELETE` entri itu.
3. Override manual bersifat **tris-tata per aktuator**: `mode:"on"` = paksa nyala,
   `mode:"off"` = paksa mati, `mode:"auto"` (action `auto`) = lepas override **semua**
   aktuator. `mode` menang atas `value`; entri lama tanpa `mode` tetap terbaca
   (`true` = paksa nyala, `false` = lepas override aktuator itu). Setiap override
   kedaluwarsa sendiri setelah 10 menit.
4. "Terkirim" ≠ "dieksekusi": dashboard menunggu konfirmasi dari nilai yang dipush
   firmware (override terpasang / `vpd_target` / `fase` terpasang). Kalau 40 detik tidak
   ada konfirmasi, dashboard menampilkan "belum dieksekusi" — perintah TIDAK dikirim ulang
   otomatis (risiko aktuator berulang).

Viewer **tidak** melihat switch di UI, dan kalau mencoba lewat UI pun rules akan menolak
(`401`). Perintah yang didukung ESP32: `mist`, `irigasi`, `blower`, `auto`, `restart`,
`set_vpd`, `set_fase`, `set_durasi`, `fase_reset`.

## 6. Menambah greenhouse baru

1. Buat akun perangkat di Authentication → Users: `esp32-gh-02@device.local` + password acak
   (huruf/angka saja, hindari karakter yang merusak JSON).
2. Salin `secrets.h` ke folder firmware unit itu, ganti `DEVICE_ID`, `DEVICE_EMAIL`,
   `DEVICE_PASSWORD`, dan `WIFI_SSID`/`WIFI_PASSWORD` sesuai lokasi.
3. `pio run -t upload` → serial harus print `Device ID: esp32-gh-02` dan login perangkat OK.
4. Ambil UID akun device baru itu (console → Users, atau `localId` dari `accounts:signInWithPassword`),
   lalu **tambahkan ke rules §2b** (di ketiga tempat: `sensor_logs.write`, `commands.read`,
   `sensor_logs/labels.read`). Publish ulang. Tambah satu baris ke `ZONES` di `src/config.js`,
   commit, push.
5. Admin buka dashboard → pilih zona baru → set label (mis. "Cabai merah") lewat tombol pensil.

## 7. Catatan data sensor

`pushSensorLog` mengirim `temperature`, `humidity`, `soil`, `vpd`, `et0`, `status_sistem`,
`manual_mode`, `ts`, dan `device`. Dashboard menampilkan `soil` di card metrik "Tanah" dan kolom
tabel. `device` dipakai untuk penelusuran saat multi-zone.
