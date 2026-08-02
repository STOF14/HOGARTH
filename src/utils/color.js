// Color utilities extracted from legacy prototypes
export function hexToInts(hex){
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
export function rgbToHex(r,g,b){
  const h = v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
export function rgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if (max===min){ h=0; s=0; }
  else{
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b?6:0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break;
    }
    h*=60;
  }
  return [h,s,l];
}
export function hslToHex(h, s, l){
  s/=100; l/=100;
  const k = n => (n + h/30) % 12;
  const a = s * Math.min(l, 1-l);
  const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)));
  const toHex = x => Math.round(x*255).toString(16).padStart(2,'0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
export function shade(hex, amt){
  const [r,g,b] = hexToInts(hex);
  return rgbToHex(r+amt*255, g+amt*255, b+amt*255);
}
export function hashHue(str){
  let h=0; for (let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))>>>0;
  return h % 360;
}

// Dominant color extraction on a small canvas (returns hex)
export function extractDominantColor(canvas){
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0,0,width,height).data;
  const buckets = {};
  for (let i=0;i<data.length;i+=4){
    const a = data[i+3]; if (a < 128) continue;
    const [h,s,l] = rgbToHsl(data[i], data[i+1], data[i+2]);
    if (s < 0.15 || l < 0.08 || l > 0.92) continue;
    const bucket = Math.floor(h/15)*15;
    if (!buckets[bucket]) buckets[bucket] = { count:0, sSum:0, lSum:0 };
    buckets[bucket].count++; buckets[bucket].sSum += s; buckets[bucket].lSum += l;
  }
  let bestKey = null, bestCount = 0;
  for (const k in buckets){ if (buckets[k].count > bestCount){ bestCount = buckets[k].count; bestKey = k; } }
  if (bestKey === null){
    let rS=0,gS=0,bS=0,n=0;
    for (let i=0;i<data.length;i+=4){ if (data[i+3] < 128) continue; rS+=data[i]; gS+=data[i+1]; bS+=data[i+2]; n++; }
    n = n || 1; return rgbToHex(rS/n, gS/n, bS/n);
  }
  const b = buckets[bestKey];
  const avgS = b.sSum/b.count, avgL = Math.min(0.62, Math.max(0.3, b.lSum/b.count));
  return hslToHex(Number(bestKey), avgS*100, avgL*100);
}
