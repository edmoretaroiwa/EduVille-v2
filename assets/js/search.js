/* EduVille — site-wide search (courses, lessons, videos, past papers) */
(function () {
  var client = window.db;
  var input = document.getElementById('search-input');
  var out = document.getElementById('search-results');
  var status = document.getElementById('search-status');
  var chips = document.getElementById('search-filters');
  if (!client || !input || !out) return;

  var filter = 'all', timer = null, last = null;

  function clean(q) { return q.replace(/[,()%*\\"'`;:<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); }
  function card(icon, title, meta, href, extra, blank) {
    return '<a class="course-card" style="text-decoration:none;color:inherit" href="' + escapeHtml(href) + '"' +
      (blank ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<div class="paper-header"><div class="paper-icon">' + icon + '</div><h3 class="paper-title">' +
      escapeHtml(title || 'Untitled') + '</h3></div>' +
      '<div class="paper-tags">' + (meta || []).filter(Boolean).map(function (m) {
        return '<span class="tag">' + escapeHtml(String(m)) + '</span>'; }).join('') + '</div>' +
      (extra ? '<p class="course-desc">' + escapeHtml(extra) + '</p>' : '') + '</a>';
  }

  async function run(q) {
    q = clean(q);
    if (q.length < 2) { out.innerHTML = ''; status.textContent = 'Type at least 2 letters to search.'; return; }
    last = q; status.textContent = 'Searching…';
    var like = '%' + q + '%';
    var yr = /^\d{4}$/.test(q) ? ',year.eq.' + q : '';
    var want = function (k) { return filter === 'all' || filter === k; };
    try {
      var res = await Promise.all([
        want('courses') ? client.from('courses').select('id,title,description,subject,level').eq('is_published', true)
          .or('title.ilike.' + like + ',description.ilike.' + like + ',subject.ilike.' + like).limit(12) : { data: [] },
        want('lessons') ? client.from('lessons').select('id,title,duration_minutes').eq('is_published', true)
          .ilike('title', like).limit(20) : { data: [] },
        want('videos') ? client.from('videos').select('id,title,author,course,duration')
          .or('title.ilike.' + like + ',author.ilike.' + like + ',course.ilike.' + like).limit(20) : { data: [] },
        want('papers') ? client.from('papers').select('id,title,subject,exam_board,level,year,file_url')
          .or('title.ilike.' + like + ',subject.ilike.' + like + ',exam_board.ilike.' + like + yr).limit(30) : { data: [] }
      ]);
      if (q !== last) return; // a newer search started
      var html = '', n = 0;
      function section(title, arr, fn) {
        if (!arr || !arr.length) return;
        n += arr.length;
        html += '<h3 class="section-heading" style="margin:1.5rem 0 .75rem">' + title + ' (' + arr.length + ')</h3>' +
          '<div class="grid-courses">' + arr.map(fn).join('') + '</div>';
      }
      section('📚 Courses', res[0].data, function (c) {
        return card('📚', c.title, [c.subject, c.level], 'course.html?id=' + encodeURIComponent(c.id), c.description); });
      section('📖 Lessons', res[1].data, function (l) {
        return card('📖', l.title, [l.duration_minutes ? l.duration_minutes + ' min' : ''], 'lesson.html?id=' + encodeURIComponent(l.id)); });
      section('🎬 Videos', res[2].data, function (v) {
        return card('🎬', v.title, [v.course, v.author, v.duration], 'video.html?id=' + encodeURIComponent(v.id)); });
      section('📄 Past Papers', res[3].data, function (p) {
        return card('📄', p.title, [p.exam_board, p.level, p.subject, p.year], safeUrl(p.file_url), '', true); });
      out.innerHTML = html || '<div class="empty-state"><p>No results for “' + escapeHtml(q) + '”. Try a subject name like <b>algebra</b>, <b>physics</b> or a year like <b>2023</b>.</p></div>';
      status.textContent = n ? n + ' result' + (n === 1 ? '' : 's') + ' for “' + q + '”' : '';
      history.replaceState(null, '', '?q=' + encodeURIComponent(q));
    } catch (e) {
      console.error('search error', e);
      status.textContent = 'Search failed. Check your connection and try again.';
    }
  }

  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { run(input.value); }, 300); });
  if (chips) chips.addEventListener('click', function (e) {
    var b = e.target.closest('.filter-chip'); if (!b) return;
    chips.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('active'); });
    b.classList.add('active'); filter = b.dataset.f; run(input.value);
  });
  var q0 = new URLSearchParams(location.search).get('q');
  if (q0) { input.value = q0; run(q0); }
  input.focus();
})();
