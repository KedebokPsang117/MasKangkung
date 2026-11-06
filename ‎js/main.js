/**
 * main.js - Inisialisasi kamera, hand tracking, Three.js, dan main loop
 */

// Global state
let scene, camera, renderer;
let videoElement, canvas, ctx;
let hands;
let lastFrameTime = 0;
let frameCount = 0;
let fpsUpdateTime = 0;

// Initialize everything
async function init() {
    // Setup DOM elements
    videoElement = document.getElementById('camera-feed');
    canvas = document.getElementById('overlay-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Setup Three.js
    setupThreeJS();
    
    // Setup MediaPipe Hands
    await setupHandTracking();
    
    // Setup game objects
    DimensionalBlock.init(scene);
    DimensionalThreads.init(scene);
    FusionSystem.init();
    
    // Hide loading
    document.getElementById('loading').classList.add('hidden');
    
    // Start render loop
    requestAnimationFrame(mainLoop);
}

function setupThreeJS() {
    scene = new THREE.Scene();
    
    // Camera untuk Three.js (orthographic untuk overlay 2D-like)
    const width = canvas.width;
    const height = canvas.height;
    camera = new THREE.OrthographicCamera(
        -width / 2, width / 2,
        height / 2, -height / 2,
        0.1, 1000
    );
    camera.position.z = 500;
    
    // Renderer dengan transparent background
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // Transparent
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x00d4ff, 1, 1000);
    pointLight.position.set(0, 0, 300);
    scene.add(pointLight);
}

async function setupHandTracking() {
    return new Promise((resolve) => {
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,  // 0=fast, 1=balanced
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        hands.onResults(onHandResults);
        
        // Start camera
        const cameraUtils = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 640,
            height: 480,
            facingMode: 'user'  // Front camera
        });
        
        cameraUtils.start().then(() => {
            resolve();
        }).catch((err) => {
            console.error('Camera error:', err);
            showWarning('Tidak bisa akses kamera. Pastikan izin kamera aktif.');
            resolve(); // Still resolve to not block
        });
    });
}

function onHandResults(results) {
    // Process hand landmarks
    HandTracker.processLandmarks(results);
}

function mainLoop(timestamp) {
    // Calculate delta time
    const deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;
    
    // FPS counter
    frameCount++;
    if (timestamp - fpsUpdateTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (timestamp - fpsUpdateTime));
        document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
        frameCount = 0;
        fpsUpdateTime = timestamp;
    }
    
    // Update game state
    updateGame(deltaTime);
    
    // Render Three.js
    renderer.render(scene, camera);
    
    // Continue loop
    requestAnimationFrame(mainLoop);
}

function updateGame(deltaTime) {
    const hand = HandTracker;
    const block = DimensionalBlock;
    const threads = DimensionalThreads;
    const fusion = FusionSystem;
    
    if (!hand.isHandDetected) {
        // Tangan tidak terdeteksi
        if (block.isVisible && !block.isFloating) {
            // Balok tetap ada <0.5s, lalu mulai snap back
            block.startSnapBack();
        }
        block.update(hand, deltaTime);
        threads.hide();
        fusion.deactivate();
        document.getElementById('block-state').textContent = 'Balok: -';
        return;
    }
    
    // Update fusion system first (mungkin mengubah state)
    fusion.update(hand, block, threads, deltaTime);
    
    // Handle grab/spawn
    if (hand.isGrabbing()) {
        if (!block.isVisible) {
            // Spawn balok di palm
            const palmPos = hand.getPalmCenter(canvas.width, canvas.height);
            if (palmPos) {
                // Convert ke Three.js coordinates
                const threePos = screenToThree(palmPos);
                block.spawn(threePos);
            }
        } else {
            block.isGrabbed = true;
            block.isSnappingBack = false;
            
            // Update posisi balok mengikuti palm
            const palmPos = hand.getPalmCenter(canvas.width, canvas.height);
            if (palmPos) {
                const threePos = screenToThree(palmPos);
                block.group.position.lerp(threePos, 0.3); // Smooth follow
            }
            
            // Scale dari jarak jempol-tengah
            const scaleValue = hand.thumbMiddleDistance / 0.3; // normalize
            block.setScale(Math.min(Math.max(scaleValue, 0), 1));
            
            // Directional stretch berdasarkan posisi tangan relatif ke balok
            // (simplified untuk MVP)
        }
    } else {
        // Tidak grab
        if (block.isGrabbed) {
            // Baru saja lepas - snap back
            block.startSnapBack();
        }
    }
    
    // Update block
    block.update(hand, deltaTime);
    
    // Update threads
    if (block.isVisible && hand.isHandDetected) {
        const fingertips = hand.getFingertipPositions(canvas.width, canvas.height);
        const corners = block.getCorners();
        
        // Convert fingertips ke Three.js space
        const threeFingertips = fingertips.map(fp => 
            fp ? screenToThree(fp) : null
        );
        
        threads.update(threeFingertips, corners, hand);
        
        // Set vibration saat tension tinggi
        const maxTension = Math.max(...threads.threadStates.map(t => t.tension));
        if (maxTension > 0.9) {
            threads.setVibration(2);
            // Haptic feedback
            if (navigator.vibrate && maxTension > 0.95) {
                navigator.vibrate(50);
            }
        } else {
            threads.setVibration(0);
        }
    }
    
    // Update fusion mode effects on block
    if (fusion.fusionActive) {
        // Di mode fusi, balok follow kelingking
        const pinkyPos = hand.getLandmarkPosition(20, canvas.width, canvas.height);
        if (pinkyPos) {
            const threePos = screenToThree(pinkyPos);
            block.group.position.lerp(threePos, 0.2);
        }
    }
    
    // Update UI
    document.getElementById('block-state').textContent = `Balok: ${block.getState()}`;
}

// Convert screen coordinates ke Three.js coordinates
function screenToThree(screenPos) {
    return new THREE.Vector3(
        screenPos.x - canvas.width / 2,
        -(screenPos.y - canvas.height / 2), // Flip Y
        screenPos.z || 0
    );
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    if (renderer) {
        renderer.setSize(canvas.width, canvas.height);
    }
    
    if (camera) {
        const width = canvas.width;
        const height = canvas.height;
        camera.left = -width / 2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = -height / 2;
        camera.updateProjectionMatrix();
    }
}

function showWarning(message) {
    const warning = document.getElementById('warning');
    const text = document.getElementById('warning-text');
    text.textContent = message;
    warning.classList.remove('hidden');
    
    setTimeout(() => {
        warning.classList.add('hidden');
    }, 5000);
}

// Start when DOM ready
document.addEventListener('DOMContentLoaded', init);
