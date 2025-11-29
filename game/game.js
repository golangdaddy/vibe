// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;
let highScore = localStorage.getItem('carDodgeHighScore') || 0;
let distance = 0;
let carsDodgedCount = 0;
let numLanes = 3;
let lastMilestoneLevel = 0;
let nextLaneMilestone = 50; // First lane at 50 points
let laneMilestoneInterval = 150; // Initial interval between 50 and 200
let lastLaneMilestone = 0;

// Player car - fixed at center bottom, moves between lanes
const player = {
    lane: 1, // Current lane (0 = hard shoulder, 1+ = main lanes)
    lanePosition: 0, // Smooth transition position (-1 to 1)
    width: 40,
    height: 70,
    maxLaneSpeed: 0.15, // Speed of lane changes
    acceleration: 0.3,
    friction: 0.85,
    velocityX: 0,
    color: '#FF0000',
    screenX: canvas.width / 2 - 20, // Fixed screen position
    screenY: canvas.height - 100 // Fixed screen position
};

// Traffic cars - use Z-depth for perspective
let trafficCars = [];
const BASE_TRAFFIC_SPEED = 3;
let trafficSpeed = BASE_TRAFFIC_SPEED;
let spawnTimer = 0;
let spawnInterval = 120;

// Road perspective system
let roadOffset = 0;
const ROAD_DEPTH = 2000; // Maximum Z distance
const HORIZON_Y = canvas.height * 0.3; // Horizon line
const PLAYER_Z = 0; // Player is at Z=0 (closest)
const ROAD_WIDTH = canvas.width - 60; // Road width at player position

// Hard shoulder
let hardShoulderAvailable = false;
let hardShoulderTimer = 0;
const HARD_SHOULDER_ON_DURATION = 5 * 60;
const HARD_SHOULDER_OFF_DURATION = 10 * 60;
const HARD_SHOULDER_WIDTH = 30;

// Grass penalty
let grassPenaltyAccumulator = 0;
const GRASS_PENALTY_PER_SECOND = 20;
const GRASS_PENALTY_PER_FRAME = GRASS_PENALTY_PER_SECOND / 60;

// Input
const keys = {};

