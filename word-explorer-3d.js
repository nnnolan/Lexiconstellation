import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

camera.position.set(0, 0, 500);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 100;
controls.maxDistance = 2000;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0x6496ff, 1, 2000);
pointLight1.position.set(500, 500, 500);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xff6496, 0.8, 2000);
pointLight2.position.set(-500, -500, -500);
scene.add(pointLight2);

// Word data
const fs = require('fs');
const path = require('path');
let wordList = [];
let wordNodes = [];
let connections = [];
let selectedWord = null;
let allWordsLoaded = []; // Store all loaded words

// Load wordlist
async function loadWordList() {
    try {
        const wordListPath = path.join(__dirname, 'words.txt');
        const data = fs.readFileSync(wordListPath, 'utf-8');
        const allWords = data.split('\n').map(line => line.trim().toUpperCase()).filter(word => word.length > 0 && !word.includes(';'));
        
        // Filter to words 3-8 letters for performance
        allWordsLoaded = allWords.filter(word => word.length >= 3 && word.length <= 8);
        wordList = allWordsLoaded; // Set initial wordList
        console.log(`Loaded ${allWordsLoaded.length} words`);
        
        // Wait a frame to ensure everything is ready, then create constellation
        setTimeout(() => {
            if (allWordsLoaded.length > 0) {
                console.log('Creating initial constellation...');
                loadRandomWords(200); // Start with 200 random words
            } else {
                console.error('No words loaded!');
            }
        }, 100);
    } catch (error) {
        console.error('Error loading wordlist:', error);
    }
}

loadWordList();

// Create word node
function createWordNode(word, position, index) {
    const group = new THREE.Group();
    
    // Star geometry
    const starGeometry = new THREE.OctahedronGeometry(8, 0);
    const starMaterial = new THREE.MeshStandardMaterial({
        color: 0x6496ff,
        emissive: 0x6496ff,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.7
    });
    
    const star = new THREE.Mesh(starGeometry, starMaterial);
    group.add(star);
    
    // Glow effect
    const glowGeometry = new THREE.OctahedronGeometry(12, 0);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x6496ff,
        transparent: true,
        opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    // Text sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Helvetica';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(word, 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(60, 15, 1);
    sprite.position.y = 20;
    group.add(sprite);
    
    group.position.set(position.x, position.y, position.z);
    group.userData.word = word;
    group.userData.index = index;
    group.userData.hovered = false;
    group.userData.selected = false;
    
    return group;
}
// Find connections between words
// Find connections between words
function findConnections(word, allWords, maxConnections = 8) {
    const connections = [];
    const wordSet = new Set(word.split(''));
    
    for (const otherWord of allWords) {
        if (otherWord === word) continue;
        
        let score = 0;
        const otherSet = new Set(otherWord.split(''));
        
        // 1. Shared letters (simple count, not normalized)
        const sharedLetters = [...wordSet].filter(letter => otherSet.has(letter));
        score += sharedLetters.length;
        
        // 2. Similar length bonus
        const lengthDiff = Math.abs(word.length - otherWord.length);
        if (lengthDiff === 0) score += 2;
        else if (lengthDiff === 1) score += 1;
        
        // 3. Common letter combinations (2-letter patterns)
        for (let i = 0; i < word.length - 1; i++) {
            const pair = word.substring(i, i + 2);
            if (otherWord.includes(pair)) {
                score += 2; // Higher weight for shared patterns
            }
        }
        
        // 4. Same starting or ending letter
        if (word[0] === otherWord[0]) score += 1;
        if (word[word.length - 1] === otherWord[otherWord.length - 1]) score += 1;
        
        // Normalize by average length (less aggressive)
        const avgLength = (word.length + otherWord.length) / 2;
        const normalizedScore = score / (avgLength * 2);
        
        // Much lower threshold - almost any shared letter creates connection
        if (normalizedScore > 0.1 || sharedLetters.length >= 2) {
            connections.push({
                word: otherWord,
                strength: Math.min(normalizedScore, 1.0)
            });
        }
    }
    
    // Sort by strength and return top connections
    return connections.sort((a, b) => b.strength - a.strength).slice(0, maxConnections);
}

