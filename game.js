const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// System audio
const sounds = {
    opening: new Audio('sounds/opening.mp3'),
    question: new Audio('sounds/question.mp3'),
    check: new Audio('sounds/check.mp3'),
    good: new Audio('sounds/good.mp3'),
    wrong: new Audio('sounds/wrong.mp3'),
    lifeline: new Audio('sounds/lifeline.mp3')
};

// Ustawienie głośności dla wszystkich dźwięków
Object.values(sounds).forEach(sound => {
    sound.volume = 0.5;
});

// Funkcje odtwarzania dźwięków
function stopAllSounds() {
    Object.values(sounds).forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
    });
}

function playSound(soundName) {
    try {
        const sound = sounds[soundName];
        if (sound) {
            // Zatrzymaj wszystkie dźwięki przed odtworzeniem nowego (check, good, wrong przerywają poprzednie)
            if (soundName === 'check' || soundName === 'good' || soundName === 'wrong') {
                stopAllSounds();
            }
            sound.currentTime = 0; // Resetowanie do początku
            sound.play().catch(error => {
                console.log(`Nie można odtworzyć dźwięku ${soundName}:`, error);
            });
        }
    } catch (error) {
        console.log(`Błąd odtwarzania dźwięku ${soundName}:`, error);
    }
}

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
let gameState = 'start'; // Zaczynamy od ekranu startowego
let lifelineFiftyFifty = true;
let lifelineAskAudience = true;
let lifelinePhoneFriend = true;
let answerState = ''; // '', 'selected', 'correct', 'wrong'
let currentQuestion = null;

