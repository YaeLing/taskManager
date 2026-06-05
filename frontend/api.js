/**
 * api.js — HTTP/fetch wrappers for the Task Manager backend
 * Loaded before app.js. All functions return parsed JSON or the raw Response.
 */

const API = {

  /* ─── Tasks ─── */
  async fetchTasks() {
    const res = await fetch('/api/tasks');
    if (!res.ok) throw new Error('fetchTasks failed: ' + res.status);
    return res.json();
  },

  async saveTasks(tasks) {
    return fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });
  },

  /* ─── Users ─── */
  async fetchUsers() {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('fetchUsers failed: ' + res.status);
    return res.json();
  },

  async saveUser(data) {
    return fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async fetchIP() {
    const res = await fetch('/api/ip');
    if (!res.ok) throw new Error('fetchIP failed: ' + res.status);
    return res.json();
  },

  async uploadAvatar(formData) {
    return fetch('/api/upload-avatar', { method: 'POST', body: formData });
  },

  /* ─── Chat ─── */
  async fetchChat() {
    const res = await fetch('/api/chat');
    if (!res.ok) throw new Error('fetchChat failed: ' + res.status);
    return res.json();
  },

  async postChat(message) {
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
  },

  /* ─── Leaves ─── */
  async fetchLeaves() {
    const res = await fetch('/api/leaves');
    if (!res.ok) throw new Error('fetchLeaves failed: ' + res.status);
    return res.json();
  },

  async postLeave(payload) {
    return fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  /* ─── Points / Votes ─── */
  async fetchPoints() {
    const res = await fetch('/api/points');
    if (!res.ok) throw new Error('fetchPoints failed: ' + res.status);
    return res.json();
  },

  async postVote(payload) {
    return fetch('/api/points/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  /* ─── Personal Tasks ─── */
  async fetchPersonalTasks(name) {
    const res = await fetch('/api/personal-tasks?name=' + encodeURIComponent(name));
    if (!res.ok) throw new Error('fetchPersonalTasks failed: ' + res.status);
    return res.json();
  },

  async savePersonalTasks(name, tasks) {
    return fetch('/api/personal-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tasks })
    });
  },

  /* ─── History ─── */
  async logHistory(entry) {
    return fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
  },

  /* ─── Weekly Config ─── */
  async fetchWeeklyConfig() {
    const res = await fetch('/api/weekly-config');
    if (!res.ok) throw new Error('fetchWeeklyConfig failed: ' + res.status);
    return res.json();
  },

  async saveWeeklyConfig(cfg) {
    return fetch('/api/weekly-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
  },

  /* ─── Weekly Records ─── */
  async fetchWeeklyRecords() {
    const res = await fetch('/api/weekly-records');
    if (!res.ok) throw new Error('fetchWeeklyRecords failed: ' + res.status);
    return res.json();
  },

  async fetchWeeklyRecord(taskId) {
    const res = await fetch('/api/weekly-record?taskId=' + taskId);
    if (!res.ok) return null;
    return res.json();
  },

  async saveWeeklyRecord(payload) {
    return fetch('/api/weekly-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  /* ─── PPT / Template ─── */
  async fetchPPTTemplateInfo() {
    const res = await fetch('/api/ppt-template-info');
    if (!res.ok) throw new Error('fetchPPTTemplateInfo failed: ' + res.status);
    return res.json();
  },

  async uploadPPTTemplate(formData) {
    return fetch('/api/upload-ppt-template', { method: 'POST', body: formData });
  },

  async generatePPT(cfg) {
    return fetch('/api/generate-ppt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
  },

  async clearWeeklyHistory() {
    return fetch('/api/clear-weekly-history', { method: 'POST' });
  },

  /* ─── Notes ─── */
  async fetchNotes(name) {
    const res = await fetch(`/api/notes?name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error('fetchNotes failed: ' + res.status);
    return res.json();
  },

  async saveNotes(name, notes) {
    return fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, notes })
    });
  },
};
