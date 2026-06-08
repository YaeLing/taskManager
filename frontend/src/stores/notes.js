import { defineStore } from 'pinia'
import { ref } from 'vue'
import API from '../api.js'

export const NOTE_MAX = 30
export const NOTE_COLORS = [
  { key: 'default', hex: null,      label: '預設' },
  { key: 'red',     hex: '#fce8e4', label: '紅' },
  { key: 'orange',  hex: '#fde8d0', label: '橙' },
  { key: 'yellow',  hex: '#fdf4c4', label: '黃' },
  { key: 'green',   hex: '#d4f0dc', label: '綠' },
  { key: 'teal',    hex: '#c8ece8', label: '青' },
  { key: 'blue',    hex: '#d4e8f8', label: '藍' },
  { key: 'purple',  hex: '#e8d8f8', label: '紫' },
  { key: 'pink',    hex: '#f8d8ec', label: '粉' },
]

// 本地日期字串 'YYYY-MM-DD'（避免 toISOString 的 UTC 位移）
export function todayStr(d = new Date()) {
  const z = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

// 便條紙結束日 = 開始日 + 2 個月（甘特圖用，不儲存）
export function noteEnd(startAt) {
  if (!startAt) return null
  const [y, m, d] = startAt.split('-').map(Number)
  const dt = new Date(y, (m - 1) + 2, d)
  return todayStr(dt)
}

export const useNotesStore = defineStore('notes', () => {
  const notes         = ref([])
  const typePickerOpen = ref(false)
  const editModalOpen  = ref(false)
  const editNote       = ref(null)
  const editClItems    = ref([])
  const isEditing      = ref(false)   // true = editing existing, false = new
  const viewMode       = ref('grid')  // 'grid' | 'calendar'
  const showAllTasks   = ref(false)   // 日曆：顯示所有任務（含非我處理）

  async function load(userName) {
    if (!userName) return
    notes.value = await API.fetchNotes(userName)
  }

  async function save(userName) {
    await API.saveNotes(userName, notes.value)
  }

  function openTypePicker() {
    if (notes.value.length >= NOTE_MAX) return false
    typePickerOpen.value = true
    return true
  }

  function startNew(type) {
    typePickerOpen.value = false
    editNote.value = { id: Date.now().toString(), type, color: 'default', title: '', body: '', items: [], startAt: todayStr(), createdAt: new Date().toISOString() }
    editClItems.value = []
    isEditing.value = false
    editModalOpen.value = true
  }

  function openEdit(id) {
    const n = notes.value.find(n => n.id === id)
    if (!n) return
    editNote.value = JSON.parse(JSON.stringify(n))
    editClItems.value = JSON.parse(JSON.stringify(n.items || []))
    isEditing.value = true
    editModalOpen.value = true
  }

  function closeModal() {
    editModalOpen.value = false
    editNote.value = null
    editClItems.value = []
  }

  async function saveNote(userName, noteData, clItems) {
    const n = { ...noteData, updatedAt: new Date().toISOString() }
    if (n.type === 'checklist') n.items = clItems.filter(i => i.text.trim())
    const idx = notes.value.findIndex(x => x.id === n.id)
    if (idx >= 0) notes.value[idx] = n
    else notes.value.unshift(n)
    await save(userName)
    closeModal()
  }

  async function deleteNote(id, userName) {
    notes.value = notes.value.filter(n => n.id !== id)
    await save(userName)
  }

  async function deleteCurrentNote(userName) {
    if (!editNote.value) return
    await deleteNote(editNote.value.id, userName)
    closeModal()
  }

  async function toggleItem(noteId, itemIdx, userName) {
    const note = notes.value.find(n => n.id === noteId)
    if (!note?.items?.[itemIdx]) return
    note.items[itemIdx].done = !note.items[itemIdx].done
    await save(userName)
  }

  return {
    notes, typePickerOpen, editModalOpen, editNote, editClItems, isEditing,
    viewMode, showAllTasks,
    load, save, openTypePicker, startNew, openEdit, closeModal,
    saveNote, deleteNote, deleteCurrentNote, toggleItem,
  }
})
