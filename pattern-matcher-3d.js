import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

camera.position.set(0, 0, 800);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x6496ff, 1, 1000);
pointLight.position.set(200, 200, 200);
scene.add(pointLight);

// Pattern boxes
const patternBoxes = [];
const boxSpacing = 120;
let currentPattern = '';
let patternLength = 5; // Default 5 boxes

// Particle system for expansion effects
const particleGeometry = new THREE.BufferGeometry();
const particleCount = 500;
const particlePositions = new Float32Array(particleCount * 3);
const particleVelocities = [];

for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = -10000;
    particlePositions[i * 3 + 1] = -10000;
    particlePositions[i * 3 + 2] = -10000;
    
    particleVelocities.push({
        x: 0,
        y: 0,
        z: 0,
        life: 0,
        maxLife: 1.0
    });
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

// Particle texture
const particleCanvas = document.createElement('canvas');
particleCanvas.width = 64;
particleCanvas.height = 64;
const particleCtx = particleCanvas.getContext('2d');
const particleGradient = particleCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
particleGradient.addColorStop(0, 'rgba(100, 150, 255, 1)');
particleGradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.6)');
particleGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
particleCtx.fillStyle = particleGradient;
particleCtx.fillRect(0, 0, 64, 64);
const particleTexture = new THREE.CanvasTexture(particleCanvas);

const particleMaterial = new THREE.PointsMaterial({
    color: 0x6496ff,
    size: 8,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    map: particleTexture,
    sizeAttenuation: true,
    depthWrite: false
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// Create pattern box
function createPatternBox(letter, index, total, isWildcard, isExplicitWildcard) {
    const group = new THREE.Group();
    
    // Box geometry
    const boxGeometry = new THREE.BoxGeometry(80, 80, 20);
    
    // Different colors for explicit "?" vs empty slot
    let boxColor, emissiveColor;
    if (isExplicitWildcard) {
        // Explicit "?" - softer glowy white
        boxColor = 0xEFEEEA;  // Soft off-white, easier on the eyes
        emissiveColor = 0xEFEEEA;
    } else if (isWildcard) {
        // Empty slot - softer glowy white
        boxColor = 0xEFEEE5;  // Soft off-white, easier on the eyes
        emissiveColor = 0xEFEEEA;
    } else {
        // Filled letter - use blue
        boxColor = 0x6496ff;
        emissiveColor = 0x3a5a7a;
    }
    
    const boxMaterial = new THREE.MeshStandardMaterial({
        color: boxColor,
        metalness: 0.3,
        roughness: 0.7,
        emissive: emissiveColor,
        emissiveIntensity: isExplicitWildcard ? .6 : isWildcard ? .3 : .3
    });
    
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    group.add(box);
    
      // Outline - black for wildcards, white for filled letters
      const edges = new THREE.EdgesGeometry(boxGeometry);
      const outlineColor = isWildcard ? 0x000000 : 0xffffff; // Black for wildcards, white for letters
      const outlineMaterial = new THREE.LineBasicMaterial({
          color: outlineColor,
          linewidth: 2,
          transparent: true,
          opacity: 0.8
      });
      const outline = new THREE.LineSegments(edges, outlineMaterial);
      group.add(outline);
    // Letter text on a plane
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = isExplicitWildcard ? '#6496ff' : (isWildcard ? '#FFFFFF' : '#ffffff'); // Blue for wildcards, white for letters
    ctx.font = 'bold 120px Helvetica';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Make wildcard "?" more prominent
    if (isExplicitWildcard || isWildcard) {
        ctx.shadowColor = 'rgba(100, 150, 255, 0.8)';
        ctx.shadowBlur = 20;
    }
    
    ctx.fillText(letter || '?', 128, 128);
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const planeGeometry = new THREE.PlaneGeometry(60, 60);
    const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const letterPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    letterPlane.position.z = 12;
    group.add(letterPlane);
    
    // Position
    const totalWidth = (total - 1) * boxSpacing;
    const startX = -totalWidth / 2;
    group.position.x = startX + index * boxSpacing;
    group.position.y = 0;
    
    // Animation properties
    group.userData.rotationSpeed = 0.005; // Match clue-generator speed
    group.userData.rotationDirection = Math.random() > 0.5 ? 1 : -1;
    group.userData.scale = 0;
    group.userData.targetScale = 1;
    group.userData.isWildcard = isWildcard;
    group.userData.isExplicitWildcard = isExplicitWildcard;
    
    // Add subtle floating animation for wildcards
    if (isWildcard) {
        group.userData.floatOffset = Math.random() * Math.PI * 2;
        group.userData.floatSpeed = 0.5 + Math.random() * 0.5;
    }
    
    return group;
}


// Create boxes based on pattern length
function createBoxes(length) {
    // Remove old boxes
    patternBoxes.forEach(box => {
        scene.remove(box);
    });
    patternBoxes.length = 0;
    
    // Create new boxes
    for (let i = 0; i < length; i++) {
        const char = currentPattern[i] || '';
        const letter = (char === '?' || char === '') ? '' : char;
        const isExplicitWildcard = (char === '?'); // Explicitly typed "?"
        const isEmptySlot = (char === ''); // Empty slot
        const isWildcard = isExplicitWildcard || isEmptySlot;
        const box = createPatternBox(letter, i, length, isWildcard, isExplicitWildcard);
        patternBoxes.push(box);
        scene.add(box);
    }
    
    // Trigger particle effect
    triggerParticleBurst();
}

// Particle burst effect
function triggerParticleBurst() {
    const centerX = 0;
    const centerY = 0;
    const centerZ = 0;
    
    // More particles for a more dramatic effect
    for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 4;
        const life = 0.6 + Math.random() * 0.6;
        
        particleVelocities[i] = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed,
            z: (Math.random() - 0.5) * speed * 1.5,
            life: 0,
            maxLife: life
        };
        
        const pos = i * 3;
        particlePositions[pos] = centerX;
        particlePositions[pos + 1] = centerY;
        particlePositions[pos + 2] = centerZ;
    }
    
    particleGeometry.attributes.position.needsUpdate = true;
}

