import { computed, reactive } from 'vue';
import {
  ADMIN_EMAIL,
  ADMIN_UID,
  CMD_TIMEOUT_MS,
  TREND_RANGE,
  VPD_TARGET_MAX,
  VPD_TARGET_MIN,
  ZONES,
} from '../config.js';
import {
  ensureSession,
  getSession,
  isAdminSession,
  readLabels,
  readLogs,
  signIn,
  signOut,
  writeCommand,
  writeLabel,
} from './firebase.js';
import {
  csvCell,
  fmtLogTime,
  humanAge,
  mmss,
} from './format.js';
import { isCommandConfirmed } from './command-confirmation.js';

const THEME_KEY = 'smartgh.theme';
const ACT_NAMES = { mist: 'Misting', irigasi: 'Irigasi', blower: 'Blower' };

function initialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // abaikan
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const state = reactive({
  session: getSession(),
  isAdmin: isAdminSession(),
  currentZone: 0,
  labels: {},
  logs: [],
  lastData: null,
  trendRange: '6j',
  logLimit: TREND_RANGE['6j'].limit,
  logRows: 25,
  logPage: 1,
  logFilter: '',
  online: false,
  loading: false,
  loadError: '',
  now: Date.now(),
  theme: initialTheme(),
  pending: {},
  cmdStatus: '',
  cmdError: '',
  cmdAt: 0,
  loginOpen: false,
  zoneMenuOpen: false,
  refreshSpin: false,
});

function applyTheme() {
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
}

applyTheme();

export function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(THEME_KEY, state.theme);
  } catch {
    // abaikan
  }
  applyTheme();
}

export const zoneId = () => ZONES[state.currentZone].id;
export const zoneName = () =>
  state.labels[zoneId()] || ZONES[state.currentZone].name;

const numOrNull = (v) =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const boolOrNull = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return v > 0;
  return null;
};

function parseOverride(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  if (typeof v === 'number') {
    if (v > 0) return 'on';
    if (v === 0) return 'off';
    return 'auto';
  }
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['on', '1', 'true', 'manual', 'force', 'paksa'].includes(s)) return 'on';
    if (['off', '0', 'false', 'forced'].includes(s)) return 'off';
    if (['auto', '-1', 'fuzzy'].includes(s)) return 'auto';
  }
  return null;
}

function overrideState(src, field, running) {
  const parsed = parseOverride(src[field]);
  if (parsed) return parsed;
  if (src.manual_mode !== true) return 'auto';
  const newFirmware =
    'time_synced' in src || 'fase_aktif' in src || 'blower_level' in src;
  if (newFirmware) return 'unknown';
  return running ? 'on' : 'off';
}

const clockTrusted = (row) =>
  !!row && row.ts !== null && row.synced === true;

