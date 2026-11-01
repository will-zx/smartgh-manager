import { DB_URL, firebaseConfig, ADMIN_UID, ADMIN_EMAIL } from '../config.js';

// Sengaja memakai REST API Firebase, bukan SDK penuh: bundel jauh lebih kecil,
// tidak ada koneksi websocket, dan pembacaan publik tetap jalan tanpa login.
const SESSION_KEY = 'smartgh.session.v2';
const IDENTITY_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token';

function readStored() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.idToken || !s.uid) return null;
    return s;
  } catch {
    return null;
  }
}

function persist(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Mode privat / storage penuh: sesi tetap hidup sampai tab ditutup.
  }
}

let session = readStored();

export const getSession = () => session;

export const isAdminSession = (s = session) =>
  !!s && (ADMIN_UID ? s.uid === ADMIN_UID : s.email === ADMIN_EMAIL);

function authMessage(code) {
  switch (code) {
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
    case 'INVALID_EMAIL':
      return 'Email atau password salah.';
    case 'USER_DISABLED':
      return 'Akun ini dinonaktifkan.';
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Terlalu banyak percobaan. Coba lagi beberapa saat.';
    case 'OPERATION_NOT_ALLOWED':
      return 'Login email/password belum diaktifkan di Firebase.';
    case 'UNAUTHORIZED_DOMAIN':
      return 'Domain ini belum diizinkan di Firebase Authentication.';
    case 'API_KEY_INVALID':
      return 'API key Firebase tidak valid.';
    case 'NETWORK_REQUEST_FAILED':
      return 'Tidak bisa menghubungi Firebase. Periksa koneksi.';
    default:
      return 'Gagal masuk. Periksa koneksi lalu coba lagi.';
  }
}

export async function signIn(email, password) {
  const res = await fetch(
    `${IDENTITY_URL}?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.error?.message || '';
    console.warn('Login gagal:', code);
    throw new Error(authMessage(code));
  }
  session = {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    uid: data.localId,
    email: data.email,
    expiresAt: Date.now() + (Number(data.expiresIn) - 60) * 1000,
  };
  persist(session);
  return session;
}

export function signOut() {
  session = null;
  persist(null);
}

// Perpanjang token bila tinggal < 60 detik. Kalau refresh ditolak (password
// diganti / sesi dicabut), sesi dibersihkan supaya UI kembali ke mode tamu.
export async function ensureSession() {
  if (!session) return null;
  if (session.expiresAt > Date.now() + 60_000) return session;
  try {
    const res = await fetch(
      `${REFRESH_URL}?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: session.refreshToken,
        }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    session = {
      ...session,
      idToken: data.id_token,
      refreshToken: data.refresh_token || session.refreshToken,
      expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
    };
    persist(session);
    return session;
  } catch (e) {
    console.warn('Sesi berakhir:', e.message);
    session = null;
    persist(null);
    return null;
  }
}

async function readPath(path, query = '') {
  const s = await ensureSession().catch(() => null);
  const parts = [];
  if (query) parts.push(query);
  if (s?.idToken) parts.push(`auth=${encodeURIComponent(s.idToken)}`);
  const url = `${DB_URL}/${path}${parts.length ? `?${parts.join('&')}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function readLogs(zoneId, limit) {
  const query = `orderBy=${encodeURIComponent('"$key"')}&limitToLast=${limit}`;
  return readPath(`zones/${encodeURIComponent(zoneId)}/sensor_logs.json`, query);
}

export function readLabels() {
  return readPath('labels.json');
}

async function writePath(path, method, body) {
  const s = await ensureSession();
  if (!s) throw new Error('Sesi login berakhir. Silakan login ulang.');
  const res = await fetch(
    `${DB_URL}/${path}.json?auth=${encodeURIComponent(s.idToken)}`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => null);
}

export function writeCommand(zoneId, body) {
  return writePath(`commands/${encodeURIComponent(zoneId)}`, 'POST', body);
}

export function writeLabel(zoneId, label) {
  return writePath(`labels/${encodeURIComponent(zoneId)}`, 'PUT', label);
}
