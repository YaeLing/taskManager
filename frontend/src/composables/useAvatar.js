export const SHOEBILL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="#7B9EAD"/><stop offset="100%" stop-color="#3D6070"/></radialGradient>
    <radialGradient id="head" cx="45%" cy="35%" r="60%"><stop offset="0%" stop-color="#8BAEBB"/><stop offset="100%" stop-color="#5A8899"/></radialGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg)"/>
  <ellipse cx="50" cy="72" rx="22" ry="20" fill="#5A8899"/>
  <rect x="42" y="52" width="16" height="22" rx="8" fill="#6898A8"/>
  <circle cx="50" cy="38" r="20" fill="url(#head)"/>
  <ellipse cx="45" cy="19" rx="3" ry="7" fill="#4A7A8A" transform="rotate(-15 45 19)"/>
  <ellipse cx="50" cy="17" rx="3" ry="8" fill="#507D8D" transform="rotate(0 50 17)"/>
  <ellipse cx="55" cy="19" rx="3" ry="7" fill="#4A7A8A" transform="rotate(15 55 19)"/>
  <circle cx="42" cy="35" r="6.5" fill="white"/><circle cx="58" cy="35" r="6.5" fill="white"/>
  <circle cx="42" cy="35" r="4.5" fill="#1a2a34"/><circle cx="58" cy="35" r="4.5" fill="#1a2a34"/>
  <circle cx="40.5" cy="33" r="1.8" fill="white"/><circle cx="56.5" cy="33" r="1.8" fill="white"/>
  <path d="M28,45 Q50,62 72,45 Q64,56 50,58 Q36,56 28,45Z" fill="#C8A84A"/>
  <path d="M29,44 Q50,52 71,44 Q63,53 50,55 Q37,53 29,44Z" fill="#E0C060"/>
</svg>`

export const AVATARS_EMOJI = ['🐦','🦉','🐧','🦚','🦋','🌿','🍀','🌸','⭐','🔮','🎯','🎨','🚀','💎','🌊','🔥']

export function avHTML(av, size = 22, avType = null) {
  if (avType === 'custom' || (av && av.startsWith('/avatars/'))) {
    return `<img src="${av}" style="width:${size}px;height:${size}px;object-fit:cover;display:block;">`
  }
  if (av === 'shoebill') return SHOEBILL_SVG
  return `<span style="font-size:${Math.round(size * .65)}px;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;line-height:1;flex-shrink:0;">${av}</span>`
}

export function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const COLORS = { 1: '#b8726a', 2: '#b89460', 3: '#6a9a78', 4: '#7a88b8' }
export const QNAMES = { 1: 'Q1 緊急＆重要', 2: 'Q2 緊急＆不重要', 3: 'Q3 不緊急＆重要', 4: 'Q4 不緊急＆不重要' }

export function isOverdue(due) {
  if (!due) return false
  return due < new Date().toISOString().slice(0, 10)
}
