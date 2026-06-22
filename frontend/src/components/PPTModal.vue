<template>
  <div class="weekly-overlay" :class="{ active: weeklyStore.pptOpen }"
       @click.self="weeklyStore.pptOpen = false">
    <div class="ppt-modal">
      <div class="ppt-head">
        <h3>生成週報</h3>
        <span class="ppt-week-badge">{{ currentWeek }}</span>
        <button class="wr-img-del" @click="weeklyStore.pptOpen = false" title="關閉">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="field">
        <label>簡報主題</label>
        <input type="text" v-model="weeklyStore.pptConfig.title" placeholder="簡報主題" @change="weeklyStore.savePPTConfig()">
      </div>
      <div class="field">
        <label>報告人員</label>
        <input type="text" v-model="weeklyStore.pptConfig.presenters" placeholder="報告人員" @change="weeklyStore.savePPTConfig()">
      </div>
      <div class="field">
        <label>版型模板 <span>（上傳 .pptx，套用其背景與 Master）</span></label>
        <div class="ppt-template-zone" :class="{ loaded: weeklyStore.pptTemplateExists }"
             @click="tmplInput.click()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span class="ppt-template-status">
            {{ weeklyStore.pptTemplateExists ? '已上傳模板（點選更換）' : '點選選擇 .pptx 檔案' }}
          </span>
          <input type="file" ref="tmplInput" accept=".pptx" style="display:none"
                 @change="uploadTemplate">
        </div>
      </div>
      <div class="ppt-divider"></div>
      <div class="ppt-record-count">
        共 {{ weeklyStore.pptWeeksCount }} 週、已記錄 {{ weeklyStore.pptRecordCount }} 個任務（全部納入週報）
      </div>
      <div class="ppt-btns">
        <button class="ppt-clear" @click="clearHistory">清除歷史紀錄</button>
        <button class="ppt-generate" @click="weeklyStore.generatePPT()">生成 PPT</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWeeklyStore } from '../stores/weekly.js'

const weeklyStore = useWeeklyStore()
const tmplInput   = ref(null)

const currentWeek = computed(() => {
  const iso = new Date().toISOString()
  const d   = new Date(iso)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const week = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
})

async function uploadTemplate(e) {
  const file = e.target.files[0]
  if (file) await weeklyStore.uploadTemplate(file)
  e.target.value = ''
}

async function clearHistory() {
  const res = await weeklyStore.clearHistory()
  alert(`已清除 ${res.removed} 週的歷史紀錄`)
}
</script>

<style scoped>
.weekly-overlay { display: none; }
.weekly-overlay.active { display: flex; }
</style>
