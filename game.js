// ====================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ИНИЦИАЛИЗАЦИЯ
// ====================================================================

let canvas;
let ctx;

const TILE_WIDTH = 16; 
const TILE_HEIGHT = 12;
const TILE_SIZE = 40; 
// Логические размеры Canvas (для рендеринга 640x480)
const LOGICAL_CANVAS_WIDTH = TILE_WIDTH * TILE_SIZE; 
const LOGICAL_CANVAS_HEIGHT = TILE_HEIGHT * TILE_SIZE; 

// Размер всей карты в пикселях (нужен для границ)
const MAP_WIDTH = LOGICAL_CANVAS_WIDTH; 
const MAP_HEIGHT = LOGICAL_CANVAS_HEIGHT; 

let gold = 1000; 
let riftHealth = 20;
let currentWave = 0;
let gameRunning = false;
let orcs = [];
let traps = [];
let trapMode = null; 
let keys = {}; 

// Переменная для сдвига камеры
let cameraOffset = { x: 0, y: 0 };


// ====================================================================
// ДАННЫЕ ИГРЫ: КАРТА И ПУТЬ
// ====================================================================

const mapGrid = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Вход (1, 1)
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1], 
    [1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1], // Рифт (14, 10)
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] 
];

const path = [
    {x: 1, y: 1}, {x: 6, y: 1}, {x: 6, y: 3}, {x: 3, y: 3}, {x: 3, y: 4}, 
    {x: 6, y: 4}, {x: 6, y: 5}, {x: 8, y: 5}, {x: 8, y: 7}, {x: 12, y: 7}, 
    {x: 12, y: 9}, {x: 10, y: 9}, {x: 10, y: 10}, {x: 14, y: 10} 
];

const guardian = {
    x: 1 * TILE_SIZE + TILE_SIZE / 2, 
    y: 1 * TILE_SIZE + TILE_SIZE / 2,
    size: 20, 
    speed: 2,
    attackRange: 50,
    attackDamage: 8,
    isAttacking: false,
    attackCooldown: 30, 
    attackTimer: 0
};

const TRAPS_DATA = {
    'ARROW': {cost: 50, damage: 5, color: '#d9534f', uses: 1, name: 'Стрелы', icon: 'A'},
    'TAR': {cost: 25, damage: 0, color: '#654321', slow: 0.5, uses: Infinity, name: 'Смола', icon: 'T'},
    'SPRING': {cost: 75, damage: 0, color: '#337ab7', push: 100, uses: 1, name: 'Батут', icon: 'S'}
};

const rift = {
    x: 14 * TILE_SIZE + TILE_SIZE / 2, 
    y: 10 * TILE_SIZE + TILE_SIZE / 2,
    size: TILE_SIZE / 2
};

// ====================================================================
// УПРАВЛЕНИЕ (КЛАВИАТУРА И СЕНСОР)
// ====================================================================

const touchControlsMap = {
    'up': 'KeyW', 'down': 'KeyS', 'left': 'KeyA', 'right': 'KeyD', 'attack-btn': 'Space'
};

function setupTouchControls() {
    // Включаем поддержку всех сенсорных кнопок
    const buttons = document.querySelectorAll('.touch-btn, #attack-btn');
    
    const handleControl = (e, isStart) => {
        e.preventDefault();
        const id = e.currentTarget.id;
        const code = touchControlsMap[id];
        
        if (code) {
             keys[code] = isStart;
        } 
        
        // Для джойстика
        if (id === 'up') keys['KeyW'] = isStart;
        if (id === 'down') keys['KeyS'] = isStart;
        if (id === 'left') keys['KeyA'] = isStart;
        if (id === 'right') keys['KeyD'] = isStart;
    };
    
    buttons.forEach(button => {
        // Объединяем touchstart/touchend и mousedown/mouseup для ПК/сенсора
        button.addEventListener('touchstart', (e) => handleControl(e, true));
        button.addEventListener('touchend', (e) => handleControl(e, false));
        button.addEventListener('mousedown', (e) => handleControl(e, true));
        button.addEventListener('mouseup', (e) => handleControl(e, false));
        button.addEventListener('touchcancel', (e) => handleControl(e, false));
    });
}


