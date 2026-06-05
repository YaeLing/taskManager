const PARTIALS = [
  'partials/setup-screen.html',
  'partials/header.html',
  'partials/help-modal.html',
  'partials/mob-tabs.html',
  'partials/layout.html',
  'partials/drawer.html',
  'partials/task-modal.html',
  'partials/leave-modal.html',
  'partials/vote-modal.html',
  'partials/notification.html',
  'partials/weekly-confirm.html',
  'partials/weekly-record.html',
  'partials/ppt-modal.html',
  'partials/note-modal.html',
];

const SLOTS = {
  'notes-slot': 'partials/notes-board.html',
};

Promise.all(PARTIALS.map(url => fetch(url).then(r => r.text())))
  .then(htmls => {
    document.body.insertAdjacentHTML('beforeend', htmls.join('\n'));
    return Promise.all(
      Object.entries(SLOTS).map(([id, url]) =>
        fetch(url).then(r => r.text()).then(html => {
          const slot = document.getElementById(id);
          if (slot) slot.outerHTML = html;
        })
      )
    );
  })
  .then(() => {
    const s = document.createElement('script');
    s.src = 'app.js';
    document.body.appendChild(s);
  });
