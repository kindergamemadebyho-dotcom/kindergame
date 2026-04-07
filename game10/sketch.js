let video;
let handpose;
let predictions = [];
let teethImg, brushImg;
let germImgs = [];
let germs = [];

// 게임 상태 관리
let gameState = "START"; // START, PLAY, END
let score = 0;
let timer = 0;
let selectedTime = 30; // 기본 30초
let difficulty = 6;    // 기본 세균 개수
let ranking = [];

function preload() {
  teethImg = loadImage('teeth.png');
  brushImg = loadImage('brush.png');
  for (let i = 0; i < 3; i++) {
    germImgs[i] = loadImage(`germ${i+1}.png`);
  }
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = ml5.handpose(video, () => console.log("모델 준비 완료"));
  handpose.on("predict", results => predictions = results);
  
  // 로컬 스토리지에서 랭킹 불러오기
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

// --- 화면 그리기 함수들 ---

function drawStartScreen() {
  background(240, 255, 250);
  textAlign(CENTER);
  fill(50);
  textSize(40);
  text("✨ 치카치카 수호대 ✨", width/2, 100);
  
  textSize(20);
  text("시간 선택", width/2, 170);
  drawButton(width/2 - 80, 190, 70, 40, "30초", () => selectedTime = 30, selectedTime === 30);
  drawButton(width/2 + 10, 190, 70, 40, "60초", () => selectedTime = 60, selectedTime === 60);

  text("난이도 (세균 수)", width/2, 270);
  drawButton(width/2 - 110, 290, 60, 40, "쉬움", () => difficulty = 4, difficulty === 4);
  drawButton(width/2 - 30, 290, 60, 40, "보통", () => difficulty = 7, difficulty === 7);
  drawButton(width/2 + 50, 290, 60, 40, "어려움", () => difficulty = 11, difficulty === 11);

  drawButton(width/2 - 100, 380, 200, 60, "게임 시작!", startGame, false, "#FFB6C1");
}

function drawPlayScreen() {
  // 웹캠 그리기
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  image(teethImg, 0, 0, width, height);

  // 타이머 계산
  let timeLeft = selectedTime - floor((millis() - timer) / 1000);
  if (timeLeft <= 0) endGame();

  // 세균 처리
  for (let i = germs.length - 1; i >= 0; i--) {
    let g = germs[i];
    image(germImgs[g.type], g.x, g.y, 70, 70);

    if (predictions.length > 0) {
      let hand = predictions[0];
      let tx = map(hand.landmarks[8][0], 0, 640, width, 0);
      let ty = hand.landmarks[8][1];
      
      image(brushImg, tx - 50, ty - 50, 120, 120);

      if (dist(tx, ty, g.x + 35, g.y + 35) < 60) {
        germs.splice(i, 1);
        score += 10;
        spawnGerm();
      }
    }
  }

  // UI 표시
  drawUI(timeLeft);
}

function drawEndScreen() {
  background(255, 240, 245);
  textAlign(CENTER);
  fill(255, 100, 100);
  textSize(50);
  text("게임 종료!", width/2, 80);
  
  fill(50);
  textSize(30);
  text(`최종 점수: ${score}점`, width/2, 140);

  // 랭킹 표시
  textSize(20);
  text("--- TOP 3 랭킹 ---", width/2, 200);
  for(let i=0; i < min(ranking.length, 3); i++) {
    text(`${i+1}위: ${ranking[i]}점`, width/2, 230 + (i*30));
  }

  drawButton(width/2 - 100, 380, 200, 60, "다시 하기", () => gameState = "START", false, "#AED9E0");
}

// --- 보조 함수들 ---

function drawButton(x, y, w, h, label, action, isSelected, bgColor = "#FFFFFF") {
  if (mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h) {
    fill(200);
    if (mouseIsPressed) {
      action();
      mouseIsPressed = false; // 중복 클릭 방지
    }
  } else {
    fill(isSelected ? "#FFD700" : bgColor);
  }
  stroke(0);
  rect(x, y, w, h, 10);
  fill(0);
  noStroke();
  textSize(16);
  text(label, x + w/2, y + h/2 + 5);
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
  localStorage.setItem('brushRanking', JSON.stringify(ranking));
  gameState = "END";
}

function spawnGerm() {
  let x = random(100, width - 150);
  let y = random() > 0.5 ? random(60, 140) : random(330, 410);
  germs.push({ x: x, y: y, type: floor(random(3)) });
}

function drawUI(timeLeft) {
  fill(255, 255, 255, 200);
  rect(10, 10, 200, 80, 15);
  fill(0);
  textAlign(LEFT);
  textSize(18);
  text(`남은 시간: ${timeLeft}초`, 25, 40);
  text(`점수: ${score}`, 25, 70);
}