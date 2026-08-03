import * as THREE from 'three';

// Create a WebGLRenderer configured for the pixel-art pipeline.
// Returns { renderer, resize } where resize is a function you should call on window resize.
export function createPixelRenderer({ pixelScale = 1/6, antialias = false, parent = document.body } = {}){
  const renderer = new THREE.WebGLRenderer({ antialias });
  renderer.setPixelRatio(1);
  renderer.domElement.style.imageRendering = 'pixelated';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  parent.appendChild(renderer.domElement);

  function resize(){
    const w = Math.max(64, Math.floor(window.innerWidth * pixelScale));
    const h = Math.max(48, Math.floor(window.innerHeight * pixelScale));
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  return { renderer, resize };
}
