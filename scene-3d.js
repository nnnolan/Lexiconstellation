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

// Enhanced 3D Earth with better depth and realism
const earthGeometry = new THREE.SphereGeometry(100, 128, 128);

// Create a more realistic Earth material with better depth
const earthMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c5aa0,
    metalness: 0.1,
    roughness: 0.8,
    emissive: 0x1a3a6b,
    emissiveIntensity: 0.2
});

// Create a procedural bump texture
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext('2d');
const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
gradient.addColorStop(0.5, 'rgba(200,200,200,0.4)');
gradient.addColorStop(1, 'rgba(100,100,100,0.1)');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 512, 512);
// Add noise for texture
for (let i = 0; i < 10000; i++) {
    ctx.fillStyle = `rgba(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 0.3})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
}
const bumpTexture = new THREE.CanvasTexture(canvas);
bumpTexture.wrapS = THREE.RepeatWrapping;
bumpTexture.wrapT = THREE.RepeatWrapping;
earthMaterial.bumpMap = bumpTexture;
earthMaterial.bumpScale = 2;

// Create continent texture overlay
const continentCanvas = document.createElement('canvas');
continentCanvas.width = 512;
continentCanvas.height = 512;
const continentCtx = continentCanvas.getContext('2d');
// Draw continent-like shapes
continentCtx.fillStyle = '#5ba85f';
continentCtx.beginPath();
continentCtx.arc(150, 200, 80, 0, Math.PI * 2);
continentCtx.fill();
continentCtx.beginPath();
continentCtx.arc(350, 300, 60, 0, Math.PI * 2);
continentCtx.fill();
continentCtx.beginPath();
continentCtx.arc(250, 150, 50, 0, Math.PI * 2);
continentCtx.fill();
const continentTexture = new THREE.CanvasTexture(continentCanvas);
earthMaterial.map = continentTexture;

const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earthMesh);

// Add atmospheric glow layers for depth
const atmosphereGeometry = new THREE.SphereGeometry(105, 64, 64);
const atmosphereMaterial = new THREE.MeshPhongMaterial({
    color: 0x4a90e2,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
    shininess: 100
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// Add outer glow ring
const outerGlowGeometry = new THREE.SphereGeometry(115, 32, 32);
const outerGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x6496ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide
});
const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
scene.add(outerGlow);

// Add directional light to create shadows and depth
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(300, 200, 300);
sunLight.castShadow = true;
scene.add(sunLight);

// Add rim light for edge definition
const rimLight = new THREE.DirectionalLight(0x6496ff, 0.5);
rimLight.position.set(-200, -100, -200);
scene.add(rimLight);

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

// Create text rings around Earth with interactive hover effects
const menuItems = ['WORD FINDER', 'PATTERN MATCHER', 'AI CLUE GENERATOR', 'WORD EXPLORER'];
const textObjects = [];
const textRadius = 220;

// Raycaster for mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Particle system for cloud sparkles
const particleGeometry = new THREE.BufferGeometry();
const particleCount = 200;
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
        maxLife: 0.4 + Math.random() * 0.2,
        fadeIn: 0.1,
        fadeOut: 0.2
    });
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

// Create particle texture
const particleCanvas = document.createElement('canvas');
particleCanvas.width = 64;
particleCanvas.height = 64;
const particleCtx = particleCanvas.getContext('2d');
const particleGradient = particleCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
particleGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
particleGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
particleGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
particleCtx.fillStyle = particleGradient;
particleCtx.fillRect(0, 0, 64, 64);
const particleTexture = new THREE.CanvasTexture(particleCanvas);

const particleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 12, // Increased from 8
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    map: particleTexture,
    sizeAttenuation: true,
    depthWrite: false // Important for additive blending
});

const sparkles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(sparkles);

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
    
    sprite.lookAt(camera.position);
    
    const originalScale = { x: 150, y: 40 };
    const originalZ = 0;
    const originalOpacity = 0.9;
    
    textObjects.push({
        sprite: sprite,
        angle: angle,
        radius: textRadius,
        originalScale: originalScale,
        originalZ: originalZ,
        originalOpacity: originalOpacity,
        hovered: false,
        targetScale: { x: 150, y: 40 },
        targetZ: 0,
        targetOpacity: 0.9,
        glowIntensity: 0,
        particleSource: null,
        particlesTriggered: false
    });
    
    scene.add(sprite);
    
    // Create glow sprite
    const glowCanvas = document.createElement('canvas');
    const glowContext = glowCanvas.getContext('2d');
    glowCanvas.width = 512;
    glowCanvas.height = 128;
    glowContext.fillStyle = 'rgba(100, 150, 255, 0.5)';
    glowContext.font = 'bold 40px Helvetica';
    glowContext.textAlign = 'center';
    glowContext.textBaseline = 'middle';
    glowContext.fillText(text, 256, 64);
    
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
    });
    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.set(150, 40, 1);
    glowSprite.position.copy(sprite.position);
    glowSprite.position.z = -1;
    glowSprite.lookAt(camera.position);
    textObjects[index].glowSprite = glowSprite;
    scene.add(glowSprite);
});

// Mouse interaction
let hoveredObject = null;

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(textObjects.map(obj => obj.sprite));
    
    if (intersects.length > 0) {
        const intersectedSprite = intersects[0].object;
        const textObj = textObjects.find(obj => obj.sprite === intersectedSprite);
        
        if (hoveredObject !== textObj) {
            // Reset previous hover
            if (hoveredObject) {
                hoveredObject.hovered = false;
                hoveredObject.targetScale = { ...hoveredObject.originalScale };
                hoveredObject.targetZ = hoveredObject.originalZ;
                hoveredObject.targetOpacity = hoveredObject.originalOpacity;
                hoveredObject.glowIntensity = 0;
                hoveredObject.particlesTriggered = false;
            }
            
            // Set new hover
            hoveredObject = textObj;
            textObj.hovered = true;
            textObj.targetScale = { x: 180, y: 48 };
            textObj.targetZ = 50;
            textObj.targetOpacity = 1.0;
            textObj.glowIntensity = 1.0;
            textObj.particleSource = textObj.sprite.position.clone();
            textObj.particlesTriggered = true;
            
            document.body.style.cursor = 'pointer';
        }
    } else {
        if (hoveredObject) {
            hoveredObject.hovered = false;
            hoveredObject.targetScale = { ...hoveredObject.originalScale };
            hoveredObject.targetZ = hoveredObject.originalZ;
            hoveredObject.targetOpacity = hoveredObject.originalOpacity;
            hoveredObject.glowIntensity = 0;
            hoveredObject.particlesTriggered = false;
            hoveredObject = null;
        }
        document.body.style.cursor = 'default';
    }
}

window.addEventListener('mousemove', onMouseMove);

// Click handler
function onMouseClick(event) {
    if (hoveredObject) {
        const menuIndex = textObjects.indexOf(hoveredObject);
        const menuItem = menuItems[menuIndex];
        
        console.log('Clicked:', menuItem);
        
        // Navigate based on menu item
        if (menuItem === 'AI CLUE GENERATOR') {
            window.location.href = 'clue-generator.html';
        } else if (menuItem === 'WORD FINDER') {
            // Add navigation for other menu items when ready
            console.log('Word Finder - coming soon');
        } else if (menuItem === 'PATTERN MATCHER') {
            console.log('Pattern Matcher - coming soon');
        } else if (menuItem === 'WORD EXPLORER') {
            console.log('Word Explorer - coming soon');
        }
    }
}

window.addEventListener('click', onMouseClick);

// Animation loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;
    
    // Rotate Earth
    earthMesh.rotation.y += 0.005;
    atmosphere.rotation.y += 0.003;
    outerGlow.rotation.y += 0.002;
    
    // Animate planets
    planets.forEach((planet) => {
        planet.angle += planet.speed;
        planet.mesh.position.x = Math.cos(planet.angle) * planet.radius;
        planet.mesh.position.z = Math.sin(planet.angle) * planet.radius;
        planet.mesh.position.y = Math.sin(planet.angle * 2) * 30;
        planet.mesh.rotation.y += 0.02;
    });
    
    // Update text objects
    textObjects.forEach((textObj) => {
        textObj.angle += 0.001;
        const baseX = Math.cos(textObj.angle) * textObj.radius;
        const baseY = Math.sin(textObj.angle) * textObj.radius;
        
        const lerpFactor = 0.1;
        textObj.sprite.scale.x += (textObj.targetScale.x - textObj.sprite.scale.x) * lerpFactor;
        textObj.sprite.scale.y += (textObj.targetScale.y - textObj.sprite.scale.y) * lerpFactor;
        textObj.sprite.position.z += (textObj.targetZ - textObj.sprite.position.z) * lerpFactor;
        textObj.sprite.material.opacity += (textObj.targetOpacity - textObj.sprite.material.opacity) * lerpFactor;
        
        textObj.sprite.position.x = baseX;
        textObj.sprite.position.y = baseY;
        textObj.sprite.lookAt(camera.position);
        
        if (textObj.glowSprite) {
            textObj.glowSprite.position.x = baseX;
            textObj.glowSprite.position.y = baseY;
            textObj.glowSprite.position.z = textObj.sprite.position.z - 5;
            textObj.glowSprite.scale.x = textObj.sprite.scale.x * 1.2;
            textObj.glowSprite.scale.y = textObj.sprite.scale.y * 1.2;
            textObj.glowSprite.material.opacity += (textObj.glowIntensity * 0.6 - textObj.glowSprite.material.opacity) * lerpFactor;
            textObj.glowSprite.lookAt(camera.position);
        }
        
        // Create particle burst when hovered (only once)
        if (textObj.hovered && textObj.particleSource && textObj.particlesTriggered) {
            const burstCount = 20;
            const cloudRadius = 25;
            
            for (let i = 0; i < burstCount; i++) {
                let particleIndex = -1;
                for (let j = 0; j < particleCount; j++) {
                    if (particleVelocities[j].life <= 0) {
                        particleIndex = j;
                        break;
                    }
                }
                
                if (particleIndex >= 0) {
                    const sourcePos = textObj.sprite.position;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(Math.random() * 2 - 1);
                    const radius = Math.random() * cloudRadius;
                    
                    particlePositions[particleIndex * 3] = sourcePos.x + radius * Math.sin(phi) * Math.cos(theta);
                    particlePositions[particleIndex * 3 + 1] = sourcePos.y + radius * Math.sin(phi) * Math.sin(theta);
                    particlePositions[particleIndex * 3 + 2] = sourcePos.z + radius * Math.cos(phi);
                    
                    const speed = 0.2 + Math.random() * 0.3;
                    const velTheta = Math.random() * Math.PI * 2;
                    const velPhi = Math.acos(Math.random() * 2 - 1);
                    
                    particleVelocities[particleIndex].x = speed * Math.sin(velPhi) * Math.cos(velTheta);
                    particleVelocities[particleIndex].y = speed * Math.sin(velPhi) * Math.sin(velTheta);
                    particleVelocities[particleIndex].z = speed * Math.cos(velPhi);
                    particleVelocities[particleIndex].maxLife = 0.5 + Math.random() * 0.3;
                    particleVelocities[particleIndex].life = particleVelocities[particleIndex].maxLife;
                    particleVelocities[particleIndex].fadeIn = 0.1;
                    particleVelocities[particleIndex].fadeOut = 0.2;
                }
            }
            
            textObj.particlesTriggered = false;
        }
    });
    
    // Animate particles
    let activeParticles = 0;
    let maxOpacity = 0;
    
    for (let i = 0; i < particleCount; i++) {
        if (particleVelocities[i].life > 0) {
            activeParticles++;
            particlePositions[i * 3] += particleVelocities[i].x;
            particlePositions[i * 3 + 1] += particleVelocities[i].y;
            particlePositions[i * 3 + 2] += particleVelocities[i].z;
            
            particleVelocities[i].life -= 0.08; // Slightly slower fade
            
            let opacity = 0;
            const fadeInEnd = particleVelocities[i].fadeIn;
            const fadeOutStart = particleVelocities[i].maxLife - particleVelocities[i].fadeOut;
            const currentLife = particleVelocities[i].life;
            
            if (currentLife > fadeOutStart) {
                opacity = (currentLife - fadeOutStart) / particleVelocities[i].fadeOut;
            } else if (currentLife < fadeInEnd) {
                opacity = currentLife / fadeInEnd;
            } else {
                opacity = 1.0;
            }
            
            if (opacity > maxOpacity) maxOpacity = opacity;
            
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
    // Keep material visible when particles are active
    particleMaterial.opacity = activeParticles > 0 ? 1.0 : 0;
    
    // Debug: uncomment to see if particles are spawning
    if (activeParticles > 0) console.log('Active particles:', activeParticles);
    
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

// Mouse camera movement
let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    camera.position.x += (mouseX * 50 - camera.position.x) * 0.01;
    camera.position.y += (mouseY * 50 - camera.position.y) * 0.01;
    camera.lookAt(0, 0, 0);
});