const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 기본 설정
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

// 카메라 설정
let cameraY = 0; // 카메라의 Y 위치 (스크롤 오프셋)
const SCROLL_THRESHOLD = GAME_HEIGHT / 3; // 플레이어가 이 높이에 도달하면 화면 스크롤 시작

// 이미지 로드 관리
const images = {};
const imageSources = {
    
    player_spritesheet: 'assets/player_spritesheet.png', // 플레이어 애니메이션 스프라이트 시트
    apple: 'assets/apple.png',
    enemy: 'assets/enemy.png',
    platform: 'assets/platform.png',
    background: 'assets/background.png', // 배경 이미지
    caterpillar: 'assets/caterpillar.png', // 애벌레 이미지
    owl: 'assets/owl.png', // 올빼미 이미지
    bug: 'assets/bug.png', // 방해꾼 벌레 이미지
    thundercloud: 'assets/thundercloud.png', // 번개구름 이미지
    diamond_blue: 'assets/diamond_blue.png', // 파란 다이아몬드
    diamond_white: 'assets/diamond_white.png', // 하얀 다이아몬드
    diamond_green: 'assets/diamond_green.png' // 초록 다이아몬드
};

let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

let audiosLoaded = 0;
const audios = {};
const audioSources = {
    bgm_main: 'assets/audio/bgm_main.wav',
    bgm_section2: 'assets/audio/bgm_section2.wav',
    sfx_jump: 'assets/audio/sfx_jump.wav',
    sfx_apple_drop: 'assets/audio/sfx_apple_drop.wav',
    sfx_enemy_hit: 'assets/audio/sfx_enemy_hit.wav',
    sfx_diamond: 'assets/audio/sfx_diamond.wav',
    sfx_game_over: 'assets/sfx_game_over.wav',
    sfx_game_clear: 'assets/sfx_game_clear.wav'
};
const totalAudios = Object.keys(audioSources).length;

function loadImage(name, src) {
    images[name] = new Image();
    images[name].src = src;
    images[name].onload = () => {
        imagesLoaded++;
        checkAllAssetsLoaded();
    };
    images[name].onerror = () => {
        console.error(`Failed to load image: ${src}`);
        imagesLoaded++;
        checkAllAssetsLoaded();
    };
}

function loadAudio(name, src) {
    audios[name] = new Audio();
    audios[name].src = src;
    audios[name].oncanplaythrough = () => {
        audiosLoaded++;
        checkAllAssetsLoaded();
    };
    audios[name].onerror = () => {
        console.error(`Failed to load audio: ${src}`);
        audiosLoaded++;
        checkAllAssetsLoaded();
    };
}

function checkAllAssetsLoaded() {
    if (imagesLoaded === totalImages && audiosLoaded === totalAudios) {
        console.log('All assets loaded!');
        initializePlatforms();
        player.y = platforms[0].y - player.height; // 플레이어 초기 위치 설정
        gameLoop(); // 모든 에셋이 로드되면 게임 시작
    }
}

// 모든 이미지 로드 시작
for (const name in imageSources) {
    loadImage(name, imageSources[name]);
}

// 모든 오디오 로드 시작
for (const name in audioSources) {
    loadAudio(name, audioSources[name]);
}

// 오디오 재생 함수
function playAudio(name, loop = false, volume = 1.0) {
    if (audios[name]) {
        audios[name].currentTime = 0; // 처음부터 재생
        audios[name].loop = loop;
        audios[name].volume = volume;
        audios[name].play().catch(e => console.error("Audio play failed:", e));
    }
}

// 오디오 중지 함수
function stopAudio(name) {
    if (audios[name]) {
        audios[name].pause();
        audios[name].currentTime = 0;
    }
}

// 모든 오디오 중지 함수
function stopAllAudios() {
    for (const name in audios) {
        stopAudio(name);
    }
}

