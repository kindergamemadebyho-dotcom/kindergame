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
    createCanvas(640, 480);
    
    // 비디오 설정
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

    // 모델 로딩 (옵션 최적화)
    const options = { 
        flipHorizontal: false, 
        detectionConfidence: 0.6
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
    textSize(50);
    text("🪥 치카치카 수호대 🪥", width/2, 90);
    
    fill(255, 230);
    rect(70, 140, 500, 190, 30);
    
    fill(50);
    textSize(18);
    text("⏱️ 양치 시간 선택", width/2, 165);
    drawCuteBtn(width/2 - 100, 200, "1분", 60, selectedTime);
    drawCuteBtn(width/2, 200, "2분", 120, selectedTime);
    drawCuteBtn(width/2 + 100, 200, "3분", 180, selectedTime);

    text("😈 세균 마리 수", width/2, 255);
    drawCuteBtn(width/2 - 90, 290, "조금", 3, difficulty);
    drawCuteBtn(width/2, 290, "보통", 6, difficulty);
    drawCuteBtn(width/2 + 90, 290, "많이", 10, difficulty);

    if (modelLoaded) {
        fill("#4CAF50");
        rectMode(CENTER);
        rect(width/2, 395, 240, 70, 35);
        fill(255);
        textSize(32);
        text("🪥 게임 시작!", width/2, 395);
        rectMode(CORNER);
    } else {
        fill(180);
        rectMode(CENTER);
        rect(width/2, 395, 240, 70, 35);
        fill(255);
        textSize(18);
        text("준비 중... (잠시만 기다려요)", width/2, 395);
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
    rect(x, y, 90, 40, 15);
    fill(isSelected ? 255 : "#880E4F");
    noStroke();
    textSize(16);
    text(label, x, y);
    pop();
}

function drawPlayScreen() {
    // 1. 비디오 출력
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();

    // 2. 배경 출력
    imageMode(CORNERS);
    if (teethImg) image(teethImg, 0, 0, width, height);
    imageMode(CORNER);

    let timeLeft = selectedTime - floor((millis() - timer) / 1000);
    if (!bossSpawned && timeLeft <= selectedTime / 5 && timeLeft > 0) {
        spawnBossGerm();
        bossSpawned = true;
    }
    if (timeLeft <= 0) { gameOver(); return; }

    // 3. 손가락 추적
    if (predictions && predictions.length > 0) {
        let hand = predictions[0];
        let indexFinger = hand.landmarks[8];
        let targetX = map(indexFinger[0], 0, 640, width, 0);
        let targetY = map(indexFinger[1], 0, 480, 0, height);
        
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
        let size = g.isBoss ? 150 : 80;
        let shake = (g.isBoss && g.isHitting) ? sin(frameCount * 0.8) * (PI / 20) : 0;

        push();
        imageMode(CENTER);
        translate(g.x + size/2, g.y + size/2);
        rotate(shake);
        let img = g.isBoss ? goldImg : germImgs[g.type];
        if (img) image(img, 0, 0, size, size);
        pop();
        
        g.isHitting = false;

        // 체력바
        fill(255, 200); 
        noStroke();
        rect(g.x + size*0.1, g.y - 15, size*0.8, 8, 4);
        fill(g.isBoss ? "#FFD700" : "#FF5252");
        rect(g.x + size*0.1, g.y - 15, size*0.8 * (g.hp / g.maxHp), 8, 4);

        if (dist(smoothX, smoothY, g.x + size/2, g.y + size/2) < size/2 + 35) {
            g.isHitting = true;
            if (frameCount % 6 === 0) {
                g.hp--;
                effects.push({ x: g.x + size/2, y: g.y + size/2, type: "bubble", life: 10 });
            }
            if (g.hp <= 0) {
                let addScore = g.isBoss ? 10 : 1;
                score += addScore;
                effects.push({ x: g.x + size/2, y: g.y - 20, type: "text", val: "+" + addScore, life: 30, col: g.isBoss ? "#FFD700" : "#FF5252" });
                germs.splice(i, 1);
                if (!g.isBoss) spawnGerm();
            }
        }
    }
}

function spawnGerm() {
    let isUpper = random(1) > 0.5;
    let targetY = isUpper ? random(30, 90) : random(360, 420);
    let targetX = random(80, width - 160);
    germs.push({ x: targetX, y: targetY, type: floor(random(3)), hp: 3, maxHp: 3, isBoss: false, isHitting: false });
}

function spawnBossGerm() {
    germs.push({ x: width/2 - 75, y: height/2 - 75, hp: 15, maxHp: 15, isBoss: true, isHitting: false });
}

function drawReturnButton() {
    push();
    fill("#EF5350"); // 투명도 인자 오류 가능성 제거
    noStroke();
    rect(width - 100, 20, 80, 40, 15);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text("🏠 홈으로", width - 60, 40);
    pop();
}

function drawCuteUI(t) {
    push();
    fill(255, 230); 
    rect(15, 15, 175, 95, 20);
    fill(50); 
    textAlign(LEFT, CENTER);
    let m = floor(t / 60); 
    let s = t % 60;
    textSize(18); text("⏱️ 시간", 30, 45);
    textSize(24); fill("#FF4081"); text(`${m}:${nf(s, 2)}`, 110, 45);
    fill(50); textSize(18); text("🦠 점수", 30, 75);
    textSize(24); fill("#4CAF50"); text(`${score}`, 110, 75);
    pop();
}

function renderEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
        let e = effects[i];
        if (e.type === "bubble") {
            imageMode(CENTER); 
            if(bubbleImg) image(bubbleImg, e.x, e.y, 60, 60); 
            imageMode(CORNER);
        } else if (e.type === "text") {
            textAlign(CENTER); 
            textSize(20 + (30 - e.life)/2); 
            fill(e.col);
            noStroke();
            text(e.val, e.x, e.y - (30 - e.life));
        }
        e.life--; 
        if (e.life <= 0) effects.splice(i, 1);
    }
}

