<template>
  <div class="setup-screen" @click.self="void 0">
    <div class="setup-box">
      <div class="setup-av-preview" v-html="previewHTML"></div>
      <div class="setup-title">歡迎使用任務排程管理</div>
      <div class="setup-sub">請設定您的使用者資料，下次進入將自動載入</div>

      <div class="setup-section-lbl">選擇大頭貼</div>
      <div class="av-grid">
        <div v-for="av in allAvatars" :key="av"
             class="av-item" :class="{ selected: selAv === av && selAvType === 'emoji' }"
             @click="selectEmoji(av)" v-html="emojiAvHTML(av)">
        </div>
      </div>

      <div class="setup-section-lbl">或上傳自訂頭像</div>
      <div class="avatar-upload-area">
        <input type="file" ref="fileInput" accept="image/png,image/jpeg,image/gif,image/webp"
               style="display:none" @change="handleUpload">
        <button class="btn-upload-avatar" @click="fileInput.click()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>{{ uploadBtnText }}</span>
        </button>
        <div class="upload-hint">支援 PNG、JPG、GIF、WebP（建議 200x200 以上）</div>
      </div>

      <div class="setup-section-lbl">您的姓名</div>
      <input type="text" class="setup-name-inp" v-model="name"
             placeholder="輸入您的姓名…" maxlength="20" autocomplete="off">
      <div id="setup-name-hint" style="font-size:.72rem;color:var(--acc);margin:-14px 0 10px;min-height:18px;text-align:center">
        {{ nameHint }}
      </div>
      <button class="btn-setup" :disabled="!name.trim()" @click="save">開始使用</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../stores/user.js'
import { avHTML, AVATARS_EMOJI, SHOEBILL_SVG } from '../composables/useAvatar.js'
import API from '../api.js'

const userStore = useUserStore()

const name         = ref(userStore.profile?.name || '')
const selAv        = ref(userStore.profile?.avatar || 'shoebill')
const selAvType    = ref(userStore.profile?.avatar_type || 'emoji')
const customAvUrl  = ref(null)
const uploadBtnText = ref('選擇圖片上傳')
const fileInput    = ref(null)
const nameHint     = ref('')

const allAvatars = ['shoebill', ...AVATARS_EMOJI]

const previewHTML = computed(() => avHTML(
  selAvType.value === 'custom' ? customAvUrl.value : selAv.value,
  60, selAvType.value
))

function emojiAvHTML(av) {
  if (av === 'shoebill') return SHOEBILL_SVG
  return `<span style="font-size:22px">${av}</span>`
}

function selectEmoji(av) {
  selAv.value    = av
  selAvType.value = 'emoji'
  customAvUrl.value = null
}

async function handleUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadBtnText.value = '上傳中…'
  try {
    const res = await API.uploadAvatar(file)
    customAvUrl.value = res.url
    selAvType.value   = 'custom'
    uploadBtnText.value = '已上傳'
  } catch {
    uploadBtnText.value = '上傳失敗'
  }
}

async function save() {
  if (!name.value.trim()) return
  await userStore.saveProfile(
    name.value.trim(),
    selAv.value,
    selAvType.value,
    customAvUrl.value
  )
}
</script>