// Inicjalizacja pierwszego pytania (ale tylko po kliknięciu start)
window.addEventListener('load', () => {
    // Strona załadowana - gotowa do gry
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
    drawHexagonalPattern();    // Logo z efektem świecenia
    ctx.shadowColor = colors.highlight;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colors.text;
    // Większy rozmiar logo na ekranie startowym
    const fontSize = gameState === 'start' 
        ? Math.min(window.innerWidth * 0.15, 230)  // Większy na start screen
        : Math.min(window.innerWidth * 0.1, 90);   // Normalny podczas gry
    // Różna pozycja logo - na start screen więcej w środku, podczas gry na górze
    const logoY = gameState === 'start' 
        ? window.innerHeight * 0.25  // Niżej, bardziej na środku na start screen
        : window.innerHeight * 0.1;  // Na górze podczas gry
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('MILIONERZY', canvas.width / 2, logoY);
    ctx.shadowBlur = 0;if (gameState === 'start') {
        // Ekran startowy
        drawStartScreen();
    } else {
        // Koła ratunkowe (rysowane przed drabinką, aby były pod nią)
        drawLifelines();
          // Rysowanie drabinki z kwotami
        drawPrizeLadder();
        
        // Rysowanie przycisku rezygnacji
        drawQuitButton();

        if (currentQuestion) {
            // Pytanie - nowy design jak w milionerach
            drawMillionaireQuestionBox();

            // Odpowiedzi
            const answers = currentQuestion.answers;
            const letters = ['A', 'B', 'C', 'D'];
            answerBoxes.forEach((box, index) => {
                // Rysowanie tła odpowiedzi w stylu milionerów
                drawMillionaireAnswerBox(box, index, answers[index], letters[index], selectedAnswer === index);            });
        } // zamknięcie if (currentQuestion)
    }
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
    drawLifelineCircle(startX, startY, radius, lifelineFiftyFifty, '50:50', true); // Pogrubione
    drawLifelineCircle(startX + spacing, startY, radius, lifelinePhoneFriend, '☎');
    drawLifelineCircle(startX + spacing * 2, startY, radius, lifelineAskAudience, '📊'); // Biała ikona diamentu
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
    const ladderWidth = window.innerWidth * 0.12;
    const startX = canvas.width - ladderWidth;
    const startY = window.innerHeight * 0.02 + 20; // Przesunięcie o 20px w dół
    const height = window.innerHeight * 0.035;
    const fontSize = Math.min(window.innerWidth * 0.015, 18);
    
    prizeLadder.forEach((prize, index) => {
        const y = startY + (index * height);        
        const isCurrentPrize = (prizeLadder.length - 1 - index) === currentQuestionIndex;
        const questionNumber = prizeLadder.length - index; // Numeracja od 1 do 12
          if (isCurrentPrize && (gameState === 'playing' || gameState === 'checking')) {
            // Pomarańczowo-złote tło dla aktualnego poziomu (jak przycisk rezygnacji)
            const frameWidth = ladderWidth * 1.25; // Szerokość obejmująca numer i kwotę
            const frameHeight = height * 0.8;
            const frameX = startX - ladderWidth * 0.28; // Zaczyna się od numeru pytania
            const frameY = y - height * 0.4;
            
            // Kształt hexagonalny jak w przycisku rezygnacji
            const hexHeight = frameHeight * 0.3;
            
            ctx.beginPath();
            ctx.moveTo(frameX + hexHeight, frameY);
            ctx.lineTo(frameX + frameWidth - hexHeight, frameY);
            ctx.lineTo(frameX + frameWidth, frameY + hexHeight);
            ctx.lineTo(frameX + frameWidth, frameY + frameHeight - hexHeight);
            ctx.lineTo(frameX + frameWidth - hexHeight, frameY + frameHeight);
            ctx.lineTo(frameX + hexHeight, frameY + frameHeight);
            ctx.lineTo(frameX, frameY + frameHeight - hexHeight);
            ctx.lineTo(frameX, frameY + hexHeight);
            ctx.closePath();
            
            // Gradient tła jak w przycisku rezygnacji
            const gradient = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameHeight);
            gradient.addColorStop(0, '#cc6600');
            gradient.addColorStop(0.3, '#994400');
            gradient.addColorStop(0.7, '#cc6600');
            gradient.addColorStop(1, '#994400');
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Obramowanie jak w przycisku rezygnacji
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Numeracja pytań po lewej stronie
        ctx.fillStyle = isCurrentPrize ? '#FFD700' : '#CCCCCC';
        ctx.font = isCurrentPrize ? `bold ${fontSize}px Arial` : `${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`${questionNumber}.`, startX - ladderWidth * 0.25, y);
          // Kwota po prawej stronie
        ctx.fillStyle = prize.guaranteed ? '#FFD700' : colors.text;
        ctx.font = isCurrentPrize ? `bold ${fontSize}px Arial` : `${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(prize.amount, startX + ladderWidth * 0.9, y);
    });
}

function drawLifelineCircle(x, y, radius, isActive, text, isBold = false, useWhiteIcon = false) {
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
    
    // Ustal kolor tekstu - biały dla białej ikony lub standardowy
    let textColor;
    if (useWhiteIcon) {
        textColor = '#FFFFFF'; // Biały kolor dla ikony publiczności
    } else {
        textColor = isActive ? colors.text : '#666666';
    }
    
    ctx.fillStyle = textColor;
    
    // Ustal czy tekst ma być pogrubiony
    const fontWeight = isBold ? 'bold ' : '';
    ctx.font = `${fontWeight}${text.length > 2 ? '14px' : '20px'} Arial`;
    
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
    
    playSound('lifeline'); // Odtwórz dźwięk koła ratunkowego
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
    
    playSound('lifeline'); // Odtwórz dźwięk koła ratunkowego
    lifelinePhoneFriend = false;
    // Symulacja odpowiedzi przyjaciela
    const friendAnswer = Math.random() < 0.8 ? currentQuestion.correct : 
        Math.floor(Math.random() * 4);
    alert(`Twój przyjaciel uważa, że poprawną odpowiedzią na pytanie jest: ${['A', 'B', 'C', 'D'][friendAnswer]}`);
}

function useAskAudience() {
    if (!currentQuestion || !lifelineAskAudience) return;
    
    playSound('lifeline'); // Odtwórz dźwięk koła ratunkowego
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
    
    if (gameState === 'start') {
        // Sprawdzanie kliknięcia w przycisk start
        if (x >= questionBox.x && x <= questionBox.x + questionBox.width &&
            y >= questionBox.y && y <= questionBox.y + questionBox.height) {
            startGame();
        }
          // Sprawdzanie kliknięcia w "Bartłomiej Marzec" (trzeci box z kredytami)
        if (answerBoxes.length > 2) {
            const bartlomiejBox = answerBoxes[2]; // trzeci box zawiera "Bartłomiej Marzec"
            if (x >= bartlomiejBox.x && x <= bartlomiejBox.x + bartlomiejBox.width &&
                y >= bartlomiejBox.y && y <= bartlomiejBox.y + bartlomiejBox.height) {
                // Otwórz GitHub repository
                window.open('https://github.com/BMarzec02/milionerzy', '_blank');
            }
        }return;
    }
    
    // Sprawdzanie kliknięć w odpowiedzi
    answerBoxes.forEach((box, index) => {
        if (x >= box.x && x <= box.x + box.width &&
            y >= box.y && y <= box.y + box.height) {
            if (gameState === 'playing' && currentQuestion.answers[index] !== '') {
                selectedAnswer = index;
                checkAnswer();
            }
        }    
    });
      // Sprawdzanie kliknięcia w przycisk rezygnacji
    if (gameState === 'playing' || gameState === 'checking') {
        const quitButton = drawQuitButton();
        if (quitButton && x >= quitButton.x && x <= quitButton.x + quitButton.width &&
            y >= quitButton.y && y <= quitButton.y + quitButton.height) {
            handleQuitButtonClick();
            return;
        }
    }
    
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
    
    // Stan 1: Zaznaczona odpowiedź - odtwórz dźwięk check
    playSound('check');
    gameState = 'checking';
    answerState = 'selected';
    
    // Losowe opóźnienie od 2 do 5 sekund przed pokazaniem wyniku
    const randomDelay = Math.random() * 3000 + 2000; // 2000-5000ms
    
    setTimeout(() => {
        if (selectedAnswer === currentQuestion.correct) {
            // Stan 2: Poprawna odpowiedź - zmień na zielony i odtwórz good
            answerState = 'correct';
            playSound('good');
            
            // Nasłuchuj na zakończenie melodii "good"
            const goodSound = sounds.good;
            const onGoodEnded = () => {
                goodSound.removeEventListener('ended', onGoodEnded);                if (currentQuestionIndex === prizeLadder.length - 1) {
                    gameState = 'won';
                    const playAgain = confirm('Gratulacje! Wygrałeś milion złotych!\n\nKliknij "OK" aby zagrać ponownie lub "Anuluj" aby zakończyć.');
                    if (playAgain) {
                        resetGameDirect();
                        startGame();
                    } else {
                        resetGame();
                    }
                } else {
                    // Przejdź do kolejnego pytania dopiero po zakończeniu melodii
                    currentQuestionIndex++;
                    currentQuestion = getCurrentQuestion();
                    selectedAnswer = null;
                    gameState = 'playing';
                    answerState = '';
                    playSound('question');
                }
            };
            
            goodSound.addEventListener('ended', onGoodEnded);
            
        } else {
            // Stan 3: Błędna odpowiedź - zaznaczona na czerwono, poprawna na zielono
            answerState = 'wrong';
            playSound('wrong');
              setTimeout(() => {
                gameState = 'lost';                const guaranteedPrize = getGuaranteedPrize();
                const playAgain = confirm(`Niestety, to nie jest poprawna odpowiedź. Wygrywasz ${guaranteedPrize}!\n\nKliknij "OK" aby zagrać ponownie lub "Anuluj" aby zakończyć.`);
                if (playAgain) {
                    resetGameDirect();
                    startGame();
                } else {
                    resetGame();
                }
            }, 3000);
        }
    }, randomDelay);
}

// Rozpoczęcie gry
function startGame() {
    gameState = 'playing';
    currentQuestion = getCurrentQuestion();
    playSound('question'); // Odtwórz dźwięk dla pierwszego pytania
}

// Reset gry
function resetGame() {
    currentQuestionIndex = 0;
    selectedAnswer = null;
    gameState = 'start'; // Powrót do ekranu startowego
    answerState = '';
    currentQuestion = null;
    lifelineFiftyFifty = true;
    lifelineAskAudience = true;
    lifelinePhoneFriend = true;
}

// Reset gry z pominięciem ekranu startowego
function resetGameDirect() {
    currentQuestionIndex = 0;
    selectedAnswer = null;
    answerState = '';
    currentQuestion = null;
    lifelineFiftyFifty = true;
    lifelineAskAudience = true;
    lifelinePhoneFriend = true;
}

// Obsługa kliknięcia przycisku rezygnacji
function handleQuitButtonClick() {
    // Aktualna kwota to kwota za ostatnie poprawnie odpowiedziane pytanie
    const currentPrize = currentQuestionIndex > 0 ? prizeLadder[prizeLadder.length - currentQuestionIndex].amount : '0 zł';
    const guaranteedPrize = getGuaranteedPrize();
    
    const shouldQuit = confirm(`Czy na pewno chcesz rezygnować?\n\nAktualna kwota: ${currentPrize}\nGwarantowana kwota: ${guaranteedPrize}\n\nKliknij "OK" aby rezygnować lub "Anuluj" aby grać dalej.`);    if (shouldQuit) {
        gameState = 'quit';
        // Przy rezygnacji gracz otrzymuje aktualną kwotę (za ostatnie poprawnie odpowiedziane pytanie)
        // lub gwarantowaną kwotę, jeśli jest wyższa
        const actualPrize = currentQuestionIndex > 0 ? prizeLadder[prizeLadder.length - currentQuestionIndex].amount : '0 zł';
        const guaranteedPrize = getGuaranteedPrize();
        
        // Wybierz wyższą z aktualnej i gwarantowanej kwoty
        const finalPrize = currentQuestionIndex > 0 && 
            parseInt(actualPrize.replace(/\D/g, '')) >= parseInt(guaranteedPrize.replace(/\D/g, '')) 
            ? actualPrize : guaranteedPrize;
            
        const playAgain = confirm(`Dziękujemy za grę! Wygrywasz ${finalPrize}!\n\nKliknij "OK" aby zagrać ponownie lub "Anuluj" aby zakończyć.`);
        if (playAgain) {
            resetGameDirect();
            startGame();
        } else {
            resetGame();
        }
    }
    // Jeśli nie - gra trwa dalej
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
        if (answerState === 'selected' && index === selectedAnswer) {
            // Stan 1: Zaznaczona odpowiedź (pomarańczowy/żółty)
            baseColor = '#cc6600';
            highlightColor = '#994400';
            borderColor = '#ffaa00';
        } else if (answerState === 'correct' && index === selectedAnswer) {
            // Stan 2: Poprawna odpowiedź (zielony)
            baseColor = '#1a7300';
            highlightColor = '#0d3900';
            borderColor = '#66ff66';
        } else if (answerState === 'wrong') {
            if (index === selectedAnswer) {
                // Stan 3a: Błędna zaznaczona odpowiedź (czerwony)
                baseColor = '#990000';
                highlightColor = '#660000';
                borderColor = '#ff6666';
            } else if (index === currentQuestion.correct) {
                // Stan 3b: Poprawna odpowiedź przy błędzie (zielony)
                baseColor = '#1a7300';
                highlightColor = '#0d3900';
                borderColor = '#66ff66';
            }
        }
    } else if (isSelected && gameState === 'playing') {
        // Zwykłe zaznaczenie podczas gry
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

// Funkcja rysująca ekran startowy
function drawStartScreen() {
    // Rysowanie przycisku "zacznij gre" w miejscu pytania
    drawStartButton();
    
    // Rysowanie kredytów w miejscu odpowiedzi
    drawCredits();
}

// Funkcja rysująca przycisk startowy
function drawStartButton() {
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
    
    // Tekst przycisku
    ctx.fillStyle = colors.text;
    const buttonFontSize = Math.min(window.innerWidth * 0.04, 36);
    ctx.font = `bold ${buttonFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ZACZNIJ GRĘ', box.x + (box.width / 2), box.y + (box.height / 2));
    
    // Efekt świecenia
    ctx.shadowColor = colors.highlight;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// Funkcja rysująca kredyty
function drawCredits() {
    const credits = [
        "Gra stworzona przez:",
        "Interaktywne aplikacje multimedialne",
        "Bartłomiej Marzec",
        "Uniwersytet śląski: informatyka"
    ];
    
    answerBoxes.forEach((box, index) => {
        if (index < credits.length) {
            drawCreditBox(box, credits[index]);
        }
    });
}

// Funkcja rysująca pojedynczy kredyt
function drawCreditBox(box, creditText) {
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
    gradient.addColorStop(0, '#1a4d99');
    gradient.addColorStop(0.3, '#0d2666');
    gradient.addColorStop(0.7, '#1a4d99');
    gradient.addColorStop(1, '#0d2666');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Obramowanie
    ctx.strokeStyle = '#4da6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Tekst kredytu
    ctx.fillStyle = colors.text;
    const creditFontSize = Math.min(window.innerWidth * 0.02, 18);
    ctx.font = `${creditFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(creditText, box.x + (box.width / 2), box.y + (box.height / 2));
}

// Funkcja rysująca przycisk rezygnacji (w stylu kół ratunkowych)
function drawQuitButton() {
    if (gameState !== 'playing' && gameState !== 'checking') return;
    
    const ladderWidth = window.innerWidth * 0.12;
    const startX = canvas.width - ladderWidth;
    const buttonWidth = ladderWidth * 0.9;
    const buttonHeight = window.innerHeight * 0.04;
    const buttonX = startX + (ladderWidth - buttonWidth) / 2 - 25; // Przesunięcie o 15 pikseli w lewo
    const buttonY = window.innerHeight * 0.02 + 20 + (prizeLadder.length * window.innerHeight * 0.035); // Pod drabinką z kwotami
    
    // Zaokrąglony prostokąt w stylu kół ratunkowych
    const cornerRadius = buttonHeight * 0.5; // Silnie zaokrąglone rogi
    
    ctx.beginPath();
    ctx.moveTo(buttonX + cornerRadius, buttonY);
    ctx.lineTo(buttonX + buttonWidth - cornerRadius, buttonY);
    ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY, buttonX + buttonWidth, buttonY + cornerRadius);
    ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - cornerRadius);
    ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY + buttonHeight, buttonX + buttonWidth - cornerRadius, buttonY + buttonHeight);
    ctx.lineTo(buttonX + cornerRadius, buttonY + buttonHeight);
    ctx.quadraticCurveTo(buttonX, buttonY + buttonHeight, buttonX, buttonY + buttonHeight - cornerRadius);
    ctx.lineTo(buttonX, buttonY + cornerRadius);
    ctx.quadraticCurveTo(buttonX, buttonY, buttonX + cornerRadius, buttonY);
    ctx.closePath();
    
    // Gradient radialny jak w kołach ratunkowych
    const centerX = buttonX + buttonWidth / 2;
    const centerY = buttonY + buttonHeight / 2;
    const radius = Math.max(buttonWidth, buttonHeight) / 2;
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(0, 153, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 51, 102, 0.8)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Obramowanie jak w kołach ratunkowych
    ctx.strokeStyle = colors.highlight; // '#0099FF'
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Tekst "Rezygnuję" zamiast ikony drzwi
    ctx.fillStyle = colors.text;
    const textSize = Math.min(window.innerWidth * 0.012, 14);
    ctx.font = `bold ${textSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Rezygnuję', centerX, centerY);
    
    // Efekt świecenia jak w aktywnych kołach ratunkowych
    ctx.shadowColor = colors.highlight;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Zwracamy pozycję przycisku dla obsługi kliknięć
    return { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
}
