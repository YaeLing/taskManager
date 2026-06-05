<template>
  <div class="notif-container">
    <TransitionGroup name="notif">
      <div v-for="n in notifications" :key="n.id" class="notif-card" :class="n.type">
        <div class="notif-body">{{ n.text }}</div>
        <button class="notif-close" @click="remove(n.id)">✕</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const notifications = ref([])

let _id = 0
function show(text, type = 'info', duration = 4000) {
  const id = ++_id
  notifications.value.push({ id, text, type })
  setTimeout(() => remove(id), duration)
}
function remove(id) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

defineExpose({ show })
</script>

<style scoped>
.notif-enter-active, .notif-leave-active { transition: all .25s ease; }
.notif-enter-from { opacity: 0; transform: translateY(20px); }
.notif-leave-to   { opacity: 0; transform: translateY(-10px); }
</style>
