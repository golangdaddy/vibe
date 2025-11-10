import { createMaterial } from './textures.js';

export class Creature {
    constructor(scene, blocks, position = { x: 0, y: 10, z: 0 }) {
        // Create creature geometry
        const bodyGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8);
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        
        // Create materials
        this.material = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
        this.eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        // Create body parts
        this.body = new THREE.Mesh(bodyGeometry, this.material);
        this.leftLeg = new THREE.Mesh(legGeometry, this.material);
        this.rightLeg = new THREE.Mesh(legGeometry, this.material);
        
        // Add eyes for character
        this.leftEye = new THREE.Mesh(eyeGeometry, this.eyeMaterial);
        this.rightEye = new THREE.Mesh(eyeGeometry, this.eyeMaterial);
        
        // Position body parts
        this.leftLeg.position.set(-0.25, -0.5, 0);
        this.rightLeg.position.set(0.25, -0.5, 0);
        this.leftEye.position.set(-0.2, 0.1, 0.4);
        this.rightEye.position.set(0.2, 0.1, 0.4);
        
        // Create creature container
        this.container = new THREE.Group();
        this.container.add(this.body);
        this.container.add(this.leftLeg);
        this.container.add(this.rightLeg);
        this.container.add(this.leftEye);
        this.container.add(this.rightEye);
        
        // Set initial position
        this.container.position.set(position.x, position.y, position.z);
        
        // Add to scene
        scene.add(this.container);
        
        // Physics properties
        this.velocity = {
            x: 0,
            y: 0,
            z: 0
        };
        this.grounded = false;
        this.blocks = blocks;
        this.lastSafePosition = { ...position };
        this.stuckTime = 0;
        this.fallTime = 0;
        
        // Movement properties
        this.hopForce = 0.2;
        this.moveSpeed = 0.1;
        this.gravity = -0.01;
        this.direction = new THREE.Vector3(1, 0, 0);
        this.nextHopTime = 0;
        this.hopInterval = 1000; // Time between hops in milliseconds
        
        // Start animation
        this.animate();
    }
    
    checkCollision() {
        const pos = this.container.position;
        const radius = 0.5; // Creature's radius
        
        // Check blocks in nearby area
        for (let x = Math.floor(pos.x - radius); x <= Math.ceil(pos.x + radius); x++) {
            for (let y = Math.floor(pos.y - 1); y <= Math.ceil(pos.y + radius); y++) {
                for (let z = Math.floor(pos.z - radius); z <= Math.ceil(pos.z + radius); z++) {
                    const key = `${x},${y},${z}`;
                    if (this.blocks.has(key)) {
                        const block = this.blocks.get(key);
                        const blockPos = block.position;
                        
                        // Simple sphere-cube collision check
                        const dx = Math.max(blockPos.x - 0.5 - pos.x, 0, pos.x - (blockPos.x + 0.5));
                        const dy = Math.max(blockPos.y - 0.5 - pos.y, 0, pos.y - (blockPos.y + 0.5));
                        const dz = Math.max(blockPos.z - 0.5 - pos.z, 0, pos.z - (blockPos.z + 0.5));
                        
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        
                        if (distance < radius) {
                            // Collision detected
                            if (dy === 0 && this.velocity.y <= 0) {
                                // Ground collision
                                this.grounded = true;
                                this.velocity.y = 0;
                                this.container.position.y = blockPos.y + 1;
                                this.lastSafePosition = {
                                    x: this.container.position.x,
                                    y: this.container.position.y,
                                    z: this.container.position.z
                                };
                                this.fallTime = 0;
                            }
                            
                            // Wall collisions
                            if (dx > 0) this.direction.x *= -1;
                            if (dz > 0) this.direction.z *= -1;
                            
                            return true;
                        }
                    }
                }
            }
        }
        
        this.grounded = false;
        return false;
    }
    
    hop() {
        if (this.grounded) {
            this.velocity.y = this.hopForce;
            this.velocity.x = this.direction.x * this.moveSpeed;
            this.velocity.z = this.direction.z * this.moveSpeed;
            
            // Animate legs and body
            this.leftLeg.rotation.x = -Math.PI/4;
            this.rightLeg.rotation.x = -Math.PI/4;
            this.body.position.y = 0.1; // Slight body squeeze
            
            setTimeout(() => {
                this.leftLeg.rotation.x = 0;
                this.rightLeg.rotation.x = 0;
                this.body.position.y = 0;
            }, 300);
            
            // Face the direction of movement
            this.container.rotation.y = Math.atan2(this.direction.x, this.direction.z);
        }
    }
    
    checkSanity() {
        const pos = this.container.position;
        
        // Check if creature is stuck
        if (this.grounded && Math.abs(this.velocity.x) < 0.001 && Math.abs(this.velocity.z) < 0.001) {
            this.stuckTime += 1;
            if (this.stuckTime > 100) { // About 2 seconds at 60fps
                this.direction.x = Math.random() - 0.5;
                this.direction.z = Math.random() - 0.5;
                this.direction.normalize();
                this.stuckTime = 0;
            }
        } else {
            this.stuckTime = 0;
        }
        
        // Check if falling too long
        if (!this.grounded) {
            this.fallTime += 1;
            if (this.fallTime > 180) { // About 3 seconds at 60fps
                // Teleport back to last safe position
                this.container.position.set(
                    this.lastSafePosition.x,
                    this.lastSafePosition.y,
                    this.lastSafePosition.z
                );
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.velocity.z = 0;
                this.fallTime = 0;
            }
        }
        
        // Keep within world bounds
        const WORLD_BOUND = 16; // Should match your WORLD_SIZE
        if (Math.abs(pos.x) > WORLD_BOUND/2 || Math.abs(pos.z) > WORLD_BOUND/2) {
            // Turn around if near world edge
            this.direction.x *= -1;
            this.direction.z *= -1;
        }
    }
    
    update() {
        // Apply gravity
        if (!this.grounded) {
            this.velocity.y += this.gravity;
        }
        
        // Update position
        this.container.position.x += this.velocity.x;
        this.container.position.y += this.velocity.y;
        this.container.position.z += this.velocity.z;
        
        // Check collisions
        this.checkCollision();
        
        // Check for problems and fix them
        this.checkSanity();
        
        // Random direction changes (less frequent)
        if (Math.random() < 0.005) {
            const angle = Math.random() * Math.PI * 2;
            this.direction.x = Math.cos(angle);
            this.direction.z = Math.sin(angle);
        }
        
        // Hop periodically
        const now = Date.now();
        if (now > this.nextHopTime && this.grounded) {
            this.hop();
            this.nextHopTime = now + this.hopInterval;
        }
        
        // Apply friction
        if (this.grounded) {
            this.velocity.x *= 0.8;
            this.velocity.z *= 0.8;
        }
    }
    
    animate() {
        this.update();
        requestAnimationFrame(() => this.animate());
    }
} 