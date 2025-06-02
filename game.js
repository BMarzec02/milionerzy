const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Kolory
const colors = {
    background: '#000033',
    text: '#FFFFFF',
    questionBox: '#000066',
    answerBox: '#000066',
    answerHover: '#000099',
    answerSelected: '#0066CC',
    answerCorrect: '#00CC00',
    answerWrong: '#CC0000',
    prize: '#FFD700',
    highlight: '#0099FF'
};

// Stan gry
let currentQuestionIndex = 0;
let selectedAnswer = null;
let gameState = 'playing';
let lifelineFiftyFifty = true;
let lifelineAskAudience = true;
let lifelinePhoneFriend = true;
let answerState = '';
let currentQuestion = null;

// Inicjalizacja pierwszego pytania
window.addEventListener('load', () => {
    currentQuestion = getCurrentQuestion();
});

const prizeLadder = [
    { amount: '500 zł', guaranteed: false },
    { amount: '1 000 zł', guaranteed: true },
    { amount: '2 000 zł', guaranteed: false },
    { amount: '5 000 zł', guaranteed: false },
    { amount: '10 000 zł', guaranteed: false },
    { amount: '20 000 zł', guaranteed: false },
    { amount: '40 000 zł', guaranteed: true },
    { amount: '75 000 zł', guaranteed: false },
    { amount: '125 000 zł', guaranteed: false },
    { amount: '250 000 zł', guaranteed: false },
    { amount: '500 000 zł', guaranteed: false },
    { amount: '1 000 000 zł', guaranteed: false }
].reverse();

// Pozycje i wymiary
function getLayoutDimensions() {
    const padding = Math.min(window.innerWidth, window.innerHeight) * 0.05;
    const questionWidth = window.innerWidth * 0.7;
    const answerWidth = (questionWidth - padding) / 2;
    const bottomPadding = 50; // 50px od dołu
    const answerHeight = window.innerHeight * 0.08;
    const answerSpacing = window.innerHeight * 0.02;
    const questionHeight = window.innerHeight * 0.15;
    const questionSpacing = window.innerHeight * 0.02;
    
    const lastAnswerY = window.innerHeight - bottomPadding - answerHeight;
    const firstAnswerY = lastAnswerY - answerHeight - answerSpacing;
    const questionY = firstAnswerY - questionHeight - questionSpacing;
    
    return {
        questionBox: {
            x: (window.innerWidth - questionWidth) / 2,
            y: questionY,
            width: questionWidth,
            height: questionHeight
        },
        answerBoxes: [
            { x: (window.innerWidth - questionWidth) / 2, y: firstAnswerY, width: answerWidth, height: answerHeight },
            { x: (window.innerWidth + padding) / 2, y: firstAnswerY, width: answerWidth, height: answerHeight },
            { x: (window.innerWidth - questionWidth) / 2, y: lastAnswerY, width: answerWidth, height: answerHeight },
            { x: (window.innerWidth + padding) / 2, y: lastAnswerY, width: answerWidth, height: answerHeight }
        ]
    };
}

let questionBox;
let answerBoxes;

function updateLayout() {
    const layout = getLayoutDimensions();
    questionBox = layout.questionBox;
    answerBoxes = layout.answerBoxes;
}

// Główna pętla gry
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Aktualizacja stanu gry
function update() {
    updateLayout();
}

function draw() {
    // Tło
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Rysowanie wzoru hexagonalnego w tle
    drawHexagonalPattern();

    // Logo z efektem świecenia
    ctx.shadowColor = colors.highlight;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colors.text;
    const fontSize = Math.min(window.innerWidth * 0.1, 90);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('MILIONERZY', canvas.width / 2, window.innerHeight * 0.1);
    ctx.shadowBlur = 0;    // Koła ratunkowe (rysowane przed drabinką, aby były pod nią)
    drawLifelines();
    
    // Rysowanie drabinki z kwotami
    drawPrizeLadder();    if (currentQuestion) {
        // Pytanie - nowy design jak w milionerach
        drawMillionaireQuestionBox();

        // Odpowiedzi
        const answers = currentQuestion.answers;
        const letters = ['A', 'B', 'C', 'D'];
        answerBoxes.forEach((box, index) => {
            // Rysowanie tła odpowiedzi w stylu milionerów
            drawMillionaireAnswerBox(box, index, answers[index], letters[index], selectedAnswer === index);
        });
    } // zamknięcie if (currentQuestion)    }
}

