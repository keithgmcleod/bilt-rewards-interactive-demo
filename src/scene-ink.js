// A one-time capillary reveal for the scenery; card faces stay visible.
export function createSceneInkReveal(host){
 const hero=host.closest('#hero');let started=false,timer,url;
 host.classList.add('scene-ink-waiting');
 function finish(){clearTimeout(timer);host.style.removeProperty('mask-image');host.style.removeProperty('-webkit-mask-image');host.classList.remove('scene-ink-waiting');host.dataset.inkReveal='complete';hero.classList.add('scene-ink-complete');if(url){URL.revokeObjectURL(url);url=null;}}
 function start(){
  if(started||!hero.classList.contains('hero-ready'))return;started=true;observer.disconnect();
  const pools=Array.from({length:24},(_,i)=>{
   const x=80+Math.random()*1440,y=120+Math.random()*700;
   const delay=Math.random()*1.2,duration=4.1+Math.random()*1.1;
   const radius=250+Math.random()*150,aspect=.55+Math.random()*.55;
   return `<ellipse cx="${x}" cy="${y}" rx="0" ry="0" fill="url(#wet)" transform="rotate(${Math.random()*180} ${x} ${y})"><animate attributeName="rx" values="0;${radius*.28};${radius*.67};${radius}" keyTimes="0;.2;.55;1" calcMode="spline" keySplines=".2 .6 .3 1;.2 .5 .3 1;.2 .5 .3 1" dur="${duration}s" begin="${delay}s" fill="freeze"/><animate attributeName="ry" from="0" to="${radius*aspect}" dur="${duration}s" begin="${delay}s" fill="freeze"/></ellipse>`;
  }).join('');
  // Original render coordinates, independent of viewport size.
  const cards=[[692,503,352,253],[1127,362,382,239],[1516,623,376,249]].map(([x,y,w,h])=>`<rect x="${x*.625}" y="${y*.625}" width="${w*.625}" height="${h*.625}" rx="5" fill="white"/>`).join('');
  // A feathered 96% floor keeps architecture legible; only a faint wash remains.
  const buildings='<path d="M0 900V660L160 620L280 660V590H410V475H650V375H880V545H1285V630H1300L1410 660L1510 620L1600 660V900Z" fill="white" opacity=".96" filter="url(#building-feather)"/>';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs>
   <filter id="building-feather" x="-10%" y="-15%" width="120%" height="130%"><feGaussianBlur stdDeviation="12"/></filter><radialGradient id="wet"><stop offset=".25" stop-color="white"/><stop offset=".62" stop-color="white" stop-opacity=".95"/><stop offset=".85" stop-color="white" stop-opacity=".65"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient>
   <filter id="paper" x="-15%" y="-25%" width="130%" height="150%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".012 .024" numOctaves="4" seed="${Math.floor(Math.random()*1000)}" result="fibres"/><feDisplacementMap in="SourceGraphic" in2="fibres" scale="110" xChannelSelector="R" yChannelSelector="G" result="soaked"/><feTurbulence type="fractalNoise" baseFrequency=".38 .6" numOctaves="3" seed="19"/><feColorMatrix type="luminanceToAlpha"/><feComponentTransfer><feFuncA type="linear" slope="1.2" intercept=".3"/></feComponentTransfer><feComposite in2="soaked" operator="in"/></filter>
   </defs><rect width="1600" height="900" fill="white" opacity=".8"/><g filter="url(#paper)">${pools}</g>${buildings}${cards}<rect width="1600" height="900" fill="white" opacity="0"><animate attributeName="opacity" from="0" to="1" begin="5.1s" dur="1.2s" fill="freeze"/></rect></svg>`;
  url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  host.style.maskImage=`url("${url}")`;host.style.webkitMaskImage=`url("${url}")`;host.classList.remove('scene-ink-waiting');host.dataset.inkReveal='spreading';
  timer=setTimeout(finish,6600);
 }
 const observer=new MutationObserver(start);observer.observe(hero,{attributes:true,attributeFilter:['class']});start();
 // Clicking a card immediately releases the reveal so it cannot mask a zoom.
 host.addEventListener('pointerdown',()=>{if(started)finish();},{once:true});
}
