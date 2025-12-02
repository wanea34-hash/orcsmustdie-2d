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

// ********* НОВОЕ ИСПРАВЛЕНИЕ: НЕПРОХОДИМЫЕ СТЕНЫ *********
function handleGuardianMovement() {
    let currentSpeed = guardian.speed;
    let dx = 0;
    let dy = 0;
    
    // 1. Определяем желаемое направление движения
    if (keys['KeyW']) dy -= currentSpeed;
    if (keys['KeyS']) dy += currentSpeed;
    if (keys['KeyA']) dx -= currentSpeed;
    if (keys['KeyD']) dx += currentSpeed;
    
    let newX = guardian.x + dx;
    let newY = guardian.y + dy;

    // 2. Проверяем стену для новой позиции (простая проверка центра)
    const newTileX = Math.floor(newX / TILE_SIZE);
    const newTileY = Math.floor(newY / TILE_SIZE);

    // 3. ПРИМЕНЯЕМ ДВИЖЕНИЕ, ТОЛЬКО ЕСЛИ НОВЫЙ ТАЙЛ НЕ ЯВЛЯЕТСЯ СТЕНОЙ (1)
    if (mapGrid[newTileY] && mapGrid[newTileY][newTileX] !== 1) {
        guardian.x = newX;
        guardian.y = newY;
    } else {
        // Если новая позиция — стена, пытаемся проверить движение по одной оси (для скольжения).
        
        // Попытка движения только по X:
        let testX = guardian.x + dx;
        let testTileX = Math.floor(testX / TILE_SIZE);
        // Используем '| 0' как быстрый Math.floor для Y
        if (mapGrid[guardian.y / TILE_SIZE | 0] && mapGrid[guardian.y / TILE_SIZE | 0][testTileX] !== 1) {
            guardian.x = testX;
        }

        // Попытка движения только по Y:
        let testY = guardian.y + dy;
        let testTileY = Math.floor(testY / TILE_SIZE);
        // Используем '| 0' как быстрый Math.floor для X
        if (mapGrid[testTileY] && mapGrid[testTileY][guardian.x / TILE_SIZE | 0] !== 1) {
            guardian.y = testY;
        }
    }
    
    // 4. Ограничиваем Стража границами Canvas
    const padding = guardian.size / 2;
    guardian.x = Math.max(padding, Math.min(canvas.width - padding, guardian.x));
    guardian.y = Math.max(padding, Math.min(canvas.height - padding, guardian.y));

    // 5. Обработка атаки
    if (keys['Space'] && guardian.attackTimer <= 0) {
        guardian.isAttacking = true;
        guardian.attackTimer = guardian.attackCooldown;
        attackOrcs();
    }
}
// ********* КОНЕЦ НОВОГО ИСПРАВЛЕНИЯ *********

function attackOrcs() {
    orcs.forEach(orc => {
        const dx = orc.x - guardian.x;
        const dy = orc.y - guardian.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < guardian.attackRange) {
            orc.health -= guardian.attackDamage;
            orc.isPushed = true;
            orc.pushForce = 20;
            orc.pushDX = dx / distance;
            orc.pushDY = dy / distance;
        }
    });
}

