/* EduVille — click-to-play YouTube facade.
   Shows a light thumbnail; the heavy YouTube player only loads when the student taps play. */
(function () {
  var warmed = false;
  function warm() {
    if (warmed) return; warmed = true;
    ['https://www.youtube-nocookie.com', 'https://i.ytimg.com', 'https://www.google.com'].forEach(function (u) {
      var l = document.createElement('link'); l.rel = 'preconnect'; l.href = u; document.head.appendChild(l);
    });
  }
  window.ytThumb = function (id, q) { return 'https://i.ytimg.com/vi/' + id + '/' + (q || 'mqdefault') + '.jpg'; };
  window.ytFacade = function (container, ytId, title) {
    if (!container || !/^[A-Za-z0-9_-]{11}$/.test(ytId || '')) return false;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'yt-facade'; b.setAttribute('aria-label', 'Play video: ' + (title || 'video'));
    var img = document.createElement('img');
    img.src = window.ytThumb(ytId, 'hqdefault'); img.alt = ''; img.width = 480; img.height = 360; img.decoding = 'async';
    var play = document.createElement('span'); play.className = 'yt-play'; play.textContent = '▶';
    b.appendChild(img); b.appendChild(play);
    if (title) { var c = document.createElement('span'); c.className = 'yt-cap'; c.textContent = title; b.appendChild(c); }
    b.addEventListener('pointerenter', warm, { once: true });
    b.addEventListener('touchstart', warm, { once: true, passive: true });
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + ytId + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      f.title = title || 'Video'; f.allowFullscreen = true;
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      b.classList.add('yt-live'); b.innerHTML = ''; b.appendChild(f);
    });
    container.innerHTML = ''; container.appendChild(b);
    return true;
  };
})();
