import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import API from '../api.js'

export const usePointsStore = defineStore('points', () => {
  const rockets   = ref({})
  const votes     = ref({})
  const week      = ref('')
  const modalOpen = ref(false)
  const selectedTaskId = ref(null)

  const leaderboard = computed(() =>
    Object.entries(rockets.value)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }))
  )

  async function load() {
    const data = await API.fetchPoints()
    rockets.value = data.rockets || {}
    votes.value   = data.votes   || {}
    week.value    = data.week    || ''
  }

  function setPoints(data) {
    rockets.value = data.rockets || {}
    if (data.week) votes.value[data.week] = votes.value[data.week] || {}
  }

  function hasVoted(voterName) {
    return !!(votes.value[week.value] || {})[voterName]
  }

  async function vote(voter, votedFor, taskId, taskText) {
    const res = await API.vote({ voter, votedFor, taskId, taskText })
    if (res.ok) rockets.value = res.rockets
    return res
  }

  return { rockets, votes, week, modalOpen, selectedTaskId, leaderboard, load, setPoints, hasVoted, vote }
})
