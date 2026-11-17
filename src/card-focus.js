// Dense clips contain 68 original Blender views at 60 fps (1.13 seconds).
const zoomPlaybackRate=1;
const cards=[
 {id:'blue',label:'Bilt Blue',bounds:[692,503,352,253]},
 {id:'palladium',label:'Bilt Palladium',bounds:[1127,362,382,239]},
 {id:'obsidian',label:'Bilt Obsidian',bounds:[1516,623,376,249]},
];
export function createCardFocus(host,onSelect){
 let selected=null,opening=false,lastButton=null,generation=0;
 const buttons=[],cache=new Map(),loading=new Map();
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
   const clips=await Promise.all(['in','out'].map(direction=>makeVideo('/assets/scene02-zooms/'+card.id+'-'+direction+'.mp4')));
   const poster=new Image();poster.className='card-focus-video';poster.hidden=true;poster.alt='';poster.src='/assets/scene02-zooms/'+card.id+'-focused.png';await poster.decode();host.append(poster);
   const pair={forward:clips[0],reverse:clips[1],poster};cache.set(key,pair);return pair;
  })();
  loading.set(key,task);try{return await task;}finally{loading.delete(key);}
 }
 function finish(){
  if(!selected)return;
  const quality=selected.video.getVideoPlaybackQuality?.(),baseline=selected.baseline;
  host.querySelector('canvas').dataset.lastZoomPlayback=JSON.stringify({card:selected.id,returning:!!selected.returning,droppedFrames:quality?quality.droppedVideoFrames-(baseline?.droppedVideoFrames??0):undefined});
  for(const video of [selected.forward,selected.reverse]){video.pause();video.hidden=true;}
  selected.poster.hidden=true;selected=null;host.classList.remove('card-is-focused');buttons.forEach(b=>b.hidden=false);lastButton?.focus({preventScroll:true});host.querySelector('canvas').dataset.cardFocus='';
 }
 for(const card of cards){
  const [x,y,w,h]=card.bounds,button=document.createElement('button');button.className='card-hit-target';button.setAttribute('aria-label','Focus on '+card.label+' card');button.title='View '+card.label;
  Object.assign(button.style,{left:x/25.6+'%',top:y/14.4+'%',width:w/25.6+'%',height:h/14.4+'%'});
  button.onclick=async()=>{
   if(opening||selected)return;opening=true;const token=++generation;announce.textContent='Loading '+card.label+' camera view…';button.setAttribute('aria-busy','true');
   try{
    const pair=await loadClips(card);if(token!==generation)return;
    selected={...card,...pair,video:pair.forward};lastButton=button;onSelect();buttons.forEach(b=>b.hidden=true);host.classList.add('card-is-focused');close.hidden=false;
    pair.reverse.hidden=true;pair.poster.hidden=true;pair.forward.onended=()=>{if(selected?.forward===pair.forward&&!selected.returning){pair.poster.hidden=false;pair.forward.hidden=true;}};pair.forward.currentTime=0;pair.forward.hidden=false;
    // Allocate the video layer and clear the blur pass before the clock starts.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(!selected||selected.returning)return;
    selected.baseline=pair.forward.getVideoPlaybackQuality?.();pair.forward.playbackRate=zoomPlaybackRate;await pair.forward.play();
    close.focus({preventScroll:true});announce.textContent=card.label+' selected. Press Escape or All cards to return.';
   }catch(e){announce.textContent=e.message;console.warn(e.message);finish();}finally{opening=false;button.removeAttribute('aria-busy');}
  };
  button.addEventListener('pointerenter',()=>loadClips(card).catch(()=>{}),{once:true});
  buttons.push(button);host.append(button);
 }
 async function dismiss(){
  if(opening){generation++;opening=false;}if(!selected||selected.returning)return;
  const state=selected;state.returning=true;close.hidden=true;announce.textContent='Returning to all cards';state.forward.pause();
  try{
   const at=Math.max(0,Math.min(state.reverse.duration-.02,state.reverse.duration-state.forward.currentTime));
   if(Math.abs(state.reverse.currentTime-at)>.001){await new Promise(resolve=>{state.reverse.addEventListener('seeked',resolve,{once:true});state.reverse.currentTime=at;});}
   if(selected!==state)return;state.video=state.reverse;state.reverse.hidden=false;state.forward.hidden=true;state.poster.hidden=true;
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(selected!==state)return;
   state.baseline=state.reverse.getVideoPlaybackQuality?.();
   state.reverse.addEventListener('ended',()=>{if(selected===state)finish();},{once:true});state.reverse.playbackRate=zoomPlaybackRate;await state.reverse.play();
  }catch(e){console.warn(e);finish();}
 }
 close.onclick=dismiss;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(selected||opening)){e.preventDefault();dismiss();}});
 return {get active(){return !!selected||opening;},get camera(){return selected?{id:selected.id,time:selected.video.currentTime,duration:selected.video.duration,returning:!!selected.returning}:null;},draw(ctx){
  if(!selected)return;
  const video=selected.video,quality=video.getVideoPlaybackQuality?.();
  ctx.canvas.dataset.cardFocus=JSON.stringify({card:selected.id,mode:'60fps-original-Blender-camera-video',returning:!!selected.returning,time:video.currentTime,duration:video.duration,decodedFrames:quality?quality.totalVideoFrames-(selected.baseline?.totalVideoFrames??0):undefined,droppedFrames:quality?quality.droppedVideoFrames-(selected.baseline?.droppedVideoFrames??0):undefined,otherCards:'dimmed-with-building-spill',buildingLightFloor:.55,otherCardLightFloor:.18,geometryRevision:'scene02'});
 }};
}
