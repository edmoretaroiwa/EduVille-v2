/* EduVille PDF Library page */
(function () {
  var L = window.EduLibrary, input = document.getElementById('lib-input'), out = document.getElementById('lib-results'),
      status = document.getElementById('lib-status'), selS = document.getElementById('lib-subject'), selL = document.getElementById('lib-level'),
      selY = document.getElementById('lib-year'), selK = document.getElementById('lib-kind');
  if (!L || !input) return;
  var limit = 24, timer;
  var reader = document.getElementById('pdf-reader');
  var readerTitle = document.getElementById('pdf-reader-title');
  var readerStatus = document.getElementById('pdf-reader-status');
  var canvas = document.getElementById('pdf-page-canvas');
  var ctx = canvas ? canvas.getContext('2d') : null;
  var pageInput = document.getElementById('pdf-page-number');
  var pageCount = document.getElementById('pdf-page-count');
  var prevBtn = document.getElementById('pdf-prev');
  var nextBtn = document.getElementById('pdf-next');
  var zoomValue = document.getElementById('pdf-zoom-value');
  var openNew = document.getElementById('pdf-open-new');
  var pdfDoc = null, currentPage = 1, zoom = 1, renderTask = null, loadTask = null, lastFocus = null;
  var PDFJS_VER = '3.11.174', PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VER + '/';
  var pdfjsPromise = null, openId = 0;
  // pdf.js is ~300 KB, so it is only downloaded when a student first taps "Read PDF" (saves data for everyone else)
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PDFJS_BASE + 'pdf.min.js'; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { window.pdfjsLib ? resolve(window.pdfjsLib) : reject(new Error('pdfjsLib missing')); };
      s.onerror = function () { pdfjsPromise = null; reject(new Error('pdf.js failed to load')); };
      document.head.appendChild(s);
    });
    return pdfjsPromise;
  }
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
      var v = el('button', 'g-btn sm gold', '📖 Read PDF'); v.type = 'button';
      v.addEventListener('click', function () { openReader(it.url, it.title); });
      v.addEventListener('pointerenter', function () { loadPdfJs().catch(function () {}); }, { once: true });
      v.addEventListener('touchstart', function () { loadPdfJs().catch(function () {}); }, { once: true, passive: true });
      var fallback = el('a', 'g-btn sm', 'Open PDF in new tab'); fallback.href = it.url; fallback.target = '_blank'; fallback.rel = 'noopener'; fallback.style.textDecoration = 'none';
      var w = el('a', 'g-btn sm', 'Share'); w.href = 'https://wa.me/?text=' + encodeURIComponent(it.title + ' — EduVille: ' + it.url); w.target = '_blank'; w.rel = 'noopener'; w.style.textDecoration = 'none';
      a.appendChild(v); a.appendChild(fallback); a.appendChild(w); c.appendChild(a); out.appendChild(c);
    });
    if (more) { var b = el('button', 'load-more-btn', 'Show more (' + more.more + ' more)'); b.type = 'button'; b.addEventListener('click', function () { limit += 24; run(); }); var w2 = el('div', 'load-more-wrap'); w2.appendChild(b); out.appendChild(w2); }
    status.textContent = (shown.length + (more ? more.more : 0)) + ' PDF' + ((shown.length + (more ? more.more : 0)) === 1 ? '' : 's') + (q ? ' for “' + q + '”' : '');
  }
  function setStatus(message) { if (readerStatus) readerStatus.textContent = message; }
  function updateControls() {
    if (!pdfDoc) return;
    pageInput.value = currentPage;
    pageInput.max = pdfDoc.numPages;
    pageCount.textContent = pdfDoc.numPages;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= pdfDoc.numPages;
    zoomValue.textContent = Math.round(zoom * 100) + '%';
  }
  function renderPage() {
    if (!pdfDoc || !ctx) return;
    if (renderTask) { try { renderTask.cancel(); } catch (e) {} }
    setStatus('Rendering page ' + currentPage + '…');
    pdfDoc.getPage(currentPage).then(function (page) {
      var viewport = page.getViewport({ scale: zoom });
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';
      renderTask = page.render({ canvasContext: ctx, viewport: viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
      return renderTask.promise;
    }).then(function () {
      updateControls();
      setStatus('Page ' + currentPage + ' of ' + pdfDoc.numPages);
    }).catch(function (err) {
      if (err && err.name === 'RenderingCancelledException') return;
      setStatus('This page could not be rendered. Try opening the PDF in a new tab.');
    });
  }
  function openReader(url, title) {
    if (!reader) { window.open(url, '_blank', 'noopener'); return; }
    lastFocus = document.activeElement;
    reader.hidden = false;
    reader.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pdf-reader-open');
    readerTitle.textContent = title || 'Reading PDF';
    openNew.href = url;
    setStatus('Loading document…');
    canvas.width = 0; canvas.height = 0;
    pdfDoc = null; currentPage = 1; zoom = 1;
    pageCount.textContent = '—'; pageInput.value = 1; prevBtn.disabled = true; nextBtn.disabled = true;
    var my = ++openId;
    setStatus('Loading reader…');
    loadPdfJs().then(function (lib) {
      if (my !== openId || reader.hidden) return; // closed or replaced while loading
      lib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js';
      if (loadTask && loadTask.destroy) { try { loadTask.destroy(); } catch (e) {} }
      setStatus('Loading document…');
      // isEvalSupported:false turns off a code path used by a known pdf.js 3.x security issue (CVE-2024-4367)
      loadTask = lib.getDocument({ url: url, isEvalSupported: false });
      return loadTask.promise.then(function (doc) {
        if (my !== openId || reader.hidden) { try { doc.destroy(); } catch (e) {} return; }
        pdfDoc = doc; currentPage = 1; updateControls(); renderPage();
      });
    }).catch(function (err) {
      if (my !== openId) return;
      console.error('EduVille PDF reader:', err);
      setStatus('Could not load this PDF in the reader. Try “Open in new tab”.');
    });
    document.getElementById('pdf-reader-close').focus();
  }
  function closeReader() {
    if (!reader || reader.hidden) return;
    openId++;
    if (loadTask && loadTask.destroy) { try { loadTask.destroy(); } catch (e) {} loadTask = null; }
    reader.hidden = true;
    reader.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pdf-reader-open');
    if (renderTask) { try { renderTask.cancel(); } catch (e) {} renderTask = null; }
    if (pdfDoc && pdfDoc.destroy) { try { pdfDoc.destroy(); } catch (e) {} }
    pdfDoc = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (reader) {
    document.getElementById('pdf-reader-close').addEventListener('click', closeReader);
    reader.addEventListener('click', function (e) { if (e.target === reader) closeReader(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !reader.hidden) closeReader(); });
    prevBtn.addEventListener('click', function () { if (pdfDoc && currentPage > 1) { currentPage--; renderPage(); } });
    nextBtn.addEventListener('click', function () { if (pdfDoc && currentPage < pdfDoc.numPages) { currentPage++; renderPage(); } });
    pageInput.addEventListener('change', function () { if (!pdfDoc) return; var n = parseInt(pageInput.value, 10); if (Number.isFinite(n)) { currentPage = Math.max(1, Math.min(pdfDoc.numPages, n)); renderPage(); } });
    document.getElementById('pdf-zoom-out').addEventListener('click', function () { if (pdfDoc) { zoom = Math.max(.5, Math.round((zoom - .1) * 10) / 10); renderPage(); } });
    document.getElementById('pdf-zoom-in').addEventListener('click', function () { if (pdfDoc) { zoom = Math.min(2, Math.round((zoom + .1) * 10) / 10); renderPage(); } });
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