function update() {
    if (guardian.attackTimer > 0) {
        guardian.attackTimer--;
        if (guardian.attackTimer <= 0) {
            guardian.isAttacking = false;
        }
    }

    handleGuardianMovement(); 

    if (!gameRunning) return;
    
    orcs.forEach(orc => {
        
        if (orc.isPushed) {
            orc.x += orc.pushDX * orc.pushForce;
            orc.y += orc.pushDY * orc.pushForce;
            orc.pushForce *= 0.8; 
            if (orc.pushForce < 1) {
                orc.isPushed = false;
                orc.pushForce = 0;
            }
            return;
        }
        
        const targetTile = path[orc.pathIndex];
        
        if (!targetTile) { 
            orc.health = 0; 
            riftHealth -= 1;
            return;
        }

        const targetX = targetTile.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = targetTile.y * TILE_SIZE + TILE_SIZE / 2;
        
        const dx = targetX - orc.x;
        const dy = targetY - orc.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const currentTileX = Math.floor(orc.x / TILE_SIZE);
        const currentTileY = Math.floor(orc.y / TILE_SIZE);
        orc.slowEffect = 0;

        // Орки тоже замедляются стенами
        if (mapGrid[currentTileY] && mapGrid[currentTileY][currentTileX] === 1) {
            orc.slowEffect = 0.5; 
        }

        traps.forEach(trap => {
            if (trap.x === currentTileX && trap.y === currentTileY && trap.type === 'TAR') {
                orc.slowEffect = Math.max(orc.slowEffect, trap.slow);
            }
        });

        const effectiveSpeed = orc.baseSpeed * (1 - orc.slowEffect);
        
        if (distance > effectiveSpeed) {
            orc.x += dx / distance * effectiveSpeed;
            orc.y += dy / distance * effectiveSpeed;
        } else {
            orc.x = targetX;
            orc.y = targetY;
            orc.pathIndex++;
        }
    });

    orcs.forEach(orc => {
        if (orc.health <= 0 || orc.isPushed) return; 

        const currentTileX = Math.floor(orc.x / TILE_SIZE);
        const currentTileY = Math.floor(orc.y / TILE_SIZE);

        traps.forEach(trap => {
            if (trap.x === currentTileX && trap.y === currentTileY) {
                if (trap.uses !== 0) { 
                    
                    if (trap.damage > 0) {
                        orc.health -= trap.damage;
                        if (trap.uses !== Infinity) trap.uses--;
                    }
                    
                    if (trap.push > 0 && trap.uses !== 0) {
                        const targetTile = path[orc.pathIndex];
                        if (targetTile) {
                            orc.isPushed = true;
                            orc.pushForce = trap.push / 2; 
                            
                            orc.pushDX = -orc.x + (path[0].x * TILE_SIZE + TILE_SIZE / 2); 
                            orc.pushDY = -orc.y + (path[0].y * TILE_SIZE + TILE_SIZE / 2); 
                            const norm = Math.sqrt(orc.pushDX * orc.pushDX + orc.pushDY * orc.pushDY);
                            if (norm > 0) {
                                orc.pushDX /= -norm; 
                                orc.pushDY /= -norm;
                            }
                        }
                        
                        if (trap.uses !== Infinity) trap.uses--;
                    }
                }
            }
        });
    });

    const defeatedOrcs = orcs.filter(orc => orc.health <= 0);
    gold += defeatedOrcs.length * 10;
    
    orcs = orcs.filter(orc => orc.health > 0);
    traps = traps.filter(trap => trap.uses !== 0);

    if (riftHealth <= 0) {
        showMessage('💔 ПОРАЖЕНИЕ! Рифт разрушен!');
        gameRunning = false;
    } else if (orcs.length === 0 && currentWave > 0) {
        showMessage(`✅ Волна ${currentWave} успешно отражена! Покупайте ловушки и отдыхайте.`);
        gameRunning = false;
    }
    
    updateInfo();
}


// --- ОТРЕСОВКА CANVAS (DRAW) ---

