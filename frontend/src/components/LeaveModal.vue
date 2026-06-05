<template>
  <div class="modal-overlay" v-if="leavesStore.modalOpen" @click.self="leavesStore.modalOpen = false">
    <div class="modal leave-modal">
      <div class="modal-head">
        <h3 class="modal-title">📅 新增請假</h3>
        <button class="modal-close" @click="leavesStore.modalOpen = false">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="field">
        <label>開始日期</label>
        <input type="date" v-model="startDate" @change="syncEndMin">
      </div>
      <div class="field">
        <label>結束日期 <span>（選填，單天可不填）</span></label>
        <input type="date" v-model="endDate" :min="startDate">
      </div>
      <div class="field">
        <label>備註 <span>（選填）</span></label>
        <input type="text" v-model="note" placeholder="例：看診、家庭因素…" maxlength="30">
      </div>
      <button class="vote-confirm-btn" @click="submit" style="margin-top:4px">確認請假</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLeavesStore } from '../stores/leaves.js'
import { useUserStore }   from '../stores/user.js'

const leavesStore = useLeavesStore()
const userStore   = useUserStore()

const today    = new Date().toISOString().slice(0, 10)
function syncEndMin() { if (endDate.value && endDate.value < startDate.value) endDate.value = startDate.value }
const startDate = ref(today)
const endDate   = ref('')
const note      = ref('')

async function submit() {
  if (!startDate.value || !userStore.profile) return
  await leavesStore.add({
    name:        userStore.profile.name,
    avatar:      userStore.profile.avatar,
    avatar_type: userStore.profile.avatar_type,
    date:        startDate.value,
    endDate:     endDate.value || startDate.value,
    note:        note.value,
  })
  leavesStore.modalOpen = false
  startDate.value = today; endDate.value = ''; note.value = ''
}
</script>
