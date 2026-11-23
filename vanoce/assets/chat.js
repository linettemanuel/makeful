/* Chat Tawk.to – bublina vpravo dole, nikdy nepřekrývá tlačítko.
   Kvíz: jen na výsledku a potvrzení. Na mobilu sedí vedle tlačítka „Objednat →“ (lišta má vpravo místo, třída mf-chat).
   Ve formuláři objednávky se schová.
   E-shop na mobilu (index, produkty…): bublina se nezobrazuje vůbec, chat se otevírá ikonou v hlavičce vedle Košíku,
   takže nikdy nepřekrývá tlačítka. Na počítači klasická bublina vpravo dole. */
(function () {
  var w = window, d = document;
  var isQuiz = !!d.getElementById('resultScreen');
  var hasBuyBar = !!d.querySelector('.mobile-product-buy');
  var yMobile = isQuiz ? 12 : (hasBuyBar ? 84 : 20);
  var yDesktop = 20;

  var navActions = d.querySelector('.site-header .nav-actions');
  var headerMode = !isQuiz && !!navActions && !!(w.matchMedia && w.matchMedia('(max-width:740px)').matches);

  var T = w.Tawk_API = w.Tawk_API || {};
  w.Tawk_LoadStart = new Date();
  T.customStyle = { visibility: {
    mobile: { position: 'br', xOffset: 12, yOffset: yMobile },
    desktop: { position: 'br', xOffset: 20, yOffset: yDesktop }
  } };

  function dl(o) { try { w.dataLayer = w.dataLayer || []; w.dataLayer.push(o); } catch (e) {} }
  T.onChatStarted = function () { dl({ event: 'chat_started', page_path: location.pathname }); };

  function allowed() {
    if (!isQuiz) return true;
    var a = d.querySelector('.view.active');
    return !!a && (a.id === 'resultScreen' || a.id === 'doneScreen');
  }

  var loaded = false;
  function load() {
    if (loaded) return; loaded = true;
    var s1 = d.createElement('script'), s0 = d.getElementsByTagName('script')[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/6b049a02fcdb823caaefa0fc/1k84vj6bc';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);
  }

  if (headerMode) {
    var st = d.createElement('style');
    st.textContent = '.nav-chat{position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;flex:0 0 44px;border:1px solid rgba(17,23,51,.12);border-radius:50%;background:#fff;color:#8050c6;cursor:pointer;padding:0}' +
      '.nav-chat svg{width:22px;height:22px}.nav-chat i{position:absolute;top:2px;right:2px;width:10px;height:10px;border-radius:50%;background:#ff5c93;border:2px solid #fff;display:none}.nav-chat.unread i{display:block}' +
      '@media(max-width:380px){.nav-actions{gap:8px}.nav-cta{padding:0 16px}}';
    d.head.appendChild(st);
    var btn = d.createElement('button');
    btn.type = 'button'; btn.className = 'nav-chat'; btn.setAttribute('aria-label', 'Napište nám do chatu');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg><i></i>';
    navActions.insertBefore(btn, navActions.firstChild);
    btn.addEventListener('click', function () {
      btn.classList.remove('unread');
      try { if (T.maximize) { T.showWidget(); T.maximize(); } } catch (e) {}
    });
    T.onLoad = function () { try { T.hideWidget(); } catch (e) {} };
    T.onChatMinimized = function () { try { T.hideWidget(); } catch (e) {} };
    T.onUnreadCountChanged = function (n) { btn.classList.toggle('unread', n > 0); };
    load();
    return;
  }

  function sync() {
    if (isQuiz) d.body.classList.toggle('mf-chat', allowed());
    if (allowed()) load();
    if (!T.hideWidget) return;
    try {
      if (allowed()) T.showWidget();
      else if (!(T.isChatMaximized && T.isChatMaximized())) T.hideWidget();
    } catch (e) {}
  }
  T.onLoad = sync;

  if (isQuiz && w.MutationObserver) {
    var obs = new MutationObserver(sync);
    d.querySelectorAll('.view').forEach(function (v) { obs.observe(v, { attributes: true, attributeFilter: ['class'] }); });
  }
  sync();
})();
