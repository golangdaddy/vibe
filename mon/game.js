const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Constants
const TILE_SIZE = 25;
const COLS = 32; // 800 / 25
const ROWS = 24; // 600 / 25
const MOVEMENT_SPEED = 5; // Pixels per frame

// Game State
const STATE = {
    START_MENU: 'START_MENU',
    ROAMING: 'ROAMING',
    BATTLING: 'BATTLING',
    INVENTORY: 'INVENTORY',
    POKEDEX: 'POKEDEX',
    SHOP: 'SHOP'
};

let currentState = STATE.START_MENU;
let playerName = "Red";

// Assets
const COLORS = {
    GRASS: '#7CFC00',
    WATER: '#00BFFF',
    FIRE: '#FF4500', // Magma/Fire ground
    CAVE: '#3a3a3a', // Dark Grey for Cave
    TUNNEL: '#000000', // Tunnel entrance/exit
    SHOP: '#FFD700', // Gold Shop tile
    WALL: '#444',
    PLAYER: '#FF0000',
    POKEMON: '#FFD700'
};

// Current Map Data
let currentMapType = 'OVERWORLD'; // 'OVERWORLD' or 'CAVE'
let map = [];

// Map Generation Functions
function generateOverworld() {
    const newMap = [];
    for (let y = 0; y < ROWS; y++) {
        const row = [];
        for (let x = 0; x < COLS; x++) {
            // Borders
            if (x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1) {
                row.push(1); // Wall
                continue;
            }

            // Biomes
            let type = 0; // Default Grass
            
            // Right half is split into Water and Fire
            if (x > COLS / 2) {
                if (y < ROWS / 2) {
                    type = 2; // Water
                } else {
                    type = 3; // Fire
                }
            }

            // Random obstacles
            if (Math.random() > 0.92) {
                row.push(1); 
            } else {
                row.push(type);
            }
        }
        newMap.push(row);
    }
    
    // Add Tunnel Entrance (e.g., top-leftish)
    newMap[5][5] = 4; // 4 = Tunnel

    // Add Shop (near start)
    newMap[8][8] = 6; // 6 = Shop
    return newMap;
}

function generateCave() {
    const newMap = [];
    for (let y = 0; y < ROWS; y++) {
        const row = [];
        for (let x = 0; x < COLS; x++) {
            // Borders
            if (x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1) {
                row.push(1); // Wall
                continue;
            }

            // Cave Floor (5) vs Wall (1)
            if (Math.random() > 0.85) {
                row.push(1); // Wall/Rock
            } else {
                row.push(5); // Cave Floor
            }
        }
        newMap.push(row);
    }
    
    // Add Tunnel Exit (match entrance position roughly)
    newMap[5][5] = 4; // 4 = Tunnel Back
    return newMap;
}

// Initialize Map
if (!map || map.length === 0) {
    map = generateOverworld();
}

// POKEDEX is now loaded from pokedex.js

// Player (Initialized empty, set on New Game/Load)
let player = {
    x: TILE_SIZE * 2,
    y: TILE_SIZE * 2,
    targetX: TILE_SIZE * 2,
    targetY: TILE_SIZE * 2,
    moving: false,
    team: [], // Empty initially
    inventory: {
        pokeBalls: 0,
        greatBalls: 0,
        ultraBalls: 0,
        potions: 0
    },
    money: 0
};

// Input
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Battle Variables
let currentEnemy = null;
let wasForcedSwitch = false;

// UI Elements
const startScreen = document.getElementById('start-screen');
const saveSlotsEl = document.getElementById('save-slots');
const nameInput = document.getElementById('player-name-input');
const btnNewGame = document.getElementById('btn-new-game');
const modalOverlay = document.getElementById('modal-overlay');

const battleUI = document.getElementById('battle-ui');
const enemyNameEl = document.getElementById('enemy-name');
const enemyHpBar = document.getElementById('enemy-hp-bar');
const enemyImg = document.getElementById('enemy-img');
const playerNameEl = document.getElementById('player-mon-name');
const playerHpBar = document.getElementById('player-hp-bar');
const playerImg = document.getElementById('player-img');
const battleLog = document.getElementById('battle-log');
const battleMenu = document.getElementById('battle-menu');
const bagMenu = document.getElementById('bag-menu');

// Inventory UI Elements
const inventoryUI = document.getElementById('inventory-ui');
const pokemonListEl = document.getElementById('pokemon-list');
const btnToggleInv = document.getElementById('btn-toggle-inv');
const btnCloseInv = document.getElementById('btn-close-inv');
const btnSaveGame = document.getElementById('btn-save-game');