window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { 
    keys[e.code] = false; 
    if (e.code === 'Space') { guardian.isAttacking = false; }
});

// ====================================================================
// ОБЩИЕ ФУНКЦИИ И УТИЛИТЫ
// ====================================================================

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

// Проверяет, является ли заданная координата (x, y) тайлом стены (1)
const isWall = (x, y) => {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return true;
    
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    return mapGrid[tileY] && mapGrid[tileY][tileX] === 1;
};

// ====================================================================
// ЛОГИКА ДВИЖЕНИЯ СТРАЖА И КОЛЛИЗИЙ
// ====================================================================

function handleGuardianMovement() {
    let currentSpeed = guardian.speed;
    let dx = 0;
    let dy = 0;
    const halfSize = guardian.size / 2;
    
    if (keys['KeyW']) dy -= currentSpeed;
    if (keys['KeyS']) dy += currentSpeed;
    if (keys['KeyA']) dx -= currentSpeed;
    if (keys['KeyD']) dx += currentSpeed;
    
    let newX = guardian.x + dx;
    let newY = guardian.y + dy;
    
    // 1. Проверяем движение по X
    let canMoveX = true;
    if (dx !== 0) {
        const checkX = newX + (dx > 0 ? halfSize - 1 : -halfSize + 1); 
        if (isWall(checkX, guardian.y - halfSize + 1) || 
            isWall(checkX, guardian.y + halfSize - 1))   
        {
            canMoveX = false;
        }
    }
    
    // 2. Проверяем движение по Y
    let canMoveY = true;
    if (dy !== 0) {
        const checkY = newY + (dy > 0 ? halfSize - 1 : -halfSize + 1); 
        if (isWall(guardian.x - halfSize + 1, checkY) || 
            isWall(guardian.x + halfSize - 1, checkY))   
        {
            canMoveY = false;
        }
    }
    
    // 3. Применяем движение
    if (canMoveX) {
        guardian.x = newX;
    }
    if (canMoveY) {
        guardian.y = newY;
    }

    // Ограничиваем Стража границами всей Карты
    const padding = halfSize;
    guardian.x = Math.max(padding, Math.min(MAP_WIDTH - padding, guardian.x));
    guardian.y = Math.max(padding, Math.min(MAP_HEIGHT - padding, guardian.y));

    // 4. Обработка атаки
    if (keys['Space'] && guardian.attackTimer <= 0) {
        guardian.isAttacking = true;
        guardian.attackTimer = guardian.attackCooldown;
        attackOrcs();
    } else if (guardian.attackTimer > 0) {
        guardian.attackTimer--;
    }
}

function attackOrcs() {
    orcs.forEach(orc => {
        const distance = Math.sqrt(Math.pow(orc.x - guardian.x, 2) + Math.pow(orc.y - guardian.y, 2));

        if (distance < guardian.attackRange) {
            orc.health -= guardian.attackDamage;
        }
    });
}