// Funkcja pomocnicza do obliczania linii tekstu
function wrapTextAndGetLines(context, text, maxWidth) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for(let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = context.measureText(testLine);
        
        if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
}

// Funkcja pomocnicza do zawijania tekstu
function wrapText(context, text, x, y, maxWidth) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for(let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = context.measureText(testLine);
        
        if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);

    const lineHeight = context.measureText('M').actualBoundingBoxAscent * 1.5;
    let currentY = y;

    // Rysujemy każdą linię tekstu
    lines.forEach((line, index) => {
        // Zachowujemy wycentrowanie tekstu w poziomie
        context.fillText(line, x, currentY + (lineHeight * index));
    });
}

// Rysowanie kół ratunkowych
function drawLifelines() {    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.045;
    const spacing = radius * 2.5;
    const startX = window.innerWidth * 0.05;
    const startY = window.innerHeight * 0.05 + 20; // Przesunięcie o 20px w dół
    
    // Rysowanie kół ratunkowych
    drawLifelineCircle(startX, startY, radius, lifelineFiftyFifty, '50:50');
    drawLifelineCircle(startX + spacing, startY, radius, lifelinePhoneFriend, '☎');
    drawLifelineCircle(startX + spacing * 2, startY, radius, lifelineAskAudience, '👥');
}

