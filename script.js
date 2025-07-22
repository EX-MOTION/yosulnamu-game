const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 기본 설정
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

// 플레이어 설정 (아파치)
const player = {
    x: GAME_WIDTH / 2 - 25,
    y: GAME_HEIGHT - 60,
    width: 50,
    height: 50,
    color: 'green', // 아파치 색상
    speed: 5,
    isJumping: false,
    jumpPower: 15,
    velocityY: 0,
    gravity: 0.8 // 중력 값
};

// 플랫폼 설정
const platforms = [
    { x: 100, y: GAME_HEIGHT - 100, width: 200, height: 20, color: 'brown' },
    { x: 400, y: GAME_HEIGHT - 200, width: 150, height: 20, color: 'brown' },
    { x: 50, y: GAME_HEIGHT - 300, width: 250, height: 20, color: 'brown' },
    { x: 300, y: GAME_HEIGHT - 400, width: 180, height: 20, color: 'brown' }
];

// 사과 설정
let apples = [];
const APPLE_SIZE = 20;
const APPLE_COLOR = 'red';
const APPLE_SPEED = 5;

// 적 설정
let enemies = [
    { x: 200, y: GAME_HEIGHT - 150, width: 40, height: 40, color: 'purple', speed: 2, direction: 1 }, // 간단한 적
    { x: 500, y: GAME_HEIGHT - 250, width: 40, height: 40, color: 'purple', speed: 1.5, direction: -1 }
];

// 게임 상태 변수
let score = 0;
let gameOver = false;

// 키보드 입력 상태
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    KeyD: false // 사과 떨어뜨리기 (D 키)
};

// 이벤트 리스너 등록
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.code === 'Space' || e.code === 'KeyD') {
        keys[e.key] = true;
        keys[e.code] = true; // Spacebar와 KeyD를 위해 e.code 사용
    }
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.code === 'Space' || e.code === 'KeyD') {
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
        color: APPLE_COLOR,
        speed: APPLE_SPEED
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
    }
    if (keys.ArrowRight && player.x < GAME_WIDTH - player.width) {
        player.x += player.speed;
    }

    // 점프
    if (keys.Space && !player.isJumping) {
        player.velocityY = -player.jumpPower;
        player.isJumping = true;
    }

    // 사과 떨어뜨리기
    if (keys.KeyD) {
        createApple();
        keys.KeyD = false; // 한 번 누르면 한 번만 생성되도록
    }

    // 중력 적용
    player.y += player.velocityY;
    player.velocityY += player.gravity;

    // 바닥에 닿았을 때 (캔버스 하단)
    if (player.y + player.height > GAME_HEIGHT) {
            player.y = GAME_HEIGHT - player.height;
            player.velocityY = 0;
            player.isJumping = false;
        }

        // 플레이어가 화면 밖으로 떨어지면 게임 오버
        if (player.y > GAME_HEIGHT) {
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

        // 화면 밖으로 나간 사과 제거
        if (apple.y > GAME_HEIGHT) {
            apples.splice(i, 1);
        }
    }
}

// 적 업데이트
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // 간단한 좌우 이동
        enemy.x += enemy.speed * enemy.direction;
        if (enemy.x <= 0 || enemy.x + enemy.width >= GAME_WIDTH) {
            enemy.direction *= -1; // 방향 반전
        }

        // 사과와 적 충돌 감지
        for (let j = apples.length - 1; j >= 0; j--) {
            const apple = apples[j];
            if (isColliding(apple, enemy)) {
                apples.splice(j, 1); // 사과 제거
                enemies.splice(i, 1); // 적 제거
                score += 100; // 적 제거 시 점수 증가
                break; // 현재 적에 대한 사과 검사 중단
            }
        }
    }
}

// 사과 그리기
function drawApples() {
    apples.forEach(apple => {
        ctx.fillStyle = apple.color;
        ctx.fillRect(apple.x, apple.y, apple.width, apple.height);
    });
}

// 적 그리기
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
}

// 플랫폼 그리기
function drawPlatforms() {
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

// 점수 그리기
function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
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
    ctx.fillText('Press F5 to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
}

// 게임 루프
function gameLoop() {
    if (gameOver) {
        drawGameOver();
        return;
    }

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    updatePlayer(); // 플레이어 위치 업데이트
    updateApples(); // 사과 위치 업데이트
    updateEnemies(); // 적 위치 업데이트 및 충돌 감지

    drawPlatforms(); // 플랫폼 그리기
    drawApples(); // 사과 그리기
    drawEnemies(); // 적 그리기
    drawScore(); // 점수 그리기

    // 플레이어 그리기
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    requestAnimationFrame(gameLoop);
}

// 게임 시작
gameLoop();