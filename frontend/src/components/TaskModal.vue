<template>
  <div class="overlay" :class="{ active: modelValue }" @click.self="$emit('update:modelValue', false)">
    <div class="modal">
      <div class="modal-head">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" stroke-width="2.2" stroke-linecap="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        <h2>{{ editId ? '編輯任務' : '新增任務' }}</h2>
      </div>

      <div class="field">
        <label>任務名稱</label>
        <input type="text" v-model="form.text" placeholder="輸入任務名稱…" maxlength="200" autocomplete="off">
      </div>
      <div class="field">
        <label>說明 <span>（選填）</span></label>
        <textarea v-model="form.desc" placeholder="詳細說明、注意事項…" maxlength="500"></textarea>
      </div>
      <div class="field">
        <label>標籤 <span>（選填）</span></label>
        <div class="tag-chips">
          <span v-for="(tag, i) in form.tags" :key="tag" class="tag-chip">
            {{ tag }}<button class="tag-chip-del" type="button" @click="form.tags.splice(i, 1)">×</button>
          </span>
        </div>
        <div class="tag-input-wrap">
          <input type="text" v-model="tagInput" placeholder="輸入或選擇標籤…" autocomplete="off"
                 @keydown.enter.prevent="addTag" @keydown.comma.prevent="addTag"
                 @focus="showSug = true" @blur="setTimeout(() => showSug = false, 150)">
          <div class="tag-suggestions" v-if="showSug && tagSugs.length">
            <div v-for="s in tagSugs" :key="s" class="tag-sug-item" @click="selectSug(s)">{{ s }}</div>
          </div>
        </div>
      </div>
      <div class="field">
        <label>截止日期 <span>（選填）<span class="due-clear" @click="form.due = ''">清除</span></span></label>
        <input type="date" v-model="form.due">
      </div>
      <div class="field field-quadrant">
        <label>選擇象限</label>
        <div class="qpicker">
          <div v-for="q in [1,2,3,4]" :key="q"
               class="q-pick" :class="{ selected: form.q === q }"
               :style="{ '--pc': COLORS[q], '--pbg': QBGS[q] }"
               @click="form.q = q">
            <div class="dot"></div>{{ QLABELS[q] }}
          </div>
        </div>
      </div>
      <div class="modal-btns">
        <button class="btn-c" @click="$emit('update:modelValue', false)">取消</button>
        <button class="btn-s" @click="save">儲存任務</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useTasksStore } from '../stores/tasks.js'
import { useUserStore }  from '../stores/user.js'
import { COLORS } from '../composables/useAvatar.js'

const props = defineProps({ modelValue: Boolean, editId: { type: Number, default: null }, defaultQ: { type: Number, default: 1 } })
const emit  = defineEmits(['update:modelValue'])

const tasksStore = useTasksStore()
const userStore  = useUserStore()

const QLABELS = { 1: '緊急 ＆ 重要', 2: '緊急 ＆ 不重要', 3: '不緊急 ＆ 重要', 4: '不緊急 ＆ 不重要' }
const QBGS    = { 1: 'var(--q1bg)', 2: 'var(--q2bg)', 3: 'var(--q3bg)', 4: 'var(--q4bg)' }

const form = reactive({ text: '', desc: '', tags: [], due: '', q: 1 })
const tagInput = ref('')
const showSug  = ref(false)

const tagSugs = computed(() => {
  const q = tagInput.value.toLowerCase()
  return tasksStore.allTags.filter(t => !form.tags.includes(t) && (!q || t.toLowerCase().includes(q))).slice(0, 8)
})

watch(() => props.modelValue, open => {
  if (!open) return
  if (props.editId) {
    const t = tasksStore.tasks.find(t => t.id === props.editId)
    if (t) { form.text = t.text || ''; form.desc = t.desc || ''; form.tags = [...(t.tags || [])]; form.due = t.due || ''; form.q = t.q }
  } else {
    form.text = ''; form.desc = ''; form.tags = []; form.due = ''; form.q = props.defaultQ
  }
})

function addTag() {
  const t = tagInput.value.trim()
  if (t && !form.tags.includes(t)) form.tags.push(t)
  tagInput.value = ''
}
function selectSug(t) { if (!form.tags.includes(t)) form.tags.push(t); tagInput.value = '' }

function save() {
  if (!form.text.trim()) return
  if (props.editId) {
    tasksStore.updateTask(props.editId, { text: form.text.trim(), desc: form.desc.trim(), tags: form.tags, due: form.due, q: form.q })
  } else {
    const p = userStore.profile
    tasksStore.addTask({
      id: Date.now(), text: form.text.trim(), desc: form.desc.trim(),
      tags: form.tags, due: form.due, q: form.q,
      done: false, handlers: [], comments: [],
      createdBy: p ? { name: p.name, avatar: p.avatar, avatar_type: p.avatar_type } : {},
      createdAt: new Date().toISOString(),
    })
  }
  emit('update:modelValue', false)
}
</script>

<style scoped>
.overlay { display: none; }
.overlay.active { display: flex; }
</style>
