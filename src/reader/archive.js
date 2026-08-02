// Archive loader, LRU page cache, and decode pipeline.
//
// CBZ/ZIP is handled with jszip -- a real bundled dependency, no runtime
// network fetch required. CBR/RAR is not decoded client-side: no
// actively-maintained, reliably-licensed pure-JS RAR extractor exists that's
// safe to depend on here. Rather than chain several fragile CDN-loaded
// fallbacks that may or may not work depending on the file, we fail
// honestly and point the person at converting to CBZ. If real RAR support
// becomes a priority, that's a deliberate feature to scope and build, not
// something to bolt on as a best-effort fallback.
import JSZip from 'jszip';

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

const IMAGE_RE = /\.(jpe?g|png|gif|webp)$/i;
const RAR_RE = /\.cbr$|\.rar$/i;

export async function decodeComicArchive(file, onProgress){
  const name = (file && file.name) || '';

  if (RAR_RE.test(name)){
    throw new Error('CBR (RAR) archives are not supported yet. Convert to CBZ (ZIP) and re-upload -- see the help dialog for a converter link.');
  }

  const ab = await file.arrayBuffer();
  let zip;
  try{
    zip = await JSZip.loadAsync(ab);
  } catch (err){
    throw new Error('Could not read this file as a ZIP/CBZ archive. It may be corrupt or a different format.');
  }

  const entries = Object.values(zip.files)
    .filter(f => !f.dir && IMAGE_RE.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  if (!entries.length){
    throw new Error('No image files found inside the archive.');
  }

  const cache = new PageCache(64);
  for (let i = 0; i < entries.length; i++){
    const entry = entries[i];
    const blob = await entry.async('blob');
    const typed = blob.type ? blob : new Blob([blob], { type: /\.png$/i.test(entry.name) ? 'image/png' : 'image/jpeg' });
    const url = URL.createObjectURL(typed);
    cache.set(i, url);
    if (onProgress) onProgress(i, entries.length);
  }

  return { files: entries.map(e => ({ name: e.name })), cache };
}
