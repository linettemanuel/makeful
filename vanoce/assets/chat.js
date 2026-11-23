/* Chat Tawk.to – bublina vpravo dole, nikdy nepřekrývá tlačítko.
   Kvíz: jen na výsledku a potvrzení. Na mobilu sedí vedle tlačítka „Objednat →“ (lišta má vpravo místo, třída mf-chat).
   Ve formuláři objednávky se schová. E-shop: v košíkové liště dole sedí vedle „Dokončit objednávku →“. Produktové stránky: nad lištou „Přidat do košíku“. */
(function () {
  var w = window, d = document;
  var isQuiz = !!d.getElementById('resultScreen');
  var hasBuyBar = !!d.querySelector('.mobile-product-buy');
  var yMobile = hasBuyBar ? 84 : 12; // kvíz a košíková lišta: vedle tlačítka (lišta má vpravo místo)
  var yDesktop = 20;

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
