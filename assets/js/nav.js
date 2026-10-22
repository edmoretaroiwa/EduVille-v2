/* EduVille shared side-drawer navigation (glass buttons) */
(function () {
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  var SECTIONS = [
    { title: 'Learn', items: [
      ['🏠', 'Home', 'index.html'], ['🔍', 'Search', 'search.html'], ['📚', 'Courses', 'courses.html'],
      ['🎬', 'Videos', 'videos.html'], ['📝', 'Past Papers', 'resources.html'], ['📄', 'PDF Library', 'library.html'],
      ['🎯', 'Practice', 'practice.html'], ['🗒️', 'Notes', 'notes.html'],
      ['🤖', 'AI Tutor', 'tymercre.html']
    ]},
    { title: 'Subjects', items: [
      ['➗', 'Mathematics', 'mathematics.html'], ['⚛️', 'Physics', 'physics.html'],
      ['🧪', 'Chemistry', 'chemistry.html'], ['🧬', 'Biology', 'biology.html'],
      ['💻', 'Computer Studies', 'computer-studies.html']
    ]},
    { title: 'My Space', items: [
      ['📊', 'Dashboard', 'dashboard.html'], ['🔖', 'Bookmarks', 'bookmarks.html'],
      ['💬', 'Study Groups', 'groups.html'], ['👤', 'Profile', 'profile.html']
    ]},
    { title: 'Teachers', items: [
      ['🧑‍🏫', 'Teacher Dashboard', 'teacher-dashboard.html'], ['➕', 'Add Lesson', 'add-lesson.html'],
      ['📄', 'Add Paper', 'add-paper.html'], ['🎥', 'Add Video', 'add-video.html'], ['🛠️', 'Admin Dashboard', 'admin.html'], ['🛡️', 'Moderation', 'admin-moderation.html']
    ]},
    { title: 'EduVille', items: [
      ['📰', 'Blog', 'blog.html'], ['ℹ️', 'About', 'about.html'], ['✉️', 'Contact', 'contact.html'],
      ['📜', 'Group Rules', 'chat-rules.html'], ['🔒', 'Privacy', 'privacy.html'], ['📜', 'Terms', 'terms.html']
    ]}
  ];

  function build() {
    var nav = document.querySelector('nav.navbar');
    var ul = nav && nav.querySelector('.nav-links');
    if (!ul) return;

    // Top bar keeps only the Login button (auth.js swaps it for the user badge)
    ul.innerHTML = '<li><a href="login.html" class="btn-login">🔐 Login</a></li>';

    var burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'nav-burger';
    burger.setAttribute('aria-label', 'Open menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span></span><span></span><span></span>';
    nav.insertBefore(burger, nav.firstChild);

    var sbtn = document.createElement('a');
    sbtn.href = 'search.html';
    sbtn.className = 'nav-search';
    sbtn.setAttribute('aria-label', 'Search');
    sbtn.innerHTML = '🔍';
    nav.insertBefore(sbtn, ul);

    var overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    var drawer = document.createElement('aside');
    drawer.className = 'drawer';
    drawer.setAttribute('aria-label', 'Site menu');
    drawer.innerHTML =
      '<div class="drawer-head"><span class="drawer-brand">Edu<b>Ville</b></span>' +
      '<button type="button" class="drawer-close" aria-label="Close menu">✕</button></div>' +
      '<form class="drawer-search" action="search.html" method="get" role="search">' +
      '<input type="search" name="q" placeholder="🔍 Search lessons, papers, videos…" aria-label="Search" autocomplete="off">' +
      '</form>' +
      '<div class="drawer-body">' +
      SECTIONS.map(function (s) {
        return '<div class="drawer-title">' + s.title + '</div><div class="drawer-group">' +
          s.items.map(function (i) {
            return '<a class="glass-btn' + (i[2] === page ? ' active' : '') + '" href="' + i[2] + '">' +
              '<span class="gb-ico">' + i[0] + '</span><span class="gb-txt">' + i[1] + '</span></a>';
          }).join('') + '</div>';
      }).join('') + '</div>';
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    function setOpen(o) {
      document.body.classList.toggle('drawer-open', o);
      burger.setAttribute('aria-expanded', o);
    }
    burger.addEventListener('click', function () { setOpen(true); });
    overlay.addEventListener('click', function () { setOpen(false); });
    drawer.querySelector('.drawer-close').addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  function footer() {
    var f = document.querySelector('footer');
    if (!f || f.querySelector('.footer-sitemap')) return;
    var d = document.createElement('div');
    d.className = 'footer-sitemap';
    d.innerHTML = SECTIONS.reduce(function (a, s) { return a.concat(s.items); }, [])
      .map(function (i) { return '<a href="' + i[2] + '">' + i[1] + '</a>'; }).join('');
    var c = f.querySelector('.copyright');
    c ? f.insertBefore(d, c) : f.appendChild(d);
    // "Share with a friend" on every page: native share sheet on phones, WhatsApp link elsewhere
    if (!f.querySelector('.footer-share')) {
      var sh = document.createElement('div'); sh.className = 'footer-share';
      var p = document.createElement('p'); p.textContent = 'Know a student who needs free lessons and past papers?';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'footer-share-btn'; b.textContent = '📲 Share EduVille';
      b.addEventListener('click', function () {
        var url = location.href.split('#')[0];
        var text = (document.title && document.title.indexOf('EduVille') !== -1 ? document.title : 'EduVille') + ' — free ZIMSEC & Cambridge lessons, past papers and an AI tutor.';
        if (navigator.share) { navigator.share({ title: 'EduVille', text: text, url: url }).catch(function () {}); }
        else { window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank', 'noopener'); }
      });
      sh.appendChild(p); sh.appendChild(b);
      f.insertBefore(sh, d);
    }
  }

  function init() { build(); footer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
