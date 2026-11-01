// Konfigurasi publik dashboard. Nilai di bawah berasal dari project Firebase
// yang sudah dipakai firmware. Untuk mendeploy versi lain, timpa lewat
// window.__GH_CONFIG__ (lihat public/config.example.js) tanpa mengubah bundle.
const runtime =
  (typeof window !== 'undefined' && window.__GH_CONFIG__) || {};

export const DB_URL =
  runtime.DB_URL ||
  'https://smart-greenhouse-e214c-default-rtdb.asia-southeast1.firebasedatabase.app';

export const ZONES = runtime.ZONES || [
  { id: 'esp32-gh-01', name: 'Greenhouse 1' },
];

export const ADMIN_UID =
  runtime.ADMIN_UID || 'QpW484FycYRnq5S5rzNpON297F83';

export const ADMIN_EMAIL =
  runtime.ADMIN_EMAIL || 'mr.pman@mail.unnes.ac.id';

export const firebaseConfig = runtime.firebaseConfig || {
  apiKey: 'AIzaSyC1ox01jTx12i9-jBFZ3JaYVgnBfcYOjA0',
  projectId: 'smart-greenhouse-e214c',
  authDomain: 'smart-greenhouse-e214c.firebaseapp.com',
};

// Jendela grafik sekaligus jumlah record yang diambil dari RTDB.
// `bucket` = lebar down-sample (detik), `pollMs` = interval polling.
export const TREND_RANGE = {
  '6j': { limit: 1080, bucket: 300, pollMs: 120_000, label: '6 jam', short: '6J' },
  '24j': { limit: 4320, bucket: 600, pollMs: 900_000, label: '24 jam', short: '24J' },
};

// Batas aman perintah: poll perangkat 5 dtk + push 20 dtk + fetch 10 dtk.
export const CMD_TIMEOUT_MS = 45_000;

export const VPD_TARGET_MIN = 0.3;
export const VPD_TARGET_MAX = 2.5;