// 플레이어 설정 (아파치)
const player = {
    x: GAME_WIDTH / 2 - 25,
    y: 0, // 초기 Y 위치는 initializePlatforms에서 설정
    width: 50,
    height: 50,
    speed: 5,
    isJumping: false,
    jumpPower: 15,
    velocityY: 0,
    gravity: 0.8, // 중력 값
    // 애니메이션 관련 속성
    frameX: 0, // 스프라이트 시트에서 현재 프레임의 X 좌표 (픽셀)
    frameY: 0, // 스프라이트 시트에서 현재 프레임의 Y 좌표 (픽셀)
    frameWidth: 50, // 스프라이트 한 프레임의 너비
    frameHeight: 50, // 스프라이트 한 프레임의 높이
    currentFrame: 0, // 현재 애니메이션 프레임 인덱스
    maxFrames: 4, // 애니메이션 총 프레임 수 (예: 걷기 애니메이션 4프레임)
    animationSpeed: 10, // 애니메이션 속도 (낮을수록 빠름)
    frameTimer: 0, // 프레임 타이머
    facingRight: true // 플레이어 방향 (오른쪽을 보고 있는지)
};

// 플랫폼 설정
let platforms = [];
let lastPlatformY = GAME_HEIGHT; // 가장 최근에 생성된 플랫폼의 Y 위치
const PLATFORM_HEIGHT = 20;
const PLATFORM_MIN_WIDTH = 80;
const PLATFORM_MAX_WIDTH = 150;
const PLATFORM_GAP_Y = 80; // 플랫폼 간의 수직 간격
const PLATFORM_GAP_X = 100; // 플랫폼 간의 수평 최대 간격

// 초기 플랫폼 생성
function initializePlatforms() {
    platforms.push({ x: GAME_WIDTH / 2 - 50, y: GAME_HEIGHT - PLATFORM_HEIGHT, width: 100, height: PLATFORM_HEIGHT }); // 시작 플랫폼
    lastPlatformY = GAME_HEIGHT - PLATFORM_HEIGHT;
    generatePlatforms(GAME_HEIGHT - PLATFORM_HEIGHT - PLATFORM_GAP_Y * 5); // 초기 몇 개의 플랫폼 생성
}

// 새로운 플랫폼 생성
function generatePlatforms(minY) {
    while (lastPlatformY > minY) {
        const platformWidth = Math.random() * (PLATFORM_MAX_WIDTH - PLATFORM_MIN_WIDTH) + PLATFORM_MIN_WIDTH;
        let platformX = Math.random() * (GAME_WIDTH - platformWidth);

        // 현재 구간에 따른 플랫폼 생성 패턴 변경
        if (currentSection === 0) { // 1구간 (기본)
            // 랜덤 배치
        } else if (currentSection === 1) { // 2구간 (더 좁거나 넓은 플랫폼, 특정 패턴)
            // 예시: 더 넓은 플랫폼 생성
            platformWidth = Math.random() * (PLATFORM_MAX_WIDTH * 1.5 - PLATFORM_MIN_WIDTH) + PLATFORM_MIN_WIDTH;
            platformX = Math.random() * (GAME_WIDTH - platformWidth);
        } else if (currentSection === 2) { // 3구간 (더 어려운 패턴)
            // 예시: 띄엄띄엄 배치
            platformWidth = Math.random() * (PLATFORM_MIN_WIDTH + 20) + 20;
            platformX = Math.random() * (GAME_WIDTH - platformWidth);
        }

        // 이전 플랫폼과의 X축 간격 조절 (너무 멀리 떨어지지 않도록)
        if (platforms.length > 0) {
            const prevPlatform = platforms[platforms.length - 1];
            const minX = Math.max(0, prevPlatform.x - PLATFORM_GAP_X);
            const maxX = Math.min(GAME_WIDTH - platformWidth, prevPlatform.x + prevPlatform.width + PLATFORM_GAP_X - platformWidth);
            platformX = Math.random() * (maxX - minX) + minX;
        }

        lastPlatformY -= PLATFORM_GAP_Y + Math.random() * 50; // Y 간격 랜덤 조절
        platforms.push({ x: platformX, y: lastPlatformY, width: platformWidth, height: PLATFORM_HEIGHT });
    }
}

// 플랫폼 업데이트 (제거 및 생성)
function updatePlatforms() {
    // 화면 밖으로 나간 플랫폼 제거
    platforms = platforms.filter(platform => platform.y - cameraY < GAME_HEIGHT + PLATFORM_HEIGHT);

    // 새로운 플랫폼 생성
    generatePlatforms(cameraY - GAME_HEIGHT / 2); // 카메라 위치에 따라 새로운 플랫폼 생성
}

// 사과 설정
let apples = [];
const APPLE_SIZE = 20;
// const APPLE_COLOR = 'red'; // 이미지 사용 시 색상 제거
const APPLE_SPEED = 5;

