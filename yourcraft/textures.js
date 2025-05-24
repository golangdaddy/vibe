// Create a default texture pattern programmatically
function createDefaultTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;  // Power of 2 for best compatibility
    canvas.height = 64;
    
    const ctx = canvas.getContext('2d');
    
    // Fill with base color
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 64, 64);
    
    // Add a simple grid pattern
    ctx.strokeStyle = '#777777';
    ctx.lineWidth = 2;
    
    // Draw vertical lines
    for (let x = 8; x < 64; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 64);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 8; y < 64; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(64, y);
        ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Create and store the default texture
const defaultTexture = createDefaultTexture();

// Material to texture mapping
const materialTextures = {
    grass: {
        map: defaultTexture,
        color: 0x55aa55,
    },
    dirt: {
        map: defaultTexture,
        color: 0x885533,
    },
    stone: {
        map: defaultTexture,
        color: 0x888888,
    },
    wood: {
        map: defaultTexture,
        color: 0x825301,
    },
    leaves: {
        map: defaultTexture,
        color: 0x1f5d1f,
    },
    sand: {
        map: defaultTexture,
        color: 0xdcd289,
    }
};

// Function to create a textured material
function createMaterial(materialName) {
    const textureData = materialTextures[materialName] || {
        map: defaultTexture,
        color: 0x888888
    };
    
    return new THREE.MeshLambertMaterial({
        map: textureData.map,
        color: textureData.color
    });
}

// Function to load a texture for a specific material
function loadTexture(materialName, imageUrl) {
    return new Promise((resolve, reject) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            imageUrl,
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                
                // Update the material texture mapping
                if (materialTextures[materialName]) {
                    materialTextures[materialName].map = texture;
                } else {
                    materialTextures[materialName] = {
                        map: texture,
                        color: 0xffffff
                    };
                }
                resolve(texture);
            },
            undefined,
            (error) => reject(error)
        );
    });
}

// Export the necessary functions and objects
export {
    materialTextures,
    createMaterial,
    loadTexture,
    defaultTexture
}; 