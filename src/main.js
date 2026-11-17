import {createSceneInkReveal} from './scene-ink.js';
createSceneInkReveal(document.querySelector('#scene'));
// Separate ink pools preserve the headline's existing line breaks and layout.
const heading=document.querySelector('.hero-heading');
if(heading){
 heading.setAttribute('aria-label',heading.textContent);
 for(const node of [...heading.childNodes]){
  if(node.nodeType!==Node.TEXT_NODE)continue;
  const fragment=document.createDocumentFragment();
  node.textContent.split(/(\s+)/).forEach(word=>{
   if(!word.trim()){fragment.append(word);return;}
   const ink=document.createElement('span');ink.className='heading-ink';ink.textContent=word;ink.setAttribute('aria-hidden','true');fragment.append(ink);
  });node.replaceWith(fragment);
 }

}
import {createRenderSequence} from './render-sequence.js';
createRenderSequence().catch(e=>{console.error(e);document.querySelector('#load-status').textContent='Render sequence unavailable — '+e.message;document.querySelector('#hero').classList.add('hero-ready');});
// Restore local disclosure behavior without the original site's application scripts.
for(const b of document.querySelectorAll('button[aria-expanded]'))b.addEventListener('click',()=>{
 const expanded=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!expanded));
 const id=b.getAttribute('aria-controls');const panel=id&&document.getElementById(id);if(panel){panel.hidden=expanded;panel.style.display=expanded?'none':'block';}
});
