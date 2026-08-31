(function () {
  'use strict';

  var DATA = window.DR_DATA;
  if (!DATA) {
    console.error('DR_DATA missing');
    return;
  }

  var META = DATA.meta;
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function fmt(n) {
    if (n == null || n === '' || isNaN(n)) return null;
    return Number(n).toFixed(2).replace('.', ',') + ' €';
  }
  function hl(s, q) {
    if (!q) return esc(s);
    var i = String(s).toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(s);
    return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
  }
  function priceHTML(p) {
    var f = fmt(p);
    return f ? f : '<span class="ask">Consultar</span>';
  }

  /* ---------- meta links ---------- */
  function wireMeta() {
    var map = {
      linkTheFork: META.thefork,
      footTheFork: META.thefork,
      modalTheFork: META.thefork,
      openTheForkBtn: META.thefork,
      linkWhatsApp: META.whatsapp,
      modalWhatsApp: META.whatsapp,
      btnMaps: META.maps,
      btnDelivery: META.ubereats,
      footUber: META.ubereats,
      footOriginal: META.original
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !map[id]) return;
      if (el.tagName === 'A') el.href = map[id];
      if (id === 'openTheForkBtn') {
        el.addEventListener('click', function () { window.open(META.thefork, '_blank', 'noopener'); });
      }
    });
    var phone = document.getElementById('infoPhone');
    if (phone) {
      phone.href = 'tel:' + META.phone;
      phone.textContent = META.phoneDisplay;
    }
  }

  /* ---------- hero slider ---------- */
  function buildHero() {
    var slides = [];
    // prefer header + iconic dishes
    if (true) slides.push('img/header.jpg');
    var prefer = [13, 6312, 2082, 2185, 659, 2103, 684, 3198, 2174, 687];
    prefer.forEach(function (id) {
      var path = 'img/dish_' + id + '.jpg';
      slides.push(path);
    });
    // unique
    var seen = {};
    slides = slides.filter(function (s) {
      if (seen[s]) return false;
      seen[s] = 1;
      return true;
    });

    var root = $('#heroSlider');
    root.innerHTML = slides.map(function (src, i) {
      return '<div class="hero-slide' + (i === 0 ? ' on' : '') + '" style="background-image:url(\'' + src + '\')"></div>';
    }).join('');

    if (REDUCE || slides.length < 2) return;
    var idx = 0;
    var nodes = $all('.hero-slide', root);
    setInterval(function () {
      if (document.hidden) return;
      nodes[idx].classList.remove('on');
      idx = (idx + 1) % nodes.length;
      nodes[idx].classList.add('on');
    }, 5000);
  }

  /* ---------- ticker ---------- */
  function buildTicker() {
    var items = [
      'Plaza del Sol 35 · Móstoles',
      'Abierto todos los días · 13:00 – 01:00',
      'Cocina mediterránea & brasa',
      'Cócteles de autor',
      'Shishas & vapers',
      'Wine bar · cavas & champagne',
      '★ 8,9 en TheFork',
      'Reservas online'
    ];
    var seq = items.map(function (t) { return '<span>' + esc(t) + '</span><i>✦</i>'; }).join('');
    $('#tickerTrack').innerHTML = seq + seq;
  }

  /* ---------- promos carousel ---------- */
  function buildPromos() {
    var days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    var today = days[new Date().getDay()];
    var track = $('#promoTrack');
    track.innerHTML = DATA.promos.map(function (x) {
      var hoy = x.d === today;
      var img = x.img ? '<div class="pimg" style="background-image:url(\'' + esc(x.img) + '\')"></div>' : '';
      var price = x.p != null ? '<div class="promo-price">' + esc(fmt(x.p)) + '</div>' : '';
      return '<article class="promo-card' + (x.img ? ' has-img' : '') + '">' +
        img +
        '<div class="promo-body">' +
        '<div class="promo-row"><span class="day">' + esc(x.d) + '</span>' +
        (hoy ? '<span class="today">HOY</span>' : '') +
        '<span aria-hidden="true">' + (x.e || '') + '</span></div>' +
        '<h3>' + esc(x.n) + '</h3><p>' + esc(x.t) + '</p>' + price +
        '</div></article>';
    }).join('');

    var viewport = $('#promoViewport');
    var cards = track.children;
    var prevB = $('#promoPrev');
    var nextB = $('#promoNext');
    var dotsWrap = $('#promoDots');
    var GAP = 14, idx = 0, per = 1, maxIdx = 0, timer = null, paused = false;

    function perView() {
      var w = viewport.clientWidth;
      return w < 560 ? 1 : (w < 900 ? 2 : 3);
    }
    function cardW() {
      return (viewport.clientWidth - GAP * (per - 1)) / per;
    }
    function buildDots() {
      dotsWrap.innerHTML = '';
      for (var i = 0; i <= maxIdx; i++) {
        var d = document.createElement('button');
        d.className = 'dot' + (i === idx ? ' active' : '');
        d.type = 'button';
        d.setAttribute('aria-label', 'Promoción ' + (i + 1));
        (function (k) {
          d.addEventListener('click', function () { idx = k; move(); restart(); });
        })(i);
        dotsWrap.appendChild(d);
      }
    }
    function updateDots() {
      $all('.dot', dotsWrap).forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
      });
    }
    function move() {
      var cw = cardW();
      track.style.transform = 'translateX(' + (-(idx * (cw + GAP))) + 'px)';
      updateDots();
    }
    function layout() {
      per = perView();
      track.style.setProperty('--cw', cardW() + 'px');
      maxIdx = Math.max(0, cards.length - per);
      if (idx > maxIdx) idx = maxIdx;
      buildDots();
      move();
    }
    function go(n) {
      var span = maxIdx + 1;
      idx = ((n % span) + span) % span;
      move();
    }
    function next() { go(idx + 1); }
    function prev() { go(idx - 1); }
    function restart() {
      if (REDUCE) return;
      clearInterval(timer);
      timer = setInterval(function () {
        if (!paused && !document.hidden) next();
      }, 4500);
    }
    prevB.addEventListener('click', function () { prev(); restart(); });
    nextB.addEventListener('click', function () { next(); restart(); });
    viewport.addEventListener('pointerenter', function () { paused = true; });
    viewport.addEventListener('pointerleave', function () { paused = false; });

    var startX = null, startY = null;
    viewport.addEventListener('pointerdown', function (e) {
      startX = e.clientX; startY = e.clientY;
    });
    viewport.addEventListener('pointerup', function (e) {
      if (startX == null) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      startX = startY = null;
      if (Math.abs(dx) < 36 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) next(); else prev();
      restart();
    });
    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT); rT = setTimeout(layout, 120);
    });
    layout();
    restart();
  }

  /* ---------- featured gallery ---------- */
  function buildFeatured() {
    var rail = $('#featRail');
    rail.innerHTML = DATA.featured.map(function (it) {
      if (!it.img) return '';
      return '<button type="button" class="feat-card" data-dish="' + dishPayload(it, 'Destacado') + '">' +
        (it.pop ? '<span class="feat-tag">★ Popular</span>' : '') +
        '<img src="' + esc(it.img) + '" alt="' + esc(it.n) + '" loading="lazy" decoding="async"/>' +
        '<div class="feat-meta"><h4>' + esc(it.n) + '</h4><div class="fp">' + esc(fmt(it.p) || '') + '</div></div>' +
        '</button>';
    }).join('');
  }

  /* ---------- carta ---------- */
  function dishPayload(it, catName) {
    return encodeURIComponent(JSON.stringify({
      n: it.n, p: it.p, d: it.d, img: it.img, cat: catName
    }));
  }

  function dishButton(it, catName, q) {
    var tags = '';
    if (it.pop) tags += '<span class="tag pop">★ Popular</span>';
    if (it.veg) tags += '<span class="tag veg">Veggie</span>';
    var hasImg = !!it.img;
    return '<button type="button" class="dish' + (hasImg ? '' : ' no-img') + '" data-dish="' + dishPayload(it, catName) + '">' +
      (hasImg ? '<img class="dish-photo" src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async"/>' : '') +
      '<div class="dish-body"><div class="dish-top"><h4>' + hl(it.n, q) + tags + '</h4>' +
      '<span class="leader"></span><span class="price">' + priceHTML(it.p) + '</span></div>' +
      (it.d ? '<p class="dish-desc">' + (q ? hl(it.d, q) : esc(it.d)) + '</p>' : '') +
      '</div></button>';
  }

  /* Iconos de categoría (SVG inline) — evitan repetir foto del plato */
  var CAT_ICONS = {
    'Ensaladas': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4-2.5 7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 3 8.5 7 11z"/><path d="M12 11V6"/><path d="M9.5 8.5c.8-1.5 2-2.5 2.5-2.5s1.7 1 2.5 2.5"/><path d="M8 12.5c1.2.8 2.5 1.2 4 1.2s2.8-.4 4-1.2"/></svg>',
    'Entrantes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16v2a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-2z"/><path d="M8 11V7a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2"/><path d="M14 11V8a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3"/><path d="M12 19v2"/></svg>',
    'Carnes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9c0-2.5 2-4.5 4.5-4.5S17 6.5 17 9c0 4-3 5.5-3 9H11c0-3.5-3-5-3-9z"/><path d="M11 18h3"/><path d="M9.5 7.5c.5-.8 1.4-1.3 2.5-1.3"/><circle cx="13.2" cy="10.2" r=".7" fill="currentColor" stroke="none"/></svg>',
    'Pescados': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none"/><path d="M3 12l3.2-1.6L3 12l3.2 1.6"/></svg>',
    'Pizzas': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c5.5 1.2 9 5.8 9 9 0 .4 0 .7-.1 1L12 21 3.1 13C3 12.7 3 12.4 3 12c0-3.2 3.5-7.8 9-9z"/><circle cx="10" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="13.5" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8.5" r=".85" fill="currentColor" stroke="none"/></svg>',
    'Hamburguesas': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11h14a1 1 0 0 1 1 1v1H4v-1a1 1 0 0 1 1-1z"/><path d="M4 14h16v1.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 15.5V14z"/><path d="M5 11c0-3 2.5-5 7-5s7 2 7 5"/><path d="M7 9.2h.01M10 8.4h.01M14 8.4h.01M17 9.2h.01"/></svg>',
    'Bocadillos': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5c2-2 5-3 8-3s6 1 8 3v1.2c-2 1.6-5 2.3-8 2.3s-6-.7-8-2.3V10.5z"/><path d="M4 14.5c2 1.5 5 2.2 8 2.2s6-.7 8-2.2"/><path d="M6.5 11.2h11"/></svg>',
    'Sándwiches': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5h16v2.2H4z"/><path d="M5 10.7h14l-1.2 5.3a2 2 0 0 1-2 1.5H8.2a2 2 0 0 1-2-1.5L5 10.7z"/><path d="M7 13h10M8 15.2h8"/></svg>',
    'Tostas': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8.5c0-2 2.5-3.5 6-3.5s6 1.5 6 3.5V18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8.5z"/><path d="M6 10h12"/><path d="M9 13.5h6M9 16h4"/></svg>',
    'Postres': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11h12l-1.2 8.2A2 2 0 0 1 14.8 21H9.2a2 2 0 0 1-2-1.8L6 11z"/><path d="M5 11h14a3 3 0 0 0-3-5 3.2 3.2 0 0 0-5.2-2 3.2 3.2 0 0 0-5.3 2 3 3 0 0 0-3 5z"/><path d="M12 14v4"/></svg>'
  };

  function catIcon(name) {
    var svg = CAT_ICONS[name] || CAT_ICONS['Entrantes'];
    return '<span class="cat-icon" aria-hidden="true">' + svg + '</span>';
  }

  function buildCarta() {
    var cats = $('#cats');
    cats.innerHTML = DATA.menu.map(function (c, i) {
      var gridClass = 'dish-grid' + (c.items.some(function (it) { return it.img; }) ? ' with-photos' : '');
      return '<section class="cat" id="' + esc(c.id) + '">' +
        '<header class="cat-head">' +
        catIcon(c.name) +
        '<div class="txt"><span class="cat-kicker">03.' + (i + 1) + '</span><h3>' + esc(c.name) + '</h3>' +
        '<p>' + esc(c.tag) + '</p></div></header>' +
        '<div class="' + gridClass + '">' +
        c.items.map(function (it) { return dishButton(it, c.name); }).join('') +
        '</div></section>';
    }).join('');

    $('#pills').innerHTML = DATA.menu.map(function (c) {
      return '<button type="button" class="pill" data-target="' + esc(c.id) + '">' + esc(c.name) + '</button>';
    }).join('');
  }

  /* ---------- menus del dia ---------- */
  function buildMenus() {
    var el = $('#menusGrid');
    if (!DATA.menus || !DATA.menus.length) {
      el.closest('section').style.display = 'none';
      return;
    }
    el.innerHTML = DATA.menus.map(function (m) {
      return '<article class="menu-card"><h4>' + esc(m.n) + '</h4>' +
        (m.d ? '<p>' + esc(m.d) + '</p>' : '') +
        (m.p != null ? '<div class="mp">desde ' + esc(fmt(m.p)) + '</div>' : '') +
        '</article>';
    }).join('');
  }

  /* ---------- desayunos ---------- */
  function buildDesayunos() {
    var galleryIds = [6248, 6245, 6246, 6247];
    var gal = $('#breakGallery');
    gal.innerHTML = galleryIds.map(function (id, i) {
      var path = 'img/dish_' + id + '.jpg';
      var names = {
        6248: 'Tosta Destino',
        6245: 'Tosta de salmón',
        6246: 'Tosta de burrata',
        6247: 'Huevos revueltos'
      };
      return '<figure><img src="' + path + '" alt="' + esc(names[id] || 'Desayuno') + '" loading="lazy"/>' +
        '<figcaption>' + esc(names[id] || '') + '</figcaption></figure>';
    }).join('');

    $('#breakGroups').innerHTML = DATA.desayunos.map(function (g) {
      return '<div class="bgroup"><h5>' + esc(g.g) + '</h5>' +
        g.items.map(function (it) {
          var p = it.p != null ? fmt(it.p) : '—';
          return '<div class="drow"><span class="dn">' + esc(it.n) + '</span>' +
            '<span class="leader"></span><span class="dp">' + esc(p) + '</span></div>';
        }).join('') + '</div>';
    }).join('');
  }

  /* ---------- drinks ---------- */
  var DRINK_META = {
    cocktails: { emo: '🍹', blurb: 'Clásicos y de autor' },
    shishas: { emo: '💨', blurb: 'Sabores y vapers · pregúntanos' },
    vinos: { emo: '🍷', blurb: 'Tintos, blancos y rosados' },
    cavas: { emo: '🥂', blurb: 'Burbujas para brindar' },
    cervezas: { emo: '🍺', blurb: 'Cañas, craft y 0,0' },
    copas: { emo: '🥃', blurb: 'Ron, gin, whisky…' },
    batidos: { emo: '🧊', blurb: 'Batidos, granizados e iced tea' },
    refrescos: { emo: '🥤', blurb: 'Soft drinks y aguas' },
    sangrias: { emo: '🍊', blurb: 'Sangría blanca y sidra' }
  };

  /* Orden pensado para vender: cócteles y shishas arriba */
  var DRINK_ORDER = ['cocktails', 'shishas', 'vinos', 'cavas', 'cervezas', 'copas', 'batidos', 'refrescos', 'sangrias'];

  function orderedDrinks() {
    var byId = {};
    DATA.drinks.forEach(function (d) { byId[d.id] = d; });
    var list = [];
    DRINK_ORDER.forEach(function (id) { if (byId[id]) list.push(byId[id]); });
    DATA.drinks.forEach(function (d) {
      if (list.indexOf(d) < 0) list.push(d);
    });
    return list;
  }

  function drinkSectionBody(t) {
    var body = '';
    var withImg = t.items.filter(function (x) { return x.img; });
    var without = t.items.filter(function (x) { return !x.img; });

    if (withImg.length) {
      body += '<div class="drink-grid' + (t.id === 'shishas' ? ' shisha-grid' : '') + '">' +
        withImg.map(function (x) {
          return '<article class="drink-card">' +
            '<img src="' + esc(x.img) + '" alt="" loading="lazy"/>' +
            '<div class="db"><h6>' + esc(x.n) + '</h6>' +
            (x.p != null ? '<div class="dp">' + esc(fmt(x.p)) + '</div>' : '') +
            '</div></article>';
        }).join('') + '</div>';
    }
    if (without.length) {
      body += (withImg.length ? '<div style="height:14px"></div>' : '') +
        '<div class="drink-chip-wrap">' +
        without.map(function (x) {
          return '<span class="chip">' + esc(x.n) +
            (x.p != null ? '<b>' + esc(fmt(x.p)) + '</b>' : '') + '</span>';
        }).join('') + '</div>';
    }
    if (t.note) body += '<p class="drink-note">✦ ' + esc(t.note) + '</p>';
    if (!t.items.length && t.note) {
      body = '<div class="menu-card"><h4>' + esc(t.label) + '</h4><p>' + esc(t.note) + '</p></div>';
    }
    return body;
  }

  function buildDrinkNavLinks() {
    var drinks = orderedDrinks();
    function linkHTML(t, extraClass) {
      var n = t.items ? t.items.length : 0;
      var hot = t.id === 'shishas' || t.id === 'cocktails';
      return '<a class="' + (extraClass || '') + (hot ? ' hot' : '') + '" href="#drink-' + esc(t.id) + '">' +
        '<span>' + esc((DRINK_META[t.id] && DRINK_META[t.id].emo) || '•') + ' ' + esc(t.label) + '</span>' +
        (n ? '<span class="cnt">' + n + '</span>' : '') +
        '</a>';
    }

    var dropLinks = $('#barraDropLinks');
    if (dropLinks) {
      dropLinks.innerHTML = drinks.map(function (t) { return linkHTML(t); }).join('');
    }
    var mnavList = $('#mnavBarraList');
    if (mnavList) {
      mnavList.innerHTML = '<a href="#bebidas">Ver toda la barra</a>' +
        drinks.map(function (t) { return linkHTML(t); }).join('');
    }
  }

  function buildDrinks() {
    var drinks = orderedDrinks();
    buildDrinkNavLinks();

    /* Grid de categorías siempre visible */
    var highs = $('#drinkHighlights');
    if (highs) {
      highs.innerHTML = drinks.map(function (t) {
        var meta = DRINK_META[t.id] || { emo: '•', blurb: '' };
        var hot = t.id === 'shishas';
        var n = t.items ? t.items.length : 0;
        return '<button type="button" class="drink-tile' + (hot ? ' hot' : '') + '" data-drink-target="drink-' + esc(t.id) + '">' +
          '<span class="ticon" aria-hidden="true">' + meta.emo + '</span>' +
          '<span class="tmeta"><strong>' + esc(t.label) + '</strong>' +
          '<span>' + esc(meta.blurb) + (n ? ' · ' + n + ' opciones' : '') + '</span>' +
          (hot ? '<span class="badge-hot">Destacado · pide en sala</span>' : '') +
          '</span><span class="tgo" aria-hidden="true">→</span></button>';
      }).join('');

      highs.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-drink-target]');
        if (!btn) return;
        var el = document.getElementById(btn.getAttribute('data-drink-target'));
        if (el) el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
      });
    }

    /* Pills sticky */
    var pills = $('#drinkPills');
    if (pills) {
      pills.innerHTML = drinks.map(function (t) {
        var meta = DRINK_META[t.id] || {};
        return '<button type="button" class="pill" data-target="drink-' + esc(t.id) + '">' +
          (meta.emo ? meta.emo + ' ' : '') + esc(t.label) + '</button>';
      }).join('');
    }

    /* Todas las secciones a la vista (scroll) */
    var sections = $('#drinkSections');
    sections.innerHTML = drinks.map(function (t) {
      var meta = DRINK_META[t.id] || { emo: '' };
      var hot = t.id === 'shishas';
      var n = t.items ? t.items.length : 0;
      return '<section class="drink-section' + (hot ? ' hot-sec' : '') + '" id="drink-' + esc(t.id) + '">' +
        '<div class="drink-sec-head">' +
        '<h3><span class="emo" aria-hidden="true">' + (meta.emo || '') + '</span>' + esc(t.label) + '</h3>' +
        (n ? '<span class="scount">' + n + ' opciones</span>' : '') +
        '</div>' +
        drinkSectionBody(t) +
        '</section>';
    }).join('');

    wireBarraDropdowns();
    wireDrinkPillsSpy();
  }

  function wireBarraDropdowns() {
    var drop = $('#barraDrop');
    var btn = $('#barraDropBtn');
    var menu = $('#barraDropMenu');
    if (btn && menu && drop) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = drop.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) menu.removeAttribute('hidden');
        else menu.setAttribute('hidden', '');
      });
      menu.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          drop.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          menu.setAttribute('hidden', '');
        }
      });
      document.addEventListener('click', function (e) {
        if (!drop.contains(e.target)) {
          drop.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          menu.setAttribute('hidden', '');
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && drop.classList.contains('open')) {
          drop.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          menu.setAttribute('hidden', '');
        }
      });
    }

    var mBtn = $('#mnavBarraBtn');
    var mList = $('#mnavBarraList');
    if (mBtn && mList) {
      mBtn.addEventListener('click', function () {
        var open = mBtn.getAttribute('aria-expanded') === 'true';
        open = !open;
        mBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) mList.removeAttribute('hidden');
        else mList.setAttribute('hidden', '');
      });
      mList.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          /* close mnav handled by global link handler */
          mBtn.setAttribute('aria-expanded', 'false');
          mList.setAttribute('hidden', '');
        }
      });
    }
  }

  function wireDrinkPillsSpy() {
    var pillsBar = $('#drinkPills');
    if (!pillsBar) return;
    var pillBtns = $all('.pill', pillsBar);

    function centerPill(p) {
      try {
        var pr = p.getBoundingClientRect();
        var cr = pillsBar.getBoundingClientRect();
        pillsBar.scrollBy({
          left: pr.left - cr.left - (cr.width - pr.width) / 2,
          behavior: REDUCE ? 'auto' : 'smooth'
        });
      } catch (e) {}
    }

    pillBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var el = document.getElementById(b.dataset.target);
        if (el) el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
      });
    });

    if ('IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) {
            pillBtns.forEach(function (p) {
              var on = p.dataset.target === en.target.id;
              p.classList.toggle('active', on);
              if (on) centerPill(p);
            });
          }
        });
      }, { rootMargin: '-25% 0px -65% 0px' });
      $all('.drink-section').forEach(function (c) { spy.observe(c); });
    }
  }

  /* ---------- services chips ---------- */
  function buildServices() {
    var services = [
      'Terraza', 'Wine bar', 'Cócteles', 'Shishas & vapers', 'Ambiente romántico',
      'Grupos & cumpleaños', 'WiFi', 'Parking gratuito', 'Abierto en domingo',
      'Aire acondicionado', 'Desayunos'
    ];
    $('#serviceChips').innerHTML = services.map(function (s) {
      return '<span class="chip">' + esc(s) + '</span>';
    }).join('');
  }

  /* ---------- quote bg ---------- */
  function quoteBg() {
    var el = $('#quoteBand');
    el.style.backgroundImage = "url('img/dish_13.jpg')";
  }

  /* ---------- dish modal ---------- */
  function openDishModal(data) {
    var modal = $('#dishModal');
    $('#dishModalTitle').textContent = data.n || '';
    $('#dishModalCat').textContent = data.cat || 'La carta';
    $('#dishModalPrice').textContent = fmt(data.p) || 'Consultar precio';
    $('#dishModalDesc').textContent = data.d || 'Pregunta a nuestro equipo por los detalles de elaboración.';
    var img = $('#dishModalImg');
    if (data.img) {
      img.src = data.img;
      img.alt = data.n || '';
      img.parentElement.style.display = '';
    } else {
      img.removeAttribute('src');
      img.parentElement.style.display = 'none';
    }
    openModal(modal);
  }

  function openModal(modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
  }
  function closeModal(modal) {
    if (!modal) {
      $all('.modal.open').forEach(function (m) { closeModal(m); });
      return;
    }
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!$all('.modal.open').length) document.body.classList.remove('lock');
  }

  function wireModals() {
    document.addEventListener('click', function (e) {
      var dishBtn = e.target.closest('[data-dish]');
      if (dishBtn) {
        try {
          openDishModal(JSON.parse(decodeURIComponent(dishBtn.getAttribute('data-dish'))));
        } catch (err) {}
        return;
      }
      if (e.target.closest('[data-close-modal]')) {
        closeModal(e.target.closest('.modal'));
      }
      if (e.target.closest('[data-open-reserve]')) {
        // if already near reserve form on desktop, scroll; on mobile open chooser
        var isMobile = window.matchMedia('(max-width:900px)').matches;
        var reserveSection = $('#reservas');
        if (!isMobile) {
          closeModal();
          reserveSection.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
          setTimeout(function () {
            var name = $('#reserveForm [name="name"]');
            if (name) name.focus();
          }, 400);
        } else {
          // if click came from inside success etc ignore
          openModal($('#reserveModal'));
        }
      }
    });

    $('#goReserveForm').addEventListener('click', function () {
      closeModal($('#reserveModal'));
      $('#reservas').scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () {
        var name = $('#reserveForm [name="name"]');
        if (name) name.focus();
      }, 450);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  /* ---------- search ---------- */
  function wireSearch() {
    var input = $('#menuSearch');
    var clear = $('#searchClear');
    var results = $('#searchResults');

    function doSearch() {
      var q = input.value.trim();
      clear.hidden = q.length === 0;
      var searching = q.length >= 2;
      document.body.classList.toggle('searching', searching);
      if (!searching) { results.innerHTML = ''; return; }

      var groups = [];
      var total = 0;
      DATA.menu.forEach(function (c) {
        var its = c.items.filter(function (it) {
          return (it.n + ' ' + (it.d || '') + ' ' + c.name).toLowerCase().indexOf(q.toLowerCase()) !== -1;
        });
        if (its.length) { groups.push({ c: c, its: its }); total += its.length; }
      });
      if (!groups.length) {
        results.innerHTML = '<p class="no-res">No hemos encontrado nada para «' + esc(q) +
          '».<br>Prueba con croquetas, pulpo, pizza, tarta…</p>';
        return;
      }
      results.innerHTML = '<p class="res-count">✦ <b>' + total + '</b> resultado' + (total === 1 ? '' : 's') +
        ' para «' + esc(q) + '»</p>' +
        groups.map(function (g) {
          return '<div class="res-group"><h5>' + esc(g.c.name) + '</h5><div class="dish-grid with-photos">' +
            g.its.map(function (it) { return dishButton(it, g.c.name, q); }).join('') +
            '</div></div>';
        }).join('');
    }
    input.addEventListener('input', doSearch);
    clear.addEventListener('click', function () {
      input.value = ''; doSearch(); input.focus();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; doSearch(); }
    });
  }

  /* ---------- nav / scrollspy / sticky ---------- */
  function wireNav() {
    var topbar = $('#topbar');
    var toTop = $('#toTop');
    var sticky = $('#stickyCta');
    var mnav = $('#mnav');
    var burger = $('#burger');

    function closeMnav() {
      mnav.classList.remove('open');
      mnav.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('lock');
    }
    function openMnav() {
      /* force style flush so first open never feels "stuck" one frame */
      void mnav.offsetWidth;
      mnav.classList.add('open');
      mnav.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('lock');
    }
    function toggleMnav(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (mnav.classList.contains('open')) closeMnav();
      else openMnav();
    }
    /* pointerup = instant on touch (no 300ms click delay feel) */
    burger.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      toggleMnav(e);
    });
    burger.addEventListener('click', function (e) {
      /* keyboard / fallback only if pointerup didn't run */
      if (e.detail === 0) toggleMnav(e);
    });
    $('#mnavClose').addEventListener('pointerup', function (e) {
      e.preventDefault();
      closeMnav();
    });
    $('#mnavClose').addEventListener('click', function (e) {
      if (e.detail === 0) closeMnav();
    });
    $all('a', mnav).forEach(function (a) {
      a.addEventListener('click', closeMnav);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mnav.classList.contains('open')) closeMnav();
    });

    window.addEventListener('scroll', function () {
      var y = window.scrollY || 0;
      topbar.classList.toggle('scrolled', y > 30);
      toTop.classList.toggle('show', y > 600);
      sticky.classList.toggle('show', y > window.innerHeight * 0.55);
    }, { passive: true });

    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
    });

    // top links spy
    var map = {};
    $all('#topLinks a[href^="#"]').forEach(function (a) {
      map[a.getAttribute('href').slice(1)] = a;
    });
    var barraBtn = $('#barraDropBtn');
    if ('IntersectionObserver' in window) {
      var spyNav = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) {
            Object.keys(map).forEach(function (k) {
              map[k].classList.toggle('active', k === en.target.id);
            });
            if (barraBtn) {
              barraBtn.classList.toggle('active', en.target.id === 'bebidas');
            }
          }
        });
      }, { rootMargin: '-35% 0px -55% 0px' });
      Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) spyNav.observe(el);
      });
      var bebidasSec = document.getElementById('bebidas');
      if (bebidasSec) spyNav.observe(bebidasSec);
    }

    // pills
    var pillsBar = $('#pills');
    var pillBtns = $all('.pill', pillsBar);
    function centerPill(p) {
      try {
        var pr = p.getBoundingClientRect();
        var cr = pillsBar.getBoundingClientRect();
        pillsBar.scrollBy({
          left: pr.left - cr.left - (cr.width - pr.width) / 2,
          behavior: REDUCE ? 'auto' : 'smooth'
        });
      } catch (e) {}
    }
    pillBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var el = document.getElementById(b.dataset.target);
        if (el) el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
      });
    });
    if ('IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) {
            pillBtns.forEach(function (p) {
              var on = p.dataset.target === en.target.id;
              p.classList.toggle('active', on);
              if (on) centerPill(p);
            });
          }
        });
      }, { rootMargin: '-25% 0px -65% 0px' });
      $all('.cat').forEach(function (c) { spy.observe(c); });
    }
  }

  /* ---------- RESERVAS ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function buildTimeOptions() {
    var sel = $('#reserveForm [name="time"]');
    var times = [];
    // lunch 13:00-16:30, dinner 20:00-00:30 (show until 00:30 as 00:00/00:30 next)
    function pushRange(hStart, mStart, hEnd, mEnd, step) {
      var h = hStart, m = mStart;
      while (h < hEnd || (h === hEnd && m <= mEnd)) {
        times.push(pad(h) + ':' + pad(m));
        m += step;
        if (m >= 60) { m = 0; h += 1; }
        if (h >= 24) break;
      }
    }
    pushRange(13, 0, 16, 30, 30);
    pushRange(20, 0, 23, 30, 30);
    times.push('00:00');
    times.push('00:30');
    sel.innerHTML = '<option value="">Elige hora</option>' +
      times.map(function (t) { return '<option value="' + t + '">' + t + ' h</option>'; }).join('');
  }

  function buildGuestOptions() {
    var sel = $('#reserveForm [name="guests"]');
    var opts = '';
    for (var i = 1; i <= 20; i++) {
      opts += '<option value="' + i + '"' + (i === 2 ? ' selected' : '') + '>' +
        i + (i === 1 ? ' persona' : ' personas') + '</option>';
    }
    sel.innerHTML = opts;
  }

  function setupDateMin() {
    var input = $('#reserveForm [name="date"]');
    var now = new Date();
    var yyyy = now.getFullYear();
    var mm = pad(now.getMonth() + 1);
    var dd = pad(now.getDate());
    input.min = yyyy + '-' + mm + '-' + dd;
    // default tomorrow if after 22:00 else today
    var def = new Date(now);
    if (now.getHours() >= 22) def.setDate(def.getDate() + 1);
    input.value = def.getFullYear() + '-' + pad(def.getMonth() + 1) + '-' + pad(def.getDate());
  }

  function reservationCode() {
    var t = Date.now().toString(36).toUpperCase();
    return 'DR-' + t.slice(-6);
  }

  function saveReservation(data) {
    try {
      var key = 'destino_raiz_reservas';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift(data);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch (e) {}
  }

  function buildWhatsAppMessage(data) {
    var lines = [
      'Hola Destino Raíz 👋',
      'Quiero reservar mesa:',
      '',
      '• Nombre: ' + data.name,
      '• Teléfono: ' + data.phone,
      '• Fecha: ' + data.dateLabel,
      '• Hora: ' + data.time + ' h',
      '• Personas: ' + data.guests,
      '• Zona: ' + data.zone,
      data.notes ? '• Notas: ' + data.notes : null,
      data.email ? '• Email: ' + data.email : null,
      '',
      'Código: ' + data.code
    ].filter(Boolean);
    return lines.join('\n');
  }

  function formatDateLabel(iso) {
    try {
      var d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch (e) {
      return iso;
    }
  }

  function wireReserveForm() {
    buildTimeOptions();
    buildGuestOptions();
    setupDateMin();

    var form = $('#reserveForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var data = {
        name: String(fd.get('name') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        date: String(fd.get('date') || ''),
        time: String(fd.get('time') || ''),
        guests: String(fd.get('guests') || ''),
        zone: String(fd.get('zone') || ''),
        notes: String(fd.get('notes') || '').trim(),
        terms: !!fd.get('terms')
      };

      // basic validation
      var ok = true;
      $all('.field', form).forEach(function (f) { f.classList.remove('error'); });
      function mark(name) {
        var field = form.querySelector('[name="' + name + '"]');
        if (field) field.closest('.field').classList.add('error');
        ok = false;
      }
      if (!data.name || data.name.length < 2) mark('name');
      if (!data.phone || data.phone.replace(/\D/g, '').length < 9) mark('phone');
      if (!data.date) mark('date');
      if (!data.time) mark('time');
      if (!data.guests) mark('guests');
      if (!data.terms) ok = false;
      if (!ok) {
        var firstErr = form.querySelector('.field.error input, .field.error select');
        if (firstErr) firstErr.focus();
        return;
      }

      data.code = reservationCode();
      data.dateLabel = formatDateLabel(data.date);
      data.createdAt = new Date().toISOString();
      saveReservation(data);

      var msg = buildWhatsAppMessage(data);
      var waUrl = META.whatsapp + '?text=' + encodeURIComponent(msg);

      $('#successText').textContent =
        data.name.split(' ')[0] + ', hemos registrado tu mesa para ' +
        data.guests + (data.guests === '1' ? ' persona' : ' personas') +
        ' el ' + data.dateLabel + ' a las ' + data.time +
        '. Ábrelo por WhatsApp para confirmarlo con el restaurante.';
      $('#successCode').textContent = data.code;
      $('#successWa').href = waUrl;

      openModal($('#successModal'));

      // also offer TheFork deep path conceptually
      form.reset();
      setupDateMin();
      buildGuestOptions();
      buildTimeOptions();
    });
  }

  /* ---------- init ---------- */
  wireMeta();
  buildHero();
  buildTicker();
  buildPromos();
  buildFeatured();
  buildCarta();
  buildMenus();
  buildDesayunos();
  buildDrinks();
  buildServices();
  quoteBg();
  wireModals();
  wireSearch();
  wireNav();
  wireReserveForm();
})();
