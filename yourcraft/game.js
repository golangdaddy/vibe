// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('gameCanvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);

// Create world variables
const WORLD_SIZE = 16;
const BLOCK_SIZE = 1;
const blocks = new Map();

// Materials
const materials = {
    grass: new THREE.MeshLambertMaterial({ color: 0x55aa55 }),
    dirt: new THREE.MeshLambertMaterial({ color: 0x885533 }),
    stone: new THREE.MeshLambertMaterial({ color: 0x888888 }),
    wood: new THREE.MeshLambertMaterial({ color: 0x825301 }),
    leaves: new THREE.MeshLambertMaterial({ color: 0x1f5d1f }),
    sand: new THREE.MeshLambertMaterial({ color: 0xdcd289 })
};

// Game mode system
let gameMode = 'normal'; // 'normal' or 'creative'

// Inventory system - changed from Set to Map to track quantities
const inventory = new Map();
let selectedMaterial = null;

// Function to get material name from Three.js material
function getMaterialName(material) {
    for (const [name, mat] of Object.entries(materials)) {
        if (mat === material) return name;
    }
    return null;
}

// Function to add material to inventory
function addToInventory(materialName) {
    const currentCount = inventory.get(materialName) || 0;
    inventory.set(materialName, currentCount + 1);
    updatePalette();
    
    // If this is the first material, select it
    if (!selectedMaterial) {
        selectMaterial(materialName);
    }
}

// Function to check if material is available
function isMaterialAvailable(materialName) {
    if (gameMode === 'creative') {
        return true; // All materials available in creative mode
    }
    return inventory.has(materialName) && inventory.get(materialName) > 0;
}

// Function to get material count (shows ∞ for creative mode)
function getMaterialCount(materialName) {
    if (gameMode === 'creative') {
        return '∞';
    }
    return inventory.get(materialName) || 0;
}

// Create block geometry
const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

// Shape system
let currentShape = 'cube';
let currentRotation = 0; // In radians
const ROTATION_STEP = Math.PI / 2; // 90 degrees

// Create geometries for different shapes
const geometries = {
    cube: new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
    sphere: new THREE.SphereGeometry(BLOCK_SIZE * 0.5, 16, 12),
    ramp: createRampGeometry(),
    pyramid: new THREE.ConeGeometry(BLOCK_SIZE * 0.5, BLOCK_SIZE, 4),
    cone: new THREE.ConeGeometry(BLOCK_SIZE * 0.5, BLOCK_SIZE, 16)
};

// Create custom ramp geometry (extruded triangle)
function createRampGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(1, 1);
    shape.lineTo(0, 0);
    
    const extrudeSettings = {
        depth: 1,
        bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.scale(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    geometry.translate(-BLOCK_SIZE/2, -BLOCK_SIZE/2, -BLOCK_SIZE/2);
    return geometry;
}

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Player movement
const moveSpeed = 0.1;
const rotateSpeed = 0.002;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

// Mouse controls
let isPointerLocked = false;
document.addEventListener('click', (event) => {
    // Only request pointer lock if menu is not open and we're not clicking on menu elements
    if (!isMenuOpen && !event.target.closest('#materialMenu') && !event.target.closest('#shapesMenu')) {
        document.body.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement !== null;
});

document.addEventListener('mousemove', (event) => {
    if (isPointerLocked) {
        // Create a rotation matrix to keep the camera level
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= event.movementX * rotateSpeed;
        euler.x -= event.movementY * rotateSpeed;
        euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x));
        camera.quaternion.setFromEuler(euler);
    }
});

// Block interaction
function onMouseClick(event) {
    if (!isPointerLocked) return;
    
    // Ignore middle mouse button - that's for rotation only
    if (event.button === 1) return;

    const isRightClick = event.button === 2;
    
    // Fix: Use center of screen for raycasting in pointer lock mode
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // Find intersected objects
    const intersects = raycaster.intersectObjects(Array.from(blocks.values()));
    
    if (intersects.length > 0) {
        const pos = getBlockPosition(intersects[0], isRightClick);
        
        if (!pos || !isInBounds(pos)) return;
        
        if (isRightClick) {
            // Place block
            if (!blocks.has(`${pos.x},${pos.y},${pos.z}`) && selectedMaterial) {
                const selectedMaterialName = getMaterialName(selectedMaterial);
                if (selectedMaterialName && isMaterialAvailable(selectedMaterialName)) {
                    createBlock(pos.x, pos.y, pos.z, selectedMaterial);
                    
                    // Only consume material in normal mode
                    if (gameMode === 'normal') {
                        inventory.set(selectedMaterialName, inventory.get(selectedMaterialName) - 1);
                        updatePalette();
                    }
                }
            }
        } else {
            // Remove block and add to inventory (only in normal mode)
            const key = `${Math.round(intersects[0].object.position.x)},${Math.round(intersects[0].object.position.y)},${Math.round(intersects[0].object.position.z)}`;
            const block = blocks.get(key);
            if (block) {
                // Add the broken block's material to inventory only in normal mode
                if (gameMode === 'normal') {
                    const materialName = getMaterialName(block.material);
                    if (materialName) {
                        addToInventory(materialName);
                    }
                }
                
                scene.remove(block);
                blocks.delete(key);
            }
        }
    }
}