// Initialize with 5 boxes
createBoxes(5);

// Input handling - get DOM elements first
const patternInput = document.getElementById('pattern-input');
const wordLengthDisplay = document.getElementById('word-length');

patternInput.addEventListener('input', (e) => {
    // Allow letters and "?" characters
    const input = e.target.value.toUpperCase().replace(/[^A-Z?]/g, '');
    patternInput.value = input;
    
    // Pattern length is the length of the input string (including ?)
    patternLength = Math.max(1, Math.min(20, Math.max(input.length, 5)));
    currentPattern = input;
    
    // Update display
    wordLengthDisplay.textContent = `Word Length: ${patternLength}`;
    
    // Update boxes
    createBoxes(patternLength);
});

patternInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchPattern();
    }
});

// Wordlist loading
const fs = require('fs');
const path = require('path');
let wordList = [];
let wordListLoaded = false;

async function loadWordList() {
    try {
        const wordListPath = path.join(__dirname, 'words.txt');
        const data = fs.readFileSync(wordListPath, 'utf-8');
        wordList = data.split('\n').map(line => line.trim().toUpperCase()).filter(word => word.length > 0 && !word.includes(';'));
        wordListLoaded = true;
        console.log(`Loaded ${wordList.length} words`);
    } catch (error) {
        console.error('Error loading wordlist:', error);
        // Fallback: try to fetch from a URL if available
        wordListLoaded = false;
    }
}

loadWordList();

// Pattern matching function
// Pattern matching function
function matchesPattern(word, pattern, length) {
    if (word.length !== length) return false;
    
    for (let i = 0; i < length; i++) {
        const patternChar = pattern[i];
        // If patternChar is "?" or empty, it's a wildcard (match anything)
        if (patternChar && patternChar !== '?' && word[i] !== patternChar) {
            return false;
        }
    }
    
    return true;
}

