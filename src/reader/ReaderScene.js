export default function ReaderScene({ scene, camera, container, appState }){
  let mounted = false;
  let overlay = null;
  return {
    async enter(payload = {}){
      mounted = true;
      overlay = document.createElement('div');
      overlay.style.position = 'fixed'; overlay.style.inset='0'; overlay.style.background='rgba(6,6,10,0.88)'; overlay.style.zIndex='60'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center';
      const panel = document.createElement('div'); panel.style.padding='18px'; panel.style.background='linear-gradient(180deg, rgba(28,22,39,0.94), rgba(14,11,20,0.96))'; panel.style.border='1px solid rgba(241,236,223,0.08)'; panel.style.maxWidth='80vw'; panel.style.maxHeight='80vh'; panel.style.overflow='auto';
      const title = document.createElement('div'); title.textContent = payload.title || 'Reader'; title.style.marginBottom='12px'; title.style.fontFamily='IBM Plex Mono, monospace'; title.style.color='#fff4e1';
      const imgWrap = document.createElement('div'); imgWrap.style.display='flex'; imgWrap.style.justifyContent='center';
      const img = document.createElement('img'); img.style.maxWidth='60vw'; img.style.maxHeight='60vh'; img.style.imageRendering='pixelated';
      if (payload.coverCanvas){ img.src = payload.coverCanvas.toDataURL(); }
      else if (payload.coverUrl){ img.src = payload.coverUrl; }
      else img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480"><rect width="100%" height="100%" fill="#1b1624"/></svg>');
      imgWrap.appendChild(img);
      const close = document.createElement('button'); close.textContent='Close'; close.style.marginTop='12px'; close.addEventListener('click', ()=> appState.go('TOWN'));
      panel.appendChild(title); panel.appendChild(imgWrap); panel.appendChild(close);
      overlay.appendChild(panel); container.appendChild(overlay);
    },
    async exit(){
      mounted = false; if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null;
    }
  };
}
