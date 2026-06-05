<template>
  <div class="drawer-overlay" :class="{ open: tasksStore.openTaskId !== null }"
       @click.self="close">
    <div class="drawer" v-if="task">
      <div class="drawer-head">
        <div class="drawer-top">
          <div class="drawer-qdot" :style="{ background: COLORS[task.q] }"></div>
          <span class="drawer-qname">{{ QNAMES[task.q] }}</span>
          <button class="drawer-close" @click="close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="drawer-actions">
          <button class="drawer-edit" @click="$emit('editTask', task.id)" title="編輯">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>編輯
          </button>
          <button class="drawer-edit" @click="copyLink" title="複製連結">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>複製連結
          </button>
          <button class="drawer-edit drawer-del-task" @click="tasksStore.deleteTask(task.id)" title="刪除任務">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>刪除任務
          </button>
        </div>

        <div class="drawer-title" contenteditable="plaintext-only"
             :data-placeholder="'任務名稱'"
             @blur="saveField('text', $event.target.textContent.trim())"
             @keydown.enter.prevent="$event.target.blur()"
             ref="titleEl">
        </div>
        <div class="drawer-desc" contenteditable="plaintext-only"
             :data-placeholder="'點此新增說明…'"
             @blur="saveField('desc', $event.target.textContent.trim())"
             ref="descEl">
        </div>
        <div class="drawer-meta">
          <span v-if="task.due" :class="{ 'due-red': isOverdue(task.due) }">📅 {{ task.due }}</span>
          <span v-for="h in handlers" :key="h.name" class="handler-chip" v-html="avHTML(h.avatar, 18, h.avatar_type) + h.name"></span>
          <span v-for="tag in (task.tags || [])" :key="tag" class="tag-pill">{{ tag }}</span>
        </div>
      </div>

      <div class="comments-head">
        <span class="comments-head-lbl">留言討論</span>
        <span class="comments-count-pill">{{ (task.comments || []).length }} 則</span>
      </div>

      <div class="comments-list">
        <div v-for="(c, i) in (task.comments || [])" :key="i" class="comment-item">
          <div class="comment-meta">
            <div class="comment-user-av" v-html="avHTML(c.avatar, 28, c.avatar_type)"></div>
            <div class="comment-user-info">
              <span class="comment-user-name">{{ c.name }}</span>
              <span class="comment-time">{{ fmtTime(c.time) }}</span>
            </div>
          </div>
          <div class="comment-text">{{ c.text }}</div>
          <div class="comment-foot">
            <button class="comment-like" :class="{ liked: isLiked(c) }" @click="toggleLike(i)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {{ (c.likes || []).length || '' }}
            </button>
            <button v-if="c.name === userStore.profile?.name" class="comment-del"
                    @click="delComment(i)">刪除留言</button>
          </div>
        </div>
      </div>

      <div class="comment-input-wrap">
        <textarea v-model="commentInput" placeholder="輸入留言… (Enter 送出)" rows="2"
                  @keydown.enter.exact.prevent="sendComment"></textarea>
        <button class="send-btn" @click="sendComment">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useTasksStore } from '../stores/tasks.js'
import { useUserStore }  from '../stores/user.js'
import { COLORS, QNAMES, avHTML, isOverdue } from '../composables/useAvatar.js'

defineEmits(['editTask'])

const tasksStore = useTasksStore()
const userStore  = useUserStore()

const commentInput = ref('')
const titleEl = ref(null)
const descEl  = ref(null)

const task = computed(() =>
  tasksStore.tasks.find(t => t.id === tasksStore.openTaskId) || null
)
const handlers = computed(() => task.value?.handlers || (task.value?.handler ? [task.value.handler] : []))

watch(task, async (t) => {
  await nextTick()
  if (!t) return
  if (titleEl.value) titleEl.value.textContent = t.text || ''
  if (descEl.value)  descEl.value.textContent  = t.desc || ''
}, { immediate: true })

function close() {
  tasksStore.openTaskId = null
  history.pushState(null, '', '/')
}

function saveField(field, val) {
  if (task.value) tasksStore.updateTask(task.value.id, { [field]: val })
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function copyLink() {
  const url = `${location.origin}/${tasksStore.openTaskId}`
  navigator.clipboard.writeText(url).catch(() => {})
}

function sendComment() {
  const t = commentInput.value.trim()
  if (!t || !userStore.profile || !task.value) return
  tasksStore.addComment(task.value.id, {
    text: t, name: userStore.profile.name,
    avatar: userStore.profile.avatar, avatar_type: userStore.profile.avatar_type,
    time: new Date().toISOString(), likes: [],
  })
  commentInput.value = ''
}

function toggleLike(commentIdx) {
  if (!userStore.profile || !task.value) return
  tasksStore.toggleLike(task.value.id, commentIdx, {
    name: userStore.profile.name, ip: ''
  })
}

function isLiked(c) {
  return (c.likes || []).some(l => l.name === userStore.profile?.name)
}

function delComment(i) {
  const t = tasksStore.tasks.find(t => t.id === task.value?.id)
  if (t?.comments) { t.comments.splice(i, 1); tasksStore.save() }
}
</script>
