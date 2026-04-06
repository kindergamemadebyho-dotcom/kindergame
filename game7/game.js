// ================= 1. 기본 설정 및 초기화 =================
const video = document.getElementById("input_video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const eatSound = document.getElementById("eatSound"); 
if (eatSound) eatSound.volume = 0.7;

const scoreText = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const timeOption = document.getElementById("timeOption");
const timeSelect = document.getElementById("timeSelect");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

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

// 인식 위치 보정용 변수
let videoWidth = 640;
let videoHeight = 480;

// ================= 2. 딸기 이미지 로드 =================
const strawberryImages = [];
const imageSources = ['strawberry1.png', 'strawberry2.png', 'strawberry3.png'];
imageSources.forEach(src => {
    const img = new Image();
    img.src = src;
    strawberryImages.push(img);
});

// ================= 3. 게임 로직 =================
function createStrawberry() {
    if (!gameStarted) return;
    const img = strawberryImages[Math.floor(Math.random() * strawberryImages.length)];
    strawberries.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: -100,
        speed: 4 + Math.random() * 5, 
        size: 90 + Math.random() * 40,
        img: img
    });
}

startBtn.addEventListener("click", () => {
    gameStarted = true;
    score = 0;
    strawberries = []; // 기존 딸기 초기화
    startBtn.style.display = "none";
    timeSelect.style.display = "none";
    gameTime = parseInt(timeOption.value);

    clearInterval(strawberryInterval);
    strawberryInterval = setInterval(createStrawberry, 400); 

    clearInterval(timer);
    timer = setInterval(() => {
        gameTime--;
        scoreText.innerText = `🍓 딸기 점수: ${score} | ⏰ 남은시간: ${gameTime}`;
        if (gameTime <= 0) endGame();
    }, 1000);
});

function endGame() {
    clearInterval(timer);
    clearInterval(strawberryInterval);
    gameStarted = false;

    setTimeout(() => {
        const name = prompt("딸기를 맛있게 먹은 어린이의 이름은? 😊");
        saveScore(name || "익명", score);
        showRanking();
    }, 100);
}

function saveScore(name, score) {
    let scores = JSON.parse(localStorage.getItem("strawberryScores")) || [];
    scores.push({ name, score, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem("strawberryScores", JSON.stringify(scores.slice(0, 10)));
}

function showRanking() {
    let scores = JSON.parse(localStorage.getItem("strawberryScores")) || [];
    let text = "🏆 새콤달콤 딸기 먹기 왕 🍓\n\n";
    scores.forEach((s, i) => { text += `${i + 1}등: ${s.name} (${s.score}개)\n`; });
    alert(text);
    location.reload();
}

// ================= 4. 메인 루프 (그리기 및 충돌 체크) =================
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
        requestAnimationFrame(update);
        return;
    }

    // [개선] "냠냠!" 표시: 입술 점을 없애고 글자만 깔끔하게 표시
    if (!isMouthOpen) {
        ctx.fillStyle = "white";
        ctx.strokeStyle = "#ff1111";
        ctx.lineWidth = 4;
        ctx.font = "bold 40px 'Arial Rounded MT Bold'";
        ctx.textAlign = "center";
        
        // 보정된 mouthY 위치에 글자 출력
        ctx.strokeText("냠냠!", mouthX, mouthY);
        ctx.fillText("냠냠!", mouthX, mouthY);
    }

    // 딸기 업데이트 및 충돌 판정
    for (let i = strawberries.length - 1; i >= 0; i--) {
        let s = strawberries[i];
        s.y += s.speed;
        s.x += Math.sin(s.y / 60) * 2;

        if (s.img.complete) {
            ctx.drawImage(s.img, s.x - s.size/2, s.y - s.size/2, s.size, s.size);
        }

        // 충돌 판정: 입을 다물고 있을 때(냠냠 상태) 거리 체크
        let dist = Math.hypot(s.x - mouthX, s.y - mouthY);
        if (!isMouthOpen && dist < 100) { 
            score++;
            if (eatSound) {
                eatSound.currentTime = 0;
                eatSound.play().catch(() => {});
            }
            strawberries.splice(i, 1);
            continue;
        }

        // 화면 밖으로 나간 딸기 제거
        if (s.y > canvas.height + 100) {
            strawberries.splice(i, 1);
        }
    }

    requestAnimationFrame(update);
}

// ================= 5. 얼굴 인식 (MediaPipe) =================
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

faceMesh.onResults(results => {
    // 비디오 해상도 업데이트
    if (video.videoWidth) {
        videoWidth = video.videoWidth;
        videoHeight = video.videoHeight;
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const lm = results.multiFaceLandmarks[0];
        
        // 마스크 착용 대응을 위해 코(1)와 턱(152) 랜드마크 활용
        const nose = lm[1];
        const chin = lm[152];
        const topLip = lm[13];
        const bottomLip = lm[14];

        // 입 벌림 판정 (얼굴 크기 대비 입술 간격 비율)
        const faceHeight = Math.abs(chin.y - lm[10].y);
        const mouthDistanceRatio = Math.abs(bottomLip.y - topLip.y) / faceHeight;
        isMouthOpen = mouthDistanceRatio > 0.05; 

        // 좌표 왜곡 보정 계산
        const scaleX = canvas.width / videoWidth;
        const scaleY = canvas.height / videoHeight;

        // X좌표: 거울 모드 대응
        const targetX = (canvas.width) - (topLip.x * videoWidth * scaleX);
        
        // Y좌표: 마스크를 써도 코와 턱 사이에 입이 있으므로 그 위치를 추정하여 계산
        // 코와 턱 사이의 약 65% 지점을 입 위치로 잡으면 마스크 위에서도 정확합니다.
        const estimatedMouthY = (nose.y * 0.6 + chin.y * 0.4) * videoHeight * scaleY;

        // 부드럽게 따라오도록 설정
        mouthX += (targetX - mouthX) * 0.8;
        mouthY += (estimatedMouthY - mouthY) * 0.8;
    }
});

const camera = new Camera(video, {
    onFrame: async () => { await faceMesh.send({ image: video }); },
    width: 640,
    height: 480
});

camera.start();
update();