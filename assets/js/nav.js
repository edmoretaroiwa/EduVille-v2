/* EduVille shared navigation — one menu for every page.
   Rebuilds the navbar links + adds a mobile hamburger and a fuller footer. */
(function () {
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  var MENU = [
    { t: 'Home', h: 'index.html' },
    { t: 'Courses', h: 'courses.html' },
    { t: 'Subjects', kids: [
      ['➗ Mathematics', 'mathematics.html'], ['⚛️ Physics', 'physics.html'],
      ['🧪 Chemistry', 'chemistry.html'], ['🧬 Biology', 'biology.html'],
      ['💻 Computer Studies', 'computer-studies.html']
    ]},
    { t: 'Videos', h: 'videos.html' },
    { t: 'Past Papers', h: 'resources.html' },
    { t: 'Practice', h: 'practice.html' },
    { t: 'Notes', h: 'notes.html' },
    { t: '🤖 AI Tutor', h: 'tymercre.html' },
    { t: 'More', kids: [
      ['📊 My Dashboard', 'dashboard.html'], ['🔖 Bookmarks', 'bookmarks.html'],
      ['👤 Profile', 'profile.html'], ['📝 Blog', 'blog.html'],
      ['🧑‍🏫 Teacher Dashboard', 'teacher-dashboard.html'],
      ['➕ Add Lesson', 'add-lesson.html'], ['➕ Add Paper', 'add-paper.html'],
      ['➕ Add Video', 'add-video.html'],
      ['ℹ️ About', 'about.html'], ['✉️ Contact', 'contact.html']
    ]}
  ];

  function isActive(h) { return h === page; }
  function link(t, h) {
    return '<a href="' + h + '"' + (isActive(h) ? ' class="active"' : '') + '>' + t + '</a>';
  }

  function build() {
    var nav = document.querySelector('nav.navbar');
    var ul = nav && nav.querySelector('.nav-links');
    if (!ul) return;

    var html = MENU.map(function (m) {
      if (!m.kids) return '<li>' + link(m.t, m.h) + '</li>';
      var open = m.kids.some(function (k) { return isActive(k[1]); });
      return '<li class="nav-dd' + (open ? ' has-active' : '') + '">' +
        '<button type="button" class="nav-dd-btn" aria-expanded="false">' + m.t + ' ▾</button>' +
        '<ul class="nav-dd-menu">' +
        m.kids.map(function (k) { return '<li>' + link(k[0], k[1]) + '</li>'; }).join('') +
        '</ul></li>';
    }).join('');
    // keep .btn-login so auth.js can swap it for the user badge
    html += '<li><a href="login.html" class="btn-login">🔐 Login</a></li>';
    ul.innerHTML = html;

    var burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'nav-burger';
    burger.setAttribute('aria-label', 'Menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '☰';
    nav.insertBefore(burger, ul);

    burger.addEventListener('click', function () {
      var o = nav.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', o);
      burger.innerHTML = o ? '✕' : '☰';
    });
    ul.querySelectorAll('.nav-dd-btn').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = b.parentNode, o = !li.classList.contains('open');
        ul.querySelectorAll('.nav-dd.open').forEach(function (x) { x.classList.remove('open'); });
        li.classList.toggle('open', o);
        b.setAttribute('aria-expanded', o);
      });
    });
    document.addEventListener('click', function () {
      ul.querySelectorAll('.nav-dd.open').forEach(function (x) { x.classList.remove('open'); });
    });
  }

  function footer() {
    var f = document.querySelector('footer');
    if (!f || f.querySelector('.footer-sitemap')) return;
    var d = document.createElement('div');
    d.className = 'footer-sitemap';
    d.innerHTML =
      '<a href="index.html">Home</a><a href="courses.html">Courses</a>' +
      '<a href="mathematics.html">Mathematics</a><a href="physics.html">Physics</a>' +
      '<a href="chemistry.html">Chemistry</a><a href="biology.html">Biology</a>' +
      '<a href="computer-studies.html">Computer Studies</a><a href="videos.html">Videos</a>' +
      '<a href="resources.html">Past Papers</a><a href="practice.html">Practice</a>' +
      '<a href="notes.html">Notes</a><a href="tymercre.html">AI Tutor</a>' +
      '<a href="blog.html">Blog</a><a href="about.html">About</a>' +
      '<a href="contact.html">Contact</a><a href="privacy.html">Privacy</a>' +
      '<a href="terms.html">Terms</a>';
    var c = f.querySelector('.copyright');
    c ? f.insertBefore(d, c) : f.appendChild(d);
  }

  function init() { build(); footer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
