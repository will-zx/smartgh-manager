<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import { ageText, isStale, state } from '../lib/store.js';

// Status pembacaan dan fase dipakai di header (layar lebar) dan
// di atas kartu metrik (layar sempit) — jangan tampilkan keduanya sekaligus.
const connection = computed(() => {
  if (!state.online) {
    return { text: 'Gagal memperbarui data', cls: 'pill-danger', dot: 'bg-danger' };
  }
  if (isStale.value) {
    return { text: `Data basi · ${ageText.value} lalu`, cls: 'pill-warn', dot: 'bg-warn' };
  }
  return { text: `Data terbaru · ${ageText.value} lalu`, cls: 'pill-on', dot: 'bg-primary' };
});

</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="pill" :class="connection.cls">
      <span class="h-1.5 w-1.5 rounded-full" :class="connection.dot" />
      {{ connection.text }}
    </span>
    <span v-if="state.lastData?.phase?.name" class="pill pill-off capitalize">
      <Icon name="leaf" :size="11" />
      {{ state.lastData.phase.name }}
    </span>
  </div>
</template>