function draw() {
    if (!ctx) return; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Отрисовка тайлов карты
    mapGrid.forEach((row, y) => {
        row.forEach((cell, x) => {
            const tileX = x * TILE_SIZE;
            const tileY = y * TILE_SIZE;

            // Фон (пол)
            ctx.fillStyle = '#b0b0b0'; 
            ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            
            ctx.globalAlpha = 1.0; 

            // Стены 
            if (cell === 1) {
                const wallGradient = ctx.createLinearGradient(tileX, tileY, tileX + TILE_SIZE, tileY + TILE_SIZE);
                wallGradient.addColorStop(0, '#555');
                wallGradient.addColorStop(1, '#333');
                ctx.fillStyle = wallGradient;
                ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                ctx.globalAlpha = 0.5; 
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;
                ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            }
            // Вход
            if (cell === 2) {
                ctx.fillStyle = '#4B0082'; 
                ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#e0ffff';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('SPAWN', tileX + TILE_SIZE / 2, tileY + TILE_SIZE / 2);
            }
            // Рифт (цель)
            if (cell === 3) {
                ctx.fillStyle = '#8B0000'; 
                ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#ffcccc';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('RIFT', tileX + TILE_SIZE / 2, tileY + TILE_SIZE / 2);
            }
        });
    });
    
    ctx.globalAlpha = 1.0; 

    // 2. Отрисовка ловушек
    traps.forEach(trap => {
        const trapX = trap.x * TILE_SIZE;
        const trapY = trap.y * TILE_SIZE;
        
        ctx.fillStyle = trap.color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(trapX + 4, trapY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(trapX + 4, trapY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.globalAlpha = 1.0;

        // Отрисовка символов ловушек (упрощено)
        if (trap.type === 'ARROW') {
            ctx.strokeStyle = '#cc0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(trapX + 10, trapY + 10);
            ctx.lineTo(trapX + TILE_SIZE - 10, trapY + TILE_SIZE - 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(trapX + TILE_SIZE - 10, trapY + 10);
            ctx.lineTo(trapX + 10, trapY + TILE_SIZE - 10);
            ctx.stroke();
        } 
        // ... (другие типы ловушек)
    });

    // 3. Отрисовка орков
    orcs.forEach(orc => {
        ctx.fillStyle = '#3CB371'; 
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(orc.x, orc.y, 12, 0, Math.PI * 2); 
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Полоска здоровья
        ctx.fillStyle = 'red';
        ctx.fillRect(orc.x - 15, orc.y - 20, 30 * (orc.health / orc.maxHealth), 3);
    });

    // 4. Отрисовка Героя (Стража)
    ctx.fillStyle = '#4169E1'; 
    ctx.shadowColor = '#000080'; 
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(guardian.x, guardian.y, 15, 0, Math.PI * 2); 
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Эффект атаки
    if (guardian.isAttacking) {
        ctx.strokeStyle = '#FFD700'; 
        ctx.lineWidth = 5;
        const attackRadius = guardian.attackRange * (guardian.attackTimer / guardian.attackCooldown);
        ctx.beginPath();
        ctx.arc(guardian.x, guardian.y, attackRadius * 0.8 + 5 * Math.sin(guardian.attackTimer * 0.5), 0, Math.PI * 2);
        ctx.stroke();
    }
}

// --- ФУНКЦИИ АДАПТАЦИИ И УПРАВЛЕНИЯ ---

function resizeCanvas() {
    if (!canvas) return;
    
    // 1. Устанавливаем физический размер Canvas (для рисования)
    canvas.width = TILE_WIDTH * TILE_SIZE; 
    canvas.height = TILE_HEIGHT * TILE_SIZE; 
    
    // 2. Устанавливаем размер Canvas в CSS для адаптивного отображения
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth;
    
    canvas.style.width = containerWidth + 'px'; 
    
    const scale = containerWidth / canvas.width;
    canvas.style.height = (canvas.height * scale) + 'px'; 

    canvas.style.transform = 'none'; 
}

function showMessage(text) {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

function updateInfo() {
    const goldElement = document.getElementById('gold');
    const riftElement = document.getElementById('rift-health');
    const waveElement = document.getElementById('current-wave');
    
    if (goldElement) goldElement.textContent = gold;
    if (riftElement) riftElement.textContent = riftHealth;
    if (waveElement) waveElement.textContent = currentWave;
}

function setTrapMode(type) {
    trapMode = type;
    showMessage(`Режим: Установка ловушки "${TRAPS_DATA[type].name}". Нажмите на пустой тайл.`);
}

function handleCanvasClick(event) {
    if (!trapMode || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Корректный пересчет координат
    const x = (event.clientX - rect.left) / (rect.width / canvas.width);
    const y = (event.clientY - rect.top) / (rect.height / canvas.height);
    
    placeTrap(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
}

function setupEventHandlers() {
    if (!canvas) return;
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); 
        handleCanvasClick(e.touches[0]);
    }, { passive: false });
    
    window.addEventListener('resize', resizeCanvas); 
}


function placeTrap(x, y) {
    const trapData = TRAPS_DATA[trapMode];
    if (!trapData) return;

    if (mapGrid[y] && mapGrid[y][x] !== 2 && mapGrid[y][x] !== 3 && !traps.find(t => t.x === x && t.y === y)) {
        if (gold >= trapData.cost) {
            gold -= trapData.cost;
            traps.push({
                x: x, y: y, type: trapMode,
                damage: trapData.damage, slow: trapData.slow, uses: trapData.uses,
                color: trapData.color, push: trapData.push || 0
            });
            showMessage(`Ловушка "${trapData.name}" установлена!`);
            updateInfo();
        } else {
            showMessage('Недостаточно золота!');
        }
    } else {
        showMessage('Нельзя ставить ловушку на стены/вход/рифт или уже занятый тайл!');
    }
    trapMode = null; 
}

function startNextWave() {
    if (gameRunning) {
        showMessage('Волна уже идёт!');
        return;
    }
    
    currentWave++;
    gameRunning = true;
    showMessage(`⚡ Волна ${currentWave} началась!`);

    const numOrcs = 5 + currentWave * 2;
    const orcHealth = 15 + currentWave * 5;
    
    for (let i = 0; i < numOrcs; i++) {
        setTimeout(() => {
            orcs.push({
                x: path[0].x * TILE_SIZE + TILE_SIZE / 2, y: path[0].y * TILE_SIZE + TILE_SIZE / 2,
                health: orcHealth, maxHealth: orcHealth, baseSpeed: 1, slowEffect: 0, pathIndex: 1,
                isPushed: false, pushForce: 0, pushDX: 0, pushDY: 0 
            });
        }, i * 500); 
    }
}


// --- ЦИКЛ ИГРЫ И ИНИЦИАЛИЗАЦИЯ ---

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Инициализация Canvas и контекста
function initGame() {
    // 1. Инициализируем canvas и ctx ТОЛЬКО ЗДЕСЬ, после DOMContentLoaded
    canvas = document.getElementById('gameCanvas'); 
    if (!canvas) {
        console.error("Критическая ошибка: Элемент Canvas не найден в DOM.");
        return;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Критическая ошибка: 2D контекст не поддерживается.");
        return;
    }
    
    // 2. Продолжаем инициализацию
    updateInfo();
    resizeCanvas(); 
    setupTouchControls(); 
    setupEventHandlers();
    showMessage('Управляйте Стражем (Сенсорные кнопки), чтобы защитить Рифт! Установите ловушки, затем начните волну.');
    gameLoop();
}

// Ключевая строка, запускающая все, когда страница готова:
document.addEventListener('DOMContentLoaded', initGame);
