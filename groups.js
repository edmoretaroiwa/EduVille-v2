/* EduVille Study Groups — list, join with code, create (teachers) */
(async function () {
  var db = window.db, root = document.getElementById('groups-root');
  if (!db || !root) return;
  var info = await getMyRole();
  if (!info.session) {
    root.innerHTML = '<div class="g-panel"><h3>Log in to use Study Groups</h3><p>Study groups are for registered EduVille students and teachers.</p>' +
      '<a class="g-btn gold" style="text-decoration:none;display:inline-block" href="login.html">🔐 Log in</a></div>';
    return;
  }
  var uid = info.session.user.id;
  var isTeacher = isTeacherRole(info.role), isAdmin = info.role === 'admin';

  function note(el, msg, ok) { el.textContent = msg; el.className = 'g-msg-note ' + (ok ? 'ok' : 'err'); }
  function friendly(e) { return (e && e.message) ? e.message.replace(/^.*?: /, '') : 'Something went wrong. Try again.'; }

  var html = '';
  if (isAdmin) html += '<a class="g-card" href="admin-moderation.html"><h3>🛡️ Moderation <span class="g-badge owner">Admin</span></h3><p>Review reports and manage groups.</p></a>';
  html += '<div class="g-panel"><h3>🔑 Join a group</h3>' +
    '<input type="text" id="j-code" placeholder="Enter invite code" autocomplete="off" autocapitalize="none" maxlength="16">' +
    '<label style="display:flex;gap:.5rem;align-items:flex-start;margin:.7rem 0;font-size:.88rem"><input type="checkbox" id="j-ok" style="margin-top:.2rem"> ' +
    '<span>I have read and accept the <a href="chat-rules.html" target="_blank" rel="noopener">group rules</a>.</span></label>' +
    '<button class="g-btn gold" id="j-btn">Join group</button><p class="g-msg-note" id="j-note"></p></div>';
  if (isTeacher) html += '<div class="g-panel"><h3>➕ Create a study group</h3>' +
    '<input type="text" id="c-name" placeholder="Group name (e.g. Form 4 Maths 2027)" maxlength="60">' +
    '<div style="height:.5rem"></div><input type="text" id="c-subject" placeholder="Subject (optional)" maxlength="40">' +
    '<div style="height:.5rem"></div><textarea id="c-desc" placeholder="What is this group for? (optional)" maxlength="300"></textarea>' +
    '<div style="height:.6rem"></div><button class="g-btn gold" id="c-btn">Create group</button><p class="g-msg-note" id="c-note"></p></div>';
  html += '<h3 class="section-heading" style="margin:1.2rem 0 .7rem">💬 My groups</h3><div id="g-list"><p class="text-muted">Loading…</p></div>';
  root.innerHTML = html;

  async function loadList() {
    var list = document.getElementById('g-list');
    try {
      var mem = await db.from('chat_members').select('group_id,role').eq('user_id', uid);
      if (mem.error) throw mem.error;
      var ids = (mem.data || []).map(function (m) { return m.group_id; });
      if (!ids.length) { list.innerHTML = '<p class="text-muted">You are not in any group yet. ' + (isTeacher ? 'Create one above or ' : '') + 'join with an invite code.</p>'; return; }
      var g = await db.from('chat_groups').select('id,name,description,subject,status,owner_id').in('id', ids).order('created_at', { ascending: false });
      if (g.error) throw g.error;
      list.innerHTML = (g.data || []).map(function (x) {
        return '<a class="g-card" href="group.html?id=' + encodeURIComponent(x.id) + '"><h3>' + escapeHtml(x.name) +
          (x.owner_id === uid ? '<span class="g-badge owner">Owner</span>' : '') +
          (x.status !== 'active' ? '<span class="g-badge ' + x.status + '">' + escapeHtml(x.status) + '</span>' : '') + '</h3>' +
          (x.subject ? '<p>📘 ' + escapeHtml(x.subject) + '</p>' : '') + (x.description ? '<p>' + escapeHtml(x.description) + '</p>' : '') + '</a>';
      }).join('');
    } catch (e) { console.error(e); list.innerHTML = '<p class="g-msg-note err">Could not load your groups.</p>'; }
  }

  document.getElementById('j-btn').addEventListener('click', async function () {
    var n = document.getElementById('j-note'), b = this;
    var code = document.getElementById('j-code').value.trim();
    if (!code) return note(n, 'Enter the invite code.');
    if (!document.getElementById('j-ok').checked) return note(n, 'Please accept the group rules first.');
    b.disabled = true;
    var r = await db.rpc('join_group_by_code', { p_code: code, p_accepted: true });
    b.disabled = false;
    if (r.error) return note(n, friendly(r.error));
    location.href = 'group.html?id=' + encodeURIComponent(r.data);
  });

  var cb = document.getElementById('c-btn');
  if (cb) cb.addEventListener('click', async function () {
    var n = document.getElementById('c-note');
    var name = document.getElementById('c-name').value.trim();
    if (name.length < 3) return note(n, 'Give the group a name (at least 3 letters).');
    cb.disabled = true;
    var r = await db.from('chat_groups').insert({
      name: name, owner_id: uid,
      subject: document.getElementById('c-subject').value.trim() || null,
      description: document.getElementById('c-desc').value.trim() || null
    }).select('id').single();
    cb.disabled = false;
    if (r.error) { console.error(r.error); return note(n, 'Could not create the group. ' + friendly(r.error)); }
    location.href = 'group.html?id=' + encodeURIComponent(r.data.id);
  });

  var pre = new URLSearchParams(location.search).get('code');
  if (pre) document.getElementById('j-code').value = pre;
  loadList();
})();
