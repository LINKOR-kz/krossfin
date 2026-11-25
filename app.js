/* KROSSFIN — витрина: каталог, фильтры, карточка товара, корзина, заказ в WhatsApp */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = KF.esc, money = KF.money;
  var D = null, S = null;
  var F = { store: 'shoes', cat: '', q: '', size: '', brand: '', sort: '', limit: 12 };
  var PAGE = 12;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function catOf(id) { return D.cats.filter(function (c) { return c.id === id; })[0] || null; }
  function storeOf(it) { var c = catOf(it.cat); return c && c.store === 'wear' ? 'wear' : 'shoes'; }
  function visible() { return D.items.filter(function (it) { return it.status !== 'hidden'; }); }
  function itemById(id) { return D.items.filter(function (x) { return x.id === id; })[0]; }
  function waLink(num, text) { return 'https://wa.me/' + KF.waNum(num) + '?text=' + encodeURIComponent(text); }
  function storeWa(st) { return S[KF.STORES[st].wa] || S.whatsappShoes || S.whatsappWear; }
  function absUrl(ref) { var u = KF.src(ref); try { return new URL(u, location.href).href; } catch (e) { return u; } }

  /* ================= ЗАГРУЗКА ================= */
  KF.loadCatalog().then(function (r) {
    D = r.data; D.cats = D.cats || []; D.items = D.items || []; D.promos = D.promos || []; S = D.settings || {};
    boot();
  }).catch(function () { $('#grid').innerHTML = '<p class="empty">Не удалось загрузить каталог. Обновите страницу.</p>'; });

  function boot() {
    renderStatic();
    renderHero();
    renderPromos();
    renderCatalogUI();
    renderGrid();
    renderLookbook();
    updateCart();
    observe();
    var m = /[?&#]p=([^&]+)/.exec(location.search + location.hash);
    if (m) { var it = itemById(decodeURIComponent(m[1])); if (it) openProduct(it); }
  }

  /* ================= ТЕКСТЫ, КОНТАКТЫ ================= */
  function icon(name) {
    var I = {
      wa: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 13.8c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11.5 11.5 0 0 1-4.5-4c-.4-.5-1-1.6-1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.2.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2z"/></svg>',
      ig: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#fff"/></svg>',
      tg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M21.5 4.3L2.9 11.5c-1.3.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.8-1.4-1.6zM9.6 14.3l8.8-7.6-7.2 8.8-.3 3.4z"/></svg>',
      map: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
    };
    return I[name];
  }
  function contact(kind, href, small, big, wide) {
    return '<a class="contact contact--' + kind + (wide ? ' contact--wide' : '') + '" href="' + esc(href) + '" target="_blank" rel="noopener"><i>' + icon(kind) + '</i><span><small>' + esc(small) + '</small><b>' + esc(big) + '</b></span></a>';
  }
  function renderStatic() {
    $('#topLogo').innerHTML = KF.logo();
    $('#footLogo').innerHTML = KF.logo();
    $('#stampMark').innerHTML = KF.mark();
    $('#year').textContent = new Date().getFullYear();
    var mq = (S.marquee || []).filter(Boolean);
    if (mq.length) { var one = mq.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join(''); $('#ticker').innerHTML = one + one + one + one; } else $('.ticker').hidden = true;
    if (S.heroKicker) $('#heroKicker').textContent = S.heroKicker;
    var lines = String(S.heroTitle || 'Топовые\nмодели').split('\n').filter(Boolean);
    $('#heroTitle').innerHTML = lines.map(function (l, i) { return '<span class="ln"><span' + (i === lines.length - 1 && lines.length > 1 ? ' class="hl"' : '') + '>' + esc(l) + '</span></span>'; }).join('');
    $('#heroText').textContent = S.heroText || '';
    if (S.followers) $('#factFollowers').textContent = S.followers;
    $('#tileShoes img').src = KF.src(S.tileShoes || 'media/tile-shoes.webp');
    $('#tileWear img').src = KF.src(S.tileWear || 'media/tile-wear.webp');
    var vis = visible();
    $('#cntShoes').textContent = vis.filter(function (i) { return storeOf(i) === 'shoes'; }).length + ' моделей';
    $('#cntWear').textContent = vis.filter(function (i) { return storeOf(i) === 'wear'; }).length + ' вещей';
    $('#aboutTitle').textContent = S.aboutTitle || '';
    $('#aboutText').textContent = S.aboutText || '';
    if (S.aboutImage) $('#aboutImg').src = KF.src(S.aboutImage); else $('#aboutImg').hidden = true;
    if (S.aboutImage2) $('#aboutImg2').src = KF.src(S.aboutImage2); else $('#aboutImg2').hidden = true;
    $('#addr').textContent = (S.city ? S.city + ', ' : '') + (S.address || '');
    $('#addrNote').textContent = S.addressNote || '';
    $('#hours').textContent = S.hours || '';
    $('#lbTitle').textContent = S.lookbookTitle || 'Образы';
    var c = '';
    if (S.whatsappShoes) c += contact('wa', waLink(S.whatsappShoes, 'Здравствуйте! Пишу с сайта KROSSFIN. '), 'WhatsApp · кроссовки', KF.phonePretty(KF.waNum(S.whatsappShoes)));
    if (S.whatsappWear) c += contact('wa', waLink(S.whatsappWear, 'Здравствуйте! Пишу с сайта KROSSFIN. '), 'WhatsApp · одежда', KF.phonePretty(KF.waNum(S.whatsappWear)));
    if (S.instagramShoes) c += contact('ig', 'https://instagram.com/' + S.instagramShoes, 'Instagram · кроссовки', '@' + S.instagramShoes);
    if (S.instagramWear) c += contact('ig', 'https://instagram.com/' + S.instagramWear, 'Instagram · одежда', '@' + S.instagramWear);
    if (S.telegram) c += contact('tg', 'https://t.me/' + S.telegram, 'Telegram-канал', 't.me/' + S.telegram);
    if (S.map) c += contact('map', S.map, 'Маршрут', 'Открыть в 2ГИС', !S.telegram);
    $('#contacts').innerHTML = c;
    var fl = '';
    if (S.instagramShoes) fl += '<a href="https://instagram.com/' + esc(S.instagramShoes) + '" target="_blank" rel="noopener">@' + esc(S.instagramShoes) + '</a>';
    if (S.instagramWear) fl += '<a href="https://instagram.com/' + esc(S.instagramWear) + '" target="_blank" rel="noopener">@' + esc(S.instagramWear) + '</a>';
    if (S.whatsappShoes) fl += '<a href="' + esc(waLink(S.whatsappShoes, 'Здравствуйте! ')) + '" target="_blank" rel="noopener">WhatsApp</a>';
    if (S.map) fl += '<a href="' + esc(S.map) + '" target="_blank" rel="noopener">2ГИС</a>';
    $('#footLinks').innerHTML = fl;
    $('#menuFoot').innerHTML = (S.whatsappShoes ? '<a class="btn btn--wa btn--block" href="' + esc(waLink(S.whatsappShoes, 'Здравствуйте! ')) + '" target="_blank" rel="noopener">' + icon('wa') + '<span>Написать в WhatsApp</span></a>' : '') +
      '<p style="margin:6px 0 0;color:var(--muted);font-weight:600;font-size:14px">' + esc((S.address || '') + ' · ' + (S.hours || '')) + '</p>';
    var brands = {};
    D.items.forEach(function (it) { if (it.brand) brands[it.brand] = 1; });
    var bl = Object.keys(brands);
    if (bl.length) { var b1 = bl.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join(''); $('#brands').innerHTML = b1 + b1; } else $('.brands').hidden = true;
  }

  /* ================= ГЛАВНЫЙ ЭКРАН: КРОССОВОК НА СЦЕНЕ ================= */
  var HS = [], hi = 0, htimer = null, HDUR = 4200;
  function renderHero() {
    var shots = (S.heroShots || []).filter(Boolean);
    if (!shots.length) {
      shots = visible().filter(function (i) { return storeOf(i) === 'shoes' && i.photos && i.photos[0]; }).slice(0, 4).map(function (i) { return i.photos[0]; });
    }
    HS = shots.map(function (ref) {
      var key = String(ref).split('/').pop().replace(/^cut-/, '').replace(/\.\w+$/, '');
      var it = D.items.filter(function (x) { return x.status !== 'hidden' && (x.photos || []).some(function (p) { return p.indexOf(key) >= 0; }); })[0];
      return { ref: ref, item: it || null };
    });
    if (!HS.length) { $('#stage').hidden = true; return; }
    $('#stageShoes').innerHTML = HS.map(function (h, i) { return '<div class="stage__shoe" data-i="' + i + '"><img src="' + esc(KF.src(h.ref)) + '" alt="' + esc(h.item ? (h.item.brand + ' ' + h.item.name) : 'Кроссовки KROSSFIN') + '"' + (i ? ' loading="lazy"' : '') + '></div>'; }).join('');
    $('#stageDots').innerHTML = HS.length > 1 ? HS.map(function (h, i) { return '<button type="button" data-i="' + i + '" aria-label="Модель ' + (i + 1) + '"></button>'; }).join('') : '';
    $('#stage').style.setProperty('--dur', HDUR + 'ms');
    showShot(0, true);
    $('#stageDots').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) showShot(+b.getAttribute('data-i')); });
    $('#stageCard').addEventListener('click', function () { var h = HS[hi]; if (h && h.item) openProduct(h.item); else go('shoes'); });
    var st = $('#stage');
    st.addEventListener('pointermove', function (e) { var r = st.getBoundingClientRect(); st.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5) * 2); st.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5) * 2); });
    st.addEventListener('pointerleave', function () { st.style.setProperty('--mx', 0); st.style.setProperty('--my', 0); });
    var sx = null;
    st.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    st.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) showShot((hi + (dx < 0 ? 1 : -1) + HS.length) % HS.length); sx = null; });
  }
  function showShot(i, first) {
    var shoes = $$('.stage__shoe');
    shoes.forEach(function (s, n) {
      s.classList.remove('out');
      if (n === hi && n !== i && !first) { s.classList.remove('on'); void s.offsetWidth; s.classList.add('out'); }
      else if (n !== i) s.classList.remove('on');
    });
    var cur = shoes[i]; cur.classList.remove('on'); void cur.offsetWidth; cur.classList.add('on');
    hi = i;
    $$('#stageDots button').forEach(function (b, n) { b.classList.toggle('on', n === i); if (n === i) { b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); } });
    $('#stageNum').textContent = ('0' + (i + 1)).slice(-2);
    var h = HS[i], card = $('#stageCard');
    if (h.item) {
      var pr = KF.pricing(h.item, D.promos);
      $('#stageBrand').textContent = h.item.brand || 'KROSSFIN';
      $('#stageName').textContent = h.item.name;
      $('#stagePrice').textContent = money(pr.price) + (pr.old ? '  · −' + pr.pct + '%' : '');
    } else { $('#stageBrand').textContent = 'KROSSFIN'; $('#stageName').textContent = 'Смотреть все кроссовки'; $('#stagePrice').textContent = visible().length + ' моделей в каталоге'; }
    card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    clearTimeout(htimer);
    if (HS.length > 1) htimer = setTimeout(function () { showShot((hi + 1) % HS.length); }, HDUR);
  }
  document.addEventListener('visibilitychange', function () { if (!HS.length || HS.length < 2) return; if (document.hidden) clearTimeout(htimer); else showShot(hi); });

  /* ================= АКЦИИ ================= */
  function promoDate(p) {
    function d(s) { return s.slice(8) + '.' + s.slice(5, 7); }
    if (p.from && p.to) return 'с ' + d(p.from) + ' по ' + d(p.to);
    if (p.to) return 'до ' + d(p.to);
    return 'Действует сейчас';
  }
  function promoCard(p) {
    var t = KF.PROMO_THEMES[p.theme] || KF.PROMO_THEMES.red;
    var media = p.image ? '<img src="' + esc(KF.src(p.image)) + '" alt="" loading="lazy">' : (p.video ? '<video src="' + esc(KF.src(p.video)) + '#t=0.5" muted playsinline preload="metadata"></video>' : '');
    return '<button class="promo' + (p.theme === 'white' ? ' promo--white' : '') + '" style="--bg:' + t.bg + ';--fg:' + t.fg + '" data-promo="' + esc(p.id) + '"><div class="promo__img">' + media + (p.badge ? '<span class="promo__badge">' + esc(p.badge) + '</span>' : '') + '</div>' +
      '<div class="promo__body"><h3 class="promo__title">' + esc(p.title) + '</h3><p class="promo__text">' + esc(p.text) + '</p>' +
      '<div class="promo__foot"><span>' + esc(promoDate(p)) + '</span><span class="go"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div></div></button>';
  }
  function renderPromos() {
    var live = D.promos.filter(function (p) { return KF.promoLive(p) && p.hero !== false; });
    if (!live.length) return;
    $('#promos').hidden = false;
    $('#promoRow').innerHTML = live.map(promoCard).join('');
  }
  $('#promoRow').addEventListener('click', function (e) {
    var b = e.target.closest('[data-promo]'); if (!b) return;
    var p = D.promos.filter(function (x) { return x.id === b.getAttribute('data-promo'); })[0]; if (p) openPromo(p);
  });
  function openPromo(p) {
    var media = p.video ? '<video src="' + esc(KF.src(p.video)) + '" controls autoplay muted playsinline' + (p.image ? ' poster="' + esc(KF.src(p.image)) + '"' : '') + '></video>' : (p.image ? '<img src="' + esc(KF.src(p.image)) + '" alt="">' : '');
    var act = p.applyTo === 'cat' || p.applyTo === 'all' || p.applyTo === 'items';
    $('#prmBody').innerHTML = (media ? '<div class="prm__media">' + media + '</div>' : '') +
      '<div class="prm__body"><span class="prm__date">' + esc(promoDate(p)) + '</span><h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p>' +
      (act ? '<button class="btn btn--red" id="prmGo"><span>' + esc(p.button || 'Смотреть товары') + '</span><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>'
        : '<a class="btn btn--wa" target="_blank" rel="noopener" href="' + esc(waLink(S.whatsappShoes || S.whatsappWear, 'Здравствуйте! Хочу узнать про акцию «' + p.title + '»')) + '">' + icon('wa') + '<span>' + esc(p.button || 'Спросить в WhatsApp') + '</span></a>') + '</div>';
    openModal('#prm');
    var g = $('#prmGo');
    if (g) g.addEventListener('click', function () {
      closeModal('#prm');
      if (p.applyTo === 'cat' && p.cats && p.cats[0]) { var c = catOf(p.cats[0]); go(c ? c.store || 'shoes' : 'shoes', p.cats[0]); }
      else { F.sort = 'sale'; $('#sortSel').value = 'sale'; go(F.store); }
    });
  }

  /* ================= КАТАЛОГ ================= */
  function storeItems(st) { return visible().filter(function (it) { return storeOf(it) === st; }); }
  function renderCatalogUI() {
    var list = storeItems(F.store);
    var counts = {}; list.forEach(function (it) { counts[it.cat] = (counts[it.cat] || 0) + 1; });
    var cats = D.cats.filter(function (c) { return (c.store || 'shoes') === F.store && counts[c.id]; });
    $('#catChips').innerHTML = '<button class="chip' + (F.cat ? '' : ' on') + '" data-cat="">Все <small>' + list.length + '</small></button>' +
      cats.map(function (c) { return '<button class="chip' + (F.cat === c.id ? ' on' : '') + '" data-cat="' + esc(c.id) + '">' + esc(c.name) + ' <small>' + counts[c.id] + '</small></button>'; }).join('');
    var sizes = {}, brands = {};
    list.forEach(function (it) { KF.sizesIn(it).forEach(function (s) { sizes[s.s] = 1; }); if (it.brand) brands[it.brand] = 1; });
    var order = (F.store === 'shoes' ? KF.SIZE_PRESETS.shoes.list : KF.SIZE_PRESETS.clothes.list.concat(KF.SIZE_PRESETS.ru.list, KF.SIZE_PRESETS.jeans.list, ['ONE SIZE']));
    var sl = Object.keys(sizes).sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); if (ia < 0) ia = 99 + (parseFloat(a) || 0); if (ib < 0) ib = 99 + (parseFloat(b) || 0); return ia - ib; });
    if (sl.indexOf(F.size) < 0) F.size = '';
    $('#sizeSel').innerHTML = '<option value="">Размер</option>' + sl.map(function (s) { return '<option' + (s === F.size ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('');
    var bl = Object.keys(brands).sort();
    if (bl.indexOf(F.brand) < 0) F.brand = '';
    $('#brandSel').innerHTML = '<option value="">Бренд</option>' + bl.map(function (b) { return '<option' + (b === F.brand ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('');
    $$('#storeSeg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-store') === F.store); });
    $('#catTitle').textContent = KF.STORES[F.store].name;
    movePill();
  }
  function movePill() {
    var on = $('#storeSeg button.on'), pill = $('.seg__pill'); if (!on) return;
    pill.style.width = on.offsetWidth + 'px'; pill.style.transform = 'translateX(' + (on.offsetLeft - 5) + 'px)';
  }
  window.addEventListener('resize', movePill);
  function filtered() {
    var q = KF.norm(F.q).trim();
    var list = storeItems(F.store).filter(function (it) {
      if (F.cat && it.cat !== F.cat) return false;
      if (F.brand && it.brand !== F.brand) return false;
      if (F.size && !KF.sizesIn(it).some(function (s) { return s.s === F.size; })) return false;
      if (q) { var c = catOf(it.cat); if (KF.norm(it.name + ' ' + it.brand + ' ' + (c ? c.name : '')).indexOf(q) < 0) return false; }
      return true;
    });
    var withP = list.map(function (it, i) { return { it: it, pr: KF.pricing(it, D.promos), i: i }; });
    withP.sort(function (a, b) {
      var sa = KF.inStock(a.it) ? 0 : 1, sb = KF.inStock(b.it) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      if (F.sort === 'cheap') return a.pr.price - b.pr.price;
      if (F.sort === 'exp') return b.pr.price - a.pr.price;
      if (F.sort === 'sale') return (b.pr.pct - a.pr.pct) || a.i - b.i;
      var na = (a.it.tags || []).indexOf('new') >= 0 ? 0 : 1, nb = (b.it.tags || []).indexOf('new') >= 0 ? 0 : 1;
      return (na - nb) || a.i - b.i;
    });
    if (F.sort === 'sale') withP = withP.filter(function (x) { return x.pr.pct > 0; }).concat(withP.filter(function (x) { return !x.pr.pct; }));
    return withP;
  }
  function cardHtml(x, n) {
    var it = x.it, pr = x.pr, st = storeOf(it), ph = (it.photos || [])[0], ph2 = (it.photos || [])[1];
    var b = [];
    if (pr.pct > 0) b.push('<span class="badge badge--sale">−' + pr.pct + '%</span>');
    if ((it.tags || []).indexOf('new') >= 0) b.push('<span class="badge badge--new">New</span>');
    if ((it.tags || []).indexOf('hit') >= 0) b.push('<span class="badge badge--hit">Хит</span>');
    if ((it.tags || []).indexOf('last') >= 0) b.push('<span class="badge">Последние</span>');
    if ((it.tags || []).indexOf('gift') >= 0) b.push('<span class="badge">Подарок</span>');
    var sz = (it.sizes || []).filter(function (s) { return s.s !== 'ONE SIZE'; }).slice(0, 8).map(function (s) { return '<span' + (+s.q > 0 ? '' : ' class="no"') + '>' + esc(s.s) + '</span>'; }).join('');
    var c = catOf(it.cat);
    return '<article class="card card--' + st + '" style="--d:' + Math.min(n % PAGE, 11) * 0.05 + 's" data-id="' + esc(it.id) + '" tabindex="0" role="button" aria-label="' + esc((it.brand ? it.brand + ' ' : '') + it.name) + '">' +
      '<div class="card__media">' + (ph ? '<img src="' + esc(KF.src(ph)) + '" alt="" loading="lazy">' : '') + (ph2 ? '<img class="alt" src="' + esc(KF.src(ph2)) + '" alt="" loading="lazy">' : '') +
      '<span class="card__shine"></span><div class="badges">' + b.join('') + '</div>' +
      (it.video ? '<span class="card__vid"><svg viewBox="0 0 12 14"><path d="M0 0l12 7-12 7z" fill="#fff"/></svg></span>' : '') +
      (KF.inStock(it) ? '<button class="card__add" data-add aria-label="Выбрать размер и добавить в корзину"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' : '<div class="card__out">Нет в наличии</div>') + '</div>' +
      '<div class="card__body"><div class="card__brand">' + esc(it.brand || (c ? c.name : '')) + '</div><h3 class="card__title">' + esc(it.name) + '</h3>' +
      '<div class="card__price' + (pr.old ? ' sale' : '') + '"><b>' + money(pr.price) + '</b>' + (pr.old ? '<s>' + money(pr.old) + '</s>' : '') + '</div>' + (sz ? '<div class="card__sizes">' + sz + '</div>' : '') + '</div></article>';
  }
  function renderGrid(append) {
    var list = filtered();
    var from = append ? $$('#grid .card').length : 0;
    var show = list.slice(from, F.limit);
    if (append) $('#grid').insertAdjacentHTML('beforeend', show.map(function (x, i) { return cardHtml(x, from + i); }).join(''));
    else $('#grid').innerHTML = show.map(cardHtml).join('');
    $('#empty').hidden = list.length > 0;
    $('#moreBtn').hidden = list.length <= F.limit;
    $('#moreBtn').textContent = 'Показать ещё · ' + (list.length - F.limit);
  }
  function refilter() { F.limit = PAGE; renderGrid(); }
  function go(st, cat) {
    F.store = st; F.cat = cat || ''; F.limit = PAGE;
    renderCatalogUI(); renderGrid();
    var el = $('#catalog'); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
  }
  $('#storeSeg').addEventListener('click', function (e) { var b = e.target.closest('[data-store]'); if (!b || b.getAttribute('data-store') === F.store) return; F.store = b.getAttribute('data-store'); F.cat = ''; F.limit = PAGE; renderCatalogUI(); renderGrid(); });
  $('#catChips').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; F.cat = b.getAttribute('data-cat'); $$('#catChips .chip').forEach(function (c) { c.classList.toggle('on', c === b); }); refilter(); });
  var qt;
  $('#q').addEventListener('input', function (e) { clearTimeout(qt); qt = setTimeout(function () { F.q = e.target.value; refilter(); }, 160); });
  $('#sizeSel').addEventListener('change', function (e) { F.size = e.target.value; refilter(); });
  $('#brandSel').addEventListener('change', function (e) { F.brand = e.target.value; refilter(); });
  $('#sortSel').addEventListener('change', function (e) { F.sort = e.target.value; refilter(); });
  $('#moreBtn').addEventListener('click', function () { F.limit += PAGE; renderGrid(true); });
  $('#resetF').addEventListener('click', function () { F.cat = ''; F.q = ''; F.size = ''; F.brand = ''; F.sort = ''; $('#q').value = ''; $('#sortSel').value = ''; renderCatalogUI(); refilter(); });
  document.addEventListener('click', function (e) {
    var l = e.target.closest('[data-store-link]'); if (!l) return;
    e.preventDefault(); closeMenu(); go(l.getAttribute('data-store-link'));
  });
  $('#grid').addEventListener('click', function (e) {
    var c = e.target.closest('.card'); if (!c) return;
    openProduct(itemById(c.getAttribute('data-id')));
  });
  $('#grid').addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); e.target.click(); } });

  /* ================= ОБРАЗЫ ================= */
  function renderLookbook() {
    var lb = (S.lookbook || []).filter(Boolean);
    if (!lb.length) { $('#lookbook').hidden = true; return; }
    var one = lb.map(function (r, i) { return '<button class="lb__item" data-lb="' + i + '"><img src="' + esc(KF.src(r)) + '" alt="Образ ' + (i + 1) + '" loading="lazy"></button>'; }).join('');
    $('#lbTrack').innerHTML = one + one;
    $('#lbTrack').style.animationDuration = Math.max(30, lb.length * 7) + 's';
    $('#lbTrack').addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]'); if (!b) return;
      var ref = lb[+b.getAttribute('data-lb')];
      window.open(waLink(S.whatsappWear || S.whatsappShoes, 'Здравствуйте! Понравился образ с сайта KROSSFIN, есть ли в наличии? ' + absUrl(ref)), '_blank', 'noopener');
    });
  }

  /* ================= КАРТОЧКА ТОВАРА ================= */
  var P = null; // { it, size, qty }
  function openProduct(it) {
    if (!it) return;
    P = { it: it, size: '', qty: 1 };
    var st = storeOf(it), pr = KF.pricing(it, D.promos), c = catOf(it.cat);
    var media = (it.photos || []).map(function (p) { return { t: 'img', r: p }; });
    if (it.video) media.push({ t: 'vid', r: it.video });
    $('#pmMain').className = 'pm__main' + (st === 'shoes' ? ' shoes' : '');
    function showMedia(i) {
      var m = media[i]; if (!m) { $('#pmMain').innerHTML = ''; return; }
      $('#pmMain').innerHTML = m.t === 'vid' ? '<video src="' + esc(KF.src(m.r)) + '" controls autoplay muted playsinline loop></video>' : '<img src="' + esc(KF.src(m.r)) + '" alt="' + esc(it.name) + '">';
      $('#pmMain').classList.toggle('shoes', st === 'shoes' && m.t !== 'vid');
      $$('#pmThumbs button').forEach(function (b, n) { b.classList.toggle('on', n === i); });
    }
    $('#pmThumbs').innerHTML = media.length > 1 ? media.map(function (m, i) { return '<button type="button" data-m="' + i + '">' + (m.t === 'vid' ? '<video src="' + esc(KF.src(m.r)) + '#t=0.5" muted preload="metadata"></video>' : '<img src="' + esc(KF.src(m.r)) + '" alt="">') + '</button>'; }).join('') : '';
    $('#pmThumbs').onclick = function (e) { var b = e.target.closest('[data-m]'); if (b) showMedia(+b.getAttribute('data-m')); };
    showMedia(0);
    $('#pmBrand').textContent = (it.brand ? it.brand + ' · ' : '') + (c ? c.name : '');
    $('#pmName').textContent = it.name;
    $('#pmPrice').innerHTML = '<b>' + money(pr.price) + '</b>' + (pr.old ? '<s>' + money(pr.old) + '</s><span class="badge badge--sale">−' + pr.pct + '%</span>' : '');
    $('#pmPromo').hidden = !pr.promo;
    if (pr.promo) $('#pmPromo').textContent = '🔥 Акция «' + pr.promo.title + '» — цена уже со скидкой ' + pr.promo.percent + '%';
    $('#pmDesc').textContent = it.desc || '';
    var sizes = it.sizes || [];
    if (sizes.length === 1 && KF.sizesIn(it).length === 1) P.size = sizes[0].s;
    $('#pmSizes').innerHTML = sizes.length ? sizes.map(function (s) { var q = +s.q || 0; return '<button type="button" data-s="' + esc(s.s) + '"' + (q ? '' : ' disabled') + (P.size === s.s ? ' class="on"' : '') + '>' + esc(s.s) + (q === 1 ? '<span class="last">1 шт</span>' : '') + '</button>'; }).join('') : '<p style="margin:0;color:var(--muted)">Размер уточним в WhatsApp</p>';
    $('#pmSizeHint').textContent = KF.inStock(it) ? (sizes.length ? 'Нет вашего? Напишите — привезём' : '') : 'Сейчас нет в наличии';
    $('#pmQty').textContent = '1';
    $('#pmAdd').disabled = !KF.inStock(it);
    $('#pmAdd').querySelector('span').textContent = KF.inStock(it) ? 'В корзину' : 'Нет в наличии';
    openModal('#pm');
    try { history.replaceState(null, '', '#p=' + encodeURIComponent(it.id)); } catch (e) { }
  }
  $('#pmSizes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-s]'); if (!b || b.disabled) return;
    P.size = b.getAttribute('data-s');
    $$('#pmSizes button').forEach(function (x) { x.classList.toggle('on', x === b); });
  });
  $('#pm').addEventListener('click', function (e) {
    var q = e.target.closest('[data-qty]'); if (!q || !P) return;
    var max = maxQty(P.it, P.size);
    P.qty = Math.max(1, Math.min(max || 9, P.qty + +q.getAttribute('data-qty')));
    $('#pmQty').textContent = P.qty;
  });
  function maxQty(it, size) { var s = (it.sizes || []).filter(function (x) { return x.s === size; })[0]; return s ? +s.q || 0 : 9; }
  function needSize() {
    if (!P) return true;
    if ((P.it.sizes || []).length && !P.size) {
      var box = $('#pmSizes'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      $('#pmSizeHint').textContent = 'Выберите размер'; $('#pmSizeHint').style.color = 'var(--red-2)';
      setTimeout(function () { $('#pmSizeHint').style.color = ''; }, 1500);
      return true;
    }
    return false;
  }
  $('#pmAdd').addEventListener('click', function () {
    if (needSize()) return;
    addToCart(P.it, P.size, P.qty);
    closeModal('#pm');
    toast('Добавили в корзину', 'Открыть', openCart);
  });
  $('#pmWa').addEventListener('click', function () {
    if (!P) return;
    var it = P.it, pr = KF.pricing(it, D.promos);
    var txt = 'Здравствуйте! Хочу заказать с сайта KROSSFIN:\n' + (it.brand ? it.brand + ' ' : '') + it.name + (P.size ? ', размер ' + P.size : '') + (P.qty > 1 ? ' × ' + P.qty : '') + ' — ' + money(pr.price * P.qty) + '\n' + absUrl((it.photos || [])[0] || '') + '\nЕсть в наличии?';
    window.open(waLink(storeWa(storeOf(it)), txt), '_blank', 'noopener');
  });

  /* ================= КОРЗИНА ================= */
  var CART_KEY = 'kf_cart_v1', ORDER_KEY = 'kf_order_v1';
  var cart = [];
  try { cart = JSON.parse(store(CART_KEY) || '[]') || []; } catch (e) { cart = []; }
  function saveCart() { store(CART_KEY, JSON.stringify(cart)); updateCart(); }
  function addToCart(it, size, qty) {
    var row = cart.filter(function (r) { return r.id === it.id && r.size === (size || ''); })[0];
    var max = (it.sizes || []).length ? maxQty(it, size) : 9;
    if (row) row.qty = Math.min(max || 9, row.qty + qty); else cart.push({ id: it.id, size: size || '', qty: Math.min(max || 9, qty) });
    saveCart();
    var b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  }
  function lines() {
    if (!D) return [];
    return cart.map(function (r) { var it = itemById(r.id); if (!it || it.status === 'hidden') return null; var pr = KF.pricing(it, D.promos); return { r: r, it: it, pr: pr, st: storeOf(it) }; }).filter(Boolean);
  }
  function updateCart() {
    var n = lines().reduce(function (a, l) { return a + l.r.qty; }, 0);
    $('#cartCount').hidden = !n; $('#cartCount').textContent = n;
    $('#fab').hidden = !n || window.innerWidth > 900; $('#fabCount').textContent = n;
    if (!$('#cart').hidden) renderCart();
  }
  window.addEventListener('resize', function () { var n = cart.length; $('#fab').hidden = !n || window.innerWidth > 900; });
  function openCart() { renderCart(); openModal('#cart'); }
  $('#cartBtn').addEventListener('click', openCart);
  $('#fab').addEventListener('click', openCart);
  function renderCart() {
    var L = lines();
    $('#cartN').textContent = L.length ? L.reduce(function (a, l) { return a + l.r.qty; }, 0) : '';
    if (!L.length) {
      $('#cartBody').innerHTML = '<div class="cart-empty"><svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><b>Корзина пуста</b><p style="margin:0">Выберите кроссовки или одежду в каталоге</p><button class="btn btn--red btn--sm" data-go-shop>Перейти в каталог</button></div>';
      $('#cartFoot').innerHTML = ''; $('#cartFoot').hidden = true; return;
    }
    $('#cartFoot').hidden = false;
    var o = {}; try { o = JSON.parse(store(ORDER_KEY) || '{}') || {}; } catch (e) { o = {}; }
    var rows = L.map(function (l, i) {
      var max = (l.it.sizes || []).length ? maxQty(l.it, l.r.size) : 9;
      var warn = (l.it.sizes || []).length && max < l.r.qty ? '<em style="color:var(--red-2)">' + (max ? 'В наличии только ' + max + ' шт' : 'Размер закончился — уточним') + '</em>' : '';
      return '<div class="ci" data-i="' + i + '"><div class="ci__img' + (l.st === 'shoes' ? ' shoes' : '') + '">' + ((l.it.photos || [])[0] ? '<img src="' + esc(KF.src(l.it.photos[0])) + '" alt="">' : '') + '</div>' +
        '<div class="ci__info"><small>' + esc(l.it.brand || KF.STORES[l.st].name) + '</small><b>' + esc(l.it.name) + '</b>' + (l.r.size ? '<em>Размер: ' + esc(l.r.size) + '</em>' : '') + warn + '</div>' +
        '<div class="ci__side"><b>' + money(l.pr.price * l.r.qty) + '</b><div class="qty"><button type="button" data-cq="-1" aria-label="Меньше">−</button><span>' + l.r.qty + '</span><button type="button" data-cq="1" aria-label="Больше">+</button></div><button class="ci__rm" data-rm>Удалить</button></div></div>';
    }).join('');
    function opt(name, val, label) { return '<label><input type="radio" name="' + name + '" value="' + esc(val) + '"' + ((o[name] || '') === val ? ' checked' : '') + '><span>' + esc(label) + '</span></label>'; }
    if (!o.del) o.del = 'pickup'; if (!o.pay) o.pay = 'kaspi';
    rows += '<form class="order" id="orderForm" autocomplete="on">' +
      '<h4>Ваши данные</h4><input class="inp" name="name" placeholder="Имя" value="' + esc(o.name || '') + '" autocomplete="name">' +
      '<input class="inp" name="phone" placeholder="Телефон (по желанию)" inputmode="tel" value="' + esc(o.phone || '') + '" autocomplete="tel">' +
      '<h4>Получение</h4><div class="opts">' + opt('del', 'pickup', 'Заберу в бутике') + opt('del', 'krg', 'Доставка по Караганде') + opt('del', 'kz', 'Доставка по Казахстану') + '</div>' +
      '<input class="inp" name="addr" placeholder="Город и адрес доставки" value="' + esc(o.addr || '') + '"' + (o.del === 'pickup' ? ' hidden' : '') + '>' +
      '<h4>Оплата</h4><div class="opts">' + opt('pay', 'kaspi', 'Kaspi перевод') + opt('pay', 'red', 'Kaspi Red') + opt('pay', 'credit', 'Рассрочка 0-0-12') + opt('pay', 'cash', 'Наличными') + '</div>' +
      '<textarea class="inp" name="note" placeholder="Комментарий к заказу">' + esc(o.note || '') + '</textarea></form>';
    $('#cartBody').innerHTML = rows;
    var sum = L.reduce(function (a, l) { return a + l.pr.price * l.r.qty; }, 0), old = L.reduce(function (a, l) { return a + (l.pr.old || l.pr.price) * l.r.qty; }, 0);
    var stores = ['shoes', 'wear'].filter(function (s) { return L.some(function (l) { return l.st === s; }); });
    var f = '<div class="total"><span>Итого</span><div>' + (old > sum ? '<s>' + money(old) + '</s>' : '') + '<b>' + money(sum) + '</b></div></div>';
    if (stores.length > 1) f += '<p class="split-note">У кроссовок и одежды разные менеджеры — отправьте заказ в оба чата, это займёт секунду.</p>';
    f += stores.map(function (s) { return '<button class="btn btn--wa btn--block" data-send="' + s + '">' + icon('wa') + '<span>' + (stores.length > 1 ? 'Отправить: ' + KF.STORES[s].name.toLowerCase() : 'Оформить заказ в WhatsApp') + '</span></button>'; }).join('');
    f += '<p class="send-hint">Откроется WhatsApp с готовым сообщением — менеджер подтвердит наличие и доставку</p><button class="clear-cart" data-clear>Очистить корзину</button>';
    $('#cartFoot').innerHTML = f;
  }
  function readOrder() {
    var fm = $('#orderForm'); if (!fm) return {};
    var o = { name: fm.name.value.trim(), phone: fm.phone.value.trim(), addr: fm.addr.value.trim(), note: fm.note.value.trim(), del: (fm.querySelector('[name=del]:checked') || {}).value || 'pickup', pay: (fm.querySelector('[name=pay]:checked') || {}).value || 'kaspi' };
    store(ORDER_KEY, JSON.stringify(o)); return o;
  }
  $('#cartBody').addEventListener('input', function () { readOrder(); });
  $('#cartBody').addEventListener('change', function (e) { if (e.target.name === 'del') { var o = readOrder(); $('#orderForm').addr.hidden = o.del === 'pickup'; if (o.del !== 'pickup') $('#orderForm').addr.focus(); } });
  $('#cartBody').addEventListener('click', function (e) {
    if (e.target.closest('[data-go-shop]')) { closeModal('#cart'); go(F.store); return; }
    var ci = e.target.closest('.ci'); if (!ci) return;
    var L = lines(), l = L[+ci.getAttribute('data-i')]; if (!l) return;
    var q = e.target.closest('[data-cq]');
    if (q) { var max = (l.it.sizes || []).length ? maxQty(l.it, l.r.size) || 1 : 9; l.r.qty = Math.max(1, Math.min(max, l.r.qty + +q.getAttribute('data-cq'))); saveCart(); renderCart(); }
    if (e.target.closest('[data-rm]')) { cart.splice(cart.indexOf(l.r), 1); saveCart(); renderCart(); }
  });
  $('#cartFoot').addEventListener('click', function (e) {
    if (e.target.closest('[data-clear]')) { if (confirm('Очистить корзину?')) { cart = []; saveCart(); renderCart(); } return; }
    var b = e.target.closest('[data-send]'); if (!b) return;
    var st = b.getAttribute('data-send'), o = readOrder();
    var L = lines().filter(function (l) { return l.st === st; });
    var DEL = { pickup: 'Самовывоз из бутика (' + (S.address || 'ТД «Абсолют»') + ')', krg: 'Доставка по Караганде', kz: 'Доставка по Казахстану' };
    var PAY = { kaspi: 'Kaspi перевод', red: 'Kaspi Red', credit: 'Рассрочка 0-0-12', cash: 'Наличными' };
    var sum = 0;
    var txt = 'Здравствуйте! Заказ с сайта KROSSFIN (' + KF.STORES[st].name.toLowerCase() + '):\n\n' + L.map(function (l, i) {
      sum += l.pr.price * l.r.qty;
      return (i + 1) + '. ' + (l.it.brand ? l.it.brand + ' ' : '') + l.it.name + (l.r.size ? ' — р. ' + l.r.size : '') + ' × ' + l.r.qty + ' = ' + money(l.pr.price * l.r.qty);
    }).join('\n') + '\n\nИтого: ' + money(sum) +
      '\n\nПолучение: ' + DEL[o.del] + (o.del !== 'pickup' && o.addr ? ', ' + o.addr : '') + '\nОплата: ' + PAY[o.pay] +
      (o.name ? '\nИмя: ' + o.name : '') + (o.phone ? '\nТелефон: ' + o.phone : '') + (o.note ? '\nКомментарий: ' + o.note : '');
    if (o.del !== 'pickup' && !o.addr) { $('#orderForm').addr.focus(); toast('Укажите адрес доставки'); return; }
    window.open(waLink(storeWa(st), txt), '_blank', 'noopener');
    b.querySelector('span').textContent = '✓ Отправлено в WhatsApp';
  });

  /* ================= ПОИСК ================= */
  $('#searchBtn').addEventListener('click', function () { openModal('#sm'); $('#sq').value = ''; searchRes(''); setTimeout(function () { $('#sq').focus(); }, 60); });
  $('#sq').addEventListener('input', function (e) { searchRes(e.target.value); });
  function searchRes(q) {
    q = KF.norm(q).trim();
    var list = visible().filter(function (it) { var c = catOf(it.cat); return !q || KF.norm(it.name + ' ' + it.brand + ' ' + (c ? c.name : '')).indexOf(q) >= 0; }).slice(0, q ? 30 : 8);
    $('#sres').innerHTML = list.length ? list.map(function (it) {
      var pr = KF.pricing(it, D.promos), st = storeOf(it);
      return '<button class="sr" data-id="' + esc(it.id) + '"><img class="' + st + '" src="' + esc(KF.src((it.photos || [])[0])) + '" alt=""><span><small>' + esc(it.brand || KF.STORES[st].name) + '</small><b>' + esc(it.name) + '</b></span><em>' + money(pr.price) + '</em></button>';
    }).join('') : '<p class="sm__empty">Ничего не нашли. Напишите нам в WhatsApp — подскажем.</p>';
  }
  $('#sres').addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (!b) return; closeModal('#sm'); openProduct(itemById(b.getAttribute('data-id'))); });

  /* ================= ОКНА ================= */
  var openStack = [];
  function openModal(sel) {
    var m = $(sel); if (!m.hidden) return;
    m.hidden = false; openStack.push(sel); document.body.classList.add('lock');
  }
  function closeModal(sel) {
    var m = $(sel); if (m.hidden) return;
    m.hidden = true; openStack = openStack.filter(function (x) { return x !== sel; });
    $$('video', m).forEach(function (v) { v.pause(); });
    if (sel === '#pm') { P = null; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } }
    if (!openStack.length) document.body.classList.remove('lock');
  }
  $$('.modal, .drawer').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeModal('#' + m.id); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openStack.length) closeModal(openStack[openStack.length - 1]); });

  /* ================= МЕНЮ, ШАПКА, АНИМАЦИИ ================= */
  function closeMenu() { $('#menu').hidden = true; $('#burger').setAttribute('aria-expanded', 'false'); if (!openStack.length) document.body.classList.remove('lock'); }
  $('#burger').addEventListener('click', function () {
    var open = $('#menu').hidden; $('#menu').hidden = !open; this.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('lock', open);
  });
  $('#menu').addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  $('#topLogo').addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  var top = $('#top');
  window.addEventListener('scroll', function () { top.classList.toggle('scrolled', window.scrollY > 40); }, { passive: true });
  $$('[data-scroll]').forEach(function (b) { b.addEventListener('click', function () { var r = $('#' + b.getAttribute('data-scroll')); r.scrollBy({ left: +b.getAttribute('data-dir') * r.clientWidth * .8, behavior: 'smooth' }); }); });
  var glow = $('.cursor-glow'), gx = 0, gy = 0, raf = 0;
  window.addEventListener('pointermove', function (e) { gx = e.clientX; gy = e.clientY; if (!raf) raf = requestAnimationFrame(function () { glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)'; raf = 0; }); }, { passive: true });
  function observe() {
    var els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e, i) { if (!e.style.getPropertyValue('--d')) e.style.setProperty('--d', (i % 4) * 0.08 + 's'); io.observe(e); });
  }

  /* ================= УВЕДОМЛЕНИЕ ================= */
  var tt;
  function toast(msg, btn, fn) {
    var t = $('#toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (btn ? '<button type="button">' + esc(btn) + '</button>' : '');
    if (btn) t.querySelector('button').onclick = function () { t.classList.remove('show'); fn(); };
    t.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }
})();
