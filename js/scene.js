// scene.js FINAL HYBRID v4 - support melar bebas arah X/Y/Z
import * as THREE from 'three';

export let cube;
export let targetScale = new THREE.Vector3(1,1,1);
export let targetPos = {x:0, y:0.3, z:0};
export let targetRot = {x:0, y:0, z:0};
export let currentMode = 'idle'; // idle | grab | stretch

let boxMat, coreMat, ringMat, ring, scene, camera, renderer;
let baseScale = new THREE.Vector3(1,1,1);

export function initScene(canvas){
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x06070d, 5, 15);
  scene.background = new THREE.Color(0x06070d);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.set(0,1.0,4.5);

  const ambient = new THREE.AmbientLight(0xffffff,0.55);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff,1.1);
  dir.position.set(2,4,3);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024,1024);
  scene.add(dir);
  const fill = new THREE.PointLight(0x8b5cff,0.9,12);
  fill.position.set(-2,2,-2);
  scene.add(fill);
  const fill2 = new THREE.PointLight(0xff8af0,0.6,10);
  fill2.position.set(2, -1, 2);
  scene.add(fill2);

  // ground
  const groundGeo = new THREE.PlaneGeometry(30,30);
  const groundMat = new THREE.MeshStandardMaterial({color:0x12121a, roughness:0.92, metalness:0.05});
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.position.y = -1.4;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(30,30,0x222233,0x12121a);
  grid.position.y = -1.39;
  scene.add(grid);

  // KUBUS HOLOGRAM
  const boxGeo = new THREE.BoxGeometry(1,1,1,2,2,2);
  boxMat = new THREE.MeshStandardMaterial({
    color:0x7dd3fc, 
    emissive:0x0ea5e9, 
    emissiveIntensity:0.35,
    roughness:0.2, 
    metalness:0.25, 
    transparent:true, 
    opacity:0.95,
    wireframe:false
  });
  cube = new THREE.Mesh(boxGeo, boxMat);
  cube.castShadow = true;
  cube.position.set(0,0.3,0);
  scene.add(cube);

  // wireframe overlay biar makin hologram
  const wireGeo = new THREE.EdgesGeometry(boxGeo);
  const wireMat = new THREE.LineBasicMaterial({color:0x5ac8ff, transparent:true, opacity:0.5});
  const wire = new THREE.LineSegments(wireGeo, wireMat);
  cube.add(wire);
  cube.userData.wireMat = wireMat;

  // inner core
  const coreGeo = new THREE.IcosahedronGeometry(0.28,2);
  coreMat = new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0});
  const core = new THREE.Mesh(coreGeo, coreMat);
  cube.add(core);

  // ring bawah
  const ringGeo = new THREE.TorusGeometry(0.9,0.025,8,50);
  ringMat = new THREE.MeshBasicMaterial({color:0x5ac8ff, transparent:true, opacity:0.55});
  ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI/2;
  ring.position.y = -1.3;
  scene.add(ring);

  // glow sphere pas grab
  const glowGeo = new THREE.SphereGeometry(0.14,16,16);
  const glowMat = new THREE.MeshBasicMaterial({color:0x5ac8ff, transparent:true, opacity:0});
  const glow = new THREE.Mesh(glowGeo, glowMat);
  scene.add(glow);

  cube.userData.coreMat = coreMat;
  cube.userData.boxMat = boxMat;
  cube.userData.ring = ring;
  cube.userData.ringMat = ringMat;
  cube.userData.glow = glow;
  cube.userData.glowMat = glowMat;

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
  return {scene, camera, renderer};
}