// Create connection line
function createConnectionLine(start, end, strength) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
        color: 0x6496ff,
        transparent: true,
        opacity: Math.max(0.25, 0.5 * strength), // Higher minimum opacity
        linewidth: 2 // Thicker lines
    });
    const line = new THREE.Line(geometry, material);
    line.userData.strength = strength;
    return line;


}

// Create constellation
function createConstellation(words) {
    console.log('createConstellation called with', words.length, 'words');
    
    if (!words || words.length === 0) {
        console.error('No words provided to createConstellation!');
        return;
    }
    
    // Clear existing
    wordNodes.forEach(node => scene.remove(node));
    connections.forEach(conn => scene.remove(conn));
    wordNodes = [];
    connections = [];
    
    console.log('Cleared existing nodes and connections');
    
    // Position words in 3D space (spherical distribution)
    words.forEach((word, index) => {
        const phi = Math.acos(-1 + (2 * index) / words.length);
        const theta = Math.sqrt(words.length * Math.PI) * phi;
        const radius = 200 + Math.random() * 100;
        
        const position = new THREE.Vector3(
            radius * Math.cos(theta) * Math.sin(phi),
            radius * Math.sin(theta) * Math.sin(phi),
            radius * Math.cos(phi)
        );
        
        const node = createWordNode(word, position, index);
        wordNodes.push(node);
        scene.add(node);
    });
    
    console.log(`Created ${wordNodes.length} word nodes`);
    
    // Create connections
    let totalConnectionsFound = 0;
    wordNodes.forEach((node, index) => {
        const word = node.userData.word;
        const wordConnections = findConnections(word, words, 8);
        
        totalConnectionsFound += wordConnections.length;
        
        if (index < 3) { // Debug first 3 words
            console.log(`Word "${word}" found ${wordConnections.length} connections:`, wordConnections.map(c => c.word));
        }
        
        wordConnections.forEach(conn => {
            const targetNode = wordNodes.find(n => n.userData.word === conn.word);
            if (targetNode) {
                // Check if connection already exists (avoid duplicates)
                const existingConnection = connections.find(c => 
                    (c.userData.source === node && c.userData.target === targetNode) ||
                    (c.userData.source === targetNode && c.userData.target === node)
                );
                
                if (!existingConnection) {
                    const line = createConnectionLine(
                        node.position,
                        targetNode.position,
                        conn.strength
                    );
                    line.userData.source = node;
                    line.userData.target = targetNode;
                    connections.push(line);
                    scene.add(line);
                }
            }
        });
    });
    
    console.log(`Created constellation with ${wordNodes.length} words and ${connections.length} connections`);
    console.log(`Total connections found: ${totalConnectionsFound}, Unique lines: ${connections.length}`);
    
    if (connections.length === 0) {
        console.warn('WARNING: No connections created! Check findConnections function.');
    }
}

// Load random words
function loadRandomWords(count = 200) {
    console.log('loadRandomWords called with count:', count);
    console.log('allWordsLoaded length:', allWordsLoaded.length);
    
    if (allWordsLoaded.length === 0) {
        console.error('No words loaded! Cannot create constellation.');
        return;
    }
    
    // Shuffle array and take random sample
    const shuffled = [...allWordsLoaded].sort(() => Math.random() - 0.5);
    const randomWords = shuffled.slice(0, Math.min(count, allWordsLoaded.length));
    console.log('Selected random words:', randomWords.length);
    
    createConstellation(randomWords);
    
    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Update info panel
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
        infoPanel.innerHTML = `
            <h3>Word Info</h3>
            <p>Loaded ${randomWords.length} random words</p>
            <p>Click a star to explore connections</p>
            <p>Drag to rotate • Scroll to zoom</p>
        `;
    }
}
// Make function global
window.loadRandomWords = loadRandomWords;

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(wordNodes);
    
    // Reset hover
    wordNodes.forEach(node => {
        if (node.userData.hovered && !node.userData.selected) {
            node.children[0].material.emissiveIntensity = 0.3;
            node.children[0].material.color.setHex(0x6496ff);
        }
    });
    
    if (intersects.length > 0) {
        const intersected = intersects[0].object.parent;
        if (!intersected.userData.selected) {
            intersected.userData.hovered = true;
            intersected.children[0].material.emissiveIntensity = 0.8;
            intersected.children[0].material.color.setHex(0xffffff);
            document.body.style.cursor = 'pointer';
        }
    } else {
        document.body.style.cursor = 'default';
    }
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(wordNodes);
    
    if (intersects.length > 0) {
        const clickedNode = intersects[0].object.parent;
        selectWord(clickedNode);
    } else {
        deselectWord();
    }
}

