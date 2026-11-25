/* Общие данные и функции сайта и админки KROSSFIN */
(function (w) {
  'use strict';

  /* Сервер админки (Cloudflare Worker): каталог, фото и видео */
  var API = 'https://krossfin-admin.sentora-admin-worker.workers.dev';
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]api=local/.test(location.search)) API = 'http://127.0.0.1:8797';
  var BASE = w.KF_BASE || '';

  /* Два магазина под одной крышей: у каждого свой WhatsApp и Instagram */
  var STORES = {
    shoes: { id: 'shoes', name: 'Кроссовки', short: 'Кроссовки', ig: 'instagramShoes', wa: 'whatsappShoes', handle: '@krossfin_kz' },
    wear: { id: 'wear', name: 'Одежда', short: 'Одежда', ig: 'instagramWear', wa: 'whatsappWear', handle: '@krossfin.wear' }
  };

  var SIZE_PRESETS = {
    shoes: { name: 'Обувь (36–46)', list: ['36', '36.5', '37', '37.5', '38', '38.5', '39', '40', '40.5', '41', '42', '42.5', '43', '44', '44.5', '45', '46'] },
    clothes: { name: 'Одежда (XS–3XL)', list: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
    ru: { name: 'Одежда (42–56)', list: ['42', '44', '46', '48', '50', '52', '54', '56'] },
    jeans: { name: 'Джинсы (W)', list: ['28', '29', '30', '31', '32', '33', '34', '36', '38'] },
    one: { name: 'Один размер', list: ['ONE SIZE'] }
  };

  var GENDER = { his: 'Мужское', her: 'Женское', uni: 'Унисекс' };
  var TAGS = { new: 'Новинка', hit: 'Хит', last: 'Последние размеры', gift: 'Подарок' };
  var BRANDS = ['Nike', 'Jordan', 'Adidas', 'New Balance', 'ASICS', 'Onitsuka Tiger', 'Puma', 'Reebok', 'Salomon', 'Hoka', 'On', 'Mizuno', 'Timberland', 'The North Face', 'Moncler', 'Canada Goose', 'Stone Island', 'Corteiz', 'Vetements', 'Balenciaga', 'Golden Goose', 'Dior', 'Valentino', 'Maison Margiela', 'Marcelo Burlon', 'Acne Studios', 'Polo Ralph Lauren', 'Lacoste', 'Essentials', 'Hellstar'];

  var PROMO_THEMES = {
    red: { name: 'Красный', bg: '#E3262B', fg: '#FFFFFF' },
    black: { name: 'Чёрный', bg: '#111113', fg: '#FFFFFF' },
    wine: { name: 'Бордо', bg: '#6E0B12', fg: '#FFFFFF' },
    white: { name: 'Белый', bg: '#F4F3F0', fg: '#0B0B0C' }
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return (Math.round(+n) || 0).toLocaleString('ru-RU').replace(/[  ]/g, ' ') + ' ₸'; }
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); }
  function uid(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function phonePretty(s) { var d = digits(s); if (d.length === 11) return '+' + d[0] + ' ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7, 9) + ' ' + d.slice(9); return s; }
  function waNum(s) { var d = digits(s); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); if (d.length === 10) d = '7' + d; return d; }

  /* ---------- Каталог: сначала с сервера, если пусто или нет связи — из файла на сайте ---------- */
  function fileCatalog() { return fetch(BASE + 'data/catalog.json?t=' + Date.now()).then(function (r) { return r.json(); }); }
  function loadCatalog() {
    var ctl = w.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
    return fetch(API + '/catalog', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('empty'); return r.json(); })
      .then(function (d) { return { data: d, server: true }; })
      .catch(function () { clearTimeout(t); return fileCatalog().then(function (d) { return { data: d, server: false }; }); });
  }

  /* ---------- Файлы: kv:<id> — файл на сервере, остальное — файл на сайте ---------- */
  function src(ref) {
    if (!ref) return '';
    if (ref.indexOf('kv:') === 0) return API + '/m/' + ref.slice(3);
    if (/^(https?:|data:|blob:|\/)/.test(ref)) return ref;
    return BASE + ref;
  }

  function uploadFile(blob, token, onProgress) {
    var type = blob.type || 'application/octet-stream';
    if (type === 'video/x-m4v') type = 'video/mp4';
    var h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
    function call(path, opts) {
      return fetch(API + path, opts).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || ('Ошибка ' + r.status)); e.status = r.status; throw e; } return j; });
      });
    }
    return call('/admin/upload/start', { method: 'POST', headers: h, body: JSON.stringify({ type: type, size: blob.size }) }).then(function (s) {
      var i = 0;
      function next() {
        if (i >= s.parts) return call('/admin/upload/' + s.id + '/finish', { method: 'POST', headers: h, body: JSON.stringify({ type: type, size: blob.size }) });
        var part = blob.slice(i * s.chunk, Math.min(blob.size, (i + 1) * s.chunk));
        return call('/admin/upload/' + s.id + '/' + i, { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/octet-stream' }, body: part })
          .then(function () { i++; if (onProgress) onProgress(i / s.parts); return next(); });
      }
      return next();
    }).then(function (f) { return f.ref; });
  }

  /* Сжатие фото перед загрузкой (прозрачность PNG сохраняется — webp) */
  function compressImage(file, max) {
    max = max || 1600;
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('Не удалось обработать фото')); }, 'image/webp', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Не удалось открыть фото')); };
      img.src = u;
    });
  }

  /* ---------- Акции и цены ---------- */
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function promoLive(p) {
    if (!p || !p.active) return false;
    var t = today();
    if (p.from && t < p.from) return false;
    if (p.to && t > p.to) return false;
    return true;
  }
  function promoHits(p, it) {
    if (!(+p.percent > 0) || !p.applyTo || p.applyTo === 'none') return false;
    if (p.applyTo === 'all') return true;
    if (p.applyTo === 'cat') return (p.cats || []).indexOf(it.cat) >= 0;
    if (p.applyTo === 'items') return (p.items || []).indexOf(it.id) >= 0;
    return false;
  }
  function pricing(it, promos) {
    var base = +it.price || 0, old = +it.oldPrice > base ? +it.oldPrice : 0;
    var best = null;
    (promos || []).forEach(function (p) {
      if (promoLive(p) && promoHits(p, it) && (!best || +p.percent > +best.percent)) best = p;
    });
    var price = base;
    if (best) { price = Math.round(base * (1 - best.percent / 100) / 10) * 10; if (!old) old = base; }
    var pct = old ? Math.round((1 - price / old) * 100) : 0;
    return { price: price, old: old, pct: pct, promo: best };
  }

  function sizesIn(it) { return (it.sizes || []).filter(function (s) { return +s.q > 0; }); }
  function inStock(it) { return !it.sizes || !it.sizes.length || sizesIn(it).length > 0; }

  /* ---------- Логотип: красный значок + надпись KROSSFIN ---------- */
  function mark(cls) {
    return '<svg class="kf-mark ' + (cls || '') + '" viewBox="0 0 64 64" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="31" fill="#E3262B"/><circle cx="32" cy="32" r="26.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="2 3"/>' +
      '<path d="M21 17h8.4v11.6L39.6 17H50L37.6 30.2 51 47H40.4l-9-11.6-2 2.1V47H21z" fill="#fff" transform="skewX(-8) translate(4 0)"/></svg>';
  }
  function logo(cls) {
    return '<span class="kf-logo ' + (cls || '') + '">' + mark() + '<span class="kf-logo__t">KROSSFIN<small>Караганда</small></span></span>';
  }

  w.KF = {
    API: API, BASE: BASE, STORES: STORES, SIZE_PRESETS: SIZE_PRESETS, GENDER: GENDER, TAGS: TAGS, BRANDS: BRANDS, PROMO_THEMES: PROMO_THEMES,
    esc: esc, money: money, norm: norm, uid: uid, digits: digits, phonePretty: phonePretty, waNum: waNum,
    loadCatalog: loadCatalog, src: src, uploadFile: uploadFile, compressImage: compressImage,
    promoLive: promoLive, pricing: pricing, sizesIn: sizesIn, inStock: inStock, logo: logo, mark: mark, today: today
  };
})(window);
