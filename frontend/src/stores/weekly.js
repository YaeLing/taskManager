import { defineStore } from 'pinia'
import { ref } from 'vue'
import API from '../api.js'

export const useWeeklyStore = defineStore('weekly', () => {
  const confirmOpen  = ref(false)
  const recordOpen   = ref(false)
  const pptOpen      = ref(false)
  const pendingTaskId = ref(null)
  const recordIds    = ref(new Set())
  const pptConfig    = ref({ title: '', presenters: '' })
  const pptTemplateExists = ref(false)
  const pptRecordCount = ref(0)

  // Weekly record editor state
  const wrTaskLabel = ref('')
  const wrProject   = ref('')
  const wrNotes     = ref('')
  const wrImages    = ref([])  // [{file, url, caption, serverFilename}]

  async function loadConfig() {
    const cfg = await API.fetchWeeklyConfig()
    pptConfig.value = cfg
    const tmpl = await API.fetchPPTInfo()
    pptTemplateExists.value = tmpl.exists
  }

  async function loadRecords() {
    const data = await API.fetchWeeklyRecords()
    recordIds.value = new Set((data.records || []).map(r => r.taskId))
    pptRecordCount.value = (data.records || []).length
  }

  function showConfirm(taskId) {
    pendingTaskId.value = taskId
    confirmOpen.value = true
  }

  function skipConfirm() { confirmOpen.value = false; pendingTaskId.value = null }

  async function openRecord(task) {
    confirmOpen.value = false
    wrTaskLabel.value = task?.text || ''
    wrProject.value   = ''
    wrNotes.value     = ''
    wrImages.value    = []
    // Try load existing record
    if (pendingTaskId.value) {
      try {
        const rec = await API.fetchWeeklyRecord(pendingTaskId.value)
        wrProject.value = rec.project || ''
        wrNotes.value   = rec.notes || ''
        wrImages.value  = (rec.images || []).map(img => ({
          file: null, url: img.url, caption: img.caption, serverFilename: img.filename
        }))
      } catch {}
    }
    recordOpen.value = true
  }

  // Open the record editor for an already-done task (from done card "▶ 週報")
  function editRecord(task) {
    pendingTaskId.value = task.id
    return openRecord(task)
  }

  async function saveRecord(handlers) {
    const images = []
    for (const img of wrImages.value) {
      if (img.file) {
        const b64 = await fileToBase64(img.file)
        const ext = img.file.type === 'image/jpeg' ? 'jpg' : 'png'
        images.push({ filename: `img_${images.length}.${ext}`, caption: img.caption, data: b64 })
      } else if (img.serverFilename) {
        images.push({ filename: img.serverFilename, caption: img.caption })
      }
    }
    await API.saveWeeklyRecord({
      taskId: pendingTaskId.value,
      taskText: wrTaskLabel.value,
      project: wrProject.value,
      notes: wrNotes.value,
      images,
      handlers,
    })
    recordIds.value.add(pendingTaskId.value)
    pptRecordCount.value++
    recordOpen.value = false
    pendingTaskId.value = null
  }

  function addImage(file) {
    wrImages.value.push({ file, url: URL.createObjectURL(file), caption: '', serverFilename: null })
  }

  function removeImage(idx) { wrImages.value.splice(idx, 1) }

  async function openPPT() {
    await loadConfig()
    await loadRecords()
    pptOpen.value = true
  }

  async function savePPTConfig() {
    await API.saveWeeklyConfig(pptConfig.value)
  }

  async function generatePPT() {
    const res = await API.generatePPT(pptConfig.value)
    if (!res.ok) { alert('生成失敗'); return }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const cd   = res.headers.get('Content-Disposition') || ''
    a.download = cd.match(/filename="([^"]+)"/)?.[1] || 'report.pptx'
    a.href = url
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function clearHistory() {
    const res = await API.clearWeeklyHistory()
    pptRecordCount.value = 0
    recordIds.value = new Set()
    return res
  }

  async function uploadTemplate(file) {
    await API.uploadPPTTemplate(file)
    pptTemplateExists.value = true
  }

  return {
    confirmOpen, recordOpen, pptOpen, pendingTaskId, recordIds,
    pptConfig, pptTemplateExists, pptRecordCount,
    wrTaskLabel, wrProject, wrNotes, wrImages,
    loadConfig, loadRecords, showConfirm, skipConfirm, openRecord, editRecord, saveRecord,
    addImage, removeImage, openPPT, savePPTConfig, generatePPT, clearHistory, uploadTemplate,
  }
})

async function fileToBase64(file) {
  return new Promise(res => {
    const r = new FileReader()
    r.onload = e => res(e.target.result.split(',')[1])
    r.readAsDataURL(file)
  })
}
