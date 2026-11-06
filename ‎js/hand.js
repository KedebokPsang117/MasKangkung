/**
 * hand.js - Membaca 21 landmark tangan dan mendeteksi gestur
 * Landmark indices:
 * 0: WRIST, 1-4: THUMB, 5-8: INDEX, 9-12: MIDDLE, 13-16: RING, 17-20: PINKY
 */

const HandTracker = {
    landmarks: null,
    isHandDetected: false,
    lastDetectedTime: 0,
    handLostThreshold: 500, // ms - balok tetap ada <0.5s setelah tangan hilang
    
    // Gesture states
    fistPercentage: 0,       // 0-100, berapa persen tangan terkepal
    pinkyBendAngle: 0,       // sudut tekukan kelingking
    pinkyThumbTouch: false,  // apakah kelingking menyentuh jempol
    thumbMiddleDistance: 0,  // jarak jempol ke jari tengah (untuk scale)
    
    // Thresholds
    FIST_GRAB_THRESHOLD: 70,      // 70% kepalan = grab
    PINKY_BEND_THRESHOLD: 60,     // >60 derajat = tension mode
    PINKY_THUMB_TOUCH_DIST: 0.05, // jarak normalized untuk sentuhan
    
    processLandmarks(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.landmarks = results.multiHandLandmarks[0];
            this.isHandDetected = true;
            this.lastDetectedTime = Date.now();
            this.calculateGestures();
        } else {
            // Tangan tidak terdeteksi, tapi jangan langsung hilang
            if (Date.now() - this.lastDetectedTime > this.handLostThreshold) {
                this.isHandDetected = false;
                this.landmarks = null;
            }
        }
    },
    
    calculateGestures() {
        if (!this.landmarks) return;
        
        const lm = this.landmarks;
        
        // 1. Fist percentage - hitung berapa persen jari terkepal
        this.fistPercentage = this.calculateFistPercentage(lm);
        
        // 2. Pinky bend angle
        this.pinkyBendAngle = this.calculatePinkyBend(lm);
        
        // 3. Pinky-thumb touch
        const pinkyTip = lm[20];
        const thumbTip = lm[4];
        const dist = this.normalizedDistance(pinkyTip, thumbTip);
        this.pinkyThumbTouch = dist < this.PINKY_THUMB_TOUCH_DIST;
        
        // 4. Thumb-middle distance (untuk scale)
        const middleTip = lm[12];
        this.thumbMiddleDistance = this.normalizedDistance(thumbTip, middleTip);
    },
    
    calculateFistPercentage(lm) {
        // Hitung curl untuk setiap jari (kecuali jempol)
        // Curl = seberapa dekat tip jari ke wrist relatif terhadap panjang jari
        const wrist = lm[0];
        let totalCurl = 0;
        let fingerCount = 0;
        
        // Index: 5(MCP), 8(TIP)
        totalCurl += this.fingerCurl(lm[5], lm[8], wrist);
        fingerCount++;
        
        // Middle: 9(MCP), 12(TIP)
        totalCurl += this.fingerCurl(lm[9], lm[12], wrist);
        fingerCount++;
        
        // Ring: 13(MCP), 16(TIP)
        totalCurl += this.fingerCurl(lm[13], lm[16], wrist);
        fingerCount++;
        
        // Pinky: 17(MCP), 20(TIP)
        totalCurl += this.fingerCurl(lm[17], lm[20], wrist);
        fingerCount++;
        
        return (totalCurl / fingerCount) * 100;
    },
    
    fingerCurl(mcp, tip, wrist) {
        // Semakin dekat tip ke wrist relatif terhadap MCP, semakin curled
        const mcpToWrist = this.normalizedDistance(mcp, wrist);
        const tipToWrist = this.normalizedDistance(tip, wrist);
        
        // Kalau tip lebih dekat ke wrist dari MCP, jari curled
        if (mcpToWrist === 0) return 1;
        const curl = 1 - (tipToWrist / mcpToWrist);
        return Math.max(0, Math.min(1, curl));
    },
    
    calculatePinkyBend(lm) {
        // Hitung sudut di PIP joint pinky (landmark 18)
        // Antara MCP(17) -> PIP(18) -> DIP(19)
        const mcp = lm[17];
        const pip = lm[18];
        const dip = lm[19];
        
        const v1 = { x: mcp.x - pip.x, y: mcp.y - pip.y, z: mcp.z - pip.z };
        const v2 = { x: dip.x - pip.x, y: dip.y - pip.y, z: dip.z - pip.z };
        
        const angle = this.angleBetweenVectors(v1, v2);
        return 180 - angle; // 0 = lurus, 180 = fully bent
    },
    
    angleBetweenVectors(v1, v2) {
        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
        
        if (mag1 === 0 || mag2 === 0) return 0;
        
        const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        return Math.acos(cosAngle) * (180 / Math.PI);
    },
    
    normalizedDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    
    // Get 3D position dari landmark (untuk rendering)
    getLandmarkPosition(index, canvasWidth, canvasHeight) {
        if (!this.landmarks) return null;
        const lm = this.landmarks[index];
        return {
            x: (1 - lm.x) * canvasWidth,  // Mirror X
            y: lm.y * canvasHeight,
            z: lm.z * canvasWidth || 0    // Z relatif, scale by width
        };
    },
    
    // Get posisi 5 ujung jari untuk benang
    getFingertipPositions(canvasWidth, canvasHeight) {
        const tips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
        return tips.map(i => this.getLandmarkPosition(i, canvasWidth, canvasHeight));
    },
    
    // Get posisi palm center (untuk spawn balok)
    getPalmCenter(canvasWidth, canvasHeight) {
        if (!this.landmarks) return null;
        // Palm center ≈ rata-rata wrist dan middle MCP
        const wrist = this.landmarks[0];
        const middleMcp = this.landmarks[9];
        
        const cx = (wrist.x + middleMcp.x) / 2;
        const cy = (wrist.y + middleMcp.y) / 2;
        const cz = ((wrist.z || 0) + (middleMcp.z || 0)) / 2;
        
        return {
            x: (1 - cx) * canvasWidth,
            y: cy * canvasHeight,
            z: cz * canvasWidth || 0
        };
    },
    
    isGrabbing() {
        return this.fistPercentage >= this.FIST_GRAB_THRESHOLD;
    },
    
    isTensionMode() {
        return this.pinkyBendAngle > this.PINKY_BEND_THRESHOLD;
    },
    
    isFusionMode() {
        return this.pinkyThumbTouch;
    }
};