// Colors for retro style
const colors = ['#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

// Perspective projection: convert 3D Z position to screen Y
function projectZ(z) {
    // Z increases as objects get further away
    // At Z=0 (player), Y is at bottom
    // At Z=ROAD_DEPTH, Y is at horizon
    const scale = (ROAD_DEPTH - z) / ROAD_DEPTH;
    return HORIZON_Y + (canvas.height - HORIZON_Y) * (1 - scale);
}

// Get lane X position at a given Z depth
function getLaneX(lane, z) {
    const roadWidthAtZ = ROAD_WIDTH * ((ROAD_DEPTH - z) / ROAD_DEPTH);
    const totalLanes = numLanes + (hardShoulderAvailable ? 1 : 0);
    const laneWidth = roadWidthAtZ / totalLanes;
    const startX = (canvas.width - roadWidthAtZ) / 2;
    
    if (lane === 0 && hardShoulderAvailable) {
        // Hard shoulder is to the left
        const shoulderWidth = HARD_SHOULDER_WIDTH * ((ROAD_DEPTH - z) / ROAD_DEPTH);
        return startX - shoulderWidth / 2;
    }
    
    // Main lanes
    const laneIndex = hardShoulderAvailable ? lane - 1 : lane;
    return startX + laneWidth * laneIndex + laneWidth / 2;
}

// Calculate lane positions for player (at Z=0)
function calculateLanes() {
    // Lanes are calculated dynamically based on Z depth
}

// Initialize
function init() {
    document.getElementById('highScoreValue').textContent = highScore;
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if(['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    calculateLanes();
    gameLoop();
}

function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    gameStarted = true;
    gameOver = false;
    score = 0;
    distance = 0;
    carsDodgedCount = 0;
    lastMilestoneLevel = 0;
    nextLaneMilestone = 50;
    laneMilestoneInterval = 150;
    lastLaneMilestone = 0;
    grassPenaltyAccumulator = 0;
    hardShoulderAvailable = false;
    hardShoulderTimer = 0;
    trafficSpeed = BASE_TRAFFIC_SPEED;
    spawnInterval = 120;
    trafficCars = [];
    numLanes = 3;
    player.lane = 1;
    player.lanePosition = 0;
    player.velocityX = 0;
    roadOffset = 0;
}

function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    startGame();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (!gameStarted || gameOver) return;
    
    // Update traffic speed based on score (1 MPH increase per 100 points)
    trafficSpeed = BASE_TRAFFIC_SPEED + (score * 0.0005);
    
    // Update distance
    distance += trafficSpeed;
    
    // Update hard shoulder availability
    hardShoulderTimer++;
    if (hardShoulderAvailable) {
        if (hardShoulderTimer >= HARD_SHOULDER_ON_DURATION) {
            hardShoulderAvailable = false;
            hardShoulderTimer = 0;
        }
    } else {
        if (hardShoulderTimer >= HARD_SHOULDER_OFF_DURATION) {
            hardShoulderAvailable = true;
            hardShoulderTimer = 0;
        }
    }
    
    // Check for traffic frequency milestones every 50 points
    const currentMilestoneLevel = Math.floor(score / 50);
    if (currentMilestoneLevel > lastMilestoneLevel && score > 0) {
        lastMilestoneLevel = currentMilestoneLevel;
        spawnInterval = Math.floor(spawnInterval * 0.88);
        if (spawnInterval < 1) {
            spawnInterval = 1;
        }
    }
    
    // Check for lane milestones: 50, 200, then every 200 points with 50% interval increase
    if (score >= nextLaneMilestone && numLanes < 10) {
        numLanes++;
        const notification = document.getElementById('notification');
        notification.className = '';
        notification.textContent = `NEW LANE! ${numLanes} LANES!`;
        setTimeout(() => {
            notification.className = 'show';
        }, 10);
        
        const scoreElement = document.getElementById('score');
        scoreElement.style.color = '#FFD700';
        setTimeout(() => {
            scoreElement.style.color = '#00FF00';
        }, 500);
        
        // Calculate next milestone with 50% longer interval
        nextLaneMilestone = nextLaneMilestone + laneMilestoneInterval;
        laneMilestoneInterval = Math.floor(laneMilestoneInterval * 1.5);
    }
    
    // Player lane movement (left/right only)
    const maxLane = numLanes - 1 + (hardShoulderAvailable ? 1 : 0);
    
    if (keys['a'] || keys['arrowleft']) {
        if (player.lane > 0) {
            player.lanePosition -= player.maxLaneSpeed;
            if (player.lanePosition <= -1) {
                player.lane--;
                player.lanePosition = 1;
            }
        } else if (player.lane === 0 && hardShoulderAvailable) {
            // Can't go further left
            player.lanePosition = Math.max(-1, player.lanePosition - player.maxLaneSpeed);
        }
    }
    
    if (keys['d'] || keys['arrowright']) {
        if (player.lane < maxLane) {
            player.lanePosition += player.maxLaneSpeed;
            if (player.lanePosition >= 1) {
                player.lane++;
                player.lanePosition = -1;
            }
        } else {
            // Can't go further right
            player.lanePosition = Math.min(1, player.lanePosition + player.maxLaneSpeed);
        }
    }
    
    // Apply friction to lane position
    if (!(keys['a'] || keys['arrowleft'] || keys['d'] || keys['arrowright'])) {
        player.lanePosition *= player.friction;
        if (Math.abs(player.lanePosition) < 0.05) player.lanePosition = 0;
    }
    
    // Check if player is on hard shoulder when not available
    if (player.lane === 0 && !hardShoulderAvailable) {
        grassPenaltyAccumulator += GRASS_PENALTY_PER_FRAME;
        if (grassPenaltyAccumulator >= 1) {
            const pointsToDeduct = Math.floor(grassPenaltyAccumulator);
            score = Math.max(0, score - pointsToDeduct);
            grassPenaltyAccumulator -= pointsToDeduct;
        }
    } else {
        grassPenaltyAccumulator = 0;
    }
    
    // Spawn traffic cars
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnTrafficCar();
    }
    
    // Update traffic cars
    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const car = trafficCars[i];
        // Move car toward player (decrease Z)
        car.z -= trafficSpeed * car.speedMultiplier;
        
        // Check if player has passed the car
        if (!car.passed && car.z < 0) {
            car.passed = true;
            carsDodgedCount++;
            score += 10;
            
            const scoreElement = document.getElementById('score');
            scoreElement.style.animation = 'none';
            setTimeout(() => {
                scoreElement.style.animation = 'pulse 0.3s ease-in-out';
            }, 10);
        }
        
        // Remove cars that are far behind
        if (car.z < -100) {
            trafficCars.splice(i, 1);
        }
        
        // Check collision
        if (checkCollision(player, car)) {
            endGame();
        }
    }
    
    // Update road animation
    roadOffset += trafficSpeed;
    if (roadOffset >= 40) {
        roadOffset = 0;
    }
    
    // Update UI
    document.getElementById('score').textContent = score;
    document.getElementById('speed').textContent = Math.floor(trafficSpeed * 20);
}

