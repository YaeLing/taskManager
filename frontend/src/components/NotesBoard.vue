<template>
  <div class="notes-area">
    <div class="notes-head">
      <div class="notes-head-left">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" stroke-width="2.2" stroke-linecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <h2>我的便條紙</h2>
        <span class="notes-count">{{ notesStore.notes.length }} / {{ NOTE_MAX }}</span>
      </div>
      <button class="notes-add-btn" @click="openPicker">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        新增
      </button>
    </div>

    <div class="notes-grid">
      <div v-if="!notesStore.notes.length" class="notes-empty">
        點擊「＋ 新增」建立第一張便條紙
      </div>
      <div v-for="note in notesStore.notes" :key="note.id"
           class="note-card" :data-color="note.color || 'default'"
           :style="colorStyle(note.color)"
           @click="notesStore.openEdit(note.id)">
        <!-- text / rich -->
        <template v-if="note.type !== 'checklist'">
          <div v-if="note.title" class="note-card-title">{{ note.title }}</div>
          <div v-if="note.body" class="note-card-body">{{ note.body }}</div>
        </template>
        <!-- checklist -->
        <template v-else>
          <div v-if="note.title" class="note-card-title">{{ note.title }}</div>
          <div v-for="(item, i) in (note.items || []).slice(0, 6)" :key="i"
               class="note-cl-item" :class="{ done: item.done }"
               @click.stop="toggleItem(note.id, i)">
            <span class="note-cl-icon" v-html="checkboxSVG(item.done)"></span>
            <span class="note-cl-text">{{ item.text }}</span>
          </div>
          <div v-if="(note.items || []).length > 6" class="note-cl-more">
            ＋{{ note.items.length - 6 }} 項
          </div>
        </template>
        <button class="note-card-del" @click.stop="deleteNote(note.id)" title="刪除">✕</button>
      </div>
    </div>

    <!-- Done section -->
    <template v-if="tasksStore.doneVisible">
      <div class="col-resizer col-resizer--done" style="cursor:row-resize;width:auto;height:4px;border-left:none;border-top:1px solid var(--border2)"></div>
      <div class="completed-section" style="min-width:0;min-height:180px;max-height:45%;border-left:none;border-top:1px solid var(--border2)">
        <div class="done-header">
          <div class="done-dot"></div>
          <span class="done-title">已完成</span>
          <span class="done-badge">{{ tasksStore.doneTasks.length }}</span>
        </div>
        <div class="done-tasks"
             @dragover.prevent="onDoneDragOver"
             @drop.prevent="onDoneDrop"
             @dragleave="doneDragOver = false">
          <div v-if="!tasksStore.doneTasks.length" style="color:var(--dim);font-size:.72rem;opacity:.4;padding:4px">
            {{ tasksStore.searchQuery ? '無符合結果' : '尚無完成任務' }}
          </div>
          <div v-for="(t, i) in groupedDone" :key="t.id || t._group">
            <div v-if="t._group" class="done-group-label">{{ t._group }}</div>
            <div v-else class="done-card"
                 draggable="true"
                 @dragstart="onDoneDragStart(t.id)"
                 @click="$emit('openDrawer', t.id)">
              <div class="done-card-top">
                <span class="done-num">{{ t._idx + 1 }}.</span>
                <div class="done-qdot" :style="{ background: COLORS[t.q] }"></div>
                <span class="done-text">{{ t.text }}</span>
              </div>
              <div class="done-card-actions">
                <button class="done-restore" @click.stop="restore(t)">↩ 恢復</button>
                <button class="done-del" @click.stop="tasksStore.deleteTask(t.id)">✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useNotesStore, NOTE_MAX, NOTE_COLORS } from '../stores/notes.js'
import { useTasksStore } from '../stores/tasks.js'
import { useUserStore }  from '../stores/user.js'
import { COLORS } from '../composables/useAvatar.js'

defineEmits(['openDrawer'])

const notesStore = useNotesStore()
const tasksStore = useTasksStore()
const userStore  = useUserStore()
const doneDragOver = ref(false)

function openPicker() {
  const ok = notesStore.openTypePicker()
  if (!ok) alert(`已達 ${NOTE_MAX} 張上限`)
}

function colorStyle(colorKey) {
  const c = NOTE_COLORS.find(x => x.key === (colorKey || 'default'))
  return c?.hex ? { background: c.hex } : {}
}

function checkboxSVG(done) {
  return done
    ? `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x=".5" y=".5" width="13" height="13" rx="3" fill="var(--acc)" stroke="var(--acc)"/><polyline points="3,7 6,10 11,4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x=".5" y=".5" width="13" height="13" rx="3" stroke="var(--border2)" stroke-width="1.2"/></svg>`
}

async function toggleItem(noteId, itemIdx) {
  await notesStore.toggleItem(noteId, itemIdx, userStore.profile?.name)
}

async function deleteNote(id) {
  await notesStore.deleteNote(id, userStore.profile?.name)
}

// Done task grouping
const groupedDone = computed(() => {
  const done = tasksStore.doneTasks
  const now  = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = today.getDay() || 7
  const thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - dow + 1)
  const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7)

  const thisWeek = [], lastWeek = [], older = []
  done.forEach(t => {
    const d = t.doneAt ? new Date(t.doneAt) : new Date(t.id)
    if (d >= thisWeekStart) thisWeek.push(t)
    else if (d >= lastWeekStart) lastWeek.push(t)
    else older.push(t)
  })

  const result = []
  let idx = 0
  if (thisWeek.length) { result.push({ _group: '本週' }); thisWeek.forEach(t => result.push({ ...t, _idx: idx++ })) }
  if (lastWeek.length) { result.push({ _group: '上週' }); lastWeek.forEach(t => result.push({ ...t, _idx: idx++ })) }
  if (older.length)    { result.push({ _group: '更早' }); older.forEach(t => result.push({ ...t, _idx: idx++ })) }
  return result
})

function restore(t) {
  tasksStore.updateTask(t.id, { done: false, doneAt: undefined })
}

let _doneDragId = null
function onDoneDragStart(id) { _doneDragId = id }
function onDoneDragOver() { doneDragOver.value = true }
function onDoneDrop() {
  doneDragOver.value = false
  if (_doneDragId) { restore(tasksStore.tasks.find(t => t.id === _doneDragId) || {}); _doneDragId = null }
}
</script>
