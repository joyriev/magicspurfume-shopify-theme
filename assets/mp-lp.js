/* Magic Perfume bundle LP - page script (Shopify build).
   Same behaviour as the static index.html IIFE; differences: root = document, every store constant and every
   visible string comes from the core section's <script data-mp-config> JSON, money is formatted the way the shop
   formats it, after the last bottle the theme cart drawer opens (or /cart, or /checkout, per config), a preview
   mode reads a bundled catalogue snapshot, and boot re-runs when the theme editor re-renders a section. */
(function(){
  'use strict';
  if (window.__mpLp && window.__mpLp.booted) { window.__mpLp.reboot(); return; }
  var q = function(sel, el){ return (el||document).querySelector(sel); };
  var qa = function(sel, el){ return Array.prototype.slice.call((el||document).querySelectorAll(sel)); };
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var fill = function(tpl, vars){ return String(tpl == null ? '' : tpl).replace(/\{(\w+)\}/g, function(m, k){ return vars && Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m; }); };
  var pick = function(v, d){ return (v === undefined || v === null || v === '') ? d : v; };
  var readJson = function(sel){ try { var el = q(sel); return el ? (JSON.parse(el.textContent || '{}') || {}) : {}; } catch (e) { return {}; } };
  function normTag(t){ return String(t).trim().toLowerCase().replace(/ã¼/g, 'ue').replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/\s+/g, '-'); }

  /* ---------- configuration (core section JSON; the static page's values are the fallbacks). Re-read on every boot. ---------- */
  var CFG, S, TX, BUNDLE_HANDLE, ORDER_COLLECTION, FILL_COLLECTION, MAX, BEST_N, SHIP, VARIANT_TITLE, PREFIX_RE, EXCLUDE_RE, EXCLUDE_TAGS,
      TAG_W, TAG_M, TAG_U, TAG_NEW, FAM_PREFIX, BRAND_PREFIX, AFTER_ADD, GIFT_WAIT, ITEM_LABEL, ITEM_TEXT, PREVIEW, PREVIEW_URL, ROT_MS, PAGE,
      ROOT, COLLECTIONS_URL, CART_ADD, CART_URL, CHECKOUT_URL, BUNDLE_LIQUID, VARIANT_FALLBACK, money, IMG_MAP, PRODUCT_MAP, BRAND_MAP, FAM_MAP, T;
  function configure(){
    CFG = readJson('[data-mp-config]'); S = CFG.store || {}; TX = CFG.text || {};
    var R = CFG.routes || {}, MONEY = CFG.money || {};
    BUNDLE_HANDLE = pick(S.bundleHandle, '6-x-50ml-parfumflaschen-5999');
    ORDER_COLLECTION = pick(S.orderCollection, 'best-sellers');
    FILL_COLLECTION = pick(S.fillCollection, 'all');
    MAX = parseInt(pick(S.bundleSize, 6), 10) || 6;
    BEST_N = parseInt(pick(S.bestsellerCount, 20), 10);
    SHIP = parseInt(pick(S.shipCents, 549), 10) || 0;
    VARIANT_TITLE = String(pick(S.variantTitle, '50ml')).replace(/\s+/g, '').toLowerCase();
    try { PREFIX_RE = new RegExp(pick(S.titlePrefixRegex, '^\\s*(duftet|riecht|smells)\\s+(wie|like)\\s*(\\.\\.\\.|…)?\\s*'), 'i'); } catch (e) { PREFIX_RE = /^\s*(duftet|riecht|smells)\s+(wie|like)\s*(\.\.\.|…)?\s*/i; }
    var exSrc = pick(S.excludeHandlesRegex, 'mystik|gift-card|versand|garantie|geschenk|versicherung|parfumfuhrer|schatz');
    try { EXCLUDE_RE = exSrc ? new RegExp(exSrc, 'i') : null; } catch (e) { EXCLUDE_RE = null; }
    EXCLUDE_TAGS = String(pick(S.excludeTags, 'bundle')).split(',').map(function(t){ return normTag(t); }).filter(Boolean);
    TAG_W = normTag(pick(S.tagWomen, 'fuer-frauen')); TAG_M = normTag(pick(S.tagMen, 'fuer-maenner')); TAG_U = normTag(pick(S.tagUnisex, 'unisex')); TAG_NEW = normTag(pick(S.tagNew, 'new'));
    FAM_PREFIX = String(pick(S.familyPrefix, 'family:')).toLowerCase(); BRAND_PREFIX = String(pick(S.brandPrefix, 'marke:')).toLowerCase();
    AFTER_ADD = pick(S.afterAdd, 'drawer');
    GIFT_WAIT = parseInt(pick(S.giftWaitMs, 2500), 10) || 0;
    ITEM_LABEL = pick(S.itemLabel, 'Flasche'); ITEM_TEXT = pick(S.itemText, '{name} Inspiriert von {inspiration} - 50ml');
    PREVIEW = pick(S.dataSource, 'store') === 'preview'; PREVIEW_URL = pick(S.previewUrl, '');
    ROT_MS = parseInt(pick(S.rotatorIntervalMs, 3000), 10) || 3000;
    PAGE = parseInt(pick(S.cardsPerPage, 12), 10) || 12;
    VARIANT_FALLBACK = parseInt(pick(S.bundleVariantFallback, 0), 10) || 0;
    ROOT = pick(R.root, ''); COLLECTIONS_URL = pick(R.collections, ROOT + '/collections'); CART_ADD = pick(R.cartAdd, ROOT + '/cart/add'); CART_URL = pick(R.cart, ROOT + '/cart'); CHECKOUT_URL = pick(R.checkout, ROOT + '/checkout');
    BUNDLE_LIQUID = CFG.bundle && CFG.bundle.variantId ? CFG.bundle : null;
    money = MONEY.override ? makeMoneyFromFormat(MONEY.override) : makeMoney(MONEY.sample);
    /* designer-compare renders keyed by 3-digit number; overrides {g,u,n,s} per number; brand and family fallbacks (core section data snippet) */
    IMG_MAP = readJson('[data-image-map]'); PRODUCT_MAP = readJson('[data-product-map]'); BRAND_MAP = readJson('[data-brand-map]'); FAM_MAP = readJson('[data-family-map]');
    T = buildTexts();
  }

  /* ---------- money: derive prefix, suffix and separators from the shop's own rendering of 1234.56 ---------- */
  function makeMoney(sample){
    sample = String(sample || '');
    var digits = sample.match(/\d/g) || [];
    if (digits.length < 4) return function(cents){ var n = Math.round(Math.abs(cents)); return (cents < 0 ? '-' : '') + '€' + Math.floor(n/100) + ',' + ('0' + (n % 100)).slice(-2); };
    var first = sample.search(/\d/), last = sample.length - 1 - sample.split('').reverse().join('').search(/\d/);
    var prefix = sample.slice(0, first), suffix = sample.slice(last + 1), core = sample.slice(first, last + 1);
    var parts = core.split(/\D+/), seps = core.match(/\D+/g) || [];
    var hasDec = parts.length > 1 && parts[parts.length - 1].length === 2;
    var decSep = hasDec ? seps[seps.length - 1] : '';
    var thouSep = hasDec ? (seps.length > 1 ? seps[0] : '') : (seps.length ? seps[0] : '');
    return function(cents){
      var n = Math.round(Math.abs(cents)), whole = String(hasDec ? Math.floor(n / 100) : Math.round(n / 100)), frac = ('0' + (n % 100)).slice(-2);
      if (thouSep) whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thouSep);
      return (cents < 0 ? '-' : '') + prefix + whole + (hasDec ? decSep + frac : '') + suffix;
    };
  }
  /* price format override: text with one {amount…} placeholder, e.g. "€{amount_comma}" -> €1.234,56, "{amount} €" -> 1,234.56 €,
     {amount_no_decimals} -> 1,235, {amount_no_decimals_comma} -> 1.235, {amount_space_comma} -> 1 234,56, {amount_apostrophe} -> 1'234.56 */
  function makeMoneyFromFormat(tpl){
    tpl = String(tpl || '').replace(/<[^>]+>/g, '').replace(/\{\{\s*(amount[a-z_]*)\s*\}\}/g, '{$1}').replace(/\{amount_with_comma_separator\}/g, '{amount_comma}').replace(/\{amount_no_decimals_with_comma_separator\}/g, '{amount_no_decimals_comma}').replace(/\{amount_with_apostrophe_separator\}/g, '{amount_apostrophe}').replace(/\{amount_with_space_separator\}/g, '{amount_space_comma}');
    var m = tpl.match(/\{(amount[a-z_]*)\}/);
    if (!m) return makeMoney('');
    var kind = m[1], noDec = kind.indexOf('no_decimals') > -1;
    var thou = ',', dec = '.';
    if (kind.indexOf('comma') > -1) { thou = '.'; dec = ','; }
    if (kind.indexOf('space') > -1) { thou = ' '; }
    if (kind.indexOf('apostrophe') > -1) { thou = "'"; dec = '.'; }
    return function(cents){
      var n = Math.round(Math.abs(cents)), whole = String(noDec ? Math.round(n / 100) : Math.floor(n / 100)), frac = ('0' + (n % 100)).slice(-2);
      whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thou);
      return (cents < 0 ? '-' : '') + tpl.replace(m[0], noDec ? whole : whole + dec + frac);
    };
  }
  var moneyWhole = function(cents){ return money(cents).replace(/([,.]00)(?!\d)/, ''); };
  var withWidth = function(src, w){ if (!src) return ''; if (src.indexOf('lh3.googleusercontent.com/d/') > -1) return src.split('=')[0] + '=s' + w; if (/\/assets\//.test(src)) return src; return src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=' + w; };
  var BRAND_SLUGS = { 'dior': 'Dior', 'paco-rabanne': 'Paco Rabanne', 'ysl': 'Yves Saint Laurent', 'tom-ford': 'Tom Ford', 'lancome': 'Lancôme', 'thierry-mugler': 'Mugler', 'jpgaultier': 'Jean Paul Gaultier', 'armani': 'Giorgio Armani', 'carolina-herrera': 'Carolina Herrera', 'chanel': 'Chanel', 'valentino': 'Valentino', 'hugo-boss': 'Hugo Boss', 'chloe': 'Chloé', 'prada': 'Prada', 'hermes': 'Hermès', 'joop': 'Joop!', 'givenchy': 'Givenchy', 'gucci': 'Gucci', 'versace': 'Versace', 'creed': 'Creed', 'kilian': 'Kilian', 'narciso-rodriguez': 'Narciso Rodriguez', 'maison-francis-kurkdjian': 'Maison Francis Kurkdjian', 'marc-jacobs': 'Marc Jacobs', 'ariana-grande': 'Ariana Grande', 'burberry': 'Burberry', 'dolce-gabbana': 'Dolce & Gabbana', 'bvlgari': 'Bvlgari', 'davidoff': 'Davidoff', 'guerlain': 'Guerlain', 'nasomatto': 'Nasomatto', 'montale': 'Montale', 'balenciaga': 'Balenciaga', 'kayali': 'Kayali', 'louis-vuitton': 'Louis Vuitton', 'xerjoff': 'Xerjoff', 'lattafa': 'Lattafa', 'swiss-arabian': 'Swiss Arabian', 'boucheron': 'Boucheron', 'michael-kors': 'Michael Kors', 'calvin-klein': 'Calvin Klein', 'jennifer-lopez': 'Jennifer Lopez' };
  /* what people type for a brand that is not a substring of its name */
  var BRAND_ALIASES = { 'Yves Saint Laurent': 'ysl', 'Jean Paul Gaultier': 'jpg gaultier', 'Maison Francis Kurkdjian': 'mfk baccarat', 'Dolce & Gabbana': 'd&g dg dolce gabbana', 'Calvin Klein': 'ck', 'Jennifer Lopez': 'jlo j.lo', 'Louis Vuitton': 'lv', 'Paco Rabanne': 'rabanne', 'Mugler': 'thierry mugler', 'Bvlgari': 'bulgari', 'Giorgio Armani': 'emporio armani', 'Hugo Boss': 'boss' };
  /* English words for the store's German tag values (note:, duft:, anlass:, saison:, charakter:) so "vanilla" finds note:vanille */
  var TAG_EN = { vanille: 'vanilla', jasmin: 'jasmine', bergamotte: 'bergamot', sandelholz: 'sandalwood', moschus: 'musk', tonkabohne: 'tonka bean', lavendel: 'lavender', zimt: 'cinnamon', zeder: 'cedar', marine: 'sea marine', karamell: 'caramel', tabak: 'tobacco', kokos: 'coconut', orientalisch: 'oriental', blumig: 'floral flowers', holzig: 'woody wood', frisch: 'fresh', wuerzig: 'spicy', aromatisch: 'aromatic', aquatisch: 'aquatic water', zitrisch: 'citrus lemon', leder: 'leather', gourmand: 'gourmand dessert sweet', fougere: 'fougere', abend: 'evening night', alltag: 'everyday daily casual', buero: 'office work', besonders: 'special occasion', sport: 'sport gym', herbst: 'autumn fall', fruehling: 'spring', sommer: 'summer', ganzjaehrig: 'all year round', sinnlich: 'sensual', intensiv: 'intense strong', suess: 'sweet', moderat: 'moderate', sportlich: 'sporty', leicht: 'light', casual: 'casual everyday' };
  var SKIP_TAG = /^(dfw-active|onsale|women|men|unisex)$|frauen|nner$/;
  /* scent families: store family: tags first, then the bundled map, then the duft: heuristic */
  var FAM_KEYS = ['gourmand','floral','fresh','woody','amber','fruity'];
  var FAM_TAGS = { gourmand:'gourmand', suess:'gourmand', blumig:'floral', pudrig:'floral', frisch:'fresh', aquatisch:'fresh', aromatisch:'fresh', fougere:'fresh', zitrisch:'fresh', gruen:'fresh', holzig:'woody', leder:'woody', orientalisch:'amber', wuerzig:'amber', fruchtig:'fruity' };
  function applyFamilyMap(products){
    products.forEach(function(p){
      var fams = [];
      (p.tags || []).forEach(function(t){ var n = normTag(t); if (n.indexOf(FAM_PREFIX) === 0) { var f = n.slice(FAM_PREFIX.length); if (FAM_KEYS.indexOf(f) > -1 && fams.indexOf(f) < 0) fams.push(f); } });
      if (!fams.length && FAM_MAP[p.number]) fams = FAM_MAP[p.number].slice();
      if (!fams.length) (p.duft || []).forEach(function(t){ var f = FAM_TAGS[t]; if (f && fams.indexOf(f) < 0) fams.push(f); });
      p.families = fams;
    });
    return products;
  }
  /* lower-case, no accents, letters and digits only: 'Lancome' -> 'lancome', 'No. 366' -> 'no 366' */
  function fold(v){ var t = String(v == null ? '' : v).toLowerCase(); try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {} return t.replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function brandFromTags(p){ var slug = ''; (p.tags || []).forEach(function(t){ var n = normTag(t); if (n.indexOf(BRAND_PREFIX) === 0) slug = n.slice(BRAND_PREFIX.length); }); if (!slug) return ''; return BRAND_SLUGS[slug] || slug.replace(/-/g, ' ').replace(/\b[a-z]/g, function(c){ return c.toUpperCase(); }); }
  function applyBrandMap(products){
    products.forEach(function(p){
      p.brand = brandFromTags(p) || BRAND_MAP[p.number] || '';
      var words = [p.name, p.number, String(p.number).replace(/^no\.?\s*/i, ''), p.brand, BRAND_ALIASES[p.brand] || ''];
      (p.families || []).forEach(function(f){ words.push(T.fam[f] || f); });
      (p.tags || []).forEach(function(t){
        var n = normTag(t), i = n.indexOf(':'), v = i > -1 ? n.slice(i + 1) : n;
        if (n.indexOf(BRAND_PREFIX) === 0 || SKIP_TAG.test(v)) return;
        words.push(v.replace(/-/g, ' ')); if (TAG_EN[v]) words.push(TAG_EN[v]);
      });
      var hay = fold(words.join(' | '));
      p.hay = ' ' + hay + ' '; p.hayC = hay.replace(/ /g, '');
    });
    return products;
  }
  function inSet(p, key){
    if (key === 'all') return true;
    if (key === 'bestseller') return !!p.bestseller;
    if (key === 'F' || key === 'M') return p.gender === key;
    return (p.families || []).indexOf(key) > -1;
  }
  function applyImageMap(products){ products.forEach(function(p){ var m = String(p.number || '').match(/(\d{3})/); var u = m && IMG_MAP[m[1]]; if (u) { p.image = u; p.imageCompare = true; } }); return products; }

  /* ---------- copy strings used by JS (core section settings; the static page's English as fallback) ---------- */
  function buildTexts(){
    var t = function(key, d){ var v = TX[key]; return (v === undefined || v === null || v === '') ? d : String(v); };
    return {
      showing: function(n, total){ return n < total ? fill(t('showingPart', 'Showing {n} of {total} scents'), { n: n, total: total }) : fill(t('showingAll', 'Showing {total} scents'), { total: total }); },
      more: function(n){ return n === 1 ? t('moreOne', 'Show 1 more scent') : fill(t('moreMany', 'Show {n} more scents'), { n: n }); },
      add: t('add', 'Add'), added: t('added', 'Added'), soldOut: t('soldOut', 'Sold out'), cardMeta: t('cardMeta', '50 ml Eau de Parfum'),
      chooseMore: function(n){ return n === 1 ? t('chooseOne', 'Choose 1 more') : fill(t('chooseMany', 'Choose {n} more'), { n: n }); },
      full: t('full', 'Your box is full'),
      picked: function(n){ return fill(t('picked', '{n} of {max} picked'), { n: n, max: MAX }); },
      nextUnlock: function(n){ return n < MAX ? t('unlockPending', 'Both unlock with the full box') : t('unlockDone', 'Both bonuses unlocked'); },
      bonusLocked: function(){ return t('bonusLocked', 'Unlocks with the full box'); },
      bonusUnlocked: t('bonusUnlocked', 'Unlocked, in your box'),
      emptySlot: t('emptySlot', 'Empty slot'),
      removeChip: function(name){ return fill(t('removeChip', 'Remove {name} from your box'), { name: name }); },
      ctaDisabled: fill(t('ctaDisabled', 'Pick {max} bottles to continue'), { max: MAX }),
      ctaActive: function(price){ return fill(t('ctaActive', 'Add to cart, {price} →'), { price: price }); },
      ctaLoading: t('ctaLoading', 'One moment...'),
      cardAlt: function(number){ return fill(t('cardAlt', 'Magic Perfume {number}, 50 ml'), { number: number }); },
      badgeNew: t('badgeNew', 'New'),
      badgeBest: t('badgeBest', 'Bestseller'),
      showingSearch: function(n, total, qq){ return n < total ? fill(t('searchPart', 'Showing {n} of {total} matches for “{q}”'), { n: n, total: total, q: qq }) : fill(t(total === 1 ? 'searchOne' : 'searchMany', total === 1 ? '{total} match for “{q}”' : '{total} matches for “{q}”'), { total: total, q: qq }); },
      noneSearch: function(qq){ return fill(t('searchNone', 'Nothing matches “{q}”. Try the brand or the original scent name.'), { q: qq }); },
      noneSearchHere: function(qq, fam, g){ var forG = g === 'F' ? t('searchForWomen', 'for women') : (g === 'M' ? t('searchForMen', 'for men') : (g === 'U' ? t('searchForUnisex', 'for unisex') : '')); var where = [fam ? fill(t('searchIn', 'in {family}'), { family: fam }) : '', forG].filter(Boolean).join(' '); return fill(t('searchNoneHere', 'Nothing {where} matches “{q}”.'), { where: where, q: qq }).replace(/\s{2,}/g, ' '); },
      showAllMatches: function(n){ return fill(t(n === 1 ? 'showAllOne' : 'showAllMany', n === 1 ? 'Show all {n} match' : 'Show all {n} matches'), { n: n }); },
      clearSearch: t('clearSearch', 'Clear search'),
      flaconAlt: function(number){ return fill(t('flaconAlt', 'Magic Perfume bottle {number}'), { number: number }); },
      smellsLike: function(p){ return p.smellsLike === false ? p.name : fill(t('smellsLike', 'Smells like {name}'), { name: p.name }); },
      fam: { gourmand: t('famGourmand', 'Gourmand'), floral: t('famFloral', 'Floral'), fresh: t('famFresh', 'Fresh'), woody: t('famWoody', 'Woody'), amber: t('famAmber', 'Warm & spicy'), fruity: t('famFruity', 'Fruity') },
      gender: { F: t('genderWomen', 'Women'), M: t('genderMen', 'Men'), U: t('genderUnisex', 'Unisex') },
      split: function(f, m, u){ return fill(t('split', '{f} for women · {m} for men'), { f: f, m: m }) + (u ? fill(t('splitUnisex', ' · {u} unisex'), { u: u }) : ''); },
      forGender: function(n, g){ return fill(t(g === 'U' ? 'nUnisex' : (g === 'F' ? 'nWomen' : 'nMen'), g === 'U' ? '{n} unisex' : (g === 'F' ? '{n} for women' : '{n} for men')), { n: n }); },
      noneTile: function(g){ return g === 'U' ? t('noneTileUnisex', 'No unisex scents here yet') : (g === 'F' ? t('noneTileWomen', 'None for women yet') : t('noneTileMen', 'None for men yet')); },
      noneGrid: function(fam, g){ var adj = g === 'U' ? t('adjUnisex', 'unisex') : (g === 'F' ? t('adjWomen', 'women’s') : t('adjMen', 'men’s')); return fill(t('noneGrid', 'No {gender} scents in {family} yet. Try All or another family.'), { gender: adj, family: fam }); },
      thisFamily: t('thisFamily', 'this family'),
      reviewsDot: function(n){ return fill(t('reviewsDot', 'Reviews {n}'), { n: n }); },
      loadError: t('loadError', 'Could not load the scent list. Please reload the page.'),
      unavailable: t('unavailable', 'This offer is not available right now. Please try again later or write to hello@magicperfume.co.')
    };
  }

  /* ---------- countdown: to midnight, visitor's local time; rolls to the next midnight at 00:00 ---------- */
  (function countdown(){
    function nextMidnight(){ var d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); }
    var deadline = nextMidnight();
    function tick(){
      var left = deadline - Date.now();
      if (left <= 0) { deadline = nextMidnight(); left = deadline - Date.now(); }
      var h = Math.floor(left/3600000), m = Math.floor(left%3600000/60000), s = Math.floor(left%60000/1000);
      qa('[data-countdown]').forEach(function(n){
        var eh = q('[data-h]', n), em = q('[data-m]', n), es = q('[data-s]', n);
        if (eh) eh.textContent = ('0'+h).slice(-2);
        if (em) em.textContent = ('0'+m).slice(-2);
        if (es) es.textContent = ('0'+s).slice(-2);
      });
    }
    tick(); setInterval(tick, 1000);
  })();

  /* ---------- marquee: duplicate each track once for a seamless loop ---------- */
  function marquee(){
    qa('[data-marquee]').forEach(function(t){ if (t.getAttribute('data-marquee-ready')) return; t.innerHTML = t.innerHTML + t.innerHTML; t.setAttribute('data-marquee-ready', '1'); });
  }

  /* ---------- data ---------- */
  function normalizeStore(products){
    var out = [];
    products.forEach(function(p){
      var tags = (p.tags || []).map(function(t){ return String(t).trim(); }), nt = tags.map(normTag);
      if (p.product_type === 'Bundle') return;
      if (EXCLUDE_TAGS.some(function(x){ return nt.indexOf(x) > -1; })) return;
      if (EXCLUDE_RE && EXCLUDE_RE.test(p.handle)) return;
      var v50 = null;
      (p.variants || []).forEach(function(v){ if (!v50 && String(v.title).replace(/\s+/g,'').toLowerCase() === VARIANT_TITLE) v50 = v; });
      if (!v50) return;
      var title = String(p.title), smellsLike = PREFIX_RE.test(title);
      var t = title.replace(PREFIX_RE, '').trim();
      var m = null, re = /No\.?\s*(\d+\s*[A-Za-z]?)/gi, mm; while ((mm = re.exec(t))) m = mm; /* the LAST 'No.' is the product number ('No.5 - No. 077') */
      if (!m) return;
      var number = 'No. ' + m[1].replace(/\s+/g, '').toUpperCase();
      var before = t.slice(0, m.index).replace(/[\s\-\u2013\u2014]+$/,'').replace(/^[\s\-\u2013\u2014]+/,'');
      var name = (before || t.slice(m.index + m[0].length)).replace(/\s+/g, ' ').replace(/[\s\-\u2013\u2014]+$/,'').replace(/^[\s\-\u2013\u2014]+/,'');
      var ov = PRODUCT_MAP[number] || {};
      if (ov.n) name = ov.n;
      if (typeof ov.s === 'boolean') smellsLike = ov.s;
      var gender = ov.g || '';
      if (!gender) { if (nt.indexOf(TAG_W) > -1 || nt.indexOf('women') > -1) gender = 'F'; else if (nt.indexOf(TAG_M) > -1 || nt.indexOf('men') > -1) gender = 'M'; }
      if (!gender) { var sx = number.match(/\d+([WM])$/); if (sx) gender = sx[1] === 'W' ? 'F' : 'M'; }
      var img = p.images && p.images[0] ? p.images[0].src : '';
      if (img && img.indexOf('//') === 0) img = 'https:' + img;
      out.push({ id: p.id, handle: p.handle, name: name, number: number, inspiration: name, smellsLike: smellsLike, image: img,
        variant50Id: v50.id, available: v50.available !== false,
        gender: gender,
        unisex: typeof ov.u === 'boolean' ? ov.u : nt.indexOf(TAG_U) > -1,
        bestseller: false,
        isNew: nt.indexOf(TAG_NEW) > -1,
        tags: tags,
        duft: tags.filter(function(t){ return t.indexOf('duft:') === 0; }).map(function(t){ return t.slice(5); }) });
    });
    return out;
  }
  function fetchCollection(handle){
    var out = [];
    function page(n){
      return fetch(COLLECTIONS_URL + '/' + handle + '/products.json?limit=250&page=' + n, { credentials: 'same-origin' }).then(function(r){ if (!r.ok) throw new Error('collection ' + handle + ' ' + r.status); return r.json(); }).then(function(j){
        var list = j.products || []; out = out.concat(list);
        return (list.length === 250 && n < 4) ? page(n + 1) : out;
      });
    }
    return page(1);
  }
  /* order collection first (its first 50 = bestseller flag, same as the PDP builder), then every other perfume of the store */
  function loadCatalog(){
    return Promise.all([fetchCollection(ORDER_COLLECTION), FILL_COLLECTION ? fetchCollection(FILL_COLLECTION).catch(function(){ return []; }) : Promise.resolve([])]).then(function(res){
      var ordered = normalizeStore(res[0]), seen = {};
      ordered.forEach(function(p){ seen[p.id] = true; });
      var rest = normalizeStore(res[1]).filter(function(p){ return !seen[p.id]; });
      var all = [], numbers = {};
      ordered.concat(rest).forEach(function(p){ if (numbers[p.number]) return; numbers[p.number] = true; all.push(p); }); /* one product per number */
      all.forEach(function(p, i){ p.rank = i + 1; p.bestseller = i < 50; });
      return all;
    });
  }
  /* bundle product: Liquid already rendered it into the config when the product is published; otherwise the .js endpoint; otherwise fallbacks */
  function loadBundle(){
    if (BUNDLE_LIQUID) return Promise.resolve({ price: BUNDLE_LIQUID.price, compareAtPrice: BUNDLE_LIQUID.compareAtPrice, variantId: BUNDLE_LIQUID.variantId, available: BUNDLE_LIQUID.available !== false });
    return fetch(ROOT + '/products/' + BUNDLE_HANDLE + '.js', { credentials: 'same-origin' }).then(function(r){ if (!r.ok) throw new Error('bundle ' + r.status); return r.json(); })
      .then(function(b){ return { price: b.price, compareAtPrice: b.compare_at_price, variantId: b.variants[0].id, available: b.available }; })
      .catch(function(){ return { price: 5999, compareAtPrice: 11999, variantId: VARIANT_FALLBACK, available: false }; }); /* unreadable product (draft, 404): prices from the fallbacks, but not purchasable */
  }
  function loadPreview(){
    return fetch(PREVIEW_URL).then(function(r){ return r.json(); }).then(function(snap){
      var products = (snap.products || []).map(function(p){
        var tags = p.tags || [];
        p.duft = tags.filter(function(t){ return t.indexOf('duft:') === 0; }).map(function(t){ return t.slice(5); });
        if (typeof p.unisex !== 'boolean') p.unisex = tags.some(function(t){ return normTag(t) === TAG_U; });
        p.isNew = tags.some(function(t){ return normTag(t) === TAG_NEW; });
        return p;
      });
      products.forEach(function(p, i){ if (!p.rank) p.rank = i + 1; if (typeof p.bestseller !== 'boolean') p.bestseller = i < 50; });
      var b = snap.bundle || {};
      return { products: products, bundle: { price: b.price || 5999, compareAtPrice: b.compareAtPrice || 11999, variantId: b.variantId || VARIANT_FALLBACK, available: b.available !== false } };
    });
  }
  var dataPromise = null;
  function loadData(){
    if (dataPromise) return dataPromise;
    dataPromise = PREVIEW && PREVIEW_URL
      ? loadPreview().then(function(d){ d.products = applyBrandMap(applyFamilyMap(applyImageMap(d.products))); return d; })
      : Promise.all([loadCatalog(), loadBundle()]).then(function(res){ return { products: applyBrandMap(applyFamilyMap(applyImageMap(res[0]))), bundle: res[1] }; });
    return dataPromise;
  }

  /* ---------- price hydration ---------- */
  function hydratePrice(b){
    var price = b.price || 5999, was = b.compareAtPrice || 11999;
    var per = Math.floor(price / MAX), off = Math.floor((1 - price / was) * 100), save = was - price, savePer = Math.round(save / MAX);
    qa('[data-price-now]').forEach(function(n){ n.textContent = money(price); });
    qa('[data-price-was]').forEach(function(n){ n.textContent = money(was); });
    qa('[data-price-single]').forEach(function(n){ n.textContent = money(Math.floor(was / MAX)); });
    qa('[data-price-ship]').forEach(function(n){ n.textContent = money(SHIP); });
    qa('[data-price-value]').forEach(function(n){ n.textContent = money(was + Math.floor(was / MAX) + SHIP); });
    qa('[data-price-per]').forEach(function(n){ n.textContent = money(per); });
    qa('[data-price-per-eur]').forEach(function(n){ n.textContent = String(Math.round(per / 100)); });
    qa('[data-price-off]').forEach(function(n){ n.textContent = String(off); });
    qa('[data-price-save]').forEach(function(n){ n.textContent = money(save); });
    qa('[data-price-save-per]').forEach(function(n){ n.textContent = money(savePer); });
    return price;
  }

  /* ---------- rotating headline ---------- */
  var rotatorTimer = null, rotatorMeasure = null, rotatorBound = false, resizeTimer = null;
  function initRotator(perCents){
    var h1 = q('[data-rotator]');
    var saveEl = h1 && q('[data-rot-save]', h1), nameEl = h1 && q('[data-rot-name]', h1);
    var listEl = q('[data-rotator-list]');
    if (!h1 || !saveEl || !nameEl || !listEl) return;
    if (rotatorTimer) { clearInterval(rotatorTimer); rotatorTimer = null; }
    var entries = [];
    try { entries = JSON.parse(listEl.textContent || '[]'); } catch (e) { entries = []; }
    entries = entries.filter(function(en){ return en && en.name; });
    if (!entries.length) return;
    var per = (perCents || 0) / 100;
    var amountText = function(entry){ return moneyWhole(Math.max(0, Math.floor((parseFloat(entry.price) || 0) - per)) * 100); };
    var idx = 0;
    var old = q('[data-rot-probe]', h1); if (old) old.parentNode.removeChild(old);
    var fitLine = nameEl.parentNode, probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true'); probe.setAttribute('data-rot-probe', '1');
    probe.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;pointer-events:none';
    h1.appendChild(probe);

    function fitName(){
      if (!fitLine || !fitLine.hasAttribute('data-rot-fit')) return;
      fitLine.style.fontSize = ''; fitLine.style.whiteSpace = '';
      var cs = getComputedStyle(fitLine), base = parseFloat(cs.fontSize) || 30;
      probe.style.fontFamily = cs.fontFamily; probe.style.fontWeight = cs.fontWeight; probe.style.fontSize = cs.fontSize; probe.style.letterSpacing = cs.letterSpacing;
      probe.textContent = (fitLine.textContent || '').replace(/\s+/g, ' ').trim();
      var need = probe.getBoundingClientRect().width, avail = h1.clientWidth - 2;
      if (need <= avail || avail <= 0) return;
      var size = Math.max(base * 0.8, Math.floor(base * avail / need * 10) / 10);
      fitLine.style.fontSize = size + 'px';
      if (base * 0.8 < base * avail / need) fitLine.style.whiteSpace = 'nowrap';
    }

    function measure(){
      if (!document.body.contains(h1)) return;
      var curSave = saveEl.textContent, curName = nameEl.textContent, max = 0;
      h1.style.minHeight = '0px';
      entries.forEach(function(entry){
        saveEl.textContent = amountText(entry);
        nameEl.textContent = entry.name;
        fitName();
        if (h1.offsetHeight > max) max = h1.offsetHeight;
      });
      saveEl.textContent = curSave; nameEl.textContent = curName;
      fitName();
      h1.style.minHeight = max + 'px';
    }

    function tick(){
      if (document.hidden) return;
      if (!document.body.contains(h1)) { clearInterval(rotatorTimer); rotatorTimer = null; return; }
      idx = (idx + 1) % entries.length;
      var entry = entries[idx];
      saveEl.classList.add('is-out'); nameEl.classList.add('is-out');
      setTimeout(function(){
        saveEl.textContent = amountText(entry); nameEl.textContent = entry.name;
        fitName();
        saveEl.classList.add('is-in'); nameEl.classList.add('is-in');
        void saveEl.offsetHeight; void nameEl.offsetHeight;
        requestAnimationFrame(function(){
          saveEl.classList.remove('is-out', 'is-in');
          nameEl.classList.remove('is-out', 'is-in');
        });
      }, 350);
    }

    saveEl.textContent = amountText(entries[0]); nameEl.textContent = entries[0].name;
    measure();
    rotatorMeasure = measure;
    /* web fonts land after the first measure: fallback metrics are narrower, so re-fit once they are in (listeners bound once, they call the current measure) */
    if (!rotatorBound) {
      rotatorBound = true;
      var remeasure = function(){ if (rotatorMeasure) rotatorMeasure(); };
      if (document.fonts) {
        if (document.fonts.ready) document.fonts.ready.then(remeasure);
        if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', remeasure);
      }
      window.addEventListener('load', remeasure);
      window.addEventListener('resize', function(){
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(remeasure, 200);
      });
    }
    if (entries.length > 1) rotatorTimer = setInterval(tick, ROT_MS);
  }

  /* ---------- testimonials carousel ---------- */
  function initTestimonials(){
    var track = q('[data-testi]'); if (!track || track.getAttribute('data-testi-ready')) return;
    var dots = q('[data-testi-dots]'), prev = q('[data-testi-prev]'), next = q('[data-testi-next]');
    var cards = qa('.mp-testi__card', track); if (!cards.length || !dots) return;
    track.setAttribute('data-testi-ready', '1');
    var hover = false, pausedUntil = 0, paintTimer, rebuildTimer;
    function step(){ var g = parseFloat(getComputedStyle(track).columnGap) || 16; return cards[0].getBoundingClientRect().width + g; }
    function maxIndex(){ return Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / step())); }
    function index(){ return Math.min(maxIndex(), Math.round(track.scrollLeft / step())); }
    function go(i){ var m = maxIndex(); if (i > m) i = 0; if (i < 0) i = m; track.scrollTo({ left: Math.round(i * step()), behavior: 'smooth' }); }
    function pause(){ pausedUntil = Date.now() + 12000; }
    function paint(){ var i = index(); qa('button', dots).forEach(function(b, k){ b.classList.toggle('is-on', k === i); }); }
    function build(){
      if (!document.body.contains(track)) return;
      dots.innerHTML = '';
      for (var k = 0; k <= maxIndex(); k++) (function(k){
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', T.reviewsDot(k + 1));
        b.addEventListener('click', function(){ go(k); pause(); }); dots.appendChild(b);
      })(k);
      paint();
    }
    track.addEventListener('scroll', function(){ clearTimeout(paintTimer); paintTimer = setTimeout(paint, 80); });
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('mouseenter', function(){ hover = true; });
    track.addEventListener('mouseleave', function(){ hover = false; });
    if (prev) prev.addEventListener('click', function(){ go(index() - 1); pause(); });
    if (next) next.addEventListener('click', function(){ go(index() + 1); pause(); });
    window.addEventListener('resize', function(){ clearTimeout(rebuildTimer); rebuildTimer = setTimeout(build, 200); });
    build();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var timer = setInterval(function(){ if (!document.body.contains(track)) { clearInterval(timer); return; } if (document.hidden || hover || Date.now() < pausedUntil) return; go(index() + 1); }, 4500);
    }
  }

  /* ---------- decorative product images ---------- */
  function fillImages(products){
    qa('img[data-flacon-index]').forEach(function(img){
      var p = products[parseInt(img.getAttribute('data-flacon-index'), 10)] || products[0];
      if (!p) return; img.src = withWidth(p.image, 600); img.alt = T.flaconAlt(p.number);
    });
    var track = q('[data-flacons]');
    if (track) {
      var set = products.slice(0, 12);
      var html = set.map(function(p){ return '<div class="mp-flacons__item"><img src="' + esc(withWidth(p.image, 240)) + '" width="120" height="120" alt="' + esc(T.flaconAlt(p.number)) + '" loading="lazy"></div>'; }).join('');
      track.innerHTML = html + html;
    }
    var gal = q('[data-gallery]');
    if (gal) {
      gal.innerHTML = products.slice(0, 10).map(function(p){ return '<div class="mp-gallery__item"><img src="' + esc(withWidth(p.image, 400)) + '" width="200" height="200" alt="' + esc(T.flaconAlt(p.number)) + '" loading="lazy"></div>'; }).join('');
      var step = 214, gp = q('[data-gal-prev]'), gn = q('[data-gal-next]');
      if (gp && !gp.getAttribute('data-ready')) { gp.setAttribute('data-ready', '1'); gp.addEventListener('click', function(){ var g = q('[data-gallery]'); if (g) g.scrollBy({ left: -step, behavior: 'smooth' }); }); }
      if (gn && !gn.getAttribute('data-ready')) { gn.setAttribute('data-ready', '1'); gn.addEventListener('click', function(){ var g = q('[data-gallery]'); if (g) g.scrollBy({ left: step, behavior: 'smooth' }); }); }
    }
  }

  /* ---------- picker ---------- */
  var state = { products: [], selected: [], tab: 'all', gender: 'all', query: '', shown: 12, price: 5999, variantId: 0, busy: false, loaded: false, bundle: null };
  function matchGender(p, key){ if (key === 'all') return true; if (key === 'U') return !!p.unisex; return p.gender === key; }
  /* family tiles: count, women/men split and the first six flacons, all following the shared gender choice */
  function renderTiles(){
    var g = state.gender;
    qa('[data-coll]').forEach(function(card){
      var key = card.getAttribute('data-coll');
      var fam = state.products.filter(function(p){ return inSet(p, key); });
      var list = fam.filter(function(p){ return matchGender(p, g); });
      var f = 0, m = 0, u = 0; fam.forEach(function(p){ if (p.gender === 'F') f++; else if (p.gender === 'M') m++; if (p.unisex) u++; });
      var cnt = q('[data-coll-count]', card); if (cnt) cnt.textContent = String(list.length);
      var split = q('[data-coll-split]', card); if (split) split.textContent = g === 'all' ? T.split(f, m, u) : T.forGender(list.length, g);
      card.setAttribute('data-empty', String(!list.length));
      var grid = q('[data-coll-grid]', card); if (!grid) return;
      grid.innerHTML = list.length
        ? list.slice(0, 6).map(function(p){ return '<img src="' + esc(withWidth(p.image, 240)) + '" width="120" height="120" alt="' + esc(T.flaconAlt(p.number)) + '" loading="lazy">'; }).join('')
        : '<span class="mp-coll__none">' + esc(T.noneTile(g)) + '</span>';
    });
  }
  var el = {};
  function grab(){
    el.cards = q('[data-cards]'); el.slots = q('[data-slots]'); el.counter = q('[data-counter]'); el.empty = q('[data-tray-empty]'); el.submit = q('[data-submit]'); el.err = q('[data-err]');
    el.gridCount = q('[data-grid-count]'); el.moreWrap = q('[data-more-wrap]'); el.more = q('[data-more]'); el.search = q('[data-search]'); el.searchClear = q('.mp-search__clear');
  }

  function isSelected(id){ return state.selected.some(function(p){ return p.id === id; }); }
  /* search: every word must appear in the product's haystack (name, number, brand, tags in DE + EN, families);
     one- and two-letter words match whole words only ('Y', 'Si', 'CK'); the query without spaces is tried too ('tomford') */
  var qs = { terms: [], compact: '' };
  function matchQuery(p){
    if (!qs.terms.length) return true;
    var h = p.hay || ' ';
    var ok = qs.terms.every(function(t){ return t.length < 3 ? h.indexOf(' ' + t + ' ') > -1 : h.indexOf(t) > -1; });
    return ok || (qs.compact.length >= 3 && (p.hayC || '').indexOf(qs.compact) > -1);
  }
  function visible(){ return state.products.filter(function(p){ return inSet(p, state.tab) && matchGender(p, state.gender) && matchQuery(p); }); }

  function renderCards(){
    if (!el.cards || !el.gridCount) return;
    var all = visible(), full = state.selected.length >= MAX;
    var list = all.slice(0, state.shown);
    var qq = state.query.trim();
    if (all.length) el.gridCount.textContent = qq ? T.showingSearch(list.length, all.length, qq) : T.showing(list.length, all.length);
    else if (qq) {
      var filtered = state.tab !== 'all' || state.gender !== 'all', anyN = filtered ? state.products.filter(matchQuery).length : 0;
      el.gridCount.innerHTML = anyN
        ? esc(T.noneSearchHere(qq, state.tab !== 'all' ? (T.fam[state.tab] || state.tab) : '', state.gender !== 'all' ? state.gender : '')) + ' <button class="mp-linkbtn" type="button" data-search-all>' + esc(T.showAllMatches(anyN)) + '</button>'
        : esc(T.noneSearch(qq)) + ' <button class="mp-linkbtn" type="button" data-search-clear>' + esc(T.clearSearch) + '</button>';
    }
    else el.gridCount.textContent = T.noneGrid(T.fam[state.tab] || T.thisFamily, state.gender);
    if (el.moreWrap) el.moreWrap.hidden = list.length >= all.length;
    if (el.more) el.more.textContent = T.more(all.length - list.length);
    el.cards.innerHTML = list.map(function(p){
      var sel = isSelected(p.id), dis = (!p.available) || (full && !sel);
      return '<div class="mp-card" data-id="' + p.id + '" data-selected="' + sel + '" data-soldout="' + (!p.available) + '" data-soldout-label="' + esc(T.soldOut) + '">' +
        '<div class="mp-card__img"><img src="' + esc(withWidth(p.image, 400)) + '" width="300" height="300" alt="' + esc(T.cardAlt(p.number)) + '" loading="lazy">' + (p.isNew ? '<span class="mp-card__badge mp-card__badge--new">' + esc(T.badgeNew) + '</span>' : ((p.rank && p.rank <= BEST_N) ? '<span class="mp-card__badge mp-card__badge--best">' + esc(T.badgeBest) + '</span>' : '')) + '' + (T.gender[p.unisex ? 'U' : p.gender] ? '<span class="mp-card__gen">' + esc(T.gender[p.unisex ? 'U' : p.gender]) + '</span>' : '') + '</div>' +
        '<div class="mp-card__body"><div class="mp-card__name">' + esc(T.smellsLike(p)) + ' <span class="mp-card__num">' + esc(p.number) + '</span></div><div class="mp-card__meta">' + esc(T.cardMeta) + '</div>' +
        ((p.families || []).length ? '<div class="mp-card__fam">' + esc((p.families || []).map(function(f){ return T.fam[f] || f; }).join(' · ')) + '</div>' : '') +
        '<button class="mp-card__btn" type="button" data-toggle="' + p.id + '"' + (dis ? ' disabled' : '') + ' aria-pressed="' + sel + '">' + (sel ? '✓ ' + esc(T.added) : '+ ' + esc(T.add)) + '</button></div></div>';
    }).join('');
  }
  function renderTray(){
    if (!el.slots) return;
    var n = state.selected.length;
    var html = '';
    for (var i = 0; i < MAX; i++) {
      var p = state.selected[i];
      html += p ? '<div class="mp-slot mp-slot--filled"><img src="' + esc(withWidth(p.image, 200)) + '" width="100" height="100" alt="' + esc(T.cardAlt(p.number)) + '"><button class="mp-slot__rm" type="button" data-rm="' + p.id + '" aria-label="' + esc(T.removeChip(p.name)) + '">&times;</button></div>'
                 : '<div class="mp-slot" aria-label="' + esc(T.emptySlot) + '">' + (i + 1) + '</div>';
    }
    el.slots.innerHTML = html;
    if (el.counter) el.counter.textContent = n >= MAX ? T.full : T.chooseMore(MAX - n);
    if (el.empty) el.empty.hidden = n > 0;
    if (el.submit) {
      el.submit.disabled = n < MAX || state.busy || !state.loaded || !purchasable();
      el.submit.textContent = n < MAX ? T.ctaDisabled : (state.busy ? T.ctaLoading : T.ctaActive(money(state.price)));
    }
    if (state.loaded && n >= MAX && !purchasable()) showErr(true, T.unavailable);
    var sticky = q('[data-sticky]'); if (sticky) sticky.setAttribute('data-picker-full', String(n >= MAX));
    renderProgress(n);
  }
  /* filling bar + bonus tiles: both bonuses open with the last bottle, no mid-way thresholds */
  var lastN = 0;
  function renderProgress(n){
    var wrap = q('[data-progress]'); if (!wrap) return;
    var bar = q('[data-progress-fill]', wrap), lab = q('[data-progress-label]', wrap), nxt = q('[data-progress-next]', wrap);
    if (bar) bar.style.width = (n / MAX * 100) + '%';
    if (lab) lab.textContent = T.picked(n);
    if (nxt) nxt.textContent = T.nextUnlock(n);
    qa('[data-mark]', wrap).forEach(function(m){ m.classList.toggle('is-hit', n >= Math.min(MAX, parseInt(m.getAttribute('data-mark'), 10) || MAX)); });
    if (n > lastN) { wrap.classList.remove('is-grow'); void wrap.offsetWidth; wrap.classList.add('is-grow'); }
    qa('[data-bonus]').forEach(function(t){
      var at = parseInt(t.getAttribute('data-unlock'), 10); if (isNaN(at) || at > MAX) at = MAX;
      var open = n >= at, was = t.classList.contains('is-unlocked');
      t.classList.toggle('is-unlocked', open);
      var st = q('[data-bonus-state]', t); if (st) st.textContent = open ? T.bonusUnlocked : T.bonusLocked(at);
      if (open && !was && n > lastN) { t.classList.remove('is-pop'); void t.offsetWidth; t.classList.add('is-pop'); }
    });
    lastN = n;
  }
  function showErr(on, text){ if (!el.err) return; if (!el.err.getAttribute('data-err-default')) el.err.setAttribute('data-err-default', el.err.textContent); el.err.textContent = text || el.err.getAttribute('data-err-default'); el.err.setAttribute('data-show', String(!!on)); }
  function purchasable(){ return !!state.variantId && !(state.bundle && state.bundle.available === false); }
  function toggle(id){
    var idx = state.selected.findIndex(function(p){ return p.id === id; });
    if (idx > -1) { state.selected.splice(idx, 1); }
    else if (state.selected.length < MAX) { var p = state.products.find(function(x){ return x.id === id; }); if (p && p.available) state.selected.push(p); }
    showErr(false);
    renderCards(); renderTray();
    /* the tray sits above the grid: once the box is full, bring the CTA back on screen */
    if (idx < 0 && state.selected.length >= MAX) { var tray = q('[data-tray]'); if (tray && tray.scrollIntoView) tray.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  function payload(){
    var props = { _bundle_items: state.selected.map(function(p){ return String(p.variant50Id); }).join(',') };
    state.selected.forEach(function(p, i){ props[ITEM_LABEL + ' ' + (i + 1)] = fill(ITEM_TEXT, { name: p.name, inspiration: p.inspiration, number: p.number }); });
    return { items: [{ id: state.variantId, quantity: 1, properties: props }] };
  }
  /* Dawn-compatible drawer flow: ask the add endpoint to render the drawer sections and hand them to <cart-drawer>.renderContents */
  function cartElement(){ return q('cart-drawer') || q('cart-notification'); }
  function sectionsFor(cartEl){
    var ids = [];
    try { if (cartEl && typeof cartEl.getSectionsToRender === 'function') ids = cartEl.getSectionsToRender().map(function(s){ return s.id; }); } catch (e) { ids = []; }
    if (!ids.length) ids = ['cart-drawer', 'cart-icon-bubble'];
    return ids.filter(function(v, i, a){ return v && a.indexOf(v) === i; });
  }
  function afterAdd(response){
    if (AFTER_ADD === 'drawer') {
      var cartEl = cartElement();
      if (cartEl && typeof cartEl.renderContents === 'function' && response && response.sections) {
        try {
          if (typeof cartEl.setActiveElement === 'function') cartEl.setActiveElement(el.submit || document.activeElement);
          cartEl.renderContents(response);
          cartEl.classList.remove('is-empty');
          state.busy = false; renderTray();
          /* a theme that hides the drawer (or renders it inside a hidden header) gets the cart page instead */
          setTimeout(function(){ if (cartEl.classList.contains('active') || cartEl.classList.contains('animate')) return; var cs = getComputedStyle(cartEl); if (cs.display === 'none' || cs.visibility === 'hidden') window.location.href = CART_URL; }, 400);
          return;
        } catch (e) { if (window.console) console.warn('MP LP: cart drawer render failed, going to the cart page', e); }
      }
      window.location.href = CART_URL; return;
    }
    if (AFTER_ADD === 'cart') { window.location.href = CART_URL; return; }
    /* checkout: give the gift app a moment to add its line, then go */
    if (GIFT_WAIT > 0) {
      var started = Date.now();
      (function poll(){
        fetch(ROOT + '/cart.js', { credentials: 'same-origin' }).then(function(r){ return r.json(); }).then(function(c){
          var hasGift = (c.items || []).some(function(it){ return it.final_line_price === 0 || it.final_price === 0 || (it.discounts || []).length > 0; });
          if (hasGift || Date.now() - started >= GIFT_WAIT) window.location.href = CHECKOUT_URL; else setTimeout(poll, 400);
        }).catch(function(){ window.location.href = CHECKOUT_URL; });
      })();
      return;
    }
    window.location.href = CHECKOUT_URL;
  }
  function submit(){
    if (state.selected.length < MAX || state.busy || !state.loaded) return;
    if (!purchasable()) { showErr(true, T.unavailable); return; }
    var body = payload();
    if (AFTER_ADD === 'drawer') { body.sections = sectionsFor(cartElement()).join(','); body.sections_url = window.location.pathname; }
    state.busy = true; renderTray(); showErr(false);
    fetch(CART_ADD + '.js', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) })
      .then(function(r){ return r.json().then(function(j){ if (!r.ok || (j && j.status && j.status >= 400)) throw new Error('add failed ' + (j && (j.description || j.message) || r.status)); return j; }); })
      .then(function(j){ afterAdd(j); })
      .catch(function(err){ if (window.console) console.warn('MP LP: add to cart failed', err); state.busy = false; renderTray(); showErr(true); });
  }
  function setGender(key){
    state.gender = key; state.shown = PAGE;
    qa('[data-gender]').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-gender') === key)); });
    renderTiles(); renderCards();
  }
  function setTab(key){
    state.tab = key; state.shown = PAGE;
    qa('[data-tab]').forEach(function(b){ b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === key)); });
    renderCards();
  }
  var searchTimer = null;
  function applyQuery(v){
    state.query = v; var f = fold(v); qs.terms = f ? f.split(' ') : []; qs.compact = f.replace(/ /g, '');
    state.shown = PAGE; if (el.searchClear) el.searchClear.hidden = !qs.terms.length; renderCards();
  }
  function clearSearch(){ if (el.search) { el.search.value = ''; el.search.focus(); } applyQuery(''); }
  function bindSearch(){
    var searchEl = el.search; if (!searchEl || searchEl.getAttribute('data-search-ready')) return;
    searchEl.setAttribute('data-search-ready', '1');
    searchEl.addEventListener('input', function(){ clearTimeout(searchTimer); var v = searchEl.value; searchTimer = setTimeout(function(){ applyQuery(v); }, 120); });
    searchEl.addEventListener('keydown', function(e){ if (e.key === 'Escape') { e.preventDefault(); clearSearch(); } else if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); applyQuery(searchEl.value); searchEl.blur(); } });
    searchEl.parentNode.addEventListener('click', function(e){ if (e.target === searchEl.parentNode) searchEl.focus(); });
    if (state.query) searchEl.value = state.query;
  }
  document.addEventListener('click', function(e){
    if (!e.target.closest || !e.target.closest('.mp-lp')) return;
    if (e.target.closest('[data-search-clear]')) { clearSearch(); return; }
    if (e.target.closest('[data-search-all]')) { state.gender = 'all'; qa('[data-gender]').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-gender') === 'all')); }); renderTiles(); setTab('all'); return; }
    var t = e.target.closest('[data-toggle]'); if (t) { toggle(parseInt(t.getAttribute('data-toggle'), 10)); return; }
    var r = e.target.closest('[data-rm]'); if (r) { toggle(parseInt(r.getAttribute('data-rm'), 10)); return; }
    var gen = e.target.closest('[data-gender]'); if (gen) { setGender(gen.getAttribute('data-gender')); return; }
    var tab = e.target.closest('[data-tab]'); if (tab) { setTab(tab.getAttribute('data-tab')); return; }
    var link = e.target.closest('[data-tab-link]'); if (link) { setTab(link.getAttribute('data-tab-link')); return; }
    if (e.target.closest('[data-more]')) { state.shown += PAGE; renderCards(); return; }
    if (e.target.closest('[data-submit]')) { submit(); return; }
    var quiz = e.target.closest('[data-quiz-link]'); if (quiz) { var target = q('#mp-collections'); if (target && target.scrollIntoView) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  });

  /* ---------- sticky bar visibility (hidden while the hero, the picker or the footer is on screen) ---------- */
  var stickyObs = [];
  function initSticky(){
    var bar = q('[data-sticky]');
    stickyObs.forEach(function(o){ o.disconnect(); }); stickyObs = [];
    if (!bar || !('IntersectionObserver' in window)) return;
    var seen = { hero: !!q('#mp-hero'), picker: false, footer: false };
    function update(){ bar.setAttribute('data-show', String(!seen.hero && !seen.picker && !seen.footer)); }
    [['hero', '#mp-hero', 0.2], ['picker', '#mp-picker', 0.05], ['footer', '#mp-footer', 0.1]].forEach(function(def){
      var node = q(def[1]); if (!node) return;
      var o = new IntersectionObserver(function(es){ es.forEach(function(x){ seen[def[0]] = x.isIntersecting; }); update(); }, { threshold: def[2] });
      o.observe(node); stickyObs.push(o);
    });
    update();
  }

  /* ---------- UGC tiles: play only when a source is present ---------- */
  function initUgc(){
    qa('[data-ugc] .mp-ugc__tile').forEach(function(tile){
      if (tile.getAttribute('data-ugc-ready')) return; tile.setAttribute('data-ugc-ready', '1');
      var src = tile.getAttribute('data-ugc-src'), v = q('video', tile), btn = q('.mp-ugc__play', tile), soon = q('.mp-ugc__soon', tile);
      if (!v || !btn) return;
      var has = !!(src || v.getAttribute('src') || q('source', v));
      if (src && !v.getAttribute('src')) v.src = src;
      if (has && soon) soon.hidden = true;
      btn.addEventListener('click', function(){ if (!has) return; if (v.paused) { v.muted = false; v.play(); btn.hidden = true; } });
      v.addEventListener('click', function(){ v.pause(); btn.hidden = false; });
    });
  }

  /* ---------- boot (idempotent; re-run after the theme editor re-renders a section) ---------- */
  function paintAll(){
    qa('[data-catalog-count]').forEach(function(n){ n.textContent = String(state.products.length); });
    fillImages(state.products);
    renderTiles(); renderCards(); renderTray();
  }
  function boot(){
    configure(); state.shown = state.shown || PAGE;
    grab(); marquee(); initTestimonials(); initUgc(); initSticky(); bindSearch();
    if (state.loaded) { state.price = hydratePrice(state.bundle || {}); initRotator(Math.floor(state.price / MAX)); paintAll(); return; }
    renderTray();
    loadData().then(function(d){
      state.products = d.products || []; state.bundle = d.bundle || {}; state.loaded = true;
      state.price = hydratePrice(state.bundle);
      if (state.bundle.variantId) state.variantId = state.bundle.variantId;
      grab();
      initRotator(Math.floor(state.price / MAX));
      paintAll();
    }).catch(function(err){
      if (window.console) console.error('MP LP data load failed', err);
      if (el.gridCount) el.gridCount.textContent = T.loadError;
    });
  }
  window.__mpLp = { booted: true, reboot: boot, state: state };
  var rebootTimer = null;
  function scheduleReboot(e){
    var node = e && e.target;
    if (node && node.querySelector && !node.querySelector('.mp-lp') && !(node.classList && node.classList.contains('mp-lp-wrap'))) return;
    clearTimeout(rebootTimer); rebootTimer = setTimeout(boot, 50);
  }
  document.addEventListener('shopify:section:load', scheduleReboot);
  document.addEventListener('shopify:section:reorder', scheduleReboot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
