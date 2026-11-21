/* Platba převodem na děkovací stránce (kvíz i objednavka.html):
   QR kód, na telefonu „Sdílet do banky“ a „Uložit QR kód“ + krátký návod,
   pod tím číslo účtu, částka a VS s kopírováním na jedno klepnutí. */
(function () {
  var CSS = '.mf-pay{margin-top:12px;text-align:left}' +
    '.mf-pay-qr{display:block;width:200px;height:200px;margin:0 auto;border-radius:12px;background:#fff;padding:6px;border:1px solid rgba(17,22,51,.1)}' +
    '.mf-pay-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0 0}' +
    '.mf-pay-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:10px 16px;border-radius:999px;border:2px solid #111633;background:#fff;color:#111633;font:700 15px/1.2 "DM Sans",system-ui,sans-serif;text-decoration:none;cursor:pointer}' +
    '.mf-pay-btn.primary{background:#111633;color:#fff}' +
    '.mf-pay-hint{margin:10px 0 0;font-size:14px;font-weight:400;line-height:1.45;text-align:center;color:#202747}' +
    '.mf-pay-rows{margin:14px 0 0;display:grid;gap:8px}' +
    '.mf-pay-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:#fff;border:1px solid rgba(17,22,51,.1)}' +
    '.mf-pay-row span{flex:1;min-width:0;font-size:13px;font-weight:400;color:#6f7592;line-height:1.3}' +
    '.mf-pay-row b{display:block;font-size:16px;color:#111633;white-space:nowrap}' +
    '.mf-pay-copy{flex:none;min-height:40px;padding:8px 12px;border-radius:10px;border:1.5px solid rgba(17,22,51,.18);background:#fff;color:#111633;font:700 13.5px/1 "DM Sans",system-ui,sans-serif;cursor:pointer}' +
    '.mf-pay-copy.ok{background:#eef8f1;border-color:#9fd3b0;color:#17663a}';

  function addCss() {
    if (document.getElementById('mf-pay-css')) return;
    var s = document.createElement('style'); s.id = 'mf-pay-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function isPhone() {
    try { return /Android|iPhone|iPod/i.test(navigator.userAgent) || (matchMedia('(pointer: coarse)').matches && innerWidth < 820); } catch (e) { return false; }
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(function () { return fallback(t); });
    return fallback(t);
    function fallback(v) {
      return new Promise(function (ok, no) {
        try { var a = document.createElement('textarea'); a.value = v; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); var r = document.execCommand('copy'); a.remove(); r ? ok() : no(); } catch (e) { no(e); }
      });
    }
  }
  function safeQr(url) {
    try { var q = new URL(String(url || '')); return q.protocol === 'https:' && q.hostname === 'api.qrserver.com' ? q.href : ''; } catch (e) { return ''; }
  }

  /* opts: {qrUrl, account, amount (číslo v Kč), vs} */
  function render(box, opts) {
    addCss();
    var wrap = el('div', 'mf-pay'), qr = safeQr(opts.qrUrl), phone = isPhone(), name = 'makeful-platba-' + (opts.vs || 'qr') + '.png';
    if (qr) {
      var img = el('img', 'mf-pay-qr'); img.src = qr; img.alt = 'QR kód pro platbu'; img.width = 200; img.height = 200; wrap.appendChild(img);
      if (phone) {
        var actions = el('div', 'mf-pay-actions');
        var share = el('button', 'mf-pay-btn primary', 'Sdílet do banky'); share.type = 'button'; share.hidden = true;
        var save = el('a', 'mf-pay-btn', 'Uložit QR kód'); save.href = qr; save.target = '_blank'; save.rel = 'noopener'; save.setAttribute('download', name);
        actions.appendChild(share); actions.appendChild(save); wrap.appendChild(actions);
        wrap.appendChild(el('p', 'mf-pay-hint', 'Jste na mobilu? QR kód si uložte a v aplikaci své banky zvolte QR platba → Načíst z galerie.'));
        // Obrázek si stáhneme, aby šel sdílet jako soubor a uložit bez otevírání nové stránky
        fetch(qr, { mode: 'cors' }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (blob) {
          var file = new File([blob], name, { type: blob.type || 'image/png' });
          save.href = URL.createObjectURL(blob); save.removeAttribute('target');
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            share.hidden = false;
            share.addEventListener('click', function () {
              navigator.share({ files: [file], title: 'QR platba Makeful' }).catch(function () {});
            });
          }
        }).catch(function () {});
      }
    }
    var rows = el('div', 'mf-pay-rows');
    [['Číslo účtu', opts.account, opts.account],
     ['Částka', opts.amount != null && opts.amount !== '' ? Number(opts.amount).toLocaleString('cs-CZ').replace(/\s/g, ' ') + ' Kč' : '', opts.amount != null ? String(opts.amount) : ''],
     ['Variabilní symbol', opts.vs, opts.vs]].forEach(function (r) {
      if (!r[1]) return;
      var row = el('div', 'mf-pay-row'), lab = el('span', null, r[0]), val = el('b', null, r[1]);
      lab.appendChild(val);
      var btn = el('button', 'mf-pay-copy', 'Kopírovat'); btn.type = 'button';
      btn.setAttribute('aria-label', 'Kopírovat ' + r[0].toLowerCase());
      btn.addEventListener('click', function () {
        copyText(String(r[2])).then(function () {
          btn.textContent = 'Zkopírováno ✓'; btn.classList.add('ok');
          setTimeout(function () { btn.textContent = 'Kopírovat'; btn.classList.remove('ok'); }, 1800);
        }).catch(function () {});
      });
      row.appendChild(lab); row.appendChild(btn); rows.appendChild(row);
    });
    wrap.appendChild(rows);
    box.appendChild(wrap);
    return wrap;
  }
  window.MakefulQrPay = { render: render, isPhone: isPhone };
})();
