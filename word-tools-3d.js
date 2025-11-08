import * as THREE from 'three';
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Load wordlist
let wordList = [];
let wordListLoaded = false;

async function loadWordList() {
    try {
        const wordListPath = path.join(__dirname, 'words.txt');
        const data = fs.readFileSync(wordListPath, 'utf-8');
        wordList = data.split('\n')
            .map(line => line.trim().toUpperCase())
            .filter(word => word.length > 0 && !word.includes(';'));
        wordListLoaded = true;
        console.log(`Loaded ${wordList.length} words`);
    } catch (error) {
        console.error('Error loading wordlist:', error);
        // Fallback: try to fetch if in browser context
        try {
            const response = await fetch('words.txt');
            const data = await response.text();
            wordList = data.split('\n')
                .map(line => line.trim().toUpperCase())
                .filter(word => word.length > 0 && !word.includes(';'));
            wordListLoaded = true;
        } catch (fetchError) {
            console.error('Could not load wordlist:', fetchError);
        }
    }
}

// Load wordlist on startup
loadWordList();

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

function showTool(toolName) {
    document.getElementById('star-menu').classList.add('hidden');
    document.getElementById('tool-overlay').classList.add('visible');
    document.getElementById(`tool-${toolName}`).classList.add('visible');
    
    // Hide the back button to index
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.style.opacity = '0';
        backBtn.style.pointerEvents = 'none';
        backBtn.style.visibility = 'hidden';
    }
}

function hideTool() {
    document.querySelectorAll('.tool-view').forEach(view => {
        view.classList.remove('visible');
    });
    document.getElementById('tool-overlay').classList.remove('visible');
    document.getElementById('star-menu').classList.remove('hidden');
    
    // Show the back button to index
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.style.opacity = '1';
        backBtn.style.pointerEvents = 'all';
        backBtn.style.visibility = 'visible';
    }
}
// Make functions global
window.showTool = showTool;
window.hideTool = hideTool;

// Helper function to check if a substring is an anagram of target
function isAnagram(str1, str2) {
    if (str1.length !== str2.length) return false;
    const sorted1 = str1.split('').sort().join('');
    const sorted2 = str2.split('').sort().join('');
    return sorted1 === sorted2;
}

// Helper function to check if word contains scrambled substring
function hasScrambledSubstring(word, target) {
    const tlen = target.length;
    const targetSorted = target.split('').sort().join('');
    
    for (let i = 0; i <= word.length - tlen; i++) {
        const sub = word.substring(i, i + tlen);
        const subSorted = sub.split('').sort().join('');
        if (subSorted === targetSorted) {
            return true;
        }
    }
    return false;
}

// Helper function to find the position of scrambled substring in word
function findScrambledPosition(word, target) {
    const tlen = target.length;
    const targetSorted = target.split('').sort().join('');
    
    for (let i = 0; i <= word.length - tlen; i++) {
        const sub = word.substring(i, i + tlen);
        const subSorted = sub.split('').sort().join('');
        if (subSorted === targetSorted) {
            return i;
        }
    }
    return -1;
}

// Rebus Finder: Find words containing input word in the center (not at start/end)
function searchRebus() {
    const input = document.getElementById('rebus-input').value.trim().toUpperCase();
    const resultsDiv = document.getElementById('rebus-results');
    
    if (!input) {
        resultsDiv.innerHTML = '<div class="results-title">Please enter a word</div>';
        return;
    }
    
    if (!wordListLoaded) {
        resultsDiv.innerHTML = '<div class="results-title">Loading wordlist...</div>';
        setTimeout(() => searchRebus(), 500);
        return;
    }
    
    const matches = [];
    const inputLen = input.length;
    
    for (const word of wordList) {
        if (word.length > inputLen) {
            // Find all positions where input appears
            let pos = word.indexOf(input);
            while (pos !== -1) {
                // Check if it's in the center (not at start or end)
                if (pos > 0 && pos + inputLen < word.length) {
                    matches.push({
                        word: word,
                        position: pos
                    });
                    break; // Only add once per word
                }
                pos = word.indexOf(input, pos + 1);
            }
        }
    }
    
    // Sort by word length, then alphabetically
    matches.sort((a, b) => {
        if (a.word.length !== b.word.length) {
            return a.word.length - b.word.length;
        }
        return a.word.localeCompare(b.word);
    });
    
    displayResults(resultsDiv, matches.slice(0, 500), input, 'rebus'); // Limit to 500 results
}

// Scrambled Substring Finder
function searchScrambled() {
    const input = document.getElementById('scrambled-input').value.trim().toUpperCase();
    const resultsDiv = document.getElementById('scrambled-results');
    
    if (!input) {
        resultsDiv.innerHTML = '<div class="results-title">Please enter letters</div>';
        return;
    }
    
    if (!wordListLoaded) {
        resultsDiv.innerHTML = '<div class="results-title">Loading wordlist...</div>';
        setTimeout(() => searchScrambled(), 500);
        return;
    }
    
    const matches = [];
    
    for (const word of wordList) {
        if (hasScrambledSubstring(word, input)) {
            const position = findScrambledPosition(word, input);
            const foundSubstring = word.substring(position, position + input.length);
            
            // Only add if the substring is actually scrambled (different from input)
            if (foundSubstring !== input) {
                matches.push({
                    word: word,
                    position: position,
                    length: input.length
                });
            }
        }
    }
    
    // Sort by word length, then alphabetically
    matches.sort((a, b) => {
        if (a.word.length !== b.word.length) {
            return a.word.length - b.word.length;
        }
        return a.word.localeCompare(b.word);
    });
    
    displayResults(resultsDiv, matches.slice(0, 500), input, 'scrambled');
}

