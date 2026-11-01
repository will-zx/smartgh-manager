<script setup>
import { onUnmounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { state } from '../lib/store.js';

const visible = ref(false);
const message = ref('');
const tone = ref('ok');
let timer = null;

watch(
  () => state.cmdAt,
  () => {
    const msg = state.cmdError || state.cmdStatus;
    if (!msg) return;
    message.value = msg;
    tone.value = state.cmdError ? 'error' : 'ok';
    visible.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      visible.value = false;
    }, 6000);
  },
);

onUnmounted(() => clearTimeout(timer));
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] font-semibold shadow-float sm:inset-x-auto sm:bottom-6 sm:right-6 sm:mx-0"
        :class="tone === 'error'
          ? 'border-danger-line bg-danger-soft text-danger'
          : 'border-primary-line bg-primary-soft text-primary-dark'"
        role="status"
        aria-live="polite"
      >
        <Icon :name="tone === 'error' ? 'alert' : 'check'" :size="15" class="mt-0.5 shrink-0" />
        <span class="flex-1">{{ message }}</span>
        <button
          class="shrink-0 opacity-70 hover:opacity-100"
          type="button"
          aria-label="Tutup notifikasi"
          @click="visible = false"
        >
          <Icon name="x" :size="14" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
