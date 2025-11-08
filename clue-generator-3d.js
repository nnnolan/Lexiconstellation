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

// Letter squares
const letterSquares = [];
const squareSpacing = 120;
let currentWord = '';
// let isAnimating = false;

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

// Create initial 3 squares
function createLetterSquare(letter, index, total) {
    const group = new THREE.Group();
    
    // Square geometry
    const squareGeometry = new THREE.BoxGeometry(80, 80, 20);
    const squareMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c5aa0,
        metalness: 0.3,
        roughness: 0.7,
        emissive: 0x1a3a6b,
        emissiveIntensity: 0.2
    });
    const square = new THREE.Mesh(squareGeometry, squareMaterial);
    group.add(square);
    
    // Add white outline for clarity
    const edges = new THREE.EdgesGeometry(squareGeometry);
    const outlineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        transparent: true,
        opacity: 0.8
    });
    const outline = new THREE.LineSegments(edges, outlineMaterial);
    group.add(outline);
    // Letter text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.font = 'bold 180px Helvetica';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    // Use a plane mesh instead of sprite so it rotates with the box
    const planeGeometry = new THREE.PlaneGeometry(60, 60);
    const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide // Show from both sides
    });
    const letterPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    letterPlane.position.z = 12;
    // No need to face camera - it will rotate with the parent group
    group.add(letterPlane); 
    
    // Position
    const offset = (total - 1) * squareSpacing / 2;
    group.position.x = index * squareSpacing - offset;
    group.position.y = 0;
    group.scale.set(0, 0, 0);
    
    // Store original position for animation
    group.userData = {
        targetX: group.position.x,
        targetY: group.position.y,
        targetScale: 1,
        currentScale: 0,
        letter: letter,
        index: index,
        rotationSpeed: 0.002, // Base rotation speed
        rotationDirection: Math.random() > 0.5 ? 1 : -1 // Random initial direction
    };
    scene.add(group);
    return group;
}

// Initialize with 3 squares
function initializeSquares() {
    clearSquares();
    const letters = ['A', 'B', 'C'];
    letters.forEach((letter, index) => {
        const square = createLetterSquare(letter, index, 3);
        letterSquares.push(square);
        
        // Animate in
        setTimeout(() => {
            animateSquareIn(square, index * 0.1);
        }, index * 200);
    });
}

function clearSquares() {
    letterSquares.forEach(square => scene.remove(square));
    letterSquares.length = 0;
}

