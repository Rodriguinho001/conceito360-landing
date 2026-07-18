const fs = require('fs');

// Restore original clean
let original = fs.readFileSync('C:/Users/rodri/Downloads/saveweb2zip-com-www-igloo-inc/js/index-2eb69c09.js', 'utf8');

// === PATCH 1: Fix Kt (onMount) — using split to avoid $$ issue ===
const KtOriginal = 'function Kt(t){st().$$.on_mount.push(t)}';
const KtPatched = [
  'function Kt(t){',
  'var _s=st();var _d=_s["$$"];',
  '_d["on_mount"].push(function(){',
  'try{var r=t();',
  'if(r&&typeof r.then==="function"){r.catch(function(e){console.error("[onMount]",e);});}',
  'return r;}catch(e){console.error("[onMount sync]",e);}',
  '});}'
].join('');

const kParts = original.split(KtOriginal);
if (kParts.length !== 2) { console.error('Kt not found!'); process.exit(1); }
let patched = kParts[0] + KtPatched + kParts[1];

// === PATCH 2: Full AudioContext bypass ===
// Chrome blocks AudioContext without user gesture.
// The App3D awaits audioContext.state === 'running' via statechange event.
// We patch resume() to: resolve immediately + fake state=running + dispatch statechange.
const audioPatch = `
(function(){
  var AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) { console.warn('[PATCH] No AudioContext found'); return; }
  
  var origResume = AC.prototype.resume;
  
  AC.prototype.resume = function(){
    var self = this;
    // Try to actually resume (may stay suspended due to autoplay policy)
    try{ origResume.call(this); }catch(e){}
    
    // Fake the state to 'running' immediately so app doesn't wait
    try{
      Object.defineProperty(self, 'state', {
        get: function(){ return 'running'; },
        configurable: true
      });
    }catch(e){}
    
    // Dispatch statechange so any waiting listeners unblock
    setTimeout(function(){
      try{
        var evt = new Event('statechange');
        self.dispatchEvent(evt);
      }catch(e){}
    }, 0);
    
    console.log('[PATCH] AudioContext.resume() bypassed — state forced to running');
    return Promise.resolve();
  };
  
  console.log('[PATCH] AudioContext patched for autoplay policy bypass');
})();

window.onerror=function(m,s,l,c,e){console.error("[GLOBAL ERROR]",m,s,l,e&&e.stack);};
window.onunhandledrejection=function(e){console.error("[REJECTION]",e.reason&&e.reason.stack||e.reason);};
`;

// Insert before main IIFE
const iifeIdx = patched.lastIndexOf('(async t=>{');
patched = patched.substring(0, iifeIdx) + audioPatch + patched.substring(iifeIdx);

fs.writeFileSync('js/index-2eb69c09.js', patched);
console.log('Patch OK. AudioContext state forced to running + statechange dispatched.');
console.log('Size:', patched.length, 'bytes');
