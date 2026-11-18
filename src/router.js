import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from './views/DashboardView.vue';
import LogView from './views/LogView.vue';
import SetpointView from './views/SetpointView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard' } },
    { path: '/setpoint', name: 'setpoint', component: SetpointView, meta: { title: 'Setpoint' } },
    { path: '/log', name: 'log', component: LogView, meta: { title: 'Log Sensor' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