// Pokedex UI Elements
const pokedexUI = document.getElementById('pokedex-ui');
const pokedexListEl = document.getElementById('pokedex-list');
const btnToggleDex = document.getElementById('btn-toggle-dex');
const btnCloseDex = document.getElementById('btn-close-dex');

// Shop UI Elements
const shopUI = document.getElementById('shop-ui');
const shopMoneyEl = document.getElementById('shop-money');
const btnCloseShop = document.getElementById('btn-close-shop');
const btnBuyBall = document.getElementById('btn-buy-ball');
const btnBuyGreatBall = document.getElementById('btn-buy-greatball');
const btnBuyUltraBall = document.getElementById('btn-buy-ultraball');
const btnBuyPotion = document.getElementById('btn-buy-potion');

// Battle Buttons
document.getElementById('btn-attack').addEventListener('click', attack);
document.getElementById('btn-switch').addEventListener('click', openSwitchMenu);
document.getElementById('btn-bag').addEventListener('click', openBagMenu);
document.getElementById('btn-run').addEventListener('click', runAway);

// Bag Buttons
document.getElementById('btn-use-ball').addEventListener('click', () => useItem('ball'));
document.getElementById('btn-use-greatball').addEventListener('click', () => useItem('greatball'));
document.getElementById('btn-use-ultraball').addEventListener('click', () => useItem('ultraball'));
document.getElementById('btn-use-potion').addEventListener('click', () => useItem('potion'));
document.getElementById('btn-cancel-bag').addEventListener('click', closeBagMenu);

// Inventory Buttons
btnToggleInv.addEventListener('click', toggleInventory);
btnCloseInv.addEventListener('click', closeInventory);
btnSaveGame.addEventListener('click', saveGame);

// Pokedex Buttons
btnToggleDex.addEventListener('click', togglePokedex);
btnCloseDex.addEventListener('click', closePokedex);

// Shop Buttons
btnCloseShop.addEventListener('click', closeShop);
btnBuyBall.addEventListener('click', () => buyItem('ball', 10));
btnBuyGreatBall.addEventListener('click', () => buyItem('greatball', 50));
btnBuyUltraBall.addEventListener('click', () => buyItem('ultraball', 150));
btnBuyPotion.addEventListener('click', () => buyItem('potion', 300));

// Overlay Click
modalOverlay.addEventListener('click', closeAllModals);

// Start Screen Buttons
btnNewGame.addEventListener('click', startNewGame);

function initStartScreen() {
    renderSaveSlots();
}

function renderSaveSlots() {
    saveSlotsEl.innerHTML = '';
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pokemon_save_')) {
                const name = key.replace('pokemon_save_', '');
                const div = document.createElement('div');
                div.className = 'save-slot';
                div.innerText = `Load Profile: ${name}`;
                div.addEventListener('click', () => loadGame(name));
                saveSlotsEl.appendChild(div);
            }
        }
    } catch (e) {
        console.error("Local Storage Error:", e);
        saveSlotsEl.innerHTML = '<div style="color:red;">Error accessing saves.</div>';
    }
    
    if (saveSlotsEl.children.length === 0) {
        saveSlotsEl.innerHTML = '<div style="color:#888;">No saved games found.</div>';
    }
}

function startNewGame() {
    if (typeof POKEDEX === 'undefined' || !POKEDEX || POKEDEX.length === 0) {
        alert("Error: Pokedex data not loaded. Please check pokedex.js.");
        return;
    }

    const name = nameInput.value.trim();
    if (!name) {
        alert("Please enter a name!");
        return;
    }
    
    if (localStorage.getItem(`pokemon_save_${name}`)) {
        if (!confirm(`Overwrite existing save for "${name}"?`)) return;
    }
    
    playerName = name;
    
    player = {
        x: TILE_SIZE * 2,
        y: TILE_SIZE * 2,
        targetX: TILE_SIZE * 2,
        targetY: TILE_SIZE * 2,
        moving: false,
        team: [ { ...POKEDEX[0] } ],
        inventory: { pokeBalls: 10, greatBalls: 0, ultraBalls: 0, potions: 5 },
        money: 1000
    };
    
    currentMapType = 'OVERWORLD';
    map = generateOverworld();
    
    currentState = STATE.ROAMING;
    startScreen.classList.add('hidden');
    
    btnToggleInv.classList.remove('hidden');
    btnToggleDex.classList.remove('hidden');
}

