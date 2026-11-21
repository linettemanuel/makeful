/* Štítek u fotek, které jsou vyfocené reálně a vyretušované AI.
   Seznam souborů upravte v AI_PHOTOS; ostatní fotky a videa štítek nemají. */
(function(){
  var AI_PHOTOS=[
    'voucher-ruzovy.webp','voucher-ruzovy-v-ruce.webp','voucher-zmena-barvy-dotek.webp',
    'balicek-krabicka.webp','penezenka-oranzova-v-ruce.webp','psanicko-v-ruce.webp',
    'penezenka-svitici.webp','produkt-penezenka-termo.webp','produkt-penezenka-cerna.webp',
    'produkt-psanicko-svitici.webp','psanicko-termo.webp','psanicko-cerne.webp',
    'produkt-kombinace-nova.webp'
  ];
  var TEXT='Reálná fotka, AI retuš';
  var SKIP='.gallery-thumbs,.cart-line,.mat-option,.mat-swatch,#answers .answer';
  var css='.ai-photo-label{position:absolute;left:10px;bottom:10px;z-index:3;max-width:calc(100% - 20px);padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.88);color:#202747;font:600 10.5px/1.35 "DM Sans",system-ui,sans-serif;letter-spacing:.01em;box-shadow:0 1px 6px rgba(17,23,51,.12);pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  function isAI(src){if(!src)return false;var f=src.split('?')[0].split('/').pop();return AI_PHOTOS.indexOf(f)>-1}
  function update(){
    document.querySelectorAll('img').forEach(function(img){
      if(img.closest(SKIP))return;
      var box=img.parentElement;if(!box)return;
      var label=box.querySelector(':scope > .ai-photo-label');
      var ai=isAI(img.getAttribute('src'));
      if(ai&&!label){
        if(getComputedStyle(box).position==='static')box.style.position='relative';
        label=document.createElement('span');label.className='ai-photo-label';label.textContent=TEXT;box.appendChild(label);
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
