// ====================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ИНИЦИАЛИЗАЦИЯ
// ====================================================================

let canvas;
let ctx;

// Увеличенные логические размеры карты для демонстрации работы камеры:
const TILE_WIDTH = 24; 
const TILE_HEIGHT = 18;
const TILE_SIZE = 40; 
// Логические размеры Canvas (размер окна, в котором мы смотрим)
const LOGICAL_CANVAS_WIDTH = 16 * TILE_SIZE; // 640
const LOGICAL_CANVAS_HEIGHT = 12 * TILE_SIZE; // 480

// Размер всей карты в пикселях (960x720)
const MAP_WIDTH = TILE_WIDTH * TILE_SIZE; 
const MAP_HEIGHT = TILE_HEIGHT * TILE_SIZE; 

let gold = 1000; 
let riftHealth = 20;
let currentWave = 0;
let gameRunning = false;
let orcs = [];
let traps = [];
let trapMode = null; 
let keys = {}; 

let cameraOffset = { x: 0, y: 0 };


// ====================================================================
// ДАННЫЕ ИГРЫ: КАРТА И ПУТИ
// ====================================================================

// Расширенная карта (24x18)
const mapGrid = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1], // Вход (1, 1)
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1], 
    [1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1], // Рифт (22, 16)
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1], 
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] 
];

// Узлы пути (координаты тайлов)
const PATHS = {
    // Путь D: Верхний, затем вниз
    'D': [
        {x: 1, y: 1}, 
        {x: 14, y: 1},  
        {x: 14, y: 15},  
        {x: 22, y: 15},
        {x: 22, y: 16} // RIFT (Конечная точка)
    ],
    // Путь H: Нижний, затем вверх и вправо
    'H': [
        {x: 1, y: 1}, 
        {x: 1, y: 16}, 
        {x: 14, y: 16}, 
        {x: 14, y: 12}, 
        {x: 22, y: 12},
        {x: 22, y: 16}  // RIFT
    ]
};


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
    'A': {cost: 50, damage: 5, color: '#e74c3c', uses: 1, name: 'Стрелы', icon: 'A'},
    'T': {cost: 25, damage: 0, color: '#95a5a6', slow: 0.5, uses: Infinity, name: 'Смола', icon: 'T'},
    'S': {cost: 75, damage: 0, color: '#3498db', push: 100, uses: 1, name: 'Батут', icon: 'S'}
};

const rift = {
    x: 22 * TILE_SIZE + TILE_SIZE / 2, 
    y: 16 * TILE_SIZE + TILE_SIZE / 2,
    size: TILE_SIZE / 2
};

// ====================================================================
// УПРАВЛЕНИЕ (КЛАВИАТУРА И СЕНСОР)
// ====================================================================

const touchControlsMap = {
    'up': 'KeyW', 'down': 'KeyS', 'left': 'KeyA', 'right': 'KeyD', 'attack-btn': 'Space'
};

function setupTouchControls() {
    const buttons = document.querySelectorAll('.touch-btn, #attack-btn');
    
    const handleControl = (e, isStart) => {
        e.preventDefault();
        const id = e.currentTarget.id;
        const code = touchControlsMap[id];
        
        if (code) {
             keys[code] = isStart;
        } 
        
        // Добавление обработки для кнопок, которые не имеют прямого code
        if (id === 'up') keys['KeyW'] = isStart;
        if (id === 'down') keys['KeyS'] = isStart;
        if (id === 'left') keys['KeyA'] = isStart;
        if (id === 'right') keys['KeyD'] = isStart;
    };
    
    buttons.forEach(button => {
        button.addEventListener('touchstart', (e) => handleControl(e, true));
        button.addEventListener('touchend', (e) => handleControl(e, false));
        button.addEventListener('mousedown', (e) => handleControl(e, true));
        button.addEventListener('mouseup', (e) => handleControl(e, false));
        button.addEventListener('touchcancel', (e) => handleControl(e, false));
        button.addEventListener('mouseleave', (e) => { // Обработка, если палец соскользнул
            if (e.buttons === 0) handleControl(e, false);
        });
    });
}


window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    // Предотвращение прокрутки страницы при WASD/Space
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});
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

