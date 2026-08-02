// Simple camera helpers for orthographic framing
export function updateCameraFit(camera, builtRows, rowStartZ = -6, zSpacing = 6){
  const rows = Math.max(1, builtRows);
  const midZ = rowStartZ + (rows-1) * (zSpacing/2);
  const vs = 11 + rows * 2.0;
  const a = window.innerWidth / window.innerHeight;
  camera.left = -vs * a; camera.right = vs * a; camera.top = vs; camera.bottom = -vs;
  const dist = 15 + rows * 2.0;
  camera.position.set(dist, dist*0.875, dist*0.6 + midZ);
  camera.lookAt(0,0,midZ);
  camera.updateProjectionMatrix();
}
