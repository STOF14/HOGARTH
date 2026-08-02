// Archive loader, LRU page cache, and decode pipeline extracted from prototype
export class PageCache {
  constructor(limit = 32){ this.limit = limit; this.map = new Map(); }
  set(key, value){ if (this.map.has(key)) this.map.delete(key); this.map.set(key, value); while (this.map.size > this.limit){ const k = this.map.keys().next().value; URL.revokeObjectURL(this.map.get(k)); this.map.delete(k); } }
  get(key){ return this.map.get(key); }
}

export async function loadArchiveLib(){
  if (window.Archive) return window.Archive;
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/libarchive.js@2.0.2/dist/libarchive.js';
  document.head.appendChild(script);
  await new Promise((res, rej) => { script.onload = res; script.onerror = rej; });
  return window.Archive;
}

export async function decodeComicArchive(file, onProgress){
  const Archive = await loadArchiveLib();
  const ab = await file.arrayBuffer();
  let n;
  try{
    n = new Archive(new Uint8Array(ab));
  } catch (err){
    // libarchive may not support RAR/CBR in this build/environment
    const name = (file && file.name) || '';
    if (/\.cbr$|\.rar$/i.test(name)){
      throw new Error('CBR (RAR) archives are not supported in this environment. Convert to CBZ (ZIP) or upload from a desktop.');
    }
    throw err;
  }
  const entries = n.getFiles().filter(f=>/\.(jpe?g|png|gif)$/i.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name, undefined, {numeric:true, sensitivity:'base'}));
  const cache = new PageCache(64);
  if (!entries.length){
    const name = (file && file.name) || '';
    if (/\.cbr$|\.rar$/i.test(name)){
      throw new Error('CBR (RAR) archives are not supported in this environment. Convert to CBZ (ZIP) or upload from a desktop.');
    }
    throw new Error('No image files found inside the archive.');
  }
  for (let i=0;i<entries.length;i++){
    const f = entries[i];
    const blob = new Blob([f.getData()], { type: /\.png$/i.test(f.name) ? 'image/png' : 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    cache.set(i, url);
    if (onProgress) onProgress(i, entries.length);
  }
  return { files: entries, cache };
}
