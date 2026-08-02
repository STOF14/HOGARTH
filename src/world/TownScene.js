import * as THREE from 'three';
import { Town } from './town.js';
import { decodeComicArchive } from '../reader/archive.js';
import { makePlaceholderCoverCanvas } from './textures.js';

export default function TownScene({ scene, camera, container, appState }){
  let mounted = false;
  let town = null;
  const hud = document.createElement('div');
  hud.id = 'hogarth-hud'; hud.style.position='fixed'; hud.style.top='18px'; hud.style.left='18px'; hud.style.zIndex='40';
  // structured HUD: label + controls so we can update text without clobbering buttons
  const hudLabel = document.createElement('div'); hudLabel.style.marginBottom = '6px'; hud.appendChild(hudLabel);
  const hudControls = document.createElement('div'); hudControls.style.display = 'flex'; hudControls.style.gap = '8px'; hud.appendChild(hudControls);

  function updateHud(){
    const count = town ? town.plots.length : 0;
    hudLabel.textContent = `Town — ${count} plot${count===1?'':'s'}`;
  }

  return {
    async enter(){
      mounted = true;
      town = new Town(scene, camera);
      container.appendChild(hud);

      // file input + mock button
      const input = document.createElement('input'); input.type='file';
      // Accept common archive extensions and RAR MIME types so iOS shows them where possible
      input.accept = 'image/*,.cbz,.zip,.cbr,.rar,application/x-rar-compressed,application/vnd.rar,application/octet-stream';
      input.style.display='none';
      // Fallback input without accept for platforms that hide custom extensions (iPad iOS picker)
      const inputAny = document.createElement('input'); inputAny.type='file'; inputAny.style.display='none';
      const uploadBtn = document.createElement('button'); uploadBtn.textContent = 'Upload';
      const altBtn = document.createElement('button'); altBtn.textContent = 'Select any file'; altBtn.title = 'Use this if your device does not show .cbr/.rar in the picker';
      const mockBtn = document.createElement('button'); mockBtn.textContent = 'Mock Add';
      hudControls.appendChild(uploadBtn); hudControls.appendChild(altBtn); hudControls.appendChild(mockBtn);
      document.body.appendChild(input);
      document.body.appendChild(inputAny);

      // Legacy per-stage demo pages, kept for reference in public/stages/.
      // Only shown when explicitly requested (?debug=1) — these are
      // developer scaffolding, not part of the real app's navigation.
      const debugMode = new URLSearchParams(window.location.search).has('debug');
      if (debugMode){
        const stageLabels = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'];
        stageLabels.forEach((label, i) => {
          const btn = document.createElement('button');
          btn.textContent = label;
          btn.addEventListener('click', () => window.open(`/stages/stage${i+1}-${['boot','town-static','town-dynamic','cover-analysis','enter-reader'][i]}.html`, '_blank'));
          hudControls.appendChild(btn);
        });
      }

      uploadBtn.addEventListener('click', ()=> input.click());
      altBtn.addEventListener('click', ()=> inputAny.click());
      const onInputChange = async (e)=>{ await processFile(e.target.files && e.target.files[0]); };
      input.addEventListener('change', onInputChange);
      inputAny.addEventListener('change', onInputChange);

      // Show a small help dialog explaining RAR/CBR limitations and conversion options
      function showRarHelp(filename){
        function makeLink(href, text){ return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`; }
        const existing = document.getElementById('hogarth-rar-help');
        if (existing) return;
        const el = document.createElement('div'); el.id = 'hogarth-rar-help';
        el.style.position = 'fixed'; el.style.left='50%'; el.style.top='18%'; el.style.transform='translateX(-50%)'; el.style.zIndex='120';
        el.style.background='rgba(20,16,28,0.98)'; el.style.color='#f0ece2'; el.style.border='1px solid rgba(240,236,226,0.2)'; el.style.padding='14px'; el.style.maxWidth='560px'; el.style.fontFamily='IBM Plex Mono, monospace'; el.style.fontSize='13px'; el.style.boxShadow='0 6px 18px rgba(0,0,0,0.6)';
        const fname = filename ? ` "${filename}"` : '';
        el.innerHTML = `
          <div style="margin-bottom:8px; font-weight:600;">CBR (RAR) not supported</div>
          <div style="margin-bottom:8px; color:rgba(240,236,226,0.9)">The file${fname} appears to be a RAR archive. RAR decoding isn't available in this build. Convert to CBZ (ZIP) or upload from a desktop.</div>
          <div style="margin-bottom:8px">Try one of these options:</div>
          <ul style="margin:0 0 10px 18px; color:rgba(240,236,226,0.85)">
            <li>Use an online converter: ${makeLink('https://convertio.co/rar-zip/','Convert RAR → ZIP')}</li>
            <li>On desktop: rename/move to a computer and create a ZIP (.cbz)</li>
          </ul>
          <div style="text-align:right"><button id="hogarth-rar-close" style="padding:6px 10px">OK</button></div>
        `;
        document.body.appendChild(el);
        el.querySelector('#hogarth-rar-close').addEventListener('click', ()=>{ if (el.parentNode) el.parentNode.removeChild(el); });
      }

      async function processFile(f){
        if (!f) return;
        // If this looks like an archive, try decode path
        if (/\.(cbz|zip|cbr|rar)$/i.test(f.name)){
          // decode archive and add first page as cover (simple flow)
          try{
            const { files, cache } = await decodeComicArchive(f, (i,n)=>{ /* progress */ });
            if (files.length){
              const url = cache.get(0);
              const img = new Image(); img.crossOrigin='anonymous'; img.src = url;
              img.onload = ()=>{
                const s = Math.min(img.width, img.height); const sx=(img.width-s)/2, sy=(img.height-s)/2; const thumb=document.createElement('canvas'); thumb.width=20; thumb.height=20; const tctx=thumb.getContext('2d'); tctx.imageSmoothingEnabled=false; tctx.drawImage(img, sx, sy, s, s, 0, 0, 20,20);
                town.addPlot(f.name.replace(/\.[^.]+$/,''), thumb);
                updateHud();
              };
            }
          } catch (err){
            // If decoding failed (likely RAR support), show a helpful message and offer fallback
            if (/CBR \(RAR\) archives are not supported/i.test(err.message || '')){
              showRarHelp(f && f.name);
            } else {
              alert(err.message || 'Could not decode archive.');
            }
          }
        } else if (/image\//i.test(f.type)){
          const img = new Image(); const url = URL.createObjectURL(f); img.onload = ()=>{
            const s = Math.min(img.width, img.height); const sx=(img.width-s)/2, sy=(img.height-s)/2; const thumb=document.createElement('canvas'); thumb.width=20; thumb.height=20; const tctx=thumb.getContext('2d'); tctx.imageSmoothingEnabled=false; tctx.drawImage(img, sx, sy, s, s, 0, 0, 20,20); URL.revokeObjectURL(url);
            town.addPlot(f.name.replace(/\.[^.]+$/,''), thumb); updateHud();
          }; img.src = url;
        }
      }
      
      // mock button handler
      mockBtn.addEventListener('click', ()=>{ const title = `Mock #${town.plots.length+1}`; town.addPlot(title, makePlaceholderCoverCanvas('#8dd6ff')); updateHud(); });

      // hover + click handling
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      let hovered = null;
      function onMove(e){
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
      }
      function onClick(e){
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(town.plots.map(p => p.building));
        if (hits.length){
          const hitPlot = town.plots.find(p => p.building === hits[0].object);
          if (hitPlot) appState.go('READING', { title: hitPlot.label, coverCanvas: hitPlot.coverCanvas });
        }
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('click', onClick);

      // Store references for cleanup on exit
      this._cleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('click', onClick);
        input.removeEventListener('change', onInputChange);
        inputAny.removeEventListener('change', onInputChange);
        if (input.parentNode) input.parentNode.removeChild(input);
        if (inputAny.parentNode) inputAny.parentNode.removeChild(inputAny);
        const help = document.getElementById('hogarth-rar-help'); if (help && help.parentNode) help.parentNode.removeChild(help);
      };
      updateHud();
    },
    async exit(){
      mounted = false;
      if (this._cleanup) { try { this._cleanup(); } catch(e){} this._cleanup = null; }
      const el = document.getElementById('hogarth-hud'); if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  };
}
