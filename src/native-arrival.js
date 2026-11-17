const quietPeriod=()=>35+Math.random()*35;

export async function createNativeArrival(host){
 const root='/assets/scene02-arrival/';
 const manifest=await fetch(root+'manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Native Blender arrival is unavailable');return r.json();});
 let phase='startup',quiet=0,next=quietPeriod(),current=null;
 let releasePan;
 const readyForPan=new Promise(resolve=>{releasePan=resolve;});
 async function makeVideo(file){
  const video=document.createElement('video');video.className='native-arrival-video';video.muted=true;video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;video.hidden=true;video.setAttribute('aria-hidden','true');host.append(video);
  await new Promise((resolve,reject)=>{video.addEventListener('loadeddata',resolve,{once:true});video.addEventListener('error',()=>reject(Error('Unable to load full-frame Blender lighting video')),{once:true});video.src=root+file;video.load();});
  return video;
 }
 host.classList.add('arrival-is-playing');
 const [startup,idle]=await Promise.all([makeVideo(manifest.startupFile??'startup-stable.webm'),makeVideo(manifest.idleFile??'idle-stable.webm')]);
 current=startup;startup.hidden=false;
 function finish(){
  if(current){const quality=current.getVideoPlaybackQuality?.();host.dataset.nativePlayback=JSON.stringify({phase,time:current.currentTime,duration:current.duration,ended:current.ended,frames:quality?.totalVideoFrames,droppedFrames:quality?.droppedVideoFrames});}
  current?.pause();if(current)current.hidden=true;current=null;phase=null;quiet=0;next=quietPeriod();host.classList.remove('arrival-is-playing');
  releasePan();
 }
 startup.addEventListener('ended',finish);idle.addEventListener('ended',finish);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)current?.pause();});
 return {
  get active(){return phase!==null;},get startup(){return phase==='startup';},readyForPan,cancel:finish,
  update(dt,enabled,canIdle){
   if(!phase){
    quiet=enabled&&canIdle?quiet+dt:0;
    if(quiet>=next){phase='idle';current=idle;idle.currentTime=0;idle.hidden=false;host.classList.add('arrival-is-playing');}
   }
   if(current){
    if(enabled){if(current.paused&&!current.ended)current.play().catch(error=>{console.warn(error);finish();});}
    else current.pause();
   }
   host.dataset.apartmentLighting=JSON.stringify({mode:'full-frame-Blender-render',phase:phase??'complete',time:current?.currentTime??manifest.duration,startupSeconds:manifest.duration,initialLitFraction:manifest.initialLitFraction,windowOverlays:false});
  },
 };
}