function mousePressed() {
    if (gameState === "START") {
        if (mouseY > 175 && mouseY < 230) {
            if (dist(mouseX, mouseY, width/2 - 100, 200) < 40) selectedTime = 60;
            if (dist(mouseX, mouseY, width/2, 200) < 40) selectedTime = 120;
            if (dist(mouseX, mouseY, width/2 + 100, 200) < 40) selectedTime = 180;
        }
        if (mouseY > 265 && mouseY < 320) {
            if (dist(mouseX, mouseY, width/2 - 90, 290) < 35) difficulty = 3;
            if (dist(mouseX, mouseY, width/2, 290) < 35) difficulty = 6;
            if (dist(mouseX, mouseY, width/2 + 90, 290) < 35) difficulty = 10;
        }
        if (modelLoaded && dist(mouseX, mouseY, width/2, 395) < 120) {
            startGame();
        }
    } else if (gameState === "PLAY") {
        if (mouseX > width - 100 && mouseX < width - 20 && mouseY > 20 && mouseY < 60) {
            gameState = "START";
        }
    } else if (gameState === "END") {
        if (dist(mouseX, mouseY, width/2, 410) < 100) gameState = "START";
    }
}

function startGame() {
    score = 0;
    germs = [];
    bossSpawned = false;
    for(let i=0; i<difficulty; i++) spawnGerm();
    timer = millis();
    gameState = "PLAY";
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
    fill("#2E7D32"); textSize(45); text("🦷 양치 성공! 🦷", width/2, 80);
    fill("#333"); textSize(28); text(`잡은 세균: ${score} 마리`, width/2, 140);
    fill(255, 230); rect(width/2 - 180, 180, 360, 180, 25);
    fill("#555"); textSize(22); text("🏆 최고 기록 🏆", width/2, 205);
    textSize(16); textAlign(LEFT);
    for (let i = 0; i < MAX_RANKINGS; i++) {
        let y = 235 + i * 22;
        text(`${i + 1}등: ${highScores[i] || 0} 마리`, width/2 - 80, y);
    }
    textAlign(CENTER); fill("#FF6F61"); rectMode(CENTER);
    rect(width/2, 410, 200, 60, 30); fill(255); textSize(24); text("다시 하기", width/2, 410); rectMode(CORNER);
}

function drawBrush(x, y) {
    push(); rectMode(CENTER); fill(255); stroke(150); strokeWeight(2);
    rect(x, y, 90, 40, 12); for (let i = -35; i <= 35; i += 12) line(x + i, y - 15, x + i, y + 15);
    fill("#81D4FA"); noStroke(); rect(x, y + 40, 20, 50, 7); pop();
}