function saveGame() {
    if (currentState === STATE.BATTLING) return;
    
    const saveData = {
        player: player,
        currentMapType: currentMapType,
        map: map
    };
    
    localStorage.setItem(`pokemon_save_${playerName}`, JSON.stringify(saveData));
    alert("Game Saved!");
}

function loadGame(name) {
    const json = localStorage.getItem(`pokemon_save_${name}`);
    if (!json) return;
    
    const data = JSON.parse(json);
    
    playerName = name;
    player = data.player;
    
    // Migration: Map old 'balls' to 'pokeBalls' if needed
    if (player.inventory.balls !== undefined) {
        player.inventory.pokeBalls = (player.inventory.pokeBalls || 0) + player.inventory.balls;
        delete player.inventory.balls;
    }
    // Ensure other ball types exist
    if (player.inventory.greatBalls === undefined) player.inventory.greatBalls = 0;
    if (player.inventory.ultraBalls === undefined) player.inventory.ultraBalls = 0;

    currentMapType = data.currentMapType;
    map = data.map || generateOverworld();
    
    currentState = STATE.ROAMING;
    startScreen.classList.add('hidden');
    
    btnToggleInv.classList.remove('hidden');
    btnToggleDex.classList.remove('hidden');
}

function log(msg) {
    battleLog.innerHTML += `<div>${msg}</div>`;
    battleLog.scrollTop = battleLog.scrollHeight;
}

function showOverlay() {
    modalOverlay.classList.remove('hidden');
}

function hideOverlay() {
    modalOverlay.classList.add('hidden');
}

function closeAllModals() {
    if (currentState === STATE.START_MENU) return;
    if (currentState === STATE.BATTLING) return; 
    
    if (currentState === STATE.INVENTORY || currentState === STATE.POKEDEX || currentState === STATE.SHOP) {
        inventoryUI.classList.add('hidden');
        pokedexUI.classList.add('hidden');
        shopUI.classList.add('hidden');
        hideOverlay();
        currentState = STATE.ROAMING;
    }
}

function toggleInventory() {
    if (currentState === STATE.BATTLING) {
        log("Use 'Switch' to check team in battle!");
        return;
    }
    if (currentState === STATE.SHOP) return;

    if (inventoryUI.classList.contains('hidden')) {
        closeAllModals(); 
        currentState = STATE.INVENTORY;
        inventoryUI.classList.remove('hidden');
        renderInventory(false);
        showOverlay();
    } else {
        closeInventory();
    }
}

function closeInventory() {
    if (currentState === STATE.BATTLING) {
        inventoryUI.classList.add('hidden');
        return;
    }
    inventoryUI.classList.add('hidden');
    hideOverlay();
    currentState = STATE.ROAMING;
}

function openSwitchMenu() {
    if (currentState !== STATE.BATTLING) return;
    
    inventoryUI.classList.remove('hidden');
    renderInventory(true);
    log("Choose a Pokemon to switch to.");
}

function togglePokedex() {
    if (currentState === STATE.BATTLING) {
        log("Can't check Pokedex during battle!");
        return;
    }
    if (currentState === STATE.SHOP) return;

    if (pokedexUI.classList.contains('hidden')) {
        closeAllModals();
        currentState = STATE.POKEDEX;
        pokedexUI.classList.remove('hidden');
        renderPokedex();
        showOverlay();
    } else {
        closePokedex();
    }
}

function closePokedex() {
    pokedexUI.classList.add('hidden');
    hideOverlay();
    currentState = STATE.ROAMING;
}

// --- Shop Logic ---
function openShop() {
    closeAllModals();
    currentState = STATE.SHOP;
    shopUI.classList.remove('hidden');
    updateShopUI();
    showOverlay();
}

function closeShop() {
    shopUI.classList.add('hidden');
    hideOverlay();
    currentState = STATE.ROAMING;
    player.y += TILE_SIZE;
    player.targetY += TILE_SIZE;
}

function updateShopUI() {
    shopMoneyEl.innerText = player.money;
}

function buyItem(item, cost) {
    if (player.money >= cost) {
        player.money -= cost;
        if (item === 'ball') player.inventory.pokeBalls++;
        if (item === 'greatball') player.inventory.greatBalls++;
        if (item === 'ultraball') player.inventory.ultraBalls++;
        if (item === 'potion') player.inventory.potions++;
        updateShopUI();
    } else {
        alert("Not enough money!");
    }
}
// ------------------

