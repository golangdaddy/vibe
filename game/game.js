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

// Player car
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 120,
    width: 40,
    height: 70,
    speed: 5,
    color: '#FF0000'
};

// Traffic cars
let trafficCars = [];
const BASE_TRAFFIC_SPEED = 3;
let trafficSpeed = BASE_TRAFFIC_SPEED;
let spawnTimer = 0;
let spawnInterval = 120; // Start slower

// Road
let roadY = 0;
const roadSpeed = 5;
let lanes = [];

// Hard shoulder (left lane)
let hardShoulderAvailable = false;
let hardShoulderTimer = 0;
const HARD_SHOULDER_ON_DURATION = 5 * 60; // 5 seconds at 60 FPS
const HARD_SHOULDER_OFF_DURATION = 10 * 60; // 10 seconds at 60 FPS
const HARD_SHOULDER_WIDTH = 30; // Same as grass border width

// Grass penalty
let grassPenaltyAccumulator = 0;
const GRASS_PENALTY_PER_SECOND = 20;
const GRASS_PENALTY_PER_FRAME = GRASS_PENALTY_PER_SECOND / 60; // Assuming 60 FPS

// Input
const keys = {};

// Colors for retro style
const colors = ['#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

// Calculate lane positions based on number of lanes
function calculateLanes() {
    lanes = [];
    const roadWidth = canvas.width - HARD_SHOULDER_WIDTH - 30; // Excluding hard shoulder and right grass border
    const laneWidth = roadWidth / numLanes;
    
    for (let i = 0; i < numLanes; i++) {
        lanes.push(HARD_SHOULDER_WIDTH + laneWidth * i + laneWidth / 2);
    }
}

// Initialize
function init() {
    document.getElementById('highScoreValue').textContent = highScore;
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        // Prevent arrow key scrolling
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
    grassPenaltyAccumulator = 0;
    hardShoulderAvailable = false;
    hardShoulderTimer = 0;
    trafficSpeed = BASE_TRAFFIC_SPEED;
    spawnInterval = 120;
    trafficCars = [];
    numLanes = 3;
    calculateLanes();
    player.x = canvas.width / 2 - 20;
    player.y = canvas.height - 120;
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
    // Since speed display multiplies by 20, we need to add score/100/20
    trafficSpeed = BASE_TRAFFIC_SPEED + (score * 0.0005);
    
    // Update distance
    distance += trafficSpeed;
    
    // Update hard shoulder availability (5 seconds on, 10 seconds off)
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
        
        // Reduce spawn interval by 15% each milestone (exponential increase)
        spawnInterval = Math.floor(spawnInterval * 0.85);
        // Ensure spawn interval doesn't go below 1 frame
        if (spawnInterval < 1) {
            spawnInterval = 1;
        }
    }
    
    // Check for lane milestones with exponentially increasing intervals
    if (score >= nextLaneMilestone && numLanes < 10) {
        numLanes++;
        calculateLanes();
        
        // Show notification only when lane is added
        const notification = document.getElementById('notification');
        notification.className = ''; // Remove previous animation
        notification.textContent = `NEW LANE! ${numLanes} LANES!`;
        setTimeout(() => {
            notification.className = 'show';
        }, 10);
        
        // Gold flash for score at milestone
        const scoreElement = document.getElementById('score');
        scoreElement.style.color = '#FFD700';
        setTimeout(() => {
            scoreElement.style.color = '#00FF00';
        }, 500);
        
        // Calculate next milestone using current interval, then increase interval by 50%
        nextLaneMilestone = nextLaneMilestone + laneMilestoneInterval;
        laneMilestoneInterval = Math.floor(laneMilestoneInterval * 1.5);
    } else if (score >= nextLaneMilestone && numLanes >= 10) {
        // Show max lanes notification once
        const notification = document.getElementById('notification');
        notification.className = '';
        notification.textContent = `MAX LANES!`;
        setTimeout(() => {
            notification.className = 'show';
        }, 10);
        
        // Set next milestone very high so this doesn't trigger again
        nextLaneMilestone = 999999;
    }
    
    // Player movement
    // Allow hard shoulder when available, otherwise minimum x is hard shoulder width
    const minX = hardShoulderAvailable ? 0 : HARD_SHOULDER_WIDTH;
    if ((keys['a'] || keys['arrowleft']) && player.x > minX) {
        player.x -= player.speed;
    }
    if ((keys['d'] || keys['arrowright']) && player.x < canvas.width - player.width - 10) {
        player.x += player.speed;
    }
    if ((keys['w'] || keys['arrowup']) && player.y > 50) {
        player.y -= player.speed;
    }
    if ((keys['s'] || keys['arrowdown']) && player.y < canvas.height - player.height - 10) {
        player.y += player.speed;
    }
    
    // Check if player is on hard shoulder when not available
    const onHardShoulder = player.x < HARD_SHOULDER_WIDTH;
    if (onHardShoulder && !hardShoulderAvailable) {
        // Apply same penalty as grass when hard shoulder is closed
        grassPenaltyAccumulator += GRASS_PENALTY_PER_FRAME;
        
        // When we've accumulated at least 1 point, deduct it
        if (grassPenaltyAccumulator >= 1) {
            const pointsToDeduct = Math.floor(grassPenaltyAccumulator);
            score = Math.max(0, score - pointsToDeduct);
            grassPenaltyAccumulator -= pointsToDeduct;
        }
    } else if (player.x + player.width > canvas.width - 30) {
        // Check if player is on right grass border
        grassPenaltyAccumulator += GRASS_PENALTY_PER_FRAME;
        
        if (grassPenaltyAccumulator >= 1) {
            const pointsToDeduct = Math.floor(grassPenaltyAccumulator);
            score = Math.max(0, score - pointsToDeduct);
            grassPenaltyAccumulator -= pointsToDeduct;
        }
    } else {
        grassPenaltyAccumulator = 0;
    }
    
    // Spawn traffic cars randomly
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        // Spawn one random car
        spawnTrafficCar();
    }
    
    // Update traffic cars
    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const car = trafficCars[i];
        car.y += trafficSpeed;
        
        // Check if player has passed the car's center
        if (!car.passed) {
            const playerCenterY = player.y + player.height / 2;
            const carCenterY = car.y + car.height / 2;
            
            // Player has passed if their center is above the car's center
            if (playerCenterY < carCenterY) {
                car.passed = true;
                carsDodgedCount++;
                score += 10; // Award 10 points per car passed
                
                // Visual feedback for scoring
                const scoreElement = document.getElementById('score');
                scoreElement.style.animation = 'none';
                setTimeout(() => {
                    scoreElement.style.animation = 'pulse 0.3s ease-in-out';
                }, 10);
            }
        }
        
        // Remove cars that are off screen
        if (car.y > canvas.height) {
            trafficCars.splice(i, 1);
        }
        
        // Check collision
        if (checkCollision(player, car)) {
            endGame();
        }
    }
    
    // Update road animation
    roadY += roadSpeed;
    if (roadY >= 40) {
        roadY = 0;
    }
    
    // Update UI
    document.getElementById('score').textContent = score;
    document.getElementById('speed').textContent = Math.floor(trafficSpeed * 20);
    
    // Update hard shoulder status
    const hardShoulderStatusEl = document.getElementById('hardShoulderStatus');
    const hardShoulderTextEl = document.getElementById('hardShoulderText');
    if (gameStarted) {
        hardShoulderStatusEl.style.display = 'block';
        if (hardShoulderAvailable) {
            hardShoulderTextEl.textContent = 'OPEN';
            hardShoulderTextEl.style.color = '#00FF00';
        } else {
            hardShoulderTextEl.textContent = 'CLOSED';
            hardShoulderTextEl.style.color = '#FF0000';
        }
    } else {
        hardShoulderStatusEl.style.display = 'none';
    }
}

