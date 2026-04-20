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

    // ✅ 핵심: handpose 안정 해상도
    video.size(640, 480);
    video.hide();

    const options = { 
        flipHorizontal: true, 
        detectionConfidence: 0.7
    };
    
    handpose = ml5.handpose(video, options, () => {
        modelLoaded = true;
        console.log("Model Ready");
    });

    handpose.on("predict", results => {
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
    rectMode(CORNER);
    
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
        rectMode(CENTER);
        rect(width/2, height * 0.85, 280, 80, 40);
        fill(255);
        textSize(32);
        text("🪥 게임 시작!", width/2, height * 0.85);
        rectMode(CORNER);
    } else {
        fill(180);
        rectMode(CENTER);
        rect(width/2, height * 0.85, 300, 80, 40);
        fill(255);
        textSize(18);
        text("준비 중... (잠시만 기다려요)", width/2, height * 0.85);
        rectMode(CORNER);
    }
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

    if (predictions && predictions.length > 0) {
        let hand = predictions[0];
        let indexFinger = hand.landmarks[8];

        // ✅ 핵심: video 기준으로 매핑
        let targetX = map(indexFinger[0], 0, video.width, width, 0);
        let targetY = map(indexFinger[1], 0, video.height, 0, height);
        
        smoothX = lerp(smoothX, targetX, 0.4);
        smoothY = lerp(smoothY, targetY, 0.4);
        drawBrush(smoothX, smoothY);
    }

    handleGerms();
    renderEffects();
    drawCuteUI(timeLeft);
    drawReturnButton(); 
}

function handleGerms() {
    for (let i = germs.length - 1; i >= 0; i--) {
        let g = germs[i];
        let size = g.isBoss ? width * 0.25 : width * 0.12;

        if (dist(smoothX, smoothY, g.x, g.y) < size/2 + 40) {
            if (frameCount % 6 === 0) {
                g.hp--;
            }
            if (g.hp <= 0) {
                score += g.isBoss ? 10 : 1;
                germs.splice(i, 1);
                if (!g.isBoss) spawnGerm();
            }
        }

        let img = g.isBoss ? goldImg : germImgs[g.type];
        if (img) image(img, g.x, g.y, size, size);
    }
}

function spawnGerm() {
    germs.push({
        x: random(width),
        y: random(height),
        type: floor(random(3)),
        hp: 3,
        maxHp: 3,
        isBoss: false
    });
}

function spawnBossGerm() {
    germs.push({
        x: width/2,
        y: height/2,
        hp: 15,
        maxHp: 15,
        isBoss: true
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