// Prevent context menu on right click
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Add mouse click listeners - but filter out middle mouse
document.addEventListener('mousedown', (event) => {
    // Handle middle mouse separately for rotation
    if (event.button === 1) { // Middle mouse button
        event.preventDefault();
        event.stopPropagation(); // Prevent other handlers from processing this
        
        if (isPointerLocked) {
            // Check if we clicked on an existing block to rotate
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(Array.from(blocks.values()));
            
            if (intersects.length > 0) {
                // Rotate the clicked block
                rotateExistingBlock(intersects[0].object);
            } else {
                // No block clicked, just rotate the current shape selection
                rotateCurrentShape();
            }
        }
        return false; // Prevent default browser behavior
    }
    
    // Handle left and right mouse for block interaction
    onMouseClick(event);
});

// Prevent middle mouse scroll behavior and add shape cycling
document.addEventListener('wheel', (event) => {
    if (isPointerLocked) {
        event.preventDefault();
        
        // Cycle through shapes with scroll wheel
        const shapeNames = Object.keys(geometries);
        const currentIndex = shapeNames.indexOf(currentShape);
        
        let nextIndex;
        if (event.deltaY > 0) {
            // Scroll down - next shape
            nextIndex = (currentIndex + 1) % shapeNames.length;
        } else {
            // Scroll up - previous shape
            nextIndex = (currentIndex - 1 + shapeNames.length) % shapeNames.length;
        }
        
        const nextShape = shapeNames[nextIndex];
        selectShape(nextShape);
    }
}, { passive: false });

// Material menu state
let isMenuOpen = false;

