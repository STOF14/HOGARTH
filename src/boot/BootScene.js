import { updateCameraFit } from '../core/cameraRig.js';

export default function BootScene({ scene, camera, container, appState }){
  let mounted = false;
  return {
    async enter(){
      mounted = true;
      // simple boot: wait 1200ms then transition to TOWN
      const el = document.createElement('div'); el.id = 'boot-skip'; el.style.position='fixed'; el.style.inset='0'; el.style.cursor='pointer'; el.title='Skip boot';
      container.appendChild(el);
      const skip = ()=>{ if (mounted) appState.go('TOWN'); };
      el.addEventListener('click', skip, { once: true });
      // ensure camera framing is correct on boot end
      updateCameraFit(camera, 1);
      await new Promise(res => setTimeout(res, 1200));
      if (mounted) await appState.go('TOWN');
    },
    async exit(){
      mounted = false;
      const el = document.getElementById('boot-skip'); if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  };
}
