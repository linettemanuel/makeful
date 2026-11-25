/* Kampaně: zapamatuje si vstupní URL i s parametry (utm_*, fbclid…) pro kvíz */
try{var _mfL='makeful-landing-url';if(location.search||!sessionStorage.getItem(_mfL))sessionStorage.setItem(_mfL,location.href);}catch(e){}
const PRICES = {balicek:1188, voucher:1188, combo:2138, penezenka:488, psanicko:888, voucher488:488, voucher888:888, voucher1288:1288, knizka:100, vraceni30:22};
const LABELS = {balicek:'Kreativní sada Peněženka + Psaníčko', voucher:'3D voucher na workshop (1 188 Kč)', combo:'Kreativní sada Peněženka + Psaníčko + Voucher',
  penezenka:'Kreativní sada Peněženka', psanicko:'Kreativní sada Psaníčko',
  voucher488:'3D voucher na workshop (488 Kč)', voucher888:'3D voucher na workshop (888 Kč)', voucher1288:'3D voucher na workshop (1 288 Kč)',
  knizka:'Interaktivní vzdělávací knížka', vraceni30:'Prodloužené vrácení o 30 dní'};
// Které díly má varianta (kvůli materiálům a jménu). Vouchery, knížka a vrácení žádné.
const VARIANT_PARTS = {balicek:['wallet','clutch'], combo:['wallet','clutch'], penezenka:['wallet'], psanicko:['clutch']};
const partsOf = v => VARIANT_PARTS[v]||[];
const isVoucherVariant = v => String(v).indexOf('voucher')===0;
const VOUCHER_VALUE = {voucher:'1 188 Kč', combo:'1 188 Kč', voucher488:'488 Kč', voucher888:'888 Kč', voucher1288:'1 288 Kč'};
const PAYMENT_LABELS={bank:'Bankovní převod',card:'Platba kartou online'};
const MAIL_TO = 'hello@make-ful.com';
const CART_KEY='makeful-christmas-cart-2026';
const MAKEFUL_CONFIG=window.MAKEFUL_CONFIG||{};
const MAKE_WEBHOOK_URL=MAKEFUL_CONFIG.makeWebhookUrl||'';
const MAKE_DRAFT_URL=MAKEFUL_CONFIG.makeDraftWebhookUrl||'';
const MAKE_PROMO_URL=MAKEFUL_CONFIG.makePromoWebhookUrl||'';
const CART_PROMO_KEY='makeful-cart-promo-2026';
// Promokódy vázané na nabídku: SESTRY20 jen pro 1 + 1 (2 stejné dárky), MAMADCERA jen pro máma a dcera (2 psaníčka)
const OFFER_PROMOS={
  SESTRY20:{ok:list=>['penezenka','psanicko','balicek'].some(v=>list.filter(i=>i.variant===v).reduce((n,i)=>n+i.qty,0)>=2),msg:'Promokód SESTRY20 platí jen pro nabídku 1 + 1, tedy 2 stejné dárky v košíku.'},
  MAMADCERA:{ok:list=>list.filter(i=>i.variant==='psanicko').reduce((n,i)=>n+i.qty,0)>=2,msg:'Promokód MAMADCERA platí jen pro nabídku máma a dcera, tedy 2 psaníčka v košíku.'}
};
const promoAllowed=(code,list=cart)=>{const r=OFFER_PROMOS[String(code||'').trim().toUpperCase()];return !r||r.ok(list);};
// Vymaže promokód z pole, z ověřené slevy i z uložené nabídky
function clearPromo(){
  appliedPromo=null;try{localStorage.removeItem(CART_PROMO_KEY)}catch{}
  const pi=document.getElementById('promo-code'),ps=document.getElementById('promo-status');
  if(pi&&pi.value){pi.value='';if(typeof scheduleDraftSave==='function')scheduleDraftSave();}
  if(ps){ps.textContent='';ps.dataset.state='';}
  if(typeof renderTotals==='function'&&document.getElementById('order-form'))renderTotals();
}
// Po každé změně košíku: kód, který už k obsahu nesedí, zmizí
function enforcePromoRules(){
  let stored='';try{stored=localStorage.getItem(CART_PROMO_KEY)||''}catch{}
  const pi=document.getElementById('promo-code'),typed=pi?pi.value:'';
  if(!cart.length||(stored&&!promoAllowed(stored))||(typed&&!promoAllowed(typed)))clearPromo();
}
let appliedPromo=null; // {code,type,value} po úspěšném ověření v Make
// Základ procentní slevy: u SESTRY20 jen dárky v páru (stejně počítá Make), jinak celý košík
function promoBase(code,subtotal,list=cart){if(String(code||'').toUpperCase()!=='SESTRY20')return subtotal;return ['penezenka','psanicko','balicek'].reduce((n,v)=>{const q=list.filter(i=>i.variant===v).reduce((a,i)=>a+i.qty,0);return n+(q>=2?PRICES[v]*q:0)},0);}
function promoDiscount(subtotal){if(!appliedPromo||!(appliedPromo.value>0))return 0;return appliedPromo.type==='percent'?Math.round(promoBase(appliedPromo.code,subtotal)*Math.min(appliedPromo.value,100)/100):Math.min(Math.round(appliedPromo.value),subtotal);}
function renderTotals(){
  const sub=cart.reduce((n,i)=>n+PRICES[i.variant]*i.qty,0),disc=promoDiscount(sub);
  const row=document.getElementById('summary-discount-row');
  if(row){row.hidden=!disc;if(disc){document.getElementById('summary-discount-label').textContent='Sleva ('+appliedPromo.code+')';document.getElementById('summary-discount').textContent='−'+money(disc);}}
  const t=document.getElementById('summary-total');if(t)t.textContent=money(sub-disc);
}
const DRAFT_KEY='makeful-order-draft-2026';
let draftSaveTimer=0;
let lastDraftSent='';
let orderSubmissionStarted=false;
const MATERIALS=['Svítí ve tmě','Mění barvu na dotek','Klasická černá'];
// Product media can mix photographs and videos in any order.
// Photo: {type:'image',src:'photo.jpg',alt:'Description of the product'}
// Video: {type:'video',src:'product.mp4',poster:'poster.jpg',alt:'Product in motion'}
// Captions, when supplied: {src:'captions.vtt',srclang:'cs',label:'České titulky'}.
const BUNDLE_PHOTO={"type": "image", "src": "assets/photos/balicek-krabicka.webp", "alt": "Kreativní sada Makeful: oranžová peněženka a černé psaníčko v dárkové krabičce", "caption": "Vizualizace dárkového balení."};
const PRODUCT_MEDIA={"hero": [{"type": "image", "src": "assets/photos/sada-krabicka.webp", "alt": "Dárková krabička Kreativní sada Makeful"}], "balicek": [{"type": "image", "src": "assets/photos/sada-kombo-termo.webp", "alt": "Kreativní sada Peněženka + Psaníčko: moduly, knížka a hotové kousky"}, {"type": "image", "src": "assets/photos/penezenka-svitici-hero.webp", "alt": "Kreativní sada Peněženka"}, {"type": "image", "src": "assets/photos/psanicko-svitici-sada.webp", "alt": "Kreativní sada Psaníčko"}, {"type": "image", "src": "assets/photos/sada-knizka.webp", "alt": "Interaktivní knížka Budoucnost módy"}, {"type": "image", "src": "assets/photos/balicek-krabicka.webp", "alt": "Kreativní sada Makeful: oranžová peněženka a černé psaníčko v dárkové krabičce"}, {"type": "image", "src": "assets/photos/penezenka-oranzova-v-ruce.webp", "alt": "Oranžová 3D tištěná peněženka Makeful v ruce"}, {"type": "video", "src": "assets/videos/produkt-materialy.mp4", "poster": "assets/photos/produkt-materialy-poster.webp", "alt": "Psaníčko a peněženky ve třech materiálech Makeful", "caption": "Tři materiály vedle sebe. Video bez zvuku."}, {"type": "image", "src": "assets/photos/psanicko-v-ruce.webp", "alt": "Černé 3D tištěné psaníčko Makeful v ruce"}, {"type": "image", "src": "assets/photos/produkt-pripravene-moduly.webp", "alt": "Předchystané oranžové 3D tištěné dílky Makeful"}, {"type": "video", "src": "assets/videos/produkt-zmena-barvy-voda.mp4", "poster": "assets/photos/produkt-zmena-barvy-voda-poster.webp", "alt": "Peněženka Makeful mění pod vodou barvu podle teploty", "caption": "Pod vodou mění barvu podle teploty. Video bez zvuku."}, {"type": "image", "src": "assets/photos/penezenka-svitici.webp", "alt": "Peněženka na světle a ve tmě, kde svítí zeleně", "part": "wallet", "material": "Svítí ve tmě"}, {"type": "image", "src": "assets/photos/produkt-penezenka-termo.webp", "alt": "Peněženka mění pod vodou barvu z oranžové na žlutou", "part": "wallet", "material": "Mění barvu na dotek"}, {"type": "image", "src": "assets/photos/produkt-penezenka-cerna.webp", "alt": "Černá 3D tištěná peněženka", "part": "wallet", "material": "Klasická černá"}, {"type": "image", "src": "assets/photos/produkt-psanicko-svitici.webp", "alt": "Psaníčko se na světle nabíjí a ve tmě svítí", "part": "clutch", "material": "Svítí ve tmě"}, {"type": "image", "src": "assets/photos/psanicko-termo.webp", "alt": "Psaníčko mění při doteku barvu z oranžové na žlutou", "part": "clutch", "material": "Mění barvu na dotek"}, {"type": "image", "src": "assets/photos/psanicko-cerne.webp", "alt": "Černé 3D tištěné psaníčko", "part": "clutch", "material": "Klasická černá"}], "voucher": [{"type": "image", "src": "assets/photos/voucher-ruzovy.webp", "alt": "Růžový 3D tištěný voucher Makeful s logem"}, {"type": "image", "src": "assets/photos/voucher-ruzovy-v-ruce.webp", "alt": "Růžový 3D tištěný voucher Makeful v ruce"}, {"type": "image", "src": "assets/photos/voucher-zmena-barvy-dotek.webp", "alt": "Voucher Makeful při doteku mění barvu z fialové na růžovou", "caption": "Při doteku mění barvu podle teploty."}, {"type": "image", "src": "assets/photos/makeful-treti-den-poster.webp", "alt": "Účastnice workshopu nastavuje 3D tiskárnu", "caption": "Momentka z workshopu ve studiu Makeful."}, {"type": "image", "src": "assets/photos/o-nas-modni-navrh.webp", "alt": "Tvorba barevného módního návrhu fixami", "caption": "Momentka z workshopu ve studiu Makeful."}, {"type": "image", "src": "assets/photos/o-nas-prace-na-navrhu.webp", "alt": "Účastnice pracuje na návrhu bílého trička na figuríně", "caption": "Momentka z workshopu ve studiu Makeful."}, {"type": "image", "src": "assets/photos/o-nas-spolecne-siti.webp", "alt": "Lektorka pomáhá účastnici workshopu při šití", "caption": "Momentka z workshopu ve studiu Makeful."}], "combo": [{"type": "image", "src": "assets/photos/produkt-kombinace-nova.webp", "alt": "Černé psaníčko, bílá peněženka a 3D tištěný voucher Makeful jako vánoční dárek"}, {"type": "image", "src": "assets/photos/produkt-balicek-novy.webp", "alt": "Peněženka, psaníčko a knížečka v krabičce Makeful", "caption": "Vizualizace dárkového balení."}, {"type": "video", "src": "assets/videos/produkt-penezenka-ukazka.mp4", "poster": "assets/photos/produkt-penezenka-video-poster.webp", "alt": "Ukázka 3D tištěné peněženky v ruce", "caption": "Peněženka zblízka. Video bez zvuku."}, {"type": "image", "src": "assets/photos/voucher-ruzovy.webp", "alt": "Růžový 3D tištěný voucher Makeful s logem"}, {"type": "image", "src": "assets/photos/produkt-penezenka-prototyp.webp", "alt": "Prototyp 3D tištěné peněženky v ruce", "caption": "Z našeho vývoje: prototyp peněženky."}, {"type": "video", "src": "assets/videos/makeful-treti-den.mp4", "poster": "assets/photos/makeful-treti-den-poster.webp", "alt": "Workshop Makeful: práce s 3D tiskárnou", "caption": "Z workshopu ve studiu Makeful. Video bez zvuku."}, {"type": "image", "src": "assets/photos/o-nas-vlastni-klobouk.webp", "alt": "Účastnice workshopu ve vlastnoručně zdobeném klobouku", "caption": "Momentka z workshopu ve studiu Makeful."}, {"type": "image", "src": "assets/photos/o-nas-zdobeni-bot.webp", "alt": "Dvě účastnice zdobí boty ve studiu Makeful", "caption": "Momentka z workshopu ve studiu Makeful."}], "card-balicek": [{"type": "image", "src": "assets/photos/balicek-krabicka.webp", "alt": "Kreativní sada Makeful: oranžová peněženka a černé psaníčko v dárkové krabičce"}, {"type": "video", "src": "assets/videos/produkt-materialy.mp4", "poster": "assets/photos/produkt-materialy-poster.webp", "alt": "Psaníčko a peněženky ve třech materiálech Makeful", "caption": "Tři materiály vedle sebe. Video bez zvuku."}, {"type": "image", "src": "assets/photos/penezenka-oranzova-v-ruce.webp", "alt": "Oranžová 3D tištěná peněženka Makeful v ruce"}, {"type": "image", "src": "assets/photos/psanicko-v-ruce.webp", "alt": "Černé 3D tištěné psaníčko Makeful v ruce"}, {"type": "video", "src": "assets/videos/produkt-zmena-barvy-voda.mp4", "poster": "assets/photos/produkt-zmena-barvy-voda-poster.webp", "alt": "Peněženka Makeful mění pod vodou barvu podle teploty", "caption": "Pod vodou mění barvu podle teploty. Video bez zvuku."}], "card-voucher": [{"type": "image", "src": "assets/photos/voucher-ruzovy.webp", "alt": "Růžový 3D tištěný voucher Makeful s logem"}, {"type": "image", "src": "assets/photos/voucher-ruzovy-v-ruce.webp", "alt": "Růžový 3D tištěný voucher Makeful v ruce"}, {"type": "image", "src": "assets/photos/voucher-zmena-barvy-dotek.webp", "alt": "Voucher Makeful při doteku mění barvu z fialové na růžovou", "caption": "Při doteku mění barvu podle teploty."}, {"type": "image", "src": "assets/photos/o-nas-spolecne-siti.webp", "alt": "Lektorka pomáhá účastnici workshopu při šití", "caption": "Momentka z workshopu ve studiu Makeful."}, {"type": "image", "src": "assets/photos/makeful-treti-den-poster.webp", "alt": "Účastnice workshopu nastavuje 3D tiskárnu", "caption": "Momentka z workshopu ve studiu Makeful."}], "card-combo": [{"type": "image", "src": "assets/photos/produkt-kombinace-nova.webp", "alt": "Černé psaníčko, bílá peněženka a 3D tištěný voucher Makeful jako vánoční dárek"}, {"type": "image", "src": "assets/photos/produkt-balicek-novy.webp", "alt": "Peněženka, psaníčko a knížečka v krabičce Makeful", "caption": "Vizualizace dárkového balení."}, {"type": "video", "src": "assets/videos/produkt-penezenka-ukazka.mp4", "poster": "assets/photos/produkt-penezenka-video-poster.webp", "alt": "Ukázka 3D tištěné peněženky v ruce", "caption": "Peněženka zblízka. Video bez zvuku."}, {"type": "image", "src": "assets/photos/voucher-ruzovy.webp", "alt": "Růžový 3D tištěný voucher Makeful s logem"}, {"type": "image", "src": "assets/photos/produkt-penezenka-prototyp.webp", "alt": "Prototyp 3D tištěné peněženky v ruce", "caption": "Z našeho vývoje: prototyp peněženky."}, {"type": "video", "src": "assets/videos/makeful-treti-den.mp4", "poster": "assets/photos/makeful-treti-den-poster.webp", "alt": "Workshop Makeful: práce s 3D tiskárnou", "caption": "Z workshopu ve studiu Makeful. Video bez zvuku."}, {"type": "image", "src": "assets/photos/o-nas-vlastni-klobouk.webp", "alt": "Účastnice workshopu ve vlastnoručně zdobeném klobouku", "caption": "Momentka z workshopu ve studiu Makeful."}, {"type": "image", "src": "assets/photos/o-nas-zdobeni-bot.webp", "alt": "Dvě účastnice zdobí boty ve studiu Makeful", "caption": "Momentka z workshopu ve studiu Makeful."}]};
let cart=loadCart();
let activeVariant='';
let activeItemId='';
const galleryControllers=new Map();
function ordersOpen(now=new Date()){return now.getTime()<Date.parse('2026-12-01T00:00:00+01:00');}
// Jméno na psaníčko je zdarma bez termínu.
function personalizationAvailable(){return true;}
function money(v){return new Intl.NumberFormat('cs-CZ',{minimumFractionDigits:Number.isInteger(v)?0:2,maximumFractionDigits:2}).format(v)+' Kč';}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function newItem(variant){return {id:'item-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),variant,qty:1,wallet:MATERIALS[0],clutch:MATERIALS[0],clutchName:''};}
function loadCart(){
  try{
    const raw=JSON.parse(localStorage.getItem(CART_KEY)||sessionStorage.getItem(CART_KEY)||'[]');
    if(!Array.isArray(raw)) return [];
    const used=new Set();
    return raw.filter(item=>item&&Object.hasOwn(PRICES,item.variant)).slice(0,100).map(item=>{
      let id=typeof item.id==='string'&&/^[a-zA-Z0-9_-]+$/.test(item.id)?item.id:newItem(item.variant).id;
      if(used.has(id))id=newItem(item.variant).id;used.add(id);
      return {id,variant:item.variant,qty:Number.isInteger(item.qty)&&item.qty>=1&&item.qty<=100?item.qty:1,
        wallet:MATERIALS.includes(item.wallet)?item.wallet:MATERIALS[0],clutch:MATERIALS.includes(item.clutch)?item.clutch:MATERIALS[0],
        clutchName:partsOf(item.variant).includes('clutch')&&personalizationAvailable()&&typeof item.clutchName==='string'?item.clutchName.slice(0,60):''};
    });
  }catch{return [];}
}
function saveCart(){
  try{localStorage.setItem(CART_KEY,JSON.stringify(cart));sessionStorage.removeItem(CART_KEY);}catch{}
  document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=cart.reduce((n,i)=>n+i.qty,0));
  enforcePromoRules();updateCartBar();
}
// Prodejní lišta dole (jako v kvízu): ukazuje aktuální stav košíku. Na stránce košíku se nezobrazuje.
const KNOWN_PROMOS={SESTRY20:{pct:20},MAMADCERA:{kc:788}};
function updateCartBar(){
  if(document.getElementById('order-form')||!document.body||document.querySelector('.mobile-product-buy'))return;
  let bar=document.getElementById('cart-bar');
  const count=cart.reduce((n,i)=>n+i.qty,0);
  if(!count){if(bar){bar.hidden=true;document.body.classList.remove('has-cart-bar');}return;}
  if(!bar){
    const st=document.createElement('style');st.textContent='.cart-bar{position:fixed;left:0;right:0;bottom:0;z-index:70;background:rgba(255,255,255,.97);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-top:1px solid #e7e4ef;box-shadow:0 -8px 24px rgba(84,55,132,.08);font-family:"DM Sans",system-ui,sans-serif;color:#111633}.cart-bar[hidden]{display:none}.cart-bar-inner{max-width:520px;margin:0 auto;padding:10px 18px calc(12px + env(safe-area-inset-bottom))}.cart-bar-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.cart-bar-row strong{font-size:26px;font-weight:800;letter-spacing:-.01em}.cart-bar-row s{color:#8a8fa6;font-size:15px;font-weight:600;margin-right:6px}.cart-bar-row span{font-size:12.5px;line-height:1.3;font-weight:700;color:#c2185b;text-align:right}.cart-bar-cta{display:flex;align-items:center;justify-content:center;width:100%;min-height:58px;padding:14px 18px;border-radius:16px;font-size:17.5px;font-weight:800;color:#fff;text-decoration:none;background:linear-gradient(100deg,#48d5ec,#9b6cff 40%,#ff6f9f 75%,#ffb26b);box-shadow:0 10px 22px rgba(255,92,147,.28)}.cart-bar-note{margin:6px 0 0;text-align:center;font-size:12.5px;font-weight:700;color:#364360}body.has-cart-bar{padding-bottom:120px}@media(max-width:740px){.cart-bar-inner{padding-right:84px}}.has-cart-bar .cart-toast{bottom:170px}';
    document.head.appendChild(st);
    bar=document.createElement('div');bar.id='cart-bar';bar.className='cart-bar';bar.setAttribute('role','region');bar.setAttribute('aria-label','Košík');
    bar.innerHTML='<div class="cart-bar-inner"><div class="cart-bar-row"><div><s data-cb-old></s><strong data-cb-total></strong></div><span data-cb-info></span></div><a class="cart-bar-cta" href="objednavka.html">Dokončit objednávku →</a></div>';
    document.body.appendChild(bar);
  }
  const sub=cart.reduce((n,i)=>n+PRICES[i.variant]*i.qty,0);
  let code='';try{code=localStorage.getItem(CART_PROMO_KEY)||''}catch{}
  const pr=promoAllowed(code)?KNOWN_PROMOS[code]:null,disc=pr?(pr.pct?Math.round(promoBase(code,sub)*pr.pct/100):Math.min(pr.kc,sub)):0;
  bar.querySelector('[data-cb-old]').textContent=disc?money(sub):'';
  bar.querySelector('[data-cb-total]').textContent=money(sub-disc);
  bar.querySelector('[data-cb-info]').textContent='V košíku '+count+' '+(count===1?'dárek':count<5?'dárky':'dárků');
  bar.hidden=false;document.body.classList.add('has-cart-bar');
}
function showCartStatus(message){
  let status=document.getElementById('cart-status');
  if(!status){status=document.createElement('div');status.id='cart-status';status.className='cart-toast';status.setAttribute('role','status');document.body.append(status);}
  status.replaceChildren(document.createTextNode(message+' '));
  const link=document.createElement('a');link.href='objednavka.html';link.textContent='Přejít do košíku →';status.append(link);
  status.hidden=false;clearTimeout(showCartStatus.t);showCartStatus.t=setTimeout(()=>{status.hidden=true},3500);
}
/* Měření pro GTM (Facebook Pixel, GA4): události do dataLayer */
function mfTrack(event,params={}){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,source:'eshop',...params});}catch{}}
// Cena košíku po slevě (ověřený promokód, nebo 1 + 1 / máma a dcera z nabídky)
function mfCartValue(list=cart){const sub=mfValue(list);if(typeof appliedPromo!=='undefined'&&appliedPromo)return sub-promoDiscount(sub);let code='';try{code=localStorage.getItem(CART_PROMO_KEY)||''}catch{}const pr=promoAllowed(code)?KNOWN_PROMOS[code]:null;return pr?sub-(pr.pct?Math.round(promoBase(code,sub,list)*pr.pct/100):Math.min(pr.kc,sub)):sub;}
// Přechod na jinou stránku až poté, co GTM zpracuje předchozí událost (nejdéle 0,8 s)
function goAfterTrack(url){let gone=false;const go=()=>{if(gone)return;gone=true;location.href=url};try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'mf_navigate',eventCallback:()=>setTimeout(go,150),eventTimeout:700});}catch{}setTimeout(go,800);}
function mfItems(list){return list.map(i=>({item_id:i.variant,item_name:LABELS[i.variant],price:PRICES[i.variant],quantity:i.qty}));}
function mfValue(list){return list.reduce((n,i)=>n+PRICES[i.variant]*i.qty,0);}
function addToCart(variant,qty=1,options={}){
  if(!Object.hasOwn(PRICES,variant))return;
  if(!ordersOpen()){showCartStatus('Vánoční objednávky jsme uzavřeli 30. listopadu.');return;}
  if(!Number.isInteger(qty)||qty<1||qty>100)return;
  if(cart.reduce((n,i)=>n+i.qty,0)+qty>100){showCartStatus('Do jedné objednávky lze přidat nejvýše 100 kusů. Pro větší množství nám napište na '+MAIL_TO+'.');return;}
  const next={...newItem(variant),qty};
  if(partsOf(variant).length){
    if(MATERIALS.includes(options.wallet))next.wallet=options.wallet;
    if(MATERIALS.includes(options.clutch))next.clutch=options.clutch;
    next.clutchName=personalizationAvailable()?String(options.clutchName||'').trim().slice(0,60):'';
  }
  let item=cart.find(i=>i.variant===variant&&(!partsOf(variant).length||(i.wallet===next.wallet&&i.clutch===next.clutch&&i.clutchName===next.clutchName)));
  if(item)item.qty+=qty;else{item=next;cart.push(item);}
  saveCart();showCartStatus('Dáreček je v košíku.');{const pr=KNOWN_PROMOS[options.promo||''],base=PRICES[variant]*qty,tv=pr?base-(pr.pct?Math.round(base*pr.pct/100):Math.min(pr.kc,base)):base;mfTrack('add_to_cart',{currency:'CZK',value:tv,ecommerce:{currency:'CZK',value:tv,items:mfItems([{variant,qty}])}});}return item;
}
function toggleMenu(){
  const open=document.body.classList.toggle('nav-open');
  document.querySelector('.hamburger')?.setAttribute('aria-expanded',String(open));
}
document.addEventListener('click',e=>{
  if(document.body.classList.contains('nav-open')&&(!e.target.closest('.nav')||e.target.closest('.nav-links a'))){document.body.classList.remove('nav-open');document.querySelector('.hamburger')?.setAttribute('aria-expanded','false');}
  const buy=e.target.closest('[data-buy-now]');
  const add=e.target.closest('[data-add-cart]')||buy;if(add){
    const variant=add.dataset.addCart||add.dataset.buyNow;
    const addQty=Number(add.dataset.qty)||1,addPromo=add.dataset.promo||'';
    if(add.closest('.offer-card')&&partsOf(variant).length){e.preventDefault();openQuickAdd(variant,{qty:addQty,promo:addPromo,go:!!buy});return;}
    if(add.closest('.sales-card')&&(variant==='balicek'||variant==='combo')&&!add.hasAttribute('data-quick-confirmed')){openQuickAdd(variant);return;}
    if(buy)e.preventDefault();
    if(add.closest('.offer-card')){const item=addToCart(variant,addQty,{promo:addPromo});if(item){setCartPromo(addPromo);updateCartBar();if(buy)goAfterTrack('objednavka.html?item='+encodeURIComponent(item.id));}return;}
    const qtyInput=add.hasAttribute('data-use-product-qty')?document.getElementById('product-qty'):null;
    if(qtyInput&&!qtyInput.reportValidity())return;
    const options=add.hasAttribute('data-use-product-qty')?readProductOptions():{};
    const item=addToCart(variant,qtyInput?Number(qtyInput.value):1,options);
    if(buy&&item)goAfterTrack('objednavka.html?item='+encodeURIComponent(item.id));return;
  }
  const upsell=e.target.closest('[data-upsell]');if(upsell){openQuickAdd(upsell.dataset.upsell||'combo');return;}
  const edit=e.target.closest('[data-edit-cart]');
  if(edit){const item=cart.find(i=>i.id===edit.dataset.editCart);if(item){activeVariant=item.variant;selectActiveVariant(item.variant,item.id);updateOrderUI(false);const dialog=document.getElementById('cart-item-editor');document.getElementById('cart-editor-product').textContent=LABELS[item.variant];dialog.showModal();document.body.classList.add('cart-editor-open');}return;}
  const remove=e.target.closest('[data-remove-cart]');
  if(remove){
    cart=cart.filter(i=>i.id!==remove.dataset.removeCart);clearPromo();
    if(activeItemId===remove.dataset.removeCart){activeVariant=cart[0]?.variant||'';selectActiveVariant(activeVariant,cart[0]?.id);}
    saveCart();updateOrderUI(false);
  }
});
function readOrderForm(){
  const form=document.getElementById('order-form');if(!form)return null;
  const selected=form.querySelector('input[name="variant"]:checked');
  const value=id=>document.getElementById(id).value.trim();
  return {variant:selected?.value||'',qty:Number(document.getElementById('order-qty').value),promoCode:value('promo-code'),
    payment:form.querySelector('input[name="payment"]:checked')?.value||'bank',wallet:value('wallet-material'),clutch:value('clutch-material'),clutchName:personalizationAvailable()&&selected?.value!=='voucher'?value('clutch-name'):'',
    name:value('customer-name'),email:value('customer-email'),phone:value('customer-phone'),street:value('customer-street'),city:value('customer-city'),zip:value('customer-zip'),note:value('customer-note')};
}
function selectActiveVariant(variant,id){
  document.querySelectorAll('input[name="variant"]').forEach(el=>el.checked=el.value===variant);
  const item=cart.find(i=>i.id===id)||cart.find(i=>i.variant===variant)||newItem(variant);
  activeItemId=cart.some(i=>i.id===item.id)?item.id:'';
  document.getElementById('order-qty').value=item.qty;
  document.getElementById('wallet-material').value=item.wallet;
  document.getElementById('clutch-material').value=item.clutch;
  document.getElementById('clutch-name').value=item.clutchName;
}
function updateOrderUI(sync=true){
  const f=readOrderForm();if(!f)return;
  if(sync&&Object.hasOwn(PRICES,f.variant)){
    let item=cart.find(i=>i.id===activeItemId&&i.variant===f.variant);if(!item){item=newItem(f.variant);cart.push(item);activeItemId=item.id;}
    if(Number.isInteger(f.qty)&&f.qty>=1&&f.qty<=100)item.qty=f.qty;
    item.wallet=f.wallet;item.clutch=f.clutch;item.clutchName=f.clutchName;
    saveCart();
  }
  const fparts=partsOf(f.variant),bundle=fparts.length>0;
  document.getElementById('bundle-options').hidden=!bundle;
  document.getElementById('wallet-material').closest('.field').hidden=!fparts.includes('wallet');
  document.getElementById('clutch-material').closest('.field').hidden=!fparts.includes('clutch');
  const nameInput=document.getElementById('clutch-name');
  nameInput.disabled=!(fparts.includes('clutch')&&personalizationAvailable());nameInput.closest('.personalization-field').hidden=nameInput.disabled;
  document.getElementById('order-qty').disabled=!f.variant;
  document.getElementById('summary-items').innerHTML=cart.length?cart.map(item=>{
    const parts=partsOf(item.variant),rows=[];
    if(parts.includes('wallet'))rows.push('Peněženka: '+escapeHtml(item.wallet));
    if(parts.includes('clutch'))rows.push('Psaníčko: '+escapeHtml(item.clutch)+(item.clutchName&&personalizationAvailable()?'<br>Jméno: '+escapeHtml(item.clutchName):''));
    const details=rows.length?`<small>${rows.join('<br>')}</small>`:'';
    const cover=isVoucherVariant(item.variant)?PRODUCT_MEDIA.voucher[0]:BUNDLE_PHOTO;
    return `<div class="cart-line"><img src="${cover.src}" alt="${escapeHtml(LABELS[item.variant])}" width="58" height="72"><div class="cart-line-content"><div class="cart-line-heading"><strong>${LABELS[item.variant]}</strong><b>${money(PRICES[item.variant]*item.qty)}</b></div>${item.variant==='combo'?'<small class="cart-best">NEJVÝHODNĚJŠÍ VOLBA · UŠETŘÍTE 426 KČ</small>':''}${details}<div class="cart-line-controls"><label>Počet <input type="number" data-cart-qty="${item.id}" value="${item.qty}" min="1" max="100" step="1" aria-label="Počet kusů: ${LABELS[item.variant]}"></label>${partsOf(item.variant).length?`<button class="cart-edit" type="button" data-edit-cart="${item.id}" aria-label="Upravit ${LABELS[item.variant]}">Upravit</button>`:''}<button class="cart-remove" type="button" data-remove-cart="${item.id}" aria-label="Odebrat ${LABELS[item.variant]}">Odebrat</button></div></div></div>`;
  }).join(''):'<p class="summary-note">Váš košík čeká na první tvořivou radost.</p>';
  renderTotals();renderCartUpsells();
  document.getElementById('summary-note').textContent='Doprava je zdarma v ceně. Balíčky rozesíláme v týdnu od 7. 12. a od 15. 12.';
  document.getElementById('summary-payment').textContent=PAYMENT_LABELS[f.payment]||PAYMENT_LABELS.bank;
  document.getElementById('order-form').hidden=!cart.length;document.querySelector('.summary-card').hidden=!cart.length;document.getElementById('empty-cart').hidden=!!cart.length;
  const count=cart.reduce((n,i)=>n+i.qty,0);
  const qtyInput=document.getElementById('order-qty');
  qtyInput.setCustomValidity(count>100?'Do jedné objednávky lze vložit nejvýše 100 kusů celkem.':'');
  const closed=!ordersOpen();const notice=document.getElementById('order-deadline-notice');notice.hidden=!closed;
  if(closed)notice.textContent='Vánoční objednávky jsme uzavřeli 30. listopadu 2026. Pokud něco potřebujete, napište nám na hello@make-ful.com.';
  document.querySelector('[type="submit"]').disabled=closed||orderSubmissionStarted;
}
// Doplňky v košíku podle toho, co v něm je (stejné nabídky jako v kvízu)
const CART_UPGRADES={penezenka:{to:'balicek',label:'Přidat psaníčko s jejím jménem'},psanicko:{to:'balicek',label:'Přidat 3D tištěnou peněženku'},balicek:{to:'combo',label:'Přidat voucher na workshop'}};
function renderCartUpsells(){
  const items=document.getElementById('summary-items');if(!items)return;
  let box=document.getElementById('cart-upsells');
  if(!box){box=document.createElement('div');box.id='cart-upsells';box.className='cart-upsells';items.after(box);
    const st=document.createElement('style');st.textContent='.cart-upsells{display:grid;gap:8px;margin:12px 0 4px}.cart-upsells:empty{display:none}.cart-upsell{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:14px;background:#f6f1ff;border:1px solid #e6dcff;font-size:14.5px;font-weight:600;line-height:1.3;cursor:pointer;text-align:left;width:100%;font-family:inherit;color:inherit}.cart-upsell span{flex:1}.cart-upsell b{white-space:nowrap;color:#7c3aed}.cart-upsell.ret{background:#e9fbf1;border-color:#c9f1db}.cart-upsell.ret b{color:#1f8a5b}.cart-upsell input{width:20px;height:20px;flex:0 0 20px;accent-color:#d1488f}';document.head.appendChild(st);}
  if(!cart.length){box.innerHTML='';return;}
  const has=v=>cart.some(i=>i.variant===v),out=[];
  cart.forEach(i=>{const u=CART_UPGRADES[i.variant];if(!u)return;const diff=(PRICES[u.to]-PRICES[i.variant])*i.qty;
    out.push(`<button type="button" class="cart-upsell" data-cart-upgrade="${i.id}"><span>${u.label}${i.qty>1?' ('+i.qty+'×)':''}</span><b>+${money(diff)}</b></button>`);});
  if(cart.some(i=>isVoucherVariant(i.variant))&&!has('knizka'))out.push(`<button type="button" class="cart-upsell" data-cart-addon="knizka"><span>Přidat interaktivní vzdělávací knížku</span><b>+${money(PRICES.knizka)}</b></button>`);
  if(cart.some(i=>i.variant!=='vraceni30'))out.push(`<label class="cart-upsell ret"><input type="checkbox" data-cart-ret${has('vraceni30')?' checked':''}><span>Prodloužené vrácení o 30 dní</span><b>+${money(PRICES.vraceni30)}</b></label>`);
  box.innerHTML=out.join('');
}
document.addEventListener('click',e=>{
  const up=e.target.closest('[data-cart-upgrade]');
  if(up){const it=cart.find(i=>i.id===up.dataset.cartUpgrade),u=it&&CART_UPGRADES[it.variant];if(!u)return;
    if(it.variant==='penezenka')it.clutch=it.wallet;if(it.variant==='psanicko')it.wallet=it.clutch;
    const diff=(PRICES[u.to]-PRICES[it.variant])*it.qty;it.variant=u.to;saveCart();mfTrack('add_to_cart',{currency:'CZK',value:diff,upsell:u.to});
    activeVariant=it.variant;selectActiveVariant(it.variant,it.id);updateOrderUI(false);showCartStatus('Dáreček jsme rozšířili.');return;}
  const ad=e.target.closest('[data-cart-addon]');
  if(ad){addToCart(ad.dataset.cartAddon,1);updateOrderUI(false);return;}
});
// 'input' přichází dřív než 'change' a formulář na něj překresluje souhrn, proto zachytáváme už 'input'
document.addEventListener('input',e=>{
  const r=e.target.closest('[data-cart-ret]');if(!r)return;e.stopPropagation();
  if(r.checked){if(!cart.some(i=>i.variant==='vraceni30'))addToCart('vraceni30',1);}else cart=cart.filter(i=>i.variant!=='vraceni30');
  saveCart();updateOrderUI(false);
},true);
document.addEventListener('change',e=>{if(e.target.closest('[data-cart-ret]'))e.stopPropagation();},true);
function buildOrderLines(f){
  const lines=['Vánoční objednávka Makeful',''];
  for(const i of cart){
    lines.push(`Dáreček: ${LABELS[i.variant]}`,`Počet kusů: ${i.qty}`,`Cena za kus: ${money(PRICES[i.variant])}`,`Cena položky: ${money(PRICES[i.variant]*i.qty)}`);
    if(i.variant==='combo')lines.push('Sleva kombinace: 426 Kč (běžná cena 2 564 Kč)');
    const parts=partsOf(i.variant);
    if(parts.includes('wallet'))lines.push(`Materiál peněženky: ${i.wallet}`);
    if(parts.includes('clutch'))lines.push(`Materiál psaníčka: ${i.clutch}`,`Jméno na psaníčko: ${personalizationAvailable()&&i.clutchName?i.clutchName:'bez personalizace'}`);
    if(VOUCHER_VALUE[i.variant])lines.push('Hodnota voucheru: '+VOUCHER_VALUE[i.variant],'Platnost: 1 rok od zakoupení','Využití: workshopy v našem studiu i online');
    lines.push('');
  }
  lines.push('Způsob platby: '+(PAYMENT_LABELS[f.payment]||PAYMENT_LABELS.bank),`Celkem za dárečky: ${money(cart.reduce((n,i)=>n+PRICES[i.variant]*i.qty,0))}`,'Doprava: zdarma, zahrnuta v ceně',`Promokód: ${f.promoCode||'neuveden'}`,'','Kontaktní údaje:',`Jméno: ${f.name}`,`E-mail: ${f.email}`,`Telefon: ${f.phone}`,`Adresa: ${f.street}, ${f.zip} ${f.city}`,`Poznámka: ${f.note||'bez poznámky'}`,'','Prosím o potvrzení objednávky a zaslání platebních údajů. Beru na vědomí, že balíčky odcházejí hromadně v týdnu od 7. 12. a od 15. 12. 2026.');
  return lines;
}
function getDraftId(){let id='';try{id=localStorage.getItem(DRAFT_KEY+'-id')||'';if(!/^draft-[a-z0-9-]{8,80}$/.test(id)){id='draft-'+Date.now().toString(36)+'-'+(window.crypto?.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).toLowerCase().replace(/[^a-z0-9-]/g,'');localStorage.setItem(DRAFT_KEY+'-id',id)}}catch{}return id}
const DRAFT_FIELDS=['customer-email','customer-name','customer-phone','customer-street','customer-city','customer-zip','customer-note','promo-code'];
function readDraftFields(){const out={};for(const id of DRAFT_FIELDS){const el=document.getElementById(id);if(el)out[id]=el.value.slice(0,500)}const pay=document.querySelector('#order-form input[name="payment"]:checked');if(pay)out.payment=pay.value;return out}
// Rozpracované údaje se ukládají (1) do tohoto prohlížeče, aby je zákazník nemusel psát znovu,
// a (2) do Makeu (list „Rozpracované“) – kvůli úspoře operací jen 2× za návštěvu: po vyplnění platného e-mailu a při odchodu ze stránky.
function scheduleDraftSave(){
  clearTimeout(draftSaveTimer);
  draftSaveTimer=setTimeout(()=>{try{localStorage.setItem(DRAFT_KEY,JSON.stringify({savedAt:new Date().toISOString(),fields:readDraftFields()}))}catch{}},400);
}
function draftServerPayload(){
  const f=readOrderForm();if(!f)return null;
  const email=f.email.toLowerCase();if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(email))return null;
  return {event:'order_draft',draftId:getDraftId(),cart:cart.map(i=>({variant:i.variant,qty:i.qty})),
    customer:{email,name:f.name,phone:f.phone,street:f.street,city:f.city,zip:f.zip,note:f.note},payment:f.payment==='card'?'card':'bank',page:location.origin+location.pathname};
}
function sendDraft(onExit){
  if(!MAKE_DRAFT_URL||orderSubmissionStarted||!cart.length||document.getElementById('order-website')?.value)return;
  const p=draftServerPayload();if(!p)return;const json=JSON.stringify(p);if(json===lastDraftSent)return;lastDraftSent=json;
  const body=new URLSearchParams({payload:json});
  try{
    if(onExit&&navigator.sendBeacon){navigator.sendBeacon(MAKE_DRAFT_URL,body);return}
    fetch(MAKE_DRAFT_URL,{method:'POST',body,mode:'no-cors',keepalive:true,cache:'no-store'}).catch(()=>{lastDraftSent=''});
  }catch{lastDraftSent=''}
}
function restoreOrderDraft(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch{}
  const fields=saved&&saved.fields;if(!fields||typeof fields!=='object')return;
  for(const id of DRAFT_FIELDS){const el=document.getElementById(id);if(el&&!el.value&&typeof fields[id]==='string')el.value=fields[id].slice(0,500)}
  if(fields.payment==='card'||fields.payment==='bank'){const r=document.querySelector(`#order-form input[name="payment"][value="${fields.payment}"]`);if(r)r.checked=true}
}
function clearOrderDraft(){try{localStorage.removeItem(DRAFT_KEY);localStorage.removeItem(DRAFT_KEY+'-id')}catch{}lastDraftSent=''}
// Server (Make) si sám přepočítá ceny i promokód. Posíláme jen výběr zákazníka, žádné ceny.
// Kombinace (voucher + kreativní sada) jde do Make jako 2 položky + automatický kód KOMBINACE426K (−426 Kč),
// aby byl v listu Položky voucher a balíček každý na svém řádku. Jen když zákazník nezadal vlastní promokód a kombinace je 1 kus
// (Make umí jen jeden promokód); jinak se pošle jako dřív, cena se nemění.
const COMBO_CODE='KOMBINACE426K';
function buildServerPayload(){
  const f=readOrderForm();
  let items=cart.map(i=>({variant:i.variant,qty:i.qty,wallet:i.wallet,clutch:i.clutch,clutchName:partsOf(i.variant).includes('clutch')&&personalizationAvailable()?i.clutchName:''}));
  let promoCode=promoAllowed(f.promoCode)?f.promoCode:'';
  const comboQty=items.filter(i=>i.variant==='combo').reduce((n,i)=>n+i.qty,0);
  if(comboQty===1&&!promoCode){items=items.flatMap(i=>i.variant==='combo'?[{variant:'voucher',qty:1,wallet:'',clutch:'',clutchName:''},{variant:'balicek',qty:1,wallet:i.wallet,clutch:i.clutch,clutchName:i.clutchName}]:[i]);promoCode=COMBO_CODE;}
  return {event:'order_submitted',draftId:getDraftId(),
    cart:items,
    customer:{name:f.name,email:f.email,phone:f.phone,street:f.street,city:f.city,zip:f.zip,note:f.note},
    payment:f.payment==='card'?'card':'bank',promoCode,
    website:document.getElementById('order-website')?.value||'',
    consent:!!document.getElementById('order-consent')?.checked&&!!document.getElementById('order-shipping-consent')?.checked,
    returnUrl:location.origin+location.pathname};
}
// Každé odeslání = nová objednávka (zákazník může objednat i dvakrát totéž).
function newOrderId(){
  const random=(window.crypto?.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9-]/g,'');
  return ('ord-'+random).slice(0,64);
}
async function sendOrderToMake(body){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
  try{
    const response=await fetch(MAKE_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:controller.signal});
    let data=null;try{data=await response.json()}catch{}
    if(!data||typeof data!=='object')throw new Error('Missing order confirmation');
    return data;
  }finally{clearTimeout(timer)}
}
function showOrderResult(html,tone='info'){
  const box=document.getElementById('order-result');if(!box)return;
  box.innerHTML=html;box.hidden=false;box.dataset.tone=tone;box.scrollIntoView({behavior:'smooth',block:'center'});
}
function finishSuccessfulOrder(){cart=[];saveCart();try{sessionStorage.removeItem('makeful-bc-sent');localStorage.removeItem(CART_PROMO_KEY);localStorage.removeItem('makeful-quiz-offer-2026')}catch{}clearOrderDraft();updateOrderUI(false);}
const ORDER_ERRORS={
  retry:()=>'Objednávku se teď nepodařilo uložit. Zkuste ji prosím za chvíli odeslat znovu.',
  closed:()=>'Vánoční objednávky jsme uzavřeli 30. listopadu 2026. Pokud něco potřebujete, napište nám na '+MAIL_TO+'.',
  invalid:()=>'Objednávku se nepodařilo ověřit. Zkontrolujte prosím kontaktní údaje (e-mail, telefon, PSČ) a obsah košíku a zkuste to znovu.',
  payment_unavailable:()=>'Platební bránu se teď nepodařilo připravit. Zkuste to prosím za chvíli znovu, nebo zvolte platbu převodem.'
};
async function submitOrder(e){
  e.preventDefault();if([...document.querySelectorAll('[data-cart-qty]')].some(input=>!input.reportValidity()))return;updateOrderUI();clearTimeout(draftSaveTimer);
  if(!ordersOpen()){alert('Objednávky jsme přijímali do 30. listopadu 2026. Napište nám prosím e-mailem.');return;}
  const form=document.getElementById('order-form');if(!form.reportValidity())return;
  if(!cart.length){alert('Vyberte prosím dáreček do košíku.');return;}
  const status=document.getElementById('success-message');status.style.display='block';
  if(!MAKE_WEBHOOK_URL){
    const f=readOrderForm();
    status.textContent='Objednávkový systém není připojený. Otevíráme e-mail s připravenými údaji.';
    window.location.href=`mailto:${MAIL_TO}?subject=${encodeURIComponent('Vánoční objednávka Makeful')}&body=${encodeURIComponent(buildOrderLines(f).join('\n'))}`;
    return;
  }
  if(orderSubmissionStarted)return;
  const submitButton=form.querySelector('button[type="submit"]');
  orderSubmissionStarted=true;submitButton.disabled=true;
  status.textContent='Ukládáme objednávku…';
  const body=buildServerPayload();
  try{
    const response=await sendOrderToMake({...body,orderId:newOrderId()});
    if(response.accepted===true){
      const number=String(response.orderNumber||'').replace(/[^0-9]/g,'');
      if(response.payment==='card'){
        const destination=new URL(String(response.checkoutUrl||''));
        if(destination.protocol!=='https:'||!['checkout.stripe.com','buy.stripe.com'].includes(destination.hostname))throw new Error('Invalid payment destination');
        // Na Stripe až poté, co GTM odešle tagy na order_submitted (Purchase), nejdéle za 1,5 s
        let gone=false;const go=()=>{if(gone)return;gone=true;window.location.assign(destination.href)};
        const ov=Number.isFinite(response.total)?response.total:mfCartValue();mfTrack('order_submitted',{payment:'card',order_number:number,currency:'CZK',value:ov,ecommerce:{transaction_id:number,currency:'CZK',value:ov,items:mfItems(cart)},eventCallback:()=>setTimeout(go,100),eventTimeout:1300});try{sessionStorage.setItem('makeful-paid-order',JSON.stringify({number,value:ov,items:mfItems(cart)}))}catch{}
        status.textContent='Přesměrováváme vás na zabezpečenou platbu kartou…';
        setTimeout(go,1500);return;
      }
      {const ov=Number.isFinite(response.total)?response.total:mfCartValue();mfTrack('order_submitted',{payment:'bank',order_number:number,currency:'CZK',value:ov,ecommerce:{transaction_id:number,currency:'CZK',value:ov,items:mfItems(cart)}});}
      status.style.display='none';
      const total=Number.isFinite(response.total)?money(response.total):'';
      let qr='';try{const q=new URL(String(response.qrUrl||''));if(q.protocol==='https:'&&q.hostname==='api.qrserver.com')qr=`<img class="order-qr" src="${escapeHtml(q.href)}" width="180" height="180" alt="QR kód pro platbu">`}catch{}
      showOrderResult(`<strong>Děkujeme, objednávku č. ${escapeHtml(number)} jsme přijali.</strong><div class="order-pay"><div><p>Prosíme o úhradu <strong>do 24 hodin</strong>. Letos vyrábíme jen omezený počet kusů.</p>${window.MakefulQrPay?'':`<p>Číslo účtu: <strong>3623366010/3030</strong><br>Variabilní symbol: <strong>${escapeHtml(number)}</strong>${total?`<br>Částka: <strong>${escapeHtml(total)}</strong>`:''}</p>`}<p>Stejné údaje i QR kód jsme vám poslali e-mailem. Balíčky kompletujeme v Praze a rozesíláme v týdnu od 7. 12. a od 15. 12.</p></div>${window.MakefulQrPay?'<div id="mfPayBox" style="flex:1 1 100%"></div>':qr}</div>`,'success');
      try{const pb=document.getElementById('mfPayBox');if(pb&&window.MakefulQrPay)window.MakefulQrPay.render(pb,{qrUrl:response.qrUrl,account:'3623366010/3030',amount:Number.isFinite(response.total)?response.total:'',vs:String(number)});}catch{}
      finishSuccessfulOrder();return;
    }
    const message=(ORDER_ERRORS[response.reason]||ORDER_ERRORS.invalid)(response);
    status.textContent=message;
  }catch{
    status.textContent='Spojení se nepodařilo dokončit. Než objednávku odešlete znovu, podívejte se prosím do e-mailu. Pokud vám přišlo potvrzení, objednávka už je přijatá. Jinak to zkuste znovu, případně nám napište na '+MAIL_TO+'.';
  }
  orderSubmissionStarted=false;submitButton.disabled=!ordersOpen();
}
function handlePaymentReturn(){
  const params=new URLSearchParams(location.search);const state=params.get('platba');if(!state)return;
  const number=String(params.get('objednavka')||'').replace(/[^0-9]/g,'');
  if(state==='ok'){
    let paid=null;try{paid=JSON.parse(sessionStorage.getItem('makeful-paid-order')||'null');sessionStorage.removeItem('makeful-paid-order')}catch{}
    const pv=paid?.value||mfCartValue(),pi=paid?.items||mfItems(cart);
    mfTrack('purchase',{payment:'card',order_number:number,currency:'CZK',value:pv,ecommerce:{transaction_id:number,currency:'CZK',value:pv,items:pi}});
    showOrderResult(`<strong>Děkujeme za objednávku${number?' č. '+escapeHtml(number):''}!</strong><br>Platbu teď ověřujeme u platební brány Stripe. Jakmile ji potvrdí, pošleme vám e-mail. Obvykle to trvá jen pár minut.`,'success');
    finishSuccessfulOrder();
  }else if(state==='zrusena'){
    showOrderResult(`<strong>Platba nebyla dokončena.</strong><br>Košík vám zůstal. K platbě se můžete kdykoli vrátit odkazem z potvrzovacího e-mailu. Platí až do Vánoc.`,'info');
  }
  history.replaceState(null,'',location.pathname);
}
let quickAddVariant='',quickAddOpts={};
// 1 + 1 nabídky: promokód se předvyplní v košíku a Make podle něj přepočítá cenu
function setCartPromo(code){try{if(code)localStorage.setItem(CART_PROMO_KEY,code);}catch{}}
function openQuickAdd(variant,opts={}){
  const dialog=document.getElementById('quick-add-dialog');if(!dialog)return;
  quickAddVariant=variant;quickAddOpts=opts;const parts=partsOf(variant),qty=opts.qty||1;
  const w=dialog.querySelector('[data-quick-wallet]'),c=dialog.querySelector('[data-quick-clutch]');
  if(w)w.closest('label').hidden=!parts.includes('wallet');if(c)c.closest('label').hidden=!parts.includes('clutch');
  const withName=parts.includes('clutch')&&personalizationAvailable();
  const nameField=dialog.querySelector('.quick-name-field');nameField.hidden=!withName;
  const name=dialog.querySelector('[data-quick-name]');name.disabled=!withName;name.value='';
  let name2=dialog.querySelector('[data-quick-name2]');
  if(!name2){const l=document.createElement('label');l.className='quick-name-field quick-name2-field';l.innerHTML='Jméno na druhé psaníčko zdarma<input data-quick-name2 maxlength="60" placeholder="Volitelné jméno" type="text"/>';nameField.after(l);name2=l.querySelector('input');}
  name2.closest('label').hidden=!(withName&&qty===2);name2.value='';
  nameField.firstChild.textContent=withName&&qty===2?'Jméno na první psaníčko zdarma':'Jméno na psaníčko zdarma';
  const intro=dialog.querySelector('.quick-add-intro');if(intro)intro.textContent=parts.length>1?'Peněženka a psaníčko mohou být ze stejného, nebo z odlišného materiálu. Vše je z pružného 100% TPU.':'Vyberte materiál. Je z pružného 100% TPU.';
  dialog.showModal();
}
function initQuickAdd(){
  const dialog=document.getElementById('quick-add-dialog');if(!dialog)return;
  dialog.querySelectorAll('[data-quick-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.querySelector('[data-quick-confirm]')?.addEventListener('click',()=>{
    const o={wallet:dialog.querySelector('[data-quick-wallet]').value,clutch:dialog.querySelector('[data-quick-clutch]').value},qty=quickAddOpts.qty||1;
    const n1=dialog.querySelector('[data-quick-name]').value,n2=dialog.querySelector('[data-quick-name2]')?.value||'';
    let item;
    if(qty===2&&partsOf(quickAddVariant).includes('clutch')&&n1.trim()!==n2.trim()){item=addToCart(quickAddVariant,1,{...o,clutchName:n1,promo:quickAddOpts.promo});if(item)addToCart(quickAddVariant,1,{...o,clutchName:n2,promo:quickAddOpts.promo});}
    else item=addToCart(quickAddVariant,qty,{...o,clutchName:n1,promo:quickAddOpts.promo});
    if(!item)return;setCartPromo(quickAddOpts.promo);updateCartBar();dialog.close();
    if(quickAddOpts.go)goAfterTrack('objednavka.html?item='+encodeURIComponent(item.id));
  });
}
function initStandaloneQuiz(){
  const quiz=document.getElementById('standalone-quiz');if(!quiz)return;
  const steps=[...quiz.querySelectorAll('[data-standalone-step]')],next=quiz.querySelector('[data-standalone-next]'),error=quiz.querySelector('[data-standalone-error]'),feedback=quiz.querySelector('[data-standalone-feedback]'),feedbackImage=quiz.querySelector('[data-standalone-feedback-image]'),feedbackTitle=quiz.querySelector('[data-standalone-feedback-title]'),feedbackCopy=quiz.querySelector('[data-standalone-feedback-copy]'),progress=quiz.querySelector('[data-standalone-progress]'),bar=quiz.querySelector('[data-standalone-progress-bar]'),result=quiz.querySelector('[data-standalone-result]');
  let current=0,recommendation='combo';
  const updateProgress=()=>{progress.textContent=(current+1)+' / '+steps.length;bar.style.width=((current+1)/steps.length*100)+'%'};
  const score=()=>{const a=Object.fromEntries([...quiz.querySelectorAll('input[type=radio]:checked')].map(i=>[i.name,i.value])),s={balicek:0,voucher:0,combo:0};if(a.sq1==='age-young')s.balicek+=1;if(a.sq1==='age-teen')s.combo+=1;if(a.sq1==='age-adult')s.voucher+=1;if(a.sq1==='age-family')s.combo+=1;if(a.sq2==='fashion'||a.sq2==='craft')s.balicek+=4;if(a.sq2==='experience')s.voucher+=4;if(a.sq2==='technology')s.combo+=3;if(a.sq3==='make')s.balicek+=4;if(a.sq3==='experience')s.voucher+=4;if(a.sq3==='both')s.combo+=5;if(a.sq4==='home')s.balicek+=4;if(a.sq4==='workshop')s.voucher+=4;if(a.sq4==='both')s.combo+=5;if(a.sq5==='you')s.balicek+=3;if(a.sq5==='her')s.voucher+=3;if(a.sq5==='both')s.combo+=5;return ['combo','balicek','voucher'].sort((x,y)=>s[y]-s[x])[0]};
  const showResult=()=>{recommendation=score();const data={balicek:['Kreativní vzdělávací balíček','Dárek pro ni, která chce tvořit sama. Předchystané moduly se skládají do sebe bez nepořádku a výsledkem je peněženka a psaníčko, které může používat.','1 188 Kč','kreativni-balicek.html'],voucher:['Kreativní 3D tištěný voucher','Bezpečný výběr, když nechcete hádat její vkus. Voucher při doteku mění barvu a ona si vybere workshop online nebo ve studiu.','1 188 Kč','voucher.html'],combo:['Voucher + kreativní sada','Kompletní cesta od vlastního tvoření k workshopu. Získáte balíček i voucher a ušetříte 426 Kč.','2 138 Kč','kreativni-balicek.html#kombinace']}[recommendation];quiz.querySelector('[data-standalone-result-title]').textContent=data[0];quiz.querySelector('[data-standalone-result-copy]').textContent=data[1];quiz.querySelector('[data-standalone-result-price]').textContent=data[2];quiz.querySelector('[data-standalone-detail]').href=data[3];quiz.querySelector('[data-standalone-buy]').dataset.quizVariant=recommendation;const upsell=quiz.querySelector('[data-standalone-upsell]');upsell.hidden=recommendation==='combo';upsell.textContent=recommendation==='voucher'?'Přidat i tvoření doma a ušetřit 426 Kč →':'Přidat voucher a získat nejvýhodnější kombinaci →';quiz.querySelector('.standalone-progress').hidden=true;quiz.querySelector('.standalone-step').parentElement.querySelectorAll('[data-standalone-step]').forEach(s=>s.hidden=true);quiz.querySelector('.standalone-actions').hidden=true;feedback.hidden=true;result.hidden=false};
  const reactions={
    'age-young':{title:'Hravé objevování od 8 let.',copy:'Balíček je připravený tak, aby se dalo začít hned. Předchystané moduly se skládají do sebe a výsledkem je peněženka a psaníčko.',image:'assets/photos/produkt-balicek-novy.webp'},
    'age-teen':{title:'Dárek pro vlastní styl.',copy:'V dospívání potěší možnost zkoušet nové materiály a propojit módu s 3D tiskem. Balíček i voucher nechají prostor pro vlastní nápady.',image:'assets/photos/produkt-penezenka-v-ruce.webp'},
    'age-adult':{title:'Tvoření vlastním tempem.',copy:'Makeful není jen pro děti. Balíčky i workshopy jsou vhodné pro dospělé ženy, i když s 3D tiskem teprve začínají.',image:'assets/photos/voucher-zmena-barvy-dotek.webp'},
    'age-family':{title:'Tvoření, které můžete sdílet.',copy:'Kombinace spojí domácí sestavení doplňků s voucherem na další zážitek. Zapojit se může kdokoliv od 8 let.',image:'assets/photos/produkt-kombinace-nova.webp'},
    fashion:{title:'Dárek, který se dá nosit.',copy:'Peněženku a psaníčko si sestaví sama a potom je může používat. Vybere si také materiál pro každý doplněk zvlášť.',image:'assets/photos/produkt-penezenka-v-ruce.webp'},
    craft:{title:'Tvoření bez nepořádku.',copy:'Vše je předchystané. Moduly se skládají do sebe bez dalších pomůcek, takže se může soustředit na radost z vlastního nápadu.',image:'assets/photos/produkt-pripravene-moduly.webp'},
    technology:{title:'Móda potkává nové technologie.',copy:'Kreativní sada i voucher otevírají cestu k 3D tisku, materiálům a workshopům, které propojují design s učením.',image:'assets/photos/voucher-ruzovy.webp'},
    home:{title:'Tvoření doma bez stresu.',copy:'Balíček je připravený tak, aby se dalo začít hned. Moduly se skládají do sebe, bez nepořádku a bez dalších pomůcek.',image:'assets/photos/produkt-balicek-novy.webp'},
    workshop:{title:'Zážitek, který si vybere sama.',copy:'Voucher je fyzický 3D tištěný dárek, který při doteku mění barvu. Téma workshopu si obdarovaná zvolí online nebo ve studiu.',image:'assets/photos/voucher-zmena-barvy-dotek.webp'},
    both:{title:'Dvě tvořivé radosti v jednom.',copy:'Kombinace spojí domácí sestavení peněženky a psaníčka s voucherem. Navíc ušetříte 426 Kč.',image:'assets/photos/produkt-kombinace-nova.webp'},
    make:{title:'Dárek, který po sestavení používá.',copy:'Nevznikne jen další sada v krabici. Zůstane jí peněženka a psaníčko, které si vytvořila vlastníma rukama.',image:'assets/photos/produkt-penezenka-v-ruce.webp'},
    experience:{title:'Čas na objevování módy.',copy:'Workshop propojuje módu, design a nové technologie. Vše je vedené tak, aby se mohly zapojit i začátečnice.',image:'assets/photos/o-nas-objevovani-technologii.webp'},
    you:{title:'Když znáte její styl, trefíte se snadno.',copy:'Konkrétní balíček jí dá vlastní doplněk a možnost zvolit si materiál peněženky i psaníčka.',image:'assets/photos/produkt-penezenka-cerna.webp'},
    her:{title:'Nemusíte hádat její vkus.',copy:'Voucher nechá výběr workshopu na ní. Je platný jeden rok a využít ho může online i prezenčně.',image:'assets/photos/voucher-ruzovy-v-ruce.webp'}
  };
  const back=quiz.querySelector('[data-standalone-back]');
  const showReaction=key=>{const item=reactions[key]||reactions.both;feedbackTitle.textContent=item.title;feedbackCopy.textContent=item.copy;feedbackImage.src=item.image;feedbackImage.alt=item.title;steps[current].hidden=true;feedback.hidden=false;next.textContent=current===steps.length-1?'Ukázat doporučení →':'Pokračovat →';window.scrollTo({top:0,behavior:'smooth'})};
  quiz.querySelectorAll('input[type="radio"]').forEach(input=>input.addEventListener('change',()=>{error.hidden=true;showReaction(input.value)}));
  next.addEventListener('click',()=>{const chosen=quiz.querySelector(`input[name="sq${current+1}"]:checked`);if(!chosen){error.hidden=false;return}if(current<steps.length-1){feedback.hidden=true;steps[current].hidden=true;current++;steps[current].hidden=false;next.textContent='Pokračovat →';updateProgress();window.scrollTo({top:0,behavior:'smooth'})}else showResult()});
  back?.addEventListener('click',()=>{if(!feedback.hidden){feedback.hidden=true;steps[current].hidden=false;return}if(current>0){steps[current].hidden=true;current--;steps[current].hidden=false;updateProgress()}else location.href='kviz.html'});
  quiz.querySelector('[data-standalone-buy]')?.addEventListener('click',e=>{const variant=e.currentTarget.dataset.quizVariant;if(variant!=='voucher'){location.href='kreativni-balicek.html'+(variant==='combo'?'#kombinace':'');return}const item=addToCart(variant);if(item)goAfterTrack('objednavka.html?item='+encodeURIComponent(item.id))});
  quiz.querySelector('[data-standalone-upsell]')?.addEventListener('click',()=>{location.href='kreativni-balicek.html#kombinace'});
  updateProgress();
}
function initQuiz(){
  const dialog=document.getElementById('quiz-dialog');if(!dialog)return;
  const steps=[...dialog.querySelectorAll('[data-quiz-step]')],progress=dialog.querySelector('[data-quiz-progress]'),next=dialog.querySelector('[data-quiz-next]'),back=dialog.querySelector('[data-quiz-back]'),error=dialog.querySelector('[data-quiz-error]'),result=dialog.querySelector('[data-quiz-result]');
  let current=0,recommendation='combo';
  const reset=()=>{current=0;steps.forEach((step,i)=>step.hidden=i!==0);result.hidden=true;dialog.querySelector('.quiz-steps').hidden=false;dialog.querySelector('.quiz-actions').hidden=false;error.hidden=true;back.hidden=true;next.hidden=false;next.textContent='Další otázka →';progress.textContent='Otázka 1 ze '+steps.length;dialog.querySelectorAll('input[type=radio]').forEach(input=>input.checked=false);};
  const answers=()=>Object.fromEntries([...dialog.querySelectorAll('input[type=radio]:checked')].map(input=>[input.name,input.value]));
  const showResult=()=>{
    const a=answers(),score={balicek:0,voucher:0,combo:0};
    if(a.q1==='home'){score.balicek+=3;score.combo+=1} if(a.q1==='workshop'){score.voucher+=3;score.combo+=1} if(a.q1==='both')score.combo+=4;
    if(a.q2==='yes'){score.balicek+=2;score.combo+=2} if(a.q2==='maybe'){score.balicek+=1;score.voucher+=1;score.combo+=1} if(a.q2==='no')score.voucher+=3;
    if(a.q3==='creative')score.balicek+=3; if(a.q3==='experience')score.voucher+=3; if(a.q3==='both')score.combo+=4;
    recommendation=['combo','balicek','voucher'].sort((x,y)=>score[y]-score[x])[0];
    const copy={balicek:['Kreativní vzdělávací balíček','Sestaví si vlastní peněženku a psaníčko a při tom objeví propojení módy s 3D tiskem.','1 188 Kč','kreativni-balicek.html'],voucher:['Kreativní 3D tištěný voucher','Neotřelý dárek, který při doteku mění barvu. Workshop si vybere sama, online nebo ve studiu.','1 188 Kč','voucher.html'],combo:['Voucher + kreativní sada','Nejvíc radosti v jednom dárku. Tvoření doma, workshop podle jejího výběru a sleva 426 Kč.','2 138 Kč','kreativni-balicek.html#kombinace']}[recommendation];
    dialog.querySelector('[data-quiz-result-title]').textContent=copy[0];dialog.querySelector('[data-quiz-result-copy]').textContent=copy[1];dialog.querySelector('[data-quiz-result-price]').textContent=copy[2];dialog.querySelector('[data-quiz-detail]').href=copy[3];dialog.querySelector('[data-quiz-buy]').dataset.quizVariant=recommendation;const upsell=dialog.querySelector('[data-quiz-upsell]');upsell.hidden=recommendation==='combo';upsell.textContent=recommendation==='voucher'?'Přidat i tvoření doma a ušetřit se zvýhodněnou kombinací →':'Přidat voucher a získat zvýhodněnou kombinaci →';
    dialog.querySelector('.quiz-steps').hidden=true;dialog.querySelector('.quiz-actions').hidden=true;result.hidden=false;progress.textContent='Doporučení pro vás';
  };
  document.querySelector('[data-quiz-open]')?.addEventListener('click',()=>{reset();dialog.showModal()});
  dialog.querySelector('[data-quiz-close]')?.addEventListener('click',()=>dialog.close());
  next?.addEventListener('click',()=>{const chosen=dialog.querySelector(`input[name="q${current+1}"]:checked`);if(!chosen){error.hidden=false;return}error.hidden=true;if(current<steps.length-1){steps[current].hidden=true;current++;steps[current].hidden=false;back.hidden=false;progress.textContent='Otázka '+(current+1)+' ze '+steps.length;if(current===steps.length-1)next.textContent='Zobrazit doporučení →'}else showResult()});
  back?.addEventListener('click',()=>{if(current>0){steps[current].hidden=true;current--;steps[current].hidden=false;progress.textContent='Otázka '+(current+1)+' ze '+steps.length;next.textContent='Další otázka →';if(current===0)back.hidden=true}});
  dialog.querySelector('[data-quiz-buy]')?.addEventListener('click',e=>{const variant=e.currentTarget.dataset.quizVariant;const item=addToCart(variant);if(item){dialog.close();goAfterTrack('objednavka.html?item='+encodeURIComponent(item.id))}});
  dialog.querySelector('[data-quiz-upsell]')?.addEventListener('click',()=>{const item=addToCart('combo');if(item){dialog.close();goAfterTrack('objednavka.html?item='+encodeURIComponent(item.id))}});
  dialog.querySelector('[data-quiz-restart]')?.addEventListener('click',reset);
}
function initProductMedia(){
  document.querySelectorAll('[data-product-photo]').forEach(slot=>{
    const media=PRODUCT_MEDIA[slot.dataset.productPhoto]||[];if(!media.length)return;
    const gallery=slot.closest('[data-gallery]');
    const display=item=>{
      const caption=gallery?.querySelector('[data-media-caption]');if(caption){caption.textContent=item.caption||'';caption.hidden=!item.caption&&!gallery.classList.contains('card-media');}
      slot.querySelectorAll('video').forEach(video=>video.pause());
      if(item.type==='video'){
        const video=document.createElement('video');video.src=item.src;video.controls=true;video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='none';
        video.setAttribute('aria-label',item.alt||'Produktové video');
        if(item.poster)video.poster=item.poster;
        (item.captions||[]).forEach(caption=>{const track=document.createElement('track');track.kind='captions';track.src=caption.src;track.srclang=caption.srclang;track.label=caption.label;video.append(track);});
        const fallback=document.createElement('a');fallback.href=item.src;fallback.textContent='Otevřít produktové video';video.append(fallback);
        slot.replaceChildren(video);slot.classList.add('has-product-photo');
      }else{
        const img=document.createElement('img');img.alt=item.alt||'Produkt Makeful';img.decoding='async';img.loading=slot.dataset.productPhoto==='hero'?'eager':'lazy';
        img.src=item.src;if(item.pos)img.style.objectPosition=item.pos;slot.replaceChildren(img);slot.classList.add('has-product-photo');
      }
    };
    galleryControllers.set(slot,display);
    display(media[0]);
    if(gallery&&media.length>0){const thumbs=gallery.querySelector('.gallery-thumbs');thumbs.hidden=false;
      media.forEach((item,i)=>{
        const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',(item.type==='video'?'Zobrazit video ':'Zobrazit fotografii ')+(i+1));b.setAttribute('aria-pressed',String(i===0));
        if(item.type!=='video'||item.poster){const img=document.createElement('img');img.src=item.type==='video'?item.poster:item.src;img.alt='';img.loading='lazy';b.append(img);}
        if(item.type==='video'){const play=document.createElement('span');play.className='video-play-mark';play.textContent='▶';play.setAttribute('aria-hidden','true');b.append(play);}
        b.addEventListener('click',()=>{display(item);thumbs.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));});thumbs.append(b);
      });
    }
  });
}
document.addEventListener('play',event=>{if(event.target instanceof HTMLVideoElement)document.querySelectorAll('video').forEach(video=>{if(video!==event.target)video.pause();});},true);
document.addEventListener('DOMContentLoaded',()=>{
  {const v={'kreativni-balicek.html':'balicek','voucher.html':'voucher'}[location.pathname.split('/').pop()];if(v)mfTrack('view_item',{currency:'CZK',value:PRICES[v],ecommerce:{currency:'CZK',value:PRICES[v],items:mfItems([{variant:v,qty:1}])}});}
  if(document.getElementById('order-form')&&cart.length&&!new URLSearchParams(location.search).get('platba')){const sig=JSON.stringify(cart.map(i=>[i.variant,i.qty]));let seen='';try{seen=sessionStorage.getItem('makeful-bc-sent')||''}catch{}if(seen!==sig){const v=mfCartValue();mfTrack('begin_checkout',{currency:'CZK',value:v,ecommerce:{currency:'CZK',value:v,items:mfItems(cart)}});try{sessionStorage.setItem('makeful-bc-sent',sig)}catch{}}}
  saveCart();initProductMedia();initProductOptions();initAboutPhotos();initAboutMedia();initCartEditor();initQuickAdd();initQuiz();initStandaloneQuiz();
  const form=document.getElementById('order-form');if(!form)return;
  const params=new URLSearchParams(location.search);const preset=params.get('variant')||({balicek:'balicek',voucher:'voucher',oba:'combo'}[params.get('product')]);
  if(Object.hasOwn(PRICES,preset)&&!cart.some(i=>i.variant===preset))cart.push(newItem(preset));
  const requestedItem=cart.find(i=>i.id===params.get('item'));
  activeVariant=requestedItem?.variant||(Object.hasOwn(PRICES,preset)?preset:cart[0]?.variant||'');selectActiveVariant(activeVariant,requestedItem?.id);saveCart();
  form.addEventListener('change',e=>{if(e.target.name==='variant'){activeVariant=e.target.value;selectActiveVariant(activeVariant);}updateOrderUI();scheduleDraftSave();});
  form.addEventListener('input',e=>{if(e.target.name!=='variant')updateOrderUI();scheduleDraftSave();});
  restoreOrderDraft();
  {let pc='';try{pc=localStorage.getItem(CART_PROMO_KEY)||''}catch{}const pi=document.getElementById('promo-code');if(pc&&pi&&!pi.value.trim()&&cart.length)pi.value=pc;enforcePromoRules();}
  // Mobil: nejdřív kontaktní a doručovací údaje, pak shrnutí a nakonec souhlasy s tlačítkem objednat.
  {const summary=document.querySelector('.summary-card'),shell=summary?.parentElement,finalStep=document.getElementById('order-consent')?.closest('.form-section');
   const mq=matchMedia('(max-width: 980px)');
   const place=()=>{if(!summary||!finalStep)return;if(mq.matches){if(summary.parentElement!==form){form.insertBefore(summary,finalStep);summary.classList.add('summary-inline');}}else if(summary.parentElement!==shell){shell.appendChild(summary);summary.classList.remove('summary-inline');}};
   place();mq.addEventListener?.('change',place);}
  form.addEventListener('submit',submitOrder);updateOrderUI(false);handlePaymentReturn();
  // Při odchodu ze stránky odešleme poslední stav rozpracované objednávky (jen s platným e-mailem).
  addEventListener('pagehide',()=>sendDraft(true));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')sendDraft(true)});
  document.getElementById('customer-email')?.addEventListener('change',()=>sendDraft(false));
  const promoInput=document.getElementById('promo-code'),promoButton=document.getElementById('apply-promo'),promoStatus=document.getElementById('promo-status');
  const checkPromo=async(silent)=>{
    const code=promoInput.value.trim().toUpperCase();appliedPromo=null;renderTotals();
    if(!code){promoStatus.textContent=silent?'':'Zadejte promokód, pokud ho máte.';promoStatus.dataset.state='';return;}
    if(!promoAllowed(code)){promoStatus.textContent=OFFER_PROMOS[code].msg;promoStatus.dataset.state='error';return;}
    if(!MAKE_PROMO_URL){promoStatus.textContent='Promokód ověříme při odeslání objednávky.';promoStatus.dataset.state='';return;}
    promoButton.disabled=true;promoStatus.dataset.state='';promoStatus.textContent='Ověřujeme promokód…';
    try{
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
      const r=await fetch(MAKE_PROMO_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code}),cache:'no-store',signal:controller.signal});clearTimeout(timer);
      const d=await r.json();
      if(promoInput.value.trim().toUpperCase()!==code)return;
      if(d&&d.valid===true&&Number(d.value)>0){
        appliedPromo={code,type:d.type==='percent'?'percent':'amount',value:Number(d.value)};renderTotals();
        const sub=cart.reduce((n,i)=>n+PRICES[i.variant]*i.qty,0);
        promoStatus.textContent=appliedPromo.type==='percent'?`Promokód ${code} platí: sleva ${appliedPromo.value} % (−${money(promoDiscount(sub))}) je odečtená z ceny.`:`Promokód ${code} platí: sleva ${money(promoDiscount(sub)||appliedPromo.value)} je odečtená z ceny.`;promoStatus.dataset.state='ok';
        mfTrack('promo_applied',{promo_code:code});
      }else if(d&&d.reason==='retry'){throw new Error('retry');}
      else{promoStatus.textContent='Tento promokód neplatí. Zkontrolujte, prosím, jak je napsaný.';promoStatus.dataset.state='error';}
    }catch{promoStatus.textContent='Promokód se teď nepodařilo ověřit. Zkuste to prosím znovu. Pokud objednávku odešlete, ověříme ho při zpracování.';promoStatus.dataset.state='error';}
    finally{promoButton.disabled=false;}
  };
  promoButton?.addEventListener('click',()=>{checkPromo(false);scheduleDraftSave();});
  promoInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();checkPromo(false);}});
  promoInput?.addEventListener('input',()=>{if(appliedPromo&&appliedPromo.code!==promoInput.value.trim().toUpperCase()){appliedPromo=null;renderTotals();}promoStatus.textContent=promoInput.value.trim()?'Klikněte na Uplatnit a promokód hned ověříme.':'';promoStatus.dataset.state='';scheduleDraftSave();});
  if(promoInput&&promoInput.value.trim())setTimeout(()=>checkPromo(true),300);
  // Recheck the deadline if a customer leaves the page open overnight.
  setInterval(()=>{if(!ordersOpen())updateOrderUI();},30000);
});


