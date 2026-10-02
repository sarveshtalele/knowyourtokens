// Applied before first paint to avoid a light/dark flash. External file (not
// inline) so the dashboard's Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
