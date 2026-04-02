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

// 전역 변수로 설정 (양손 상태 저장)
let handStates = [
  { isClosed: false, x: -100, y: -100, points: [], isLeft: true }, // 왼손
  { isClosed: false, x: -100, y: -100, points: [], isLeft: false }  // 오른손
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

// ================= 🌸 꽃잎 생성 함수 =================
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
  scoreText.innerText = `점수: 0 | 남은시간: ${timeOption.value}`;
  startBtn.style.display = "none";
  timeSelect.style.display = "none";
  gameTime = parseInt(timeOption.value);

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
          ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255, 105, 180, 0.8)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
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
          if (dist < 80) caught = true;
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

// ================= 🖐️ 손 인식 설정 (성능 최적화 버전) =================
const handsMesh = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

handsMesh.setOptions({
  maxNumHands: 2,
  modelComplexity: 0, // [수정] 렉 줄이기를 위해 0으로 하향하되 신뢰도를 높임
  minDetectionConfidence: 0.6, 
  minTrackingConfidence: 0.6
});

handsMesh.onResults(results => {
  // 손이 감지되지 않았을 때 갑자기 점이 사라져서 생기는 끊김 방지
  // 완전히 초기화하기보다 "인식 안 됨" 상태만 업데이트
  let detectedIndices = new Set();

  if (results.multiHandLandmarks && results.multiHandedness) {
    results.multiHandLandmarks.forEach((landmarks, index) => {
      const isLeft = results.multiHandedness[index].label === 'Left';
      const handIndex = isLeft ? 0 : 1; 
      detectedIndices.add(handIndex);

      const fingerPairs = [
        { tip: 4, pip: 2 }, { tip: 8, pip: 6 }, { tip: 12, pip: 10 }, { tip: 16, pip: 14 }, { tip: 20, pip: 18 }
      ];

      let points = fingerPairs.map(pair => ({
        x: (1 - landmarks[pair.tip].x) * canvas.width,
        y: landmarks[pair.tip].y * canvas.height
      }));

      const palmCenter = {
        x: (1 - landmarks[9].x) * canvas.width,
        y: landmarks[9].y * canvas.height
      };

      let closedCount = 0;
      fingerPairs.forEach(pair => {
        const tip = landmarks[pair.tip];
        const pip = landmarks[pair.pip];
        const distToPip = Math.sqrt(Math.pow(tip.x - pip.x, 2) + Math.pow(tip.y - pip.y, 2));
        const distToPalm = Math.sqrt(Math.pow(tip.x - landmarks[9].x, 2) + Math.pow(tip.y - landmarks[9].y, 2));

        if (distToPip < 0.08 || distToPalm < 0.15) { // 판정 범위를 조금 더 넓혀 측면 대응
          closedCount++;
        }
      });

      handStates[handIndex] = {
        isClosed: closedCount >= 3,
        x: palmCenter.x,
        y: palmCenter.y,
        points: points,
        isLeft: isLeft
      };
    });
  }

  // 화면에 없는 손은 부드럽게 화면 밖으로 치우기 (끊김 방지)
  [0, 1].forEach(i => {
    if (!detectedIndices.has(i)) {
      handStates[i].points = [];
      handStates[i].isClosed = false;
      handStates[i].x = -500; // 멀리 이동시켜 꽃잎 움직임에 영향 주지 않음
      handStates[i].y = -500;
    }
  });
});

// [수정] 카메라 해상도를 낮추어 CPU 부담을 줄임 (렉 개선의 핵심)
const camera = new Camera(video, {
  onFrame: async () => { 
    await handsMesh.send({ image: video }); 
  },
  width: 480, // 640에서 480으로 하향
  height: 360 // 480에서 360으로 하향
});

camera.start();
update();