function spawnTrafficCar() {
    const maxLane = numLanes - 1 + (hardShoulderAvailable ? 1 : 0);
    const lane = Math.floor(Math.random() * (maxLane + 1));
    
    // Check if lane is clear at spawn distance
    const spawnZ = ROAD_DEPTH;
    const tooClose = trafficCars.some(existingCar => 
        existingCar.lane === lane && Math.abs(existingCar.z - spawnZ) < 200
    );
    
    if (!tooClose) {
        const speedVariation = 0.97 + Math.random() * 0.06;
        const car = {
            lane: lane,
            z: spawnZ,
            width: 40,
            height: 70,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedMultiplier: speedVariation,
            passed: false
        };
        trafficCars.push(car);
    }
}

function checkCollision(player, car) {
    // Project car to screen space
    const carY = projectZ(car.z);
    const carX = getLaneX(car.lane, car.z) - car.width / 2;
    
    // Player position - centered, with lane offset
    const laneWidth = ROAD_WIDTH / (numLanes + (hardShoulderAvailable ? 1 : 0));
    const playerX = getLaneX(player.lane, 0) + (player.lanePosition * laneWidth) - player.width / 2;
    const playerY = player.screenY;
    
    // Collision box with padding
    const paddingLeft = 3;
    const paddingRight = 3;
    const paddingTop = 8;
    const paddingBottom = 3;
    
    const playerLeft = playerX + paddingLeft;
    const playerRight = playerX + player.width - paddingRight;
    const playerTop = playerY + paddingTop;
    const playerBottom = playerY + player.height - paddingBottom;
    
    const carLeft = carX + paddingLeft;
    const carRight = carX + car.width - paddingRight;
    const carTop = carY + paddingTop;
    const carBottom = carY + car.height - paddingBottom;
    
    return playerLeft < carRight &&
           playerRight > carLeft &&
           playerTop < carBottom &&
           playerBottom > carTop;
}

function endGame() {
    gameOver = true;
    gameStarted = false;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('carDodgeHighScore', highScore);
    }
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalDistance').textContent = Math.floor(distance / 10);
    document.getElementById('carsDodged').textContent = carsDodgedCount;
    document.getElementById('gameOver').style.display = 'flex';
    
    canvas.style.animation = 'shake 0.5s';
    setTimeout(() => {
        canvas.style.animation = '';
    }, 500);
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98D8E8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, HORIZON_Y);
    
    // Draw road with perspective
    drawRoad();
    
    // Draw traffic cars
    trafficCars.forEach(car => {
        drawTrafficCar(car);
    });
    
    // Draw player car - centered based on lane
    const playerLaneX = getLaneX(player.lane, 0);
    const laneWidth = ROAD_WIDTH / (numLanes + (hardShoulderAvailable ? 1 : 0));
    const playerX = playerLaneX + (player.lanePosition * laneWidth) - player.width / 2;
    drawCar(playerX, player.screenY, player.width, player.height, player.color);
    
    // Draw warning if on closed hard shoulder
    if (player.lane === 0 && !hardShoulderAvailable && gameStarted) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(player.screenX - 3, player.screenY - 3, player.width + 6, player.height + 6);
        
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('HARD SHOULDER CLOSED! -20/sec', canvas.width / 2, 50);
    }
}

