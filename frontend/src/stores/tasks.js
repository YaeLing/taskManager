import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import API from '../api.js'
import { isOverdue } from '../composables/useAvatar.js'

export const useTasksStore = defineStore('tasks', () => {
  const tasks       = ref([])
  const searchQuery = ref('')
  const editId      = ref(null)    // task id being edited in modal
  const dragId      = ref(null)
  const openTaskId  = ref(null)    // task open in drawer
  const doneVisible = ref(false)
  const editTags    = ref([])
  const sugFilterTags = ref(new Set())
  const sugFilterMine = ref(false)

  // Save debounce
  let _saveTimer = null

  const activeTasks = computed(() =>
    tasks.value.filter(t => !t.done && matchesSearch(t))
  )
  const doneTasks = computed(() =>
    tasks.value.filter(t => t.done && matchesSearch(t))
  )
  const allActiveTasks = computed(() => tasks.value.filter(t => !t.done))

  const sugTasks = computed(() => {
    let list = allActiveTasks.value
    if (sugFilterTags.value.size > 0) {
      list = list.filter(t => (t.tags || []).some(tag => sugFilterTags.value.has(tag)))
    }
    return [...list].sort((a, b) => {
      const ao = isOverdue(a.due) ? 0 : 1, bo = isOverdue(b.due) ? 0 : 1
      if (ao !== bo) return ao - bo
      if (a.q !== b.q) return a.q - b.q
      if (a.due && b.due) return a.due.localeCompare(b.due)
      if (a.due) return -1
      if (b.due) return 1
      return 0
    })
  })

  const allTags = computed(() => {
    const s = new Set()
    tasks.value.filter(t => !t.done).forEach(t => (t.tags || []).forEach(tag => s.add(tag)))
    return [...s]
  })

  function matchesSearch(t) {
    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    return (t.text || '').toLowerCase().includes(q) ||
           (t.desc || '').toLowerCase().includes(q) ||
           (t.comments || []).some(c => (c.text || '').toLowerCase().includes(q))
  }

  async function load() {
    tasks.value = await API.fetchTasks()
  }

  function save() {
    clearTimeout(_saveTimer)
    _saveTimer = setTimeout(async () => {
      await API.saveTasks(tasks.value)
    }, 100)
  }

  function setTasks(newTasks) {
    tasks.value = newTasks
  }

  function addTask(task) {
    tasks.value.unshift(task)
    save()
  }

  function updateTask(id, patch) {
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx >= 0) { Object.assign(tasks.value[idx], patch); save() }
  }

  function deleteTask(id) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    if (openTaskId.value === id) openTaskId.value = null
    save()
  }

  function moveTask(id, q) {
    updateTask(id, { q })
  }

  function toggleDone(id, useWeeklyFlow = false) {
    const t = tasks.value.find(t => t.id === id)
    if (!t) return null
    t.done = !t.done
    t.doneAt = t.done ? new Date().toISOString() : undefined
    save()
    return t
  }

  function addComment(taskId, comment) {
    const t = tasks.value.find(t => t.id === taskId)
    if (t) { t.comments = [...(t.comments || []), comment]; save() }
  }

  function toggleLike(taskId, commentIdx, liker) {
    const t = tasks.value.find(t => t.id === taskId)
    if (!t) return
    const c = (t.comments || [])[commentIdx]
    if (!c) return
    c.likes = c.likes || []
    const li = c.likes.findIndex(l => l.name === liker.name)
    if (li >= 0) c.likes.splice(li, 1)
    else c.likes.push(liker)
    save()
  }

  function claimTask(id, handler) {
    const t = tasks.value.find(t => t.id === id)
    if (!t) return
    t.handlers = t.handlers || []
    const hi = t.handlers.findIndex(h => h.name === handler.name)
    if (hi >= 0) t.handlers.splice(hi, 1)
    else t.handlers.push(handler)
    save()
  }

  function toggleSugFilter(tag) {
    if (sugFilterTags.value.has(tag)) sugFilterTags.value.delete(tag)
    else sugFilterTags.value.add(tag)
  }

  function toggleSugFilterMine() {
    sugFilterMine.value = !sugFilterMine.value
  }

  return {
    tasks, searchQuery, editId, dragId, openTaskId,
    doneVisible, editTags, sugFilterTags, sugFilterMine,
    activeTasks, doneTasks, allActiveTasks, sugTasks, allTags,
    load, save, setTasks, addTask, updateTask, deleteTask,
    moveTask, toggleDone, addComment, toggleLike, claimTask,
    toggleSugFilter, toggleSugFilterMine,
  }
})
