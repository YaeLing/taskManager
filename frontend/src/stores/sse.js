import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTasksStore }  from './tasks.js'
import { useChatStore }   from './chat.js'
import { useUserStore }   from './user.js'
import { useLeavesStore } from './leaves.js'
import { usePointsStore } from './points.js'

export const useSSEStore = defineStore('sse', () => {
  const connected = ref(false)
  let es = null
  let retryTimer = null

  function connect() {
    if (es) { es.close(); es = null }
    es = new EventSource('/api/events')

    es.onopen = () => { connected.value = true }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        dispatch(data)
      } catch {}
    }

    es.onerror = () => {
      connected.value = false
      es.close(); es = null
      retryTimer = setTimeout(connect, 5000)
    }
  }

  function dispatch(data) {
    const tasks  = useTasksStore()
    const chat   = useChatStore()
    const user   = useUserStore()
    const leaves = useLeavesStore()
    const points = usePointsStore()

    switch (data.type) {
      case 'sync':
        tasks.setTasks(data.tasks)
        break
      case 'chat':
        chat.addMessage(data.message)
        break
      case 'user_update':
        user.applyRemoteUser(data.user_id, data.user)
        break
      case 'leave_update':
        leaves.setLeaves(data.leaves)
        break
      case 'points_update':
        points.setPoints(data)
        break
    }
  }

  function disconnect() {
    clearTimeout(retryTimer)
    if (es) { es.close(); es = null }
    connected.value = false
  }

  return { connected, connect, disconnect }
})
