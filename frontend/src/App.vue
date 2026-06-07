<template>
  <SetupScreen v-if="userStore.setupVisible" />

  <template v-else>
    <AppHeader @toggleHelp="helpOpen = !helpOpen" @openTaskModal="openNewTask" />
    <HelpModal v-model="helpOpen" />
    <MobTabs v-model:active="mobTab" />

    <div class="layout">
      <SugPanel @openDrawer="openDrawer" />
      <div class="col-resizer" id="resizer-left"></div>
      <NotesBoard @openDrawer="openDrawer" />
      <div class="col-resizer" id="resizer-right"></div>
      <ChatPanel />
    </div>

    <TaskDrawer @editTask="openEditTask" />
    <TaskModal v-model="taskModalOpen" :edit-id="editTaskId" :default-q="newTaskQ" />

    <LeaveModal />
    <VoteModal />
    <NoteModal />
    <WeeklyConfirm />
    <WeeklyRecord />
    <PPTModal />
    <Notification ref="notifRef" />
  </template>
</template>

<script setup>
import { ref, onMounted, provide, nextTick } from 'vue'
import { initResizers } from './composables/useResizers.js'
import { useUserStore }  from './stores/user.js'
import { useTasksStore } from './stores/tasks.js'
import { useNotesStore } from './stores/notes.js'
import { useChatStore }  from './stores/chat.js'
import { useLeavesStore } from './stores/leaves.js'
import { usePointsStore } from './stores/points.js'
import { useSSEStore }   from './stores/sse.js'
import { useWeeklyStore } from './stores/weekly.js'

import SetupScreen   from './components/SetupScreen.vue'
import AppHeader     from './components/AppHeader.vue'
import HelpModal     from './components/HelpModal.vue'
import MobTabs       from './components/MobTabs.vue'
import SugPanel      from './components/SugPanel.vue'
import NotesBoard    from './components/NotesBoard.vue'
import NoteModal     from './components/NoteModal.vue'
import ChatPanel     from './components/ChatPanel.vue'
import TaskDrawer    from './components/TaskDrawer.vue'
import TaskModal     from './components/TaskModal.vue'
import LeaveModal    from './components/LeaveModal.vue'
import VoteModal     from './components/VoteModal.vue'
import WeeklyConfirm from './components/WeeklyConfirm.vue'
import WeeklyRecord  from './components/WeeklyRecord.vue'
import PPTModal      from './components/PPTModal.vue'
import Notification  from './components/Notification.vue'

const userStore   = useUserStore()
const tasksStore  = useTasksStore()
const notesStore  = useNotesStore()
const chatStore   = useChatStore()
const leavesStore = useLeavesStore()
const pointsStore = usePointsStore()
const sseStore    = useSSEStore()
const weeklyStore = useWeeklyStore()

const helpOpen      = ref(false)
const taskModalOpen = ref(false)
const editTaskId    = ref(null)
const newTaskQ      = ref(1)
const mobTab        = ref('sug')
const notifRef      = ref(null)

provide('showNotif', (text, type) => notifRef.value?.show(text, type))

function openDrawer(taskId) {
  tasksStore.openTaskId = taskId
  history.pushState(null, '', `/${taskId}`)
}

function openNewTask(q = 1) {
  editTaskId.value = null
  newTaskQ.value   = q
  taskModalOpen.value = true
}

function openEditTask(id) {
  editTaskId.value    = id
  taskModalOpen.value = true
}

onMounted(async () => {
  await userStore.init()
  if (!userStore.profile) return

  // Load all data in parallel
  await Promise.all([
    tasksStore.load(),
    chatStore.load(),
    leavesStore.load(),
    pointsStore.load(),
    notesStore.load(userStore.profile.name),
  ])

  // SSE
  sseStore.connect()

  // Column resizers (wait for DOM)
  await nextTick()
  initResizers()

  // Deep-link: open drawer if URL contains task id
  const pathId = parseInt(location.pathname.replace('/', ''))
  if (pathId) {
    const t = tasksStore.tasks.find(t => t.id === pathId)
    if (t) openDrawer(pathId)
  }
})

// Re-apply resizers when switching back to desktop width
window.addEventListener('resize', () => {
  if (!window.matchMedia('(max-width: 639px)').matches) initResizers()
})
</script>
