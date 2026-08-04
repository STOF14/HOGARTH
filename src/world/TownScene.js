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
  const hudStatus = document.createElement('div');
  hudStatus.style.marginTop = '6px'; hudStatus.style.fontSize = '12px'; hudStatus.style.opacity = '0.75'; hudStatus.style.minHeight = '16px';
  hud.appendChild(hudStatus);
  function setStatus(msg){ hudStatus.textContent = msg || ''; }

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
      // Accept common comic/document formats, including RAR MIME variants so
      // iOS shows them where possible.
      input.accept = 'image/*,.cbz,.zip,.cbr,.rar,.pdf,application/pdf,application/x-rar-compressed,application/vnd.rar,application/octet-stream';
      input.style.display='none';
      // Fallback input without accept for platforms that hide custom extensions (iPad iOS picker)
      const inputAny = document.createElement('input'); inputAny.type='file'; inputAny.style.display='none';
      const uploadBtn = document.createElement('button'); uploadBtn.textContent = 'Upload';
      const altBtn = document.createElement('button'); altBtn.textContent = 'Select any file'; altBtn.title = 'Use this if your device does not show .cbr/.rar/.pdf in the picker';
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

      // Generic decode-error dialog -- shown when a .cbz/.cbr/.pdf fails to
      // decode (corrupt file, password-protected RAR, unreadable PDF, etc).
      function showDecodeErrorHelp(filename, message){
        const existing = document.getElementById('hogarth-decode-error');
        if (existing) existing.parentNode.removeChild(existing);
        const el = document.createElement('div'); el.id = 'hogarth-decode-error';
        el.style.position = 'fixed'; el.style.left='50%'; el.style.top='18%'; el.style.transform='translateX(-50%)'; el.style.zIndex='120';
        el.style.background='rgba(20,16,28,0.98)'; el.style.color='#f0ece2'; el.style.border='1px solid rgba(240,236,226,0.2)'; el.style.padding='14px'; el.style.maxWidth='560px'; el.style.fontFamily='IBM Plex Mono, monospace'; el.style.fontSize='13px'; el.style.boxShadow='0 6px 18px rgba(0,0,0,0.6)';
        const fname = filename ? ` "${filename}"` : '';
        el.innerHTML = `
          <div style="margin-bottom:8px; font-weight:600;">Could not add${fname}</div>
          <div style="margin-bottom:10px; color:rgba(240,236,226,0.9)">${message || 'This file could not be read.'}</div>
          <div style="text-align:right"><button id="hogarth-decode-error-close" style="padding:6px 10px">OK</button></div>
        `;
        document.body.appendChild(el);
        el.querySelector('#hogarth-decode-error-close').addEventListener('click', ()=>{ if (el.parentNode) el.parentNode.removeChild(el); });
      }

      async function processFile(f){
        if (!f) return;
        setStatus(`Reading "${f.name}"…`);
        // If this looks like a comic archive or document, try the decode path
        if (/\.(cbz|zip|cbr|rar|pdf)$/i.test(f.name)){
          try{
            setStatus(`Analyzing "${f.name}"…`);
            const { files, cache } = await withTimeout(
              decodeComicArchive(f, (i,n)=>{ setStatus(`Analyzing "${f.name}"… (${i+1}/${n})`); }),
              45000,
              `Timed out reading "${f.name}" — it may be too large, or the RAR/PDF decoder may have hung.`
            );
            if (!files.length){
              throw new Error('No pages were found in this file.');
            }
            const url = cache.get(0);
            const img = new Image();
            img.onload = ()=>{
              try{
                const s = Math.min(img.width, img.height); const sx=(img.width-s)/2, sy=(img.height-s)/2; const thumb=document.createElement('canvas'); thumb.width=20; thumb.height=20; const tctx=thumb.getContext('2d'); tctx.imageSmoothingEnabled=false; tctx.drawImage(img, sx, sy, s, s, 0, 0, 20,20);
                town.addPlot(f.name.replace(/\.[^.]+$/,''), thumb);
                updateHud();
                setStatus('');
              } catch (err){
                console.error('[TownScene] thumbnail generation failed:', err);
                showDecodeErrorHelp(f.name, 'Could not generate a cover thumbnail from the first page.');
                setStatus('');
              }
            };
            img.onerror = (e)=>{
              console.error('[TownScene] first-page image failed to load:', e, 'url:', url);
              showDecodeErrorHelp(f.name, 'The first page decoded but the browser could not display it as an image.');
              setStatus('');
            };
            img.src = url;
          } catch (err){
            console.error('[TownScene] processFile (archive/doc) failed:', err);
            showDecodeErrorHelp(f && f.name, err && err.message);
            setStatus('');
          }
        } else if (/image\//i.test(f.type)){
          const img = new Image(); const url = URL.createObjectURL(f);
          img.onload = ()=>{
            const s = Math.min(img.width, img.height); const sx=(img.width-s)/2, sy=(img.height-s)/2; const thumb=document.createElement('canvas'); thumb.width=20; thumb.height=20; const tctx=thumb.getContext('2d'); tctx.imageSmoothingEnabled=false; tctx.drawImage(img, sx, sy, s, s, 0, 0, 20,20); URL.revokeObjectURL(url);
            town.addPlot(f.name.replace(/\.[^.]+$/,''), thumb); updateHud(); setStatus('');
          };
          img.onerror = (e)=>{
            console.error('[TownScene] image upload failed to load:', e);
            URL.revokeObjectURL(url);
            showDecodeErrorHelp(f.name, 'Could not read this image file.');
            setStatus('');
          };
          img.src = url;
        } else {
          setStatus('');
          showDecodeErrorHelp(f.name, 'Unrecognized file type. Use .cbz, .cbr, .pdf, or an image.');
        }
      }

      function withTimeout(promise, ms, message){
        let timer;
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
