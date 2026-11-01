<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  CategoryScale,
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import Icon from './Icon.vue';
import { TREND_RANGE } from '../config.js';
import {
  ageText,
  setTrendRange,
  state,
  trendData,
  zoneName,
} from '../lib/store.js';
import { fmtNum, fmtTimeShort } from '../lib/format.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
);

const SERIES = [
  { key: 'temp', field: 'temperature', label: 'Suhu', unit: '°C', color: '--color-temp', axis: 'y' },
  { key: 'hum', field: 'humidity', label: 'Kelembapan', unit: '%', color: '--color-hum', axis: 'y1' },
  { key: 'vpd', field: 'vpd', label: 'VPD', unit: 'kPa', color: '--color-vpd', axis: 'y2' },
];

const canvas = ref(null);
const hidden = ref({ temp: false, hum: false, vpd: false, target: false });
let chart = null;
let C = null;

const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function readPalette() {
  return {
    temp: cssVar('--color-temp'),
    hum: cssVar('--color-hum'),
    vpd: cssVar('--color-vpd'),
    muted: cssVar('--color-muted'),
    line: cssVar('--color-line'),
    surface: cssVar('--color-surface'),
    ink: cssVar('--color-ink'),
    tooltip: cssVar('--color-sidebar'),
  };
}

function hexToRgba(hex, alpha) {
  const raw = (hex || '').replace('#', '');
  if (raw.length !== 6) return `rgba(0,0,0,${alpha})`;
  const n = parseInt(raw, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const target = computed(() => state.lastData?.phase?.target ?? null);

const latest = computed(() => {
  const rows = trendData.value;
  const out = {};
  for (const s of SERIES) {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (typeof rows[i][s.field] === 'number') {
        out[s.key] = rows[i][s.field];
        break;
      }
    }
  }
  out.target = target.value;
  return out;
});

function buildDatasets(palette) {
  const datasets = SERIES.map((s) => ({
    label: s.label,
    unit: s.unit,
    yAxisID: s.axis,
    data: [],
    borderColor: palette[s.key],
    pointBackgroundColor: palette[s.key],
    backgroundColor:
      s.key === 'temp' ? hexToRgba(palette.temp, 0.16) : 'transparent',
    fill: s.key === 'temp' ? 'origin' : false,
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHoverBorderWidth: 2,
    borderWidth: 2,
    tension: 0.32,
  }));

  datasets.push({
    label: 'Target VPD',
    unit: 'kPa',
    yAxisID: 'y2',
    data: [],
    borderColor: hexToRgba(palette.vpd, 0.65),
    backgroundColor: 'transparent',
    borderDash: [5, 5],
    borderWidth: 1.4,
    pointRadius: 0,
    pointHoverRadius: 0,
    tension: 0,
    fill: false,
  });

  return datasets;
}

function buildScales(palette) {
  const common = {
    grid: { color: palette.line, drawTicks: false },
    border: { display: false },
    ticks: { color: palette.muted, maxTicksLimit: 6, padding: 6 },
  };
  return {
    x: {
      grid: { color: palette.line, drawTicks: false },
      border: { display: false },
      ticks: {
        color: palette.muted,
        maxTicksLimit: 7,
        maxRotation: 0,
        autoSkipPadding: 16,
        padding: 4,
      },
    },
    y: {
      ...common,
      position: 'left',
      suggestedMin: 15,
      suggestedMax: 40,
      ticks: { ...common.ticks, color: palette.temp },
    },
    y1: {
      ...common,
      position: 'right',
      suggestedMin: 0,
      suggestedMax: 100,
      grid: { drawOnChartArea: false },
      ticks: { ...common.ticks, color: palette.hum },
    },
    y2: {
      ...common,
      position: 'right',
      suggestedMin: 0,
      suggestedMax: 3,
      grid: { drawOnChartArea: false },
      ticks: { ...common.ticks, color: palette.vpd },
    },
  };
}

function applyData() {
  if (!chart) return;
  const rows = trendData.value;
  chart.data.labels = rows.map((p) => fmtTimeShort(p.ts));
  SERIES.forEach((s, i) => {
    chart.data.datasets[i].data = rows.map((p) =>
      typeof p[s.field] === 'number' ? p[s.field] : null,
    );
  });
  chart.data.datasets[SERIES.length].data = rows.map(() => target.value);
  chart.update('none');
}

function applyVisibility() {
  if (!chart) return;
  const keys = ['temp', 'hum', 'vpd', 'target'];
  keys.forEach((key, i) => {
    chart.setDatasetVisibility(i, !hidden.value[key]);
  });
  chart.update('none');
}

function toggle(key) {
  hidden.value[key] = !hidden.value[key];
  applyVisibility();
}

function createChart() {
  C = readPalette();
  Chart.defaults.color = C.muted;
  Chart.defaults.borderColor = C.line;
  chart = new Chart(canvas.value, {
    type: 'line',
    data: { labels: [], datasets: buildDatasets(C) },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          padding: 10,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          backgroundColor: C.tooltip,
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label: (ctx) =>
              ` ${ctx.dataset.label}: ${fmtNum(ctx.parsed.y)} ${ctx.dataset.unit || ''}`,
          },
        },
      },
      scales: buildScales(C),
    },
  });
  applyData();
  applyVisibility();
}

