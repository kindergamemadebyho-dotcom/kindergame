let video;
let handpose;
let predictions = [];
let teethImg, brushImg;
let germImgs = [];
let germs = [];

// 게임 상태 및 설정
let gameState = "START"; 
let modelLoaded = false; // AI 모델 로딩 상태 확인
let score = 0;
let timer = 0;
let selectedTime = 30; 
let difficulty = 7;    
let ranking = [];

function preload() {
  // 파일명 대소문자가 실제 파일과 일치하는지 꼭 확인하세요!
  teethImg = loadImage('teeth.png');
  brushImg = loadImage('brush.png');
  for (let i = 0; i < 3; i++) {
    germImgs[i] = loadImage(`germ${i+1}.png`);
  }
}

function setup() {
  createCanvas(640, 480);
  
  // 웹캠 설정
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // ml5 handpose 로드 (버전 호환성을 위해 callback 추가)
  console.log("AI 모델 로딩 중...");
  handpose = ml5.handpose(video, () => {
    console.log("모델 로딩 완료!");
    modelLoaded = true;
  });

  handpose.on("predict", results => {
    predictions = results;
  });
  
  // 기존 랭킹 불러오기
  let savedRanking = localStorage.getItem('brushRanking');
  if (savedRanking) ranking = JSON.parse(savedRanking);
}

function draw() {
  if (gameState === "START") {
    drawStartScreen();
  } else if (gameState === "PLAY") {
    drawPlayScreen();
  } else if (gameState === "END") {
    drawEndScreen();
  }
}

// --- 화면 그리기 함수 ---

function drawStartScreen() {
  background(240, 255, 250);
  textAlign(CENTER, CENTER);
  
  // 모델 로딩 중일 때 표시
  if (!modelLoaded) {
    fill(100);
    textSize(20);
    text("AI 선생님이 준비 중이에요...\n잠시만 기다려 주세요! (약 10초)", width/2, height/2);
    return; 
  }

  fill(50);
  textSize(40);
  text("✨ 치카치카 수호대 ✨", width/2, 80);
  
  textSize(18);
  text("시간 선택", width/2, 160);
  drawButton(width/2 - 80, 180, 70, 40, "30초", () => selectedTime = 30, selectedTime === 30);
  drawButton(width/2 + 10, 180, 70, 40, "60초", () => selectedTime = 60, selectedTime === 60);

  text("난이도 (세균 수)", width/2, 260);
  drawButton(width/2 - 110, 280, 60, 40, "쉬움", () => difficulty = 4, difficulty === 4);
  drawButton(width/2 - 30, 280, 60, 40, "보통", () => difficulty = 7, difficulty === 7);
  drawButton(width/2 + 50, 280, 60, 40, "어려움", () => difficulty = 11, difficulty === 11);

  drawButton(width/2 - 100, 380, 200, 60, "게임 시작!", startGame, false, "#FFB6C1");
}

function drawPlayScreen() {
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  image(teethImg, 0, 0, width, height);

  let timeLeft = selectedTime - floor((millis() - timer) / 1000);
  if (timeLeft <= 0) endGame();

  for (let i = germs.length - 1; i >= 0; i--) {
    let g = germs[i];
    image(germImgs[g.type], g.x, g.y, 70, 70);

    if (predictions.length > 0) {
      let hand = predictions[0];
      let tx = map(hand.landmarks[8][0], 0, 640, width, 0);
      let ty = hand.landmarks[8][1];
      
      image(brushImg, tx - 60, ty - 60, 120, 120);

      if (dist(tx, ty, g.x + 35, g.y + 35) < 60) {
        germs.splice(i, 1);
        score += 10;
        spawnGerm();
      }
    }
  }
  drawUI(timeLeft);
}

function drawEndScreen() {
  background(255, 240, 245);
  textAlign(CENTER, CENTER);
  fill(255, 100, 100);
  textSize(50);
  text("게임 종료!", width/2, 80);
  
  fill(50);
  textSize(25);
  text(`이번 점수: ${score}점`, width/2, 140);

  text("🏆 명예의 전당 🏆", width/2, 200);
  for(let i=0; i < min(ranking.length, 3); i++) {
    text(`${i+1}위: ${ranking[i]}점`, width/2, 240 + (i*35));
  }

  drawButton(width/2 - 100, 380, 200, 60, "다시 도전!", () => gameState = "START", false, "#AED9E0");
}

// --- 보조 기능 ---

function drawButton(x, y, w, h, label, action, isSelected, bgColor = "#FFFFFF") {
  if (mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h) {
    fill(220);
    if (mouseIsPressed) {
      action();
      mouseIsPressed = false; 
    }
  } else {
    fill(isSelected ? "#FFD700" : bgColor);
  }
  stroke(100);
  rect(x, y, w, h, 10);
  fill(0);
  noStroke();
  textSize(16);
  text(label, x + w/2, y + h/2);
}

function startGame() {
  score = 0;
  germs = [];
  for (let i = 0; i < difficulty; i++) spawnGerm();
  timer = millis();
  gameState = "PLAY";
}

function endGame() {
  ranking.push(score);
  ranking.sort((a, b) => b - a);
  ranking = ranking.slice(0, 5); // 상위 5개만 저장
  localStorage.setItem('brushRanking', JSON.stringify(ranking));
  gameState = "END";
}

function spawnGerm() {
  let x = random(100, width - 150);
  // 이빨 위치(위/아래)에 맞춰 생성
  let y = random() > 0.5 ? random(60, 130) : random(330, 400);
  germs.push({ x: x, y: y, type: floor(random(3)) });
}

function drawUI(timeLeft) {
  fill(255, 255, 255, 220);
  noStroke();
  rect(20, 20, 160, 70, 15);
  fill(0);
  textAlign(LEFT, TOP);
  textSize(18);
  text(`⏱ 시간: ${timeLeft}초`, 35, 35);
  text(`⭐ 점수: ${score}`, 35, 60);
}