export function normLog(src, key) {
  const raw = src || {};
  const statusRaw = typeof raw.status_sistem === 'string' ? raw.status_sistem : '';
  const cleanStatus = statusRaw
    .replace(/\s*\b(SOILERR|NOSYNC|IRRIGOFF)\b/g, '')
    .trim();
  const hasTs = typeof raw.ts === 'number' && raw.ts >= 100000;
  const synced = hasTs && raw.time_synced !== false;
  const level = numOrNull(raw.blower_level);
  const etc = numOrNull(raw.etc ?? raw.et0);
  const soil = numOrNull(raw.soil);
  const soil2 = numOrNull(raw.soil2);
  const soil3 = numOrNull(raw.soil3);
  const soilN =
    numOrNull(raw.soil_n) ?? [soil, soil2, soil3].filter((v) => v !== null).length;

  const row = {
    _key: key,
    ts: hasTs ? raw.ts : null,
    timeText: fmtLogTime(hasTs ? raw.ts : null),
    synced,
    device: typeof raw.device === 'string' ? raw.device : '',
    temperature: numOrNull(raw.temperature),
    humidity: numOrNull(raw.humidity),
    soil,
    soil2,
    soil3,
    soilOk: numOrNull(raw.soil_ok),
    soilN,
    vpd: numOrNull(raw.vpd),
    etc,
    blowerLevel: level,
    misting: typeof raw.misting === 'boolean' ? raw.misting : statusRaw.includes('MISTING'),
    irigasi: typeof raw.irigasi === 'boolean' ? raw.irigasi : statusRaw.includes('IRIGASI'),
    blower: level !== null ? level > 0 : statusRaw.includes('BLOWER'),
    status: cleanStatus || null,
    statusRaw,
    manual: raw.manual_mode === true,
    fuzzy: {
      mist: boolOrNull(raw.fuzzy_mist),
      irigasi: boolOrNull(raw.fuzzy_irigasi),
      blower: boolOrNull(raw.fuzzy_blower),
    },
    ovLeft: {
      mist: numOrNull(raw.mist_ov_sisa_s),
      irigasi: numOrNull(raw.irig_ov_sisa_s),
      blower: numOrNull(raw.blower_ov_sisa_s),
    },
    flags: {
      sensorError: /sensor error/i.test(statusRaw),
      soilErr: statusRaw.includes('SOILERR'),
      noSync: statusRaw.includes('NOSYNC') || !synced,
      irrigOff: statusRaw.includes('IRRIGOFF'),
    },
    phase: {
      name: typeof raw.fase === 'string' ? raw.fase : null,
      target: numOrNull(raw.vpd_target),
      active: raw.fase_aktif === true,
      duration: numOrNull(raw.fase_durasi_s),
      elapsed: numOrNull(raw.fase_elapsed_s),
      remaining: numOrNull(raw.fase_sisa_s),
    },
    irrigation: {
      doseMl: numOrNull(raw.irigasi_dosis_ml),
      doseMs: numOrNull(raw.irigasi_durasi_ms),
      budgetMl: numOrNull(raw.irigasi_anggaran_ml),
      usedMl: numOrNull(raw.irigasi_terpakai_ml),
      intervalMin: numOrNull(raw.irigasi_jeda_menit),
      holdReason:
        typeof raw.irigasi_alasan_tahan === 'string'
          ? raw.irigasi_alasan_tahan
          : '',
    },
  };

  row.override = {
    mist: overrideState(raw, 'mist_ov', row.misting),
    irigasi: overrideState(raw, 'irig_ov', row.irigasi),
    blower: overrideState(raw, 'blower_ov', row.blower),
  };
  return row;
}

let latestAny = null;
let lastDataAt = 0;
let fetchSeq = 0;
let timer = null;
let latestTimer = null;
let clockTimer = null;

export const age = computed(() => {
  const d = state.lastData;
  if (!clockTrusted(d)) return null;
  return Math.max(0, Math.floor(state.now / 1000) - d.ts);
});

export const ageText = computed(() => humanAge(age.value));

export const isStale = computed(() => age.value !== null && age.value > 300);

export const soilHealth = computed(() => {
  const d = state.lastData;
  if (!d) return null;
  if (d.soilN === 3) return { text: '3/3 probe', tone: 'ok' };
  if (d.soilN >= 1) return { text: `${d.soilN}/3 probe`, tone: 'warn' };
  return { text: 'probe tidak terdeteksi', tone: 'danger' };
});