// 다이아몬드 설정
let diamonds = [];
const DIAMOND_SIZE = 30;
const DIAMOND_SPEED = 3;
const DIAMOND_SCORES = {
    blue: 200,
    white: 400,
    green: 600
};

// 적 설정
let enemies = [];
let lightning = []; // 번개 공격 관리

// 적 생성 함수
function createEnemy(type, x, y, width, height, speed, direction = 1, options = {}) {
    return { type, x, y, width, height, speed, direction, ...options };
}

// 번개 생성 함수
function createLightning(x, y, targetX, targetY, speed, damage) {
    return { x, y, targetX, targetY, speed, damage, width: 5, height: 20, color: 'yellow' };
}

// 초기 적 생성 (resetGame에서 호출)
function initializeEnemies() {
    enemies = [
        createEnemy('caterpillar', 200, GAME_HEIGHT - 150, 40, 40, 1, 1, { startY: GAME_HEIGHT - 150, moveRange: 50 }), // 애벌레
        createEnemy('owl', 500, GAME_HEIGHT - 250, 50, 50, 2, -1, { startY: GAME_HEIGHT - 250, moveRange: 100 }), // 올빼미
        createEnemy('bug', 100, GAME_HEIGHT - 350, 30, 30, 3, 1, { jumpInterval: 60, lastJumpTime: 0 }), // 방해꾼 벌레
        createEnemy('thundercloud', 300, GAME_HEIGHT - 450, 80, 60, 0.5, 1, { attackInterval: 180, lastAttackTime: 0, lightningDamage: 1 }) // 번개구름
    ];
}

// 새로운 적 생성 (플레이어 높이에 따라)
function generateEnemies(minY) {
    // 플레이어 높이에 따라 새로운 적을 동적으로 생성하는 로직 추가
    // 현재는 initializeEnemies에서 고정된 적만 생성
    // TODO: 각 구간별 적 생성 로직 추가
    if (currentSection === 0) {
        // 1구간: 애벌레, 올빼미
        if (Math.random() < 0.01) { // 낮은 확률로 생성
            enemies.push(createEnemy('caterpillar', Math.random() * GAME_WIDTH, minY - 50, 40, 40, 1, Math.random() > 0.5 ? 1 : -1, { startY: minY - 50, moveRange: 50 }));
        }
        if (Math.random() < 0.005) {
            enemies.push(createEnemy('owl', Math.random() * GAME_WIDTH, minY - 100, 50, 50, 2, Math.random() > 0.5 ? 1 : -1, { startY: minY - 100, moveRange: 100 }));
        }
    } else if (currentSection === 1) {
        // 2구간: 방해꾼 벌레, 번개구름
        if (Math.random() < 0.01) {
            enemies.push(createEnemy('bug', Math.random() * GAME_WIDTH, minY - 50, 30, 30, 3, Math.random() > 0.5 ? 1 : -1, { jumpInterval: 60, lastJumpTime: 0 }));
        }
        if (Math.random() < 0.003) {
            enemies.push(createEnemy('thundercloud', Math.random() * GAME_WIDTH, minY - 150, 80, 60, 0.5, Math.random() > 0.5 ? 1 : -1, { attackInterval: 180, lastAttackTime: 0, lightningDamage: 1 }));
        }
    }
}

// 게임 상태 변수
let score = 0;
let gameOver = false;
let gameStarted = false; // 게임 시작 여부
let gameClear = false; // 게임 클리어 여부

const GAME_CLEAR_HEIGHT = -2000; // 게임 클리어 목표 높이 (카메라 Y 기준)

const SECTION_HEIGHT = 600; // 각 구간의 높이
let currentSection = 0; // 현재 플레이어가 위치한 구간 (0부터 시작)

// 키보드 입력 상태
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    KeyD: false, // 사과 떨어뜨리기 (D 키)
    Enter: false // 게임 시작/재시작 (Enter 키)
};

// 이벤트 리스너 등록
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.code === 'Space' || e.code === 'KeyD' || e.code === 'Enter') {
        keys[e.key] = true;
        keys[e.code] = true; // Spacebar, KeyD, Enter를 위해 e.code 사용
    }
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.code === 'Space' || e.code === 'KeyD' || e.code === 'Enter') {
        keys[e.key] = false;
        keys[e.code] = false;
    }
});

