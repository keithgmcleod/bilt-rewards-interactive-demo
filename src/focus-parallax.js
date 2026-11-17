import {assetUrl} from './asset-url.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const spring=(axis,dt)=>{
 const delta=axis.value-axis.target,c=axis.velocity+12*delta,decay=Math.exp(-12*dt);
 axis.value=axis.target+(delta+c*dt)*decay;axis.velocity=(axis.velocity-12*c*dt)*decay;
 if(Math.abs(axis.value-axis.target)<.0003&&Math.abs(axis.velocity)<.002){axis.value=axis.target;axis.velocity=0;}
};
export function createFocusParallax(host,spec){
 const canvas=document.createElement('canvas');canvas.className='card-focus-video card-focus-parallax';canvas.hidden=true;canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const ctx=canvas.getContext('2d',{alpha:false}),axis=()=>({value:0,target:0,velocity:0});
 let state=null,generation=0;
 function resize(){
  const width=Math.min(spec.width,Math.round(host.clientWidth*Math.min(devicePixelRatio,2)));
  if(canvas.width!==width){canvas.width=width;canvas.height=Math.round(width*spec.height/spec.width);if(state)state.dirty=true;}
 }
 new ResizeObserver(resize).observe(host);resize();
 document.addEventListener('pointermove',event=>{
  if(canvas.hidden||!state||state.settling||state.images.size<9||event.pointerType==='touch'||!state.enabled)return;
  const rect=host.getBoundingClientRect();
  // Track the visible scene, including the headline layered above it.
  const left=Math.max(0,rect.left),right=Math.min(innerWidth,rect.right);
  const top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom);
  if(event.clientX<left||event.clientX>right||event.clientY<top||event.clientY>bottom){state.x.target=0;state.y.target=0;return;}
  state.x.target=clamp((event.clientX-left)/(right-left)-.5,-.5,.5)*1.9;
  state.y.target=clamp(.5-(event.clientY-top)/(bottom-top),-.5,.5)*1.9;
 });
 document.addEventListener('pointerleave',()=>{if(state){state.x.target=0;state.y.target=0;}});
 function render(){
  if(!state)return;
  const gx=clamp(state.x.value+1,0,2),gy=clamp(state.y.value+1,0,2),x0=Math.floor(gx),x1=Math.min(2,x0+1),y0=Math.floor(gy),y1=Math.min(2,y0+1),tx=gx-x0,ty=gy-y0;
  const samples=[[x0,y0,(1-tx)*(1-ty)],[x1,y0,tx*(1-ty)],[x0,y1,(1-tx)*ty],[x1,y1,tx*ty]];
  let total=0;ctx.globalAlpha=1;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  for(const [x,y,weight] of samples){
   if(weight<=0)continue;
   const image=state.images.get(x+','+y)??state.center;
   ctx.globalAlpha=weight/(total+weight);ctx.drawImage(image,0,0,canvas.width,canvas.height);total+=weight;
  }
  ctx.globalAlpha=1;state.dirty=false;state.lastX=state.x.value;state.lastY=state.y.value;
  canvas.dataset.parallax=JSON.stringify({card:state.card,x:state.x.value,y:state.y.value,target:[state.x.target,state.y.target],loaded:state.images.size,total:9,resolution:[spec.width,spec.height],cameraViews:'original-Blender-3x3-grid'});
 }
 function hide(){
  generation++;canvas.hidden=true;
  if(state){state.resolveCenter?.();for(const image of state.images.values())if(image!==state.center)image.src='';}
  state=null;
 }
 return {
  canvas,
  async show(card,center,files,reveal=true,loadViews=true){
   hide();
   state={card,center,images:new Map([['1,1',center]]),x:axis(),y:axis(),dirty:true,enabled:true,settling:false};render();canvas.hidden=!reveal;
   // Prepare the focused views before playback so decoding cannot interrupt the handoff.
   if(!loadViews)return;
   await this.loadViews(files);
  },
  async loadViews(files){
   if(!state)return;const token=generation;
   const queue=files.filter(file=>file.x!==1||file.y!==1).sort((a,b)=>(Math.abs(a.x-1)+Math.abs(a.y-1))-(Math.abs(b.x-1)+Math.abs(b.y-1)));
   await Promise.all(Array.from({length:2},async()=>{
    while(queue.length&&generation===token){
     const file=queue.shift(),image=new Image();image.decoding='async';image.src=assetUrl('focus-hq/')+file.file;
     try{await image.decode();if(generation!==token){image.src='';return;}state.images.set(file.x+','+file.y,image);state.dirty=true;}catch(error){console.warn('Focused camera view could not load',file.file,error);}
    }
   }));
  },
  reveal(){if(state){render();canvas.hidden=false;}},
  hide,
  update(dt,enabled=true){
   if(!state)return;state.enabled=enabled;
   if(!enabled){state.x.target=0;state.y.target=0;}
   spring(state.x,dt);spring(state.y,dt);
   if(state.dirty||state.x.value!==state.lastX||state.y.value!==state.lastY)render();
   if(state.settling&&Math.abs(state.x.value)<.003&&Math.abs(state.y.value)<.003){state.resolveCenter?.();}
  },
  recenter(){
   if(!state)return Promise.resolve();
   const current=state;current.settling=true;current.x.target=0;current.y.target=0;
   return new Promise(resolve=>{
    let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);current.resolveCenter=null;if(state===current){for(const a of [current.x,current.y]){a.value=0;a.velocity=0;}current.dirty=true;render();}resolve();};
    const timer=setTimeout(finish,650);current.resolveCenter=finish;
    if(Math.abs(current.x.value)<.003&&Math.abs(current.y.value)<.003)finish();
   });
  },
  get info(){return state?{x:state.x.value,y:state.y.value,loaded:state.images.size,width:spec.width,height:spec.height}:null;},
 };
}
