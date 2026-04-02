// ================= 기본 설정 =================
const video = document.getElementById("input_video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const eatSound = document.getElementById("eatSound"); 
if (eatSound) eatSound.volume = 0.7;

const scoreText = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const timeOption = document.getElementById("timeOption");
const timeSelect = document.getElementById("timeSelect");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let gameStarted = false;
let strawberries = []; 
let strawberryInterval;
let timer;
let gameTime = 60;

// 입 위치 및 상태 관련 변수
let mouthX = canvas.width / 2;
let mouthY = canvas.height / 2;
let isMouthOpen = false; 
let mouthTop = { x: 0, y: 0 };
let mouthBottom = { x: 0, y: 0 };
let mouthDistance = 0;

// ================= 🍓 딸기 이미지 =================
const strawberryImages = [];
for (let i = 1; i <= 3; i++) {
  const img = new Image();
  img.src = `strawberry${i}.png`; 
  strawberryImages.push(img);
}

// ================= 🍓 딸기 생성 =================
function createStrawberry() {
  const img = strawberryImages[Math.floor(Math.random() * strawberryImages.length)];

  strawberries.push({
    x: Math.random() * canvas.width,
    y: -50,
    speed: 3 + Math.random() * 4, 
    size: 80 + Math.random() * 50,
    img: img
  });
}

// ================= 🎮 시작 버튼 =================
startBtn.addEventListener("click", () => {
  gameStarted = true;
  startBtn.style.display = "none";
  timeSelect.style.display = "none";

  gameTime = parseInt(timeOption.value);

  clearInterval(strawberryInterval);
  strawberryInterval = setInterval(() => {
    createStrawberry();
  }, 350); 

  timer = setInterval(() => {
    gameTime--;
    scoreText.innerText = `🍓 딸기 점수: ${score} | ⏰ 남은시간: ${gameTime}`;

    if (gameTime <= 0) {
      endGame();
    }
  }, 1000);
});

// ================= 🎮 게임 종료 =================
function endGame() {
  clearInterval(timer);
  clearInterval(strawberryInterval);
  gameStarted = false;

  const name = prompt("딸기를 맛있게 먹은 어린이의 이름은? 😊");
  saveScore(name || "익명", score);
  showRanking();
}

function saveScore(name, score) {
  let scores = JSON.parse(localStorage.getItem("strawberryScores")) || [];
  scores.push({
    name: name,
    score: score,
    date: new Date().toLocaleDateString()
  });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 10);
  localStorage.setItem("strawberryScores", JSON.stringify(scores));
}

function showRanking() {
  let scores = JSON.parse(localStorage.getItem("strawberryScores")) || [];
  let text = "🏆 새콤달콤 딸기 먹기 왕 🍓\n\n";
  scores.forEach((s, i) => {
    text += `${i + 1}등 🥇 ${s.name} - ${s.score}개\n`;
  });
  alert(text);
  location.reload();
}

// ================= 🎮 게임 루프 =================
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) {
    requestAnimationFrame(update);
    return;
  }

  // 😮 입 표시 (입 벌림 상태에 따라 다르게 그림)
  if (isMouthOpen) {
    // 1. 입을 벌렸을 때: 상하 두 개의 인식 점
    ctx.fillStyle = "#ff6666";
    ctx.beginPath();
    ctx.arc(mouthTop.x, mouthTop.y, 15, 0, Math.PI * 2); 
    ctx.arc(mouthBottom.x, mouthBottom.y, 15, 0, Math.PI * 2); 
    ctx.fill();
  } else {
    // 2. 입을 다물었을 때: 합쳐진 큰 점 + "냠냠!"
    ctx.fillStyle = "#ff1111";
    ctx.beginPath();
    ctx.arc(mouthX, mouthY, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "bold 35px 'Arial Rounded MT Bold', 'Noto Sans KR'";
    ctx.textAlign = "center";
    ctx.fillText("냠냠!", mouthX, mouthY + 12);
  }

  strawberries.forEach((s, index) => {
    s.y += s.speed;
    s.x += Math.sin(s.y / 50) * 1.5;

    if (s.img.complete) {
      ctx.drawImage(s.img, s.x, s.y, s.size, s.size);
    }

    // 충돌 판정: 입을 다문 상태(!isMouthOpen)에서만 딸기를 먹음
    let hitboxSize = 85; 
    if (
      !isMouthOpen &&
      s.x < mouthX + hitboxSize &&
      s.x + s.size > mouthX - hitboxSize &&
      s.y < mouthY + hitboxSize &&
      s.y + s.size > mouthY - hitboxSize
    ) {
      score++;
      if (eatSound) {
        eatSound.currentTime = 0;
        eatSound.play().catch(e => console.log("재생 오류:", e));
      }
      strawberries.splice(index, 1);
    }

    if (s.y > canvas.height) {
      strawberries.splice(index, 1);
    }
  });

  requestAnimationFrame(update);
}

update();

// ================= 😮 얼굴 인식 (MediaPipe) =================
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

faceMesh.onResults(results => {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const lm = results.multiFaceLandmarks[0];
    
    // 윗입술 중앙(13)과 아랫입술 중앙(14) 좌표 추출
    const top = lm[13];
    const bottom = lm[14];

    // 캔버스 좌표 계산 (좌우 반전 처리)
    const tx = (1 - top.x) * canvas.width;
    const ty = top.y * canvas.height;
    const bx = (1 - bottom.x) * canvas.width;
    const by = bottom.y * canvas.height;

    // 부드러운 따라오기 (Interpolation)
    mouthTop.x += (tx - mouthTop.x) * 0.4;
    mouthTop.y += (ty - mouthTop.y) * 0.4;
    mouthBottom.x += (bx - mouthBottom.x) * 0.4;
    mouthBottom.y += (by - mouthBottom.y) * 0.4;

    // 전체 입의 중심 좌표
    mouthX = (mouthTop.x + mouthBottom.x) / 2;
    mouthY = (mouthTop.y + mouthBottom.y) / 2;

    // 입 벌림 정도 판단 (Y축 거리 차이)
    // 0.05 값은 사용 환경에 따라 0.04~0.07 사이로 조정 가능합니다.
    mouthDistance = Math.abs(bottom.y - top.y);
    isMouthOpen = mouthDistance > 0.05;
  }
});

const camera = new Camera(video, {
  onFrame: async () => { await faceMesh.send({ image: video }); },
  width: 640,
  height: 480
});
camera.start();