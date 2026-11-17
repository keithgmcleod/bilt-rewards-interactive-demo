const range=(a,b)=>a+Math.random()*(b-a);
// Build a small, color-keyed mask from each actual render. This follows the sign
// across camera views, without darkening the facade or nearby apartment windows.
export function createNeonLayer(image){
 const x=Math.floor(image.width*.239),y=Math.floor(image.height*.533);
 const width=Math.ceil(image.width*.026),height=Math.ceil(image.height*.214);
 const source=document.createElement('canvas');source.width=width;source.height=height;
 const sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(image,x,y,width,height,0,0,width,height);
 const pixels=sc.getImageData(0,0,width,height),dim=sc.createImageData(width,height),glow=sc.createImageData(width,height);
 for(let i=0;i<pixels.data.length;i+=4){
  const [r,g,b]=pixels.data.slice(i,i+3);
  const warm=Math.max(0,Math.min(1,(r-Math.max(g,b)-12)/55))*Math.max(0,Math.min(1,(r-65)/110));
  dim.data[i+3]=Math.round(warm*255);
  glow.data[i]=r;glow.data[i+1]=g;glow.data[i+2]=b;glow.data[i+3]=dim.data[i+3];
 }
 // Include the pale tube cores adjoining the orange glow; the earlier mask
 // left those bright pixels untouched, making the dimming hard to perceive.
 const originalAlpha=new Uint8ClampedArray(width*height);
 for(let i=0;i<originalAlpha.length;i++)originalAlpha[i]=dim.data[i*4+3];
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){
  let nearby=0;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   const xx=px+dx,yy=py+dy;if(xx>=0&&xx<width&&yy>=0&&yy<height)nearby=Math.max(nearby,originalAlpha[yy*width+xx]);
  }
  const i=(py*width+px)*4,brightness=Math.max(0,Math.min(1,(pixels.data[i]-70)/100));
  dim.data[i+3]=Math.max(dim.data[i+3],nearby*brightness);glow.data[i+3]=dim.data[i+3];
 }
 const darkness=document.createElement('canvas'),light=document.createElement('canvas');
 for(const c of [darkness,light]){c.width=width;c.height=height;}
 darkness.getContext('2d').putImageData(dim,0,0);light.getContext('2d').putImageData(glow,0,0);
 return {darkness,light,x,y,width,height,sourceWidth:image.width,sourceHeight:image.height};
}
export function createNeonFlicker(){
 let clock=0,next=range(1,2.5),start=-100,depth=.5,events=0;
 let dipAt=.18,dipWidth=.1,flutterAt=.5,flutterWidth=.08,flutter=0,recoveryAt=.75,recoveryWidth=.18,recovery=.12;
 return {get events(){return events;},update(dt){
  clock+=Math.min(dt,.1);
  if(clock>=next){
   start=clock;depth=range(.38,.65);
   dipAt=range(.1,.23);dipWidth=range(.075,.14);
   flutterAt=dipAt+range(.24,.4);flutterWidth=range(.06,.11);
   flutter=Math.random()<.6?range(.15,.4):0;
   recoveryAt=flutterAt+range(.16,.28);recoveryWidth=range(.13,.23);recovery=range(.07,.16);
   // Occasional closer pairs interrupt the longer, irregular quiet periods.
   next=clock+(Math.random()<.25?range(1.5,3):range(3,8));events++;
  }
  const t=clock-start;
  // Independently vary each dip, optional flutter and recovery glow.
  const pulse=(center,width)=>Math.exp(-Math.pow((t-center)/width,2));
  return {dim:Math.min(.68,depth*(pulse(dipAt,dipWidth)+flutter*pulse(flutterAt,flutterWidth))),glow:recovery*pulse(recoveryAt,recoveryWidth)};
 }};
}
export function drawNeon(ctx,layer,effect,weight){
 if(!layer||weight<=0)return;
 const sx=ctx.canvas.width/layer.sourceWidth,sy=ctx.canvas.height/layer.sourceHeight;
 ctx.save();
 if(effect.dim>.0001){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=effect.dim*weight;ctx.drawImage(layer.darkness,layer.x*sx,layer.y*sy,layer.width*sx,layer.height*sy);}
 if(effect.glow>.0001){ctx.globalCompositeOperation='screen';ctx.globalAlpha=effect.glow*weight;ctx.drawImage(layer.light,layer.x*sx,layer.y*sy,layer.width*sx,layer.height*sy);}
 ctx.restore();
}
