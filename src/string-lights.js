const clamp=value=>Math.max(0,Math.min(1,value));
const range=(a,b)=>a+Math.random()*(b-a);
// Only sample the two overhead strings. Windows, cards and retail lights sit
// outside these strips. Locate the actual bulb cores anew in each camera view.
const strands=[{id:'left',bounds:[.402,.456,.050,.026]},{id:'center',bounds:[.420,.581,.231,.034]}];
export function createStringLightLayers(image){
 return strands.map(({id,bounds})=>{
  const [rx,ry,rw,rh]=bounds;
  const x=Math.floor(rx*image.width),y=Math.floor(ry*image.height),width=Math.ceil(rw*image.width),height=Math.ceil(rh*image.height);
  const sample=document.createElement('canvas');sample.width=width;sample.height=height;
  const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,x,y,width,height,0,0,width,height);
  const {data}=ctx.getImageData(0,0,width,height),mask=new Uint8Array(width*height),bulbs=[];
  for(let i=0;i<mask.length;i++){const p=i*4;mask[i]=data[p]>225&&data[p+1]>195&&data[p+2]>75?1:0;}
  for(let i=0;i<mask.length;i++){
   if(!mask[i])continue;
   const queue=[i];mask[i]=0;let sx=0,sy=0,count=0;
   for(let q=0;q<queue.length;q++){
    const p=queue[q],px=p%width,py=Math.floor(p/width);sx+=px;sy+=py;count++;
    for(const [nx,ny] of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]){
     if(nx<0||nx>=width||ny<0||ny>=height)continue;
     const n=ny*width+nx;if(mask[n]){mask[n]=0;queue.push(n);}
    }
   }
   if(count>=2&&count<=100)bulbs.push([sx/count,sy/count]);
  }
  const pad=Math.ceil(image.width*.016),light=document.createElement('canvas');light.width=width+pad*2;light.height=height+pad*2;
  const glow=light.getContext('2d');glow.globalCompositeOperation='lighter';
  for(const [bx,by] of bulbs){
   const cx=bx+pad,cy=by+pad,radius=image.width*.013;
   const halo=glow.createRadialGradient(cx,cy,0,cx,cy,radius);
   halo.addColorStop(0,'rgba(255,224,153,.42)');
   halo.addColorStop(.10,'rgba(255,204,110,.24)');
   halo.addColorStop(.32,'rgba(255,181,73,.07)');
   halo.addColorStop(1,'rgba(255,169,58,0)');
   glow.fillStyle=halo;glow.fillRect(cx-radius,cy-radius,radius*2,radius*2);
  }
  return {id,light,bulbs:bulbs.length,x:x-pad,y:y-pad,width:light.width,height:light.height,sourceWidth:image.width,sourceHeight:image.height};
 });
}
export function createStringLightGlow(){
 const states=strands.map(()=>({from:.78,to:range(.68,1),elapsed:0,duration:range(2,4),phase:range(0,6.28)}));
 let time=0;
 return {update(dt,animate=true){
  if(animate)time+=Math.min(dt,.1);
  return states.map(state=>{
   if(animate){state.elapsed+=Math.min(dt,.1);if(state.elapsed>=state.duration){state.from=state.to;state.to=range(.68,1);state.elapsed=0;state.duration=range(2,5);}}
   const t=clamp(state.elapsed/state.duration),ease=t*t*(3-2*t);
   // Add light only: the rendered filament never dims or switches off.
   return animate?(state.from+(state.to-state.from)*ease)*(1+.025*Math.sin(time*2.3+state.phase)):.8;
  });
 }};
}
export function drawStringLights(ctx,layers,gains,weight=1){
 if(!layers||weight<=0)return;
 ctx.save();ctx.globalCompositeOperation='screen';
 layers.forEach((layer,i)=>{
  const sx=ctx.canvas.width/layer.sourceWidth,sy=ctx.canvas.height/layer.sourceHeight;
  ctx.globalAlpha=gains[i]*weight;
  ctx.drawImage(layer.light,layer.x*sx,layer.y*sy,layer.width*sx,layer.height*sy);
 });ctx.restore();
}
