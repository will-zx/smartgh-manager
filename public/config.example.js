// Opsional. Muat file ini SEBELUM bundle utama (atau isi nilainya di
// src/config.js) untuk memakai project Firebase lain.
//
// <script src="/config.js"></script>
//
// Semua field boleh dihilangkan; yang tidak diisi memakai nilai default.
window.__GH_CONFIG__ = {
  DB_URL: 'https://PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app',
  ZONES: [{ id: 'esp32-gh-01', name: 'Greenhouse 1' }],
  ADMIN_UID: 'UID_ADMIN',
  ADMIN_EMAIL: 'admin@example.com',
  firebaseConfig: {
    apiKey: 'API_KEY',
    projectId: 'PROJECT_ID',
    authDomain: 'PROJECT.firebaseapp.com',
  },
};
