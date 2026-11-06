/**
 * threads.js - 5 benang elastis dari ujung jari ke balok
 * Bukan jaring, tapi 5 utas cahaya individual
 */

const DimensionalThreads = {
    lines: [],
    isVisible: false,
    
    // Physics
    sagAmount: 0.3,        // seberapa melendut benang
    elasticity: 0.85,      // elastisitas
    vibrationAmount: 0,    // getaran saat ditarik mentok
    
    // State per benang
    threadStates: [
        { tension: 0, slack: 0 },  // Thumb
        { tension: 0, slack: 0 },  // Index
        { tension: 0, slack: 0 },  // Middle
        { tension: 0, slack: 0 },  // Ring
        { tension: 0, slack: 0 }   // Pinky
    ],
    
    THREAD_COLORS: [
        0x00ff88,  // Thumb - hijau
        0x00ccff,  // Index - biru
        0xff00ff,  // Middle - magenta
        0xffaa00,  // Ring - oranye
        0xff0066   // Pinky - merah muda
    ],
    
    init(scene) {
        // Buat 5 garis dengan banyak segmen untuk efek melengkung
        const segments = 20; // titik per benang untuk kurva
        
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array((segments + 1) * 3);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const material = new THREE.LineBasicMaterial({
                color: this.THREAD_COLORS[i],
                transparent: true,
                opacity: 0.8,
                linewidth: 2
            });
            
            const line = new THREE.Line(geometry, material);
            line.visible = false;
            scene.add(line);
            this.lines.push(line);
        }
    },
    
    update(fingertipPositions, blockCorners, handTracker) {
        if (!handTracker.isHandDetected || !DimensionalBlock.isVisible) {
            this.hide();
            return;
        }
        
        this.isVisible = true;
        
        for (let i = 0; i < 5; i++) {
            const fingertip = fingertipPositions[i];
            const corner = blockCorners[i];
            
            if (!fingertip || !corner) {
                this.lines[i].visible = false;
                continue;
            }
            
            this.lines[i].visible = true;
            this.updateThread(i, fingertip, corner, handTracker);
        }
    },
    
    updateThread(index, start, end, handTracker) {
        const line = this.lines[index];
        const positions = line.geometry.attributes.position.array;
        const segments = positions.length / 3 - 1;
        
        // Hitung distance untuk tension
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dz = end.z - start.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Tension berdasarkan jarak
        const maxDistance = 300; // pixel
        const tension = Math.min(distance / maxDistance, 1);
        this.threadStates[index].tension = tension;
        
        // Saat jari ditekuk, benang mengendur
        let slack = 0;
        if (handTracker.landmarks) {
            const fingerIndices = [[1, 4], [5, 8], [9, 12], [13, 16], [17, 20]];
            const [mcpIdx, tipIdx] = fingerIndices[index];
            const mcp = handTracker.landmarks[mcpIdx];
            const tip = handTracker.landmarks[tipIdx];
            
            // Kalau tip dekat ke MCP, jari sedang ditekuk
            const curl = handTracker.normalizedDistance(mcp, tip);
            if (curl < 0.05) {
                slack = 0.5; // benang mengendur
            }
        }
        this.threadStates[index].slack = slack;
        
        // Generate kurva dengan sagging
        const sag = this.sagAmount * (1 - tension) * (1 + slack);
        const vibration = this.vibrationAmount * Math.sin(Date.now() * 0.05 + index);
        
        for (let j = 0; j <= segments; j++) {
            const t = j / segments;
            
            // Interpolasi posisi
            let x = start.x + (end.x - start.x) * t;
            let y = start.y + (end.y - start.y) * t;
            let z = start.z + (end.z - start.z) * t;
            
            // Tambahkan sag (melendut ke bawah)
            const sagCurve = Math.sin(t * Math.PI); // kurva parabola
            y += sag * sagCurve * 50; // scale sag
            
            // Tambahkan getaran saat tension tinggi
            if (tension > 0.8) {
                x += vibration * sagCurve;
                y += vibration * sagCurve * 0.5;
            }
            
            positions[j * 3] = x;
            positions[j * 3 + 1] = y;
            positions[j * 3 + 2] = z;
        }
        
        line.geometry.attributes.position.needsUpdate = true;
        
        // Update visual berdasarkan tension
        // Semakin tegang, semakin tipis dan terang
        line.material.opacity = 0.4 + tension * 0.6;
        
        if (tension > 0.9) {
            // Sangat tegang - lebih terang
            line.material.color.setHex(0xffffff);
        } else {
            line.material.color.setHex(this.THREAD_COLORS[index]);
        }
    },
    
    // Set getaran saat benang ditarik mentok
    setVibration(amount) {
        this.vibrationAmount = amount;
    },
    
    // Fusion mode - semua benang jadi emas
    setFusionMode(active) {
        for (let i = 0; i < 5; i++) {
            if (active) {
                this.lines[i].material.color.setHex(0xffd700); // Gold
                this.lines[i].material.opacity = 1.0;
            }
        }
    },
    
    hide() {
        this.isVisible = false;
        for (let line of this.lines) {
            line.visible = false;
        }
    }
};