export const metrics = computed(() => {
  const d = state.lastData;
  const ig = d?.irrigation || null;
  const remainingBudget =
    ig && ig.budgetMl !== null && ig.usedMl !== null
      ? ig.budgetMl - ig.usedMl
      : null;

  return [
    {
      key: 'temp',
      label: 'Suhu udara',
      value: d?.temperature,
      digits: 1,
      unit: '°C',
      tone: 'temp',
      hint: 'SHT31',
    },
    {
      key: 'hum',
      label: 'Kelembapan',
      value: d?.humidity,
      digits: 1,
      unit: '%',
      tone: 'hum',
      hint: 'RH relatif',
    },
    {
      key: 'soil',
      label: 'Kadar air tanah',
      value: d?.soil,
      digits: 0,
      unit: '%',
      tone: 'soil',
      hint: soilHealth.value?.text || 'rata-rata probe',
      hintTone: soilHealth.value?.tone,
    },
    {
      key: 'vpd',
      label: 'VPD',
      value: d?.vpd,
      digits: 2,
      unit: 'kPa',
      tone: 'vpd',
      hint: d?.phase?.target != null ? `target ${d.phase.target.toFixed(2)}` : 'defisit tekanan',
    },
    {
      key: 'etc',
      label: 'ETc',
      value: d?.etc,
      digits: 2,
      unit: 'mm/hari',
      tone: 'etc',
      hint: 'Blaney-Criddle',
    },
    ...(ig?.budgetMl != null
      ? [{
          key: 'budget',
          label: 'Dosis harian',
          value: ig.budgetMl,
          unit: '',
          ml: true,
          tone: 'dose',
          hint:
            remainingBudget === null
              ? 'anggaran irigasi'
              : remainingBudget > 0
                ? `sisa ${fmtMlShort(remainingBudget)}`
                : 'anggaran habis',
        }]
      : []),
    ...(ig?.usedMl != null
      ? [{
          key: 'used',
          label: 'Air terpakai',
          value: ig.usedMl,
          unit: '',
          ml: true,
          tone: 'vpd',
          hint: 'hari ini',
        }]
      : []),
  ];
});

