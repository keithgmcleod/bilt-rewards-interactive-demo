import {createRenderSequence} from './render-sequence.js';
createRenderSequence().catch(e=>{console.error(e);document.querySelector('#load-status').textContent='Render sequence unavailable — '+e.message;document.querySelector('#hero').classList.add('hero-ready');});
// Restore local disclosure behavior without the original site's application scripts.
for(const b of document.querySelectorAll('button[aria-expanded]'))b.addEventListener('click',()=>{
 const expanded=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!expanded));
 const id=b.getAttribute('aria-controls');const panel=id&&document.getElementById(id);if(panel){panel.hidden=expanded;panel.style.display=expanded?'none':'block';}
});
