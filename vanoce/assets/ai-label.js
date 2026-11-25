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
  var TEXT='AI',TITLE='Reálná fotka, AI retuš';
  var SKIP='.gallery-thumbs,.cart-line,.mat-option,.mat-swatch,#answers .answer,#orderScreen,.quiz-offer-bar';
  var css='.ai-photo-label{position:absolute;left:10px;bottom:10px;z-index:3;width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:rgba(110,114,130,.22);border:1px solid rgba(255,255,255,.45);color:rgba(255,255,255,.95);font:600 8.5px/1 "DM Sans",system-ui,sans-serif;letter-spacing:.02em;text-shadow:0 0 2px rgba(0,0,0,.35);pointer-events:none;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}';
  function isAI(src){if(!src)return false;var f=src.split('?')[0].split('/').pop();return AI_PHOTOS.indexOf(f)>-1}
  function update(){
    document.querySelectorAll('img').forEach(function(img){
      if(img.closest(SKIP))return;
      var box=img.parentElement;if(!box)return;
      var label=box.querySelector(':scope > .ai-photo-label');
      var ai=isAI(img.getAttribute('src'));
      if(ai&&!label){
        if(getComputedStyle(box).position==='static')box.style.position='relative';
        label=document.createElement('span');label.className='ai-photo-label';label.textContent=TEXT;label.title=TITLE;label.setAttribute('aria-label',TITLE);box.appendChild(label);
      }else if(!ai&&label&&!box.querySelector(':scope > img[src*=".webp"]')){label.remove();}
      else if(!ai&&label){var anyAI=[].some.call(box.querySelectorAll(':scope > img'),function(i){return isAI(i.getAttribute('src'))});if(!anyAI)label.remove();}
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
