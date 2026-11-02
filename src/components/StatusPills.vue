<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import { ageText, isStale, soilHealth, state } from '../lib/store.js';

// Satu tempat untuk status pembacaan: umur data, jumlah probe tanah yang
// terbaca, dan fase yang sedang berjalan. Dipakai di header (layar lebar) dan
// di atas kartu metrik (layar sempit) — jangan tampilkan keduanya sekaligus.
const connection = computed(() => {
  if (!state.online) {
    return { text: 'Terputus dari Firebase', cls: 'pill-danger', dot: 'bg-danger' };
  }
  if (isStale.value) {
    return { text: `Data ${ageText.value} lalu`, cls: 'pill-warn', dot: 'bg-warn' };
  }
  return { text: `Live · ${ageText.value} lalu`, cls: 'pill-on', dot: 'bg-primary' };
});

// Probe yang tidak lengkap harus terbaca sebagai peringatan, bukan abu-abu.
const soilPill = computed(() => {
  const tone = soilHealth.value?.tone;
  if (tone === 'warn') return 'pill-warn';
  if (tone === 'danger') return 'pill-danger';
  return 'pill-off';
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="pill" :class="connection.cls">
      <span class="h-1.5 w-1.5 rounded-full" :class="connection.dot" />
      {{ connection.text }}
    </span>
    <span v-if="soilHealth" class="pill" :class="soilPill">
      <Icon name="soil" :size="11" />
      {{ soilHealth.text }}
    </span>
    <span v-if="state.lastData?.phase?.name" class="pill pill-off capitalize">
      <Icon name="leaf" :size="11" />
      {{ state.lastData.phase.name }}
    </span>
  </div>
</template>