// --- Bag Logic ---
function openBagMenu() {
    if (currentState !== STATE.BATTLING) return;
    if (wasForcedSwitch) {
        log("You must switch Pokemon!");
        return;
    }
    
    battleMenu.classList.add('hidden');
    bagMenu.classList.remove('hidden');
    
    document.getElementById('bag-ball-count').innerText = player.inventory.pokeBalls || 0;
    document.getElementById('bag-greatball-count').innerText = player.inventory.greatBalls || 0;
    document.getElementById('bag-ultraball-count').innerText = player.inventory.ultraBalls || 0;
    document.getElementById('bag-potion-count').innerText = player.inventory.potions || 0;
}

function closeBagMenu() {
    bagMenu.classList.add('hidden');
    battleMenu.classList.remove('hidden');
}

function useItem(item) {
    if (item === 'ball') {
        catchPokemon('poke'); 
        closeBagMenu();
    } else if (item === 'greatball') {
        catchPokemon('great'); 
        closeBagMenu();
    } else if (item === 'ultraball') {
        catchPokemon('ultra'); 
        closeBagMenu();
    } else if (item === 'potion') {
        if (player.inventory.potions > 0) {
            const mon = player.team[0];
            if (mon.hp < mon.maxHp) {
                player.inventory.potions--;
                const heal = 20;
                mon.hp = Math.min(mon.maxHp, mon.hp + heal);
                log(`Used Potion! ${mon.name} recovered HP.`);
                updateBattleUI();
                closeBagMenu();
                enemyTurn(); 
            } else {
                log("HP is already full!");
            }
        } else {
            log("No potions left!");
        }
    }
}
// ------------------


function handleSwitch(index) {
    if (index === 0 && !wasForcedSwitch) {
        log("That Pokemon is already out!");
        return;
    }
    
    const selected = player.team[index];
    if (selected.hp <= 0) {
        log("It's too weak to fight!");
        return;
    }
    
    const oldMon = player.team[0];
    
    player.team[index] = oldMon;
    player.team[0] = selected;
    
    inventoryUI.classList.add('hidden');
    
    updateBattleUI();
    
    if (wasForcedSwitch) {
        log(`Go! ${selected.name}!`);
        wasForcedSwitch = false;
    } else {
        log(`Come back ${oldMon.name}! Go ${selected.name}!`);
        enemyTurn(); 
    }
}

function renderInventory(isSwitching) {
    pokemonListEl.innerHTML = '';
    player.team.forEach((mon, index) => {
        const div = document.createElement('div');
        div.className = 'pokemon-item';
        if (index === 0 && currentState === STATE.BATTLING && !wasForcedSwitch) {
             div.style.border = '2px solid gold';
        }
        
        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                <img src="${mon.image}" style="width:40px; height:40px; margin-right:10px;">
                <div>
                    <span style="color:${mon.color}">${mon.name}</span><br>
                    <small>Lv 5 - HP: ${mon.hp}/${mon.maxHp}</small>
                </div>
            </div>
        `;
        
        if (isSwitching) {
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => handleSwitch(index));
        }
        
        pokemonListEl.appendChild(div);
    });
}

function renderPokedex() {
    pokedexListEl.innerHTML = '';
    POKEDEX.forEach((mon, index) => {
        const caught = player.team.some(p => p.name === mon.name);
        
        const div = document.createElement('div');
        div.className = 'pokedex-item';
        
        div.style.opacity = caught ? '1' : '0.6';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <img src="${mon.image}" style="width:40px; height:40px; margin-right:10px; filter: ${caught ? 'none' : 'grayscale(100%) brightness(0)'};">
            <div>
                <span style="color:${mon.color}">#${mon.id} ${mon.name}</span><br>
                <small>${mon.type} - ${caught ? 'CAUGHT' : '???'}</small>
            </div>
        `;
        pokedexListEl.appendChild(div);
    });
}

function getPokemonForBiome(biomeType) {
    let possible = [];
    
    if (biomeType === 5) { 
        possible = POKEDEX.filter(p => ['Rock', 'Ground', 'Ghost', 'Fighting', 'Psychic', 'Poison', 'Dark'].includes(p.type));
    } else if (biomeType === 3) { 
        possible = POKEDEX.filter(p => ['Fire', 'Ground', 'Rock', 'Fighting'].includes(p.type));
    } else if (biomeType === 2) { 
        possible = POKEDEX.filter(p => ['Water', 'Ice'].includes(p.type));
    } else { 
        possible = POKEDEX.filter(p => ['Grass', 'Normal', 'Electric', 'Bug', 'Poison', 'Flying', 'Fairy', 'Dragon'].includes(p.type));
    }
    
    if (possible.length === 0) return POKEDEX[0]; 
    
    return possible[Math.floor(Math.random() * possible.length)];
}

