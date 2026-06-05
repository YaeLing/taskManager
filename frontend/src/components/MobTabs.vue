<template>
  <nav class="mob-tabs">
    <div v-for="tab in tabs" :key="tab.panel"
         class="mob-tab" :class="{ active: active === tab.panel }"
         @click="$emit('update:active', tab.panel)">
      <span class="mt-icon">{{ tab.icon }}</span>
      <span class="mt-lbl">{{ tab.label }}</span>
    </div>
  </nav>
</template>

<script setup>
defineProps({ active: String })
defineEmits(['update:active'])

const tabs = [
  { panel: 'sug',      icon: '↑', label: '建議順序' },
  { panel: 'notes',    icon: '📝', label: '便條紙' },
  { panel: 'done',     icon: '✓', label: '已完成' },
  { panel: 'chat',     icon: '💬', label: '留言板' },
]
</script>
