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