async function initAboutPhotos(){
  const section=document.getElementById('o-nas-fotky');if(!section)return;
  const editable=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const grid=document.getElementById('about-photo-grid');
  const input=document.getElementById('about-photos-input');
  const add=document.getElementById('add-about-photos');
  const status=document.getElementById('about-photo-status');
  let photos=[],urls=[],db=null;
  const report=text=>status.textContent=text;
  const openDb=()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('makeful-about-photos-2026',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  const allPhotos=()=>new Promise((resolve,reject)=>{
    const request=db.transaction('photos').objectStore('photos').getAll();
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  const write=(records,removeId)=>new Promise((resolve,reject)=>{
    const transaction=db.transaction('photos','readwrite'),store=transaction.objectStore('photos');
    if(removeId)store.delete(removeId);else records.forEach(record=>store.put(record));
    transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);
  });
  const render=()=>{
    urls.forEach(url=>URL.revokeObjectURL(url));urls=[];grid.replaceChildren();section.hidden=!editable&&!photos.length;
    photos.forEach(photo=>{
      const card=document.createElement('figure');card.className='about-photo-card';
      const url=URL.createObjectURL(photo.blob);urls.push(url);
      const img=document.createElement('img');img.src=url;img.alt=photo.alt||'Fotografie ze světa Makeful';img.loading='lazy';img.decoding='async';card.append(img);
      if(editable){const remove=document.createElement('button');remove.className='about-photo-remove';remove.type='button';remove.textContent='Odebrat';remove.setAttribute('aria-label','Odebrat fotku '+(photo.alt||''));
        remove.addEventListener('click',async()=>{
          remove.disabled=true;
          try{if(db)await write([],photo.id);photos=photos.filter(item=>item.id!==photo.id);render();report('Fotka byla odebrána z náhledu.');}
          catch{remove.disabled=false;report('Fotku se nepodařilo odebrat. Zkuste to znovu.');}
        });card.append(remove);
      }grid.append(card);
    });

  };
  if(editable){section.hidden=false;section.querySelectorAll('.about-photo-editor').forEach(el=>el.hidden=false);}
  try{db=await openDb();photos=(await allPhotos()).sort((a,b)=>a.id.localeCompare(b.id));}
  catch{if(editable)report('Ukládání fotek není dostupné. Vybrané fotky se zobrazí do obnovení stránky.');}
  render();if(!editable)return;
  add.addEventListener('click',()=>input.click());
  input.addEventListener('change',async()=>{
    const files=Array.from(input.files||[]);if(!files.length)return;add.disabled=true;
    const accepted=[],errors=[];
    for(const file of files){
      if(photos.length+accepted.length>=12){errors.push('Do galerie lze přidat nejvýše 12 fotek.');break;}
      if(!['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(file.type)){errors.push('Pro '+file.name+' použijte formát JPG, PNG, WebP, AVIF nebo GIF.');continue;}
      if(file.size>20*1024*1024){errors.push('Fotka '+file.name+' je větší než 20 MB.');continue;}
      const url=URL.createObjectURL(file);
      try{
        await new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=url;});
        accepted.push({id:Date.now().toString()+'-'+Math.random().toString(36).slice(2),blob:file,alt:'Makeful: '+file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')});
      }catch{errors.push('Fotku '+file.name+' se nepodařilo načíst.');}
      finally{URL.revokeObjectURL(url);}
    }
    let saved=!!db;
    if(accepted.length){
      if(db){try{await write(accepted);}catch{saved=false;errors.push('Fotky jsou zobrazené, ale nepodařilo se je uložit pro další otevření.');}}
      photos.push(...accepted);render();
    }
    report((accepted.length?(saved?'Fotky přidané a uložené do náhledu.':'Fotky přidané do náhledu do obnovení stránky.'):'')+(errors.length?' '+[...new Set(errors)].join(' '):''));
    input.value='';add.disabled=false;
  });
  window.addEventListener('pagehide',event=>{if(!event.persisted){urls.forEach(url=>URL.revokeObjectURL(url));if(db)db.close();}});
}

function readProductOptions(){
  const read=name=>document.querySelector('input[name="'+name+'"]:checked')?.value||MATERIALS[0];
  return {wallet:read('product-wallet'),clutch:read('product-clutch')};
}
function initProductOptions(){
  document.querySelectorAll('.material-picker').forEach(group=>{
    const update=(preview=false)=>{
      const input=group.querySelector('input:checked');if(!input)return;
      group.querySelector('[data-selected-material]').textContent=input.value;
      if(preview){
        const slot=document.querySelector('[data-gallery="balicek"] [data-product-photo="balicek"]');
        const media=PRODUCT_MEDIA.balicek;const index=media.findIndex(m=>m.part===group.dataset.part&&m.material===input.value);
        if(index>=0&&slot){
          galleryControllers.get(slot)?.(media[index]);
          const buttons=slot.closest('[data-gallery]').querySelectorAll('.gallery-thumbs button');
          buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
        }
      }
    };
    group.addEventListener('change',()=>update(true));update();
  });
}

function initAboutMedia(){
  const section=document.getElementById('o-nas');if(!section)return;
  const expand=section.querySelector('[data-about-expand]');
  expand?.addEventListener('click',()=>{
    const open=expand.getAttribute('aria-expanded')!=='true';
    section.querySelector('.about-media-grid').classList.toggle('is-expanded',open);
    section.querySelectorAll('[data-about-extra]').forEach(card=>card.hidden=!open);
    expand.setAttribute('aria-expanded',String(open));
    expand.textContent=open?'Zobrazit méně fotografií':'Zobrazit všech 13 fotografií';
    if(!open)expand.scrollIntoView({block:'nearest'});
  });
  const dialog=section.querySelector('.about-lightbox');if(!dialog)return;
  const photos=[...section.querySelectorAll('[data-about-photo]')];
  const full=dialog.querySelector('[data-about-full]');let index=0,opener=null;
  const show=i=>{
    index=(i+photos.length)%photos.length;
    const image=photos[index].querySelector('img');full.src=image.src;full.alt=image.alt;
    dialog.querySelector('figcaption').textContent=photos[index].closest('figure').querySelector('figcaption').textContent;
    dialog.querySelector('[data-about-counter]').textContent=(index+1)+' / '+photos.length;
  };
  photos.forEach((button,i)=>button.addEventListener('click',()=>{
    opener=button;show(i);dialog.showModal();document.body.classList.add('about-photo-open');
  }));
  dialog.querySelector('[data-about-close]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-about-prev]').addEventListener('click',()=>show(index-1));
  dialog.querySelector('[data-about-next]').addEventListener('click',()=>show(index+1));
  dialog.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'){e.preventDefault();show(index-1);}
    if(e.key==='ArrowRight'){e.preventDefault();show(index+1);}
  });
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{document.body.classList.remove('about-photo-open');opener?.focus();});
  section.querySelectorAll('video').forEach(video=>video.addEventListener('play',()=>{
    section.querySelectorAll('video').forEach(other=>{if(other!==video)other.pause();});
  }));
}

function initCartEditor(){
  const dialog=document.getElementById('cart-item-editor');if(!dialog)return;
  dialog.querySelectorAll('[data-close-cart-editor]').forEach(button=>button.addEventListener('click',()=>{
    if(!document.getElementById('order-qty').reportValidity())return;
    updateOrderUI();dialog.close();
  }));
  dialog.addEventListener('close',()=>{const item=cart.find(i=>i.id===activeItemId);if(item)document.getElementById('order-qty').value=item.qty;document.body.classList.remove('cart-editor-open');document.querySelector('[data-edit-cart="'+activeItemId+'"]')?.focus();});
  const syncQuantity=(event,redraw)=>{
    const input=event.target.closest('[data-cart-qty]');if(!input)return;
    const item=cart.find(i=>i.id===input.dataset.cartQty);if(!item)return;
    const qty=Number(input.value),others=cart.reduce((n,i)=>n+(i===item?0:i.qty),0);
    if(!Number.isInteger(qty)||qty<1||qty+others>100){
      input.setCustomValidity('Zadejte alespoň 1 kus, nejvýše 100 kusů v celé objednávce.');
      if(redraw)input.reportValidity();return;
    }
    input.setCustomValidity('');item.qty=qty;
    if(item.id===activeItemId)document.getElementById('order-qty').value=qty;
    saveCart();
    if(redraw)updateOrderUI(false);
    else{
      input.closest('.cart-line').querySelector('.cart-line-heading>b').textContent=money(PRICES[item.variant]*qty);
      renderTotals();
    }
  };
  document.getElementById('summary-items').addEventListener('input',event=>syncQuantity(event,false));
  document.getElementById('summary-items').addEventListener('change',event=>syncQuantity(event,true));
}