const isWall = (x, y) => {
    // Проверка границ карты
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return true;
    
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    // Проверка, что индекс существует
    if (!mapGrid[tileY] || mapGrid[tileY].length <= tileX) return true; 

    return mapGrid[tileY][tileX] === 1; // 1 = стена
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
    
    // Проверка коллизий для X
    let canMoveX = true;
    if (dx !== 0) {
        const checkX = newX + (dx > 0 ? halfSize - 1 : -halfSize + 1); 
        if (isWall(checkX, guardian.y - halfSize + 1) || 
            isWall(checkX, guardian.y + halfSize - 1))   
        {
            canMoveX = false;
        }
    }
    
    // Проверка коллизий для Y
    let canMoveY = true;
    if (dy !== 0) {
        const checkY = newY + (dy > 0 ? halfSize - 1 : -halfSize + 1); 
        if (isWall(guardian.x - halfSize + 1, checkY) || 
            isWall(guardian.x + halfSize - 1, checkY))   
        {
            canMoveY = false;
        }
    }
    
    if (canMoveX) {
        guardian.x = newX;
    }
    if (canMoveY) {
        guardian.y = newY;
    }

    // Ограничение движения границами карты
    const padding = halfSize;
    guardian.x = Math.max(padding, Math.min(MAP_WIDTH - padding, guardian.x));
    guardian.y = Math.max(padding, Math.min(MAP_HEIGHT - padding, guardian.y));

    // Логика атаки
    if (keys['Space'] && guardian.attackTimer <= 0) {
        guardian.isAttacking = true;
        guardian.attackTimer = guardian.attackCooldown;
        attackOrcs();
    } else if (guardian.attackTimer > 0) {
        guardian.attackTimer--;
    } else {
        guardian.isAttacking = false; // Сбрасываем флаг после отката
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

// ====================================================================
// ЛОГИКА ДВИЖЕНИЯ ОРКОВ (ФИНАЛЬНЫЙ НАДЕЖНЫЙ ВАРИАНТ)
// ====================================================================

function handleOrcMovement() {
    // Увеличенный допуск: Орк должен быть в пределах TILE_SIZE/4 (10px) от центра, чтобы "прыгнуть"
    const ARRIVAL_TOLERANCE = TILE_SIZE / 4; 

    orcs.forEach(orc => {
        const currentPath = orc.currentPath;

        if (!currentPath || orc.pathIndex >= currentPath.length) {
            orc.health = -1; // Убить орка, чтобы его отфильтровали
            riftHealth -= 1;
            return;
        }

        const targetTile = currentPath[orc.pathIndex];
        // Точные пиксельные координаты центра целевого тайла
        const targetX = targetTile.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = targetTile.y * TILE_SIZE + TILE_SIZE / 2;
        
        const dx = targetX - orc.x;
        const dy = targetY - orc.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        orc.slowEffect = 0; // На данный момент игнорируем ловушки
        const effectiveSpeed = (orc.baseSpeed || 1.5) * (1 - orc.slowEffect); 
        
        // 1. Проверяем, достигнут ли тайл (если близки, переключаем цель)
        if (distance <= ARRIVAL_TOLERANCE) { 
            // Телепортируем на точный центр, чтобы избежать субпиксельных ошибок
            orc.x = targetX;
            orc.y = targetY;
            orc.pathIndex++;
            return;
        }

        let moveX = 0;
        let moveY = 0;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // 2. ГАРАНТИРОВАННОЕ ОСЕВОЕ ДВИЖЕНИЕ: Двигаемся ТОЛЬКО по доминирующей оси
        if (absDx > absDy) {
            // Двигаемся по X
            moveX = dx > 0 ? effectiveSpeed : -effectiveSpeed;
        } else if (absDy > absDx) {
            // Двигаемся по Y
            moveY = dy > 0 ? effectiveSpeed : -effectiveSpeed;
        } else {
             // Если расстояния равны, продолжаем по X (или по предыдущей оси)
             moveX = dx > 0 ? effectiveSpeed : -effectiveSpeed;
        }
        
        // Корректировка, чтобы не проскочить цель (ограничиваем движение оставшимся расстоянием)
        moveX = Math.min(absDx, Math.abs(moveX)) * Math.sign(dx);
        moveY = Math.min(absDy, Math.abs(moveY)) * Math.sign(dy);

        // 3. Применяем движение БЕЗ ПРОВЕРОК КОЛЛИЗИЙ (т.к. путь известен)
        orc.x += moveX;
        orc.y += moveY;
    });
}

function handleTraps() {
    // Фильтруем мертвых орков
    orcs = orcs.filter(orc => {
        if (orc.health <= 0) {
            gold += (orc.reward || 10);
            updateInfo();
            return false;
        }
        return true;
    });

    // Условие конца волны
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
    // Страж должен быть в центре видимой области
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

    // Проверка спауна и рифта (должны быть в середине тайла для проверки)
    const isSpawn = (x === PATHS.D[0].x && y === PATHS.D[0].y); 
    const isRiftTile = (x === rift.x / TILE_SIZE - 0.5 && y === rift.y / TILE_SIZE - 0.5);
    
    if (y < 0 || y >= mapGrid.length || x < 0 || x >= mapGrid[0].length) {
        showMessage('Нельзя ставить ловушку за пределами карты!');
        return;
    }

    // Проверка, что тайл пустой (0) и не является спауном/рифтом
    if (mapGrid[y][x] === 0 && 
        !isSpawn &&
        !isRiftTile &&
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
    trapMode = null; // Сброс режима установки ловушки
}

function handleCanvasClick(event) {
    if (!trapMode || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Получаем координаты клика относительно канваса
    const clientX = event.clientX || (event.touches ? event.touches[0].clientX : 0);
    const clientY = event.clientY || (event.touches ? event.touches[0].clientY : 0);

    const clickX = (clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (clientY - rect.top) * (canvas.height / rect.height);

    // Преобразуем координаты в абсолютные координаты карты
    const absMapX = clickX + cameraOffset.x;
    const absMapY = clickY + cameraOffset.y;
    
    placeTrap(absMapX, absMapY);
}

function setupEventHandlers() {
    if (!canvas) return;
    
    // Обработка клика/тапа для установки ловушек
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', (e) => {
        if (trapMode) {
            e.preventDefault(); 
            handleCanvasClick(e); 
        }
    }, { passive: false });
    
    // Обработка кнопок ловушек
    document.querySelectorAll('.controls-panel .trap-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const type = e.currentTarget.getAttribute('data-type');
            if (TRAPS_DATA[type]) {
                setTrapMode(type);
            }
        });
    });

    // Обработка кнопки "Начать Волну"
    const waveBtn = document.querySelector('.wave-btn');
    if(waveBtn) {
        waveBtn.addEventListener('click', startNextWave);
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

    const pathKeys = ['D', 'H']; 
    const numOrcs = 5 + currentWave * 2;
    const orcHealth = 100 + currentWave * 10;
    
    for (let i = 0; i < numOrcs; i++) {
        // Случайный выбор пути
        const pathKey = pathKeys[Math.floor(Math.random() * pathKeys.length)];
        const selectedPath = PATHS[pathKey];
        
        setTimeout(() => {
            orcs.push({
                x: selectedPath[0].x * TILE_SIZE + TILE_SIZE / 2, 
                y: selectedPath[0].y * TILE_SIZE + TILE_SIZE / 2,
                health: orcHealth, 
                maxHealth: orcHealth, 
                baseSpeed: 1.5, // Базовая скорость
                slowEffect: 0, 
                pathIndex: 1, 
                size: 15, 
                reward: 10,
                currentPath: selectedPath 
            });
        }, i * 500); // Интервал спауна 0.5 секунды
    }
    updateInfo();
}


// ====================================================================
// ОТОБРАЖЕНИЕ (DRAW)
// ====================================================================

function drawMap() {
    if (!ctx) return;
    
    // Очистка только видимой области
    ctx.clearRect(0, 0, LOGICAL_CANVAS_WIDTH, LOGICAL_CANVAS_HEIGHT); 

    mapGrid.forEach((row, y) => {
        row.forEach((cell, x) => {
            const tileX = x * TILE_SIZE - cameraOffset.x;
            const tileY = y * TILE_SIZE - cameraOffset.y;
            
            // Отрисовка только видимых тайлов
            if (tileX + TILE_SIZE < 0 || tileX > LOGICAL_CANVAS_WIDTH ||
                tileY + TILE_SIZE < 0 || tileY > LOGICAL_CANVAS_HEIGHT) {
                return;
            }

            ctx.fillStyle = '#b0b0b0'; 
            ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            
            if (cell === 1) {
                ctx.fillStyle = '#555'; 
                ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;
                ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            }
            
            // Надписи SPAWN и RIFT
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';

            if (x === PATHS.D[0].x && y === PATHS.D[0].y) { 
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

    // Отрисовка ловушек
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
        
        if (drawX + orc.size < 0 || drawX - orc.size > LOGICAL_CANVAS_WIDTH ||
            drawY + orc.size < 0 || drawY - orc.size > LOGICAL_CANVAS_HEIGHT) {
            return;
        }

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
    
    const drawX = guardian.x - cameraOffset.x;
    const drawY = guardian.y - cameraOffset.y;

    // Отрисовка радиуса атаки
    if (guardian.isAttacking && guardian.attackTimer > 0) {
        ctx.strokeStyle = '#FFD700'; 
        ctx.lineWidth = 5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(drawX, drawY, guardian.attackRange, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Отрисовка Стража
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

function resizeCanvas() {
    if (!canvas) return;

    const container = document.getElementById('gameContainer');
    const displayWidth = container ? container.clientWidth : window.innerWidth; 
    
    // Устанавливаем логические размеры
    canvas.width = LOGICAL_CANVAS_WIDTH;
    canvas.height = LOGICAL_CANVAS_HEIGHT;

    // Масштабируем CSS-размер для адаптивности
    const aspectRatio = LOGICAL_CANVAS_HEIGHT / LOGICAL_CANVAS_WIDTH;
    const displayHeight = displayWidth * aspectRatio;
    canvas.style.height = `${displayHeight}px`;

    calculateCameraOffset();
}


function initGame() {
    canvas = document.getElementById('gameCanvas'); 
    
    if (!canvas) {
        console.error("Canvas с id 'gameCanvas' не найден.");
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    calculateCameraOffset(); 
    updateInfo();
    setupTouchControls(); 
    setupEventHandlers(); 
    
    gameLoop();
}

document.addEventListener('DOMContentLoaded', initGame);
