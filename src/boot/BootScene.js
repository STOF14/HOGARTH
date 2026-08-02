import * as THREE from 'three';
import {
  makeNearestTexture,
  makePlanetTexture,
  makeFlashTexture,
  makeParticleTexture,
  makeStarTexture,
  sampleOpaqueColors
} from '../world/textures.js';
import { updateCameraFit } from '../core/cameraRig.js';

// The real boot sequence: two pixel-art bodies approach, make actual
// surface contact, squash on impact with a camera shake, shatter into
// debris colored from their own textures, then a pixel-dissolve wipe
// carries the screen to red and then black before handing off to TOWN.
//
// This owns a group of objects added to the shared scene/camera passed in
// from main.js, plus its own DOM overlay for the pixel-dissolve wipes and
// the wordmark -- everything is cleaned up again in exit().

const ISO_DIR = { x: 1, y: 0.875, z: 0.6 };
const RADIUS_A = 1.6, RADIUS_B = 1.15;

function hexToRGBInts(hex){
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

export default function BootScene({ scene, camera, container, appState }){
  let mounted = false;
  let group = null;
  let overlay = null;
  let redCanvas, blackCanvas, wordmarkCanvas;
  let redThresh, blackThresh;
  let rafId = null;
  let finished = false;

  function buildOverlayDom(){
    overlay = document.createElement('div');
    overlay.style.position = 'fixed'; overlay.style.inset = '0'; overlay.style.zIndex = '50'; overlay.style.pointerEvents = 'none';

    redCanvas = document.createElement('canvas');
    redCanvas.width = 64; redCanvas.height = 36;
    Object.assign(redCanvas.style, { position:'fixed', inset:'0', width:'100%', height:'100%', imageRendering:'pixelated', zIndex:'10' });

    blackCanvas = document.createElement('canvas');
    blackCanvas.width = 64; blackCanvas.height = 36;
    Object.assign(blackCanvas.style, { position:'fixed', inset:'0', width:'100%', height:'100%', imageRendering:'pixelated', zIndex:'11' });

    wordmarkCanvas = document.createElement('canvas');
    wordmarkCanvas.width = 220; wordmarkCanvas.height = 40;
    Object.assign(wordmarkCanvas.style, {
      position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
      width:'min(72vw, 640px)', height:'auto', imageRendering:'pixelated',
      opacity:'0', transition:'opacity 1.2s ease', zIndex:'20'
    });

    const skip = document.createElement('button');
    skip.textContent = 'Skip →';
    Object.assign(skip.style, {
      position:'fixed', bottom:'28px', right:'28px', zIndex:'60', pointerEvents:'auto',
      fontFamily:'IBM Plex Mono, monospace', fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase',
      color:'rgba(255,255,255,0.55)', background:'none', border:'1px solid rgba(255,255,255,0.25)', padding:'8px 14px', cursor:'pointer'
    });
    skip.addEventListener('click', () => finish());

    overlay.appendChild(redCanvas);
    overlay.appendChild(blackCanvas);
    overlay.appendChild(wordmarkCanvas);
    overlay.appendChild(skip);
    container.appendChild(overlay);

    drawWordmark();
    if (document.fonts && document.fonts.load){
      document.fonts.load('20px "Press Start 2P"').then(drawWordmark).catch(()=>{});
    }
  }

  function drawWordmark(){
    const ctx = wordmarkCanvas.getContext('2d');
    ctx.clearRect(0,0,wordmarkCanvas.width,wordmarkCanvas.height);
    ctx.fillStyle = '#f0ece2';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillText('HOGARTH', wordmarkCanvas.width/2, wordmarkCanvas.height/2 + 2);
  }

  function makeThresholds(cols, rows){
    const arr = new Float32Array(cols*rows);
    for (let i=0;i<arr.length;i++) arr[i] = Math.random();
    return arr;
  }
  function paintWipe(canvas, thresholds, rgb, coverage){
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);
    for (let i=0;i<thresholds.length;i++){
      const idx = i*4;
      if (thresholds[i] <= coverage){
        img.data[idx]=rgb[0]; img.data[idx+1]=rgb[1]; img.data[idx+2]=rgb[2]; img.data[idx+3]=255;
      } else { img.data[idx+3]=0; }
    }
    ctx.putImageData(img,0,0);
  }
  function animateWipe(canvas, thresholds, rgb, durationMs, onDone){
    const start = performance.now();
    function step(now){
      const t = Math.min((now-start)/durationMs, 1);
      paintWipe(canvas, thresholds, rgb, t);
      if (t < 1) requestAnimationFrame(step); else if (onDone) onDone();
    }
    requestAnimationFrame(step);
  }

  function finish(){
    if (finished) return;
    finished = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (mounted) appState.go('TOWN');
  }

  return {
    async enter(){
      mounted = true;
      finished = false;

      buildOverlayDom();
      redThresh = makeThresholds(64, 36);
      blackThresh = makeThresholds(64, 36);

      group = new THREE.Group();
      scene.add(group);

      camera.position.set(0, 0, 9);
      camera.left = -6; camera.right = 6; camera.top = 6; camera.bottom = -6;
      camera.zoom = 1;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      const rockCanvas = makePlanetTexture('rock');
      const lavaCanvas = makePlanetTexture('lava');
      const rockDebrisColors = sampleOpaqueColors(rockCanvas, 40, 6);
      const lavaDebrisColors = sampleOpaqueColors(lavaCanvas, 40, 6);

      const bodyA = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeNearestTexture(rockCanvas), transparent:true }));
      bodyA.scale.set(RADIUS_A*2, RADIUS_A*2, 1);
      const startA = new THREE.Vector3(-6, -1.2, 0);
      bodyA.position.copy(startA);
      group.add(bodyA);

      const bodyB = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeNearestTexture(lavaCanvas), transparent:true }));
      bodyB.scale.set(RADIUS_B*2, RADIUS_B*2, 1);
      const startB = new THREE.Vector3(6, 1.5, -1);
      bodyB.position.copy(startB);
      group.add(bodyB);

      const impactCenter = new THREE.Vector3(0, 0.1, -0.4);
      const dir = new THREE.Vector3().subVectors(startB, startA).normalize();
      const finalA = impactCenter.clone().addScaledVector(dir, -RADIUS_A);
      const finalB = impactCenter.clone().addScaledVector(dir, RADIUS_B);

      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeNearestTexture(makeFlashTexture()), transparent:true, opacity:0 }));
      flash.scale.set(0.6,0.6,1);
      flash.position.copy(impactCenter);
      group.add(flash);

      const PARTICLE_COUNT = 70;
      const debrisSprites = [], debrisVel = [];
      for (let i=0;i<PARTICLE_COUNT;i++){
        const palette = i % 2 === 0 ? rockDebrisColors : lavaDebrisColors;
        const hex = palette[Math.floor(Math.random()*palette.length)];
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeNearestTexture(makeParticleTexture(hex)), transparent:true, opacity:0 }));
        spr.scale.set(0.2 + Math.random()*0.14, 0.2 + Math.random()*0.14, 1);
        spr.position.copy(impactCenter);
        group.add(spr);
        debrisSprites.push(spr);
        const theta = Math.random()*Math.PI*2, speed = 2.2 + Math.random()*5.2;
        debrisVel.push(new THREE.Vector3(Math.cos(theta)*speed, Math.sin(theta)*speed, (Math.random()-0.5)*2.2));
      }

      const SPARK_COUNT = 14;
      const sparkSprites = [], sparkVel = [];
      for (let i=0;i<SPARK_COUNT;i++){
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeNearestTexture(makeParticleTexture('#fff6dd')), transparent:true, opacity:0 }));
        spr.scale.set(0.14,0.14,1);
        spr.position.copy(impactCenter);
        group.add(spr);
        sparkSprites.push(spr);
        const theta = Math.random()*Math.PI*2;
        sparkVel.push(new THREE.Vector3(Math.cos(theta)*1.8, Math.sin(theta)*1.8, (Math.random()-0.5)*1.2));
      }

      const starGeo = new THREE.BufferGeometry();
      const starCount = 120;
      const starPos = new Float32Array(starCount*3);
      for (let i=0;i<starCount;i++){ starPos[i*3]=(Math.random()-0.5)*40; starPos[i*3+1]=(Math.random()-0.5)*24; starPos[i*3+2]=-10-Math.random()*15; }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
      const starMat = new THREE.PointsMaterial({ size:0.12, map: makeNearestTexture(makeStarTexture()), transparent:true, depthWrite:false });
      const stars = new THREE.Points(starGeo, starMat);
      group.add(stars);

      const camBase = new THREE.Vector3(0,0,9);
      let phase = 'approach';
      let phaseStart = performance.now();
      const APPROACH_MS = 2100, IMPACT_MS = 170, EXPLODE_MS = 950;
      let redStarted = false;

      function step(now){
        if (finished) return;
        rafId = requestAnimationFrame(step);
        const elapsed = now - phaseStart;

        if (phase === 'approach'){
          const t = Math.min(elapsed/APPROACH_MS, 1);
          const e = easeInOutCubic(t);
          bodyA.position.lerpVectors(startA, finalA, e);
          bodyB.position.lerpVectors(startB, finalB, e);
          camera.position.set(camBase.x, camBase.y, camBase.z - e*1.2);
          camera.lookAt(0,0,0);
          if (t >= 1){ phase='impact'; phaseStart=now; sparkSprites.forEach(s=>s.material.opacity=1); }
        } else if (phase === 'impact'){
          const t = Math.min(elapsed/IMPACT_MS, 1);
          const squash = 1 - 0.35*Math.sin(t*Math.PI);
          const bulge = 1 + 0.25*Math.sin(t*Math.PI);
          bodyA.scale.set(RADIUS_A*2*bulge, RADIUS_A*2*squash, 1);
          bodyB.scale.set(RADIUS_B*2*bulge, RADIUS_B*2*squash, 1);
          const shake = (1-t)*0.09;
          camera.position.x = camBase.x + (Math.random()-0.5)*shake;
          camera.position.y = camBase.y + (Math.random()-0.5)*shake;
          const dt = elapsed/1000;
          for (let i=0;i<SPARK_COUNT;i++){
            sparkSprites[i].position.set(impactCenter.x+sparkVel[i].x*dt, impactCenter.y+sparkVel[i].y*dt, impactCenter.z+sparkVel[i].z*dt);
            sparkSprites[i].material.opacity = Math.max(0, 1-t);
          }
          if (t >= 1){
            phase='explode'; phaseStart=now;
            bodyA.visible=false; bodyB.visible=false;
            flash.material.opacity=1;
            debrisSprites.forEach(s=>s.material.opacity=1);
            sparkSprites.forEach(s=>s.material.opacity=0);
          }
        } else if (phase === 'explode'){
          const t = Math.min(elapsed/EXPLODE_MS, 1);
          const dt = elapsed/1000;
          for (let i=0;i<PARTICLE_COUNT;i++){
            debrisSprites[i].position.set(impactCenter.x+debrisVel[i].x*dt, impactCenter.y+debrisVel[i].y*dt, impactCenter.z+debrisVel[i].z*dt);
            debrisSprites[i].material.opacity = Math.max(0, 1-t);
          }
          flash.material.opacity = Math.max(0, 1 - t*1.5);
          flash.scale.setScalar(3.4 + t*4);

          if (t > 0.3 && !redStarted){
            redStarted = true;
            animateWipe(redCanvas, redThresh, hexToRGBInts('#a01414'), 520, () => {
              setTimeout(() => {
                animateWipe(blackCanvas, blackThresh, hexToRGBInts('#0a0810'), 520, () => {
                  wordmarkCanvas.style.opacity = '0.95';
                  updateCameraFit(camera, 1);
                  setTimeout(finish, 900);
                });
              }, 220);
            });
          }
          if (t >= 1) phase = 'done';
        }
      }
      rafId = requestAnimationFrame(step);

      // Also allow clicking anywhere (outside skip button) to fast-forward
      overlay.style.pointerEvents = 'auto';
      overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(); });
    },
    async exit(){
      mounted = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (group){ scene.remove(group); group = null; }
      if (overlay && overlay.parentNode){ overlay.parentNode.removeChild(overlay); overlay = null; }
    }
  };
}
