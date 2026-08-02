// Archive loader, LRU page cache, and decode pipeline extracted from prototype
export class PageCache {
  constructor(limit = 32){ this.limit = limit; this.map = new Map(); }
  set(key, value){
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.limit){
      const k = this.map.keys().next().value;
      try{ URL.revokeObjectURL(this.map.get(k)); }catch(e){}
      this.map.delete(k);
    }
  }
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
    // libarchive may not support RAR/CBR in this build/environment — try JS RAR fallback
    const name = (file && file.name) || '';
    if (/\.cbr$|\.rar$/i.test(name)){
      try{
        const entries = await tryUnrarFallback(ab, onProgress);
        const cache = new PageCache(64);
        for (let i=0;i<entries.length;i++){
          const b = entries[i].blob;
          const url = URL.createObjectURL(b);
          cache.set(i, url);
          if (onProgress) onProgress(i, entries.length);
        }
        return { files: entries.map(e=>({ name: e.name, file: e.blob })), cache };
      } catch (uerr){
        throw new Error('CBR (RAR) archives are not supported in this environment. Convert to CBZ (ZIP) or upload from a desktop.');
      }
    }
    throw err;
  }

  const entries = n.getFiles().filter(f=>/\.(jpe?g|png|gif)$/i.test(f.name)).sort((a,b)=>
    a.name.localeCompare(b.name, undefined, {numeric:true, sensitivity:'base'}));
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

async function tryUnrarFallback(arrayBuffer, onProgress){
  const uint8 = new Uint8Array(arrayBuffer);
  let module;
  try{
    const spec = 'unrar' + '-js';
    module = await import(spec);
  } catch (e){
    // If unrar-js is not installed locally, try loading from the unpkg CDN
    try{
      const cdn = 'https://' + 'unpkg.com/' + 'unrar-js' + '/dist/unrar.esm.js';
      module = await import(cdn);
    } catch (e2){
      throw e;
    }
  }

  const Unrar = module.Unrar || module.default || module;
  if (!Unrar) throw new Error('unrar-js not available');

  let extractor = null;
  if (typeof Unrar.createExtractorFromData === 'function'){
    extractor = Unrar.createExtractorFromData({ data: uint8 });
  } else if (typeof Unrar.createExtractor === 'function'){
    extractor = Unrar.createExtractor(uint8);
  } else if (typeof Unrar.extract === 'function'){
    const res = Unrar.extract(uint8);
    if (res && res.files) return res.files.filter(f=>/\.(jpe?g|png|gif|bmp)$/i.test(f.fileName)).map(f=>({ name:f.fileName, blob:new Blob([f.extraction], { type: 'image/png' }) }));
    throw new Error('unsupported unrar-js API');
  } else {
    throw new Error('unsupported unrar-js API');
  }

  if (extractor.getFileList && extractor.extractFiles){
    const list = extractor.getFileList();
    const files = list.fileHeaders || list.files || [];
    const out = [];
    for (let i=0;i<files.length;i++){
      const fh = files[i];
      const name = fh.fileName || fh.name || String(fh);
      if (!/\.(jpe?g|png|gif|bmp)$/i.test(name)) continue;
      const extracted = extractor.extractFiles([name]);
      const data = (extracted && extracted.files && extracted.files[0] && extracted.files[0].extraction) || extracted[0].extraction;
      const blob = new Blob([data.buffer || data], { type: /\.png$/i.test(name) ? 'image/png' : 'image/jpeg' });
      out.push({ name, blob });
      if (onProgress) onProgress(out.length-1, files.length);
    }
    if (!out.length) throw new Error('No images in RAR');
    return out;
  }

  if (extractor.extract){
    const res = extractor.extract();
    const out = [];
    for (const f of res.files || []){
      const name = f.fileName || f.name;
      if (!/\.(jpe?g|png|gif|bmp)$/i.test(name)) continue;
      const data = f.extraction || f.fileData;
      const blob = new Blob([data.buffer || data], { type: /\.png$/i.test(name) ? 'image/png' : 'image/jpeg' });
      out.push({ name, blob });
    }
    if (!out.length) throw new Error('No images in RAR');
    return out;
  }

  throw new Error('Could not extract RAR with unrar-js');
}
