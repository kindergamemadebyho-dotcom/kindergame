// ================= 1. 기본 설정 및 초기화 =================
const video = document.getElementById("input_video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const scoreText = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");
const startContainer = document.getElementById("startContainer");

const eatSound = document.getElementById("eatSound"); 
if (eatSound) { eatSound.volume = 0.7; }

let score = 0;
let gameStarted = false;
let strawberries = [];
let feedbacks = [];    
let eatingEffects = []; 
let players = []; 
let strawberryInterval, timer, gameTime, maxPlayers, gameLevel;

// ================= 2. 이미지 로드 =================
const strawberryImages = [];
const imageSources = ['strawberry1.png', 'strawberry2.png', 'strawberry3.png'];
imageSources.forEach(src => {
    const img = new Image();
    img.src = src;
    strawberryImages.push(img);
});
const greenImg = new Image();
greenImg.src = 'greenstrawberry.png';

// ================= 3. 랭킹 시스템 로직 =================

// 랭킹 저장 (이름 포함)
function saveRanking(playerName, newScore) {
    let rankings = JSON.parse(localStorage.getItem('strawberryRankings')) || [];
    const date = new Date().toLocaleDateString();
    
    // 이름이 없으면 '무명 딸기'로 저장
    const name = playerName.trim() || "무명 딸기";
    
    rankings.push({ name: name, score: newScore, date: date });
    
    // 점수 높은 순 정렬 -> 상위 5명
    rankings.sort((a, b) => b.score - a.score);
    rankings = rankings.slice(0, 5);
    
    localStorage.setItem('strawberryRankings', JSON.stringify(rankings));
    return rankings;
}

// 랭킹판 표시
function showRankingBoard(rankings) {
    let boardMsg = "🏆 [ 명예의 전당 ] 🏆\n\n";
    rankings.forEach((r, i) => {
        boardMsg += `${i + 1}등: ${r.name} - ${r.score}점 (${r.date})\n`;
    });
    alert(boardMsg);
}

// ================= 4. 게임 보조 함수 =================
function createScoreFeedback(x, y, text, color) {
    feedbacks.push({ x, y, text, color, opacity: 1.0, life: 40 });
}

function createEatingEffect(x, y) {
    eatingEffects.push({ x, y, life: 25 });
}

function createStrawberry() {
    if (!gameStarted) return;
    let isGreen = false;
    if (gameLevel === 2) isGreen = Math.random() < 0.2; 
    else if (gameLevel === 3) isGreen = Math.random() < 0.4;

    const img = isGreen ? greenImg : strawberryImages[Math.floor(Math.random() * 3)];
    const size = isGreen ? 120 : 90;
    
    strawberries.push({ 
        x: Math.random() * (canvas.width - 150) + 75, 
        y: -100, 
        speed: 2.5 + Math.random() * 3, 
        size, 
        img, 
        type: isGreen ? 'bad' : 'good',
        isCaptured: false 
    });
}

// ================= 5. 이벤트 및 시작 로직 =================
startBtn.addEventListener("click", () => {
    maxPlayers = parseInt(document.getElementById("playerSelect").value) || 1;
    gameLevel = parseInt(document.getElementById("levelSelect").value) || 1;
    gameTime = parseInt(document.getElementById("timeOption").value) || 60;
    
    score = 0;
    gameStarted = true;
    strawberries = [];
    feedbacks = [];
    eatingEffects = [];
    
    players = Array.from({ length: maxPlayers }, () => ({ 
        x: -1000, y: -1000, 
        isMouthOpen: false, 
        capturedStrawberry: null 
    }));
    
    scoreText.innerText = `🍓 점수: 0 | ⏰ 시간: ${gameTime}`;
    startContainer.style.display = "none";
    backBtn.style.display = "block";
    
    clearInterval(strawberryInterval);
    strawberryInterval = setInterval(createStrawberry, 1000);
    
    clearInterval(timer);
    timer = setInterval(() => {
        gameTime--;
        scoreText.innerText = `🍓 점수: ${score} | ⏰ 시간: ${gameTime}`;
        if (gameTime <= 0) endGame();
    }, 1000);
});

function endGame() {
    clearInterval(timer);
    clearInterval(strawberryInterval);
    gameStarted = false;
    
    // 1. 점수 알림
    alert(`게임 종료! 최종 점수: ${score}점`);
    
    // 2. 이름 입력받기
    const playerName = prompt("명예의 전당에 올릴 이름을 적어주세요!", "멋쟁이 어린이");
    
    // 3. 랭킹 저장 및 표시 (이름 전달)
    if (playerName !== null) {
        const rankings = saveRanking(playerName, score);
        showRankingBoard(rankings);
    }
    
    location.reload();
}