// 사과 생성
function createApple() {
    apples.push({
        x: player.x + player.width / 2 - APPLE_SIZE / 2,
        y: player.y + player.height / 2,
        width: APPLE_SIZE,
        height: APPLE_SIZE,
        speed: APPLE_SPEED
    });
}

// 다이아몬드 생성
function createDiamond(x, y, type) {
    diamonds.push({
        x: x,
        y: y,
        width: DIAMOND_SIZE,
        height: DIAMOND_SIZE,
        type: type, // blue, white, green
        speed: DIAMOND_SPEED
    });
}

// 충돌 감지 함수 (AABB)
function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// 플레이어 업데이트
function updatePlayer() {
    // 좌우 이동
    if (keys.ArrowLeft && player.x > 0) {
        player.x -= player.speed;
        player.facingRight = false;
    }
    if (keys.ArrowRight && player.x < GAME_WIDTH - player.width) {
        player.x += player.speed;
        player.facingRight = true;
    }

    // 플레이어 애니메이션 업데이트
    player.frameTimer++;
    if (player.frameTimer >= player.animationSpeed) {
        player.frameTimer = 0;
        if (keys.ArrowLeft || keys.ArrowRight) { // 움직일 때만 애니메이션
            player.currentFrame = (player.currentFrame + 1) % player.maxFrames;
        } else {
            player.currentFrame = 0; // 정지 시 첫 프레임
        }
    }

    // 점프
    if (keys.Space && !player.isJumping) {
        player.velocityY = -player.jumpPower;
        player.isJumping = true;
        playAudio('sfx_jump'); // 점프 효과음
    }

    // 사과 떨어뜨리기
    if (keys.KeyD) {
        createApple();
        playAudio('sfx_apple_drop'); // 사과 떨어뜨리기 효과음
        keys.KeyD = false; // 한 번 누르면 한 번만 생성되도록
    }

    // 게임 시작/재시작
    if (keys.Enter) {
        if (gameOver || gameClear) {
            resetGame();
        } else if (!gameStarted) {
            gameStarted = true;
            playAudio('bgm_main', true, 0.5); // 메인 BGM 재생
        }
        keys.Enter = false; // 한 번 누르면 한 번만 작동되도록
    }

    // 중력 적용
    player.y += player.velocityY;
    player.velocityY += player.gravity;

    // 카메라 스크롤
    if (player.y < SCROLL_THRESHOLD) {
        cameraY = player.y - SCROLL_THRESHOLD;
    }

    // 현재 구간 업데이트
    const newSection = Math.floor(Math.abs(cameraY) / SECTION_HEIGHT);
    if (newSection > currentSection) {
        currentSection = newSection;
        // 구간 변경에 따른 BGM 변경 (예시: 2구간 진입 시 BGM 변경)
        if (currentSection === 1) { // 0부터 시작하므로 1은 두 번째 구간
            stopAudio('bgm_main');
            playAudio('bgm_section2', true, 0.5);
        } else if (currentSection === 0) { // 다시 첫 번째 구간으로 돌아올 경우
            stopAudio('bgm_section2');
            playAudio('bgm_main', true, 0.5);
        }
    }

    // 바닥에 닿았을 때 (캔버스 하단)
    if (player.y + player.height - cameraY > GAME_HEIGHT) {
            player.y = GAME_HEIGHT - player.height + cameraY;
            player.velocityY = 0;
            player.isJumping = false;
        }

        // 플레이어가 화면 밖으로 떨어지면 게임 오버
        if (player.y - cameraY > GAME_HEIGHT) {
            gameOver = true;
        }

    // 플랫폼 충돌 감지
    platforms.forEach(platform => {
        // 플레이어가 플랫폼 위에 있고, 다음 프레임에 플랫폼에 닿을 경우
        if (
            player.y + player.height <= platform.y && // 플레이어 발이 플랫폼 위
            player.y + player.height + player.velocityY >= platform.y && // 다음 프레임에 플랫폼에 닿음
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x
        ) {
            if (player.velocityY >= 0) { // 아래로 떨어지는 중일 때만 착지
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.isJumping = false;
            }
        }
    });
}

