<script setup>
import { computed, ref, watch } from 'vue';
import Icon from './Icon.vue';
import {
  resetPhaseCounter,
  setPhaseName,
  setPhaseSetpoints,
  state,
  VPD_TARGET_MAX,
  VPD_TARGET_MIN,
} from '../lib/store.js';
import { fmtDuration } from '../lib/format.js';

const phase = computed(() => state.lastData?.phase || null);
const showForm = ref(false);
const vpdInput = ref('');
const nameInput = ref('');
const durInput = ref('');
const durUnit = ref('hari');

watch(
  () => state.lastData?._key,
  () => {
    const p = state.lastData?.phase;
    if (!p) return;
    if (vpdInput.value === '' && p.target !== null) vpdInput.value = String(p.target);
    if (nameInput.value === '' && p.name) nameInput.value = p.name;
  },
);

const progress = computed(() => {
  const p = phase.value;
  if (!p || !p.duration || p.elapsed === null) return 0;
  return Math.min(100, Math.max(0, (p.elapsed / p.duration) * 100));
});

const targetText = computed(() =>
  phase.value?.target != null ? phase.value.target.toFixed(2) : '-',
);

const durationText = computed(() => fmtDuration(phase.value?.duration));
const elapsedText = computed(() => fmtDuration(phase.value?.elapsed));
const remainingText = computed(() => fmtDuration(phase.value?.remaining));

const pending = computed(() =>
  ['set_vpd', 'set_fase', 'set_durasi'].some((action) => state.pending[action]),
);

function applySetpoints() {
  setPhaseSetpoints({
    vpd: vpdInput.value,
    name: nameInput.value,
    duration: durInput.value,
    unit: durUnit.value,
  });
}
</script>

<template>
  <section class="card card-pad flex flex-col">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="flex items-center gap-2 text-[14px] font-bold text-ink">
          <Icon name="target" :size="17" class="text-primary" />
          Fase &amp; setpoint
        </h2>
        <p class="mt-0.5 text-[11px] text-muted">
          Setpoint mengoreksi keluaran fuzzy, bukan menggantikannya.
        </p>
      </div>
      <span
        class="pill shrink-0"
        :class="phase?.active ? 'pill-on' : 'pill-off'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="phase?.active ? 'bg-primary' : 'bg-faint'"
        />
        {{ phase?.active ? 'Aktif' : 'Fuzzy penuh' }}
      </span>
    </div>

    <div class="mt-4 rounded-2xl border border-line bg-gradient-to-br from-primary-soft/70 to-surface-2 p-4">
      <div class="flex items-end justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
            Fase berjalan
          </p>
          <p class="mt-0.5 truncate text-[19px] font-bold capitalize text-ink">
            {{ phase?.name || 'Tanpa fase' }}
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
            Target VPD
          </p>
          <p class="num text-[19px] font-bold text-primary-dark">
            {{ targetText }}
            <span class="text-[10px] font-semibold text-muted">kPa</span>
          </p>
        </div>
      </div>

      <div class="mt-3">
        <div class="h-2 overflow-hidden rounded-full bg-surface ring-1 ring-line">
          <div
            class="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-[width] duration-500"
            :style="{ width: `${progress}%` }"
          />
        </div>
        <div class="mt-1.5 flex justify-between text-[10px] font-semibold text-muted">
          <span>{{ elapsedText }} berjalan</span>
          <span>{{ remainingText }} tersisa</span>
        </div>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2">
      <div class="rounded-xl border border-line bg-surface-2 px-2.5 py-2">
        <p class="text-[9.5px] font-bold uppercase tracking-wide text-muted">Durasi</p>
        <p class="mt-0.5 text-[12px] font-bold text-ink">{{ durationText }}</p>
      </div>
      <div class="rounded-xl border border-line bg-surface-2 px-2.5 py-2">
        <p class="text-[9.5px] font-bold uppercase tracking-wide text-muted">Berjalan</p>
        <p class="mt-0.5 text-[12px] font-bold text-ink">{{ elapsedText }}</p>
      </div>
      <div class="rounded-xl border border-line bg-surface-2 px-2.5 py-2">
        <p class="text-[9.5px] font-bold uppercase tracking-wide text-muted">Sisa</p>
        <p class="mt-0.5 text-[12px] font-bold text-ink">{{ remainingText }}</p>
      </div>
    </div>

    <div class="mt-auto pt-3">
      <template v-if="state.isAdmin">
        <button
          type="button"
          class="btn w-full"
          :aria-expanded="showForm"
          @click="showForm = !showForm"
        >
          <Icon name="settings" :size="14" class="text-primary" />
          {{ showForm ? 'Tutup pengaturan' : 'Ubah setpoint' }}
          <Icon
            name="chevronDown"
            :size="14"
            class="ml-auto transition-transform"
            :class="showForm ? 'rotate-180' : ''"
          />
        </button>

        <div v-if="showForm" class="mt-3 space-y-3 rounded-xl border border-line bg-surface-2 p-3">
          <div>
            <label class="label" for="vpd-target">Target VPD (kPa)</label>
            <input
              id="vpd-target"
              v-model="vpdInput"
              class="input"
              type="number"
              :min="VPD_TARGET_MIN"
              :max="VPD_TARGET_MAX"
              step="0.05"
              :placeholder="phase?.target != null ? String(phase.target) : '1.00'"
            />
            <p class="mt-1 text-[10px] text-faint">Rentang {{ VPD_TARGET_MIN }}–{{ VPD_TARGET_MAX }} kPa</p>
          </div>

          <div>
            <label class="label" for="phase-name">Nama fase</label>
            <input
              id="phase-name"
              v-model="nameInput"
              class="input"
              type="text"
              maxlength="23"
              :placeholder="phase?.name || 'Vegetatif'"
            />
          </div>

          <div>
            <label class="label" for="phase-duration">Durasi fase</label>
            <div class="flex gap-2">
              <input
                id="phase-duration"
                v-model="durInput"
                class="input"
                type="number"
                min="0"
                step="1"
                placeholder="14"
              />
              <select v-model="durUnit" class="input w-auto shrink-0">
                <option value="detik">detik</option>
                <option value="menit">menit</option>
                <option value="jam">jam</option>
                <option value="hari">hari</option>
              </select>
            </div>
          </div>

          <div class="border-t border-line pt-3">
            <p class="mb-2 text-[10px] leading-snug text-faint">
              Kosongkan field yang tidak ingin diubah. Tombol Nonaktifkan menghapus fase.
            </p>
            <button
              class="btn btn-primary w-full"
              type="button"
              :disabled="pending"
              @click="applySetpoints"
            >
              <Icon name="check" :size="14" />
              {{ pending ? 'Menunggu perangkat…' : 'Atur Setpoint' }}
            </button>
          </div>

          <div class="flex flex-wrap gap-2 border-t border-line pt-3">
            <button class="btn flex-1" type="button" @click="resetPhaseCounter()">
              <Icon name="refresh" :size="13" class="text-primary" />
              Reset penghitung
            </button>
            <button class="btn flex-1" type="button" @click="setPhaseName('')">
              <Icon name="x" :size="13" class="text-danger" />
              Nonaktifkan
            </button>
          </div>
        </div>
      </template>

      <p v-else class="flex items-center justify-center gap-1.5 text-[11px] text-muted">
        <Icon name="shield" :size="13" class="text-faint" />
        Login admin untuk mengubah setpoint.
      </p>
    </div>
  </section>
</template>