function fmtMlShort(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} L` : `${Math.round(v)} mL`;
}

const FLAT_FIELDS = ['temperature', 'humidity', 'vpd', 'etc', 'soil'];

export const trendData = computed(() => {
  const bucket = TREND_RANGE[state.trendRange].bucket;
  const groups = new Map();
  for (const row of state.logs) {
    if (!clockTrusted(row)) continue;
    const slot = Math.floor(row.ts / bucket);
    if (!groups.has(slot)) groups.set(slot, []);
    groups.get(slot).push(row);
  }
  const out = [];
  for (const [slot, rows] of groups) {
    const point = { ts: slot * bucket };
    for (const field of FLAT_FIELDS) {
      let sum = 0;
      let n = 0;
      for (const r of rows) {
        const v = r[field];
        if (typeof v === 'number' && Number.isFinite(v)) {
          sum += v;
          n += 1;
        }
      }
      point[field] = n ? sum / n : null;
    }
    out.push(point);
  }
  return out;
});

export const matchedLogs = computed(() => {
  const filter = state.logFilter.trim().toLowerCase();
  const rows = [...state.logs];
  rows.sort((a, b) => {
    const at = a.ts ?? -Infinity;
    const bt = b.ts ?? -Infinity;
    return bt - at;
  });
  if (!filter) return rows;
  return rows.filter((row) =>
    `${row.timeText} ${row.statusRaw} ${row.phase.name || ''}`
      .toLowerCase()
      .includes(filter),
  );
});

export const logPageCount = computed(() =>
  Math.max(1, Math.ceil(matchedLogs.value.length / state.logRows)),
);

export const safeLogPage = computed(() =>
  Math.min(Math.max(1, state.logPage), logPageCount.value),
);

export const pagedLogs = computed(() => {
  const start = (safeLogPage.value - 1) * state.logRows;
  return matchedLogs.value.slice(start, start + state.logRows);
});

export const actuators = computed(() => {
  const d = state.lastData;
  if (!d) {
    return {
      mist: false,
      irigasi: false,
      blower: false,
      level: null,
      fuzzy: { mist: null, irigasi: null, blower: null },
      flags: null,
    };
  }
  return {
    mist: d.misting,
    irigasi: d.irigasi,
    blower: d.blower,
    level: d.blowerLevel,
    fuzzy: d.fuzzy,
    flags: d.flags,
  };
});

export const actuatorModes = computed(() =>
  state.lastData
    ? { ...state.lastData.override }
    : { mist: 'auto', irigasi: 'auto', blower: 'auto' },
);

export const overrideSeconds = computed(() => {
  void state.now;
  const out = { mist: 0, irigasi: 0, blower: 0 };
  const d = state.lastData;
  if (!d) return out;
  const since = Math.max(0, Math.floor((Date.now() - lastDataAt) / 1000));
  for (const key of Object.keys(out)) {
    const left = d.ovLeft[key];
    out[key] = left === null ? 0 : Math.max(0, Math.floor(left) - since);
  }
  return out;
});

export const overrideChip = (key) => {
  const mode = actuatorModes.value[key];
  const seconds = overrideSeconds.value[key];
  if ((mode === 'on' || mode === 'off') && seconds > 0) {
    return `${mode === 'on' ? 'ON' : 'OFF'} ${mmss(seconds)}`;
  }
  return null;
};

async function fetchDataLogs() {
  const seq = ++fetchSeq;
  const zone = zoneId();
  const limit = state.logLimit;
  state.loading = true;
  try {
    const data = await readLogs(zone, limit);
    if (!data) throw new Error('belum ada data');
    if (seq !== fetchSeq || zone !== zoneId() || limit !== state.logLimit) return;

    const rows = Object.entries(data).map(([key, value]) => normLog(value, key));
    latestAny = rows[rows.length - 1] || null;
    rows.sort((a, b) => {
      const at = a.ts ?? -Infinity;
      const bt = b.ts ?? -Infinity;
      return at - bt;
    });

    state.logs = rows;
    const trusted = rows.filter(clockTrusted);
    state.lastData = trusted.length ? trusted[trusted.length - 1] : latestAny;
    if (!state.lastData) throw new Error('belum ada data');
    lastDataAt = Date.now();
    state.online = true;
    state.loadError = '';
    state.now = Date.now();
    checkPending();
  } catch (err) {
    if (seq !== fetchSeq) return;
    console.error('Gagal memuat data:', err.message);
    state.online = false;
    state.loadError = err.message;
  } finally {
    if (seq === fetchSeq) state.loading = false;
  }
}

async function pollLatestForConfirmation() {
  try {
    const data = await readLogs(zoneId(), 1);
    if (!data) return;
    const entries = Object.entries(data);
    if (!entries.length) return;
    const [key, value] = entries[entries.length - 1];
    const row = normLog(value, key);
    latestAny = row;
    if (
      clockTrusted(row) &&
      (!state.lastData || (row.ts ?? 0) >= (state.lastData.ts ?? 0))
    ) {
      state.lastData = row;
      lastDataAt = Date.now();
      if (!state.logs.some((item) => item._key === key)) {
        state.logs = [...state.logs, row]
          .sort((a, b) => (a.ts ?? -Infinity) - (b.ts ?? -Infinity))
          .slice(-state.logLimit);
      }
    }
    checkPending();
  } catch {
    // Diamkan: fetch jendela penuh yang melaporkan status koneksi.
  }
}

function cmdLabel(cmd) {
  if (cmd.action === 'auto') return 'Kembali ke Auto';
  if (cmd.action === 'set_vpd') return 'Target VPD';
  if (cmd.action === 'set_fase') return cmd.value ? 'Nama fase' : 'Nonaktifkan setpoint';
  if (cmd.action === 'set_durasi') return 'Durasi fase';
  if (cmd.action === 'fase_reset') return 'Reset penghitung fase';
  return ACT_NAMES[cmd.action] || cmd.action;
}

function checkPending() {
  const slots = Object.entries(state.pending);
  if (!slots.length) return;
  const row = latestAny ?? state.lastData;
  for (const [key, pending] of slots) {
    if (isCommandConfirmed(pending, row)) {
      state.cmdStatus = `Status ${cmdLabel(pending)} terkonfirmasi dari telemetri terbaru.`;
      state.cmdError = '';
      state.cmdAt = Date.now();
      delete state.pending[key];
    } else if (Date.now() > pending.deadline) {
      const id = pending.commandId ? ` (ID ${pending.commandId})` : '';
      state.cmdError =
        `Status ${cmdLabel(pending)}${id} belum terkonfirmasi dari telemetri terbaru ` +
        `dalam ${Math.round(CMD_TIMEOUT_MS / 1000)} detik. Perintah mungkin sudah diterapkan; ` +
        'periksa log serial dan data RTDB sebelum mengirim ulang.';
      state.cmdStatus = '';
      state.cmdAt = Date.now();
      delete state.pending[key];
    }
  }
}

const pendingKey = (action) => action;

export async function sendCommand(action, value, extra = {}) {
  const silent = extra.silent === true;
  if (!state.session) {
    state.cmdStatus = 'Masuk sebagai tamu — login admin untuk mengirim perintah.';
    state.cmdAt = Date.now();
    return false;
  }
  if (!state.isAdmin) {
    state.cmdStatus = 'Hanya admin yang boleh mengirim perintah.';
    state.cmdAt = Date.now();
    return false;
  }
  checkPending();
  const key = pendingKey(action);
  if (state.pending[key]) {
    state.cmdStatus = `Tunggu perintah ${cmdLabel(state.pending[key])} selesai dulu.`;
    state.cmdError = '';
    state.cmdAt = Date.now();
    return false;
  }

  const body = { action, value };
  if (extra.unit) body.unit = extra.unit;
  if (extra.mode) body.mode = extra.mode;

  if (!silent) {
    state.cmdStatus = `Mengirim ${cmdLabel({ action, value })}…`;
    state.cmdError = '';
    state.cmdAt = Date.now();
  }
  try {
    const baseline = latestAny ?? state.lastData;
    const response = await writeCommand(zoneId(), body);
    state.pending[key] = {
      action,
      value,
      mode: extra.mode ?? null,
      seconds: extra.seconds ?? null,
      commandId: response?.name ?? null,
      baselineLogKey: baseline?._key ?? null,
      baselineLogTs: baseline?.ts ?? null,
      sentAt: Date.now(),
      deadline: Date.now() + CMD_TIMEOUT_MS,
    };
    if (!silent) {
      state.cmdStatus = `Perintah ${cmdLabel({ action, value })} terkirim — menunggu konfirmasi perangkat…`;
      state.cmdAt = Date.now();
    }
    setTimeout(pollLatestForConfirmation, 10_000);
    setTimeout(pollLatestForConfirmation, 30_000);
    setTimeout(checkPending, CMD_TIMEOUT_MS + 1_000);
    return true;
  } catch (e) {
    console.error('Gagal kirim perintah:', e.message);
    if (/sesi login berakhir/i.test(e.message)) {
      state.session = null;
      state.isAdmin = false;
    }
    state.cmdStatus = '';
    state.cmdError = `Gagal mengirim perintah: ${e.message}`;
    state.cmdAt = Date.now();
    return false;
  }
}

export function onSwitch(action, mode) {
  sendCommand(action, mode !== 'auto', { mode });
}

export function releaseAll() {
  sendCommand('auto', true);
}

export function setVpdTarget(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < VPD_TARGET_MIN || n > VPD_TARGET_MAX) {
    state.cmdError = `Target VPD harus antara ${VPD_TARGET_MIN} dan ${VPD_TARGET_MAX} kPa.`;
    state.cmdAt = Date.now();
    return;
  }
  sendCommand('set_vpd', n);
}

export function setPhaseName(name) {
  sendCommand('set_fase', String(name || '').trim());
}

export function setPhaseDuration(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    state.cmdError = 'Durasi harus angka >= 0.';
    state.cmdAt = Date.now();
    return;
  }
  const mult = { detik: 1, menit: 60, jam: 3600, hari: 86400 }[unit] || 1;
  const seconds = Math.round(n * mult);
  if (seconds > 31536000) {
    state.cmdError = 'Durasi maksimum 1 tahun.';
    state.cmdAt = Date.now();
    return;
  }
  sendCommand('set_durasi', n, { unit, seconds });
}

export async function setPhaseSetpoints({ vpd, name, duration, unit }) {
  const p = state.lastData?.phase;
  if (!p) {
    state.cmdError = 'Data fase belum tersedia — tunggu pembacaan perangkat.';
    state.cmdAt = Date.now();
    return false;
  }

  const jobs = [];
  const vpdText = String(vpd ?? '').trim();
  if (vpdText !== '') {
    const n = Number(vpdText);
    if (!Number.isFinite(n) || n < VPD_TARGET_MIN || n > VPD_TARGET_MAX) {
      state.cmdError = `Target VPD harus antara ${VPD_TARGET_MIN} dan ${VPD_TARGET_MAX} kPa.`;
      state.cmdAt = Date.now();
      return false;
    }
    if (p.target === null || Math.abs(p.target - n) >= 0.005) {
      jobs.push({ action: 'set_vpd', value: n });
    }
  }

  const nm = String(name ?? '').trim();
  if (nm && nm !== (p.name || '')) {
    jobs.push({ action: 'set_fase', value: nm });
  }

  const durText = String(duration ?? '').trim();
  if (durText !== '') {
    const n = Number(durText);
    if (!Number.isFinite(n) || n < 0) {
      state.cmdError = 'Durasi harus angka >= 0.';
      state.cmdAt = Date.now();
      return false;
    }
    const mult = { detik: 1, menit: 60, jam: 3600, hari: 86400 }[unit] || 1;
    const seconds = Math.round(n * mult);
    if (seconds > 31536000) {
      state.cmdError = 'Durasi maksimum 1 tahun.';
      state.cmdAt = Date.now();
      return false;
    }
    if (p.duration === null || p.duration !== seconds) {
      jobs.push({ action: 'set_durasi', value: n, extra: { unit, seconds } });
    }
  }

  if (!jobs.length) {
    state.cmdStatus = 'Tidak ada setpoint yang berubah.';
    state.cmdError = '';
    state.cmdAt = Date.now();
    return false;
  }

  const busy = jobs.find((job) => state.pending[job.action]);
  if (busy) {
    state.cmdStatus = `Tunggu perintah ${cmdLabel(state.pending[busy.action])} selesai dulu.`;
    state.cmdError = '';
    state.cmdAt = Date.now();
    return false;
  }

  const results = await Promise.all(
    jobs.map((job) =>
      sendCommand(job.action, job.value, { ...job.extra, silent: true }),
    ),
  );
  if (results.every(Boolean)) {
    state.cmdError = '';
    state.cmdStatus = `Mengirim ${jobs.length} setpoint — menunggu konfirmasi perangkat…`;
    state.cmdAt = Date.now();
    return true;
  }
  return false;
}

export function resetPhaseCounter() {
  sendCommand('fase_reset', true);
}

export function exportCsv() {
  const rows = [...state.logs].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  if (!rows.length) {
    state.cmdStatus = 'Belum ada data untuk diekspor.';
    state.cmdAt = Date.now();
    return;
  }
  const head = [
    'waktu',
    'suhu_C',
    'kelembapan_pct',
    'tanah_pct',
    'vpd_kPa',
    'etc_mm_hari',
    'status',
    'manual_mode',
    'fase',
    'vpd_target_kPa',
    'fase_aktif',
    'durasi_s',
    'elapsed_s',
    'sisa_s',
    'device',
  ];
  const body = rows.map((row) =>
    [
      row.ts ? new Date(row.ts * 1000).toISOString() : '',
      row.temperature,
      row.humidity,
      row.soil,
      row.vpd,
      row.etc,
      row.statusRaw,
      row.manual ? 'YA' : 'TIDAK',
      row.phase.name,
      row.phase.target,
      row.phase.active ? 'YA' : 'TIDAK',
      row.phase.duration,
      row.phase.elapsed,
      row.phase.remaining,
      row.device,
    ]
      .map(csvCell)
      .join(','),
  );
  const blob = new Blob(
    [`\ufeff${[head.join(',')].concat(body).join('\n')}`],
    { type: 'text/csv;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smartgh_${zoneId()}_${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  state.cmdStatus = `${rows.length} baris diekspor ke CSV.`;
  state.cmdAt = Date.now();
}

export function setTrendRange(range) {
  if (!TREND_RANGE[range] || range === state.trendRange) return;
  state.trendRange = range;
  state.logLimit = TREND_RANGE[range].limit;
  state.logs = [];
  fetchDataLogs();
  startTimer();
}

export function setLogRows(rows) {
  state.logRows = Number(rows) || 25;
  state.logPage = 1;
}

export function setLogFilter(value) {
  state.logFilter = value;
  state.logPage = 1;
}

export function setLogPage(page) {
  state.logPage = Math.min(Math.max(1, page), logPageCount.value);
}

export function switchZone(index) {
  if (index === state.currentZone) return;
  state.currentZone = index;
  state.lastData = null;
  state.logs = [];
  state.logFilter = '';
  state.logPage = 1;
  state.online = false;
  state.pending = {};
  state.cmdStatus = '';
  state.cmdError = '';
  state.zoneMenuOpen = false;
  latestAny = null;
  lastDataAt = 0;
  fetchDataLogs();
}

export async function saveZoneLabel(index, value) {
  if (!state.isAdmin) throw new Error('Hanya admin yang boleh mengganti label.');
  const zone = ZONES[index];
  if (!zone) throw new Error('Zona tidak dikenal.');
  const label = String(value ?? '').trim().slice(0, 40);
  await writeLabel(zone.id, label || null);
  if (label) state.labels[zone.id] = label;
  else delete state.labels[zone.id];
  return label;
}

export async function refresh() {
  state.refreshSpin = true;
  const started = Date.now();
  try {
    const labelsPromise = readLabels().catch((e) => {
      console.warn('Label tidak terbaca:', e.message);
      return null;
    });
    const [, labels] = await Promise.all([fetchDataLogs(), labelsPromise]);
    if (labels) state.labels = labels;
  } finally {
    setTimeout(() => {
      state.refreshSpin = false;
    }, Math.max(0, 600 - (Date.now() - started)));
  }
}

export async function login(email, password) {
  const session = await signIn(email, password);
  state.session = session;
  state.isAdmin = isAdminSession(session);
  state.loginOpen = false;
  state.cmdError = '';
  state.cmdStatus = state.isAdmin
    ? 'Login admin berhasil. Kontrol aktuator dan setpoint aktif.'
    : 'Login berhasil, tetapi akun ini bukan admin — hanya bisa melihat data.';
  state.cmdAt = Date.now();
}

export function logout() {
  signOut();
  state.session = null;
  state.isAdmin = false;
}

export async function init() {
  applyTheme();
  const session = await ensureSession().catch(() => null);
  state.session = session;
  state.isAdmin = isAdminSession(session);
  try {
    state.labels = (await readLabels()) || {};
  } catch (e) {
    console.warn('Label tidak terbaca:', e.message);
  }
  await fetchDataLogs();
  startTimer();
  startLatestTimer();
  if (!clockTimer) {
    clockTimer = setInterval(() => {
      state.now = Date.now();
    }, 1000);
  }
  document.addEventListener('visibilitychange', onVisibility);
}

function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(fetchDataLogs, TREND_RANGE[state.trendRange].pollMs);
}

function startLatestTimer() {
  if (latestTimer) clearInterval(latestTimer);
  latestTimer = setInterval(pollLatestForConfirmation, 30_000);
}

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    clearInterval(timer);
    timer = null;
    clearInterval(latestTimer);
    latestTimer = null;
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
  } else {
    state.now = Date.now();
    fetchDataLogs();
    startTimer();
    startLatestTimer();
    if (!clockTimer) {
      clockTimer = setInterval(() => {
        state.now = Date.now();
      }, 1000);
    }
  }
}

export function dispose() {
  clearInterval(timer);
  clearInterval(latestTimer);
  clearInterval(clockTimer);
  timer = null;
  latestTimer = null;
  clockTimer = null;
  document.removeEventListener('visibilitychange', onVisibility);
}

export { ADMIN_EMAIL, ADMIN_UID, ACT_NAMES, VPD_TARGET_MIN, VPD_TARGET_MAX };
