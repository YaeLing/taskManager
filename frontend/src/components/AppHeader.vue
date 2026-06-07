<template>
  <header>
    <div class="logo">
      <div class="logo-icon" style="overflow:hidden" v-html="logoAv"></div>
      <h1>任務排程管理</h1>
    </div>
    <div class="h-divider"></div>
    <div class="hstats">
      <div class="hstat"><div class="n" style="color:var(--acc)">{{ totalCount }}</div><div class="l">全部</div></div>
      <div class="hstat"><div class="n" style="color:var(--q3)">{{ doneCount }}</div><div class="l">完成</div></div>
      <div class="hstat"><div class="n" style="color:var(--q2)">{{ activeCount }}</div><div class="l">待辦</div></div>
    </div>
    <div class="h-divider"></div>
    <button class="team-name-btn" @click="editTeam" title="點擊編輯團隊名稱">
      <div class="team-name-lbl">Team</div>
      <div class="team-name-val">{{ userStore.teamName }}</div>
    </button>
    <div class="h-divider"></div>
    <div class="h-search">
      <svg class="h-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="search" v-model="tasksStore.searchQuery" placeholder="搜尋任務 / 留言…" autocomplete="off">
      <button v-if="tasksStore.searchQuery" class="h-search-clear" @click="tasksStore.searchQuery = ''" title="清除搜尋">✕</button>
    </div>
    <div class="user-prof" @click="userStore.setupVisible = true">
      <div class="user-av" v-html="userAv"></div>
      <span class="user-name-lbl">{{ userStore.profile?.name || '---' }}</span>
    </div>
    <button class="h-ppt-btn" @click="weeklyStore.openPPT()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        <path d="M7 8h4M7 12h2"/><rect x="13" y="7" width="5" height="6" rx="1"/>
      </svg>
      <span>週報</span>
    </button>
    <button class="h-help-btn" @click="$emit('toggleHelp')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span>使用手冊</span>
    </button>
    <button class="h-add" @click="$emit('openTaskModal')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>新增任務</span>
    </button>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore }  from '../stores/user.js'
import { useTasksStore } from '../stores/tasks.js'
import { useWeeklyStore } from '../stores/weekly.js'
import { avHTML } from '../composables/useAvatar.js'

defineEmits(['toggleHelp', 'openTaskModal'])

const userStore  = useUserStore()
const tasksStore = useTasksStore()
const weeklyStore = useWeeklyStore()

const totalCount  = computed(() => tasksStore.tasks.length)
const doneCount   = computed(() => tasksStore.tasks.filter(t => t.done).length)
const activeCount = computed(() => tasksStore.tasks.filter(t => !t.done).length)

const logoAv = computed(() => {
  if (!userStore.profile) return '⬡'
  return avHTML(userStore.profile.avatar, 28, userStore.profile.avatar_type)
})
const userAv = computed(() => {
  if (!userStore.profile) return ''
  return avHTML(userStore.profile.avatar, 26, userStore.profile.avatar_type)
})

function editTeam() {
  const n = prompt('編輯團隊名稱', userStore.teamName)
  if (n !== null) userStore.setTeamName(n.trim() || userStore.teamName)
}
</script>