function handleOrcMovement() {
    const COLLISION_PADDING = 3; 

    orcs.forEach(orc => {
        
        if (orc.pathIndex >= path.length) {
            orc.health = -1; 
            riftHealth -= 1;
            return;
        }

        const targetTile = path[orc.pathIndex];
        const targetX = targetTile.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = targetTile.y * TILE_SIZE + TILE_SIZE / 2;
        
        const dx = targetX - orc.x;
        const dy = targetY - orc.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        orc.slowEffect = 0;
        const effectiveSpeed = (orc.baseSpeed || 1) * (1 - orc.slowEffect);
        
        if (distance > effectiveSpeed) {
            let moveX = dx / distance * effectiveSpeed;
            let moveY = dy / distance * effectiveSpeed;
            const halfSize = orc.size / 2;
            let newX = orc.x + moveX;
            let newY = orc.y + moveY;
            
            let canMoveX = true;
            let canMoveY = true;
            
            if (moveX !== 0) {
                const checkX = newX + (moveX > 0 ? halfSize - COLLISION_PADDING : -halfSize + COLLISION_PADDING); 
                if (isWall(checkX, orc.y - halfSize + COLLISION_PADDING) || 
                    isWall(checkX, orc.y + halfSize - COLLISION_PADDING))   
                {
                    canMoveX = false;
                }
            }

            if (moveY !== 0) {
                const checkY = newY + (moveY > 0 ? halfSize - COLLISION_PADDING : -halfSize + COLLISION_PADDING); 
                if (isWall(orc.x - halfSize + COLLISION_PADDING, checkY) || 
                    isWall(orc.x + halfSize - COLLISION_PADDING, checkY))   
                {
                    canMoveY = false;
                }
            }

            if (canMoveX) {
                orc.x = newX;
            }
            if (canMoveY) {
                orc.y = newY;
            }

        } else {
            orc.x = targetX;
            orc.y = targetY;
            orc.pathIndex++;
        }
    });
}

function handleTraps() {
    orcs = orcs.filter(orc => {
        if (orc.health <= 0) {
            gold += (orc.reward || 10);
            updateInfo();
            return false;
        }
        return true;
    });

    if (orcs.length === 0 && currentWave > 0 && gameRunning) {
        showMessage(`✅ Волна ${currentWave} успешно отражена!`);
        gameRunning = false;
        gold += 100;
        updateInfo();
    }
}

// ====================================================================
// УПРАВЛЕНИЕ ИГРОВЫМ ПРОЦЕССОМ И КАМЕРА
// ====================================================================

function calculateCameraOffset() {
    // Страж должен быть в центре экрана (LOGICAL_CANVAS_WIDTH/2)
    const targetX = guardian.x - LOGICAL_CANVAS_WIDTH / 2;
    const targetY = guardian.y - LOGICAL_CANVAS_HEIGHT / 2;
    
    // Ограничиваем сдвиг границами карты
    cameraOffset.x = Math.max(0, Math.min(targetX, MAP_WIDTH - LOGICAL_CANVAS_WIDTH));
    cameraOffset.y = Math.max(0, Math.min(targetY, MAP_HEIGHT - LOGICAL_CANVAS_HEIGHT));
}

function setTrapMode(type) {
    trapMode = type;
    showMessage(`Режим: Установка ловушки "${TRAPS_DATA[type].name}". Нажмите на пустой тайл.`);
}

function placeTrap(absX, absY) {
    const trapData = TRAPS_DATA[trapMode];
    if (!trapData) return;
    
    const x = Math.floor(absX / TILE_SIZE);
    const y = Math.floor(absY / TILE_SIZE);

    const tileCenter = {
        x: x * TILE_SIZE + TILE_SIZE / 2, 
        y: y * TILE_SIZE + TILE_SIZE / 2
    };

    const isSpawnOrRift = (x === path[0].x && y === path[0].y) || (x === rift.x / TILE_SIZE - 0.5 && y === rift.y / TILE_SIZE - 0.5);
    
    if (mapGrid[y] && mapGrid[y][x] === 0 && 
        !isSpawnOrRift &&
        !traps.find(t => Math.floor(t.x / TILE_SIZE) === x && Math.floor(t.y / TILE_SIZE) === y)) 
    {
        if (gold >= trapData.cost) {
            gold -= trapData.cost;
            traps.push({
                x: tileCenter.x, 
                y: tileCenter.y, 
                type: trapMode,
                damage: trapData.damage || 0, 
                slow: trapData.slow || 0, 
                uses: trapData.uses,
                color: trapData.color, 
                push: trapData.push || 0,
                cooldown: 0
            });
            showMessage(`Ловушка "${trapData.name}" установлена!`);
            updateInfo();
        } else {
            showMessage('Недостаточно золота!');
        }
    } else {
        showMessage('Нельзя ставить ловушку на стены, Рифт/Спаун или уже занятый тайл!');
    }
    trapMode = null; 
}

