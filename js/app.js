// app.js - UI, kamera, glue
import { initScene, setTarget, setGrabState, getTarget } from './scene.js';
import { initHandAI, isAIReady, startDetection } from './hand.js';

const canvas = document.getElementById('c');
const video = document.getElementById('video');
const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const debugBtn = document.getElementById('debugBtn');
const depthFill = document.getElementById('depthFill');
const debugLog = document.getElementById('debugLog');

let cameraStream = null;
let aiReady = false;

function log(msg, type=''){
  const div = document.createElement('div');
  if(type) div.className = type;
  div.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}`;
  debugLog.appendChild(div);
  debugLog.scrollTop = debugLog.scrollHeight;
  console.log(msg);
}

function setStatus(text, cls){
  statusText.textContent = text;
  dot.className = 'dot ' + (cls||'');
}

// INIT 3D
initScene(canvas);
log('Three.js scene OK', 'ok');

// INIT AI in background (jangan block tombol)
(async()=>{
  setStatus('Memuat AI tracking...', 'load');
  startBtn.disabled = true;
  startBtn.textContent = 'Memuat AI...';
  const ok = await initHandAI((t)=>setStatus(t,'load'));
  aiReady = ok;
  if(ok){
    setStatus('AI siap, klik tombol untuk kamera', 'ok');
    startBtn.disabled = false;
    startBtn.textContent = 'Aktifkan Kamera & Mulai';
    log('AI ready, tombol aktif', 'ok');
  }else{
    setStatus('AI gagal load, coba kamera dulu', 'err');
    startBtn.disabled = false;
    startBtn.textContent = 'Coba Aktifkan Kamera (tanpa AI)';
    log('AI gagal, tapi lanjut kamera', 'err');
  }
})();

// DEBUG toggle
debugBtn.onclick = ()=>{
  debugLog.style.display = debugLog.style.display==='none' || !debugLog.style.display ? 'block' : 'none';
};

// === FIX UTAMA: KAMERA HARUS LANGSUNG DI GESTURE KLIK ===
startBtn.addEventListener('click', async (e)=>{
  e.preventDefault();
  e.stopPropagation();
  log('Tombol klik - mulai kamera', 'ok');
  
  // 1. Langsung minta kamera dulu (harus dalam event click biar permission muncul)
  try{
    setStatus('Meminta izin kamera...', 'load');
    startBtn.textContent = 'Meminta izin...';
    log('Request getUserMedia...');

    const stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:'user',
        width:{ideal:640},
        height:{ideal:480}
      },
      audio:false
    });
    
    cameraStream = stream;
    video.srcObject = stream;
    video.classList.add('active');
    await video.play();
    log('Kamera stream OK', 'ok');
    setStatus('Kamera aktif! Cari tangan...', 'ok');
    startBtn.style.display = 'none';

    // 2. Jika AI belum ready, coba load lagi
    if(!aiReady){
      log('Coba load AI lagi...');
      aiReady = await initHandAI((t)=>setStatus(t,'load'));
    }

    if(!aiReady){
      setStatus('Kamera jalan, tapi AI tracking belum siap - cek koneksi', 'err');
      log('Kamera jalan tanpa AI', 'err');
      return;
    }

    // 3. Mulai deteksi
    log('Mulai hand detection loop', 'ok');
    startDetection(video, {
      getCurrentScale: ()=>getTarget().scale,
      getCurrentZ: ()=>getTarget().z,
      onNoHand: ()=>{
        setStatus('Tangan tidak terlihat - dekatkan tangan', '');
        setGrabState(false);
      },
      onHand: ({handSize})=>{
        setStatus('Tangan terdeteksi - cubit untuk grab', 'ok');
        depthFill.style.height = Math.min(90, handSize*180)+'%';
        setGrabState(false);
      },
      onPinchStart: ()=>{
        setStatus('TER-GRAB! Tarik maju/mundur', 'grab');
        setGrabState(true);
        if(navigator.vibrate) navigator.vibrate(40);
        log('GRAB start', 'ok');
      },
      onPinchMove: ({scale,z})=>{
        setTarget(scale,z);
        const pct = ((scale-0.25)/(3-0.25))*100;
        depthFill.style.height = pct+'%';
        setStatus(`Menarik: ${scale.toFixed(2)}x | Z:${z.toFixed(2)}`, 'grab');
        setGrabState(true);
      },
      onPinchEnd: ()=>{
        setStatus('Lepas - cubit lagi untuk tarik', 'ok');
        setGrabState(false);
        log('GRAB end');
      }
    });

  }catch(err){
    console.error(err);
    log('Kamera ERROR: '+err.name+' - '+err.message, 'err');
    let msg = 'Gagal kamera: '+err.message;
    if(err.name==='NotAllowedError') msg = 'Izin kamera ditolak. Buka pengaturan browser > Izin > Kamera > Allow untuk site ini.';
    if(err.name==='NotFoundError') msg = 'Kamera tidak ditemukan.';
    if(err.name==='NotReadableError') msg = 'Kamera dipakai aplikasi lain. Tutup aplikasi kamera lain.';
    if(location.protocol!=='https:' && location.hostname!=='localhost') msg = 'Harus HTTPS! Pastikan link github.io pakai https://';
    setStatus(msg, 'err');
    startBtn.disabled = false;
    startBtn.textContent = 'Coba Lagi Aktifkan Kamera';
    debugLog.style.display = 'block';
  }
}, {passive:false});

// fallback: tap anywhere to retry if button stuck
canvas.addEventListener('click', ()=>{
  if(!cameraStream){
    log('Canvas tap - belum ada stream, coba klik tombol');
  }
});
