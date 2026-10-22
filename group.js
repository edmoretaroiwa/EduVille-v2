/* EduVille Study Groups — chat screen */
(async function () {
  var db = window.db, root = document.getElementById('group-root');
  if (!db || !root) return;
  var gid = new URLSearchParams(location.search).get('id');
  var info = await getMyRole();
  if (!info.session) { root.innerHTML = '<div class="g-panel"><h3>Please log in</h3><a class="g-btn gold" style="text-decoration:none;display:inline-block" href="login.html">🔐 Log in</a></div>'; return; }
  if (!gid) { location.href = 'groups.html'; return; }
  var uid = info.session.user.id, isAdmin = info.role === 'admin';

  var g = await db.from('chat_groups').select('id,name,description,subject,status,owner_id,invite_code').eq('id', gid).maybeSingle();
  if (g.error || !g.data) { root.innerHTML = '<div class="g-panel"><h3>Group not found</h3><p>You may not be a member of this group.</p><a href="groups.html">← Back to groups</a></div>'; return; }
  var group = g.data, isOwner = group.owner_id === uid;
  var me = await db.from('chat_members').select('muted,role').eq('group_id', gid).eq('user_id', uid).maybeSingle();
  var muted = !!(me.data && me.data.muted);
  var active = group.status === 'active';

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function friendly(e) { return (e && e.message) ? e.message.replace(/^.*?: /, '') : 'Something went wrong.'; }

  // ---------- layout ----------
  root.innerHTML = '';
  var wrap = el('div', 'chat-wrap'); root.appendChild(wrap);
  var head = el('div', 'chat-head'); wrap.appendChild(head);
  var title = el('div'); title.appendChild(el('h2', '', group.name));
  if (group.subject || group.description) title.appendChild(el('small', 'text-muted', [group.subject, group.description].filter(Boolean).join(' · ')));
  head.appendChild(title);
  var tools = el('div', 'g-row'); head.appendChild(tools);
  function tool(label, fn, cls) { var b = el('button', 'g-btn sm ' + (cls || ''), label); b.type = 'button'; b.addEventListener('click', fn); tools.appendChild(b); return b; }
  tool('← Groups', function () { location.href = 'groups.html'; });
  if (isOwner || isAdmin) { tool('👥 Members', toggleMembers); tool('🔗 Invite', invite); }
  tool('⚑ Report group', function () { reportDialog(null, 'this group'); });
  if (!isOwner) tool('Leave', leave, 'danger');

  if (!active) wrap.appendChild(el('div', 'g-banner ' + group.status,
    group.status === 'banned' ? '🚫 This group has been banned by EduVille.' : '⏸ This group is suspended while EduVille reviews reports. Messages are hidden.'));
  var membersBox = el('div', 'g-panel'); membersBox.style.display = 'none'; wrap.appendChild(membersBox);
  var log = el('div', 'chat-log'); wrap.appendChild(log);
  var compose = el('div', 'chat-compose'); wrap.appendChild(compose);
  var ta = el('textarea'); ta.maxLength = 1000; ta.rows = 1;
  ta.placeholder = !active ? 'Group is not active' : muted ? 'You have been muted by the group owner' : 'Write a message…';
  var send = el('button', 'g-btn gold', 'Send');
  ta.disabled = send.disabled = !active || muted;
  compose.appendChild(ta); compose.appendChild(send);
  var err = el('p', 'g-msg-note err'); wrap.appendChild(err);

  // ---------- messages ----------
  var seen = {}, lastAt = null;
  function nearBottom() { return log.scrollHeight - log.scrollTop - log.clientHeight < 120; }
  function render(m) {
    if (seen[m.id]) { var old = seen[m.id]; if (m.is_deleted) { old.classList.add('gone'); old.querySelector('.txt').textContent = '[message removed]'; var a = old.querySelector('.acts'); if (a) a.remove(); } return; }
    var stick = nearBottom(), mine = m.user_id === uid;
    var b = el('div', 'bubble' + (mine ? ' me' : '') + (m.is_deleted ? ' gone' : ''));
    if (!mine) b.appendChild(el('div', 'who', m.sender_name || 'Member'));
    b.appendChild(el('div', 'txt', m.body));
    var meta = el('div', 'meta'); meta.appendChild(el('span', '', new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
    if (!m.is_deleted) {
      var acts = el('span', 'acts');
      if (!mine) { var r = el('button', '', '⚑'); r.title = 'Report this message'; r.addEventListener('click', function () { reportDialog(m.id, 'this message'); }); acts.appendChild(r); }
      if (mine || isOwner || isAdmin) { var d = el('button', '', '🗑'); d.title = 'Delete'; d.addEventListener('click', async function () {
        if (!confirm('Delete this message?')) return;
        var x = await db.rpc('chat_delete_message', { p_message: m.id }); if (x.error) err.textContent = friendly(x.error); else render({ id: m.id, is_deleted: true }); }); acts.appendChild(d); }
      meta.appendChild(acts);
    }
    b.appendChild(meta); log.appendChild(b); seen[m.id] = b;
    if (!lastAt || m.created_at > lastAt) lastAt = m.created_at;
    if (stick || mine) log.scrollTop = log.scrollHeight;
  }
  async function loadInitial() {
    var r = await db.from('chat_messages').select('id,user_id,sender_name,body,is_deleted,created_at').eq('group_id', gid).order('created_at', { ascending: false }).limit(100);
    if (r.error) { err.textContent = 'Could not load messages.'; return; }
    (r.data || []).reverse().forEach(render);
    if (!(r.data || []).length && active) log.appendChild(el('p', 'text-muted', 'No messages yet. Say hello 👋'));
    log.scrollTop = log.scrollHeight;
  }
  async function poll() {
    if (!active || !lastAt) return;
    var r = await db.from('chat_messages').select('id,user_id,sender_name,body,is_deleted,created_at').eq('group_id', gid).gt('created_at', lastAt).order('created_at').limit(50);
    if (!r.error) (r.data || []).forEach(render);
  }
  async function sendMsg() {
    var text = ta.value.trim(); if (!text) return;
    err.textContent = ''; send.disabled = true;
    var r = await db.from('chat_messages').insert({ group_id: gid, user_id: uid, body: text });
    send.disabled = false;
    if (r.error) { err.textContent = friendly(r.error); return; }
    ta.value = ''; ta.focus(); setTimeout(poll, 300);
  }
  send.addEventListener('click', sendMsg);
  ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });

  if (active) {
    await loadInitial();
    try {
      db.channel('grp-' + gid).on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: 'group_id=eq.' + gid },
        function (p) { if (p.new && p.new.id) render(p.new); }).subscribe();
    } catch (e) { console.warn('realtime off, polling', e); }
    setInterval(poll, 8000); // safety net if live updates are unavailable
  }

  // ---------- actions ----------
  async function leave() {
    if (!confirm('Leave this group?')) return;
    var r = await db.from('chat_members').delete().eq('group_id', gid).eq('user_id', uid);
    if (r.error) err.textContent = friendly(r.error); else location.href = 'groups.html';
  }
  function invite() {
    var url = location.origin + '/groups.html?code=' + group.invite_code;
    var text = 'Join my EduVille study group "' + group.name + '". Invite code: ' + group.invite_code + ' — ' + url;
    var d = el('div', 'g-modal-bg'), m = el('div', 'g-modal'); d.appendChild(m);
    m.appendChild(el('h3', '', 'Invite students'));
    m.appendChild(el('p', '', 'Invite code: ' + group.invite_code));
    var row = el('div', 'g-row');
    var wa = el('a', 'g-btn gold', '📲 Share on WhatsApp'); wa.href = 'https://wa.me/?text=' + encodeURIComponent(text); wa.target = '_blank'; wa.rel = 'noopener'; wa.style.textDecoration = 'none';
    var cp = el('button', 'g-btn', '📋 Copy'); cp.addEventListener('click', function () { navigator.clipboard && navigator.clipboard.writeText(text); cp.textContent = 'Copied ✓'; });
    var cl = el('button', 'g-btn', 'Close'); cl.addEventListener('click', function () { d.remove(); });
    row.appendChild(wa); row.appendChild(cp); row.appendChild(cl); m.appendChild(row); document.body.appendChild(d);
  }
  async function toggleMembers() {
    if (membersBox.style.display !== 'none') { membersBox.style.display = 'none'; return; }
    membersBox.style.display = 'block'; membersBox.textContent = 'Loading…';
    var r = await db.rpc('chat_group_members', { p_group: gid });
    membersBox.textContent = '';
    if (r.error) { membersBox.textContent = friendly(r.error); return; }
    membersBox.appendChild(el('h3', '', 'Members (' + r.data.length + ')'));
    r.data.forEach(function (u) {
      var row = el('div', 'g-row'); row.style.justifyContent = 'space-between'; row.style.marginBottom = '.4rem';
      row.appendChild(el('span', '', u.full_name + (u.role === 'owner' ? ' 👑' : '') + (u.muted ? ' 🔇' : '')));
      if (u.role !== 'owner') {
        var a = el('span', 'g-row');
        var mu = el('button', 'g-btn sm', u.muted ? 'Unmute' : 'Mute'); mu.addEventListener('click', async function () {
          var x = await db.rpc('chat_mute_member', { p_group: gid, p_user: u.user_id, p_muted: !u.muted }); if (x.error) err.textContent = friendly(x.error); else { membersBox.style.display = 'none'; toggleMembers(); } });
        var rm = el('button', 'g-btn sm danger', 'Remove'); rm.addEventListener('click', async function () {
          if (!confirm('Remove ' + u.full_name + ' from the group?')) return;
          var x = await db.rpc('chat_remove_member', { p_group: gid, p_user: u.user_id }); if (x.error) err.textContent = friendly(x.error); else { membersBox.style.display = 'none'; toggleMembers(); } });
        a.appendChild(mu); a.appendChild(rm); row.appendChild(a);
      }
      membersBox.appendChild(row);
    });
  }
  function reportDialog(messageId, what) {
    var d = el('div', 'g-modal-bg'), m = el('div', 'g-modal'); d.appendChild(m);
    m.appendChild(el('h3', '', 'Report ' + what));
    m.appendChild(el('label', '', 'What is the problem?'));
    var sel = el('select');
    [['bullying', 'Bullying or harassment'], ['inappropriate', 'Inappropriate or unsafe content'], ['spam', 'Spam'], ['scam', 'Scam or dangerous link'], ['other', 'Something else']]
      .forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; sel.appendChild(op); });
    m.appendChild(sel);
    m.appendChild(el('label', '', 'Details (optional)'));
    var tx = el('textarea'); tx.rows = 3; tx.maxLength = 300; m.appendChild(tx);
    var note = el('p', 'g-msg-note'); m.appendChild(note);
    var row = el('div', 'g-row'); row.style.marginTop = '.8rem';
    var ok = el('button', 'g-btn gold', 'Send report'), no = el('button', 'g-btn', 'Cancel');
    no.addEventListener('click', function () { d.remove(); });
    ok.addEventListener('click', async function () {
      ok.disabled = true;
      var r = await db.from('chat_reports').insert({ group_id: gid, message_id: messageId, reporter_id: uid, reason: sel.value, details: tx.value.trim() || null });
      if (r.error) {
        ok.disabled = false;
        note.className = 'g-msg-note err';
        note.textContent = r.error.code === '23505' ? 'You already reported this.' : 'Could not send the report. Try again.';
      } else { note.className = 'g-msg-note ok'; note.textContent = 'Thank you. Our team will review this.'; setTimeout(function () { d.remove(); }, 1400); }
    });
    row.appendChild(ok); row.appendChild(no); m.appendChild(row); document.body.appendChild(d);
  }
})();
