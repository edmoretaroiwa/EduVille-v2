/* EduVille — admin moderation dashboard */
(async function () {
  var db = window.db, root = document.getElementById('mod-root');
  if (!db || !root) return;
  var info = await getMyRole();
  if (!info.session || info.role !== 'admin') { root.innerHTML = '<div class="g-panel"><h3>Admins only</h3><p>This page is only for EduVille administrators.</p></div>'; return; }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(label, cls, fn) { var b = el('button', 'g-btn sm ' + (cls || ''), label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  var REASON = { bullying: 'Bullying or harassment', inappropriate: 'Inappropriate content', spam: 'Spam', scam: 'Scam or dangerous link', other: 'Other' };
  async function call(p) { var r = await p; if (r.error) { alert(r.error.message); return false; } return true; }

  async function load() {
    root.textContent = 'Loading…';
    var o = await db.rpc('chat_admin_overview');
    if (o.error) { root.textContent = 'Could not load: ' + o.error.message + ' (did you run the SQL script?)'; return; }
    root.textContent = '';
    var back = el('a', 'g-btn sm', '← Admin dashboard'); back.href = 'admin.html'; back.style.textDecoration = 'none'; back.style.display = 'inline-block'; back.style.marginBottom = '.8rem'; root.appendChild(back);
    var hot = o.data.filter(function (g) { return g.open_reporters > 0; });
    root.appendChild(el('h3', 'section-heading', '⚠️ Groups with open reports (' + hot.length + ')'));
    if (!hot.length) root.appendChild(el('p', 'text-muted', 'Nothing to review. 🎉'));
    hot.forEach(function (g) { root.appendChild(groupRow(g, true)); });
    var rest = o.data.filter(function (g) { return g.open_reporters === 0; });
    var h = el('h3', 'section-heading', 'All other groups (' + rest.length + ')'); h.style.marginTop = '1.5rem'; root.appendChild(h);
    rest.forEach(function (g) { root.appendChild(groupRow(g, false)); });
  }

  function groupRow(g, hot) {
    var row = el('div', 'mod-row' + (hot ? ' hot' : ''));
    row.appendChild(el('strong', '', g.name));
    row.appendChild(el('span', 'g-badge ' + g.status, g.status));
    row.appendChild(el('br'));
    row.appendChild(el('small', '', 'Owner: ' + g.owner_name + ' · ' + g.members + ' members · ' + g.open_reporters + ' different reporters · ' + g.open_reports + ' open reports'));
    var acts = el('div', 'g-row'); acts.style.marginTop = '.6rem';
    if (g.open_reports > 0) acts.appendChild(btn('View reports', 'gold', function () { showReports(g, row); }));
    if (g.status !== 'active') acts.appendChild(btn('✅ Restore group', '', async function () { if (confirm('Restore this group and dismiss open reports?') && await call(db.rpc('chat_admin_set_group_status', { p_group: g.id, p_status: 'active' }))) load(); }));
    if (g.status === 'active') acts.appendChild(btn('⏸ Suspend', '', async function () { if (await call(db.rpc('chat_admin_set_group_status', { p_group: g.id, p_status: 'suspended' }))) load(); }));
    if (g.status !== 'banned') acts.appendChild(btn('🚫 Ban group', 'danger', async function () { if (confirm('Ban "' + g.name + '"? Members will no longer see it.') && await call(db.rpc('chat_admin_set_group_status', { p_group: g.id, p_status: 'banned' }))) load(); }));
    row.appendChild(acts);
    return row;
  }

  async function showReports(g, row) {
    var old = row.querySelector('.rep-list'); if (old) { old.remove(); return; }
    var box = el('div', 'rep-list'); box.style.marginTop = '.8rem'; box.textContent = 'Loading…'; row.appendChild(box);
    var r = await db.from('chat_reports').select('id,message_id,reported_user_id,reported_name,reporter_id,reason,details,snapshot,created_at').eq('group_id', g.id).eq('status', 'open').order('created_at', { ascending: false });
    box.textContent = '';
    if (r.error) { box.textContent = r.error.message; return; }
    r.data.forEach(function (x) {
      var c = el('div', 'mod-row');
      c.appendChild(el('strong', '', REASON[x.reason] || x.reason));
      c.appendChild(el('small', '', '  ·  ' + new Date(x.created_at).toLocaleString() + ' · reporter ' + x.reporter_id.slice(0, 8)));
      if (x.snapshot) { c.appendChild(el('div', 'mod-quote', (x.reported_name ? x.reported_name + ': ' : '') + x.snapshot)); }
      else c.appendChild(el('div', 'text-muted', 'Report about the whole group.'));
      if (x.details) c.appendChild(el('div', '', 'Note: ' + x.details));
      var a = el('div', 'g-row'); a.style.marginTop = '.5rem';
      a.appendChild(btn('Dismiss', '', async function () { if (await call(db.rpc('chat_admin_resolve_report', { p_report: x.id, p_status: 'dismissed' }))) load(); }));
      if (x.message_id) a.appendChild(btn('🗑 Delete message', '', async function () { if (await call(db.rpc('chat_delete_message', { p_message: x.message_id })) && await call(db.rpc('chat_admin_resolve_report', { p_report: x.id, p_status: 'actioned' }))) load(); }));
      if (x.reported_user_id) a.appendChild(btn('⛔ Ban user from chat', 'danger', async function () {
        var why = prompt('Reason for banning ' + (x.reported_name || 'this user') + '?', x.reason); if (why === null) return;
        if (await call(db.rpc('chat_admin_ban_user', { p_user: x.reported_user_id, p_reason: why })) && await call(db.rpc('chat_admin_resolve_report', { p_report: x.id, p_status: 'actioned' }))) load(); }));
      c.appendChild(a); box.appendChild(c);
    });
  }
  load();
})();
