import {assetUrl} from './asset-url.js';
import {createFocusParallax} from './focus-parallax.js';
// Native 1440p zoom clips hand off to lossless 4K camera views.
const zoomPlaybackRate=1;
const cards=[
 {id:'blue',label:'Bilt Blue',bounds:[692,503,352,253]},
 {id:'palladium',label:'Bilt Palladium',bounds:[1127,362,382,239]},
 {id:'obsidian',label:'Bilt Obsidian',bounds:[1516,623,376,249]},
];
export function createCardFocus(host,onSelect){
 let selected=null,opening=false,lastButton=null,generation=0;
 const buttons=[],cache=new Map(),loading=new Map();
 // Keep the last painted image over layer changes until the new video frame is presented.
 const bridge=document.createElement('canvas');bridge.className='card-focus-video card-transition-bridge';bridge.hidden=true;bridge.style.zIndex='2';host.append(bridge);
 let bridgeToken=0;
 function holdFrame(source){
  ++bridgeToken;bridge.style.transition='none';bridge.style.opacity='1';
  const image=source??[...host.querySelectorAll('canvas.card-focus-parallax,video')].find(e=>!e.hidden)??host.querySelector('#scene-canvas');
  bridge.width=host.querySelector('#scene-canvas').width;bridge.height=host.querySelector('#scene-canvas').height;
  bridge.getContext('2d',{alpha:false}).drawImage(image,0,0,bridge.width,bridge.height);bridge.hidden=false;
 }
 function releaseFrame(){
  const token=bridgeToken;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(token!==bridgeToken)return;bridge.style.transition='opacity 100ms linear';bridge.style.opacity='0';
   setTimeout(()=>{if(token===bridgeToken)bridge.hidden=true;},120);
  }));
 }
 async function playPresented(video){
  const presented=video.requestVideoFrameCallback?new Promise(resolve=>video.requestVideoFrameCallback(resolve)):new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  await video.play();await presented;releaseFrame();
 }

 let manifestPromise,parallax;
 function getManifest(){
  return manifestPromise??=fetch(assetUrl('focus-hq/manifest.json')).then(response=>{if(!response.ok)throw Error('High-resolution focus renders are unavailable');return response.json();}).then(manifest=>{
   if(manifest.version!=='v2-hq'||manifest.status!=='complete')throw Error('High-resolution focus set is incomplete');
   parallax??=createFocusParallax(host,manifest.focus);return manifest;
  });
 }
 document.addEventListener('pointerdown',()=>host.classList.remove('keyboard-navigation'));
 document.addEventListener('keydown',e=>{if(e.key==='Tab')host.classList.add('keyboard-navigation');});
 const announce=document.createElement('div');announce.className='card-focus-announcement';announce.setAttribute('role','status');host.append(announce);
 const close=document.createElement('button');close.className='card-focus-close';close.textContent='← All cards';close.hidden=true;host.append(close);
 function makeVideo(url){
  return new Promise((resolve,reject)=>{
   const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.defaultPlaybackRate=zoomPlaybackRate;video.playbackRate=zoomPlaybackRate;video.disablePictureInPicture=true;video.className='card-focus-video';video.hidden=true;video.setAttribute('aria-hidden','true');
   video.addEventListener('loadeddata',()=>{video.playbackRate=zoomPlaybackRate;resolve(video);},{once:true});video.addEventListener('error',()=>reject(Error('Unable to load the smooth zoom clip')),{once:true});video.src=url;host.append(video);video.load();
  });
 }
 async function loadClips(card){
  const key=card.id;
  if(cache.has(key))return cache.get(key);
  if(loading.has(key))return loading.get(key);
  const task=(async()=>{
   const manifest=await getManifest(),files=manifest.cards[key],root=assetUrl('focus-hq/');
   const center=new Image();center.decoding='async';center.src=root+files.centerFile;
   const [forward,reverse]=await Promise.all([makeVideo(root+files.forwardFile),makeVideo(root+files.reverseFile),center.decode()]);
   const pair={forward,reverse,center,focusFiles:files.focusFiles};cache.set(key,pair);return pair;
  })();
  loading.set(key,task);try{return await task;}finally{loading.delete(key);}
 }
 function finish(){
  if(!selected)return;
  holdFrame(selected.video);
  const quality=selected.video.getVideoPlaybackQuality?.(),baseline=selected.baseline;
  host.querySelector('canvas').dataset.lastZoomPlayback=JSON.stringify({card:selected.id,returning:!!selected.returning,droppedFrames:quality?quality.droppedVideoFrames-(baseline?.droppedVideoFrames??0):undefined});
  for(const video of [selected.forward,selected.reverse]){video.pause();video.hidden=true;}
  parallax?.hide();selected=null;host.classList.remove('card-is-focused');buttons.forEach(b=>b.hidden=false);lastButton?.focus({preventScroll:true});host.querySelector('canvas').dataset.cardFocus='';releaseFrame();
 }
 for(const card of cards){
  const [x,y,w,h]=card.bounds,button=document.createElement('button');button.className='card-hit-target';button.setAttribute('aria-label','Focus on '+card.label+' card');button.title='View '+card.label;
  Object.assign(button.style,{left:x/25.6+'%',top:y/14.4+'%',width:w/25.6+'%',height:h/14.4+'%'});
  button.onclick=async()=>{
   if(opening||selected)return;opening=true;const token=++generation;announce.textContent='Loading '+card.label+' camera view…';button.setAttribute('aria-busy','true');
   try{
    const pair=await loadClips(card);if(token!==generation)return;
    holdFrame();
    await parallax.show(card.id,pair.center,pair.focusFiles,false,false);
    await onSelect();if(token!==generation){parallax.hide();bridge.hidden=true;return;}
    selected={...card,...pair,video:pair.forward,phase:'zooming'};lastButton=button;buttons.forEach(b=>b.hidden=true);host.classList.add('card-is-focused');close.hidden=false;
    pair.reverse.hidden=true;
    pair.forward.onended=()=>{if(selected?.forward===pair.forward&&!selected.returning){holdFrame(pair.forward);parallax.reveal();selected.phase='focused';pair.forward.hidden=true;releaseFrame();setTimeout(()=>{if(selected?.id===card.id&&!selected.returning)parallax.loadViews(pair.focusFiles);},150);}};pair.forward.currentTime=0;pair.forward.hidden=false;
    // Allocate the video layer and clear the blur pass before the clock starts.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(!selected||selected.returning)return;
    selected.baseline=pair.forward.getVideoPlaybackQuality?.();pair.forward.playbackRate=zoomPlaybackRate;await playPresented(pair.forward);
    close.focus({preventScroll:true});announce.textContent=card.label+' selected. Press Escape or All cards to return.';
   }catch(e){announce.textContent=e.message;console.warn(e.message);finish();if(!selected)bridge.hidden=true;}finally{opening=false;button.removeAttribute('aria-busy');}
  };
  button.addEventListener('pointerenter',()=>loadClips(card).catch(()=>{}),{once:true});
  buttons.push(button);host.append(button);
 }
 async function dismiss(){
  if(opening){generation++;opening=false;}if(!selected||selected.returning)return;
  const state=selected;state.returning=true;close.hidden=true;announce.textContent='Returning to all cards';state.forward.pause();
  try{
   if(state.phase==='focused')await parallax.recenter();
   if(selected!==state)return;
   holdFrame();parallax.hide();state.phase='returning';
   const at=Math.max(0,Math.min(state.reverse.duration-.02,state.reverse.duration-state.forward.currentTime));
   if(Math.abs(state.reverse.currentTime-at)>.001){await new Promise(resolve=>{state.reverse.addEventListener('seeked',resolve,{once:true});state.reverse.currentTime=at;});}
   if(selected!==state)return;state.video=state.reverse;state.reverse.hidden=false;state.forward.hidden=true;
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(selected!==state)return;
   state.baseline=state.reverse.getVideoPlaybackQuality?.();
   state.reverse.addEventListener('ended',()=>{if(selected===state)finish();},{once:true});state.reverse.playbackRate=zoomPlaybackRate;await playPresented(state.reverse);
  }catch(e){console.warn(e);finish();}
 }
 close.onclick=dismiss;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(selected||opening)){e.preventDefault();dismiss();}});
 return {get active(){return !!selected;},get busy(){return !!selected||opening;},get camera(){return selected?{id:selected.id,time:selected.video.currentTime,duration:selected.video.duration,returning:!!selected.returning}:null;},draw(ctx,dt,enabled=true){
  if(!selected)return;
  parallax?.update(Math.min(dt??0,.1),enabled);
  const video=selected.video,quality=video.getVideoPlaybackQuality?.();
  ctx.canvas.dataset.cardFocus=JSON.stringify({card:selected.id,mode:'1440p-60fps-camera-video-and-4K-parallax',phase:selected.phase,returning:!!selected.returning,time:video.currentTime,duration:video.duration,decodedFrames:quality?quality.totalVideoFrames-(selected.baseline?.totalVideoFrames??0):undefined,droppedFrames:quality?quality.droppedVideoFrames-(selected.baseline?.droppedVideoFrames??0):undefined,parallax:parallax?.info,otherCards:'dimmed-with-building-spill',buildingLightFloor:.55,otherCardLightFloor:.18,geometryRevision:'scene02'});
 }};
}
