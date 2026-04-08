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
    // 캔버스를 브라우저 창 크기에 맞게 생성합니다.
    createCanvas(windowWidth, windowHeight);
    
    video = createCapture(VIDEO);
    video.size(640, 480); // 내부 처리를 위한 비디오 사이즈는 유지
    video.hide();

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

// 창 크기가 변할 때 게임 화면 크기도 같이 변하게 합니다.
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
    textSize(width * 0.05); // 글자 크기도 화면 너비에 비례하게 설정
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
    // 비디오를 현재 캔버스 전체 크기에 맞게 출력
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
        // 640x480 기준으로 들어오는 손가락 좌표를 현재 width, height로 맵핑
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
        let size = g.isBoss ? width * 0.25 : width * 0.12; // 세균 크기도 화면 너비에 비례
        let shake = (g.isBoss && g.isHitting) ? sin(frameCount * 0.8) * (PI / 20) : 0;

        push();
        imageMode(CENTER);
        translate(g.x, g.y);
        rotate(shake);
        let img = g.isBoss ? goldImg : germImgs[g.type];
        if (img) image(img, 0, 0, size, size);
        pop();
        
        g.isHitting = false;

        // 체력바
        fill(255, 200); 
        noStroke();
        rect(g.x - size/2, g.y - size/2 - 20, size, 10, 5);
        fill(g.isBoss ? "#FFD700" : "#FF5252");
        rect(g.x - size/2, g.y - size/2 - 20, size * (g.hp / g.maxHp), 10, 5);

        if (dist(smoothX, smoothY, g.x, g.y) < size/2 + 40) {
            g.isHitting = true;
            if (frameCount % 6 === 0) {
                g.hp--;
                effects.push({ x: g.x, y: g.y, type: "bubble", life: 10 });
            }
            if (g.hp <= 0) {
                let addScore = g.isBoss ? 10 : 1;
                score += addScore;
                effects.push({ x: g.x, y: g.y - 40, type: "text", val: "+" + addScore, life: 30, col: g.isBoss ? "#FFD700" : "#FF5252" });
                germs.splice(i, 1);
                if (!g.isBoss) spawnGerm();
            }
        }
    }
}

function spawnGerm() {
    let isUpper = random(1) > 0.5;
    // 화면 크기에 비례하여 위치 선정
    let targetY = isUpper ? random(height * 0.1, height * 0.25) : random(height * 0.75, height * 0.9);
    let targetX = random(width * 0.1, width * 0.9);
    germs.push({ x: targetX, y: targetY, type: floor(random(3)), hp: 3, maxHp: 3, isBoss: false, isHitting: false });
}

function spawnBossGerm() {
    germs.push({ x: width/2, y: height/2, hp: 15, maxHp: 15, isBoss: true, isHitting: false });
}

function drawReturnButton() {
    push();
    fill("#EF5350");
    noStroke();
    rect(width - 120, 20, 100, 50, 15);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text("🏠 홈으로", width - 70, 45);
    pop();
}

function drawCuteUI(t) {
    push();
    fill(255, 230); 
    rect(20, 20, 200, 110, 20);
    fill(50); 
    textAlign(LEFT, CENTER);
    let m = floor(t / 60); 
    let s = t % 60;
    textSize(20); text("⏱️ 시간", 40, 55);
    textSize(26); fill("#FF4081"); text(`${m}:${nf(s, 2)}`, 130, 55);
    fill(50); textSize(20); text("🦠 점수", 40, 95);
    textSize(26); fill("#4CAF50"); text(`${score}`, 130, 95);
    pop();
}

function renderEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
        let e = effects[i];
        if (e.type === "bubble") {
            imageMode(CENTER); 
            if(bubbleImg) image(bubbleImg, e.x, e.y, 80, 80); 
            imageMode(CORNER);
        } else if (e.type === "text") {
            textAlign(CENTER); 
            textSize(25 + (30 - e.life)/2); 
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
        // 버튼 위치에 따른 클릭 감지 범위를 height 비율로 수정
        if (mouseY > height * 0.4 && mouseY < height * 0.5) {
            if (dist(mouseX, mouseY, width/2 - 120, height * 0.45) < 50) selectedTime = 60;
            if (dist(mouseX, mouseY, width/2, height * 0.45) < 50) selectedTime = 120;
            if (dist(mouseX, mouseY, width/2 + 120, height * 0.45) < 50) selectedTime = 180;
        }
        if (mouseY > height * 0.58 && mouseY < height * 0.68) {
            if (dist(mouseX, mouseY, width/2 - 110, height * 0.62) < 50) difficulty = 3;
            if (dist(mouseX, mouseY, width/2, height * 0.62) < 50) difficulty = 6;
            if (dist(mouseX, mouseY, width/2 + 110, height * 0.62) < 50) difficulty = 10;
        }
        if (modelLoaded && dist(mouseX, mouseY, width/2, height * 0.85) < 140) {
            startGame();
        }
    } else if (gameState === "PLAY") {
        if (mouseX > width - 120 && mouseX < width - 20 && mouseY > 20 && mouseY < 70) {
            gameState = "START";
        }
    } else if (gameState === "END") {
        if (dist(mouseX, mouseY, width/2, height * 0.85) < 100) gameState = "START";
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
    fill("#2E7D32"); textSize(width * 0.06); text("🦷 양치 성공! 🦷", width/2, height * 0.15);
    fill("#333"); textSize(30); text(`잡은 세균: ${score} 마리`, width/2, height * 0.28);
    
    fill(255, 230); 
    rectMode(CENTER);
    rect(width/2, height * 0.55, 400, 250, 25);
    rectMode(CORNER);
    
    fill("#555"); textSize(24); text("🏆 최고 기록 🏆", width/2, height * 0.45);
    textSize(20); textAlign(LEFT);
    for (let i = 0; i < MAX_RANKINGS; i++) {
        let y = height * 0.5 + i * 30;
        text(`${i + 1}등: ${highScores[i] || 0} 마리`, width/2 - 80, y);
    }
    
    textAlign(CENTER); fill("#FF6F61"); rectMode(CENTER);
    rect(width/2, height * 0.85, 220, 70, 35); fill(255); textSize(26); text("다시 하기", width/2, height * 0.85); rectMode(CORNER);
}

function drawBrush(x, y) {
    push(); 
    rectMode(CENTER); 
    fill(255); 
    stroke(150); 
    strokeWeight(2);
    // 칫솔 크기도 살짝 키움
    rect(x, y, 120, 50, 12); 
    for (let i = -45; i <= 45; i += 15) line(x + i, y - 20, x + i, y + 20);
    fill("#81D4FA"); 
    noStroke(); 
    rect(x, y + 55, 25, 70, 7); 
    pop();
}