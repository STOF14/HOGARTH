import * as THREE from 'three';
import { createPixelRenderer } from './core/pixelRenderer.js';
import { AppState } from './core/appState.js';
import BootScene from './boot/BootScene.js';
import TownScene from './world/TownScene.js';
import ReaderPanel from './reader/ReaderPanel.js';

// Minimal app bootstrap for Vite + Three (r128)
const appEl = document.getElementById('app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14101c);

const camera = new THREE.OrthographicCamera(-10,10,10,-10,0.1,200);
const { renderer, resize } = createPixelRenderer({ pixelScale: 1/6, antialias: false, parent: appEl });

function onWindowResize(){
  const a = window.innerWidth / window.innerHeight;
  camera.left = -10 * a; camera.right = 10 * a; camera.top = 10; camera.bottom = -10;
  camera.updateProjectionMatrix();
  // keep pixel renderer's internal size in sync
  resize();
}
window.addEventListener('resize', onWindowResize, { passive: true });
onWindowResize();

const ambient = new THREE.AmbientLight(0x2e2a3c, 1.2);
scene.add(ambient);

const appState = new AppState();
const boot = BootScene({ scene, camera, container: appEl, appState });
const townScene = TownScene({ scene, camera, container: appEl, appState });
appState.register('BOOT', boot);
appState.register('TOWN', townScene);
const readerPanel = ReaderPanel({ container: appEl, appState });
appState.register('READING', readerPanel);
appState.go('BOOT');

function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

console.log('Hogarth bootstrap loaded — three r' + (THREE.REVISION || 'unknown'));
