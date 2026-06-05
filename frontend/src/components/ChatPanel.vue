<template>
  <aside class="chat-panel" id="chat-panel">
    <!-- Rockets -->
    <div class="rockets-area">
      <div class="rockets-head">
        <span class="rockets-title">🚀 本週貢獻排行</span>
        <button class="vote-btn" @click="pointsStore.modalOpen = true">投票</button>
      </div>
      <div class="rockets-list">
        <div v-if="!pointsStore.leaderboard.length" class="rockets-empty">尚無紀錄</div>
        <div v-for="(item, i) in pointsStore.leaderboard" :key="item.name" class="rocket-item">
          <span class="rocket-rank">{{ i + 1 }}</span>
          <span class="rocket-name">{{ item.name }}</span>
          <span class="rocket-count">🚀 × {{ item.count }}</span>
        </div>
      </div>
    </div>

    <!-- Leaves -->
    <div class="leave-area">
      <div class="leave-head">
        <span class="leave-title">📅 請假公告</span>
        <button class="leave-add-btn" @click="leavesStore.modalOpen = true">+ 請假</button>
      </div>
      <div class="leave-list">
        <div v-if="!leavesStore.leaves.length" class="leave-empty">目前無人請假</div>
        <div v-for="l in leavesStore.leaves" :key="l.name + l.date" class="leave-item">
          <span class="leave-name">{{ l.name }}</span>
          <span class="leave-date">{{ l.date }}{{ l.endDate && l.endDate !== l.date ? ` ～ ${l.endDate}` : '' }}</span>
          <span v-if="l.note" class="leave-note">{{ l.note }}</span>
          <button v-if="isMyLeave(l)" class="leave-del" @click="removeLeave(l)" title="取消">✕</button>
        </div>
      </div>
    </div>

    <!-- Chat -->
    <div class="chat-head">
      <div class="chat-head-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" stroke-width="2.2" stroke-linecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h2>團隊留言板</h2>
        <span class="chat-badge">{{ chatStore.messages.length }}</span>
      </div>
      <div class="chat-sub">即時討論與公告</div>
    </div>
    <div class="chat-list" ref="chatListEl">
      <div v-if="!chatStore.messages.length" class="chat-empty">
        還沒有留言<br>
        <span style="font-size:.65rem;opacity:.7">發送第一則訊息開始討論</span>
      </div>
      <div v-for="(msg, i) in chatStore.messages" :key="i" class="chat-msg">
        <div class="chat-av" v-html="msgAv(msg)"></div>
        <div class="chat-body">
          <div class="chat-meta">
            <span class="chat-name">{{ msg.name }}</span>
            <span class="chat-time">{{ fmtTime(msg.time) }}</span>
          </div>
          <div class="chat-text">{{ msg.text }}</div>
        </div>
      </div>
    </div>
    <div class="chat-input-wrap">
      <textarea v-model="chatInput" placeholder="輸入訊息… (Enter 送出)" rows="1"
                @keydown.enter.exact.prevent="send"></textarea>
      <button class="chat-send-btn" @click="send">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useChatStore }   from '../stores/chat.js'
import { useLeavesStore } from '../stores/leaves.js'
import { usePointsStore } from '../stores/points.js'
import { useUserStore }   from '../stores/user.js'
import { avHTML } from '../composables/useAvatar.js'

const chatStore   = useChatStore()
const leavesStore = useLeavesStore()
const pointsStore = usePointsStore()
const userStore   = useUserStore()

const chatInput = ref('')
const chatListEl = ref(null)

watch(() => chatStore.messages.length, () => nextTick(() => {
  if (chatListEl.value) chatListEl.value.scrollTop = chatListEl.value.scrollHeight
}))

async function send() {
  const t = chatInput.value.trim()
  if (!t || !userStore.profile) return
  chatInput.value = ''
  await chatStore.send(t, userStore.profile)
}

function msgAv(msg) {
  return avHTML(msg.avatar, 32, msg.avatar_type || 'emoji')
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

function isMyLeave(l) {
  return l.name === userStore.profile?.name
}

async function removeLeave(l) {
  await leavesStore.remove(l.name, l.date)
}
</script>