function handleCanvasClick(event) {
    if (!trapMode || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Координаты клика относительно Canvas (с учетом масштабирования)
    const clickX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (event.clientY - rect.top) * (canvas.height / rect.height);
    
    // Переводим координаты Canvas в абсолютные координаты Карты (учитываем сдвиг камеры!)
    const absMapX = clickX + cameraOffset.x;
    const absMapY = clickY + cameraOffset.y;
    
    placeTrap(absMapX, absMapY);
}

function setupEventHandlers() {
    if (!canvas) return;
    canvas.addEventListener('click', handleCanvasClick);
    
    canvas.addEventListener('touchstart', (e) => {
        if (e.target === canvas) {
            e.preventDefault(); 
            // Передаем координаты первого касания
            handleCanvasClick(e.touches[0]); 
        }
    }, { passive: false });
    
    document.querySelectorAll('.controls-panel .trap-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // Берем первую букву кнопки (A, T, S)
            const type = e.currentTarget.textContent.trim().split(' ')[0].substring(0, 1); 
            if (TRAPS_DATA[type]) {
                setTrapMode(type);
            }
        });
    });

    if(document.querySelector('.wave-btn')) {
        document.querySelector('.wave-btn').addEventListener('click', startNextWave);
    }
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
    const orcHealth = 100 + currentWave * 10;
    
    for (let i = 0; i < numOrcs; i++) {
        setTimeout(() => {
            orcs.push({
                x: path[0].x * TILE_SIZE + TILE_SIZE / 2, 
                y: path[0].y * TILE_SIZE + TILE_SIZE / 2,
                health: orcHealth, 
                maxHealth: orcHealth, 
                baseSpeed: 1, 
                slowEffect: 0, 
                pathIndex: 1, 
                size: 15,
                reward: 10
            });
        }, i * 500); 
    }
    updateInfo();
}


// ====================================================================
// ОТОБРАЖЕНИЕ (DRAW) - С ИСПОЛЬЗОВАНИЕМ СДВИГА КАМЕРЫ
// ====================================================================

