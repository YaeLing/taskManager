<template>
  <div class="weekly-overlay" :class="{ active: weeklyStore.confirmOpen }"
       @click.self="weeklyStore.skipConfirm()">
    <div class="wc-modal">
      <div class="wc-icon">✅</div>
      <h3>要記錄到本週簡報嗎？</h3>
      <p class="wc-task">{{ taskName }}</p>
      <div class="wc-btns">
        <button class="wc-skip" @click="weeklyStore.skipConfirm()">不用</button>
        <button class="wc-fill" @click="fillRecord">要，填寫資料</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWeeklyStore } from '../stores/weekly.js'
import { useTasksStore }  from '../stores/tasks.js'

const weeklyStore = useWeeklyStore()
const tasksStore  = useTasksStore()

const taskName = computed(() => {
  const t = tasksStore.tasks.find(t => t.id === weeklyStore.pendingTaskId)
  return t?.text || ''
})

function fillRecord() {
  const t = tasksStore.tasks.find(t => t.id === weeklyStore.pendingTaskId)
  weeklyStore.openRecord(t)
}
</script>

<style scoped>
.weekly-overlay { display: none; }
.weekly-overlay.active { display: flex; }
</style>
