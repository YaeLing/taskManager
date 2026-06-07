// Column resizing — ported from the pre-Vue app.js initResizers()
// Drag #resizer-left / #resizer-right to resize the sug / chat panels,
// and #resizer-done to resize the completed section. Widths persist in
// localStorage.

function isMobile() {
  return window.matchMedia('(max-width: 639px)').matches
}

export function initResizers() {
  if (isMobile()) return

  const sug    = document.querySelector('.sug-panel')
  const chat   = document.querySelector('.chat-panel')
  const layout = document.querySelector('.layout')
  if (!sug || !chat || !layout) return

  // Restore saved widths
  const savedSug  = localStorage.getItem('col_sug_w')
  const savedChat = localStorage.getItem('col_chat_w')
  if (savedSug)  sug.style.width  = savedSug  + 'px'
  if (savedChat) chat.style.width = savedChat + 'px'

  makeResizer('resizer-left',  () => sug,  dx =>  dx, 'col_sug_w', layout)
  makeResizer('resizer-right', () => chat, dx => -dx, 'col_chat_w', layout)
}

function makeResizer(resizerId, getPanel, getDirection, storageKey, layout) {
  const handle = document.getElementById(resizerId)
  if (!handle || handle._resizerBound) return
  handle._resizerBound = true

  handle.addEventListener('mousedown', e => {
    e.preventDefault()
    const panel  = getPanel()
    const startX = e.clientX
    const startW = panel.offsetWidth
    handle.classList.add('active')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function onMove(ev) {
      const dx  = getDirection(ev.clientX - startX)
      const min = 160
      const max = layout.offsetWidth * 0.45
      const nw  = Math.max(min, Math.min(max, startW + dx))
      panel.style.width = nw + 'px'
    }
    function onUp() {
      handle.classList.remove('active')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      localStorage.setItem(storageKey, parseInt(getPanel().style.width))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })
}

