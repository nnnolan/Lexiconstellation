import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Camera position
camera.position.set(0, 0, 600);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0x6496ff, 1, 1000);
pointLight1.position.set(200, 200, 200);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xff6b6b, 0.8, 1000);
pointLight2.position.set(-200, -200, 200);
scene.add(pointLight2);

// Create Earth (3D sphere)
const earthGeometry = new THREE.SphereGeometry(100, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x2c5aa0,
    emissive: 0x1a3a6b,
    specular: 0x4a90e2,
    shininess: 30,
    transparent: true,
    opacity: 0.95
});

// Add texture-like details with noise
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earthMesh);

// Add continents (simple colored patches)
const continentGeometry = new THREE.SphereGeometry(101, 32, 32);
const continentMaterial = new THREE.MeshPhongMaterial({
    color: 0x5ba85f,
    transparent: true,
    opacity: 0.6
});
const continents = new THREE.Mesh(continentGeometry, continentMaterial);
scene.add(continents);

// Earth glow
const glowGeometry = new THREE.SphereGeometry(110, 32, 32);
const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x4a90e2,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide
});
const earthGlow = new THREE.Mesh(glowGeometry, glowMaterial);
scene.add(earthGlow);

// Create orbiting planets
const planets = [];
const planetColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e6cf];
const planetSizes = [8, 6, 7, 5];
const orbitRadii = [350, 380, 320, 400];
const orbitSpeeds = [0.005, 0.003, 0.004, 0.006];
const startAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];

for (let i = 0; i < 4; i++) {
    const planetGeometry = new THREE.SphereGeometry(planetSizes[i], 16, 16);
    const planetMaterial = new THREE.MeshPhongMaterial({
        color: planetColors[i],
        emissive: planetColors[i],
        emissiveIntensity: 0.5,
        shininess: 100
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    
    // Add glow
    const planetGlowGeometry = new THREE.SphereGeometry(planetSizes[i] + 2, 16, 16);
    const planetGlowMaterial = new THREE.MeshBasicMaterial({
        color: planetColors[i],
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const planetGlow = new THREE.Mesh(planetGlowGeometry, planetGlowMaterial);
    planet.add(planetGlow);
    
    planets.push({
        mesh: planet,
        radius: orbitRadii[i],
        speed: orbitSpeeds[i],
        angle: startAngles[i]
    });
    scene.add(planet);
}

// Create starfield
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 5000;
const starsPositions = new Float32Array(starsCount * 3);
const starsColors = new Float32Array(starsCount * 3);

for (let i = 0; i < starsCount * 3; i += 3) {
    // Random positions in a sphere
    const radius = 800 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    
    starsPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
    starsPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starsPositions[i + 2] = radius * Math.cos(phi);
    
    // Random colors (mostly white with some blue)
    const brightness = 0.5 + Math.random() * 0.5;
    starsColors[i] = brightness;
    starsColors[i + 1] = brightness;
    starsColors[i + 2] = brightness + Math.random() * 0.2;
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));

const starsMaterial = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
});

const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

// Create text rings around Earth (using 3D text or sprites)
const menuItems = ['WORD FINDER', 'PATTERN MATCHER', 'AI CLUE GENERATOR', 'WORD EXPLORER'];
const textObjects = [];
const textRadius = 220;

menuItems.forEach((text, index) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.font = 'bold 40px Helvetica';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(150, 40, 1);
    
    const angle = (index / menuItems.length) * Math.PI * 2;
    sprite.position.x = Math.cos(angle) * textRadius;
    sprite.position.y = Math.sin(angle) * textRadius;
    sprite.position.z = 0;
    
    // Make sprite always face camera
    sprite.lookAt(camera.position);
    
    textObjects.push({
        sprite: sprite,
        angle: angle,
        radius: textRadius
    });
    
    scene.add(sprite);
});

// Animation loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;
    
    // Rotate Earth
    earthMesh.rotation.y += 0.005;
    continents.rotation.y += 0.003;
    earthGlow.rotation.y += 0.002;
    
    // Animate planets in orbits
    planets.forEach((planet, index) => {
        planet.angle += planet.speed;
        planet.mesh.position.x = Math.cos(planet.angle) * planet.radius;
        planet.mesh.position.z = Math.sin(planet.angle) * planet.radius;
        planet.mesh.position.y = Math.sin(planet.angle * 2) * 30; // Slight vertical wobble
        
        // Rotate planet on its axis
        planet.mesh.rotation.y += 0.02;
    });
    
    // Rotate text ring slowly
    textObjects.forEach((textObj, index) => {
        textObj.angle += 0.001;
        textObj.sprite.position.x = Math.cos(textObj.angle) * textObj.radius;
        textObj.sprite.position.y = Math.sin(textObj.angle) * textObj.radius;
        textObj.sprite.lookAt(camera.position);
    });
    
    // Rotate starfield slowly
    stars.rotation.y += 0.0001;
    
    // Pulsing lights
    pointLight1.intensity = 1 + Math.sin(time) * 0.3;
    pointLight2.intensity = 0.8 + Math.cos(time * 1.2) * 0.2;
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();

// Optional: Add mouse interaction
let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Subtle camera movement based on mouse
    camera.position.x += (mouseX * 50 - camera.position.x) * 0.01;
    camera.position.y += (mouseY * 50 - camera.position.y) * 0.01;
    camera.lookAt(0, 0, 0);
});