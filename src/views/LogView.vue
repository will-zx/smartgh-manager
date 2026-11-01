<script setup>
import { computed } from 'vue';
import Icon from '../components/Icon.vue';
import { TREND_RANGE } from '../config.js';
import {
  ageText,
  exportCsv,
  logPageCount,
  matchedLogs,
  pagedLogs,
  safeLogPage,
  setLogFilter,
  setLogPage,
  setLogRows,
  state,
  zoneName,
} from '../lib/store.js';
import { fmtNum } from '../lib/format.js';

const rangeLabel = computed(() => TREND_RANGE[state.trendRange].label);

const pageNumbers = computed(() => {
  const total = logPageCount.value;
  const current = safeLogPage.value;
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  const pages = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
});

const firstRow = computed(() =>
  matchedLogs.value.length ? (safeLogPage.value - 1) * state.logRows + 1 : 0,
);
const lastRow = computed(() =>
  Math.min(safeLogPage.value * state.logRows, matchedLogs.value.length),
);

function statusTone(row) {
  const s = (row.status || '').toLowerCase();
  return ['misting', 'blower', 'irigasi'].some((k) => s.includes(k))
    ? 'pill-on'
    : 'pill-off';
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
          Histori pembacaan
        </p>
        <h1 class="mt-0.5 text-[20px] font-bold text-ink">Log sensor · {{ zoneName() }}</h1>
        <p class="text-[11.5px] text-muted">
          Jendela {{ rangeLabel }} · {{ matchedLogs.length }} baris · data terakhir {{ ageText }} lalu
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn" type="button" @click="exportCsv()">
          <Icon name="download" :size="14" class="text-primary" />
          Export CSV
        </button>
      </div>
    </div>

    <div class="card card-pad">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <Icon
            name="search"
            :size="15"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            :value="state.logFilter"
            class="input pl-9"
            type="search"
            placeholder="Cari waktu, status, atau fase…"
            aria-label="Cari log"
            @input="setLogFilter($event.target.value)"
          />
        </div>

        <label class="flex items-center gap-2 text-[11.5px] font-semibold text-muted">
          Tampilkan
          <select
            :value="state.logRows"
            class="input w-auto py-1.5"
            @change="setLogRows($event.target.value)"
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          baris
        </label>
      </div>

      <div class="mt-3 overflow-x-auto rounded-xl border border-line">
        <table class="w-full min-w-[880px] border-collapse text-[12px]">
          <thead>
            <tr>
              <th class="table-head sticky left-0 z-10 bg-surface-2">Waktu</th>
              <th class="table-head">Suhu (°C)</th>
              <th class="table-head">RH (%)</th>
              <th class="table-head">Tanah (%)</th>
              <th class="table-head">VPD (kPa)</th>
              <th class="table-head">ETc (mm/hari)</th>
              <th class="table-head">Fase</th>
              <th class="table-head">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="state.loadError">
              <td colspan="8" class="px-4 py-10 text-center">
                <Icon name="alert" :size="22" class="mx-auto text-danger" />
                <p class="mt-2 text-[12px] font-semibold text-danger">
                  Gagal memuat log ({{ state.loadError }}). Gunakan tombol muat ulang di header.
                </p>
              </td>
            </tr>
            <tr v-else-if="!matchedLogs.length">
              <td colspan="8" class="px-4 py-10 text-center">
                <Icon name="list" :size="22" class="mx-auto text-faint" />
                <p class="mt-2 text-[12px] font-semibold text-muted">
                  {{ state.logFilter ? 'Tidak ada baris yang cocok.' : 'Belum ada data sensor.' }}
                </p>
              </td>
            </tr>
            <template v-else>
            <tr
              v-for="row in pagedLogs"
              :key="row._key"
              class="transition-colors hover:bg-primary-soft/40"
            >
              <td
                class="table-cell sticky left-0 z-[1] bg-surface font-semibold text-ink"
                :title="row.ts ? '' : 'Jam perangkat belum sinkron'"
              >
                {{ row.ts ? row.timeText : '—' }}
              </td>
              <td class="table-cell num font-semibold text-ink">{{ fmtNum(row.temperature, 1) }}</td>
              <td class="table-cell num font-semibold text-ink">{{ fmtNum(row.humidity, 1) }}</td>
              <td class="table-cell num font-semibold text-ink">{{ fmtNum(row.soil, 0) }}</td>
              <td class="table-cell num font-semibold text-ink">{{ fmtNum(row.vpd) }}</td>
              <td class="table-cell num font-semibold text-ink">{{ fmtNum(row.etc) }}</td>
              <td class="table-cell">
                <span v-if="row.phase.name" class="capitalize text-muted">{{ row.phase.name }}</span>
                <span v-else class="text-faint">—</span>
              </td>
              <td class="table-cell">
                <span class="pill" :class="statusTone(row)">{{ row.status || '—' }}</span>
                <span v-if="row.flags.soilErr" class="pill pill-danger ml-1">SOILERR</span>
                <span v-if="row.flags.noSync" class="pill pill-warn ml-1">NOSYNC</span>
                <span
                  v-if="row.flags.irrigOff"
                  class="pill pill-warn ml-1"
                  title="Irigasi otomatis dimatikan di perangkat"
                >
                  IRRIGOFF
                </span>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>

      <p class="mt-2 text-[10.5px] text-faint sm:hidden">
        Geser tabel ke samping untuk melihat semua kolom.
      </p>

      <div class="mt-3 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-[11px] text-muted">
          Menampilkan
          <span class="num font-bold text-ink">{{ firstRow }}–{{ lastRow }}</span>
          dari
          <span class="num font-bold text-ink">{{ matchedLogs.length }}</span>
          baris
        </p>

        <div class="flex items-center gap-1">
          <button
            class="btn-icon h-8 w-8"
            type="button"
            :disabled="safeLogPage <= 1"
            aria-label="Halaman sebelumnya"
            @click="setLogPage(safeLogPage - 1)"
          >
            <Icon name="chevronLeft" :size="14" />
          </button>
          <button
            v-for="page in pageNumbers"
            :key="page"
            type="button"
            class="grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[11.5px] font-bold transition-colors"
            :class="page === safeLogPage ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'"
            :aria-current="page === safeLogPage ? 'page' : undefined"
            @click="setLogPage(page)"
          >
            {{ page }}
          </button>
          <button
            class="btn-icon h-8 w-8"
            type="button"
            :disabled="safeLogPage >= logPageCount"
            aria-label="Halaman berikutnya"
            @click="setLogPage(safeLogPage + 1)"
          >
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <p class="px-1 text-[10.5px] leading-relaxed text-faint">
      Dashboard memuat {{ state.logLimit }} record terbaru dari Firebase RTDB dan menampilkan
      {{ state.logRows }} baris per halaman. Dashboard tidak menghapus data; log lama perlu
      kebijakan retensi dari sisi perangkat atau backend.
    </p>
  </div>
</template>