function spawnTrafficCar() {
    // Pick a random lane
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    
    // Check if this lane is clear enough at the spawn point
    const tooClose = trafficCars.some(existingCar => 
        Math.abs(existingCar.x - (lane - 20)) < 45 && existingCar.y < 150
    );
    
    // Spawn car if lane is clear, otherwise skip this spawn attempt
    if (!tooClose) {
        const car = {
            x: lane - 20,
            y: -80,
            width: 40,
            height: 70,
            color: colors[Math.floor(Math.random() * colors.length)],
            passed: false // Track if player has passed this car
        };
        trafficCars.push(car);
    }
}

function checkCollision(rect1, rect2) {
    // Collision box is much smaller than sprite for very forgiving gameplay
    // Cars are 40x70px, so 3px padding = ~15% width reduction, ~9% height reduction
    const padding = 3; // 3px on each side = 6px total reduction per dimension
    
    // Calculate effective collision box (smaller than sprite)
    const rect1Left = rect1.x + padding;
    const rect1Right = rect1.x + rect1.width - padding;
    const rect1Top = rect1.y + padding;
    const rect1Bottom = rect1.y + rect1.height - padding;
    
    const rect2Left = rect2.x + padding;
    const rect2Right = rect2.x + rect2.width - padding;
    const rect2Top = rect2.y + padding;
    const rect2Bottom = rect2.y + rect2.height - padding;
    
    // Check if collision boxes overlap
    return rect1Left < rect2Right &&
           rect1Right > rect2Left &&
           rect1Top < rect2Bottom &&
           rect1Bottom > rect2Top;
}

