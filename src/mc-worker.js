/* mc-worker — message adapter for the Blob Web Worker. Runs after mc-kernels.js in the same worker scope.
 * Embedded in feasibility-pipeline.html by `node tools/build.mjs`; never executed on the main thread.
 * Receives aggregate payloads only (no raw patient rows, protocol text or credentials). */
(function () {
'use strict';
const { simulateSitesCore, simulateFootprintCore, sitesNeededCore, sensitivityCore } = self.MC_KERNELS;
self.postMessage({type:'ready'});
self.onmessage=e=>{
  const {runId,inputFingerprint,type,payload}=e.data;
  let last=0;
  const emit=(phase,completed,total)=>{const now=performance.now();if(now-last>=60 || completed===total){last=now;self.postMessage({type:'progress',runId,inputFingerprint,phase,completed,total});}};
  try {
    let result;
    if(type==='search')result=sitesNeededCore(payload.params,payload.fpp,payload.fp,(d,t,p)=>emit(p,d,t));
    else if(type==='sensitivity')result=sensitivityCore(payload,(d,t,p)=>emit(p,d,t));
    else {
      result={sim:null,portfolioSim:null,simA:null,simB:null};
      if(payload.sites){result.sim=simulateSitesCore(payload.params,payload.sites,null,(d,t,p)=>emit('All sites · '+p,d,t));
        if(payload.selected.length)result.portfolioSim=simulateSitesCore(payload.params,payload.sites,new Set(payload.selected),(d,t,p)=>emit('Selected sites · '+p,d,t));}
      if(payload.fp){if(payload.fp.totalA)result.simA=simulateFootprintCore(payload.params,payload.fpp,payload.fp.allocA,payload.fp.rowsBy,undefined,(d,t,p)=>emit('Sponsor footprint · '+p,d,t));
        result.simB=simulateFootprintCore(payload.params,payload.fpp,payload.fp.allocB,payload.fp.rowsBy,undefined,(d,t,p)=>emit('Recommended footprint · '+p,d,t));}
    }
    self.postMessage({type:'result',runId,inputFingerprint,result});
  }catch(err){self.postMessage({type:'error',runId,inputFingerprint,message:err.message || String(err)});}
};
})();