function drawHexagonalPattern() {
    const size = 40;
    const h = size * Math.sqrt(3);
    ctx.strokeStyle = 'rgba(0, 102, 204, 0.1)';
    ctx.lineWidth = 1;

    for(let row = -1; row < canvas.height/h + 1; row++) {
        for(let col = -1; col < canvas.width/size + 1; col++) {
            const x = col * size * 3;
            const y = row * h;
            const offset = (row % 2) * (size * 1.5);
            
            ctx.beginPath();
            for(let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                const px = x + offset + size * Math.cos(angle);
                const py = y + size * Math.sin(angle);
                if(i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
}

function getGuaranteedPrize() {
    for (let i = currentQuestionIndex - 1; i >= 0; i--) {
        if (prizeLadder[prizeLadder.length - 1 - i].guaranteed) {
            return prizeLadder[prizeLadder.length - 1 - i].amount;
        }
    }
    return '0 zł';
}

function drawAnswerBox(box, index, answer, letter, isSelected) {
    if (answer === '') return;

    const cornerRadius = 20;
    const gradient = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.height);
    
    let baseColor = colors.answerBox;
    let highlightColor = '#000044';
    
    if (gameState === 'checking') {
        if (index === selectedAnswer) {
            if (answerState === 'correct') {
                baseColor = colors.answerCorrect;
                highlightColor = '#004400';
            } else if (answerState === 'wrong') {
                baseColor = colors.answerWrong;
                highlightColor = '#440000';
            }
        }        if (index === currentQuestion.correct && answerState === 'wrong') {
            baseColor = colors.answerCorrect;
            highlightColor = '#004400';
        }
    } else if (isSelected) {
        baseColor = colors.answerSelected;
        highlightColor = '#004488';
    }
    
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, highlightColor);

    ctx.beginPath();
    ctx.moveTo(box.x + cornerRadius, box.y);
    ctx.lineTo(box.x + box.width - cornerRadius, box.y);
    ctx.quadraticCurveTo(box.x + box.width, box.y, box.x + box.width, box.y + cornerRadius);
    ctx.lineTo(box.x + box.width, box.y + box.height - cornerRadius);
    ctx.quadraticCurveTo(box.x + box.width, box.y + box.height, box.x + box.width - cornerRadius, box.y + box.height);
    ctx.lineTo(box.x + cornerRadius, box.y + box.height);
    ctx.quadraticCurveTo(box.x, box.y + box.height, box.x, box.y + box.height - cornerRadius);
    ctx.lineTo(box.x, box.y + cornerRadius);
    ctx.quadraticCurveTo(box.x, box.y, box.x + cornerRadius, box.y);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = isSelected ? colors.highlight : 'rgba(0, 153, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();    // Tekst odpowiedzi
    if (answer !== '') {  // Rysuj tekst tylko jeśli odpowiedź nie jest pusta
        ctx.fillStyle = colors.text;
        const answerFontSize = Math.min(window.innerWidth * 0.02, 22);
        ctx.font = `bold ${answerFontSize}px Arial`;
        ctx.textAlign = 'left';
        const padding = Math.min(window.innerWidth * 0.02, 20);
        ctx.fillText(`${letter}: ${answer}`, box.x + padding, box.y + (box.height/2) + answerFontSize/3);
    }

    if (isSelected || (gameState === 'checking' && index === currentQuestion.correct)) {
        ctx.shadowColor = colors.highlight;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// Funkcja rysująca drabinkę z kwotami
function drawPrizeLadder() {
    const ladderWidth = window.innerWidth * 0.2;
    const startX = canvas.width - ladderWidth;
    const startY = window.innerHeight * 0.02 + 20; // Przesunięcie o 20px w dół
    const height = window.innerHeight * 0.035;
    const fontSize = Math.min(window.innerWidth * 0.015, 18);
    
    prizeLadder.forEach((prize, index) => {
        const y = startY + (index * height);
        const isCurrentPrize = (prizeLadder.length - 1 - index) === currentQuestionIndex;
        
        if (isCurrentPrize) {
            ctx.fillStyle = colors.highlight;
            ctx.fillRect(startX - ladderWidth * 0.1, y - height * 0.6, ladderWidth * 1.1, height);
        }
        
        ctx.fillStyle = prize.guaranteed ? '#FFD700' : colors.text;
        ctx.font = isCurrentPrize ? `bold ${fontSize}px Arial` : `${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(prize.amount, startX + ladderWidth * 0.9, y);
        
        if (prize.guaranteed) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(startX - 5, y - 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawLifelineCircle(x, y, radius, isActive, text) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    if (isActive) {
        gradient.addColorStop(0, 'rgba(0, 153, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 51, 102, 0.8)');
    } else {
        gradient.addColorStop(0, 'rgba(102, 102, 102, 0.3)');
        gradient.addColorStop(1, 'rgba(51, 51, 51, 0.3)');
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = isActive ? colors.highlight : '#666666';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = isActive ? colors.text : '#666666';
    ctx.font = text.length > 2 ? '14px Arial' : '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    
    if (isActive) {
        ctx.shadowColor = colors.highlight;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function getCurrentQuestion() {
    const prize = prizeLadder[prizeLadder.length - 1 - currentQuestionIndex].amount;
    const prizeValue = parseInt(prize.replace(/\D/g, ''));
    const questionsForPrize = questionsByPrize[prizeValue];
    if (questionsForPrize && questionsForPrize.length > 0) {
        const randomIndex = Math.floor(Math.random() * questionsForPrize.length);
        return questionsForPrize[randomIndex];
    }
    return null;
}

// Funkcja sprawdzająca czy kliknięcie było w obszarze koła
function isClickInCircle(clickX, clickY, circleX, circleY, radius) {
    const distance = Math.sqrt(
        Math.pow(clickX - circleX, 2) + Math.pow(clickY - circleY, 2)
    );
    return distance <= radius;
}

// Funkcje kół ratunkowych
function useFiftyFifty() {
    if (!currentQuestion || !lifelineFiftyFifty) return;
    
    lifelineFiftyFifty = false;
    const wrongAnswers = [0, 1, 2, 3].filter(i => i !== currentQuestion.correct);
    // Losowo usuń dwie błędne odpowiedzi
    for (let i = 0; i < 2; i++) {
        const removeIndex = Math.floor(Math.random() * wrongAnswers.length);
        currentQuestion.answers[wrongAnswers[removeIndex]] = '';
        wrongAnswers.splice(removeIndex, 1);
    }
}

function usePhoneFriend() {
    if (!currentQuestion || !lifelinePhoneFriend) return;
    
    lifelinePhoneFriend = false;
    // Symulacja odpowiedzi przyjaciela
    const friendAnswer = Math.random() < 0.8 ? currentQuestion.correct : 
        Math.floor(Math.random() * 4);
    alert(`Przyjaciel uważa, że poprawna odpowiedź to: ${['A', 'B', 'C', 'D'][friendAnswer]}`);
}

function useAskAudience() {
    if (!currentQuestion || !lifelineAskAudience) return;
    
    lifelineAskAudience = false;
    // Symulacja głosowania publiczności
    const votes = [0, 0, 0, 0];
    const correctAnswer = currentQuestion.correct;
    
    // Dodaj więcej głosów na poprawną odpowiedź
    votes[correctAnswer] = Math.floor(Math.random() * 30) + 40; // 40-70%
    
    // Rozdziel pozostałe głosy
    const remainingVotes = 100 - votes[correctAnswer];
    for (let i = 0; i < 4; i++) {
        if (i !== correctAnswer) {
            votes[i] = Math.floor(Math.random() * remainingVotes * 0.5);
        }
    }
    
    const currentSum = votes.reduce((a, b) => a + b, 0);
    votes[correctAnswer] += 100 - currentSum;
    
    alert(`Głosy publiczności:\nA: ${votes[0]}%\nB: ${votes[1]}%\nC: ${votes[2]}%\nD: ${votes[3]}%`);
}

// Obsługa kliknięć
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Sprawdzanie kliknięć w odpowiedzi
    answerBoxes.forEach((box, index) => {
        if (x >= box.x && x <= box.x + box.width &&
            y >= box.y && y <= box.y + box.height) {
            if (gameState === 'playing' && currentQuestion.answers[index] !== '') {
                selectedAnswer = index;
                checkAnswer();
            }
        }    });
    
    // Sprawdzanie kliknięć w koła ratunkowe
    if (gameState === 'playing') {
        const radius = Math.min(window.innerWidth, window.innerHeight) * 0.045;
        const spacing = radius * 2.5;
        const startX = window.innerWidth * 0.05;
        const startY = window.innerHeight * 0.05 + 20;

        // 50:50
        if (lifelineFiftyFifty && isClickInCircle(x, y, startX, startY, radius)) {
            useFiftyFifty();
        }
        // Telefon
        if (lifelinePhoneFriend && isClickInCircle(x, y, startX + spacing, startY, radius)) {
            usePhoneFriend();
        }
        // Publiczność
        if (lifelineAskAudience && isClickInCircle(x, y, startX + spacing * 2, startY, radius)) {
            useAskAudience();
        }
    }
});

// Sprawdzanie odpowiedzi
function checkAnswer() {
    if (!currentQuestion) return;
    
    gameState = 'checking';
    
    if (selectedAnswer === currentQuestion.correct) {
        answerState = 'correct';
        if (currentQuestionIndex === prizeLadder.length - 1) {
            gameState = 'won';
            setTimeout(() => {
                alert('Gratulacje! Wygrałeś milion złotych!');
                resetGame();
            }, 1000);
        } else {
            setTimeout(() => {
                currentQuestionIndex++;
                currentQuestion = getCurrentQuestion();
                selectedAnswer = null;
                gameState = 'playing';
                answerState = '';
            }, 2000);
        }
    } else {
        answerState = 'wrong';
        setTimeout(() => {
            gameState = 'lost';
            const guaranteedPrize = getGuaranteedPrize();
            alert(`Niestety, to nie jest poprawna odpowiedź. Wygrywasz ${guaranteedPrize}!`);
            resetGame();
        }, 2000);
    }
}

// Reset gry
function resetGame() {
    currentQuestionIndex = 0;
    selectedAnswer = null;
    gameState = 'playing';
    answerState = '';
    currentQuestion = getCurrentQuestion();
    lifelineFiftyFifty = true;
    lifelineAskAudience = true;
    lifelinePhoneFriend = true;
}

// Rozpoczęcie gry
gameLoop();

// Nowa funkcja rysująca ramkę pytania w stylu Milionerów
function drawMillionaireQuestionBox() {
    const box = questionBox;
    
    // Kształt hexagonalny jak w oryginalnym programie
    const hexHeight = box.height * 0.3;
    
    ctx.beginPath();
    // Górna lewa ściana skośna
    ctx.moveTo(box.x + hexHeight, box.y);
    // Górna prawa ściana prosta
    ctx.lineTo(box.x + box.width - hexHeight, box.y);
    // Górna prawa ściana skośna
    ctx.lineTo(box.x + box.width, box.y + hexHeight);
    // Prawa ściana prosta
    ctx.lineTo(box.x + box.width, box.y + box.height - hexHeight);
    // Dolna prawa ściana skośna
    ctx.lineTo(box.x + box.width - hexHeight, box.y + box.height);
    // Dolna ściana prosta
    ctx.lineTo(box.x + hexHeight, box.y + box.height);
    // Dolna lewa ściana skośna
    ctx.lineTo(box.x, box.y + box.height - hexHeight);
    // Lewa ściana prosta
    ctx.lineTo(box.x, box.y + hexHeight);
    ctx.closePath();
    
    // Gradient tła w stylu milionerów
    const gradient = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.height);
    gradient.addColorStop(0, '#1a4d99');
    gradient.addColorStop(0.3, '#0d2666');
    gradient.addColorStop(0.7, '#1a3d7a');
    gradient.addColorStop(1, '#0d2666');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Niebieskie obramowanie
    ctx.strokeStyle = '#4da6ff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Wewnętrzne obramowanie
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Tekst pytania
    ctx.fillStyle = colors.text;
    const questionFontSize = Math.min(window.innerWidth * 0.025, 24);
    ctx.font = `bold ${questionFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const padding = Math.min(window.innerWidth * 0.03, 30);
    const lines = wrapTextAndGetLines(ctx, currentQuestion.question, box.width - (padding * 2));
    const lineHeight = ctx.measureText('M').actualBoundingBoxAscent * 1.5;
    const totalTextHeight = lineHeight * (lines.length - 1);
    
    const centerY = box.y + box.height / 2;
    const startY = centerY - (totalTextHeight / 2);
    
    wrapText(ctx, currentQuestion.question,
            box.x + (box.width / 2),
            startY,
            box.width - (padding * 2));
}

// Nowa funkcja rysująca ramkę odpowiedzi w stylu Milionerów
function drawMillionaireAnswerBox(box, index, answer, letter, isSelected) {
    if (answer === '') return;

    // Kolory w zależności od stanu
    let baseColor = '#1a4d99';
    let highlightColor = '#0d2666';
    let borderColor = '#4da6ff';
    let textColor = colors.text;
    
    if (gameState === 'checking') {
        if (index === selectedAnswer) {
            if (answerState === 'correct') {
                baseColor = '#1a7300';
                highlightColor = '#0d3900';
                borderColor = '#66ff66';
            } else if (answerState === 'wrong') {
                baseColor = '#990000';
                highlightColor = '#660000';
                borderColor = '#ff6666';
            }
        }
        if (index === currentQuestion.correct && answerState === 'wrong') {
            baseColor = '#1a7300';
            highlightColor = '#0d3900';
            borderColor = '#66ff66';
        }
    } else if (isSelected) {
        baseColor = '#2d6bb3';
        highlightColor = '#1a4080';
        borderColor = '#80ccff';
    }
    
    // Kształt hexagonalny jak w oryginalnym programie
    const hexHeight = box.height * 0.4;
    
    ctx.beginPath();
    // Lewa ściana skośna
    ctx.moveTo(box.x, box.y + hexHeight);
    ctx.lineTo(box.x + hexHeight, box.y);
    // Górna ściana prosta
    ctx.lineTo(box.x + box.width - hexHeight, box.y);
    // Prawa ściana skośna
    ctx.lineTo(box.x + box.width, box.y + hexHeight);
    ctx.lineTo(box.x + box.width, box.y + box.height - hexHeight);
    // Prawa dolna ściana skośna
    ctx.lineTo(box.x + box.width - hexHeight, box.y + box.height);
    // Dolna ściana prosta
    ctx.lineTo(box.x + hexHeight, box.y + box.height);
    // Lewa dolna ściana skośna
    ctx.lineTo(box.x, box.y + box.height - hexHeight);
    ctx.closePath();
    
    // Gradient tła
    const gradient = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.height);
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(0.3, highlightColor);
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, highlightColor);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Obramowanie
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.stroke();
    
        
    // Tekst odpowiedzi
    ctx.fillStyle = textColor;
    const answerFontSize = Math.min(window.innerWidth * 0.022, 20);
    ctx.font = `bold ${answerFontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const padding = Math.min(window.innerWidth * 0.025, 25);
    ctx.fillText(`${letter}: ${answer}`, box.x + padding, box.y + (box.height / 2));
    
    // Efekt świecenia dla wybranej odpowiedzi
    if (isSelected || (gameState === 'checking' && (index === currentQuestion.correct || index === selectedAnswer))) {
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// Funkcja rysująca diament
function drawDiamond(x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    
    // Gradient dla diamenta
    const gradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, '#ffffff');
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, color);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Obramowanie diamenta
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(-size/2, -size/2, size, size);
    
    ctx.restore();
}
