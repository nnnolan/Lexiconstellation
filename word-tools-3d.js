import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

camera.position.set(0, 0, 600);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x6496ff, 1, 1000);
pointLight.position.set(200, 200, 200);
scene.add(pointLight);

// Create three glowing stars
const stars = [];
const starPositions = [
    { x: -200, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 200, y: 0, z: 0 }
];

const starColors = [0xff6b6b, 0x4ecdc4, 0xffe66d];

starPositions.forEach((pos, index) => {
    // Outer glow
    const glowGeometry = new THREE.SphereGeometry(30, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: starColors[index],
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(pos.x, pos.y, pos.z);
    scene.add(glow);
    
    // Star core
    const starGeometry = new THREE.SphereGeometry(15, 32, 32);
    const starMaterial = new THREE.MeshPhongMaterial({
        color: starColors[index],
        emissive: starColors[index],
        emissiveIntensity: 0.8,
        shininess: 100
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(pos.x, pos.y, pos.z);
    star.userData.index = index;
    scene.add(star);
    
    stars.push({
        mesh: star,
        glow: glow,
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
    document.getElementById(`tool-${toolName}`).classList.add('visible');
}

function hideTool() {
    document.querySelectorAll('.tool-view').forEach(view => {
        view.classList.remove('visible');
    });
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
    const intersects = raycaster.intersectObjects(stars.map(s => s.mesh));
    
    if (intersects.length > 0) {
        const intersectedStar = intersects[0].object;
        const starObj = stars.find(s => s.mesh === intersectedStar);
        
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
        showTool(toolNames[hoveredStar.mesh.userData.index]);
    }
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onMouseClick);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    stars.forEach((star, index) => {
        // Rotate stars
        star.mesh.rotation.y += 0.01;
        star.glow.rotation.y += 0.005;
        
        // Pulsing effect
        const pulse = Math.sin(Date.now() * 0.001 + index) * 0.1 + 1;
        star.mesh.scale.set(pulse, pulse, pulse);
        star.glow.scale.set(pulse * 1.5, pulse * 1.5, pulse * 1.5);
        
        // Hover effect
        if (star.hovered) {
            star.mesh.position.y = star.baseY + Math.sin(Date.now() * 0.005) * 10;
            star.glow.material.opacity = 0.5;
        } else {
            star.mesh.position.y = star.baseY;
            star.glow.material.opacity = 0.3;
        }
    });
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();