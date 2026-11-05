// hand.js - MediaPipe logic, pinch & depth
let handLandmarker = null;
let filesetReady = false;

function log(msg, type=''){
  const el = document.getElementById('debugLog');
  if(!el) return;
  const div = document.createElement('div');
  if(type) div.className = type;
  div.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  console.log(msg);
}

function dist(a,b){
  return Math.hypot(a.x-b.x, a.y-b.y, (a.z||0)-(b.z||0));
}

export async function initHandAI(onProgress){
  try{
    onProgress && onProgress('Loading vision wasm...');
    const { FilesetResolver, HandLandmarker } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_bundle.mjs');
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    onProgress && onProgress('Downloading hand model...');
    handLandmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions:{
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      numHands:1,
      runningMode:"VIDEO",
      minHandDetectionConfidence:0.6,
      minHandPresenceConfidence:0.6,
      minTrackingConfidence:0.6
    });
    filesetReady = true;
    log('Hand AI ready <span class="ok">OK</span>');
    return true;
  }catch(e){
    log('Hand AI gagal: '+e.message+' <span class="err">ERR</span>', 'err');
    console.error(e);
    return false;
  }
}

export function isAIReady(){ return !!handLandmarker; }

export function startDetection(video, callbacks){
  // callbacks: onNoHand, onHand, onPinchStart, onPinchMove, onPinchEnd
  let lastVideoTime = -1;
  let isGrabbing = false;
  let grabStartHandSize = 1, grabStartScale = 1, grabStartZ = 0;
  let smoothPinch = 0.1;
  let targetScale = 1, targetZ = 0;

  function loop(){
    if(!video || video.paused || video.ended) { requestAnimationFrame(loop); return; }
    if(video.currentTime !== lastVideoTime && handLandmarker){
      lastVideoTime = video.currentTime;
      try{
        const result = handLandmarker.detectForVideo(video, Date.now());
        if(!result.landmarks || result.landmarks.length===0){
          if(isGrabbing){ // lepas karena hilang
            isGrabbing = false;
            callbacks.onPinchEnd && callbacks.onPinchEnd();
          }
          callbacks.onNoHand && callbacks.onNoHand();
        }else{
          const lm = result.landmarks[0];
          const thumbTip = lm[4], indexTip = lm[8], wrist = lm[0], middleTip = lm[12];
          const pinchDist = dist(thumbTip, indexTip);
          const handSize = dist(wrist, middleTip);
          smoothPinch = smoothPinch*0.65 + pinchDist*0.35;
          const grabbingNow = smoothPinch < 0.05;

          if(grabbingNow && !isGrabbing){
            isGrabbing = true;
            grabStartHandSize = handSize;
            grabStartScale = callbacks.getCurrentScale ? callbacks.getCurrentScale() : 1;
            grabStartZ = callbacks.getCurrentZ ? callbacks.getCurrentZ() : 0;
            callbacks.onPinchStart && callbacks.onPinchStart(handSize);
          }else if(!grabbingNow && isGrabbing){
            isGrabbing = false;
            callbacks.onPinchEnd && callbacks.onPinchEnd();
          }

          if(isGrabbing){
            const ratio = handSize / (grabStartHandSize || 0.1);
            let newScale = grabStartScale * ratio;
            newScale = Math.min(3, Math.max(0.25, newScale));
            let newZ = grabStartZ + (ratio-1)*3.5;
            newZ = Math.min(2.5, Math.max(-3.5, newZ));
            targetScale = newScale; targetZ = newZ;
            callbacks.onPinchMove && callbacks.onPinchMove({scale:newScale, z:newZ, ratio, handSize, pinchDist:smoothPinch});
          }else{
            callbacks.onHand && callbacks.onHand({handSize, pinchDist:smoothPinch});
          }
        }
      }catch(e){
        log('detect error: '+e.message,'err');
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