function drawMap() {
    if (!ctx) return;
    
    // Очищаем Canvas
    ctx.clearRect(0, 0, LOGICAL_CANVAS_WIDTH, LOGICAL_CANVAS_HEIGHT); 

    mapGrid.forEach((row, y) => {
        row.forEach((cell, x) => {
            // Применяем сдвиг камеры
            const tileX = x * TILE_SIZE - cameraOffset.x;
            const tileY = y * TILE_SIZE - cameraOffset.y;
            
            // Если тайл находится за пределами видимой области, пропускаем его
            if (tileX + TILE_SIZE < 0 || tileX > LOGICAL_CANVAS_WIDTH ||
                tileY + TILE_SIZE < 0 || tileY > LOGICAL_CANVAS_HEIGHT) {
                return;
            }

            ctx.fillStyle = '#b0b0b0'; 
            ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            
            // Стены 
            if (cell === 1) {
                ctx.fillStyle = '#555'; 
                ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;
                ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            }
            
            // Вход/Рифт
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';

            if (x === path[0].x && y === path[0].y) { 
                ctx.fillStyle = '#004B82'; 
                ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = 'white';
                ctx.fillText('SPAWN', tileX + TILE_SIZE / 2, tileY + TILE_SIZE / 2 + 5);
            }
            if (x === rift.x / TILE_SIZE - 0.5 && y === rift.y / TILE_SIZE - 0.5) { 
                ctx.fillStyle = '#8B0000'; 
                ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = 'white';
                ctx.fillText('RIFT', tileX + TILE_SIZE / 2, tileY + TILE_SIZE / 2 + 5);
            }
        });
    });

    traps.forEach(trap => {
        const drawX = trap.x - cameraOffset.x;
        const drawY = trap.y - cameraOffset.y;

        ctx.fillStyle = trap.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.rect(drawX - TILE_SIZE/2 + 4, drawY - TILE_SIZE/2 + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(TRAPS_DATA[trap.type].icon, drawX, drawY + 5);
    });
}

function drawOrcs() {
    if (!ctx) return;
    orcs.forEach(orc => {
        const drawX = orc.x - cameraOffset.x;
        const drawY = orc.y - cameraOffset.y;

        ctx.fillStyle = '#3CB371'; 
        ctx.beginPath();
        ctx.arc(drawX, drawY, orc.size / 2, 0, Math.PI * 2); 
        ctx.fill();
        
        // Полоска здоровья
        const barWidth = orc.size * 2;
        const barHeight = 3;
        const barY = drawY - orc.size * 2;
        
        ctx.fillStyle = 'red';
        ctx.fillRect(drawX - orc.size, barY, barWidth, barHeight);
        ctx.fillStyle = 'lime';
        ctx.fillRect(drawX - orc.size, barY, barWidth * (orc.health / orc.maxHealth), barHeight);
    });
}

function drawGuardian() {
    if (!ctx) return;
    
    // Страж всегда рисуется в абсолютных координатах мира, но смещенных камерой
    const drawX = guardian.x - cameraOffset.x;
    const drawY = guardian.y - cameraOffset.y;

    // Эффект атаки
    if (guardian.isAttacking) {
        ctx.strokeStyle = '#FFD700'; 
        ctx.lineWidth = 5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(drawX, drawY, guardian.attackRange, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#4169E1'; 
    ctx.beginPath();
    ctx.arc(drawX, drawY, guardian.size / 2, 0, Math.PI * 2); 
    ctx.fill();
}

// ====================================================================
// ЦИКЛ ИГРЫ И ИНИЦИАЛИЗАЦИЯ
// ====================================================================

function update() {
    if (riftHealth <= 0) {
        showMessage('💔 ПОРАЖЕНИЕ! Рифт разрушен!');
        gameRunning = false;
        return;
    }
    
    handleGuardianMovement(); 
    calculateCameraOffset();

    if (!gameRunning) return;
    
    handleOrcMovement();
    handleTraps();
}

function gameLoop() {
    if (!ctx) {
        requestAnimationFrame(gameLoop);
        return;
    }

    update();
    drawMap();
    drawOrcs();
    drawGuardian();
    requestAnimationFrame(gameLoop);
}

// Функция для адаптации размера Canvas
function resizeCanvas() {
    if (!canvas) return;

    // 1. Получаем фактическую ширину, которую занимает элемент Canvas в CSS
    const container = document.getElementById('gameContainer');
    // Используем ширину контейнера, ограниченную max-width: 800px
    const displayWidth = container ? container.clientWidth : window.innerWidth; 
    
    // 2. Устанавливаем логические размеры Canvas (для рендеринга)
    canvas.width = LOGICAL_CANVAS_WIDTH;
    canvas.height = LOGICAL_CANVAS_HEIGHT;

    // 3. Устанавливаем физическую высоту элемента (для CSS), 
    // чтобы он сохранил пропорции (16:12 или 4:3)
    const aspectRatio = LOGICAL_CANVAS_HEIGHT / LOGICAL_CANVAS_WIDTH;
    const displayHeight = displayWidth * aspectRatio;
    canvas.style.height = `${displayHeight}px`;

    // 4. Пересчитываем смещение камеры 
    calculateCameraOffset();
}


function initGame() {
    canvas = document.getElementById('gameCanvas'); 
    
    if (!canvas) {
        console.error("Canvas с id 'gameCanvas' не найден. Убедитесь, что он есть в HTML.");
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    // Запускаем адаптацию при инициализации и при изменении размера окна
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    calculateCameraOffset(); 
    updateInfo();
    setupTouchControls(); 
    setupEventHandlers(); 
    showMessage('Управляйте Стражем (WASD/Сенсор), чтобы защитить Рифт! Начните волну.');
    
    gameLoop();
}

document.addEventListener('DOMContentLoaded', initGame);
