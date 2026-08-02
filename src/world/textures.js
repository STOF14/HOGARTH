import * as THREE from 'three';
import { hexToInts } from '../utils/color.js';

export function makeNearestTexture(canvas){
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function makeGroundTexture(){
  const size = 16; const canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
  const ctx = canvas.getContext('2d'); const img = ctx.createImageData(size,size);
  const base = ['#3c5a3e', '#456647', '#345036', '#4d6f4f'];
  for (let y=0;y<size;y++){ for (let x=0;x<size;x++){ const n = Math.sin(x*1.7)*Math.cos(y*1.3) + Math.sin((x+y)*0.9); const idx = Math.min(base.length-1, Math.max(0, Math.round((n+1.4)/0.9))); const [r,g,b] = hexToInts(base[idx]); const i=(y*size+x)*4; img.data[i]=r; img.data[i+1]=g; img.data[i+2]=b; img.data[i+3]=255; }}
  ctx.putImageData(img,0,0); return canvas;
}

export function makeStreetTexture(){
  const size = 16; const canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
  const ctx = canvas.getContext('2d'); const img = ctx.createImageData(size,size);
  const base = ['#5a5560', '#65606c', '#4d4954'];
  for (let y=0;y<size;y++){ for (let x=0;x<size;x++){ const n = Math.sin(x*2.1+y*0.4); const idx = Math.min(base.length-1, Math.max(0, Math.round((n+1)/0.9))); const [r,g,b] = hexToInts(base[idx]); const i=(y*size+x)*4; img.data[i]=r; img.data[i+1]=g; img.data[i+2]=b; img.data[i+3]=255; }}
  ctx.putImageData(img,0,0); return canvas;
}

export function makeBuildingTexture(baseHex, accentHex){
  const size = 16; const canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
  const ctx = canvas.getContext('2d'); const img = ctx.createImageData(size,size);
  const [br,bg,bb] = hexToInts(baseHex); const [ar,ag,ab] = hexToInts(accentHex);
  for (let y=0;y<size;y++){ for (let x=0;x<size;x++){ const i=(y*size+x)*4; const isDoor = x>=6 && x<=9 && y>=9; const isWindow = (x===3||x===12) && y>=3 && y<=6; const brickLine = (y%4===0); let r=br,g=bg,b=bb; if (isDoor){ r=30; g=22; b=18; } else if (isWindow){ r=ar; g=ag; b=ab; } else if (brickLine){ r=Math.max(0,br-18); g=Math.max(0,bg-18); b=Math.max(0,bb-18); } img.data[i]=r; img.data[i+1]=g; img.data[i+2]=b; img.data[i+3]=255; }}
  ctx.putImageData(img,0,0); return canvas;
}

export function makeStarTexture(){ const size=6; const canvas=document.createElement('canvas'); canvas.width=size; canvas.height=size; const ctx=canvas.getContext('2d'); ctx.fillStyle='#e8e2f0'; ctx.fillRect(0,0,size,size); return canvas; }

export function makePlaceholderCoverCanvas(baseHex){
  const size=20, canvas=document.createElement('canvas'); canvas.width=size; canvas.height=size; const ctx=canvas.getContext('2d'); const img=ctx.createImageData(size,size); const [br,bg,bb]=hexToInts(baseHex);
  for (let y=0;y<size;y++){ for (let x=0;x<size;x++){ const i=(y*size+x)*4; const n = Math.sin(x*0.8+y*0.5)+Math.sin((x-y)*0.6); const f = 0.75 + n*0.12; img.data[i]=Math.min(255,br*f); img.data[i+1]=Math.min(255,bg*f); img.data[i+2]=Math.min(255,bb*f); img.data[i+3]=255; }}
  ctx.putImageData(img,0,0); return canvas;
}

// ---- boot-sequence textures (ported from the stage1-boot.html prototype) ----

export function makePlanetTexture(kind){
  const size = 40;
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const cx = size/2, cy = size/2, r = size/2 - 1;
  const palettes = {
    rock: ['#6b6373', '#847c8f', '#4d4757', '#a89fb0', '#38333f'],
    lava: ['#2a1210', '#4a1a12', '#7a2814', '#c94a1a', '#f2812e']
  };
  const pal = palettes[kind];
  for (let y=0;y<size;y++){
    for (let x=0;x<size;x++){
      const dx=x-cx, dy=y-cy, dist=Math.sqrt(dx*dx+dy*dy);
      const i=(y*size+x)*4;
      if (dist > r){ img.data[i+3]=0; continue; }
      const lightAmt = Math.max(0, (-dx-dy)/size);
      let colorIdx;
      if (kind==='rock'){
        const n = Math.sin(x*0.9)*Math.cos(y*0.7)+Math.sin((x+y)*0.35);
        colorIdx = Math.min(pal.length-1, Math.max(0, Math.round(2 - lightAmt*3 + n*0.6)));
      } else {
        const n = Math.sin(x*0.5+y*0.9)+Math.sin(x*1.3-y*0.4);
        colorIdx = Math.min(pal.length-1, Math.max(0, Math.round(1.5 + n*1.4 + lightAmt*1.2)));
      }
      const [rr,gg,bb] = hexToInts(pal[colorIdx]);
      img.data[i]=rr; img.data[i+1]=gg; img.data[i+2]=bb; img.data[i+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
  return canvas;
}

export function makeFlashTexture(){
  const size = 24;
  const canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size,size);
  const cx=size/2, cy=size/2, r=size/2-1;
  for (let y=0;y<size;y++){ for (let x=0;x<size;x++){
    const dist=Math.hypot(x-cx,y-cy); const i=(y*size+x)*4;
    if (dist>r){ img.data[i+3]=0; continue; }
    const ring = dist/r;
    const hex = ring<0.55 ? '#fff6dd' : (ring<0.8 ? '#ffcf6b' : '#f2812e');
    const [rr,gg,bb] = hexToInts(hex);
    img.data[i]=rr; img.data[i+1]=gg; img.data[i+2]=bb; img.data[i+3]=255;
  }}
  ctx.putImageData(img,0,0);
  return canvas;
}

export function makeParticleTexture(hex){
  const size = 6;
  const canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = hex; ctx.fillRect(0,0,size,size);
  return canvas;
}

// Samples opaque pixel colors out of a generated texture canvas — used so
// boot-sequence debris is colored from the planets' own palettes instead of
// a generic spark color.
export function sampleOpaqueColors(sourceCanvas, size, count){
  const ctx = sourceCanvas.getContext('2d');
  const data = ctx.getImageData(0,0,size,size).data;
  const colors = [];
  let attempts = 0;
  while (colors.length < count && attempts < count*20){
    attempts++;
    const x = Math.floor(Math.random()*size), y = Math.floor(Math.random()*size);
    const i = (y*size+x)*4;
    if (data[i+3] > 200){
      colors.push(`#${data[i].toString(16).padStart(2,'0')}${data[i+1].toString(16).padStart(2,'0')}${data[i+2].toString(16).padStart(2,'0')}`);
    }
  }
  return colors.length ? colors : ['#c94a1a'];
}