// Keyboard controls
document.addEventListener('keydown', (event) => {
    switch(event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': moveUp = true; break;
        case 'ShiftLeft': moveDown = true; break;
        case 'AltLeft':
        case 'AltRight':
            event.preventDefault();
            cyclePaletteMaterial();
            break;
        case 'Tab':
            event.preventDefault();
            toggleMaterialMenu();
            break;
        case 'Escape':
            if (isMenuOpen) {
                event.preventDefault();
                closeMaterialMenu();
            }
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch(event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'Space': moveUp = false; break;
        case 'ShiftLeft': moveDown = false; break;
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize camera position
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

// Generate the initial world
generateTerrain();

// Raycasting for block interaction
const raycaster = new THREE.Raycaster();

// Function to get block position from ray intersection
function getBlockPosition(intersection, place) {
    if (!intersection) return null;
    
    // Fix: Clone the point to avoid mutating the original
    const point = intersection.point.clone();
    if (place) {
        point.add(intersection.face.normal.multiplyScalar(0.5));
    } else {
        point.add(intersection.face.normal.multiplyScalar(-0.5));
    }
    
    return {
        x: Math.round(point.x),
        y: Math.round(point.y),
        z: Math.round(point.z)
    };
}

// Function to check if position is within world bounds
function isInBounds(pos) {
    return pos.x >= -WORLD_SIZE/2 && pos.x < WORLD_SIZE/2 &&
           pos.y >= 0 && pos.y < WORLD_SIZE &&
           pos.z >= -WORLD_SIZE/2 && pos.z < WORLD_SIZE/2;
}

// Material selection
function selectMaterial(materialName) {
    if (isMaterialAvailable(materialName)) {
        selectedMaterial = materials[materialName];
        // Update selected material visual feedback
        document.querySelectorAll('.palette-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.material === materialName) {
                item.classList.add('selected');
            }
        });
    }
}

// Function to cycle through available materials
function cyclePaletteMaterial() {
    // Use the same logic as the palette to get available materials
    const availableMaterials = gameMode === 'creative' ? 
        Object.keys(materials) : 
        Array.from(inventory.keys()).filter(name => inventory.get(name) > 0);
    
    if (availableMaterials.length === 0) return;
    
    const currentMaterialName = getMaterialName(selectedMaterial);
    const currentIndex = availableMaterials.indexOf(currentMaterialName);
    const nextIndex = (currentIndex + 1) % availableMaterials.length;
    
    selectMaterial(availableMaterials[nextIndex]);
}

// Update palette to only show collected materials (or all in creative mode)
function updatePalette() {
    const palette = document.getElementById('palette');
    palette.innerHTML = ''; // Clear existing items
    
    const materialsToShow = gameMode === 'creative' ? 
        Object.keys(materials) : 
        Array.from(inventory.keys()).filter(name => inventory.get(name) > 0);
    
    materialsToShow.forEach(materialName => {
        const item = document.createElement('div');
        item.className = 'palette-item';
        item.dataset.material = materialName;
        // Fix: Use getHex() to properly get the color from Three.js Color object
        item.style.backgroundColor = '#' + materials[materialName].color.getHex().toString(16).padStart(6, '0');
        
        const count = getMaterialCount(materialName);
        item.title = materialName.charAt(0).toUpperCase() + materialName.slice(1) + ` (${count})`;
        
        // Add count display
        const countDisplay = document.createElement('div');
        countDisplay.className = 'material-count';
        countDisplay.textContent = count;
        item.appendChild(countDisplay);
        
        item.addEventListener('click', () => selectMaterial(materialName));
        palette.appendChild(item);
    });
    
    // Reselect current material if still available
    if (selectedMaterial && isMaterialAvailable(getMaterialName(selectedMaterial))) {
        selectMaterial(getMaterialName(selectedMaterial));
    } else {
        // If current material is no longer available, select the first available one
        selectedMaterial = null;
        const firstAvailable = materialsToShow.find(name => isMaterialAvailable(name));
        if (firstAvailable) {
            selectMaterial(firstAvailable);
        }
    }
}

// Initialize empty palette
function initializePalette() {
    const palette = document.getElementById('palette');
    palette.innerHTML = '';
}

// Initialize palette after window loads
window.addEventListener('load', initializePalette);

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (isPointerLocked) {
        // Calculate movement direction
        const direction = new THREE.Vector3();
        
        // Get the camera's forward and right vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        
        // Zero out the Y component to keep movement level
        forward.y = 0;
        right.y = 0;
        
        // Normalize the vectors after zeroing Y
        forward.normalize();
        right.normalize();

        if (moveForward) direction.add(forward);
        if (moveBackward) direction.sub(forward);
        if (moveLeft) direction.sub(right);
        if (moveRight) direction.add(right);
        
        // Add vertical movement
        if (moveUp) direction.y += 1;
        if (moveDown) direction.y -= 1;

        direction.normalize();
        camera.position.add(direction.multiplyScalar(moveSpeed));
    }

    renderer.render(scene, camera);
}

animate();

// Material menu functions
function toggleMaterialMenu() {
    if (isMenuOpen) {
        closeMaterialMenu();
    } else {
        openMaterialMenu();
    }
}

function openMaterialMenu() {
    isMenuOpen = true;
    const menu = document.getElementById('materialMenu');
    menu.classList.remove('hidden');
    populateMaterialMenu();
    
    // Release pointer lock when menu opens
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
}

function closeMaterialMenu() {
    isMenuOpen = false;
    const menu = document.getElementById('materialMenu');
    menu.classList.add('hidden');
    
    // Ensure any focused elements are blurred
    if (document.activeElement) {
        document.activeElement.blur();
    }
}

function populateMaterialMenu() {
    const grid = document.getElementById('materialGrid');
    grid.innerHTML = '';
    
    Object.keys(materials).forEach(materialName => {
        const item = document.createElement('div');
        item.className = 'menu-material-item';
        item.dataset.material = materialName;
        
        // Set background color
        item.style.backgroundColor = '#' + materials[materialName].color.getHex().toString(16).padStart(6, '0');
        
        // Check if material is available
        const isAvailable = isMaterialAvailable(materialName);
        if (!isAvailable) {
            item.classList.add('unavailable');
        }
        
        // Add material name
        const nameDiv = document.createElement('div');
        nameDiv.className = 'material-name';
        nameDiv.textContent = materialName;
        item.appendChild(nameDiv);
        
        // Add inventory count or infinity symbol
        if (isAvailable) {
            const countDiv = document.createElement('div');
            if (gameMode === 'creative') {
                countDiv.className = 'creative-indicator';
                countDiv.textContent = '∞';
            } else {
                countDiv.className = 'material-inventory-count';
                countDiv.textContent = inventory.get(materialName) || 0;
            }
            item.appendChild(countDiv);
        }
        
        // Check if this is the selected material
        if (selectedMaterial === materials[materialName]) {
            item.classList.add('selected');
        }
        
        // Add click handler
        item.addEventListener('click', () => {
            if (isAvailable) {
                selectMaterial(materialName);
                closeMaterialMenu(); // Close menu when material is selected
            }
        });
        
        grid.appendChild(item);
    });
}

// Game mode change handler
function initializeGameModeSelector() {
    const selector = document.getElementById('gameModeSelect');
    selector.value = gameMode;
    
    selector.addEventListener('change', (event) => {
        const newMode = event.target.value;
        
        // Immediately blur the selector and close menu
        event.target.blur();
        
        // Use setTimeout to ensure DOM updates properly
        setTimeout(() => {
            gameMode = newMode;
            
            // Close the material menu and return control to game
            closeMaterialMenu();
            
            // Update palette based on new mode
            updatePalette();
            
            // In creative mode, select first material if none selected
            if (gameMode === 'creative' && !selectedMaterial) {
                const firstMaterial = Object.keys(materials)[0];
                selectMaterial(firstMaterial);
            }
            
            // Force focus back to the game canvas to ensure clicks work
            const canvas = document.getElementById('gameCanvas');
            canvas.focus();
            
        }, 10); // Small delay to ensure proper DOM updates
    });
    
    // Also handle when user clicks away from dropdown
    selector.addEventListener('blur', () => {
        // If menu is still open when dropdown loses focus, keep it open
        // This prevents accidental closes when user is just navigating
    });
}

// Initialize game mode selector after window loads
window.addEventListener('load', () => {
    initializePalette();
    initializeGameModeSelector();
});

// Shape selection functions
function selectShape(shapeName) {
    currentShape = shapeName;
    document.querySelectorAll('.shape-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.shape === shapeName) {
            item.classList.add('selected');
        }
    });
}

