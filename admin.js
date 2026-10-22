/* EduVille — admin dashboard (overview, users & roles, content, activity) */
(async function () {
  var db = window.db, root = document.getElementById('admin-root');
  if (!db || !root) return;
  var info = await getMyRole();
  if (!info.session) { root.innerHTML = '<div class="g-panel"><h3>Please log in</h3><a class="g-btn gold" style="text-decoration:none;display:inline-block" href="login.html">🔐 Log in</a></div>'; return; }
  var me = await db.rpc('admin_me');
  if (me.error || !me.data || !me.data.is_admin) { root.innerHTML = '<div class="g-panel"><h3>Admins only</h3><p>This page is for EduVille administrators.</p></div>'; return; }
  var isOwner = !!me.data.is_owner, myId = info.session.user.id;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(label, cls, fn) { var b = el('button', 'g-btn sm ' + (cls || ''), label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function clean(q) { return (q || '').replace(/[,()%*\\"'`;:<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); }
  async function call(p) { var r = await p; if (r.error) { alert(r.error.message.replace(/^.*?: /, '')); return false; } return true; }

  var tabs = [['overview', '📊 Overview'], ['users', '👥 Users'], ['content', '🎬 Content'], ['activity', '📜 Activity']];
  var bar = el('div', 'ad-tabs'), view = el('div');
  root.appendChild(bar); root.appendChild(view);
  tabs.forEach(function (t) { var b = el('button', 'ad-tab', t[1]); b.type = 'button'; b.dataset.k = t[0]; b.addEventListener('click', function () { show(t[0]); }); bar.appendChild(b); });
  var link = el('a', 'ad-tab', '🛡️ Reports'); link.href = 'admin-moderation.html'; link.style.textDecoration = 'none'; bar.appendChild(link);

  function show(k) {
    bar.querySelectorAll('.ad-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.k === k); });
    view.textContent = ''; ({ overview: overview, users: users, content: content, activity: activity })[k]();
  }

  // ---------- overview ----------
  async function overview() {
    view.textContent = 'Loading…';
    var r = await db.rpc('admin_stats'); view.textContent = '';
    if (r.error) { view.textContent = 'Could not load: ' + r.error.message + ' (did you run admin-dashboard.sql?)'; return; }
    var s = r.data, grid = el('div', 'ad-stats');
    [['Users', s.users], ['Students', s.students], ['Teachers', s.teachers], ['Admins', s.admins],
     ['Courses', s.courses], ['Lessons', s.lessons], ['Videos', s.videos], ['Past papers', s.papers],
     ['Study groups', s.groups], ['Chat bans', s.chat_bans]].forEach(function (x) {
      var c = el('div', 'ad-stat'); c.appendChild(el('b', '', x[1] == null ? '–' : String(x[1]))); c.appendChild(el('span', '', x[0])); grid.appendChild(c); });
    var rep = el('a', 'ad-stat alert' + (s.open_reports ? '' : ''), ''); rep.href = 'admin-moderation.html'; rep.style.textDecoration = 'none'; rep.style.color = 'inherit';
    rep.appendChild(el('b', '', String(s.open_reports))); rep.appendChild(el('span', '', 'Open reports → review')); grid.appendChild(rep);
    view.appendChild(grid);
    var tip = el('div', 'g-panel'); tip.appendChild(el('h3', '', 'Quick actions'));
    var row = el('div', 'g-row');
    [['➕ Add video', 'add-video.html'], ['📄 Add paper', 'add-paper.html'], ['➕ Add lesson', 'add-lesson.html'], ['💬 Study groups', 'groups.html']].forEach(function (a) {
      var l = el('a', 'g-btn sm', a[0]); l.href = a[1]; l.style.textDecoration = 'none'; row.appendChild(l); });
    tip.appendChild(row);
    if (!isOwner) tip.appendChild(el('p', 'g-msg-note', 'You are an admin. Only the site owner can add or remove other admins.'));
    view.appendChild(tip);
  }

  // ---------- users ----------
  function users() {
    var q = '', role = '', offset = 0, PAGE = 20, run = 0;
    var tools = el('div', 'ad-bar'), input = el('input'); input.type = 'search'; input.placeholder = 'Search name or email…';
    var sel = el('select'); [['', 'Everyone'], ['student', 'Students'], ['teacher', 'Teachers'], ['admin', 'Admins']].forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; sel.appendChild(op); });
    tools.appendChild(input); tools.appendChild(sel);
    var list = el('div'), more = el('div', 'load-more-wrap'), mb = el('button', 'load-more-btn', 'Load more'); mb.type = 'button'; more.appendChild(mb);
    view.appendChild(tools); view.appendChild(list); view.appendChild(more);

    async function load(reset) {
      var my = ++run; if (reset) { offset = 0; list.textContent = 'Loading…'; }
      mb.disabled = true;
      var r = await db.rpc('admin_list_users', { p_search: q, p_role: role || null, p_limit: PAGE, p_offset: offset });
      if (my !== run) return;
      if (reset) list.textContent = '';
      if (r.error) { list.textContent = r.error.message; return; }
      r.data.forEach(function (u) { list.appendChild(userRow(u)); });
      offset += r.data.length; more.style.display = r.data.length < PAGE ? 'none' : 'flex';
      if (reset && !r.data.length) list.textContent = 'No users found.';
      mb.disabled = false;
    }
    var timer; input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { q = clean(input.value); load(true); }, 300); });
    sel.addEventListener('change', function () { role = sel.value; load(true); });
    mb.addEventListener('click', function () { load(false); });
    load(true);
  }

  function userRow(u) {
    var row = el('div', 'ad-row'), top = el('div', 'ad-top'), left = el('div');
    var nm = el('strong', '', u.full_name || '(no name)'); left.appendChild(nm);
    if (u.is_owner) left.appendChild(el('span', 'ad-role owner', 'owner'));
    else left.appendChild(el('span', 'ad-role ' + u.role, u.role));
    if (u.chat_banned) left.appendChild(el('span', 'ad-role banned', 'chat banned'));
    left.appendChild(el('br')); left.appendChild(el('small', '', u.email || ''));
    if (u.created_at) { left.appendChild(el('br')); left.appendChild(el('small', '', 'Joined ' + new Date(u.created_at).toLocaleDateString())); }
    top.appendChild(left); row.appendChild(top);
    if (u.id === myId) { row.appendChild(el('small', '', 'This is you.')); return row; }
    if (u.is_owner) { return row; }
    var acts = el('div', 'ad-actions'), sel = el('select');
    var opts = ['student', 'teacher']; if (isOwner) opts.push('admin');
    var canEdit = isOwner || u.role !== 'admin';
    opts.forEach(function (o) { var op = el('option', '', o); op.value = o; if (o === u.role) op.selected = true; sel.appendChild(op); });
    if (canEdit) {
      acts.appendChild(sel);
      acts.appendChild(btn('Save role', 'gold', async function () {
        if (sel.value === u.role) return;
        if (!confirm('Make ' + (u.full_name || u.email) + ' a ' + sel.value + '?')) return;
        if (await call(db.rpc('admin_set_user_role', { p_user: u.id, p_role: sel.value }))) { u.role = sel.value; show('users'); }
      }));
    } else acts.appendChild(el('small', '', 'Only the owner can change an admin.'));
    acts.appendChild(u.chat_banned
      ? btn('Unban from chat', '', async function () { if (await call(db.rpc('chat_admin_unban_user', { p_user: u.id }))) show('users'); })
      : btn('Ban from chat', 'danger', async function () {
          var why = prompt('Reason for banning ' + (u.full_name || u.email) + ' from chat?', 'Breaking group rules'); if (why === null) return;
          if (await call(db.rpc('chat_admin_ban_user', { p_user: u.id, p_reason: why }))) show('users'); }));
    row.appendChild(acts);
    return row;
  }

  // ---------- content ----------
  function content() {
    var CFG = {
      videos: { cols: 'id,title,course,author', meta: function (x) { return [x.course, x.author].filter(Boolean).join(' · '); }, href: function (x) { return 'video.html?id=' + encodeURIComponent(x.id); } },
      papers: { cols: 'id,title', meta: function () { return ''; }, href: null },
      lessons: { cols: 'id,title', meta: function () { return ''; }, href: function (x) { return 'lesson.html?id=' + encodeURIComponent(x.id); } }
    };
    var table = 'videos', q = '', offset = 0, PAGE = 20, run = 0;
    var tools = el('div', 'ad-bar'), sel = el('select');
    [['videos', '🎬 Videos'], ['papers', '📄 Past papers'], ['lessons', '📖 Lessons']].forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; sel.appendChild(op); });
    var input = el('input'); input.type = 'search'; input.placeholder = 'Search titles…';
    tools.appendChild(sel); tools.appendChild(input);
    var list = el('div'), more = el('div', 'load-more-wrap'), mb = el('button', 'load-more-btn', 'Load more'); mb.type = 'button'; more.appendChild(mb);
    view.appendChild(tools); view.appendChild(list); view.appendChild(more);

    async function load(reset) {
      var my = ++run; if (reset) { offset = 0; list.textContent = 'Loading…'; }
      mb.disabled = true;
      var c = CFG[table], qb = db.from(table).select(c.cols);
      if (q) qb = qb.ilike('title', '%' + q + '%');
      var r = await qb.order('id', { ascending: false }).range(offset, offset + PAGE - 1);
      if (my !== run) return;
      if (reset) list.textContent = '';
      if (r.error) { list.textContent = 'Could not load: ' + r.error.message; return; }
      r.data.forEach(function (x) {
        var row = el('div', 'ad-row'), top = el('div', 'ad-top'), left = el('div');
        left.appendChild(el('strong', '', x.title || 'Untitled'));
        var m = c.meta(x); if (m) { left.appendChild(el('br')); left.appendChild(el('small', '', m)); }
        top.appendChild(left); row.appendChild(top);
        var a = el('div', 'ad-actions');
        if (c.href) { var v = el('a', 'g-btn sm', 'View'); v.href = c.href(x); v.style.textDecoration = 'none'; a.appendChild(v); }
        a.appendChild(btn('🗑 Delete', 'danger', async function () {
          if (!confirm('Delete “' + (x.title || 'this item') + '” permanently?')) return;
          if (await call(db.rpc('admin_delete_content', { p_table: table, p_id: String(x.id) }))) row.remove(); }));
        row.appendChild(a); list.appendChild(row);
      });
      offset += r.data.length; more.style.display = r.data.length < PAGE ? 'none' : 'flex';
      if (reset && !r.data.length) list.textContent = 'Nothing here.';
      mb.disabled = false;
    }
    sel.addEventListener('change', function () { table = sel.value; load(true); });
    var timer; input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { q = clean(input.value); load(true); }, 300); });
    mb.addEventListener('click', function () { load(false); });
    load(true);
  }

  // ---------- activity ----------
  async function activity() {
    view.textContent = 'Loading…';
    var r = await db.rpc('admin_activity', { p_limit: 100 }); view.textContent = '';
    if (r.error) { view.textContent = r.error.message; return; }
    if (!r.data.length) { view.textContent = 'No admin activity yet. Role changes, deletions and chat bans will appear here.'; return; }
    var LABEL = { role_change: '🔑 Role change', delete_videos: '🗑 Video deleted', delete_papers: '🗑 Paper deleted', delete_lessons: '🗑 Lesson deleted', chat_ban: '⛔ Chat ban', chat_unban: '✅ Chat unban' };
    r.data.forEach(function (a) {
      var row = el('div', 'ad-row');
      row.appendChild(el('strong', '', LABEL[a.action] || a.action));
      row.appendChild(el('div', '', (a.target || '') + (a.details ? ' — ' + a.details : '')));
      row.appendChild(el('small', '', 'by ' + (a.admin_name || 'admin') + ' · ' + new Date(a.created_at).toLocaleString()));
      view.appendChild(row);
    });
  }

  show('overview');
})();