function refreshTheme() {
  if (!chart) return;
  C = readPalette();
  Chart.defaults.color = C.muted;
  Chart.defaults.borderColor = C.line;
  chart.options.scales = buildScales(C);
  chart.options.plugins.tooltip.backgroundColor = C.tooltip;
  chart.data.datasets = buildDatasets(C);
  applyData();
  applyVisibility();
}

onMounted(() => {
  createChart();
});

watch(trendData, applyData);
watch(target, applyData);
watch(() => state.theme, refreshTheme);

onUnmounted(() => {
  chart?.destroy();
  chart = null;
});
</script>

<template>
  <section class="card card-pad flex flex-col">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="flex items-center gap-2 text-[14px] font-bold text-ink">
          <Icon name="activity" :size="17" class="text-primary" />
          Tren iklim mikro
          <span class="font-medium text-muted">· {{ zoneName() }}</span>
        </h2>
        <p class="mt-0.5 text-[11px] text-muted">
          Suhu, kelembapan, dan VPD dari pembacaan sensor.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <div class="seg" role="group" aria-label="Rentang waktu grafik">
          <button
            v-for="(range, key) in TREND_RANGE"
            :key="key"
            type="button"
            class="seg-btn"
            :class="state.trendRange === key ? 'seg-btn-on' : ''"
            @click="setTrendRange(key)"
          >
            {{ range.short }}
          </button>
        </div>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        v-for="s in SERIES"
        :key="s.key"
        type="button"
        class="group inline-flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] font-semibold transition-opacity"
        :class="hidden[s.key] ? 'opacity-40' : 'opacity-100'"
        :aria-pressed="!hidden[s.key]"
        :title="`${hidden[s.key] ? 'Tampilkan' : 'Sembunyikan'} ${s.label}`"
        @click="toggle(s.key)"
      >
        <span class="h-2 w-2 rounded-full" :style="{ background: `var(${s.color})` }" />
        <span class="text-muted">{{ s.label }}</span>
        <span class="num text-ink">
          {{ latest[s.key] != null ? fmtNum(latest[s.key], s.key === 'hum' ? 1 : 2) : '-' }}
          <span class="font-medium text-muted">{{ s.unit }}</span>
        </span>
      </button>
      <button
        v-if="target != null"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] font-semibold transition-opacity"
        :class="hidden.target ? 'opacity-40' : 'opacity-100'"
        :aria-pressed="!hidden.target"
        title="Tampilkan atau sembunyikan garis target VPD"
        @click="toggle('target')"
      >
        <span class="h-0 w-4 border-t-2 border-dashed border-vpd" />
        <span class="text-muted">Target</span>
        <span class="num text-ink">{{ target.toFixed(2) }} <span class="font-medium text-muted">kPa</span></span>
      </button>
    </div>

    <div class="relative mt-3 h-[280px] sm:h-[320px]">
      <canvas ref="canvas" />
      <div
        v-if="!trendData.length"
        class="absolute inset-0 grid place-items-center rounded-xl bg-surface-2/60"
      >
        <div class="text-center">
          <Icon name="activity" :size="28" class="mx-auto text-faint" />
          <p class="mt-2 text-[12px] font-semibold text-muted">Menunggu data sensor…</p>
          <p class="text-[11px] text-faint">Grafik muncul setelah perangkat mengirim log.</p>
        </div>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[11px] text-muted">
      <span class="inline-flex items-center gap-1.5">
        <Icon name="clock" :size="13" class="text-faint" />
        Data terakhir {{ ageText }} lalu
      </span>
      <span>{{ trendData.length }} titik · bucket {{ TREND_RANGE[state.trendRange].bucket / 60 }} menit</span>
    </div>
  </section>
</template>