function animateSquareIn(square, delay) {
    setTimeout(() => {
        const targetScale = 1;
        const duration = 0.5;
        const startTime = Date.now();
        
        function animate() {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            square.scale.set(easeOut, easeOut, easeOut);
            square.userData.currentScale = easeOut;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        animate();
    }, delay * 1000);
}

// Add letter with particle effect (instant, no blocking)
function addLetter(letter) {
    const index = letterSquares.length;
    const square = createLetterSquare(letter, index, index + 1);
    
    // Reposition existing squares instantly
    letterSquares.forEach((sq, i) => {
        const newOffset = (index) * squareSpacing / 2;
        sq.userData.targetX = i * squareSpacing - newOffset;
        sq.position.x = sq.userData.targetX; // Instant positioning
    });
    
    letterSquares.push(square);
    currentWord += letter;
    
    // Animate expansion (non-blocking)
    const targetScale = 1;
    const duration = 0.3; // Faster
    const startTime = Date.now();
    
    // Create particle burst
    createParticleBurst(square.position.x, square.position.y, square.position.z);
    
    // Animate new square (non-blocking)
    function animate() {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        square.scale.set(easeOut, easeOut, easeOut);
        square.userData.currentScale = easeOut;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    animate();
}

function animateSquareMove(square, targetX, targetY, duration) {
    const startX = square.position.x;
    const startY = square.position.y;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        square.position.x = startX + (targetX - startX) * easeOut;
        square.position.y = startY + (targetY - startY) * easeOut;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    animate();
}

function createParticleBurst(x, y, z) {
    const burstCount = 50;
    
    for (let i = 0; i < burstCount; i++) {
        let particleIndex = -1;
        for (let j = 0; j < particleCount; j++) {
            if (particleVelocities[j].life <= 0) {
                particleIndex = j;
                break;
            }
        }
        
        if (particleIndex >= 0) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = Math.random() * 30;
            
            particlePositions[particleIndex * 3] = x + radius * Math.sin(phi) * Math.cos(theta);
            particlePositions[particleIndex * 3 + 1] = y + radius * Math.sin(phi) * Math.sin(theta);
            particlePositions[particleIndex * 3 + 2] = z + radius * Math.cos(phi);
            
            const speed = 2 + Math.random() * 3;
            particleVelocities[particleIndex].x = speed * Math.sin(phi) * Math.cos(theta);
            particleVelocities[particleIndex].y = speed * Math.sin(phi) * Math.sin(theta);
            particleVelocities[particleIndex].z = speed * Math.cos(phi);
            particleVelocities[particleIndex].life = particleVelocities[particleIndex].maxLife;
        }
    }
}

// Keyboard input
let inputBuffer = '';

window.addEventListener('keydown', (event) => {
    // No blocking - instant response
    const key = event.key.toUpperCase();
    if (key.length === 1 && key >= 'A' && key <= 'Z') {
        event.preventDefault();
        addLetter(key);
    } else if (key === 'BACKSPACE' && letterSquares.length > 0) {
        event.preventDefault();
        removeLastLetter();
    } else if (key === 'ENTER') {
        event.preventDefault();
        generateClue();
    }
});

function removeLastLetter() {
    if (letterSquares.length === 0) return;
    
    const lastSquare = letterSquares.pop();
    currentWord = currentWord.slice(0, -1);
    
    // Instant removal
    scene.remove(lastSquare);
    
    // Reposition remaining squares instantly
    letterSquares.forEach((sq, i) => {
        const newOffset = (letterSquares.length - 1) * squareSpacing / 2;
        sq.userData.targetX = i * squareSpacing - newOffset;
        sq.position.x = sq.userData.targetX; // Instant positioning
    });
}

// Generate clue with Gemini API
async function generateClue() {
    if (currentWord.length === 0) {
        alert('Please enter a word first!');
        return;
    }
    
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    const misdirection = document.getElementById('misdirection').checked;
    
    document.getElementById('generate-btn').disabled = true;
    document.getElementById('generate-btn').textContent = 'Generating...';
    
    try {
        const clue = await callGeminiAPI(currentWord, difficulty, misdirection);
        displayResults(clue);
    } catch (error) {
        console.error('Error:', error);
        alert('Error generating clue. Please try again.');
    } finally {
        document.getElementById('generate-btn').disabled = false;
        document.getElementById('generate-btn').textContent = 'Generate Clue';
    }
}
async function callGeminiAPI(word, difficulty, misdirection) {
    const API_KEY = 'AIzaSyDgaUxG3xT_A1bWO7pmJ0a4azsOMRlTzLs';
    // Use gemini-2.5-flash as shown in your example
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    let prompt = `Generate a single, creative crossword puzzle clue for the word "${word}".

Requirements:
- Difficulty: ${difficulty}
${misdirection ? '- Include misdirection or wordplay (make it tricky!)' : '- Be straightforward and clear'}
- Clue should be concise (under 80 characters)
- Make it engaging and creative
- Return ONLY the clue text, no explanations or numbering`;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Handle response structure
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const clue = data.candidates[0].content.parts[0].text.trim();
        return clue;
    } else {
        console.error('Unexpected response structure:', data);
        throw new Error('Unexpected API response format');
    }
}

function displayResults(clue) {
    const panel = document.getElementById('result-panel');
    const container = document.getElementById('clues-container');
    
    container.innerHTML = `
        <div class="clue-item">
            <p><strong>Word:</strong> ${currentWord}</p>
            <p><strong>Clue:</strong> ${clue}</p>
        </div>
    `;
    
    panel.classList.add('visible');
}
// Fix: Add closeResults function (make it global or attach to window)
function closeResults() {
    const panel = document.getElementById('result-panel');
    panel.classList.remove('visible');
}
window.closeResults = closeResults;

// Animation loop
// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Animate particles
    for (let i = 0; i < particleCount; i++) {
        if (particleVelocities[i].life > 0) {
            particlePositions[i * 3] += particleVelocities[i].x;
            particlePositions[i * 3 + 1] += particleVelocities[i].y;
            particlePositions[i * 3 + 2] += particleVelocities[i].z;
            
            particleVelocities[i].life -= 0.02;
            particleVelocities[i].x *= 0.98;
            particleVelocities[i].y *= 0.98;
            particleVelocities[i].z *= 0.98;
        } else {
            particlePositions[i * 3] = -10000;
            particlePositions[i * 3 + 1] = -10000;
            particlePositions[i * 3 + 2] = -10000;
        }
    }
    
    particleGeometry.attributes.position.needsUpdate = true;
    // Rotate squares slowly with smooth reversal
    letterSquares.forEach(square => {
        const userData = square.userData;
        const maxAngle = Math.PI / 4; // 45 degrees
        const minAngle = -Math.PI / 4; // -45 degrees
        
        // Rotate based on direction
        square.rotation.y += userData.rotationSpeed * userData.rotationDirection;
        
        // Smoothly reverse direction when hitting limits
        if (square.rotation.y >= maxAngle) {
            square.rotation.y = maxAngle;
            userData.rotationDirection = -1; // Reverse direction
        } else if (square.rotation.y <= minAngle) {
            square.rotation.y = minAngle;
            userData.rotationDirection = 1; // Reverse direction
        }
        
        // Letter plane will automatically rotate with the parent group
    });
    renderer.render(scene, camera);
}
// Initialize
initializeSquares();
document.getElementById('generate-btn').addEventListener('click', generateClue);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();