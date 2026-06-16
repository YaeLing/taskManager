<template>
  <div class="weekly-overlay" :class="{ active: weeklyStore.recordOpen }">
    <div class="wr-modal">
      <div class="wr-head">
        <div class="wr-head-row">
          <input class="wr-title-input" v-model="weeklyStore.wrTaskLabel" type="text" placeholder="任務標題">
          <button class="wr-img-del" @click="weeklyStore.recordOpen = false" title="關閉">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="wr-head-row">
          <span class="wr-project-lbl">Project</span>
          <input class="wr-project-input" v-model="weeklyStore.wrProject" type="text" placeholder="所屬專案或類別...">
        </div>
      </div>

      <div class="wr-content">
        <div class="wr-form-col">
          <div class="wr-body">
            <div class="field">
              <label>整體說明</label>
              <textarea v-model="weeklyStore.wrNotes" rows="4" placeholder="說明這個任務的完成情況..."></textarea>
            </div>
            <div class="field">
              <label>圖片 <span>（拖曳、貼上或點選上傳，可多張）</span></label>
              <div class="wr-drop-zone" @click="fileInput.click()"
                   @dragover.prevent @drop.prevent="onDrop">
                拖曳或 Ctrl+V 貼上圖片到這裡，或點選選擇檔案
                <input type="file" ref="fileInput" multiple accept="image/*"
                       style="display:none" @change="onFileChange">
              </div>
              <div class="wr-img-list">
                <div v-for="(img, i) in weeklyStore.wrImages" :key="i" class="wr-img-item">
                  <img :src="img.url" class="wr-img-thumb" @click="openImg(img.url)">
                  <div class="wr-img-right">
                    <input type="text" v-model="img.caption" placeholder="這張圖的說明…">
                  </div>
                  <button class="wr-img-del" @click="weeklyStore.removeImage(i)" title="移除">✕</button>
                </div>
              </div>
            </div>
          </div>
          <div class="wr-foot">
            <button class="btn-c" @click="weeklyStore.recordOpen = false">取消</button>
            <button class="btn-s" @click="save">儲存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useWeeklyStore } from '../stores/weekly.js'
import { useTasksStore }  from '../stores/tasks.js'

const weeklyStore = useWeeklyStore()
const tasksStore  = useTasksStore()
const fileInput   = ref(null)

function onPaste(e) {
  if (!weeklyStore.recordOpen) return
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || []
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const f = item.getAsFile()
      if (f) weeklyStore.addImage(f)
    }
  }
}
onMounted(()   => document.addEventListener('paste', onPaste))
onUnmounted(() => document.removeEventListener('paste', onPaste))

function onFileChange(e) {
  Array.from(e.target.files).forEach(f => weeklyStore.addImage(f))
  e.target.value = ''
}
function onDrop(e) {
  Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).forEach(f => weeklyStore.addImage(f))
}
function openImg(url) { window.open(url, '_blank') }

async function save() {
  const t = tasksStore.tasks.find(t => t.id === weeklyStore.pendingTaskId)
  await weeklyStore.saveRecord(t?.handlers || [])
}
</script>

<style scoped>
.weekly-overlay { display: none; }
.weekly-overlay.active { display: flex; }
</style>
