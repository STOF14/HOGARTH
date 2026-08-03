import * as THREE from 'three';
import { makeNearestTexture, makeGroundTexture, makeStreetTexture, makeBuildingTexture } from './textures.js';
import { hashHue, extractDominantColor, hslToHex, shade } from '../utils/color.js';
import { updateCameraFit } from '../core/cameraRig.js';

export class Town {
  constructor(scene, camera){
    this.scene = scene; this.camera = camera;
    this.plotGroup = new THREE.Group(); scene.add(this.plotGroup);
    this.plots = [];
    this.groundMat = new THREE.MeshStandardMaterial({ map: makeNearestTexture(makeGroundTexture()), roughness:1 });
    this.streetMat = new THREE.MeshStandardMaterial({ map: makeNearestTexture(makeStreetTexture()), roughness:1 });
    this.groundMesh = null; this.streetMesh = null;
    this.builtRows = 0; this.rowStartZ = -6; this.zSpacing = 6;
  }

  computeSlotPosition(n){
    const side = n % 2 === 0 ? -1 : 1; const row = Math.floor(n/2);
    return { x: side*5.5, z: this.rowStartZ + row*this.zSpacing, row, side };
  }

  rebuildGroundAndStreet(rows){
    if (this.groundMesh){ this.scene.remove(this.groundMesh); this.groundMesh.geometry.dispose(); }
    if (this.streetMesh){ this.scene.remove(this.streetMesh); this.streetMesh.geometry.dispose(); }
    const minZ = this.rowStartZ - 5; const maxZ = this.rowStartZ + (rows-1)*this.zSpacing + 5;
    const length = maxZ - minZ; const centerZ = (minZ + maxZ) / 2;
    this.groundMat.map.repeat.set(10, length/2.4);
    this.streetMat.map.repeat.set(2, length/1.83);
    this.groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(24, length), this.groundMat);
    this.groundMesh.rotation.x = -Math.PI/2; this.groundMesh.position.z = centerZ; this.scene.add(this.groundMesh);
    this.streetMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, length), this.streetMat);
    this.streetMesh.rotation.x = -Math.PI/2; this.streetMesh.position.y = 0.01; this.streetMesh.position.z = centerZ; this.scene.add(this.streetMesh);
  }

  createPlot(index, title, baseHex, accentHex, coverCanvas){
    const { x, z, side } = this.computeSlotPosition(index);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.15,2.6), new THREE.MeshStandardMaterial({ color:0x2a2634, roughness:1 })); base.position.y=0.075; g.add(base);
    const facadeTex = makeNearestTexture(makeBuildingTexture(baseHex, accentHex));
    const building = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.6,1.6), new THREE.MeshStandardMaterial({ map: facadeTex, roughness:0.9 })); building.position.y=0.15+0.8; g.add(building);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3,0.9,4), new THREE.MeshStandardMaterial({ color:0x1c1822, roughness:1 })); roof.rotation.y=Math.PI/4; roof.position.y=0.15+1.6+0.45; g.add(roof);
    // optional sign showing cover (or placeholder)
    if (coverCanvas){
      const signTex = makeNearestTexture(coverCanvas);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9), new THREE.MeshStandardMaterial({ map: signTex, roughness:1, side: THREE.DoubleSide }));
      sign.position.set(0, 1.0, 1.35); g.add(sign);
      const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.5,0.08), new THREE.MeshStandardMaterial({ color:0x1c1822 }));
      signPost.position.set(0,0.4,1.35); g.add(signPost);
    }
    const lampGroup = new THREE.Group(); lampGroup.position.set(-side*1.7,0,0.9);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,1.8,6), new THREE.MeshStandardMaterial({ color:0x1c1822, roughness:0.8 })); pole.position.y=0.9; lampGroup.add(pole);
    const bulbMat = new THREE.MeshStandardMaterial({ color:0x3a3640, emissive:0x000000, emissiveIntensity:0, roughness:0.5 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16,8,8), bulbMat); bulb.position.y = 1.85; lampGroup.add(bulb);
    const glowLight = new THREE.PointLight(0xffcf8a, 0, 4); glowLight.position.y = 1.85; lampGroup.add(glowLight);
    g.add(lampGroup);
    this.plotGroup.add(g);
    return { group: g, building, roof, bulbMat, glowLight, lit:false, index, label: title, coverCanvas };
  }

  addPlot(title, coverCanvas){
    const n = this.plots.length;
    const rowsNeeded = Math.floor(n/2) + 1;
    if (rowsNeeded > this.builtRows){ this.builtRows = rowsNeeded; this.rebuildGroundAndStreet(this.builtRows); }

    // Real cover analysis: extract the dominant color from the actual
    // uploaded thumbnail when one exists. Falls back to a hash of the
    // title only for mock/no-cover entries (coverCanvas is still used for
    // the sign either way -- see TownScene's placeholder-cover path).
    let dominant;
    if (coverCanvas){
      try { dominant = extractDominantColor(coverCanvas); }
      catch (e) { dominant = hslToHex(hashHue(title), 40, 46); }
    } else {
      dominant = hslToHex(hashHue(title), 40, 46);
    }
    const baseHex = shade(dominant, -0.28);
    const accentHex = shade(dominant, 0.32);

    const plot = this.createPlot(n, title, baseHex, accentHex, coverCanvas);
    this.plots.push(plot);
    updateCameraFit(this.camera, this.builtRows);

    // Ignite after a short delay with a fade, rather than snapping on --
    // this is what makes it read as "the cover was analyzed" instead of
    // an instant toggle.
    setTimeout(() => this.igniteLamp(plot, dominant), 380);

    return plot;
  }

  igniteLamp(plot, colorHex){
    const targetColor = parseInt(colorHex.replace('#','0x'));
    plot.bulbMat.emissive.setHex(targetColor);
    plot.glowLight.color.setHex(targetColor);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now-start)/500, 1);
      plot.bulbMat.emissiveIntensity = t;
      plot.glowLight.intensity = t * 1.15;
      if (t < 1) requestAnimationFrame(step);
      else plot.lit = true;
    };
    requestAnimationFrame(step);
  }
}