function rotateCurrentShape() {
    currentRotation += ROTATION_STEP;
    if (currentRotation >= Math.PI * 2) {
        currentRotation = 0;
    }
    updateRotationDisplay();
}

function updateRotationDisplay() {
    const degrees = Math.round((currentRotation * 180) / Math.PI);
    document.getElementById('currentRotation').textContent = degrees + '°';
}

// Initialize shapes menu
function initializeShapesMenu() {
    const shapeItems = document.querySelectorAll('.shape-item');
    shapeItems.forEach(item => {
        item.addEventListener('click', () => {
            const shapeName = item.dataset.shape;
            selectShape(shapeName);
        });
    });
    
    // Initialize rotation display
    updateRotationDisplay();
}

// Initialize shapes menu after window loads
window.addEventListener('load', () => {
    initializePalette();
    initializeGameModeSelector();
    initializeShapesMenu();
});

// Generate terrain
function generateTerrain() {
    for (let x = -WORLD_SIZE/2; x < WORLD_SIZE/2; x++) {
        for (let z = -WORLD_SIZE/2; z < WORLD_SIZE/2; z++) {
            const height = Math.floor(Math.sin(x * 0.5) + Math.cos(z * 0.5) + 2);
            for (let y = 0; y <= height; y++) {
                let material = materials.dirt;
                if (y === height) {
                    material = materials.grass;
                } else if (y < height - 3) {
                    material = materials.stone;
                }
                createBlock(x, y, z, material);
            }
        }
    }
}

// Create a block with current shape and rotation
function createBlock(x, y, z, material) {
    const geometry = geometries[currentShape];
    const block = new THREE.Mesh(geometry, material);
    block.position.set(x * BLOCK_SIZE, y * BLOCK_SIZE, z * BLOCK_SIZE);
    
    // Apply rotation
    block.rotation.y = currentRotation;
    
    // Store shape and rotation info for future reference
    block.userData = {
        shape: currentShape,
        rotation: currentRotation
    };
    
    scene.add(block);
    blocks.set(`${x},${y},${z}`, block);
}

// Function to rotate an existing placed block
function rotateExistingBlock(block) {
    // Get current rotation and calculate new rotation
    const currentBlockRotation = block.userData.rotation || 0;
    const newRotation = currentBlockRotation + ROTATION_STEP;
    const finalRotation = newRotation >= Math.PI * 2 ? 0 : newRotation;
    
    // Apply the new rotation to the block
    block.rotation.y = finalRotation;
    
    // Update the stored rotation in userData
    block.userData.rotation = finalRotation;
    
    // IMPORTANT: Set this as the current rotation for future placements
    currentRotation = finalRotation;
    
    // Update the display to show the new current rotation
    updateRotationDisplay();
} 