// 사과 업데이트
function updateApples() {
    for (let i = apples.length - 1; i >= 0; i--) {
        const apple = apples[i];
        apple.y += apple.speed;

        // 사과가 플랫폼에 닿았을 때 다이아몬드 생성 (임시 구현)
        platforms.forEach(platform => {
            if (isColliding(apple, platform) && apple.y + apple.height - apple.speed <= platform.y) {
                // 랜덤 다이아몬드 타입 선택 (검정 구멍 제외)
                const diamondTypes = ['blue', 'white', 'green'];
                const randomType = diamondTypes[Math.floor(Math.random() * diamondTypes.length)];
                createDiamond(apple.x, apple.y, randomType);
                apples.splice(i, 1); // 사과 제거
            }
        });

        // 화면 밖으로 나간 사과 제거
        if (apple.y > GAME_HEIGHT) {
            apples.splice(i, 1);
        }
    }
}

// 다이아몬드 업데이트
function updateDiamonds() {
    for (let i = diamonds.length - 1; i >= 0; i--) {
        const diamond = diamonds[i];
        diamond.y += diamond.speed; // 다이아몬드도 아래로 떨어지게

        // 플레이어와 다이아몬드 충돌 감지
        if (isColliding(player, diamond)) {
            score += DIAMOND_SCORES[diamond.type];
            diamonds.splice(i, 1); // 다이아몬드 제거
            playAudio('sfx_diamond'); // 다이아몬드 획득 효과음
        }

        // 화면 밖으로 나간 다이아몬드 제거
        if (diamond.y > GAME_HEIGHT) {
            diamonds.splice(i, 1);
        }
    }
}

// 적 업데이트
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        switch (enemy.type) {
            case 'caterpillar':
                // 애벌레: 좌우 이동과 함께 특정 Y 범위 내에서 상하 이동
                enemy.x += enemy.speed * enemy.direction;
                if (enemy.x <= 0 || enemy.x + enemy.width >= GAME_WIDTH) {
                    enemy.direction *= -1; // 방향 반전
                }
                enemy.y = enemy.startY + Math.sin(Date.now() * 0.005) * enemy.moveRange; // 상하 이동
                break;
            case 'owl':
                // 올빼미: 좌우 이동과 함께 상하 이동
                enemy.x += enemy.speed * enemy.direction;
                if (enemy.x <= 0 || enemy.x + enemy.width >= GAME_WIDTH) {
                    enemy.direction *= -1; // 방향 반전
                }
                enemy.y = enemy.startY + Math.cos(Date.now() * 0.007) * enemy.moveRange; // 상하 이동
                break;
            case 'bug':
                // 방해꾼 벌레: 나뭇가지 위를 기어다니며 점프 (간단화된 점프)
                enemy.x += enemy.speed * enemy.direction;
                if (enemy.x <= 0 || enemy.x + enemy.width >= GAME_WIDTH) {
                    enemy.direction *= -1; // 방향 반전
                }
                // 주기적인 점프 로직
                if (Date.now() - enemy.lastJumpTime > enemy.jumpInterval * 100) { // 1초마다 점프 시도
                    enemy.y -= 50; // 위로 점프
                    enemy.lastJumpTime = Date.now();
                }
                // 중력 적용 (간단화)
                enemy.y += 2; // 천천히 아래로 떨어지게
                break;
            case 'thundercloud':
                // 번개구름: 천천히 좌우 이동과 함께 주기적인 번개 공격
                enemy.x += enemy.speed * enemy.direction;
                if (enemy.x <= 0 || enemy.x + enemy.width >= GAME_WIDTH) {
                    enemy.direction *= -1; // 방향 반전
                }
                // 번개 공격
                if (Date.now() - enemy.lastAttackTime > enemy.attackInterval * 100) {
                    createLightning(enemy.x + enemy.width / 2, enemy.y + enemy.height, player.x + player.width / 2, GAME_HEIGHT, 10, enemy.lightningDamage);
                    playAudio('sfx_thunder'); // 번개 효과음 (추가 필요)
                    enemy.lastAttackTime = Date.now();
                }
                break;
        }

        // 사과와 적 충돌 감지
        for (let j = apples.length - 1; j >= 0; j--) {
            const apple = apples[j];
            if (isColliding(apple, enemy)) {
                apples.splice(j, 1); // 사과 제거
                enemies.splice(i, 1); // 적 제거
                score += 100; // 적 제거 시 점수 증가
                playAudio('sfx_enemy_hit'); // 적 피격 효과음
                break; // 현재 적에 대한 사과 검사 중단
            }
        }

        // 플레이어와 적 충돌 감지
        if (isColliding(player, enemy)) {
            player.lives--; // 잔기 감소
            if (player.lives <= 0) {
                gameOver = true;
                stopAllAudios();
                playAudio('sfx_game_over');
            } else {
                // 플레이어 잠시 무적 상태 또는 깜빡임 효과 추가 가능
                // 플레이어 위치 초기화 (옵션)
                player.x = GAME_WIDTH / 2 - 25;
                player.y = GAME_HEIGHT - player.height + cameraY; // 현재 화면 하단으로 이동
                player.velocityY = 0;
                player.isJumping = false;
            }
        }
    }
}

