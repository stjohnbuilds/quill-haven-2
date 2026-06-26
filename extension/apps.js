/* Quill Haven — the built-in app list, in ONE place.
   These are the apps that ship with Quill Haven. The shell (content.js) reads this
   plus the user's own added sites (kept in chrome.storage) to make the one app list.
   Loaded as a content script BEFORE content.js, so window.QH_BUILTINS is ready.

   Each app: { id, name, url, c1, c2, icon }  (icon = trusted inline SVG string). */
window.QH_BUILTINS = [
  {
    id: 'docs', name: 'Google Docs', url: 'https://docs.google.com',
    c1: '#f7cfe6', c2: '#eeb1cf',
    icon: '<svg width="22" height="22" viewBox="0 0 28 28" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round"><rect x="6" y="2" width="16" height="22" rx="2.5" opacity="0.9"/><line x1="9" y1="10" x2="19" y2="10" opacity="0.75"/><line x1="9" y1="13.5" x2="16" y2="13.5" opacity="0.6"/><line x1="9" y1="17" x2="18" y2="17" opacity="0.5"/></svg>'
  },
  {
    id: 'dabble', name: 'Dabble', url: 'https://app.dabblewriter.com',
    c1: '#d9c2f5', c2: '#b083e0',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"><path d="M4 4h11a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M18 7a3 3 0 0 1 2 0"/></svg>'
  }
];