function startBattle(biomeType) {
    currentState = STATE.BATTLING;
    
    const template = getPokemonForBiome(biomeType);
    currentEnemy = { ...template, maxHp: template.hp }; 
    
    battleUI.classList.remove('hidden');
    bagMenu.classList.add('hidden');
    battleMenu.classList.remove('hidden');
    
    updateBattleUI();
    battleLog.innerHTML = '';
    log(`A wild ${currentEnemy.name} appeared!`);
}

function endBattle() {
    currentState = STATE.ROAMING;
    battleUI.classList.add('hidden');
    currentEnemy = null;
    wasForcedSwitch = false;
    keys['ArrowUp'] = false;
    keys['ArrowDown'] = false;
    keys['ArrowLeft'] = false;
    keys['ArrowRight'] = false;
}

function updateBattleUI() {
    if (!currentEnemy) return;
    
    const playerMon = player.team[0];
    
    enemyNameEl.innerText = `${currentEnemy.name}`;
    enemyHpBar.style.width = `${(currentEnemy.hp / currentEnemy.maxHp) * 100}%`;
    enemyImg.src = currentEnemy.image;
    
    playerNameEl.innerText = `${playerMon.name}`;
    playerHpBar.style.width = `${(playerMon.hp / playerMon.maxHp) * 100}%`;
    playerImg.src = playerMon.image;
}

function enemyTurn() {
    if (!currentEnemy || currentState !== STATE.BATTLING) return;
    
    setTimeout(() => {
        const playerMon = player.team[0];
        const dmg = Math.max(1, Math.floor(currentEnemy.attack * 0.5));
        playerMon.hp = Math.max(0, playerMon.hp - dmg);
        log(`${currentEnemy.name} attacked! Dealt ${dmg} damage.`);
        updateBattleUI();
        
        if (playerMon.hp <= 0) {
            log(`${playerMon.name} fainted!`);
            
            const hasAlive = player.team.some(p => p.hp > 0);
            
            if (!hasAlive) {
                log("You have no more Pokemon!");
                setTimeout(() => {
                    log("You scurried away...");
                    player.team.forEach(p => p.hp = Math.floor(p.maxHp / 2));
                    endBattle();
                }, 2000);
            } else {
                 wasForcedSwitch = true;
                 setTimeout(() => {
                     log("Choose your next Pokemon!");
                     openSwitchMenu();
                 }, 1000);
            }
        }
    }, 1000);
}

function attack() {
    if (currentState !== STATE.BATTLING) return;
    if (wasForcedSwitch) {
        log("You must choose a Pokemon!");
        return;
    }
    
    const playerMon = player.team[0];
    const dmg = Math.max(1, Math.floor(playerMon.attack * 0.6));
    currentEnemy.hp = Math.max(0, currentEnemy.hp - dmg);
    log(`${playerMon.name} attacked! Dealt ${dmg} damage.`);
    updateBattleUI();
    
    if (currentEnemy.hp <= 0) {
        log(`Wild ${currentEnemy.name} fainted! You won!`);
        player.money += 50;
        log(`You won $50!`);
        setTimeout(endBattle, 2000);
    } else {
        enemyTurn();
    }
}

function catchPokemon(ballType) {
    if (currentState !== STATE.BATTLING) return;
    if (wasForcedSwitch) {
        log("You must choose a Pokemon!");
        return;
    }
    
    let invKey = 'pokeBalls';
    let multiplier = 1;
    let ballName = "Poke Ball";
    
    if (ballType === 'great') {
        invKey = 'greatBalls';
        multiplier = 1.5;
        ballName = "Great Ball";
    } else if (ballType === 'ultra') {
        invKey = 'ultraBalls';
        multiplier = 2.0;
        ballName = "Ultra Ball";
    }
    
    if (player.inventory[invKey] > 0) {
        player.inventory[invKey]--;
        log(`You threw a ${ballName}! (${player.inventory[invKey]} left)`);
        
        const catchChance = (1 - (currentEnemy.hp / currentEnemy.maxHp) + 0.2) * multiplier;
        
        if (Math.random() < catchChance) {
            log(`Gotcha! ${currentEnemy.name} was caught!`);
            currentEnemy.hp = currentEnemy.maxHp;
            player.team.push(currentEnemy);
            player.money += 100; 
            log("Sent to team. Earned $100!");
            setTimeout(endBattle, 2000);
        } else {
            log(`${currentEnemy.name} broke free!`);
            enemyTurn();
        }
    } else {
        log(`You don't have any ${ballName}s left!`);
    }
}

