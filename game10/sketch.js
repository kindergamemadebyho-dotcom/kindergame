let video;
let handpose;
let predictions = [];
let teethImg, bubbleImg, goldImg;
let germImgs = [];
let germs = [];
let effects = [];

let smoothX = 0, smoothY = 0;
let gameState = "START"; 
let modelLoaded = false;
let score = 0;
let timer = 0;

let selectedTime = 60; 
let difficulty = 6; 
let bossSpawned = false;

let highScores = [];
const MAX_RANKINGS = 5;

function preload() {
    // 이미지 파일명과 실제 파일명이 일치하는지 꼭 확인해주세요!
    teethImg = loadImage('teeth.png');
    bubbleImg = loadImage('bubble.png'); 
    goldImg = loadImage('gold.png'); 
    for (let i = 0; i < 3; i++) {
        germImgs[i] = loadImage(`germ${i+1}.png`);
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

// [수정된 코드 삽입]
handpose = ml5.handPose(video, () => {
    modelLoaded = true;
    console.log("모델 준비 완료!");
});

// v1.x 버전은 on 대신 detectStart를 사용하여 실시간 감지를 시작합니다.
handpose.detectStart(video, (results) => {
    predictions = results;
});

    loadRankings();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    background(255);
    if (gameState === "START") drawStartScreen();
    else if (gameState === "PLAY") drawPlayScreen();
    else if (gameState === "END") drawEndScreen();
}

function drawStartScreen() {
    bossSpawned = false;
    background("#E0F7FA"); 
    textAlign(CENTER, CENTER);
    noStroke();
    
    fill("#FF6F61");
    textSize(width * 0.05);
    text("🪥 치카치카 수호대 🪥", width/2, height * 0.2);
    
    fill(255, 230);
    rectMode(CENTER);
    rect(width/2, height * 0.5, width * 0.8, height * 0.4, 30);
    
    fill(50);
    textSize(20);
    text("⏱️ 양치 시간 선택", width/2, height * 0.38);
    drawCuteBtn(width/2 - 120, height * 0.45, "1분", 60, selectedTime);
    drawCuteBtn(width/2, height * 0.45, "2분", 120, selectedTime);
    drawCuteBtn(width/2 + 120, height * 0.45, "3분", 180, selectedTime);

    text("😈 세균 마리 수", width/2, height * 0.55);
    drawCuteBtn(width/2 - 110, height * 0.62, "조금", 3, difficulty);
    drawCuteBtn(width/2, height * 0.62, "보통", 6, difficulty);
    drawCuteBtn(width/2 + 110, height * 0.62, "많이", 10, difficulty);

    if (modelLoaded) {
        fill("#4CAF50");
        rect(width/2, height * 0.85, 280, 80, 40);
        fill(255);
        textSize(32);
        text("🪥 게임 시작!", width/2, height * 0.85);
    } else {
        fill(180);
        rect(width/2, height * 0.85, 300, 80, 40);
        fill(255);
        textSize(18);
        text("로딩 중 (카메라를 확인하세요)", width/2, height * 0.85);
    }
    rectMode(CORNER);
}

function drawCuteBtn(x, y, label, val, current) {
    push();
    rectMode(CENTER);
    let isSelected = (val === current);
    fill(isSelected ? "#FF4081" : "#FCE4EC");
    stroke(isSelected ? 255 : "#F8BBD0");
    strokeWeight(isSelected ? 3 : 2);
    rect(x, y, 100, 50, 15);
    fill(isSelected ? 255 : "#880E4F");
    noStroke();
    textSize(18);
    text(label, x, y);
    pop();
}

function drawPlayScreen() {
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();

    imageMode(CORNERS);
    if (teethImg) image(teethImg, 0, 0, width, height);
    imageMode(CORNER);

    let timeLeft = selectedTime - floor((millis() - timer) / 1000);
    if (!bossSpawned && timeLeft <= selectedTime / 5 && timeLeft > 0) {
        spawnBossGerm();
        bossSpawned = true;
    }
    if (timeLeft <= 0) { gameOver(); return; }

    // v1.x 버전용 손가락 좌표 인식 로직
// [수정된 코드 삽입]
if (predictions && predictions.length > 0) {
    let hand = predictions[0];
    
    // ml5 v1.x에서 검지 끝(index_finger_tip)은 keypoints 배열의 8번입니다.
    let indexFinger = hand.keypoints[8]; 
    
    if (indexFinger) {
        let targetX = map(indexFinger.x, 0, 640, width, 0);
        let targetY = map(indexFinger.y, 0, 480, 0, height);
        
        smoothX = lerp(smoothX, targetX, 0.4);
        smoothY = lerp(smoothY, targetY, 0.4);
    }
    // 칫솔 그리기는 if문 밖이 아니라 좌표가 잡혔을 때만 그리거나 
    // smoothX, Y를 그대로 사용하여 호출하면 됩니다.
    drawBrush(smoothX, smoothY);
}

    handleGerms();
    renderEffects();
    drawCuteUI(timeLeft);
}

function handleGerms() {
    for (let i = germs.length - 1; i >= 0; i--) {
        let g = germs[i];
        let size = g.isBoss ? width * 0.25 : width * 0.12;
        
        // ✨ 요청하신 부분: 모든 세균이 흔들리도록 설정
        let shake = g.isHitting ? sin(frameCount * 0.8) * (PI / 20) : 0;

        push();
        imageMode(CENTER);
        translate(g.x, g.y);
        rotate(shake);
        let img = g.isBoss ? goldImg : germImgs[g.type];
        if (img) image(img, 0, 0, size, size);
        pop();
        
        g.isHitting = false;

        // 충돌 판정 및 점수
        if (dist(smoothX, smoothY, g.x, g.y) < size/2 + 40) {
            g.isHitting = true;
            if (frameCount % 6 === 0) {
                g.hp--;
                effects.push({ x: g.x, y: g.y, type: "bubble", life: 10 });
            }
            if (g.hp <= 0) {
                score += g.isBoss ? 10 : 1;
                germs.splice(i, 1);
                if (!g.isBoss) spawnGerm();
            }
        }
    }
}

function spawnGerm() {
    germs.push({
        x: random(width * 0.2, width * 0.8),
        y: random(height * 0.1, height * 0.9),
        type: floor(random(3)),
        hp: 3,
        maxHp: 3,
        isBoss: false,
        isHitting: false
    });
}

function spawnBossGerm() {
    germs.push({
        x: width/2, y: height/2, hp: 15, maxHp: 15, isBoss: true, isHitting: false
    });
}

function startGame() {
    score = 0;
    germs = [];
    bossSpawned = false;
    for(let i=0; i<difficulty; i++) spawnGerm();
    timer = millis();
    gameState = "PLAY";
}

function drawBrush(x, y) {
    push(); 
    rectMode(CENTER); 
    fill(255); stroke(150); 
    rect(x, y, 100, 40, 10);
    fill("#81D4FA"); noStroke();
    rect(x, y + 45, 20, 60, 5); 
    pop();
}

function drawCuteUI(t) {
    fill(255, 200); rect(20, 20, 150, 80, 15);
    fill(0); textSize(20); textAlign(LEFT);
    text(`⏱️ ${t}s`, 40, 50);
    text(`🦠 ${score}`, 40, 85);
}

function loadRankings() {
    let saved = localStorage.getItem('teethRanking');
    highScores = saved ? JSON.parse(saved) : [];
}

function gameOver() {
    gameState = "END";
    highScores.push(score);
    highScores.sort((a, b) => b - a);
    highScores = highScores.slice(0, MAX_RANKINGS);
    localStorage.setItem('teethRanking', JSON.stringify(highScores));
}

function drawEndScreen() {
    background("#E8F5E9"); textAlign(CENTER, CENTER);
    fill("#2E7D32"); textSize(40); text("🦷 양치 성공! 🦷", width/2, height * 0.3);
    fill(0); textSize(30); text(`점수: ${score}`, width/2, height * 0.5);
    fill("#FF6F61"); rectMode(CENTER);
    rect(width/2, height * 0.75, 200, 60, 30);
    fill(255); text("다시 하기", width/2, height * 0.75);
    rectMode(CORNER);
}

function mousePressed() {
    if (gameState === "START") {
        if (modelLoaded && dist(mouseX, mouseY, width/2, height * 0.85) < 140) startGame();
        if (mouseY > height * 0.4 && mouseY < height * 0.5) {
            if (dist(mouseX, mouseY, width/2 - 120, height * 0.45) < 50) selectedTime = 60;
            if (dist(mouseX, mouseY, width/2, height * 0.45) < 50) selectedTime = 120;
            if (dist(mouseX, mouseY, width/2 + 120, height * 0.45) < 50) selectedTime = 180;
        }
    } else if (gameState === "END") {
        if (dist(mouseX, mouseY, width/2, height * 0.75) < 100) gameState = "START";
    }
}

function renderEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
        let e = effects[i];
        if (e.type === "bubble") {
            imageMode(CENTER); 
            if(bubbleImg) image(bubbleImg, e.x, e.y, 60, 60); 
            imageMode(CORNER);
        }
        e.life--; 
        if (e.life <= 0) effects.splice(i, 1);
    }
}