// 번개 업데이트
function updateLightning() {
    for (let i = lightning.length - 1; i >= 0; i--) {
        const bolt = lightning[i];
        bolt.y += bolt.speed;

        // 플레이어와 번개 충돌 감지
        if (isColliding(player, bolt)) {
            player.lives -= bolt.damage;
            lightning.splice(i, 1); // 번개 제거
            if (player.lives <= 0) {
                gameOver = true;
                stopAllAudios();
                playAudio('sfx_game_over');
            } else {
                // 플레이어 잠시 무적 상태 또는 깜빡임 효과 추가 가능
                // 플레이어 위치 초기화 (옵션)
                player.x = GAME_WIDTH / 2 - 25;
                player.y = GAME_HEIGHT - player.height + cameraY; // 현재 화면 하단으로 이동
                player.velocityY = 0;
                player.isJumping = false;
            }
        }

        // 화면 밖으로 나간 번개 제거
        if (bolt.y > GAME_HEIGHT) {
            lightning.splice(i, 1);
        }
    }
}

// 번개 그리기
function drawLightning() {
    lightning.forEach(bolt => {
        ctx.fillStyle = bolt.color;
        ctx.fillRect(bolt.x, bolt.y - cameraY, bolt.width, bolt.height);
    });
}

// 사과 그리기
function drawApples() {
    apples.forEach(apple => {
        if (images.apple.complete) {
            ctx.drawImage(images.apple, apple.x, apple.y - cameraY, apple.width, apple.height);
        }
    });
}

// 적 그리기
function drawEnemies() {
    enemies.forEach(enemy => {
        let enemyImage = null;
        switch (enemy.type) {
            case 'caterpillar':
                enemyImage = images.caterpillar;
                break;
            case 'owl':
                enemyImage = images.owl;
                break;
            case 'bug':
                enemyImage = images.bug;
                break;
            case 'thundercloud':
                enemyImage = images.thundercloud;
                break;
            default:
                enemyImage = images.enemy; // 기본 적 이미지 (fallback)
        }

        if (enemyImage && enemyImage.complete) {
            ctx.drawImage(enemyImage, enemy.x, enemy.y - cameraY, enemy.width, enemy.height);
        }
    });
}

// 다이아몬드 그리기
function drawDiamonds() {
    diamonds.forEach(diamond => {
        let diamondImage = null;
        switch (diamond.type) {
            case 'blue':
                diamondImage = images.diamond_blue;
                break;
            case 'white':
                diamondImage = images.diamond_white;
                break;
            case 'green':
                diamondImage = images.diamond_green;
                break;
        }

        if (diamondImage && diamondImage.complete) {
            ctx.drawImage(diamondImage, diamond.x, diamond.y - cameraY, diamond.width, diamond.height);
        }
    });
}

// 배경 그리기
function drawBackground() {
    if (images.background.complete) {
        // 배경 이미지를 반복해서 그려 스크롤 효과를 줍니다.
        const bgHeight = images.background.height;
        const numTiles = Math.ceil(GAME_HEIGHT / bgHeight) + 1;
        const startY = (cameraY % bgHeight) - bgHeight; // 스크롤에 따라 시작 Y 위치 조정

        for (let i = 0; i < numTiles; i++) {
            ctx.drawImage(images.background, 0, startY + i * bgHeight, GAME_WIDTH, bgHeight);
        }
    }
}

// 플랫폼 그리기
function drawPlatforms() {
    platforms.forEach(platform => {
        if (images.platform.complete) {
            ctx.drawImage(images.platform, platform.x, platform.y - cameraY, platform.width, platform.height);
        }
    });
}

// 점수 그리기
function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30 - cameraY);
}

// 잔기 그리기
function drawLives() {
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`Lives: ${player.lives}`, GAME_WIDTH - 120, 30 - cameraY);
}

