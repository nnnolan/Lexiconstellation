import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Append to canvas container
document.getElementById('canvas-container').appendChild(renderer.domElement);

camera.position.set(0, 0, 600);

// Enhanced lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0x6496ff, 1.2, 1000);
pointLight1.position.set(200, 200, 200);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xff6b6b, 0.8, 1000);
pointLight2.position.set(-200, -200, 200);
scene.add(pointLight2);

// Create three beautiful glowing stars
const stars = [];
const starPositions = [
    { x: -300, y: 80, z: 0 },  // Lower Y position to be below text
    { x: 0, y: 80, z: 0 },
    { x: 300, y: 80, z: 0 }
];
const starColors = [0xff6b6b, 0x4ecdc4, 0xffe66d];

starPositions.forEach((pos, index) => {
    const group = new THREE.Group();
    
    // Outer halo ring
    const ringGeometry = new THREE.TorusGeometry(25, 3, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: starColors[index],
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    
    // Outer glow (larger, softer)
    const glowGeometry = new THREE.SphereGeometry(35, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: starColors[index],
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    // Middle glow layer
    const midGlowGeometry = new THREE.SphereGeometry(25, 32, 32);
    const midGlowMaterial = new THREE.MeshBasicMaterial({
        color: starColors[index],
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
    });
    const midGlow = new THREE.Mesh(midGlowGeometry, midGlowMaterial);
    group.add(midGlow);
    
    // Star core with better material
    const starGeometry = new THREE.SphereGeometry(18, 32, 32);
    const starMaterial = new THREE.MeshStandardMaterial({
        color: starColors[index],
        emissive: starColors[index],
        emissiveIntensity: 1.2,
        metalness: 0.3,
        roughness: 0.2,
        transparent: true,
        opacity: 0.95
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    group.add(star);
    
    // Add sparkle particles around star
    const sparkleGeometry = new THREE.BufferGeometry();
    const sparkleCount = 20;
    const sparklePositions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount * 3; i += 3) {
        const radius = 30 + Math.random() * 15;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        sparklePositions[i] = radius * Math.sin(phi) * Math.cos(theta);
        sparklePositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        sparklePositions[i + 2] = radius * Math.cos(phi);
    }
    sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMaterial = new THREE.PointsMaterial({
        color: starColors[index],
        size: 2,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
    group.add(sparkles);
    
    group.position.set(pos.x, pos.y, pos.z);
    star.userData.index = index;
    scene.add(group);
    
    stars.push({
        group: group,
        star: star,
        glow: glow,
        midGlow: midGlow,
        ring: ring,
        sparkles: sparkles,
        baseY: pos.y,
        hovered: false
    });
});

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Tool navigation
function showTool(toolName) {
    document.getElementById('star-menu').classList.add('hidden');
    document.getElementById('tool-overlay').classList.add('visible');
    document.getElementById(`tool-${toolName}`).classList.add('visible');
}

function hideTool() {
    document.querySelectorAll('.tool-view').forEach(view => {
        view.classList.remove('visible');
    });
    document.getElementById('tool-overlay').classList.remove('visible');
    document.getElementById('star-menu').classList.remove('hidden');
}
// Make functions global
window.showTool = showTool;
window.hideTool = hideTool;

// Placeholder search functions
function searchScrambled() {
    const input = document.getElementById('scrambled-input').value.toUpperCase();
    const resultsDiv = document.getElementById('scrambled-results');
    resultsDiv.innerHTML = `<div class="results-title">Results for "${input}"</div><div class="results-list">Coming soon...</div>`;
}

function searchRebus() {
    const input = document.getElementById('rebus-input').value.toUpperCase();
    const resultsDiv = document.getElementById('rebus-results');
    resultsDiv.innerHTML = `<div class="results-title">Results for "${input}"</div><div class="results-list">Coming soon...</div>`;
}

function searchAnagram() {
    const input = document.getElementById('anagram-input').value.toUpperCase();
    const resultsDiv = document.getElementById('anagram-results');
    resultsDiv.innerHTML = `<div class="results-title">Results for "${input}"</div><div class="results-list">Coming soon...</div>`;
}

window.searchScrambled = searchScrambled;
window.searchRebus = searchRebus;
window.searchAnagram = searchAnagram;

// Mouse interaction
let hoveredStar = null;

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const starMeshes = stars.map(s => s.star);
    const intersects = raycaster.intersectObjects(starMeshes);
    
    if (intersects.length > 0) {
        const intersectedStar = intersects[0].object;
        const starObj = stars.find(s => s.star === intersectedStar);
        
        if (hoveredStar !== starObj) {
            if (hoveredStar) {
                hoveredStar.hovered = false;
            }
            hoveredStar = starObj;
            starObj.hovered = true;
            document.body.style.cursor = 'pointer';
        }
    } else {
        if (hoveredStar) {
            hoveredStar.hovered = false;
            hoveredStar = null;
        }
        document.body.style.cursor = 'default';
    }
}

function onMouseClick(event) {
    if (hoveredStar) {
        const toolNames = ['scrambled', 'rebus', 'anagram'];
        showTool(toolNames[hoveredStar.star.userData.index]);
    }
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onMouseClick);

// Animation loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;
    
    stars.forEach((star, index) => {
        // Rotate the entire group
        star.group.rotation.y += 0.005;
        star.ring.rotation.z += 0.01;
        
        // Pulsing effect with different speeds
        const pulseSpeed = 0.002 + index * 0.001;
        const pulse = Math.sin(time * 2 + index * 2) * 0.15 + 1;
        
        star.star.scale.set(pulse, pulse, pulse);
        star.midGlow.scale.set(pulse * 1.2, pulse * 1.2, pulse * 1.2);
        star.glow.scale.set(pulse * 1.5, pulse * 1.5, pulse * 1.5);
        
        // Rotate sparkles
        star.sparkles.rotation.y += 0.01;
        star.sparkles.rotation.x += 0.005;
        
        // Hover effect
        if (star.hovered) {
            star.group.position.y = star.baseY + Math.sin(time * 5) * 15;
            star.star.material.emissiveIntensity = 1.8;
            star.glow.material.opacity = 0.4;
            star.midGlow.material.opacity = 0.6;
            star.ring.material.opacity = 0.6;
            star.sparkles.material.opacity = 0.9;
        } else {
            star.group.position.y = star.baseY;
            star.star.material.emissiveIntensity = 1.2;
            star.glow.material.opacity = 0.2;
            star.midGlow.material.opacity = 0.4;
            star.ring.material.opacity = 0.4;
            star.sparkles.material.opacity = 0.6;
        }
    });
    
    // Animate lights
    pointLight1.intensity = 1.2 + Math.sin(time) * 0.3;
    pointLight2.intensity = 0.8 + Math.cos(time * 1.2) * 0.2;
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();