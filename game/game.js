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
    const roadWidth = canvas.width - 60; // Excluding grass borders
    const laneWidth = roadWidth / numLanes;
    
    for (let i = 0; i < numLanes; i++) {
        lanes.push(30 + laneWidth * i + laneWidth / 2);
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
    if ((keys['a'] || keys['arrowleft']) && player.x > 10) {
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
    
    // Check if player is on grass and apply penalty
    const onGrass = player.x < 30 || player.x + player.width > canvas.width - 30;
    if (onGrass) {
        // Accumulate penalty points
        grassPenaltyAccumulator += GRASS_PENALTY_PER_FRAME;
        
        // When we've accumulated at least 1 point, deduct it
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
    // Add some padding for more forgiving collision
    const padding = 5;
    return rect1.x + padding < rect2.x + rect2.width - padding &&
           rect1.x + rect1.width - padding > rect2.x + padding &&
           rect1.y + padding < rect2.y + rect2.height - padding &&
           rect1.y + rect1.height - padding > rect2.y + padding;
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
    
    // Draw warning indicator if on grass
    const onGrass = player.x < 30 || player.x + player.width > canvas.width - 30;
    if (onGrass && gameStarted) {
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
    
    // Grass borders
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, 30, canvas.height);
    ctx.fillRect(canvas.width - 30, 0, 30, canvas.height);
    
    // Road surface
    ctx.fillStyle = '#555';
    ctx.fillRect(30, 0, canvas.width - 60, canvas.height);
    
    // Lane markers (draw between each lane)
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    
    const roadWidth = canvas.width - 60;
    const laneWidth = roadWidth / numLanes;
    
    for (let i = 1; i < numLanes; i++) {
        const x = 30 + laneWidth * i;
        ctx.beginPath();
        ctx.moveTo(x, roadY);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Road edges
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, canvas.height);
    ctx.stroke();
    
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
    
    // Windshield
    ctx.fillStyle = '#000';
    if (y === player.y) {
        // Player car - windshield at top
        ctx.fillRect(x + 5, y + 5, width - 10, height * 0.25);
    } else {
        // Traffic cars - windshield at bottom
        ctx.fillRect(x + 5, y + height - height * 0.25 - 5, width - 10, height * 0.25);
    }
    
    // Wheels
    ctx.fillStyle = '#000';
    const wheelWidth = 8;
    const wheelHeight = 15;
    
    // Front wheels
    ctx.fillRect(x - 3, y + 10, wheelWidth, wheelHeight);
    ctx.fillRect(x + width - 5, y + 10, wheelWidth, wheelHeight);
    
    // Back wheels
    ctx.fillRect(x - 3, y + height - 25, wheelWidth, wheelHeight);
    ctx.fillRect(x + width - 5, y + height - 25, wheelWidth, wheelHeight);
    
    // Headlights/taillights
    ctx.fillStyle = y === player.y ? '#FFFF00' : '#FF0000';
    const lightSize = 4;
    if (y === player.y) {
        // Player car - headlights at front
        ctx.fillRect(x + 8, y + 2, lightSize, lightSize);
        ctx.fillRect(x + width - 12, y + 2, lightSize, lightSize);
    } else {
        // Traffic cars - taillights at back
        ctx.fillRect(x + 8, y + height - 6, lightSize, lightSize);
        ctx.fillRect(x + width - 12, y + height - 6, lightSize, lightSize);
    }
    
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