// Search pattern
function searchPattern() {
    const resultsDiv = document.getElementById('results-list');
    const resultsTitle = document.getElementById('results-title');
    const resultPanel = document.getElementById('result-panel');
    
    if (!wordListLoaded) {
        resultsTitle.textContent = 'Loading wordlist...';
        resultPanel.classList.add('visible');
        setTimeout(() => searchPattern(), 500);
        return;
    }
    
    if (!currentPattern && patternLength === 5) {
        resultsTitle.textContent = 'Please enter a pattern';
        resultPanel.classList.add('visible');
        return;
    }
    
    const matches = [];
    for (const word of wordList) {
        if (matchesPattern(word, currentPattern, patternLength)) {
            matches.push(word);
        }
    }
    
    // Sort alphabetically
    matches.sort((a, b) => a.localeCompare(b));
    
    // Display results
    if (matches.length === 0) {
        resultsTitle.textContent = `No words found matching pattern "${currentPattern.padEnd(patternLength, '?')}"`;
        resultsDiv.innerHTML = '';
    } else {
        resultsTitle.textContent = `Found ${matches.length} word${matches.length !== 1 ? 's' : ''} matching pattern "${currentPattern.padEnd(patternLength, '?')}"`;
        
        let html = '';
        matches.slice(0, 500).forEach(word => {
            html += `<div class="result-item">${word}</div>`;
        });
        resultsDiv.innerHTML = html;
    }
    
    resultPanel.classList.add('visible');
}

// Close results
function closeResults() {
    document.getElementById('result-panel').classList.remove('visible');
}

// Make functions global
window.searchPattern = searchPattern;
window.closeResults = closeResults;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate boxes
    patternBoxes.forEach(box => {
        const userData = box.userData;
        const maxAngle = Math.PI / 4;
        const minAngle = -Math.PI / 4;
        
        box.rotation.y += userData.rotationSpeed * userData.rotationDirection;
        
        if (box.rotation.y >= maxAngle) {
            box.rotation.y = maxAngle;
            userData.rotationDirection = -1;
        } else if (box.rotation.y <= minAngle) {
            box.rotation.y = minAngle;
            userData.rotationDirection = 1;
        }
        
        // Scale animation
        if (userData.scale < userData.targetScale) {
            userData.scale += 0.1;
            if (userData.scale > userData.targetScale) {
                userData.scale = userData.targetScale;
            }
        }
        box.scale.set(userData.scale, userData.scale, userData.scale);
        
        // Subtle floating animation for wildcards
        if (userData.isWildcard && userData.floatOffset !== undefined) {
            const floatAmount = Math.sin(Date.now() * 0.001 * userData.floatSpeed + userData.floatOffset) * 3;
            box.position.y = floatAmount;
        }
        
        // Pulsing glow for wildcard boxes
        if (userData.isWildcard) {
            const pulse = 0.3 + Math.sin(Date.now() * 0.002 + userData.floatOffset) * 0.2;
            const material = box.children.find(child => child.material && child.material.emissiveIntensity !== undefined);
            if (material && material.material) {
                material.material.emissiveIntensity = pulse;
            }
        }
    });
    
    // Update particles
    for (let i = 0; i < particleCount; i++) {
        const vel = particleVelocities[i];
        if (vel.life < vel.maxLife) {
            vel.life += 0.016;
            const pos = i * 3;
            particlePositions[pos] += vel.x;
            particlePositions[pos + 1] += vel.y;
            particlePositions[pos + 2] += vel.z;
            
            // Fade out
            const alpha = 1 - (vel.life / vel.maxLife);
            if (alpha <= 0) {
                particlePositions[pos] = -10000;
                particlePositions[pos + 1] = -10000;
                particlePositions[pos + 2] = -10000;
            }
        }
    }
    particleGeometry.attributes.position.needsUpdate = true;
    
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});