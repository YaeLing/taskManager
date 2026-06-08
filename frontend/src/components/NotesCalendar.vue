<template>
  <div class="notes-cal">

    <!-- Toolbar: month nav + show-all checkbox -->
    <div class="cal-toolbar">
      <div class="cal-nav">
        <button class="cal-nav-btn" @click="shiftMonth(-1)" title="上一月">‹</button>
        <span class="cal-title">{{ viewYear }} 年 {{ viewMonth + 1 }} 月</span>
        <button class="cal-nav-btn" @click="shiftMonth(1)" title="下一月">›</button>
        <button class="cal-today-btn" @click="goToday">今天</button>
      </div>
      <label class="cal-showall">
        <input type="checkbox" v-model="notesStore.showAllTasks">
        顯示所有任務
      </label>
    </div>

    <!-- Weekday header -->
    <div class="cal-dow">
      <div v-for="d in DOW" :key="d" class="cal-dow-cell">{{ d }}</div>
    </div>

    <!-- Weeks -->
    <div class="cal-body">
      <div v-for="(week, wi) in weeks" :key="wi" class="cal-week">
        <div class="cal-daynums">
          <div v-for="cell in week.cells" :key="cell.num"
               class="cal-daynum" :class="{ today: cell.isToday, dim: !cell.inMonth }">
            {{ cell.d }}
          </div>
        </div>
        <div class="cal-bars"
             :style="{ gridTemplateRows: `repeat(${Math.max(week.laneCount, 1)}, var(--cal-bar-h))` }">
          <div v-for="(seg, si) in week.segs" :key="si"
               class="cal-bar" :class="[seg.item.kind, { start: seg.isStart, end: seg.isEnd }]"
               :style="{ gridColumn: `${seg.cStart + 1} / ${seg.cEnd + 2}`, gridRow: seg.lane + 1,
                         '--bar-c': seg.item.colorHex }"
               :title="seg.item.label"
               @click="onClick(seg.item)">
            <span v-if="seg.isStart" class="cal-bar-lbl">{{ seg.item.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="cal-legend">
      <span class="cal-leg-item"><i class="cal-leg-dot note"></i>便條紙</span>
      <span class="cal-leg-item"><i class="cal-leg-dot mine"></i>我處理的任務</span>
      <span v-if="notesStore.showAllTasks" class="cal-leg-item"><i class="cal-leg-dot other"></i>其他任務</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNotesStore, NOTE_COLORS, noteEnd } from '../stores/notes.js'
import { useTasksStore } from '../stores/tasks.js'
import { useUserStore }  from '../stores/user.js'
import { COLORS } from '../composables/useAvatar.js'

const emit = defineEmits(['openDrawer'])

const notesStore = useNotesStore()
const tasksStore = useTasksStore()
const userStore  = useUserStore()

const DOW = ['一', '二', '三', '四', '五', '六', '日']

const now = new Date()
const viewYear  = ref(now.getFullYear())
const viewMonth = ref(now.getMonth())

function shiftMonth(delta) {
  const d = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}
function goToday() {
  const d = new Date()
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

// --- date helpers -------------------------------------------------
// 把 'YYYY-MM-DD' 或 ISO 字串轉成「epoch 天數」供區間比較
function dayNum(str) {
  if (!str) return null
  const [y, m, d] = str.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}
function dateToNum(dt) {
  return Math.floor(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 86400000)
}

const todayNum = dateToNum(new Date())

function handlers(t) { return t.handlers || (t.handler ? [t.handler] : []) }
function isMine(t) {
  const name = userStore.profile?.name
  return name && handlers(t).some(h => h.name === name)
}

// --- 收集甘特項目（已依優先序：便條紙 → 我的任務 → 其他任務）-------
const orderedItems = computed(() => {
  const items = []

  // 1) 我的便條紙：startAt → startAt + 2 個月
  notesStore.notes
    .map(n => ({ n, startAt: n.startAt || (n.createdAt ? n.createdAt.slice(0, 10) : null) }))
    .filter(x => x.startAt)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .forEach(({ n, startAt }) => {
      const c = NOTE_COLORS.find(x => x.key === (n.color || 'default'))
      items.push({
        id: n.id, kind: 'note',
        start: dayNum(startAt), end: dayNum(noteEnd(startAt)),
        label: n.title || n.body || '便條紙',
        colorHex: c?.hex || '#dfe6ee',
      })
    })

  // 2)/3) 任務：依建議執行順序拆成「我處理」與「其他」
  const mine = [], other = []
  tasksStore.sugTasks.forEach(t => (isMine(t) ? mine : other).push(t))

  const pushTask = (t, kind) => {
    const start = dayNum(t.createdAt) ?? dateToNum(new Date(t.id))
    const end = dayNum(t.due) ?? start
    items.push({
      id: t.id, kind,
      start, end: Math.max(end, start),
      label: t.text || '任務',
      colorHex: COLORS[t.q] || '#7a88b8',
    })
  }
  mine.forEach(t => pushTask(t, 'mine'))
  if (notesStore.showAllTasks) other.forEach(t => pushTask(t, 'other'))

  return items.filter(it => it.start != null && it.end != null)
})

// --- 建立月曆格與每週色帶 lane packing ----------------------------
const weeks = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const offset = (first.getDay() + 6) % 7          // 週一為首
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7
  const gridStart = new Date(viewYear.value, viewMonth.value, 1 - offset)

  const result = []
  for (let w = 0; w < totalCells / 7; w++) {
    const cells = []
    for (let i = 0; i < 7; i++) {
      const dt = new Date(gridStart)
      dt.setDate(gridStart.getDate() + w * 7 + i)
      cells.push({
        num: dateToNum(dt), d: dt.getDate(),
        inMonth: dt.getMonth() === viewMonth.value,
        isToday: dateToNum(dt) === todayNum,
      })
    }
    const rowStart = cells[0].num, rowEnd = cells[6].num

    // 依優先序貪婪指派 lane（高優先在上 → 滿足單日排序）
    const lanes = []   // 每個 lane: 已佔用的 [cStart,cEnd] 區段
    const segs = []
    for (const it of orderedItems.value) {
      if (it.end < rowStart || it.start > rowEnd) continue
      const cStart = Math.max(it.start, rowStart) - rowStart
      const cEnd   = Math.min(it.end, rowEnd) - rowStart
      let lane = 0
      while (lanes[lane] && lanes[lane].some(s => !(cEnd < s[0] || cStart > s[1]))) lane++
      ;(lanes[lane] = lanes[lane] || []).push([cStart, cEnd])
      segs.push({
        item: it, lane, cStart, cEnd,
        isStart: it.start >= rowStart,
        isEnd: it.end <= rowEnd,
      })
    }
    result.push({ cells, segs, laneCount: lanes.length })
  }
  return result
})

function onClick(item) {
  if (item.kind === 'note') notesStore.openEdit(item.id)
  else emit('openDrawer', item.id)
}
</script>
