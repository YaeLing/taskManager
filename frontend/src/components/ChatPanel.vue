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
        <div v-for="item in pointsStore.leaderboard" :key="item.name" class="rocket-row">
          <div class="rocket-av" v-html="rocketAv(item.name)"></div>
          <span class="rocket-name" :title="item.name">{{ item.name }}</span>
          <div class="rocket-bar-wrap">
            <div class="rocket-bar" :style="{ width: barPct(item.count) + '%' }"></div>
          </div>
          <span class="rocket-count">🚀{{ item.count }}</span>
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
        <div v-for="l in leavesStore.leaves" :key="l.name + l.date"
             class="leave-row" :class="{ 'leave-today': isToday(l) }">
          <div class="leave-av" v-html="avHTML(l.avatar, 20, l.avatar_type)"></div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:5px">
              <span class="leave-name">{{ l.name }}</span>
              <span class="leave-date">{{ dateLabel(l) }}</span>
            </div>
            <div v-if="l.note" class="leave-note">{{ l.note }}</div>
          </div>
          <button v-if="isMyLeave(l)" class="leave-del" @click="removeLeave(l)" title="取消請假">✕</button>
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
      <div v-for="(msg, i) in chatStore.messages" :key="i"
           class="chat-msg" :class="{ mine: isMine(msg) }">
        <div class="chat-msg-av" v-html="msgAv(msg)"></div>
        <div class="chat-msg-body">
          <div class="chat-msg-meta">
            <span class="chat-msg-name">{{ msg.name }}</span>
            <span class="chat-msg-time">{{ fmtTime(msg.time) }}</span>
          </div>
          <div class="chat-msg-text">{{ msg.text }}</div>
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
import { ref, watch, nextTick, computed } from 'vue'
import { useChatStore }   from '../stores/chat.js'
import { useLeavesStore } from '../stores/leaves.js'
import { usePointsStore } from '../stores/points.js'
import { useUserStore }   from '../stores/user.js'
import { avHTML } from '../composables/useAvatar.js'

const chatStore   = useChatStore()
const leavesStore = useLeavesStore()
const pointsStore = usePointsStore()
const userStore   = useUserStore()

const chatInput  = ref('')
const chatListEl = ref(null)

const maxRockets = computed(() =>
  Math.max(1, ...pointsStore.leaderboard.map(i => i.count))
)
function barPct(count) { return Math.round((count / maxRockets.value) * 100) }

function rocketAv(name) {
  const u = Object.values(userStore.allUsers).find(u => u.name === name)
  return u ? avHTML(u.avatar, 22, u.avatar_type) : avHTML('🚀', 22, 'emoji')
}

watch(() => chatStore.messages.length, () => nextTick(() => {
  if (chatListEl.value) chatListEl.value.scrollTop = chatListEl.value.scrollHeight
}))

async function send() {
  const t = chatInput.value.trim()
  if (!t || !userStore.profile) return
  chatInput.value = ''
  await chatStore.send(t, userStore.profile)
}

function isMine(msg) { return msg.name === userStore.profile?.name }

function msgAv(msg) {
  if (msg.avatar) return avHTML(msg.avatar, 28, msg.avatar_type || 'emoji')
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'
}

function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

function dateLabel(l) {
  if (l.endDate && l.endDate !== l.date) return `${l.date} ～ ${l.endDate}`
  return l.date
}
function isToday(l) {
  const today = new Date().toISOString().slice(0, 10)
  return l.date <= today && (l.endDate || l.date) >= today
}
function isMyLeave(l) { return l.name === userStore.profile?.name }
async function removeLeave(l) { await leavesStore.remove(l.name, l.date) }
</script>
