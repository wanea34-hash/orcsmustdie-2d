// --- Глобальные переменные (объявляем, но НЕ инициализируем Canvas здесь) ---
let canvas;
let ctx;

const TILE_WIDTH = 15; 
const TILE_HEIGHT = 10;
const TILE_SIZE = 40; 

let gold = 1000; 
let riftHealth = 20;
let currentWave = 0;
let gameRunning = false;
let orcs = [];
let traps = [];
let trapMode = null; 
let keys = {}; 

// --- Данные Игры ---
const mapGrid = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [2, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1], 
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 3, 1], 
    [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const path = [
    {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2}, 
    {x: 3, y: 3}, {x: 4, y: 3}, {x: 4, y: 4}, {x: 4, y: 5}, 
    {x: 5, y: 5}, {x: 6, y: 5}, {x: 7, y: 5}, {x: 8, y: 5}, 
    {x: 8, y: 6}, {x: 8, y: 7}, {x: 9, y: 7}, {x: 10, y: 7},
    {x: 11, y: 7}, {x: 12, y: 7}, {x: 13, y: 7} 
];

const guardian = {
    x: 7 * TILE_SIZE + TILE_SIZE / 2, 
    y: 5 * TILE_SIZE + TILE_SIZE / 2,
    size: 15,
    speed: 2,
    attackRange: 50,
    attackDamage: 8,
    isAttacking: false,
    attackCooldown: 30, 
    attackTimer: 0
};

const TRAPS_DATA = {
    'ARROW': {cost: 50, damage: 5, color: '#d9534f', slow: 0, uses: 1, name: 'Стрелы', icon: 'A'},
    'TAR': {cost: 25, damage: 0, color: '#654321', slow: 0.5, uses: Infinity, name: 'Смола', icon: 'T'},
    'SPRING': {cost: 75, damage: 0, color: '#337ab7', slow: 0, uses: 1, name: 'Батут', icon: 'S', push: 100}
};

// --- УПРАВЛЕНИЕ (КЛАВИАТУРА И СЕНСОР) ---
const touchControlsMap = {
    'up': 'KeyW', 'down': 'KeyS', 'left': 'KeyA', 'right': 'KeyD', 'attack-btn': 'Space'
};

function setupTouchControls() {
    const buttons = document.querySelectorAll('.touch-btn, #attack-btn');
    
    buttons.forEach(button => {
        const code = touchControlsMap[button.id];
        button.addEventListener('touchstart', (e) => { e.preventDefault(); if (code) { keys[code] = true; } });
        button.addEventListener('touchend', (e) => { e.preventDefault(); if (code) { keys[code] = false; } });
    });
    
    const handleDiagonal = (e, isStart) => {
        e.preventDefault();
        const id = e.currentTarget.id;
        if (id.includes('up')) keys['KeyW'] = isStart;
        if (id.includes('down')) keys['KeyS'] = isStart;
        if (id.includes('left')) keys['KeyA'] = isStart;
        if (id.includes('right')) keys['KeyD'] = isStart;
    };

    if (document.getElementById('up-left')) {
        document.getElementById('up-left').addEventListener('touchstart', (e) => handleDiagonal(e, true));
        document.getElementById('up-left').addEventListener('touchend', (e) => handleDiagonal(e, false));
    }
    if (document.getElementById('up-right')) {
        document.getElementById('up-right').addEventListener('touchstart', (e) => handleDiagonal(e, true));
        document.getElementById('up-right').addEventListener('touchend', (e) => handleDiagonal(e, false));
    }
    if (document.getElementById('down-left')) {
        document.getElementById('down-left').addEventListener('touchstart', (e) => handleDiagonal(e, true));
        document.getElementById('down-left').addEventListener('touchend', (e) => handleDiagonal(e, false));
    }
    if (document.getElementById('down-right')) {
        document.getElementById('down-right').addEventListener('touchstart', (e) => handleDiagonal(e, true));
        document.getElementById('down-right').addEventListener('touchend', (e) => handleDiagonal(e, false));
    }
}

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });


// --- ИГРОВАЯ ЛОГИКА (UPDATE) ---

function handleGuardianMovement() {
    let currentSpeed = guardian.speed;
    let newX = guardian.x;
    let newY = guardian.y;
    
    if (keys['KeyW']) newY -= currentSpeed;
    if (keys['KeyS']) newY += currentSpeed;
    if (keys['KeyA']) newX -= currentSpeed;
    if (keys['KeyD']) newX += currentSpeed;
    
    const tileX = Math.floor(newX / TILE_SIZE);
    const tileY = Math.floor(newY / TILE_SIZE);

    if (mapGrid[tileY] && mapGrid[tileY][tileX] === 1) {
        currentSpeed *= 0.5; 
    }
    
    if (keys['KeyW']) guardian.y -= currentSpeed;
    if (keys['KeyS']) guardian.y += currentSpeed;
    if (keys['KeyA']) guardian.x -= currentSpeed;
    if (keys['KeyD']) guardian.x += currentSpeed;
    
    const padding = guardian.size / 2;
    guardian.x = Math.max(padding, Math.min(canvas.width - padding, guardian.x));
    guardian.y = Math.max(padding, Math.min(canvas.height - padding, guardian.y));

    if (keys['Space'] && guardian.attackTimer <= 0) {
        guardian.isAttacking = true;
        guardian.attackTimer = guardian.attackCooldown;
        attackOrcs();
    }
}

function attackOrcs() {
    orcs.forEach(orc => {
        const dx = orc.x - guardian.x;
        const dy
    