function runAway() {
    if (currentState !== STATE.BATTLING) return;
    if (wasForcedSwitch) {
        log("Can't run! Choose a Pokemon!");
        return;
    }
    log("Got away safely!");
    setTimeout(endBattle, 1000);
}

function updatePlayer() {
    if (currentState !== STATE.ROAMING) return; 

    if (player.moving) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        
        if (Math.abs(dx) < MOVEMENT_SPEED && Math.abs(dy) < MOVEMENT_SPEED) {
            player.x = player.targetX;
            player.y = player.targetY;
            player.moving = false;
            
            const col = Math.floor(player.x / TILE_SIZE);
            const row = Math.floor(player.y / TILE_SIZE);
            const tile = map[row][col];

            if (tile === 4) {
                if (currentMapType === 'OVERWORLD') {
                    currentMapType = 'CAVE';
                    map = generateCave();
                    player.x = 5 * TILE_SIZE; 
                    player.y = 5 * TILE_SIZE;
                    player.targetX = player.x;
                    player.targetY = player.y;
                } else {
                    currentMapType = 'OVERWORLD';
                    map = generateOverworld();
                    player.x = 5 * TILE_SIZE; 
                    player.y = 5 * TILE_SIZE;
                    player.targetX = player.x;
                    player.targetY = player.y;
                }
                return;
            }
            
            if (tile === 6) {
                openShop();
                return;
            }

            if ([0, 2, 3, 5].includes(tile)) {
                 if (Math.random() < 0.1) { 
                     startBattle(tile);
                 }
            }
            
        } else {
            player.x += Math.sign(dx) * MOVEMENT_SPEED;
            player.y += Math.sign(dy) * MOVEMENT_SPEED;
        }
    } else {
        let nextX = player.x;
        let nextY = player.y;
        
        if (keys['ArrowUp']) nextY -= TILE_SIZE;
        else if (keys['ArrowDown']) nextY += TILE_SIZE;
        else if (keys['ArrowLeft']) nextX -= TILE_SIZE;
        else if (keys['ArrowRight']) nextX += TILE_SIZE;
        
        if (nextX !== player.x || nextY !== player.y) {
            const col = Math.floor(nextX / TILE_SIZE);
            const row = Math.floor(nextY / TILE_SIZE);
            
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS && map[row][col] !== 1) {
                player.targetX = nextX;
                player.targetY = nextY;
                player.moving = true;
            }
        }
    }
}

function draw() {
    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Safety check for map
    if (!map || !map.length || !map[0]) return;

    // Draw Map
    for (let y = 0; y < ROWS; y++) {
        if (!map[y]) continue; 
        for (let x = 0; x < COLS; x++) {
            const tile = map[y][x];
            if (tile === 0) ctx.fillStyle = COLORS.GRASS;
            else if (tile === 1) ctx.fillStyle = COLORS.WALL;
            else if (tile === 2) ctx.fillStyle = COLORS.WATER;
            else if (tile === 3) ctx.fillStyle = COLORS.FIRE;
            else if (tile === 4) ctx.fillStyle = COLORS.TUNNEL;
            else if (tile === 5) ctx.fillStyle = COLORS.CAVE;
            else if (tile === 6) ctx.fillStyle = COLORS.SHOP;
            
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            
            ctx.strokeStyle = 'rgba(0,0,0,0.05)';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    
    // Draw Player
    if (currentState !== STATE.START_MENU) {
        ctx.fillStyle = COLORS.PLAYER;
        const pPadding = 4;
        ctx.fillRect(player.x + pPadding, player.y + pPadding, TILE_SIZE - (pPadding*2), TILE_SIZE - (pPadding*2));
    }
}

function gameLoop() {
    if (currentState !== STATE.BATTLING && currentState !== STATE.SHOP && currentState !== STATE.START_MENU) {
        updatePlayer();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Start
window.onload = function() {
    try {
        if (typeof initStartScreen === 'function') {
            initStartScreen();
        }
        if (typeof gameLoop === 'function') {
            gameLoop();
        }
    } catch (e) {
        console.error("Game Start Error:", e);
        alert("Game failed to start. See console.");
    }
};