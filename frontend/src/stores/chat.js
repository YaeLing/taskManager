import { defineStore } from 'pinia'
import { ref } from 'vue'
import API from '../api.js'

export const useChatStore = defineStore('chat', () => {
  const messages = ref([])

  async function load() {
    messages.value = await API.fetchChat()
  }

  async function send(text, profile) {
    if (!text.trim()) return
    const msg = {
      text: text.trim(),
      name: profile.name,
      avatar: profile.avatar,
      avatar_type: profile.avatar_type,
      time: new Date().toISOString(),
    }
    await API.sendChat(msg)
  }

  function addMessage(msg) {
    messages.value.push(msg)
    if (messages.value.length > 200) messages.value = messages.value.slice(-200)
  }

  function setMessages(msgs) {
    messages.value = msgs
  }

  return { messages, load, send, addMessage, setMessages }
})