function drawRoad() {
    // Draw road segments with perspective
    const segmentCount = 50;
    
    for (let i = 0; i < segmentCount; i++) {
        const z = (i / segmentCount) * ROAD_DEPTH;
        const y = projectZ(z);
        const nextZ = ((i + 1) / segmentCount) * ROAD_DEPTH;
        const nextY = projectZ(nextZ);
        
        if (y > canvas.height) continue;
        if (nextY < HORIZON_Y) break;
        
        const roadWidth = ROAD_WIDTH * ((ROAD_DEPTH - z) / ROAD_DEPTH);
        const nextRoadWidth = ROAD_WIDTH * ((ROAD_DEPTH - nextZ) / ROAD_DEPTH);
        const x = (canvas.width - roadWidth) / 2;
        const nextX = (canvas.width - nextRoadWidth) / 2;
        
        // Road surface
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nextX, nextY);
        ctx.lineTo(nextX + nextRoadWidth, nextY);
        ctx.lineTo(x + roadWidth, y);
        ctx.closePath();
        ctx.fill();
        
        // Lane markers
        if (i % 2 === 0) {
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            
            const laneWidth = roadWidth / numLanes;
            for (let l = 1; l < numLanes; l++) {
                const laneX = x + laneWidth * l;
                const nextLaneX = nextX + (nextRoadWidth / numLanes) * l;
                ctx.beginPath();
                ctx.moveTo(laneX, y);
                ctx.lineTo(nextLaneX, nextY);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }
        
        // Hard shoulder
        if (hardShoulderAvailable) {
            ctx.fillStyle = '#00FF00';
            const shoulderWidth = HARD_SHOULDER_WIDTH * ((ROAD_DEPTH - z) / ROAD_DEPTH);
            const nextShoulderWidth = HARD_SHOULDER_WIDTH * ((ROAD_DEPTH - nextZ) / ROAD_DEPTH);
            ctx.beginPath();
            ctx.moveTo(x - shoulderWidth, y);
            ctx.lineTo(nextX - nextShoulderWidth, nextY);
            ctx.lineTo(nextX, nextY);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = '#FF0000';
            const shoulderWidth = HARD_SHOULDER_WIDTH * ((ROAD_DEPTH - z) / ROAD_DEPTH);
            const nextShoulderWidth = HARD_SHOULDER_WIDTH * ((ROAD_DEPTH - nextZ) / ROAD_DEPTH);
            ctx.beginPath();
            ctx.moveTo(x - shoulderWidth, y);
            ctx.lineTo(nextX - nextShoulderWidth, nextY);
            ctx.lineTo(nextX, nextY);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.fill();
        }
        
        // Right grass border
        ctx.fillStyle = '#2d5016';
        const grassWidth = 30 * ((ROAD_DEPTH - z) / ROAD_DEPTH);
        const nextGrassWidth = 30 * ((ROAD_DEPTH - nextZ) / ROAD_DEPTH);
        ctx.beginPath();
        ctx.moveTo(x + roadWidth, y);
        ctx.lineTo(nextX + nextRoadWidth, nextY);
        ctx.lineTo(nextX + nextRoadWidth + nextGrassWidth, nextY);
        ctx.lineTo(x + roadWidth + grassWidth, y);
        ctx.closePath();
        ctx.fill();
    }
}

function drawTrafficCar(car) {
    const carY = projectZ(car.z);
    const carX = getLaneX(car.lane, car.z) - car.width / 2;
    
    // Only draw if on screen
    if (carY < HORIZON_Y || carY > canvas.height) return;
    
    // Scale car based on distance
    const scale = (ROAD_DEPTH - car.z) / ROAD_DEPTH;
    const scaledWidth = car.width * scale;
    const scaledHeight = car.height * scale;
    
    drawCar(carX, carY, scaledWidth, scaledHeight, car.color);
}

function drawCar(x, y, width, height, color) {
    // Car body
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    
    // Car outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Windshield at bottom (front)
    ctx.fillStyle = '#000';
    ctx.fillRect(x + width * 0.125, y + height - height * 0.25 - height * 0.125, width * 0.75, height * 0.25);
    
    // Wheels
    ctx.fillStyle = '#000';
    const wheelWidth = width * 0.2;
    const wheelHeight = height * 0.2;
    
    // Front wheels at bottom
    ctx.fillRect(x - width * 0.075, y + height - height * 0.35, wheelWidth, wheelHeight);
    ctx.fillRect(x + width - wheelWidth + width * 0.075, y + height - height * 0.35, wheelWidth, wheelHeight);
    
    // Back wheels at top
    ctx.fillRect(x - width * 0.075, y + height * 0.15, wheelWidth, wheelHeight);
    ctx.fillRect(x + width - wheelWidth + width * 0.075, y + height * 0.15, wheelWidth, wheelHeight);
    
    // Headlights at front (bottom)
    ctx.fillStyle = '#FFFF00';
    const lightSize = width * 0.1;
    ctx.fillRect(x + width * 0.2, y + height - lightSize - height * 0.05, lightSize, lightSize);
    ctx.fillRect(x + width - lightSize - width * 0.2, y + height - lightSize - height * 0.05, lightSize, lightSize);
    
    // Taillights at back (top)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x + width * 0.2, y + height * 0.05, lightSize, lightSize);
    ctx.fillRect(x + width - lightSize - width * 0.2, y + height * 0.05, lightSize, lightSize);
    
    // Glow effect for player
    if (y === player.screenY) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
        ctx.shadowBlur = 0;
    }
}

// Start the game
init();

