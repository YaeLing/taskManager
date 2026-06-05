import { defineStore } from 'pinia'
import { ref } from 'vue'
import API from '../api.js'

export const useLeavesStore = defineStore('leaves', () => {
  const leaves     = ref([])
  const modalOpen  = ref(false)

  async function load() {
    leaves.value = await API.fetchLeaves()
  }

  function setLeaves(data) { leaves.value = data }

  async function add(leaveData) {
    const res = await API.saveLeave({ action: 'add', ...leaveData })
    const json = await res.json()
    if (json.leaves) leaves.value = json.leaves
  }

  async function remove(name, leaveDate) {
    const res = await API.saveLeave({ action: 'remove', name, date: leaveDate })
    const json = await res.json()
    if (json.leaves) leaves.value = json.leaves
  }

  return { leaves, modalOpen, load, setLeaves, add, remove }
})