function endGame() {
    gameOver = true;
    gameStarted = false;
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('carDodgeHighScore', highScore);
    }
    
    // Show game over screen
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalDistance').textContent = Math.floor(distance / 10);
    document.getElementById('carsDodged').textContent = carsDodgedCount;
    document.getElementById('gameOver').style.display = 'flex';
    
    // Screen shake effect
    canvas.style.animation = 'shake 0.5s';
    setTimeout(() => {
        canvas.style.animation = '';
    }, 500);
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw road
    drawRoad();
    
    // Draw traffic cars
    trafficCars.forEach(car => {
        drawCar(car.x, car.y, car.width, car.height, car.color);
    });
    
    // Draw player car
    drawCar(player.x, player.y, player.width, player.height, player.color);
    
    // Draw warning indicator if on grass or hard shoulder when closed
    const onHardShoulder = player.x < HARD_SHOULDER_WIDTH;
    const onRightGrass = player.x + player.width > canvas.width - 30;
    
    if (onHardShoulder && !hardShoulderAvailable && gameStarted) {
        // Draw red warning border around player car
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(player.x - 3, player.y - 3, player.width + 6, player.height + 6);
        
        // Draw warning text
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('HARD SHOULDER CLOSED! -20/sec', canvas.width / 2, 50);
    } else if (onRightGrass && gameStarted) {
        // Draw red warning border around player car
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(player.x - 3, player.y - 3, player.width + 6, player.height + 6);
        
        // Draw warning text
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('ON GRASS! -20/sec', canvas.width / 2, 50);
    }
}

function drawRoad() {
    // Road background
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Hard shoulder (left lane) - very obvious visual
    if (hardShoulderAvailable) {
        // Available - bright green with yellow stripes
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(0, 0, HARD_SHOULDER_WIDTH, canvas.height);
        
        // Draw bright yellow diagonal stripes
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 4;
        ctx.setLineDash([15, 15]);
        for (let i = -20; i < canvas.height + 20; i += 25) {
            ctx.beginPath();
            ctx.moveTo(0, i + roadY);
            ctx.lineTo(HARD_SHOULDER_WIDTH, i + roadY - 12);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        // Add text indicator
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(HARD_SHOULDER_WIDTH / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('OPEN', 0, 0);
        ctx.restore();
    } else {
        // Not available - bright red with X pattern
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(0, 0, HARD_SHOULDER_WIDTH, canvas.height);
        
        // Draw bold white X pattern
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        for (let i = 0; i < canvas.height; i += 25) {
            ctx.beginPath();
            ctx.moveTo(0, i + roadY);
            ctx.lineTo(HARD_SHOULDER_WIDTH, i + roadY + 12);
            ctx.moveTo(HARD_SHOULDER_WIDTH, i + roadY);
            ctx.lineTo(0, i + roadY + 12);
            ctx.stroke();
        }
        
        // Add text indicator
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(HARD_SHOULDER_WIDTH / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('CLOSED', 0, 0);
        ctx.restore();
    }
    
    // Grass border on right only
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(canvas.width - 30, 0, 30, canvas.height);
    
    // Main road surface (starts after hard shoulder)
    ctx.fillStyle = '#555';
    ctx.fillRect(HARD_SHOULDER_WIDTH, 0, canvas.width - HARD_SHOULDER_WIDTH - 30, canvas.height);
    
    // Lane markers (draw between each lane)
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    
    const roadWidth = canvas.width - HARD_SHOULDER_WIDTH - 30;
    const laneWidth = roadWidth / numLanes;
    
    for (let i = 1; i < numLanes; i++) {
        const x = HARD_SHOULDER_WIDTH + laneWidth * i;
        ctx.beginPath();
        ctx.moveTo(x, roadY);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Road edges
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    // Left edge (between hard shoulder and main road) - make it very visible
    ctx.beginPath();
    ctx.moveTo(HARD_SHOULDER_WIDTH, 0);
    ctx.lineTo(HARD_SHOULDER_WIDTH, canvas.height);
    ctx.stroke();
    
    // Right edge
    ctx.beginPath();
    ctx.moveTo(canvas.width - 30, 0);
    ctx.lineTo(canvas.width - 30, canvas.height);
    ctx.stroke();
}

function drawCar(x, y, width, height, color) {
    // Car body
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    
    // Car outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Windshield - all cars have windshield at bottom (front)
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 5, y + height - height * 0.25 - 5, width - 10, height * 0.25);
    
    // Wheels - all cars have same orientation
    ctx.fillStyle = '#000';
    const wheelWidth = 8;
    const wheelHeight = 15;
    
    // Front wheels at bottom
    ctx.fillRect(x - 3, y + height - 25, wheelWidth, wheelHeight);
    ctx.fillRect(x + width - 5, y + height - 25, wheelWidth, wheelHeight);
    
    // Back wheels at top
    ctx.fillRect(x - 3, y + 10, wheelWidth, wheelHeight);
    ctx.fillRect(x + width - 5, y + 10, wheelWidth, wheelHeight);
    
    // Headlights/taillights - all cars have same orientation
    const lightSize = 4;
    // Headlights at front (bottom)
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(x + 8, y + height - 6, lightSize, lightSize);
    ctx.fillRect(x + width - 12, y + height - 6, lightSize, lightSize);
    
    // Taillights at back (top)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x + 8, y + 2, lightSize, lightSize);
    ctx.fillRect(x + width - 12, y + 2, lightSize, lightSize);
    
    // Add glow effect for player
    if (y === player.y) {
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

