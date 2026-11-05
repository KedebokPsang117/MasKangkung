// scene.js - Three.js scene, kubus dimensi, portal effect
import * as THREE from 'three';

export let cube, targetScale = 1, targetZ = 0, currentGrab = false;
let boxMat, coreMat, ringMat, ring, scene, camera, renderer;

export function initScene(canvas){
  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0a0f, 6, 14);
  scene.background = new THREE.Color(0x0a0a0f);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.set(0,1.2,4);

  const ambient = new THREE.AmbientLight(0xffffff,0.6);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff,1.2);
  dir.position.set(2,4,3);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024,1024);
  scene.add(dir);
  const fill = new THREE.PointLight(0x8b5cff,0.8,10);
  fill.position.set(-2,2,-2);
  scene.add(fill);

  const groundGeo = new THREE.PlaneGeometry(20,20);
  const groundMat = new THREE.MeshStandardMaterial({color:0x151520, roughness:0.9});
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.position.y = -1;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(20,20,0x222233,0x151520);
  grid.position.y = -0.99;
  scene.add(grid);

  const boxGeo = new THREE.BoxGeometry(1,1,1,4,4,4);
  boxMat = new THREE.MeshStandardMaterial({
    color:0x7dd3fc, emissive:0x0ea5e9, emissiveIntensity:0.25,
    roughness:0.3, metalness:0.2, transparent:true, opacity:1
  });
  cube = new THREE.Mesh(boxGeo, boxMat);
  cube.castShadow = true;
  cube.position.set(0,0.2,0);
  scene.add(cube);

  const coreGeo = new THREE.IcosahedronGeometry(0.35,2);
  coreMat = new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0});
  const core = new THREE.Mesh(coreGeo, coreMat);
  cube.add(core);
  cube.userData.coreMat = coreMat;
  cube.userData.boxMat = boxMat;

  const ringGeo = new THREE.TorusGeometry(0.8,0.02,8,40);
  ringMat = new THREE.MeshBasicMaterial({color:0x5ac8ff, transparent:true, opacity:0.6});
  ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI/2;
  ring.position.y = -0.9;
  scene.add(ring);
  cube.userData.ring = ring;
  cube.userData.ringMat = ringMat;

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
  cube.scale.lerp(new THREE.Vector3(targetScale,targetScale,targetScale),0.14);
  cube.position.z += (targetZ - cube.position.z)*0.14;
  cube.position.y = 0.2 + Math.sin(Date.now()*0.001)*0.05;
  cube.rotation.y += 0.005;
  if(currentGrab) cube.rotation.x += 0.012;

  const boxMat = cube.userData.boxMat;
  const coreMat = cube.userData.coreMat;
  const ring = cube.userData.ring;
  const ringMat = cube.userData.ringMat;

  if(targetScale < 0.55){
    const t = 1 - targetScale/0.55;
    boxMat.opacity = 1 - t*0.6;
    boxMat.emissiveIntensity = 0.25 + t*1.2;
    coreMat.opacity = t*0.9;
    ringMat.opacity = 0.2 + t*0.8;
    ring.scale.setScalar(0.8 + t*1.5);
  }else{
    boxMat.opacity += (1-boxMat.opacity)*0.12;
    boxMat.emissiveIntensity += (0.25-boxMat.emissiveIntensity)*0.12;
    coreMat.opacity += (0-coreMat.opacity)*0.12;
    ringMat.opacity += (0.6-ringMat.opacity)*0.12;
    ring.scale.lerp(new THREE.Vector3(1,1,1),0.12);
  }
  renderer.render(scene, camera);
}

export function setGrabState(isGrabbing){ currentGrab = isGrabbing; }
export function setTarget(s, z){ targetScale = s; targetZ = z; }
export function getTarget(){ return {scale:targetScale, z:targetZ}; }
