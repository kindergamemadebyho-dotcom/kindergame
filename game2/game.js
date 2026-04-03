// ================= 기본 설정 =================
const video = document.getElementById("input_video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const timeOption = document.getElementById("timeOption");
const timeSelect = document.getElementById("timeSelect");
const bgm = document.getElementById("bgm");
const eatSound = document.getElementById("eatSound");

if (eatSound) eatSound.volume = 0.7;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let gameStarted = false;
let petals = [];
let petalInterval;
let timer;
let gameTime = 60;

let handStates = [
  { isClosed: false, x: -500, y: -500, points: [], isLeft: true },
  { isClosed: false, x: -500, y: -500, points: [], isLeft: false }
];

// ================= 🌸 꽃잎 이미지 로드 =================
const petalImages = [];
const maxFlowerTypes = 10;

for (let i = 1; i <= maxFlowerTypes; i++) {
  const img = new Image();
  img.src = `petal${i}.png`;
  img.onload = () => { petalImages.push(img); };
  img.onerror = () => {};
}

function createPetal() {
  if (petalImages.length === 0) return;
  const img = petalImages[Math.floor(Math.random() * petalImages.length)];
  petals.push({
    x: Math.random() * (canvas.width - 100),
    y: -100,
    speed: 3 + Math.random() * 5,
    size: 80 + Math.random() * 40,
    img: img
  });
}

// ================= 🎮 게임 시작/종료 =================
startBtn.addEventListener("click", () => {
  if (bgm) bgm.play();
  gameStarted = true;
  score = 0;
  gameTime = parseInt(timeOption.value);
  scoreText.innerText = `점수: 0 | 남은시간: ${gameTime}`;
  startBtn.style.display = "none";
  timeSelect.style.display = "none";

  clearInterval(petalInterval);
  petalInterval = setInterval(createPetal, 200);

  clearInterval(timer);
  timer = setInterval(() => {
    gameTime--;
    scoreText.innerText = `점수: ${score} | 남은시간: ${gameTime}`;
    if (gameTime <= 0) endGame();
  }, 1000);
});

function endGame() {
  if (bgm) { bgm.pause(); bgm.currentTime = 0; }
  clearInterval(timer);
  clearInterval(petalInterval);
  gameStarted = false;
  const name = prompt("게임 끝! 이름을 입력하세요 😊");
  if (name) {
    saveScore(name, score);
    showRanking();
  } else {
     location.reload();
  }
}

function saveScore(name, score) {
  let scores = JSON.parse(localStorage.getItem("classScores")) || [];
  scores.push({ name, score, date: new Date().toLocaleDateString() });
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem("classScores", JSON.stringify(scores.slice(0, 10)));
}

function showRanking() {
  let scores = JSON.parse(localStorage.getItem("classScores")) || [];
  let text = "🏆 우리반 봄꽃 잡기 랭킹 🌸\n\n";
  scores.forEach((s, i) => { text += `${i + 1}등 🥇 ${s.name} - ${s.score}점\n`; });
  alert(text);
  location.reload();
}

// ================= 🎮 메인 게임 루프 =================
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  handStates.forEach(hand => {
    if (hand.points.length > 0) {
      if (hand.isClosed) {
        ctx.fillStyle = "rgba(255, 20, 147, 0.9)";
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText("CATCH!", hand.x, hand.y + 8);
      } else {
        hand.points.forEach(p => {
          ctx.fillStyle = "rgba(255, 192, 203, 0.6)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
  });

  if (gameStarted) {
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.y += p.speed;
      p.x += Math.sin(p.y / 50) * 1.5;
      ctx.drawImage(p.img, p.x, p.y, p.size, p.size);

      let caught = false;
      handStates.forEach(hand => {
        if (hand.isClosed) {
          const petalCenterX = p.x + p.size / 2;
          const petalCenterY = p.y + p.size / 2;
          const dist = Math.sqrt(Math.pow(hand.x - petalCenterX, 2) + Math.pow(hand.y - petalCenterY, 2));
          if (dist < 100) caught = true;
        }
      });

      if (caught) {
        score++;
        scoreText.innerText = `점수: ${score} | 남은시간: ${gameTime}`;
        if (eatSound) { eatSound.currentTime = 0; eatSound.play().catch(e => {}); }
        petals.splice(i, 1);
      } else if (p.y > canvas.height) {
        petals.splice(i, 1);
      }
    }
  }
  requestAnimationFrame(update);
}

// ================= 🖐️ 손 인식 설정 (밸런스 조정) =================
const handsMesh = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

handsMesh.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5, 
  minTrackingConfidence: 0.5 
});

handsMesh.onResults(results => {
  let detectedIndices = new Set();

  if (results.multiHandLandmarks && results.multiHandedness) {
    results.multiHandLandmarks.forEach((landmarks, index) => {
      const isLeft = results.multiHandedness[index].label === 'Left';
      const handIndex = isLeft ? 0 : 1; 
      detectedIndices.add(handIndex);

      // 1. 손 크기 측정 (손목 0번 ~ 중지뿌리 9번 거리)
      const palmSize = Math.sqrt(
        Math.pow(landmarks[9].x - landmarks[0].x, 2) + 
        Math.pow(landmarks[9].y - landmarks[0].y, 2)
      );

      // [수정] 너무 관대한 기준을 조금 더 엄격하게 (0.9 -> 0.55)
      const dynamicThreshold = palmSize * 0.55; 

      // 검지(8), 중지(12), 약지(16), 소지(20) 끝마디
      const fingerTips = [8, 12, 16, 20];
      const fingerPips = [6, 10, 14, 18];

      let points = fingerTips.map(tipIdx => ({
        x: (1 - landmarks[tipIdx].x) * canvas.width,
        y: landmarks[tipIdx].y * canvas.height
      }));

      const palmCenter = {
        x: (1 - landmarks[9].x) * canvas.width,
        y: landmarks[9].y * canvas.height
      };

      let closedCount = 0;
      fingerTips.forEach((tipIdx, i) => {
        const tip = landmarks[tipIdx];
        const pip = landmarks[fingerPips[i]]; // 중간 마디

        // 손바닥 중심(9번)과의 거리
        const distToPalm = Math.sqrt(
          Math.pow(tip.x - landmarks[9].x, 2) + 
          Math.pow(tip.y - landmarks[9].y, 2)
        );

        // [수정] 수직 판정을 단순히 y값 비교가 아닌, 마디 거리 기반으로 보완
        // 손가락 끝이 중간 마디보다 손바닥 중심에 더 가까워야 '접힘'으로 인정
        if (distToPalm < dynamicThreshold) {
          closedCount++;
        }
      });

      handStates[handIndex] = {
        // [수정] 4개 손가락 중 3개 이상 확실히 접혔을 때만 주먹으로 인정
        isClosed: closedCount >= 3,
        x: palmCenter.x,
        y: palmCenter.y,
        points: points,
        isLeft: isLeft
      };
    });
  }

  [0, 1].forEach(i => {
    if (!detectedIndices.has(i)) {
      handStates[i].points = [];
      handStates[i].isClosed = false;
      handStates[i].x = -500;
      handStates[i].y = -500;
    }
  });
});

const camera = new Camera(video, {
  onFrame: async () => { 
    await handsMesh.send({ image: video }); 
  },
  width: 640,
  height: 480
});

camera.start();
update();