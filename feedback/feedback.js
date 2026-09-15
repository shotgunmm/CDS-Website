/**
 * Wireframe Feedback Widget
 *
 * Drop-in client review tool for Propagate wireframe decks.
 * Pairs with feedback.css + api.php (SQLite) in the same folder.
 *
 * How it works:
 *  - "Add feedback" toggles comment mode. Hovering highlights the section
 *    block under the cursor; clicking drops a pin anchored to that block.
 *  - Pins are stored as (page id, block class, block index, text snippet,
 *    relative x/y) so they survive responsive reflow and wireframe rebuilds.
 *  - A drawer lists comments for the current page or the whole deck, with
 *    open/resolved filtering and a Markdown export.
 *
 * Expects the host document to expose window.showPage(pageId) and use
 * .page containers with ids like "page-home" (the wireframe deck pattern).
 */
(function () {
  'use strict';

  /* ======================= ADAPT PER PROJECT ============================ */

  // Used in the Markdown export title and filename
  var PROJECT_NAME = 'CDS Website';

  // Absolute, so the widget resolves the same way from every page and
  // survives the staging build being served out of /HTML/.
  var API_BASE = '/HTML/feedback';

  // Multi-file mode: the four pages are served flat out of /HTML/.
  // /HTML/index.html -> 'index', /HTML/about-us.html -> 'about-us', etc.
  var PAGE_ROOT = '/HTML/';

  var PAGE_TITLES = {
    'index':    'Home',
    'about-us': 'About Us',
    'services': 'Services',
    'contact':  'Contact'
  };

  // Section blocks a pin can anchor to, from a class-frequency scan of all
  // four built pages (2026-09-15). closest() walks up the tree, so both the
  // coarse page sections and the repeating items inside them are listed —
  // a click on a service card anchors to the card, a click on the space
  // around it anchors to the section.
  var BLOCK_KEYS = [
    // chrome
    'site_header', 'nav_site', 'hero', 'hording', 'footer', 'meta-footer',
    // page sections
    'cds-meta', 'challenges', 'what-we-do', 'services', 'track-records',
    'why-cds', 'our-mission', 'saying', 'approach', 'approaches', 'our-team',
    'our-help', 'contact', 'sec',
    // repeating blocks inside sections
    'box', 'service-wrap', 'member', 'approach-wrap', 'our-help__content',
    'select-help-option', 'lifecycle-wrap', 'contact__form', 'cta-row'
  ];

  // Real headings first; the build uses Bootstrap's .h2/.h3 utilities on
  // some elements, and service/member names are the only caption available
  // inside those repeating blocks.
  var HEADING_SELECTORS = [
    'h1', 'h2', 'h3', 'h4', '.h2', '.h3',
    '.service-name', '.name', '.heading', '.head'
  ];

  var BLOCK_LABELS = {
    'site_header': 'Header', 'nav_site': 'Navigation', 'hero': 'Hero',
    'hording': 'Banner', 'footer': 'Footer', 'meta-footer': 'Footer meta',
    'cds-meta': 'Stats bar', 'challenges': 'The Challenge',
    'what-we-do': 'What We Do', 'services': 'Services list',
    'track-records': 'Track Record', 'why-cds': 'Why CDS',
    'our-mission': 'Our Mission', 'saying': 'Pull quote',
    'approach': 'Our Approach', 'approaches': 'Approach section',
    'our-team': 'Our Team', 'our-help': 'How Can We Help',
    'contact': 'Contact', 'sec': 'Section',
    'box': 'Card', 'service-wrap': 'Service', 'member': 'Team member',
    'approach-wrap': 'Approach item', 'our-help__content': 'Help panel',
    'select-help-option': 'Help selector', 'lifecycle-wrap': 'Lifecycle',
    'contact__form': 'Contact form', 'cta-row': 'Call to action'
  };

  // Default mapping is correct here: /HTML/ serves index.html, and the other
  // three are flat siblings.
  function pageIdToPath(pageId) {
    if (pageId === 'home' || pageId === 'index') return PAGE_ROOT;
    return PAGE_ROOT + pageId + '.html';
  }

  /* ===================== END ADAPT PER PROJECT ========================== */

  var API = API_BASE + '/api.php';

  var BLOCK_SELECTOR = '.' + BLOCK_KEYS.join(',.');

  var PALETTE = ['#1B5FAA', '#7A1F3D', '#0E7C61', '#B25A00', '#5B4BAA', '#A4264B', '#2A7DA0', '#6B7A1F'];

  var state = {
    comments: [],        // flat list from the API
    mode: false,         // comment mode on/off
    draft: null,         // pending pin before save
    hl: null,            // currently highlighted block
    openThread: null,    // root comment id with open popover
    filter: 'open',      // drawer filter: open | resolved | all
    tab: 'page'          // drawer tab: page | all
  };

  // ---------------------------------------------------------------- utils --

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function collapse(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function timeAgo(iso) {
    // API timestamps are UTC "YYYY-MM-DD HH:MM:SS"
    var d = new Date(String(iso).replace(' ', 'T') + 'Z');
    if (isNaN(d)) return '';
    var s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 7 * 86400) return Math.floor(s / 86400) + 'd ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function toast(msg, isError) {
    var t = document.createElement('div');
    t.className = 'fb-toast' + (isError ? ' fb-toast-err' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('fb-show'); });
    setTimeout(function () {
      t.classList.remove('fb-show');
      setTimeout(function () { t.remove(); }, 300);
    }, 2600);
  }

  function api(action, payload) {
    var opts = payload
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      : undefined;
    return fetch(API + '?action=' + action, opts).then(function (r) {
      return r.json().then(function (j) {
        if (!j.ok) throw new Error(j.error || 'Request failed');
        return j;
      });
    });
  }

  // ------------------------------------------------------------- identity --

  function getName() { try { return localStorage.getItem('fb_name') || ''; } catch (e) { return ''; } }
  function setName(n) { try { localStorage.setItem('fb_name', n); } catch (e) { /* private mode */ } }

  function colorFor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  function initials(name) {
    var parts = collapse(name).split(' ');
    var s = (parts[0] || '').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '');
    return s.toUpperCase();
  }

  // Ask once for a name, then run cb. Reuses the stored name silently after that.
  function ensureName(cb) {
    var existing = getName();
    if (existing) { cb(existing); return; }
    var wrap = document.createElement('div');
    wrap.className = 'fb-modal-backdrop';
    wrap.innerHTML =
      '<div class="fb-modal" role="dialog" aria-label="Your name">' +
      '  <div class="fb-modal-h">Quick intro</div>' +
      '  <div class="fb-modal-p">Add your name so the team knows who each comment is from. You only do this once.</div>' +
      '  <input class="fb-input" id="fb-name-input" type="text" maxlength="80" placeholder="Your name" autocomplete="name">' +
      '  <div class="fb-modal-actions">' +
      '    <button class="fb-btn fb-btn-ghost" data-fb="cancel">Cancel</button>' +
      '    <button class="fb-btn fb-btn-pri" data-fb="save">Continue</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(wrap);
    var input = wrap.querySelector('#fb-name-input');
    input.focus();
    function done(save) {
      var v = collapse(input.value);
      wrap.remove();
      if (save && v) { setName(v); cb(v); }
    }
    wrap.querySelector('[data-fb="save"]').addEventListener('click', function () { done(true); });
    wrap.querySelector('[data-fb="cancel"]').addEventListener('click', function () { done(false); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') done(true); });
  }

  // ------------------------------------------------------------ anchoring --

  function blockKeyOf(el) {
    for (var i = 0; i < BLOCK_KEYS.length; i++) {
      if (el.classList.contains(BLOCK_KEYS[i])) return BLOCK_KEYS[i];
    }
    return null;
  }

  function snippetOf(block) {
    var h = null;
    for (var i = 0; i < HEADING_SELECTORS.length && !h; i++) {
      h = block.querySelector(HEADING_SELECTORS[i]);
    }
    var txt = collapse(h ? h.textContent : block.textContent);
    return txt.slice(0, 140);
  }

  // Mode detection: SPA decks have many .page swap-divs and/or a global
  // showPage(). A multi-file deliverable has one HTML file per page.
  var IS_SPA = document.querySelectorAll('.page').length > 1 ||
               typeof window.showPage === 'function';

  function pageIdFromPath() {
    var p = location.pathname;
    if (PAGE_ROOT && p.indexOf(PAGE_ROOT) === 0) p = p.slice(PAGE_ROOT.length);
    p = p.replace(/\.html?$/i, '').replace(/\/$/, '').replace(/^\/+/, '');
    if (!p) return 'home';
    return p.replace(/\//g, '-');
  }

  function titleCase(s) {
    return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function currentPageEl() {
    if (IS_SPA) return document.querySelector('.page.show');
    return document.body;
  }

  function currentPageId() {
    if (IS_SPA) {
      var p = document.querySelector('.page.show');
      return p ? p.id.replace(/^page-/, '') : null;
    }
    return pageIdFromPath();
  }

  function pageTitle(pageId) {
    if (PAGE_TITLES[pageId]) return PAGE_TITLES[pageId];
    if (IS_SPA) {
      var p = document.getElementById('page-' + pageId);
      var b = p && p.querySelector('.page-meta b');
      if (b) return collapse(b.textContent);
      return pageId;
    }
    if (pageId === currentPageId() && document.title) {
      return collapse(document.title.split(/[—|]/)[0]) || pageId;
    }
    return titleCase(pageId);
  }

  // Find the DOM block a stored comment anchors to. Index first, verified by
  // snippet; falls back to a snippet search, then the raw index, then null
  // (renders as a page-level pin).
  function resolveBlock(pageEl, c) {
    if (!c.block_key) return null;
    var sel;
    try { sel = '.' + CSS.escape(c.block_key); } catch (e) { return null; }
    var cands = pageEl.querySelectorAll(sel);
    if (!cands.length) return null;
    var byIndex = (c.block_index != null && c.block_index < cands.length) ? cands[c.block_index] : null;
    var snip = collapse(c.snippet || '').slice(0, 60);
    if (byIndex && (!snip || collapse(byIndex.textContent).indexOf(snip) !== -1)) return byIndex;
    if (snip) {
      for (var i = 0; i < cands.length; i++) {
        if (collapse(cands[i].textContent).indexOf(snip) !== -1) return cands[i];
      }
    }
    return byIndex || cands[0];
  }

  // ------------------------------------------------------------------ data --

  function roots(pageId) {
    return state.comments.filter(function (c) {
      return !c.parent_id && (!pageId || c.page_id === pageId);
    });
  }

  function repliesOf(id) {
    return state.comments.filter(function (c) { return c.parent_id === id; });
  }

  function byId(id) {
    for (var i = 0; i < state.comments.length; i++) {
      if (state.comments[i].id === id) return state.comments[i];
    }
    return null;
  }

  function openCount() {
    return roots().filter(function (c) { return c.status === 'open'; }).length;
  }

  // ------------------------------------------------------------------ pins --

  function pinLayer(pageEl) {
    var layer = pageEl.querySelector(':scope > .fb-pins');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'fb-pins';
      pageEl.appendChild(layer);
    }
    return layer;
  }

  function renderPins(pageId) {
    pageId = pageId || currentPageId();
    if (!pageId) return;
    var pageEl;
    if (IS_SPA) {
      pageEl = document.getElementById('page-' + pageId);
      if (!pageEl || !pageEl.classList.contains('show')) return;
    } else {
      if (pageId !== currentPageId()) return;
      pageEl = document.body;
    }

    var layer = pinLayer(pageEl);
    layer.innerHTML = '';
    var pageRect = pageEl.getBoundingClientRect();
    var list = roots(pageId);
    var fallbackCount = 0;

    list.forEach(function (c, idx) {
      var block = resolveBlock(pageEl, c);
      var left, top, approx = false;
      if (block) {
        var r = block.getBoundingClientRect();
        left = r.left - pageRect.left + (c.rel_x != null ? c.rel_x : 0.5) * r.width;
        top = r.top - pageRect.top + (c.rel_y != null ? c.rel_y : 0.5) * r.height;
      } else {
        approx = true;
        left = 28 + (fallbackCount++ * 40);
        top = 14;
      }
      left = Math.max(14, Math.min(left, pageRect.width - 14));
      top = Math.max(14, top);

      var pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'fb-pin' + (c.status === 'resolved' ? ' fb-pin-done' : '') + (approx ? ' fb-pin-approx' : '');
      pin.style.left = left + 'px';
      pin.style.top = top + 'px';
      pin.style.background = c.color || '#1B5FAA';
      pin.textContent = String(idx + 1);
      pin.title = c.author + (approx ? ' (approximate spot, the layout changed)' : '');
      pin.setAttribute('data-fb-id', String(c.id));
      pin.addEventListener('click', function (e) {
        e.stopPropagation();
        openThread(c.id, pin);
      });
      layer.appendChild(pin);
    });
  }

  // -------------------------------------------------------- comment mode --

  function setMode(on) {
    state.mode = on;
    document.body.classList.toggle('fb-mode-on', on);
    var btn = document.getElementById('fb-add-btn');
    if (btn) {
      btn.innerHTML = on
        ? '<span class="fb-add-x">&times;</span> Cancel'
        : '<span class="fb-add-plus">+</span> Add feedback';
      btn.classList.toggle('fb-active', on);
    }
    var hint = document.getElementById('fb-mode-hint');
    if (hint) hint.classList.toggle('fb-show', on);
    clearHighlight();
  }

  function clearHighlight() {
    if (state.hl) { state.hl.classList.remove('fb-hl'); state.hl = null; }
  }

  function onMove(e) {
    if (!state.mode) return;
    var page = currentPageEl();
    var block = e.target.closest && e.target.closest(BLOCK_SELECTOR);
    if (block && page && !page.contains(block)) block = null;
    if (block === state.hl) return;
    clearHighlight();
    if (block) { block.classList.add('fb-hl'); state.hl = block; }
  }

  function onModeClick(e) {
    if (!state.mode) return;
    // Swallow everything while in comment mode so nav links don't fire
    if (e.target.closest('.fb-ui')) return; // widget chrome stays interactive
    e.preventDefault();
    e.stopPropagation();

    var page = currentPageEl();
    var block = e.target.closest && e.target.closest(BLOCK_SELECTOR);
    if (!block || !page || !page.contains(block)) return;

    var r = block.getBoundingClientRect();
    var draft = {
      page_id: currentPageId(),
      block_key: blockKeyOf(block),
      block_index: -1,
      snippet: snippetOf(block),
      rel_x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      rel_y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
    };
    if (draft.block_key) {
      var cands = page.querySelectorAll('.' + CSS.escape(draft.block_key));
      for (var i = 0; i < cands.length; i++) {
        if (cands[i] === block) { draft.block_index = i; break; }
      }
    }
    setMode(false);
    openCompose(draft, e.clientX, e.clientY);
  }

  // ---------------------------------------------------------- popover UI --

  function closePopovers() {
    document.querySelectorAll('.fb-pop').forEach(function (p) { p.remove(); });
    state.openThread = null;
    state.draft = null;
  }

  function placePopover(pop, x, y) {
    document.body.appendChild(pop);
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.max(10, Math.min(x + 14, window.innerWidth - w - 10));
    var top = Math.max(10, Math.min(y - 20, window.innerHeight - h - 10));
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function blockLabel(c) {
    var label = BLOCK_LABELS[c.block_key] || 'Page';
    var snip = collapse(c.snippet || '');
    return label + (snip ? ': ' + snip.slice(0, 60) + (snip.length > 60 ? '…' : '') : '');
  }

  function openCompose(draft, x, y) {
    closePopovers();
    state.draft = draft;
    var pop = document.createElement('div');
    pop.className = 'fb-pop fb-ui';
    pop.innerHTML =
      '<div class="fb-pop-ctx">' + esc(blockLabel(draft)) + '</div>' +
      '<textarea class="fb-textarea" id="fb-compose-body" rows="4" maxlength="5000" placeholder="What would you change here?"></textarea>' +
      '<div class="fb-pop-actions">' +
      '  <button class="fb-btn fb-btn-ghost" data-fb="cancel">Cancel</button>' +
      '  <button class="fb-btn fb-btn-pri" data-fb="save">Post comment</button>' +
      '</div>';
    placePopover(pop, x, y);
    var ta = pop.querySelector('#fb-compose-body');
    ta.focus();
    pop.querySelector('[data-fb="cancel"]').addEventListener('click', closePopovers);
    pop.querySelector('[data-fb="save"]').addEventListener('click', function () {
      var body = ta.value.trim();
      if (!body) { ta.focus(); return; }
      ensureName(function (name) {
        var payload = Object.assign({}, draft, { author: name, color: colorFor(name), body: body });
        var btn = pop.querySelector('[data-fb="save"]');
        btn.disabled = true;
        btn.textContent = 'Posting…';
        api('create', payload).then(function (res) {
          state.comments.push(Object.assign({}, payload, {
            id: res.id, status: 'open', parent_id: null, created_at: res.created_at
          }));
          closePopovers();
          renderPins();
          updateBadge();
          renderDrawer();
          toast('Comment posted. Thank you!');
        }).catch(function (err) {
          btn.disabled = false;
          btn.textContent = 'Post comment';
          toast(err.message || 'Could not post the comment. Try again.', true);
        });
      });
    });
  }

  function threadHtml(c) {
    var reps = repliesOf(c.id);
    var items = [c].concat(reps).map(function (m) {
      return '<div class="fb-msg">' +
        '<span class="fb-av" style="background:' + esc(m.color || '#1B5FAA') + '">' + esc(initials(m.author)) + '</span>' +
        '<div class="fb-msg-body">' +
        '  <div class="fb-msg-meta"><b>' + esc(m.author) + '</b> <span>' + esc(timeAgo(m.created_at)) + '</span></div>' +
        '  <div class="fb-msg-text">' + esc(m.body).replace(/\n/g, '<br>') + '</div>' +
        '</div></div>';
    }).join('');
    var resolved = c.status === 'resolved';
    return '<div class="fb-pop-head">' +
      '  <div class="fb-pop-ctx">' + esc(blockLabel(c)) + '</div>' +
      '  <button class="fb-pop-close" data-fb="close" aria-label="Close">&times;</button>' +
      '</div>' +
      (resolved ? '<div class="fb-resolved-note">Resolved' + (c.resolved_by ? ' by ' + esc(c.resolved_by) : '') + '</div>' : '') +
      '<div class="fb-thread">' + items + '</div>' +
      '<div class="fb-reply-row">' +
      '  <input class="fb-input" id="fb-reply-input" type="text" maxlength="5000" placeholder="Reply…">' +
      '  <button class="fb-btn fb-btn-pri" data-fb="reply">Send</button>' +
      '</div>' +
      '<div class="fb-pop-actions fb-pop-actions-split">' +
      '  <button class="fb-btn ' + (resolved ? 'fb-btn-ghost' : 'fb-btn-done') + '" data-fb="toggle-status">' +
      (resolved ? 'Reopen' : 'Mark resolved') + '</button>' +
      '</div>';
  }

  function openThread(id, anchorEl) {
    closePopovers();
    var c = byId(id);
    if (!c) return;
    state.openThread = id;
    var pop = document.createElement('div');
    pop.className = 'fb-pop fb-pop-thread fb-ui';
    pop.innerHTML = threadHtml(c);
    var r = anchorEl ? anchorEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 3, width: 0, height: 0 };
    placePopover(pop, r.left + r.width, r.top);
    bindThread(pop, c);
  }

  function bindThread(pop, c) {
    pop.querySelector('[data-fb="close"]').addEventListener('click', closePopovers);
    var input = pop.querySelector('#fb-reply-input');
    function sendReply() {
      var body = input.value.trim();
      if (!body) return;
      ensureName(function (name) {
        api('reply', { parent_id: c.id, author: name, color: colorFor(name), body: body }).then(function (res) {
          state.comments.push({
            id: res.id, page_id: c.page_id, parent_id: c.id, author: name,
            color: colorFor(name), body: body, status: 'open', created_at: res.created_at
          });
          pop.innerHTML = threadHtml(c);
          bindThread(pop, c);
          renderDrawer();
        }).catch(function (err) { toast(err.message || 'Could not send the reply.', true); });
      });
    }
    pop.querySelector('[data-fb="reply"]').addEventListener('click', sendReply);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendReply(); });
    pop.querySelector('[data-fb="toggle-status"]').addEventListener('click', function () {
      var next = c.status === 'resolved' ? 'open' : 'resolved';
      ensureName(function (name) {
        api('status', { id: c.id, status: next, author: name }).then(function () {
          c.status = next;
          c.resolved_by = next === 'resolved' ? name : null;
          pop.innerHTML = threadHtml(c);
          bindThread(pop, c);
          renderPins();
          updateBadge();
          renderDrawer();
        }).catch(function (err) { toast(err.message || 'Could not update the status.', true); });
      });
    });
  }

  // ---------------------------------------------------------------- drawer --

  function updateBadge() {
    var badge = document.getElementById('fb-count-badge');
    if (!badge) return;
    var n = openCount();
    badge.textContent = String(n);
    badge.style.display = n ? '' : 'none';
  }

  function drawerEl() { return document.getElementById('fb-drawer'); }

  function toggleDrawer(force) {
    var d = drawerEl();
    var open = typeof force === 'boolean' ? force : !d.classList.contains('fb-open');
    d.classList.toggle('fb-open', open);
    if (open) renderDrawer();
  }

  function filtered(list) {
    if (state.filter === 'all') return list;
    return list.filter(function (c) { return c.status === state.filter; });
  }

  function commentRow(c, showPageName) {
    var reps = repliesOf(c.id).length;
    return '<div class="fb-row' + (c.status === 'resolved' ? ' fb-row-done' : '') + '" data-fb-row="' + c.id + '">' +
      '<span class="fb-av" style="background:' + esc(c.color || '#1B5FAA') + '">' + esc(initials(c.author)) + '</span>' +
      '<div class="fb-row-main">' +
      '  <div class="fb-row-meta"><b>' + esc(c.author) + '</b> <span>' + esc(timeAgo(c.created_at)) + '</span>' +
      (c.status === 'resolved' ? ' <span class="fb-chip-done">Resolved</span>' : '') + '</div>' +
      (showPageName ? '<div class="fb-row-page">' + esc(pageTitle(c.page_id)) + '</div>' : '') +
      '  <div class="fb-row-ctx">' + esc(blockLabel(c)) + '</div>' +
      '  <div class="fb-row-body">' + esc(c.body.length > 160 ? c.body.slice(0, 160) + '…' : c.body) + '</div>' +
      (reps ? '<div class="fb-row-replies">' + reps + (reps === 1 ? ' reply' : ' replies') + '</div>' : '') +
      '</div></div>';
  }

  function renderDrawer() {
    var d = drawerEl();
    if (!d || !d.classList.contains('fb-open')) return;
    var listEl = d.querySelector('.fb-drawer-list');
    var html = '';

    if (state.tab === 'page') {
      var pid = currentPageId();
      var list = filtered(roots(pid));
      html = list.length
        ? list.map(function (c) { return commentRow(c, false); }).join('')
        : '<div class="fb-empty">No ' + (state.filter === 'all' ? '' : state.filter + ' ') + 'comments on this page yet.<br>Click <b>Add feedback</b>, then click any section.</div>';
    } else {
      var groups = {};
      filtered(roots()).forEach(function (c) {
        (groups[c.page_id] = groups[c.page_id] || []).push(c);
      });
      var pids = Object.keys(groups);
      if (!pids.length) {
        html = '<div class="fb-empty">No ' + (state.filter === 'all' ? '' : state.filter + ' ') + 'comments anywhere yet.</div>';
      } else {
        pids.forEach(function (pid) {
          html += '<div class="fb-group-h">' + esc(pageTitle(pid)) + ' <span>' + groups[pid].length + '</span></div>';
          html += groups[pid].map(function (c) { return commentRow(c, false); }).join('');
        });
      }
    }
    listEl.innerHTML = html;

    listEl.querySelectorAll('[data-fb-row]').forEach(function (row) {
      row.addEventListener('click', function () {
        var c = byId(parseInt(row.getAttribute('data-fb-row'), 10));
        if (!c) return;
        if (c.page_id !== currentPageId()) {
          if (IS_SPA && window.showPage) {
            window.showPage(c.page_id);
          } else if (!IS_SPA) {
            location.href = pageIdToPath(c.page_id);
            return;
          }
        }
        renderPins(c.page_id);
        var pin = document.querySelector('.fb-pin[data-fb-id="' + c.id + '"]');
        if (pin) {
          pin.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { openThread(c.id, pin); }, 350);
        } else {
          openThread(c.id, null);
        }
        if (window.innerWidth < 760) toggleDrawer(false);
      });
    });

    // header state
    d.querySelectorAll('[data-fb-tab]').forEach(function (b) {
      b.classList.toggle('fb-active', b.getAttribute('data-fb-tab') === state.tab);
    });
    d.querySelectorAll('[data-fb-filter]').forEach(function (b) {
      b.classList.toggle('fb-active', b.getAttribute('data-fb-filter') === state.filter);
    });
  }

  // -------------------------------------------------------------- export --

  function exportMarkdown() {
    var lines = ['# ' + PROJECT_NAME + ': Feedback', '', '_Exported ' + new Date().toLocaleString() + '_', ''];
    var groups = {};
    roots().forEach(function (c) { (groups[c.page_id] = groups[c.page_id] || []).push(c); });
    Object.keys(groups).forEach(function (pid) {
      lines.push('## ' + pageTitle(pid) + '  `#' + pid + '`', '');
      groups[pid].forEach(function (c, i) {
        var status = c.status === 'resolved' ? 'x' : ' ';
        lines.push('- [' + status + '] **' + c.author + '** (' + (c.created_at || '').slice(0, 10) + ') · ' + blockLabel(c));
        lines.push('  > ' + c.body.replace(/\n/g, '\n  > '));
        repliesOf(c.id).forEach(function (r) {
          lines.push('  - **' + r.author + '** replied: ' + r.body.replace(/\n/g, ' '));
        });
        lines.push('');
      });
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = PROJECT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-feedback-' + new Date().toISOString().slice(0, 10) + '.md';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ----------------------------------------------------------------- init --

  function buildUi() {
    var fab = document.createElement('div');
    fab.className = 'fb-fab fb-ui';
    fab.innerHTML =
      '<button type="button" id="fb-drawer-btn" class="fb-fab-btn fb-fab-secondary" title="View all feedback">' +
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '  <span id="fb-count-badge" class="fb-badge" style="display:none">0</span>' +
      '</button>' +
      '<button type="button" id="fb-add-btn" class="fb-fab-btn fb-fab-primary"><span class="fb-add-plus">+</span> Add feedback</button>';
    document.body.appendChild(fab);

    var hint = document.createElement('div');
    hint.id = 'fb-mode-hint';
    hint.className = 'fb-mode-hint fb-ui';
    hint.textContent = 'Click any section to leave a comment. Press Esc to cancel.';
    document.body.appendChild(hint);

    var drawer = document.createElement('div');
    drawer.id = 'fb-drawer';
    drawer.className = 'fb-drawer fb-ui';
    drawer.innerHTML =
      '<div class="fb-drawer-head">' +
      '  <div class="fb-drawer-title">Feedback</div>' +
      '  <button class="fb-pop-close" id="fb-drawer-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="fb-drawer-tabs">' +
      '  <button class="fb-tab" data-fb-tab="page">This page</button>' +
      '  <button class="fb-tab" data-fb-tab="all">All pages</button>' +
      '  <span class="fb-drawer-spacer"></span>' +
      '  <button class="fb-filter" data-fb-filter="open">Open</button>' +
      '  <button class="fb-filter" data-fb-filter="resolved">Resolved</button>' +
      '  <button class="fb-filter" data-fb-filter="all">All</button>' +
      '</div>' +
      '<div class="fb-drawer-list"></div>' +
      '<div class="fb-drawer-foot">' +
      '  <button class="fb-btn fb-btn-ghost" id="fb-export-btn">Export Markdown</button>' +
      '</div>';
    document.body.appendChild(drawer);

    document.getElementById('fb-add-btn').addEventListener('click', function () { setMode(!state.mode); });
    document.getElementById('fb-drawer-btn').addEventListener('click', function () { toggleDrawer(); });
    document.getElementById('fb-drawer-close').addEventListener('click', function () { toggleDrawer(false); });
    document.getElementById('fb-export-btn').addEventListener('click', exportMarkdown);

    drawer.querySelectorAll('[data-fb-tab]').forEach(function (b) {
      b.addEventListener('click', function () { state.tab = b.getAttribute('data-fb-tab'); renderDrawer(); });
    });
    drawer.querySelectorAll('[data-fb-filter]').forEach(function (b) {
      b.addEventListener('click', function () { state.filter = b.getAttribute('data-fb-filter'); renderDrawer(); });
    });
  }

  function hookNavigation() {
    if (typeof window.showPage === 'function') {
      var orig = window.showPage;
      window.showPage = function (pageId) {
        orig(pageId);
        closePopovers();
        setMode(false);
        renderPins(pageId);
        renderDrawer();
      };
    }
    window.addEventListener('resize', debounce(function () { renderPins(); }, 150));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { renderPins(); });
    }
  }

  function bindGlobalEvents() {
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onModeClick, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (state.mode) setMode(false);
        else closePopovers();
      }
    });
    // click outside a thread popover closes it
    document.addEventListener('click', function (e) {
      if (state.openThread && !e.target.closest('.fb-pop') && !e.target.closest('.fb-pin')) {
        closePopovers();
      }
    });
  }

  function init() {
    if (!IS_SPA) {
      // Pin layer is absolutely positioned inside body; body needs to be
      // its own positioning context. Default static would resolve to the
      // initial containing block instead.
      var bs = window.getComputedStyle(document.body);
      if (bs.position === 'static') document.body.style.position = 'relative';
    }
    buildUi();
    hookNavigation();
    bindGlobalEvents();
    api('list').then(function (res) {
      state.comments = res.comments;
      renderPins();
      updateBadge();
      if (/[?&]review=1/.test(location.search)) {
        state.tab = 'all';
        state.filter = 'all';
        toggleDrawer(true);
      }
    }).catch(function () {
      toast('Feedback is offline right now. Comments will not load.', true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