function selectWord(node) {
    // Deselect previous
    if (selectedWord) {
        selectedWord.userData.selected = false;
        selectedWord.children[0].material.color.setHex(0x6496ff);
        selectedWord.children[0].material.emissiveIntensity = 0.3;
    }
    
    // Select new
    selectedWord = node;
    node.userData.selected = true;
    node.children[0].material.color.setHex(0xffd700);
    node.children[0].material.emissiveIntensity = 1.0;
    
    // Highlight connections
    connections.forEach(conn => {
        if (conn.userData.source === node || conn.userData.target === node) {
            conn.material.opacity = 0.8;
            conn.material.color.setHex(0xffd700);
        } else {
            conn.material.opacity = 0.1;
        }
    });
    
    // Update info panel
    const infoPanel = document.getElementById('info-panel');
    const word = node.userData.word;
    const relatedWords = connections
        .filter(conn => conn.userData.source === node || conn.userData.target === node)
        .map(conn => conn.userData.source === node ? conn.userData.target.userData.word : conn.userData.source.userData.word);
    
    infoPanel.innerHTML = `
        <h3>${word}</h3>
        <p>Length: ${word.length} letters</p>
        <p>Connections: ${relatedWords.length}</p>
        <p>Related: ${relatedWords.slice(0, 5).join(', ')}</p>
    `;
    
    // Smooth camera movement to word
    const targetPosition = node.position.clone().multiplyScalar(1.5);
    animateCameraTo(targetPosition);
}

function deselectWord() {
    if (selectedWord) {
        selectedWord.userData.selected = false;
        selectedWord.children[0].material.color.setHex(0x6496ff);
        selectedWord.children[0].material.emissiveIntensity = 0.3;
        selectedWord = null;
    }
    
    // Reset connections
    connections.forEach(conn => {
        conn.material.opacity = 0.3;
        conn.material.color.setHex(0x6496ff);
    });
    
    // Reset info panel
    document.getElementById('info-panel').innerHTML = `
        <h3>Word Info</h3>
        <p>Click a star to explore connections</p>
        <p>Drag to rotate • Scroll to zoom</p>
    `;
}

// Camera animation
let cameraAnimation = null;
function animateCameraTo(targetPosition) {
    if (cameraAnimation) {
        cancelAnimationFrame(cameraAnimation);
    }
    
    const startPosition = camera.position.clone();
    const duration = 1000;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        
        camera.position.lerpVectors(startPosition, targetPosition, ease);
        controls.update();
        
        if (progress < 1) {
            cameraAnimation = requestAnimationFrame(animate);
        }
    }
    animate();
}

// Search functionality
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toUpperCase().trim();
    if (query.length >= 2) {
        const matches = wordList.filter(word => word.includes(query)).slice(0, 50);
        if (matches.length > 0) {
            createConstellation(matches);
        }
    } else if (query.length === 0) {
        createConstellation(wordList.slice(0, 200));
    }
});

const randomBtn = document.getElementById('random-btn');
randomBtn.addEventListener('click', () => {
    loadRandomWords(200);
    deselectWord();
});

// Event listeners
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onMouseClick);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate constellation slowly
    wordNodes.forEach((node, index) => {
        node.rotation.y += 0.001;
        node.rotation.x += 0.0005;
        
        // Pulsing glow
        const pulse = 0.2 + Math.sin(Date.now() * 0.001 + index) * 0.1;
        node.children[1].material.opacity = pulse;
    });
    
    controls.update();
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});