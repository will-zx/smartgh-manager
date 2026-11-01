export const fmtNum = (v, d = 2) =>
  typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '-';

export const fmtMl = (v) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v >= 1000 ? `${(v / 1000).toFixed(1)} L` : `${Math.round(v)} mL`;
};

export function fmtLogTime(ts) {
  if (typeof ts !== 'number' || ts < 100000) return '-';
  return new Date(ts * 1000)
    .toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    .replace(/\./g, ':');
}

export function fmtClock(ts) {
  if (typeof ts !== 'number' || ts < 100000) return '?';
  return new Date(ts * 1000)
    .toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    .replace(/\./g, ':');
}

export function fmtTimeShort(ts) {
  if (typeof ts !== 'number' || ts < 100000) return '?';
  return new Date(ts * 1000)
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    .replace(/\./g, ':');
}

export function humanAge(sec) {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return '—';
  if (sec < 0) return '0 detik';
  if (sec < 60) return `${sec} detik`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} menit`;
  const restM = m % 60;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam${restM ? ` ${restM} menit` : ''}`;
  const restH = h % 24;
  return `${Math.floor(h / 24)} hari${restH ? ` ${restH} jam` : ''}`;
}

export function fmtDuration(sec) {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return '-';
  if (sec <= 0) return 'tanpa batas';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (d) parts.push(`${d} hari`);
  if (h) parts.push(`${h} jam`);
  if (m && !d) parts.push(`${m} menit`);
  if (s && !d && !h && !m) parts.push(`${s} detik`);
  return parts.length ? parts.join(' ') : '0 detik';
}

export const mmss = (s) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function fmtPercent(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '-';
  return `${Math.round(v)}%`;
}

export const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
