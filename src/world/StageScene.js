export default function StageScene({ container, appState }){
  let mounted = false;
  let overlay = null;
  return {
    async enter(payload){
      mounted = true;
      const path = (payload && payload.stagePath) || '/stages/stage1-boot.html';
      overlay = document.createElement('div');
      overlay.style.position = 'fixed'; overlay.style.inset = '0'; overlay.style.background = '#000'; overlay.style.zIndex = '100';
      overlay.innerHTML = `
        <div style="position:absolute; inset:12px;">
          <iframe src="${path}" style="width:100%; height:100%; border:0; background:#000;" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
        </div>
        <div style="position:fixed; right:14px; top:14px; z-index:110;">
          <button id="stage-close" style="padding:8px 12px;">Close</button>
        </div>`;
      container.appendChild(overlay);
      overlay.querySelector('#stage-close').addEventListener('click', ()=> appState.go('TOWN'));
    },
    async exit(){
      mounted = false;
      if (overlay){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }
    }
  };
}
