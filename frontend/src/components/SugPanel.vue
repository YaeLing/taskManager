<template>
  <aside class="sug-panel">
    <div class="sug-head">
      <div class="sug-head-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" stroke-width="2.2" stroke-linecap="round">
          <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
        </svg>
        <h2>建議執行順序</h2>
        <span class="sug-badge">{{ tasksStore.sugTasks.length }}</span>
      </div>
      <div class="sug-sub">依象限優先級 ＋ 截止日期排序</div>
    </div>

    <!-- Tag filters -->
    <div class="sug-tag-filters" v-if="tasksStore.allTags.length">
      <button v-for="tag in tasksStore.allTags" :key="tag"
              class="sug-tag-btn" :class="{ active: tasksStore.sugFilterTags.has(tag) }"
              @click="tasksStore.toggleSugFilter(tag)">{{ tag }}</button>
    </div>

    <!-- Task list -->
    <div class="sug-list">
      <div v-if="!tasksStore.sugTasks.length" class="sug-empty" style="color:var(--dim);font-size:.75rem;padding:16px;text-align:center">
        {{ tasksStore.searchQuery ? '無符合結果' : '目前沒有待辦任務' }}
      </div>
      <div v-for="(t, i) in tasksStore.sugTasks" :key="t.id"
           class="sug-item" :class="{ overdue: isOverdue(t.due) }"
           @click="$emit('openDrawer', t.id)">
        <span class="sug-num">{{ i + 1 }}.</span>
        <button class="sug-check" @click.stop="onDone(t)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        <div class="sug-info">
          <div class="sug-text" v-html="highlight(t.text)"></div>
          <div class="sug-meta">
            <span class="sug-qdot" :style="{ background: COLORS[t.q] }"></span>
            <span v-if="t.due" class="sug-due" :class="{ 'due-red': isOverdue(t.due) }">{{ t.due }}</span>
            <span v-for="tag in (t.tags || [])" :key="tag" class="tag-pill">{{ tag }}</span>
          </div>
        </div>
        <div class="sug-actions">
          <button class="sug-claim" @click.stop="onClaim(t)" :title="isMine(t) ? '取消認領' : '接手'">
            {{ isMine(t) ? '✓我' : '接手' }}
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useTasksStore } from '../stores/tasks.js'
import { useUserStore }  from '../stores/user.js'
import { useWeeklyStore } from '../stores/weekly.js'
import { COLORS, isOverdue } from '../composables/useAvatar.js'

const emit = defineEmits(['openDrawer'])

const tasksStore  = useTasksStore()
const userStore   = useUserStore()
const weeklyStore = useWeeklyStore()

function highlight(text) {
  if (!tasksStore.searchQuery) return text || ''
  const q = tasksStore.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (text || '').replace(new RegExp(q, 'gi'), m => `<mark class="hl">${m}</mark>`)
}

function isMine(t) {
  const name = userStore.profile?.name
  return name && (t.handlers || []).some(h => h.name === name)
}

function onDone(t) {
  const updated = tasksStore.toggleDone(t.id)
  if (updated?.done) weeklyStore.showConfirm(t.id)
}

function onClaim(t) {
  if (!userStore.profile) return
  tasksStore.claimTask(t.id, {
    name: userStore.profile.name,
    avatar: userStore.profile.avatar,
    avatar_type: userStore.profile.avatar_type,
  })
}
</script>
