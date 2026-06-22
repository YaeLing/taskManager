const API = {
  async fetchTasks()        { return (await fetch('/api/tasks')).json() },
  async saveTasks(tasks)    { return fetch('/api/tasks', _post({ tasks })) },
  async fetchUsers()        { return (await fetch('/api/users')).json() },
  async saveUser(data)      { return fetch('/api/users', _post(data)) },
  async fetchChat()         { return (await fetch('/api/chat')).json() },
  async sendChat(message)   { return fetch('/api/chat', _post({ message })) },
  async fetchLeaves()       { return (await fetch('/api/leaves')).json() },
  async saveLeave(data)     { return fetch('/api/leaves', _post(data)) },
  async fetchNotes(name)    { return (await fetch(`/api/notes?name=${encodeURIComponent(name)}`)).json() },
  async saveNotes(name, notes) { return fetch('/api/notes', _post({ name, notes })) },
  async fetchPoints()       { return (await fetch('/api/points')).json() },
  async vote(data)          { return (await fetch('/api/points/vote', _post(data))).json() },
  async fetchIP()           { return (await fetch('/api/ip')).json() },
  async logHistory(entry)   { return fetch('/api/history', _post(entry)) },

  async uploadAvatar(file) {
    const fd = new FormData(); fd.append('file', file)
    return (await fetch('/api/upload-avatar', { method: 'POST', body: fd })).json()
  },

  async fetchPPTInfo()         { return (await fetch('/api/ppt-template-info')).json() },
  async uploadPPTTemplate(file) {
    const fd = new FormData(); fd.append('file', file)
    return fetch('/api/upload-ppt-template', { method: 'POST', body: fd })
  },
  async fetchWeeklyConfig()    { return (await fetch('/api/weekly-config')).json() },
  async saveWeeklyConfig(data) { return fetch('/api/weekly-config', _post(data)) },
  async fetchWeeklyRecords()   { return (await fetch('/api/weekly-records')).json() },
  async fetchWeeklyRecordsAll() { return (await fetch('/api/weekly-records-all')).json() },
  async fetchWeeklyRecord(taskId) { return (await fetch(`/api/weekly-record?taskId=${taskId}`)).json() },
  async saveWeeklyRecord(data) { return (await fetch('/api/weekly-record', _post(data))).json() },
  async generatePPT(cfg)       { return fetch('/api/generate-ppt', _post(cfg)) },
  async clearWeeklyHistory()   { return (await fetch('/api/clear-weekly-history', { method: 'POST' })).json() },

  async fetchPersonalTasks(name) {
    return (await fetch(`/api/personal-tasks?name=${encodeURIComponent(name)}`)).json()
  },
}

function _post(body) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export default API
