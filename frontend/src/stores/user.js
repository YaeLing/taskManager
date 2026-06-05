import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import API from '../api.js'
import { AVATARS_EMOJI, SHOEBILL_SVG } from '../composables/useAvatar.js'

export const useUserStore = defineStore('user', () => {
  const profile   = ref(null)   // { name, avatar, avatar_type }
  const myIP      = ref('—')
  const teamName  = ref(localStorage.getItem('team_name') || 'My Team')
  const allUsers  = ref({})     // ip → user from server

  // Setup screen state
  const setupVisible  = ref(false)
  const selAv         = ref('shoebill')
  const selAvType     = ref('emoji')
  const customAvUrl   = ref(null)

  const avatarList = computed(() => AVATARS_EMOJI)

  async function init() {
    profile.value = JSON.parse(localStorage.getItem('user_profile') || 'null')
    try {
      const ipData = await API.fetchIP()
      myIP.value = ipData.ip
      const users = await API.fetchUsers()
      allUsers.value = users
      if (!profile.value && users[myIP.value]) {
        const u = users[myIP.value]
        profile.value = { name: u.name, avatar: u.avatar, avatar_type: u.avatar_type || 'emoji' }
        localStorage.setItem('user_profile', JSON.stringify(profile.value))
      }
    } catch (e) { /* offline */ }
    if (!profile.value) setupVisible.value = true
  }

  async function saveProfile(name, avatar, avType, customUrl) {
    profile.value = { name, avatar: avType === 'custom' ? customUrl : avatar, avatar_type: avType }
    localStorage.setItem('user_profile', JSON.stringify(profile.value))
    try {
      await API.saveUser({ id: myIP.value, ...profile.value })
    } catch (e) {}
    setupVisible.value = false
  }

  function setTeamName(name) {
    teamName.value = name
    localStorage.setItem('team_name', name)
  }

  function applyRemoteUser(userId, userData) {
    allUsers.value[userId] = userData
  }

  return {
    profile, myIP, teamName, allUsers,
    setupVisible, selAv, selAvType, customAvUrl, avatarList,
    init, saveProfile, setTeamName, applyRemoteUser,
  }
})
