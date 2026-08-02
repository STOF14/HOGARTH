import { decodeComicArchive } from './archive.js';

export default function ReaderPanel({ container, appState }){
  let mounted = false;
  let state = { pages: [], index: 0, urlsCreated: false };
  let overlay = null;

  function render(){
    if (!overlay) return;
    const img = overlay.querySelector('.reader-image');
    const counter = overlay.querySelector('.reader-counter');
    if (state.pages.length === 0){ img.src = ''; counter.textContent = '';} else { img.src = state.pages[state.index]; counter.textContent = `${state.index+1} / ${state.pages.length}`; }
  }

  function showLoading(msg='Loading…'){
    if (!overlay) return; overlay.querySelector('.reader-loading').textContent = msg; overlay.querySelector('.reader-loading').style.display = 'block';
  }
  function hideLoading(){ if (!overlay) return; overlay.querySelector('.reader-loading').style.display = 'none'; }
  function showError(msg){ if (!overlay) return; overlay.querySelector('.reader-error').textContent = msg; overlay.querySelector('.reader-error').style.display='block'; hideLoading(); }

  function bindKeys(){
    return function keyHandler(e){ if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); else if (e.key === 'Escape') appState.go('TOWN'); };
  }

  function next(){ if (state.index < state.pages.length - 1){ state.index++; render(); } }
  function prev(){ if (state.index > 0){ state.index--; render(); } }

  async function loadArchive(file){
    showLoading(`Decoding ${file.name}…`);
    try{
      const { files, cache } = await decodeComicArchive(file, (i,n)=> showLoading(`Decoding ${i+1}/${n}`));
      const urls = Array.from({length: files.length}).map((_,i)=> cache.get(i));
      state.pages = urls; state.index = 0; state.urlsCreated = true; hideLoading(); render();
    } catch (err){ console.error(err); showError('Could not decode archive.'); }
  }

  return {
    async enter(payload = {}){
      mounted = true;
      overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(6,6,10,0.88)'; overlay.style.zIndex='70'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center';
      overlay.innerHTML = `
        <div style="max-width:90vw; max-height:90vh; background:linear-gradient(180deg, rgba(28,22,39,0.94), rgba(14,11,20,0.96)); padding:14px; border:1px solid rgba(241,236,223,0.08);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="font-family:IBM Plex Mono, monospace;color:#fff4e1;">${payload.title || 'Reader'}</div>
            <div><button class="reader-close">Close</button></div>
          </div>
          <div style="text-align:center;">
            <div class="reader-loading" style="display:none;margin-bottom:8px;color:#ffcf8a"></div>
            <div class="reader-error" style="display:none;margin-bottom:8px;color:#ff8a8a"></div>
            <img class="reader-image" src="" style="max-width:72vw; max-height:72vh; image-rendering:pixelated; background:#111;" />
            <div class="reader-counter" style="margin-top:8px;color:#ddd;font-family:IBM Plex Mono, monospace"></div>
            <div style="margin-top:10px;display:flex;gap:8px;justify-content:center;"><button class="reader-prev">Prev</button><button class="reader-next">Next</button></div>
          </div>
        </div>
      `;
      container.appendChild(overlay);
      overlay.querySelector('.reader-close').addEventListener('click', ()=> appState.go('TOWN'));
      overlay.querySelector('.reader-next').addEventListener('click', next);
      overlay.querySelector('.reader-prev').addEventListener('click', prev);
      const handler = bindKeys(); window.addEventListener('keydown', handler);
      overlay._keyHandler = handler;

      // payload handling
      if (payload.archiveFile) await loadArchive(payload.archiveFile);
      else if (payload.pages) { state.pages = payload.pages; state.index = 0; render(); }
      else if (payload.coverCanvas) { state.pages = [payload.coverCanvas.toDataURL()]; state.index=0; render(); }
      else if (payload.coverUrl) { state.pages = [payload.coverUrl]; state.index=0; render(); }
    },
    async exit(){
      mounted = false;
      if (overlay){ window.removeEventListener('keydown', overlay._keyHandler); if (overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }
      if (state.urlsCreated){ state.pages.forEach(u=> URL.revokeObjectURL(u)); state.pages = []; state.index = 0; state.urlsCreated = false; }
    }
  };
}