function animate(){
  requestAnimationFrame(animate);
  if(!cube) return;

  // lerp posisi
  cube.position.x += (targetPos.x - cube.position.x)*0.20;
  cube.position.y += (targetPos.y - cube.position.y)*0.20;
  cube.position.z += (targetPos.z - cube.position.z)*0.20;

  // lerp scale bebas arah (Vector3)
  cube.scale.x += (targetScale.x - cube.scale.x)*0.20;
  cube.scale.y += (targetScale.y - cube.scale.y)*0.20;
  cube.scale.z += (targetScale.z - cube.scale.z)*0.20;

  // lerp rotasi
  cube.rotation.x += (targetRot.x - cube.rotation.x)*0.15;
  cube.rotation.y += (targetRot.y - cube.rotation.y)*0.15;
  cube.rotation.z += (targetRot.z - cube.rotation.z)*0.15;

  // idle animation kalau tidak grab
  if(currentMode === 'idle'){
    cube.rotation.y += 0.006;
    cube.position.y = targetPos.y + Math.sin(Date.now()*0.0012)*0.04;
  }

  const boxMat = cube.userData.boxMat;
  const coreMat = cube.userData.coreMat;
  const ring = cube.userData.ring;
  const ringMat = cube.userData.ringMat;
  const glowMat = cube.userData.glowMat;
  const wireMat = cube.userData.wireMat;
  const glow = cube.userData.glow;

  // update glow position
  glow.position.copy(cube.position);

  // efek visual berdasarkan mode & scale
  const avgScale = (cube.scale.x + cube.scale.y + cube.scale.z)/3;
  
  if(currentMode === 'stretch'){
    // mode melar bebas arah - lebih terang, wireframe lebih jelas
    boxMat.emissiveIntensity = 0.8;
    boxMat.opacity = 0.9;
    coreMat.opacity = 0.7;
    ringMat.opacity = 0.9;
    wireMat.opacity = 0.9;
    glowMat.opacity = 0.8;
    glow.scale.setScalar(1.5);
    ring.scale.setScalar(1 + (avgScale-1)*0.5 + 0.3);
    // warna berubah ke pink saat stretch
    boxMat.color.setHSL(0.85, 0.8, 0.65);
  } else if(currentMode === 'grab'){
    boxMat.emissiveIntensity = 0.55;
    boxMat.opacity = 0.95;
    coreMat.opacity = 0.4;
    ringMat.opacity = 0.7;
    wireMat.opacity = 0.7;
    glowMat.opacity = 0.6;
    boxMat.color.setHSL(0.55, 0.8, 0.65);
  } else {
    // idle
    boxMat.emissiveIntensity += (0.35 - boxMat.emissiveIntensity)*0.1;
    boxMat.opacity += (0.95 - boxMat.opacity)*0.1;
    coreMat.opacity += (0 - coreMat.opacity)*0.1;
    ringMat.opacity += (0.55 - ringMat.opacity)*0.1;
    wireMat.opacity += (0.5 - wireMat.opacity)*0.1;
    glowMat.opacity += (0 - glowMat.opacity)*0.1;
    boxMat.color.lerp(new THREE.Color(0x7dd3fc), 0.08);
    ring.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
  }

  // efek portal kalau jauh / kecil banget
  if(avgScale < 0.45){
    const t = 1 - avgScale/0.45;
    boxMat.opacity = 0.95 - t*0.6;
    coreMat.opacity = t*0.9;
    scene.background.lerp(new THREE.Color(0x1a0a2e), 0.05);
  } else {
    scene.background.lerp(new THREE.Color(0x06070d), 0.08);
  }

  renderer.render(scene, camera);
}

export function setGrabState(mode){ 
  currentMode = mode; // 'idle' | 'grab' | 'stretch'
}

export function setTarget(scaleVec3, pos, rot){
  // scaleVec3 bisa number (uniform) atau Vector3 / object {x,y,z}
  if(typeof scaleVec3 === 'number'){
    targetScale.set(scaleVec3, scaleVec3, scaleVec3);
  } else if(scaleVec3.isVector3){
    targetScale.copy(scaleVec3);
  } else if(scaleVec3 && typeof scaleVec3.x === 'number'){
    targetScale.set(scaleVec3.x, scaleVec3.y, scaleVec3.z);
  }
  
  if(pos){
    targetPos.x = pos.x;
    targetPos.y = pos.y;
    targetPos.z = pos.z;
  }
  if(rot){
    targetRot.x = rot.x ?? targetRot.x;
    targetRot.y = rot.y ?? targetRot.y;
    targetRot.z = rot.z ?? targetRot.z;
  }
}

export function setTargetPosOnly(pos){
  targetPos.x = pos.x;
  targetPos.y = pos.y;
  targetPos.z = pos.z;
}

export function getTarget(){
  return {
    scale: targetScale.clone(),
    pos: {...targetPos},
    rot: {...targetRot},
    mode: currentMode
  };
}
