/* Štítek u fotek, které jsou vyfocené reálně a vyretušované AI.
   Seznam souborů upravte v AI_PHOTOS; ostatní fotky a videa štítek nemají. */
(function(){
  var AI_PHOTOS=[
    'voucher-ruzovy.webp','voucher-ruzovy-v-ruce.webp','voucher-zmena-barvy-dotek.webp',
    'balicek-krabicka.webp','penezenka-oranzova-v-ruce.webp','psanicko-v-ruce.webp',
    'penezenka-svitici.webp','produkt-penezenka-termo.webp','produkt-penezenka-cerna.webp',
    'produkt-psanicko-svitici.webp','psanicko-termo.webp','psanicko-cerne.webp',
    'produkt-kombinace-nova.webp',
    'psanicko-svitici-sada.webp','psanicko-svitici-predek.webp','psanicko-svitici-v-ruce.webp','psanicko-svitici-efekt.webp','psanicko-termo-sada.webp','psanicko-termo-predek.webp','psanicko-termo-v-ruce.webp','psanicko-termo-efekt.webp','psanicko-cerne-sada.webp','psanicko-cerne-predek.webp','psanicko-cerne-v-ruce.webp','psanicko-cerne-efekt.webp','sada-krabicka.webp','sada-knizka.webp','sada-kombo-cerne.webp','sada-kombo-svitici.webp','sada-kombo-termo.webp','penezenka-svitici-hero.webp','penezenka-svitici-v-ruce.webp','penezenka-svitici-mesh.webp','penezenka-svitici-efekt.webp','penezenka-termo-hero.webp','penezenka-termo-v-ruce.webp','penezenka-termo-mesh.webp','penezenka-termo-efekt.webp','penezenka-cerne-hero.webp','penezenka-cerne-v-ruce.webp','penezenka-cerne-mesh.webp','penezenka-cerne-efekt.webp'
  ];
  var LIGHT=['psanicko-svitici-predek.webp','psanicko-svitici-v-ruce.webp','psanicko-svitici-efekt.webp','psanicko-termo-predek.webp','psanicko-termo-v-ruce.webp','psanicko-cerne-predek.webp','psanicko-cerne-v-ruce.webp','penezenka-svitici-v-ruce.webp','penezenka-svitici-mesh.webp','penezenka-svitici-efekt.webp','penezenka-termo-mesh.webp','penezenka-termo-efekt.webp','penezenka-cerne-mesh.webp','penezenka-cerne-v-ruce.webp','voucher-zmena-barvy-dotek.webp'];
  var TEXT='AI',TITLE='Reálná fotka, AI retuš';
  var SKIP='.gallery-thumbs,.cart-line,.mat-option,.mat-swatch,#answers .answer,#orderScreen,.quiz-offer-bar,.v8-option,.v8-thumbs,.v9-matgrid';
  var css='.ai-photo-label{position:absolute;left:8px;bottom:8px;z-index:3;width:14px;height:14px;line-height:0;pointer-events:none;color:rgba(255,255,255,.55)}.ai-photo-label svg{display:block;width:14px;height:14px}.ai-photo-label.on-light{color:rgba(120,124,140,.4)}';
  function isAI(src){if(!src)return false;var f=src.split('?')[0].split('/').pop();return AI_PHOTOS.indexOf(f)>-1}
  function fname(src){return String(src||'').split('?')[0].split('/').pop()}
  function update(){
    document.querySelectorAll('img').forEach(function(img){
      if(img.closest(SKIP))return;
      var box=img.parentElement;if(!box)return;
      var label=box.querySelector(':scope > .ai-photo-label');
      var aiImg=[].filter.call(box.querySelectorAll(':scope > img'),function(i){return isAI(i.getAttribute('src'))})[0];
      if(!aiImg){if(label)label.remove();return;}
      if(!label){
        if(getComputedStyle(box).position==='static')box.style.position='relative';
        label=document.createElement('span');label.className='ai-photo-label';label.innerHTML='<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6.4" fill="none" stroke="currentColor" stroke-width="0.9"/><text x="7" y="9.1" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="5.6" font-weight="700" fill="currentColor">AI</text></svg>';label.title=TITLE;label.setAttribute('aria-label',TITLE);box.appendChild(label);
      }
      label.classList.toggle('on-light',LIGHT.indexOf(fname(aiImg.getAttribute('src')))>-1||!!aiImg.closest('#newUI'));
    });
    document.querySelectorAll('.ai-photo-label').forEach(function(l){var b=l.parentElement;if(!b.querySelector(':scope > img'))l.remove();});
  }
  var t=null;function schedule(){if(t)return;t=setTimeout(function(){t=null;update()},30)}
  function start(){
    try{var s=document.createElement('style');s.textContent=css;document.head.appendChild(s)}catch(e){}
    update();
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
