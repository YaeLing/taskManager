<template>
  <div class="modal-overlay" v-if="pointsStore.modalOpen" @click.self="pointsStore.modalOpen = false">
    <div class="modal vote-modal">
      <div class="modal-head">
        <h3 class="modal-title">🚀 本週投票</h3>
        <button class="modal-close" @click="pointsStore.modalOpen = false">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <p class="vote-desc">選擇本週一件讓你印象深刻的完成任務，給完成它的人 🚀 +1</p>

      <div v-if="hasVoted" style="text-align:center;padding:20px;color:var(--dim);font-size:.82rem">
        本週已投票，感謝你的參與！
      </div>
      <div v-else class="vote-task-list">
        <div v-if="!eligibleTasks.length" style="color:var(--dim);font-size:.8rem;padding:12px">
          本週尚無完成任務可投票
        </div>
        <div v-for="t in eligibleTasks" :key="t.id"
             class="vote-task-item" :class="{ selected: pointsStore.selectedTaskId === t.id }"
             @click="pointsStore.selectedTaskId = t.id">
          <div class="vote-task-qdot" :style="{ background: COLORS[t.q] }"></div>
          <div class="vote-task-body">
            <div class="vote-task-text">{{ t.text }}</div>
            <div class="vote-task-handlers">
              <span style="font-size:.62rem;color:var(--dim);margin-right:2px">接手：</span>
              <span v-for="h in (t.handlers || [])" :key="h.name" class="vote-handler-chip">
                <span class="vote-handler-av" v-html="avHTML(h.avatar, 14, h.avatar_type)"></span>{{ h.name }}
              </span>
            </div>
          </div>
        </div>
        <button v-if="pointsStore.selectedTaskId" class="vote-confirm-btn" @click="confirmVote">
          確認投票
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { useTasksStore }  from '../stores/tasks.js'
import { useUserStore }   from '../stores/user.js'
import { COLORS, avHTML }  from '../composables/useAvatar.js'

const pointsStore = usePointsStore()
const tasksStore  = useTasksStore()
const userStore   = useUserStore()

const hasVoted = computed(() => pointsStore.hasVoted(userStore.profile?.name || ''))

const eligibleTasks = computed(() => {
  const name = userStore.profile?.name
  return tasksStore.tasks.filter(t => t.done && (t.handlers || []).length > 0 && !(t.handlers || []).some(h => h.name === name))
})

async function confirmVote() {
  const t = tasksStore.tasks.find(t => t.id === pointsStore.selectedTaskId)
  if (!t || !userStore.profile) return
  const handler = (t.handlers || [])[0]
  if (!handler) return
  const res = await pointsStore.vote(userStore.profile.name, handler.name, t.id, t.text)
  if (res.ok !== false) pointsStore.modalOpen = false
}
</script>
