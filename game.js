// ================= 기본 설정 =================
const video = document.getElementById("input_video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const timeOption = document.getElementById("timeOption");
const timeSelect = document.getElementById("timeSelect");
const bgm = document.getElementById("bgm");
const eatSound = document.getElementById("eatSound"); // 효과음 변수 추가

if (eatSound) eatSound.volume = 0.7; // 효과음 볼륨 조절 (0.0 ~ 1.0)
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let gameStarted = false;
let petals = [];
let petalInterval;
let timer;
let gameTime = 60;

let hands = [{ x: -100, y: -100 }, { x: -100, y: -100 }];

// ================= 🌸 꽃잎 이미지 로드 (유동적 설정) =================
const petalImages = [];
const maxFlowerTypes = 10; // 최대 시도할 파일 개수 (10개까지 확인)

for (let i = 1; i <= maxFlowerTypes; i++) {
  const img = new Image();
  img.src = `petal${i}.png`;
  
  // 이미지가 성공적으로 로드된 것만 배열에 넣음
  img.onload = () => {
    petalImages.push(img);
    console.log(`petal${i}.png 로드 성공!`);
  };
  
  // 파일이 없어도 에러 내지 않고 무시함
  img.onerror = () => {
    // 파일이 없으면 그냥 넘어갑니다.
  };
}

// ================= 🌸 꽃잎 생성 함수 =================
function createPetal() {
  if (petalImages.length === 0) return; // 로드된 이미지가 없으면 생성 안 함

  const img = petalImages[Math.floor(Math.random() * petalImages.length)];
  petals.push({
    x: Math.random() * (canvas.width - 100),
    y: -100,
    speed: 3 + Math.random() * 5,
    size: 100 + Math.random() * 35,
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
  petalInterval = setInterval(createPetal, 200); // 생성 주기를 살짝 늦춰 렉 방지

  clearInterval(timer);
  timer = setInterval(() => {
    gameTime--;
    scoreText.innerText = `점수: ${score} | 남은시간: ${gameTime}`;
    if (gameTime <= 0) endGame();
  }, 1000);
});

function endGame() {
  if (bgm) {
    bgm.pause();
    bgm.currentTime = 0;
  }
  clearInterval(timer);
  clearInterval(petalInterval);
  gameStarted = false;
  const name = prompt("이름을 입력하세요 😊");
  saveScore(name || "익명", score);
  showRanking();
}

// (saveScore, showRanking 함수는 기존과 동일하여 생략 가능하지만 구조 유지를 위해 포함)
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

// ================= 🎮 메인 게임 루프 (최적화) =================
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 손 표시 (렉을 줄이기 위해 단순한 원으로 그림)
  ctx.fillStyle = "rgba(255, 105, 180, 0.6)";
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].x > 0) {
      ctx.beginPath();
      ctx.arc(hands[i].x, hands[i].y, 35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (gameStarted) {
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.y += p.speed;
      p.x += Math.sin(p.y / 50) * 1.5;

      ctx.drawImage(p.img, p.x, p.y, p.size, p.size);

      // 충돌 판정 (단순화하여 렉 방지)
      let caught = false;
      for (let j = 0; j < hands.length; j++) {
        const h = hands[j];
        if (h.x > p.x && h.x < p.x + p.size && h.y > p.y && h.y < p.y + p.size) {
          caught = true;
          break;
        }
      }

      if (caught) {
        score++;
        scoreText.innerText = `점수: ${score} | 남은시간: ${gameTime}`;
      if (eatSound) {
          eatSound.currentTime = 0; // 소리가 재생 중이라도 처음부터 다시 재생 (연속 획득용)
          eatSound.play().catch(e => console.log("소리 재생 실패:", e));
        }
        petals.splice(i, 1);
      } else if (p.y > canvas.height) {
        petals.splice(i, 1);
      }
    }
  }
  requestAnimationFrame(update);
}

// ================= 🖐️ 손 인식 (렉 개선 설정) =================
const handsMesh = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

handsMesh.setOptions({
  maxNumHands: 2,
  modelComplexity: 0, // 0으로 설정하면 인식이 훨씬 빨라지고 렉이 줄어듭니다! (기존 1)
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

handsMesh.onResults(results => {
  hands = [{ x: -100, y: -100 }, { x: -100, y: -100 }];
  if (results.multiHandLandmarks) {
    results.multiHandLandmarks.forEach((landmarks, index) => {
      if (index > 1) return;
      hands[index].x = (1 - landmarks[8].x) * canvas.width;
      hands[index].y = landmarks[8].y * canvas.height;
    });
  }
});

const camera = new Camera(video, {
  onFrame: async () => { await handsMesh.send({ image: video }); },
  width: 480, // 카메라 해상도를 낮추면 렉이 비약적으로 줄어듭니다.
  height: 360
});

camera.start();
update();