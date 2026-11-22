/* ID návštěvy v URL (?mfid=…) a v Clarity (vlastní značka id_navstevy).
   Je to stejné ID jako ve sloupci „ID návštěvy“ v tabulce Kvíz (prvních 12 znaků SHA-256),
   takže si v Clarity můžete vyfiltrovat a pospojovat všechny části jedné návštěvy. */
(function(){
  var KEY='makeful-quiz-visitor-2026',PARAM='mfid';
  function newId(){var r='';try{r=crypto.randomUUID()}catch(e){r=Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)}return ('q-'+Date.now().toString(36)+'-'+r).toLowerCase().replace(/[^a-z0-9-]/g,'')}
  function rawId(){var id='';try{id=localStorage.getItem(KEY)||'';if(!/^q-[a-z0-9-]{8,80}$/.test(id)){id=newId();localStorage.setItem(KEY,id)}}catch(e){}return id}
  // SHA-256 (funguje i na http, kde prohlížeč nemá crypto.subtle)
  function sha256(s){var K=[],H=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225],n=2,c=0;
    function f(x){return(x-(x|0))*4294967296|0}
    while(c<64){var p=true;for(var d=2;d*d<=n;d++)if(n%d===0){p=false;break}if(p){K[c++]=f(Math.pow(n,1/3))}n++}
    s=unescape(encodeURIComponent(s));var l=s.length,w=[],i;for(i=0;i<l;i++)w[i>>2]|=s.charCodeAt(i)<<(24-(i%4)*8);
    w[l>>2]|=0x80<<(24-(l%4)*8);w[((l+8)>>6<<4)+15]=l*8;
    for(i=0;i<w.length;i+=16){var a=H.slice(0),W=[];for(var j=0;j<64;j++){
      if(j<16)W[j]=w[i+j]|0;else{var x=W[j-15],y=W[j-2];W[j]=(((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3))+W[j-7]+(((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10))+W[j-16]|0}
      var e=a[4],t1=a[7]+(((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)))+((e&a[5])^(~e&a[6]))+K[j]+W[j]|0,
          b=a[0],t2=(((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)))+((b&a[1])^(b&a[2])^(a[1]&a[2]))|0;
      a=[t1+t2|0].concat(a);a[4]=a[4]+t1|0;a.pop()}
      for(j=0;j<8;j++)H[j]=H[j]+a[j]|0}
    var out='';for(i=0;i<8;i++)out+=('00000000'+(H[i]>>>0).toString(16)).slice(-8);return out}
  function apply(id){
    if(!id)return;var short=sha256(id).slice(0,12);window.__mfVisitId=short;
    try{var parts=(location.search||'').replace(/^\?/,'').split('&').filter(function(x){return x&&x.split('=')[0]!==PARAM});
      parts.push(PARAM+'='+short);var url=location.pathname+'?'+parts.join('&')+location.hash;
      if(url!==location.pathname+location.search+location.hash)history.replaceState(history.state,'',url)}catch(e){}
    try{window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};window.clarity('set','id_navstevy',short)}catch(e){}
  }
  window.__mfApplyVisitId=apply;
  apply(rawId());
})();
