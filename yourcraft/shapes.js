// Shape system constants
const BLOCK_SIZE = 1;

// Create geometries for different shapes
const geometries = {
    cube: createCubeGeometry(),
    sphere: createSphereGeometry(),
    ramp: createRampGeometry(),
    pyramid: createPyramidGeometry(),
    cone: createConeGeometry(),
    cylinder: createCylinderGeometry(),
    stairs: createStairsGeometry(),
    arch: createArchGeometry()
};

// Basic shapes
function createCubeGeometry() {
    return new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function createSphereGeometry() {
    return new THREE.SphereGeometry(BLOCK_SIZE * 0.5, 16, 12);
}

function createConeGeometry() {
    return new THREE.ConeGeometry(BLOCK_SIZE * 0.5, BLOCK_SIZE, 16);
}

function createCylinderGeometry() {
    return new THREE.CylinderGeometry(BLOCK_SIZE * 0.5, BLOCK_SIZE * 0.5, BLOCK_SIZE, 16);
}

function createPyramidGeometry() {
    return new THREE.ConeGeometry(BLOCK_SIZE * 0.5, BLOCK_SIZE, 4);
}

// Complex shapes
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

function createStairsGeometry() {
    const steps = 4;
    const stepHeight = BLOCK_SIZE / steps;
    const stepDepth = BLOCK_SIZE / steps;
    
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    
    // Create vertices for each step
    for (let i = 0; i < steps; i++) {
        const y = i * stepHeight;
        const z = i * stepDepth - BLOCK_SIZE/2;
        
        // Front face of step
        vertices.push(
            -BLOCK_SIZE/2, y, z,
            BLOCK_SIZE/2, y, z,
            BLOCK_SIZE/2, y + stepHeight, z,
            -BLOCK_SIZE/2, y + stepHeight, z
        );
        
        // Top face of step
        vertices.push(
            -BLOCK_SIZE/2, y + stepHeight, z,
            BLOCK_SIZE/2, y + stepHeight, z,
            BLOCK_SIZE/2, y + stepHeight, z + stepDepth,
            -BLOCK_SIZE/2, y + stepHeight, z + stepDepth
        );
    }
    
    // Create indices for triangles
    for (let i = 0; i < steps * 8; i += 4) {
        // Front face
        indices.push(i, i + 1, i + 2);
        indices.push(i, i + 2, i + 3);
        // Top face
        indices.push(i + 4, i + 5, i + 6);
        indices.push(i + 4, i + 6, i + 7);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
}

function createArchGeometry() {
    const archSegments = 8;
    const archRadius = BLOCK_SIZE * 0.5;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    
    // Create arch vertices
    for (let i = 0; i <= archSegments; i++) {
        const angle = (Math.PI / archSegments) * i;
        const x = Math.cos(angle) * archRadius;
        const y = Math.sin(angle) * archRadius + archRadius;
        
        // Front vertices
        vertices.push(-BLOCK_SIZE/2, y, x + BLOCK_SIZE/2);
        vertices.push(BLOCK_SIZE/2, y, x + BLOCK_SIZE/2);
        
        // Create indices for the arch segments
        if (i < archSegments) {
            const baseIndex = i * 2;
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex + 1, baseIndex + 3, baseIndex + 2
            );
        }
    }
    
    // Add pillars
    const pillarVertices = [
        // Left pillar
        -BLOCK_SIZE/2, 0, -BLOCK_SIZE/2,
        -BLOCK_SIZE/2, archRadius, -BLOCK_SIZE/2,
        BLOCK_SIZE/2, 0, -BLOCK_SIZE/2,
        BLOCK_SIZE/2, archRadius, -BLOCK_SIZE/2,
        
        // Right pillar
        -BLOCK_SIZE/2, 0, BLOCK_SIZE/2,
        -BLOCK_SIZE/2, archRadius, BLOCK_SIZE/2,
        BLOCK_SIZE/2, 0, BLOCK_SIZE/2,
        BLOCK_SIZE/2, archRadius, BLOCK_SIZE/2
    ];
    
    vertices.push(...pillarVertices);
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
}

// Export the geometries and functions
export {
    geometries,
    BLOCK_SIZE
}; 