// Helper function to check if a word can be formed from available letters
function canFormWord(word, availableLetters) {
    const wordLetters = word.split('');
    const availableCount = {};
    
    // Count available letters
    for (const letter of availableLetters) {
        availableCount[letter] = (availableCount[letter] || 0) + 1;
    }
    
    // Check if we can form the word
    for (const letter of wordLetters) {
        if (!availableCount[letter] || availableCount[letter] === 0) {
            return false;
        }
        availableCount[letter]--;
    }
    
    return true;
}

// Anagram Solver - finds all words that can be formed from input letters (3+ letters)
function searchAnagram() {
    const input = document.getElementById('anagram-input').value.trim().toUpperCase();
    const resultsDiv = document.getElementById('anagram-results');
    
    if (!input) {
        resultsDiv.innerHTML = '<div class="results-title">Please enter a word</div>';
        return;
    }
    
    if (input.length < 3) {
        resultsDiv.innerHTML = '<div class="results-title">Please enter at least 3 letters</div>';
        return;
    }
    
    if (!wordListLoaded) {
        resultsDiv.innerHTML = '<div class="results-title">Loading wordlist...</div>';
        setTimeout(() => searchAnagram(), 500);
        return;
    }
    
    const matches = [];
    const inputLetters = input.split('').sort().join('');
    
    for (const word of wordList) {
        // Only check words between 3 letters and input length
        if (word.length >= 3 && word.length <= input.length && word !== input) {
            // Check if word can be formed from input letters
            if (canFormWord(word, input)) {
                matches.push(word);
            }
        }
    }
    
    // Sort by length first, then alphabetically
    matches.sort((a, b) => {
        if (a.length !== b.length) {
            return b.length - a.length; // Longer words first
        }
        return a.localeCompare(b);
    });
    
    displayResults(resultsDiv, matches.slice(0, 500), input, 'anagram');
}
// Helper function to calculate dynamic font size based on word length
function getFontSize(word, maxLength = 12, baseSize = 0.9, minSize = 0.6) {
    if (word.length <= maxLength) {
        return `${baseSize}rem`;
    }
    // Scale down font size for longer words
    const scaleFactor = maxLength / word.length;
    const fontSize = Math.max(minSize, baseSize * scaleFactor);
    return `${fontSize}rem`;
}
// Display results with highlighting
function displayResults(resultsDiv, matches, input, type) {
    if (matches.length === 0) {
        resultsDiv.innerHTML = `<div class="results-title">No results found for "${input}"</div>`;
        return;
    }
    
    let html = `<div class="results-title">Found ${matches.length} result${matches.length !== 1 ? 's' : ''} for "${input}"</div><div class="results-list">`;
    
    matches.forEach(match => {
        let word, displayWord;
        
        if (type === 'rebus') {
            word = match.word;
            const pos = match.position;
            const before = word.substring(0, pos);
            const found = word.substring(pos, pos + input.length);
            const after = word.substring(pos + input.length);
            displayWord = `${before}<span style="color: #6496ff; font-weight: 500;">${found}</span>${after}`;
        } else if (type === 'scrambled') {
            word = match.word;
            const pos = match.position;
            const len = match.length;
            const before = word.substring(0, pos);
            const found = word.substring(pos, pos + len);
            const after = word.substring(pos + len);
            displayWord = `${before}<span style="color: #6496ff; font-weight: 500;">${found}</span>${after}`;
        } else {
            word = match;
            displayWord = word;
        }
        
        // Calculate dynamic font size based on word length
        const fontSize = getFontSize(word, 12, 0.9, 0.5);
        
        html += `<div class="result-item" style="font-size: ${fontSize};">${displayWord}</div>`;
    });
    
    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Make functions global
window.searchScrambled = searchScrambled;
window.searchRebus = searchRebus;
window.searchAnagram = searchAnagram;


// Mouse interaction
// Mouse interaction
let hoveredStar = null;

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Check all star group elements (star, glow, ring, etc.)
    const allStarObjects = [];
    stars.forEach(star => {
        allStarObjects.push(star.star);
        allStarObjects.push(star.glow);
        allStarObjects.push(star.midGlow);
        allStarObjects.push(star.ring);
        // Don't include sparkles as they're too small
    });
    
    const intersects = raycaster.intersectObjects(allStarObjects);
    
    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        // Find which star this object belongs to
        const starObj = stars.find(s => 
            s.star === intersectedObject || 
            s.glow === intersectedObject || 
            s.midGlow === intersectedObject || 
            s.ring === intersectedObject
        );
        
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

// Add Enter key support
document.getElementById('scrambled-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchScrambled();
});

document.getElementById('rebus-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchRebus();
});

document.getElementById('anagram-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchAnagram();
});

animate();