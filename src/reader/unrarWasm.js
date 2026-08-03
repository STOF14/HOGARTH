// Loads the unrar WebAssembly binary once and caches the promise, so
// multiple RAR extractions in a session don't refetch it.
let wasmPromise = null;

export function getUnrarWasmBinary(){
  if (!wasmPromise){
    wasmPromise = import('node-unrar-js/esm/js/unrar.wasm?url')
      .then((mod) => fetch(mod.default))
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load unrar WebAssembly binary.');
        return res.arrayBuffer();
      });
  }
  return wasmPromise;
}