// 게임 오버 화면 그리기
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = 'white';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);

    ctx.font = '30px Arial';
    ctx.fillText(`Final Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);

    ctx.font = '20px Arial';
    ctx.fillText('Press Enter to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
}

// 게임 클리어 화면 그리기
function drawGameClear() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = 'white';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME CLEAR!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);

    ctx.font = '30px Arial';
    ctx.fillText(`Final Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);

    ctx.font = '20px Arial';
    ctx.fillText('Press Enter to Play Again', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
}

// 게임 시작 화면 그리기
function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = 'white';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('요술나무', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);

    ctx.font = '30px Arial';
    ctx.fillText('Press Enter to Start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
}

// 게임 초기화
function resetGame() {
    player.x = GAME_WIDTH / 2 - 25;
    player.y = GAME_HEIGHT - player.height; // 초기 플랫폼 위치에 맞게 조정
    player.velocityY = 0;
    player.isJumping = false;

    platforms = [];
    lastPlatformY = GAME_HEIGHT; // 가장 최근에 생성된 플랫폼의 Y 위치
    initializePlatforms(); // 초기 플랫폼 다시 생성

    apples = [];
    diamonds = []; // 다이아몬드 초기화
    lightning = []; // 번개 초기화
    enemies = []; // 적 초기화
    // initializeEnemies(); // 이제 generateEnemies에서 동적으로 생성

    score = 0;
    player.lives = 3; // 잔기 초기화
    cameraY = 0;
    gameOver = false;
    gameClear = false;
    gameStarted = true; // 게임 시작 상태로 변경
    currentSection = 0; // 현재 구간 초기화

    // 플레이어 애니메이션 초기화
    player.currentFrame = 0;
    player.frameTimer = 0;
    player.facingRight = true;
}

// 게임 루프
function gameLoop() {
    if (!gameStarted) {
        drawStartScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameOver) {
        drawGameOver();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameClear) {
        drawGameClear();
        requestAnimationFrame(gameLoop);
        return;
    }

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawBackground(); // 배경 그리기

    updatePlayer(); // 플레이어 위치 업데이트
    updateApples(); // 사과 위치 업데이트
    updateDiamonds(); // 다이아몬드 위치 업데이트 및 충돌 감지
    updateEnemies(); // 적 위치 업데이트 및 충돌 감지
    updateLightning(); // 번개 업데이트
    updatePlatforms(); // 플랫폼 업데이트 (제거 및 생성)

    // 현재 구간에 따라 적 동적 생성
    generateEnemies(cameraY - GAME_HEIGHT); // 화면 상단에 새로운 적 생성

    // 게임 클리어 조건 확인
    if (player.y - cameraY < GAME_CLEAR_HEIGHT) {
        gameClear = true;
        stopAllAudios();
        playAudio('sfx_game_clear');
    }

    drawPlatforms(); // 플랫폼 그리기
    drawApples(); // 사과 그리기
    drawDiamonds(); // 다이아몬드 그리기
    drawEnemies(); // 적 그리기
    drawLightning(); // 번개 그리기
    drawScore(); // 점수 그리기
    drawLives(); // 잔기 그리기

    // 플레이어 그리기
    if (images.player_spritesheet.complete) {
        ctx.save(); // 현재 캔버스 상태 저장
        if (!player.facingRight) {
            ctx.scale(-1, 1); // 좌우 반전
            ctx.drawImage(
                images.player_spritesheet,
                player.currentFrame * player.frameWidth, // 스프라이트 시트 내 X 좌표
                player.frameY, // 스프라이트 시트 내 Y 좌표 (현재는 0, 나중에 점프/공격 등 추가 가능)
                player.frameWidth,
                player.frameHeight,
                -player.x - player.width, // 반전된 좌표 계산
                player.y - cameraY,
                player.width,
                player.height
            );
        } else {
            ctx.drawImage(
                images.player_spritesheet,
                player.currentFrame * player.frameWidth, // 스프라이트 시트 내 X 좌표
                player.frameY, // 스프라이트 시트 내 Y 좌표 (현재는 0, 나중에 점프/공격 등 추가 가능)
                player.frameWidth,
                player.frameHeight,
                player.x,
                player.y - cameraY,
                player.width,
                player.height
            );
        }
        ctx.restore(); // 캔버스 상태 복원
    }

    requestAnimationFrame(gameLoop);
}

// 게임 시작 (이미지 로드 후 호출됨)
// gameLoop(); // 주석 처리: 이미지가 로드되면 gameLoop가 호출됨