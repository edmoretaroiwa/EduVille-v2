/* EduVille PDF Library page */
(function () {
  var L = window.EduLibrary, input = document.getElementById('lib-input'), out = document.getElementById('lib-results'),
      status = document.getElementById('lib-status'), selS = document.getElementById('lib-subject'), selL = document.getElementById('lib-level'),
      selY = document.getElementById('lib-year'), selK = document.getElementById('lib-kind');
  if (!L || !input) return;
  var limit = 24, timer;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function fill(sel, vals) { vals.forEach(function (v) { var o = el('option', '', v); o.value = v; sel.appendChild(o); }); }

  function render(list, q) {
    out.textContent = '';
    var shown = list.filter(function (x) { return !x.more; }), more = list.filter(function (x) { return x.more; })[0];
    if (!shown.length) { out.appendChild(el('p', 'text-muted', q ? 'No PDFs match “' + q + '”. Try a topic like organic, mechanics or calculus, or a year.' : 'No PDFs found with these filters.')); status.textContent = ''; return; }
    shown.forEach(function (it) {
      var c = el('div', 'lib-card'), h = el('h3', '', it.title); c.appendChild(h);
      var tags = el('div', 'lib-tags');
      [it.kind, it.subject, it.level, it.year, it.paper, L.fmtSize(it.size)].filter(Boolean).forEach(function (t) { tags.appendChild(el('span', 'lib-tag', t)); });
      c.appendChild(tags);
      var a = el('div', 'lib-actions');
      var v = el('a', 'g-btn sm gold', '📄 Open PDF'); v.href = it.url; v.target = '_blank'; v.rel = 'noopener'; v.style.textDecoration = 'none';
      var w = el('a', 'g-btn sm', 'Share'); w.href = 'https://wa.me/?text=' + encodeURIComponent(it.title + ' — EduVille: ' + it.url); w.target = '_blank'; w.rel = 'noopener'; w.style.textDecoration = 'none';
      a.appendChild(v); a.appendChild(w); c.appendChild(a); out.appendChild(c);
    });
    if (more) { var b = el('button', 'load-more-btn', 'Show more (' + more.more + ' more)'); b.type = 'button'; b.addEventListener('click', function () { limit += 24; run(); }); var w2 = el('div', 'load-more-wrap'); w2.appendChild(b); out.appendChild(w2); }
    status.textContent = (shown.length + (more ? more.more : 0)) + ' PDF' + ((shown.length + (more ? more.more : 0)) === 1 ? '' : 's') + (q ? ' for “' + q + '”' : '');
  }
  function run() {
    var q = input.value.trim();
    L.search(q, limit, { subject: selS.value, level: selL.value, year: selY.value, kind: selK.value }).then(function (l) { render(l, q); })
      .catch(function () { status.textContent = ''; out.textContent = ''; out.appendChild(el('p', 'text-muted', 'The PDF library could not be loaded. Check your connection and try again.')); });
  }
  L.load().then(function (all) {
    fill(selS, Array.from(new Set(all.map(function (x) { return x.subject; }).filter(Boolean))).sort());
    fill(selL, Array.from(new Set(all.map(function (x) { return x.level; }).filter(Boolean))).sort());
    fill(selY, Array.from(new Set(all.map(function (x) { return x.year; }).filter(Boolean))).sort().reverse());
    var q0 = new URLSearchParams(location.search).get('q'); if (q0) input.value = q0;
    run();
  }).catch(function () { run(); });
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { limit = 24; run(); }, 250); });
  [selS, selL, selY, selK].forEach(function (s) { s.addEventListener('change', function () { limit = 24; run(); }); });
})();
