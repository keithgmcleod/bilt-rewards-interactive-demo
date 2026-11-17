import {assetUrl} from './asset-url.js';
import {createCardFocus} from './card-focus-hq.js';
import {createNativeArrival} from './native-arrival.js';
import {createNeonLayer,createNeonFlicker,drawNeon} from './neon.js';
import {createStringLightLayers,createStringLightGlow,drawStringLights} from './string-lights.js';
export async function createRenderSequence(){
 const host=document.querySelector('#scene'),canvas=document.querySelector('#scene-canvas'),status=document.querySelector('#load-status');
 const ctx=canvas.getContext('2d',{alpha:false});
 const bloomCanvas=document.createElement('canvas');bloomCanvas.className='string-light-glow';bloomCanvas.setAttribute('aria-hidden','true');host.append(bloomCanvas);
 const bloom=bloomCanvas.getContext('2d'),stringLayers=new Map(),stringGlow=createStringLightGlow();
 const controls=document.querySelector('#preview-tools');if(controls)controls.remove();
 host.setAttribute('aria-label','Blender-rendered neighborhood with mouse-responsive camera pan');
 const response=await fetch(assetUrl('scene02-pan/manifest.json'),{cache:'no-store'});
 if(!response.ok)throw Error('Render sequence is not available yet');
 let manifest=await response.json();
 const images=new Map(),pending=new Map();let target=manifest.center,current=manifest.center,active=true,last=performance.now(),visible=true;
 let panVelocity=0;
 const neonLayers=new Map(),neon=createNeonFlicker();
 async function load(index){
  if(images.has(index))return images.get(index);
  if(pending.has(index))return pending.get(index);
  if(!manifest.ready.includes(index))return null;
  const promise=(async()=>{const img=new Image();img.decoding='async';img.src=assetUrl('scene02-pan/')+manifest.files[index];await img.decode();neonLayers.set(index,createNeonLayer(img));stringLayers.set(index,createStringLightLayers(img));images.set(index,img);return img;})();
  pending.set(index,promise);try{return await promise;}finally{pending.delete(index);}
 }
 const resize=()=>{const dpr=Math.min(devicePixelRatio,2);canvas.width=Math.min(manifest.width,Math.round(host.clientWidth*dpr));canvas.height=Math.round(canvas.width*manifest.height/manifest.width);bloomCanvas.width=canvas.width;bloomCanvas.height=canvas.height;};
 new ResizeObserver(resize).observe(host);resize();
 while(!manifest.ready.includes(manifest.center)){
  status.textContent='Preparing Blender-rendered views…';
  await new Promise(resolve=>setTimeout(resolve,5000));
  manifest=await fetch(assetUrl('scene02-pan/manifest.json'),{cache:'no-store'}).then(r=>r.json());
 }
 const centerImage=await load(manifest.center);
 await Promise.all([load(0),load(manifest.count-1)]);
 const arrival=await createNativeArrival(host);
 // Cache the final native pose for a clean handoff when the startup video ends.
 ctx.drawImage(centerImage,0,0,canvas.width,canvas.height);
 const cardFocus=createCardFocus(host,()=>{
  if(arrival.active)arrival.cancel();target=manifest.center;current=manifest.center;panVelocity=0;
 });
 // Match the page to the actual rendered blue, rather than an estimated swatch.
 const swatch=document.createElement('canvas');swatch.width=5;swatch.height=1;
 const swatchContext=swatch.getContext('2d',{willReadFrequently:true});
 for(let i=0;i<5;i++)swatchContext.drawImage(centerImage,Math.round((i+.5)/5*(centerImage.width-1)),centerImage.height-2,1,1,i,0,1,1);
 const pixels=swatchContext.getImageData(0,0,5,1).data;
 const blue=[0,1,2].map(channel=>Array.from({length:5},(_,i)=>pixels[i*4+channel]).sort((a,b)=>a-b)[2]);
 document.documentElement.style.setProperty('--hero-blue',`rgb(${blue.join(',')})`);
 status.hidden=true;
 document.querySelector('#hero').classList.add('hero-ready');
 const motion=document.createElement('button');motion.className='sequence-motion';motion.textContent='Pause movement';motion.setAttribute('aria-pressed','false');document.querySelector('.hero-copy').append(motion);
 motion.onclick=()=>{active=!active;motion.textContent=active?'Pause movement':'Enable movement';motion.setAttribute('aria-pressed',String(!active));if(!active)target=manifest.center;};
 function pointer(e){if(host.dataset.inkReveal==='spreading'||cardFocus.busy||arrival.startup||!active||e.pointerType==='touch')return;if(arrival.active)arrival.cancel();const r=host.getBoundingClientRect();const fraction=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));target=fraction*(manifest.count-1);load(Math.round(target)).catch(console.warn);}
 host.addEventListener('pointermove',pointer);host.addEventListener('pointerenter',pointer);host.addEventListener('pointerleave',()=>target=manifest.center);
 document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=performance.now();});
 function draw(now){const dt=Math.min((now-last)/1000,.1);last=now;
  bloom.clearRect(0,0,bloomCanvas.width,bloomCanvas.height);
  const stringGains=stringGlow.update(visible?dt:0,active);
  arrival.update(dt,active&&visible,!cardFocus.active&&Math.abs(current-manifest.center)<.02&&Math.abs(target-manifest.center)<.02);
  // Let the video compositor own focus playback. Redrawing the full-resolution
  // PNG sequence underneath it wastes bandwidth and can drop video frames.
  if(cardFocus.active){if(arrival.active)arrival.cancel();cardFocus.draw(ctx,dt,active&&visible);requestAnimationFrame(draw);return;}
  if(arrival.active){if(visible)drawStringLights(bloom,stringLayers.get(manifest.center),stringGains);requestAnimationFrame(draw);return;}
  if(visible){
   // Critically damped motion accelerates from rest instead of jumping to its
   // highest speed on the first pointer update, and settles without overshoot.
   const delta=current-target,coefficient=panVelocity+9*delta,decay=Math.exp(-9*dt);
   current=target+(delta+coefficient*dt)*decay;panVelocity=(panVelocity-9*coefficient*dt)*decay;
   if(Math.abs(current-target)<.0005&&Math.abs(panVelocity)<.002){current=target;panVelocity=0;}
   const ready=[...images.keys()];
   if(ready.length){let a=ready.filter(i=>i<=current).sort((a,b)=>b-a)[0],b=ready.filter(i=>i>=current).sort((a,b)=>a-b)[0];a??=b;b??=a;
    ctx.globalAlpha=1;ctx.drawImage(images.get(a),0,0,canvas.width,canvas.height);
    if(a!==b){ctx.globalAlpha=(current-a)/(b-a);ctx.drawImage(images.get(b),0,0,canvas.width,canvas.height);ctx.globalAlpha=1;}
    const effect=active?neon.update(dt):{dim:0,glow:0};
    const blend=a===b?0:(current-a)/(b-a);
    drawNeon(ctx,neonLayers.get(a),effect,1-blend);if(a!==b)drawNeon(ctx,neonLayers.get(b),effect,blend);
    drawStringLights(bloom,stringLayers.get(a),stringGains,1-blend);if(a!==b)drawStringLights(bloom,stringLayers.get(b),stringGains,blend);
    bloomCanvas.dataset.glow=JSON.stringify({gains:stringGains,bulbs:stringLayers.get(a)?.map(layer=>({strand:layer.id,count:layer.bulbs})),additiveOnly:true});
    cardFocus.draw(ctx,dt);
    canvas.dataset.neon=JSON.stringify({events:neon.events,...effect});
    canvas.dataset.sequence=JSON.stringify({current,target,loaded:images.size,total:manifest.count,geometryRevision:manifest.geometryRevision,frames:[a,b]});
   }
  }requestAnimationFrame(draw);
 }requestAnimationFrame(draw);
 // Download full renders center-out, with a bounded decode queue.
 async function preload(){const queue=manifest.ready.filter(i=>!images.has(i)).sort((a,b)=>Math.abs(a-current)-Math.abs(b-current));await Promise.all(Array.from({length:3},async()=>{while(queue.length){while(cardFocus.busy)await new Promise(resolve=>setTimeout(resolve,100));const i=queue.shift();try{await load(i);}catch(e){console.warn('Sequence frame failed',i,e);}}}));}
 // PNG decoding must not compete with the lossless lighting/video decoder.
 await arrival.readyForPan;
 while(cardFocus.active)await new Promise(resolve=>setTimeout(resolve,250));
 await preload();
 if(manifest.status!=='complete'){const timer=setInterval(async()=>{try{manifest=await fetch(assetUrl('scene02-pan/manifest.json'),{cache:'no-store'}).then(r=>r.json());await preload();if(manifest.status==='complete')clearInterval(timer);}catch(e){console.warn(e);}},10000);}
}
