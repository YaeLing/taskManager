<template>
  <aside class="sug-panel">
    <div class="sug-head">
      <div class="sug-head-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" stroke-width="2.2" stroke-linecap="round">
          <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
        </svg>
        <h2>建議執行順序</h2>
        <span class="sug-badge">{{ filteredSugTasks.length }}</span>
      </div>
      <div class="sug-sub">依象限優先級 ＋ 截止日期排序</div>
    </div>

    <!-- Filters -->
    <div class="sug-filters">
      <button class="sug-filter-mine" :class="{ active: tasksStore.sugFilterMine }"
              @click="tasksStore.toggleSugFilterMine()" title="只顯示我接手的任務">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        我的
      </button>
      <div class="sug-tag-filters" v-if="tasksStore.allTags.length">
        <button v-for="tag in tasksStore.allTags" :key="tag"
                class="sug-filter-tag" :class="{ active: tasksStore.sugFilterTags.has(tag) }"
                @click="tasksStore.toggleSugFilter(tag)">{{ tag }}</button>
      </div>
    </div>

    <!-- Task list -->
    <div class="sug-list">
      <div v-if="!filteredSugTasks.length" class="sug-empty"
           style="color:var(--dim);font-size:.75rem;padding:16px;text-align:center">
        {{ tasksStore.searchQuery ? '無符合結果' : (tasksStore.sugFilterMine ? '沒有我接手的任務' : '目前沒有待辦任務') }}
      </div>
      <div v-for="(t, i) in filteredSugTasks" :key="t.id"
           class="sug-item" :style="{ '--ic': COLORS[t.q] }"
           @click="$emit('openDrawer', t.id)">
        <span class="sug-rank">{{ i + 1 }}</span>
        <div class="sug-body">
          <div class="sug-text" v-html="highlight(t.text)"></div>
          <div class="sug-tags">
            <span class="sug-tag sug-qbadge"
                  :style="{ background: COLORS[t.q] + '18', color: COLORS[t.q], borderColor: COLORS[t.q] + '40' }">
              {{ QNAMES[t.q] }}
            </span>
            <span v-if="isOverdue(t.due)" class="sug-tag"
                  style="background:rgba(184,114,106,.12);color:var(--q1);border-color:var(--q1gl)">⚠ 逾期</span>
            <span v-else-if="t.due" class="sug-tag sug-duebadge"
                  style="background:var(--s2);color:var(--dim);border-color:var(--border2)">📅 {{ t.due }}</span>
            <span v-for="tag in (t.tags || [])" :key="tag" class="sug-tag"
                  style="background:rgba(90,148,144,.1);color:var(--acc);border-color:rgba(90,148,144,.3)">{{ tag }}</span>
          </div>
        </div>
        <div class="sug-right">
          <div v-if="handlers(t).length" class="sug-handlers-stack"
               :title="handlers(t).map(h => h.name).join(', ') + ' 處理中'">
            <div v-for="h in handlers(t).slice(0, 3)" :key="h.name" class="sug-handler-avatar"
                 v-html="avHTML(h.avatar, 32, h.avatar_type)"></div>
          </div>
          <div v-else class="sug-handler-empty" title="尚未認領"></div>
          <span v-if="handlers(t).length > 3" class="handlers-more" style="margin-left:4px">+{{ handlers(t).length - 3 }}</span>
          <button class="sug-handle-btn" :class="{ on: isMine(t) }"
                  @click.stop="onClaim(t)" :title="isMine(t) ? '取消處理中' : '接手'">
            {{ isMine(t) ? '處理中' : '接手' }}
          </button>
          <button class="sug-done-btn" @click.stop="onDone(t)" title="標記完成">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useTasksStore } from '../stores/tasks.js'
import { useUserStore }  from '../stores/user.js'
import { useWeeklyStore } from '../stores/weekly.js'
import { COLORS, QNAMES, avHTML, isOverdue } from '../composables/useAvatar.js'

defineEmits(['openDrawer'])

const tasksStore  = useTasksStore()
const userStore   = useUserStore()
const weeklyStore = useWeeklyStore()

const filteredSugTasks = computed(() => {
  let list = tasksStore.sugTasks
  if (tasksStore.sugFilterMine) {
    const name = userStore.profile?.name
    if (name) {
      list = list.filter(t => (t.handlers || []).some(h => h.name === name))
    }
  }
  return list
})

function highlight(text) {
  if (!tasksStore.searchQuery) return text || ''
  const q = tasksStore.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (text || '').replace(new RegExp(q, 'gi'), m => `<mark class="hl">${m}</mark>`)
}

function handlers(t) {
  return t.handlers || (t.handler ? [t.handler] : [])
}

function isMine(t) {
  const name = userStore.profile?.name
  return name && handlers(t).some(h => h.name === name)
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
