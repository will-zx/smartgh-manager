<script setup>
import { nextTick, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { login, state } from '../lib/store.js';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const emailEl = ref(null);

watch(
  () => state.loginOpen,
  async (open) => {
    if (!open) return;
    error.value = '';
    loading.value = false;
    await nextTick();
    emailEl.value?.focus();
  },
);

async function submit() {
  if (loading.value) return;
  error.value = '';
  if (!email.value.trim() || !password.value) {
    error.value = 'Email dan password wajib diisi.';
    return;
  }
  loading.value = true;
  try {
    await login(email.value.trim(), password.value);
    password.value = '';
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function close() {
  state.loginOpen = false;
  error.value = '';
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.loginOpen"
        class="fixed inset-0 z-50 grid place-items-center bg-sidebar/60 p-4 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="card w-full max-w-sm overflow-hidden shadow-float">
          <div class="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 class="text-[15px] font-bold text-ink">Masuk sebagai admin</h2>
              <p class="mt-0.5 text-[11px] text-muted">
                Tamu tetap bisa melihat data. Login diperlukan untuk kendali.
              </p>
            </div>
            <button class="btn-icon h-8 w-8" type="button" aria-label="Tutup" @click="close">
              <Icon name="x" :size="15" />
            </button>
          </div>

          <form class="space-y-3 px-5 py-4" @submit.prevent="submit">
            <div>
              <label class="label" for="login-email">Email</label>
              <input
                id="login-email"
                ref="emailEl"
                v-model="email"
                class="input"
                type="email"
                autocomplete="username"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label class="label" for="login-password">Password</label>
              <input
                id="login-password"
                v-model="password"
                class="input"
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <p
              v-if="error"
              class="flex items-start gap-1.5 rounded-lg bg-danger-soft px-2.5 py-2 text-[11px] font-semibold text-danger"
            >
              <Icon name="alert" :size="13" class="mt-0.5 shrink-0" />
              {{ error }}
            </p>

            <button class="btn btn-primary w-full" type="submit" :disabled="loading">
              <Icon v-if="!loading" name="shield" :size="14" />
              {{ loading ? 'Memeriksa…' : 'Masuk' }}
            </button>

            <p class="text-center text-[10.5px] leading-snug text-faint">
              Sesi disimpan di browser ini sampai kamu keluar.
            </p>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
