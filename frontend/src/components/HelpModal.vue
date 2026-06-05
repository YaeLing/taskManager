<template>
  <div class="help-overlay" :class="{ active: modelValue }" @click.self="$emit('update:modelValue', false)">
    <div class="help-modal">
      <div class="help-head">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" stroke-width="2.2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h2>使用手冊</h2>
        <button class="help-close" @click="$emit('update:modelValue', false)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="help-body">
        <div class="help-section">
          <h3>便條紙看板</h3>
          <ul>
            <li><strong>新增便條紙</strong>：點中欄右上角「＋ 新增」，選擇類型：純文字 / 標題+內文 / 待辦清單</li>
            <li><strong>切換待辦項目</strong>：待辦清單卡片可直接點 checkbox，無需開啟編輯器</li>
            <li><strong>刪除便條紙</strong>：hover 卡片 → 點右上角 ✕；或在編輯器內點「刪除」</li>
            <li>便條紙為個人私有，每人上限 30 張</li>
          </ul>
        </div>
        <div class="help-section">
          <h3>任務操作</h3>
          <ul>
            <li><strong>新增任務</strong>：點右上角「＋ 新增任務」</li>
            <li><strong>標記完成</strong>：點建議面板左側圓形勾選框</li>
            <li><strong>刪除任務</strong>：開啟詳情側欄 → 第二行「刪除任務」按鈕</li>
          </ul>
        </div>
        <div class="help-section">
          <h3>標籤（Tags）</h3>
          <ul>
            <li>編輯任務時可新增多個 Tag</li>
            <li>建議執行面板上方可多選篩選</li>
          </ul>
        </div>
        <div class="help-section">
          <h3>認領與協作</h3>
          <ul>
            <li><strong>認領任務</strong>：在建議面板點「接手」</li>
            <li><strong>留言</strong>：點任務名稱開啟詳情側欄，在底部輸入留言</li>
            <li><strong>即時同步</strong>：所有操作透過 SSE 即時廣播</li>
          </ul>
        </div>
        <div class="help-section">
          <h3>建議執行順序</h3>
          <p>左側面板依「逾期 → Q1→Q4 → 截止日期」自動排序。</p>
        </div>
        <div class="help-section">
          <h3>已完成</h3>
          <ul>
            <li>點 header「已完成」顯示 / 隱藏完成面板（便條紙下方）</li>
            <li>依本週 / 上週 / 更早分組</li>
          </ul>
        </div>
        <div class="help-section">
          <h3>關鍵字搜尋</h3>
          <p>Header 搜尋列即時搜尋任務標題、說明與留言。</p>
        </div>
        <div class="help-section">
          <h3>分享連結</h3>
          <p>開啟詳情側欄 → 點「複製連結」，隊友開啟會自動跳至該任務。</p>
        </div>
        <div class="help-section">
          <h3>請假公告</h3>
          <p>右側「📅 請假公告」→「＋ 請假」。支援起迄區間。</p>
        </div>
        <div class="help-section">
          <h3>火箭積分投票 🚀</h3>
          <p>每週每人一票，投票後觸發慶祝動畫。</p>
        </div>
        <div class="help-section">
          <h3>週報 PPT 生成</h3>
          <ul>
            <li>任務完成時可填寫說明並上傳截圖</li>
            <li>點 header「週報」上傳 .pptx 模板後一鍵生成</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ modelValue: Boolean })
defineEmits(['update:modelValue'])
</script>

<style scoped>
.help-overlay { display: none; }
.help-overlay.active { display: flex; }
</style>
