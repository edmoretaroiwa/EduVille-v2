/* EduVille PDF Library — reads a small index file from the R2 bucket and searches it in the browser. */
(function () {
  var BASE = 'https://files.eduvillelearning.africa/';
  var INDEX = BASE + 'library-index.json';
  var KEY = 'edu-lib-index-v1';
  var items = null, loading = null;

  // matched against the path with symbols turned into spaces, so "scheme" is not mistaken for "chem"
  var SUBJECTS = [
    [/ chem/, 'Chemistry'], [/ phys/, 'Physics'], [/ (pure )?math/, 'Mathematics'],
    [/ biolog| bio /, 'Biology'], [/ computer| ict | comp sci/, 'Computer Studies']
  ];
  // topics students search for → words that appear in file names about that topic
  var SYN = {
    organic: ['alcohol', 'alkane', 'alkene', 'carboxylic', 'carbonyl', 'aldehyde', 'ketone', 'ester', 'amine', 'amino', 'halogenoalkane', 'polymer', 'chromatography', 'benzene', 'arene', 'protein'],
    inorganic: ['group 2', 'group 7', 'halogen', 'period 3', 'transition', 'periodicity'],
    physical: ['equilibrium', 'kinetics', 'rate', 'enthalpy', 'thermodynamics', 'electrochemistry', 'redox'],
    mechanics: ['motion', 'force', 'momentum', 'energy', 'projectile', 'kinematics'],
    electricity: ['circuit', 'current', 'resistance', 'capacitor', 'electric', 'magnetic'],
    waves: ['wave', 'optics', 'light', 'diffraction', 'interference', 'sound'],
    calculus: ['differentiation', 'integration', 'derivative', 'integral'],
    algebra: ['equation', 'polynomial', 'function', 'quadratic', 'logarithm', 'sequence', 'series'],
    genetics: ['dna', 'inheritance', 'gene', 'chromosome'],
    maths: ['mathematics', 'math'], math: ['mathematics', 'maths'], mathematics: ['maths', 'math'],
    chem: ['chemistry'], phys: ['physics'], bio: ['biology'], alevel: ['a level'],
    ms: ['mark scheme', 'markscheme'], markscheme: ['ms', 'mark scheme']
  };

  function titleCase(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function parse(e) {
    var path = e.Path || e.path || '', size = e.Size != null ? e.Size : e.size || 0;
    var name = path.split('/').pop().replace(/\.pdf$/i, '');
    var title = name.replace(/([A-Za-z])-/g, '$1 ').replace(/[_]+/g, ' ').replace(/\s*\(\d+\)\s*$/, '').replace(/\s+/g, ' ').trim();
    var hay = (path + ' ' + title).toLowerCase(), subject = '';
    var norm = ' ' + path.replace(/[^A-Za-z0-9]+/g, ' ').toLowerCase() + ' ';
    for (var i = 0; i < SUBJECTS.length; i++) if (SUBJECTS[i][0].test(norm)) { subject = SUBJECTS[i][1]; break; }
    var level = /a[\s_-]*level|\balevel|\bas[\s_-]level/i.test(path) ? 'A-Level' : /o[\s_-]*level|igcse|\bgcse/i.test(path) ? 'O-Level' : '';
    var ym = name.match(/(?:^|[^\d])((?:19|20)\d\d)(?!\d)/), year = ym ? ym[1] : '';
    var kind = /(^|[^a-z])(ms|mark[\s_-]*scheme|markscheme)([^a-z]|$)/i.test(name) ? 'Mark scheme'
      : (year || /(^|[^a-z])(qp|paper|p[1-6])([^a-z0-9]|$)/i.test(name)) ? 'Past paper' : 'Notes / resource';
    var pm = name.match(/(?:^|[^a-z])(?:paper|p)[\s_-]*([1-6])(?![0-9])/i);
    return { url: BASE + path.split('/').map(encodeURIComponent).join('/'), title: titleCase(title), subject: subject, level: level,
             year: year, kind: kind, paper: pm ? 'Paper ' + pm[1] : '', size: size, hay: hay.replace(/[_-]+/g, ' ') };
  }
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  function load() {
    if (items) return Promise.resolve(items);
    if (loading) return loading;
    loading = fetch(INDEX, { cache: 'default' }).then(function (r) { if (!r.ok) throw new Error('index ' + r.status); return r.json(); })
      .then(function (raw) { try { localStorage.setItem(KEY, JSON.stringify(raw)); } catch (e) {} return raw; })
      .catch(function (err) {
        try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c) return c; } catch (e) {}
        throw err;
      }).then(function (raw) { items = raw.filter(function (e) { return /\.pdf$/i.test(e.Path || e.path || ''); }).map(parse); return items; });
    loading.catch(function () { loading = null; });
    return loading;
  }

  function search(q, limit, opts) {
    opts = opts || {};
    return load().then(function (all) {
      var toks = (q || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length > 1; });
      var out = [];
      all.forEach(function (it) {
        if (opts.subject && it.subject !== opts.subject) return;
        if (opts.level && it.level !== opts.level) return;
        if (opts.year && it.year !== opts.year) return;
        if (opts.kind && it.kind !== opts.kind) return;
        var score = 0;
        if (toks.length) {
          for (var i = 0; i < toks.length; i++) {
            var t = toks[i], s = 0;
            if (it.hay.indexOf(t) !== -1) s = 3;
            else if (SYN[t]) for (var j = 0; j < SYN[t].length; j++) if (it.hay.indexOf(SYN[t][j]) !== -1) { s = 1; break; }
            if (!s) return; // every word must match (directly or through a related topic)
            score += s;
          }
        }
        score += it.year ? (parseInt(it.year, 10) - 1990) / 100 : 0;
        out.push({ it: it, score: score });
      });
      out.sort(function (a, b) { return b.score - a.score || a.it.title.localeCompare(b.it.title); });
      return out.slice(0, limit || 30).map(function (x) { return x.it; }).concat(out.length > (limit || 30) ? [{ more: out.length - (limit || 30) }] : []);
    });
  }
  window.EduLibrary = { load: load, search: search, fmtSize: fmtSize };
})();
