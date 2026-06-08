<template>
  <!-- Type picker -->
  <div class="note-type-ov" :class="{ active: notesStore.typePickerOpen }"
       @click.self="notesStore.typePickerOpen = false">
    <div class="note-type-picker">
      <div class="ntp-title">選擇便條類型</div>
      <div class="ntp-opts">
        <button class="ntp-opt" v-for="opt in typeOpts" :key="opt.type" @click="notesStore.startNew(opt.type)">
          <div class="ntp-icon">{{ opt.icon }}</div>
          <div class="ntp-lbl">{{ opt.label }}</div>
        </button>
      </div>
    </div>
  </div>

  <!-- Edit modal -->
  <div class="note-edit-ov" :class="{ active: notesStore.editModalOpen }"
       @click.self="notesStore.closeModal()">
    <div class="note-edit-modal" :style="modalBgStyle">
      <div class="nem-head">
        <div class="nem-title-wrap" v-if="editType !== 'text'">
          <input type="text" v-model="localTitle" placeholder="標題（選填）" maxlength="100" autocomplete="off">
        </div>
        <button class="nem-close" @click="notesStore.closeModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="nem-body-wrap" v-if="editType !== 'checklist'">
        <textarea v-model="localBody" placeholder="記點什麼…" rows="6"></textarea>
      </div>

      <div class="nem-cl-wrap" v-if="editType === 'checklist'">
        <div class="nem-cl-list">
          <div class="nem-cl-item" v-for="(item, i) in localItems" :key="i">
            <input type="checkbox" v-model="item.done">
            <input type="text" v-model="item.text" :class="{ done: item.done }" placeholder="項目…">
            <button class="nem-cl-rm" @click="localItems.splice(i, 1)">✕</button>
          </div>
        </div>
        <button class="nem-cl-add" @click="localItems.push({ text: '', done: false })">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新增項目
        </button>
      </div>

      <div class="nem-foot">
        <div class="nem-colors">
          <button v-for="c in NOTE_COLORS" :key="c.key"
                  class="nem-swatch" :class="{ selected: localColor === c.key }"
                  :data-color="c.key" :title="c.label"
                  :style="c.hex ? { background: c.hex } : {}"
                  @click="localColor = c.key">
          </button>
        </div>
        <div class="nem-actions">
          <button v-if="notesStore.isEditing" class="nem-del" @click="onDelete">刪除</button>
          <button class="nem-save" @click="onSave">儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNotesStore, NOTE_COLORS } from '../stores/notes.js'
import { useUserStore } from '../stores/user.js'

const notesStore = useNotesStore()
const userStore  = useUserStore()

const localTitle = ref('')
const localBody  = ref('')
const localColor = ref('default')
const localItems = ref([])

const editType = computed(() => notesStore.editNote?.type || 'text')

const modalBgStyle = computed(() => {
  const c = NOTE_COLORS.find(x => x.key === localColor.value)
  return c?.hex ? { background: c.hex } : {}
})

const typeOpts = [
  { type: 'text',      icon: '📝', label: '純文字' },
  { type: 'rich',      icon: '📄', label: '標題 + 內文' },
  { type: 'checklist', icon: '☑️', label: '待辦清單' },
]

watch(() => notesStore.editNote, (n) => {
  if (!n) return
  localTitle.value = n.title || ''
  localBody.value  = n.body  || ''
  localColor.value = n.color || 'default'
  localItems.value = JSON.parse(JSON.stringify(n.items || []))
}, { immediate: true })

async function onSave() {
  const note = {
    ...notesStore.editNote,
    title: localTitle.value,
    body: localBody.value,
    color: localColor.value,
  }
  await notesStore.saveNote(userStore.profile?.name, note, localItems.value)
}

async function onDelete() {
  await notesStore.deleteCurrentNote(userStore.profile?.name)
}
</script>