backBtn.addEventListener("click", () => { location.reload(); });

// ================= 6. 메인 애니메이션 루프 =================
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.globalAlpha = 0.4; 
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (gameStarted) {
        players.forEach(p => {
            if (p.x > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = p.isMouthOpen ? "#ff0000" : "#ffff00";
                ctx.fill();
                ctx.closePath();
            }
        });

        for (let i = strawberries.length - 1; i >= 0; i--) {
            let s = strawberries[i];
            let beingHeld = false;

            players.forEach(p => {
                const dist = Math.hypot(s.x - p.x, s.y - p.y);
                if (!s.isCaptured && p.isMouthOpen && dist < 60) {
                    if (!p.capturedStrawberry) {
                        s.isCaptured = true;
                        p.capturedStrawberry = s;
                    }
                }
                
                if (s.isCaptured && p.capturedStrawberry === s) {
                    s.x = p.x; s.y = p.y;
                    beingHeld = true;
                    if (!p.isMouthOpen) {
                        if (s.type === 'good') {
                            score++;
                            createScoreFeedback(p.x, p.y, "+1", "#ff0000");
                            if (eatSound) { eatSound.currentTime = 0; eatSound.play().catch(()=>{}); }
                        } else {
                            score = Math.max(0, score - 1);
                            createScoreFeedback(p.x, p.y, "-1", "#008000");
                        }
                        createEatingEffect(p.x, p.y);
                        strawberries.splice(i, 1);
                        p.capturedStrawberry = null;
                    }
                }
            });

            if (!beingHeld) {
                s.y += s.speed;
                ctx.drawImage(s.img, s.x - s.size/2, s.y - s.size/2, s.size, s.size);
                if (s.y > canvas.height + 100) strawberries.splice(i, 1);
            } else {
                ctx.drawImage(s.img, s.x - s.size/2, s.y - s.size/2, s.size, s.size);
            }
        }

        eatingEffects.forEach((eff, i) => {
            ctx.fillStyle = "white"; ctx.strokeStyle = "#ff3333"; ctx.lineWidth = 4;
            ctx.font = "bold 45px sans-serif"; ctx.textAlign = "center";
            ctx.strokeText("냠냠!", eff.x, eff.y - 50); ctx.fillText("냠냠!", eff.x, eff.y - 50);
            eff.life--; if (eff.life <= 0) eatingEffects.splice(i, 1);
        });

        feedbacks.forEach((f, i) => {
            ctx.save(); ctx.globalAlpha = f.opacity; ctx.fillStyle = f.color;
            ctx.font = "bold 45px sans-serif"; ctx.textAlign = "center";
            ctx.fillText(f.text, f.x, f.y); ctx.restore();
            f.y -= 2; f.opacity -= 0.025; f.life--; if (f.life <= 0) feedbacks.splice(i, 1);
        });
    }
    requestAnimationFrame(update);
}

// ================= 7. MediaPipe 설정 =================
const faceMesh = new FaceMesh({ 
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` 
});

faceMesh.setOptions({ 
    maxNumFaces: 4, refineLandmarks: true, 
    minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 
});

faceMesh.onResults(results => {
    if (results.multiFaceLandmarks) {
        for (let i = 0; i < maxPlayers; i++) {
            const lm = results.multiFaceLandmarks[i];
            if (lm && players[i]) {
                const topLip = lm[13], bottomLip = lm[14];
                const faceHeight = Math.abs(lm[152].y - lm[10].y);
                players[i].isMouthOpen = (Math.abs(bottomLip.y - topLip.y) / faceHeight) > 0.045;
                const targetX = (1 - topLip.x) * canvas.width;
                const targetY = ((topLip.y + bottomLip.y) / 2) * canvas.height;
                players[i].x += (targetX - players[i].x) * 0.6;
                players[i].y += (targetY - players[i].y) * 0.6;
            } else if (players[i]) {
                players[i].x = -1000;
            }
        }
    }
});

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        video.play();
        const sendFrames = async () => { 
            if (!video.paused) await faceMesh.send({ image: video });
            requestAnimationFrame(sendFrames); 
        };
        sendFrames();
        update();
    };
}
startCamera();