(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const playerScoreEl = document.getElementById('playerScore');
    const aiScoreEl = document.getElementById('aiScore');
    const newGameBtn = document.getElementById('newGameBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Game state
    let gameState = {
        playing: true,
        paused: false,
        playerScore: 0,
        aiScore: 0,
        winner: null,
        ballSpeed: 6
    };

    // Table dimensions and styling
    const table = {
        x: 50,
        y: 200,
        width: canvas.width - 100,
        height: 140,
        netHeight: 20,
        color: '#0d4a2d',
        netColor: '#fff'
    };

    // Paddle properties
    const paddleWidth = 80;
    const paddleHeight = 12;
    
    const player = {
        x: canvas.width / 2 - paddleWidth / 2,
        y: table.y + table.height + 40,
        width: paddleWidth,
        height: paddleHeight,
        color: '#4f46e5',
        speed: 8
    };

    const ai = {
        x: canvas.width / 2 - paddleWidth / 2,
        y: table.y - 52,
        width: paddleWidth,
        height: paddleHeight,
        color: '#dc2626',
        speed: 5.5,
        difficulty: 0.85
    };

    // Ball properties
    const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 8,
        vx: Math.random() > 0.5 ? 4 : -4,
        vy: Math.random() > 0.5 ? 3 : -3,
        color: '#fff',
        trail: [],
        maxTrail: 8,
        spinning: 0,
        lastHitBy: null
    };

    // Particle system for effects
    const particles = [];

    class Particle {
        constructor(x, y, color = '#fff') {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 8;
            this.vy = (Math.random() - 0.5) * 8;
            this.life = 1.0;
            this.decay = 0.02;
            this.color = color;
            this.size = Math.random() * 4 + 2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.life -= this.decay;
            this.size *= 0.98;
        }

        draw() {
            if (this.life <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.life;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Mouse tracking
    let mouse = { x: 0, y: 0 };
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });

    // Button events
    newGameBtn.addEventListener('click', newGame);
    pauseBtn.addEventListener('click', togglePause);
    resetBtn.addEventListener('click', resetScore);

    function newGame() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.vx = Math.random() > 0.5 ? 4 : -4;
        ball.vy = Math.random() > 0.5 ? 3 : -3;
        ball.spinning = 0;
        gameState.winner = null;
        gameState.playing = true;
        gameState.paused = false;
        pauseBtn.textContent = 'Pause';
    }

    function togglePause() {
        gameState.paused = !gameState.paused;
        pauseBtn.textContent = gameState.paused ? 'Resume' : 'Pause';
    }

    function resetScore() {
        gameState.playerScore = 0;
        gameState.aiScore = 0;
        playerScoreEl.textContent = '0';
        aiScoreEl.textContent = '0';
        newGame();
    }

    function createHitEffect(x, y, color) {
        for (let i = 0; i < 8; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function drawTable() {
        // Table surface with 3D effect
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        
        // Table
        ctx.fillStyle = table.color;
        ctx.fillRect(table.x, table.y, table.width, table.height);
        
        // Table border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(table.x, table.y, table.width, table.height);
        
        // Center line
        ctx.beginPath();
        ctx.moveTo(table.x, table.y + table.height / 2);
        ctx.lineTo(table.x + table.width, table.y + table.height / 2);
        ctx.stroke();
        
        // Net
        ctx.fillStyle = table.netColor;
        const netX = table.x + table.width / 2 - 2;
        ctx.fillRect(netX, table.y - table.netHeight, 4, table.height + table.netHeight * 2);
        
        // Net mesh pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const y = table.y - table.netHeight + (i * (table.height + table.netHeight * 2) / 10);
            ctx.beginPath();
            ctx.moveTo(netX, y);
            ctx.lineTo(netX + 4, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    function drawPaddle(paddle, name) {
        ctx.save();
        
        // Paddle shadow
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        
        // Paddle body with gradient
        const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
        gradient.addColorStop(0, paddle.color);
        gradient.addColorStop(0.5, paddle.color + '88');
        gradient.addColorStop(1, paddle.color + '44');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Paddle border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Handle
        const handleWidth = 20;
        const handleHeight = 6;
        const handleX = paddle.x + paddle.width / 2 - handleWidth / 2;
        const handleY = paddle === player ? paddle.y + paddle.height : paddle.y - handleHeight;
        
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
        ctx.strokeRect(handleX, handleY, handleWidth, handleHeight);
        
        // Player name
        ctx.fillStyle = '#fff';
        ctx.font = '14px Inter, Arial';
        ctx.textAlign = 'center';
        const textY = paddle === player ? paddle.y + paddle.height + 25 : paddle.y - 25;
        ctx.fillText(name, paddle.x + paddle.width / 2, textY);
        
        ctx.restore();
    }

    function drawBall() {
        // Ball trail
        ctx.save();
        for (let i = 0; i < ball.trail.length; i++) {
            const trail = ball.trail[i];
            const alpha = (i + 1) / ball.trail.length * 0.5;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ball.color;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, ball.radius * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Ball shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Main ball with gradient
        const gradient = ctx.createRadialGradient(
            ball.x - 2, ball.y - 2, 0,
            ball.x, ball.y, ball.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.7, '#f0f0f0');
        gradient.addColorStop(1, '#c0c0c0');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ball spin indicator
        if (Math.abs(ball.spinning) > 0.1) {
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();

        // Update trail
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > ball.maxTrail) {
            ball.trail.shift();
        }
    }

    function updatePlayer() {
        // Smooth player movement towards mouse
        const targetX = Math.max(table.x, Math.min(table.x + table.width - player.width, mouse.x - player.width / 2));
        const dx = targetX - player.x;
        player.x += dx * 0.15;
    }

    function updateAI() {
        // Improved AI with prediction and difficulty
        const ballCenterX = ball.x;
        const paddleCenterX = ai.x + ai.width / 2;
        
        // Predict where ball will be
        let targetX = ballCenterX;
        if (ball.vy < 0) { // Ball moving towards AI
            const timeToReach = Math.abs((ai.y - ball.y) / ball.vy);
            targetX = ball.x + ball.vx * timeToReach;
        }
        
        // Add some imperfection based on difficulty
        const error = (Math.random() - 0.5) * (1 - ai.difficulty) * 100;
        targetX += error;
        
        // Move towards target
        const dx = targetX - paddleCenterX;
        if (Math.abs(dx) > 5) {
            const moveX = Math.sign(dx) * ai.speed;
            ai.x = Math.max(table.x, Math.min(table.x + table.width - ai.width, ai.x + moveX));
        }
    }

    function checkCollision(rect, ball) {
        return ball.x + ball.radius > rect.x &&
               ball.x - ball.radius < rect.x + rect.width &&
               ball.y + ball.radius > rect.y &&
               ball.y - ball.radius < rect.y + rect.height;
    }

    function updateBall() {
        if (!gameState.playing || gameState.paused) return;

        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Apply spin effect
        ball.vx += ball.spinning * 0.1;
        ball.spinning *= 0.99;

        // Wall collisions (left and right)
        if (ball.x - ball.radius < table.x || ball.x + ball.radius > table.x + table.width) {
            ball.vx = -ball.vx;
            ball.spinning = -ball.spinning;
            createHitEffect(ball.x, ball.y, '#fff');
        }

        // Net collision
        const netX = table.x + table.width / 2;
        if (Math.abs(ball.x - netX) < ball.radius + 2 &&
            ball.y > table.y - table.netHeight &&
            ball.y < table.y + table.height) {
            ball.vx = -ball.vx;
            ball.vy = Math.abs(ball.vy) * (ball.y < table.y + table.height / 2 ? -1 : 1);
            createHitEffect(ball.x, ball.y, '#ff6b6b');
        }

        // Player paddle collision
        if (checkCollision(player, ball) && ball.vy > 0) {
            ball.vy = -Math.abs(ball.vy) - 0.5;
            
            // Add spin based on paddle movement
            const paddleSpeed = (mouse.x - player.x - player.width / 2) * 0.3;
            ball.vx += paddleSpeed * 0.3;
            ball.spinning = paddleSpeed * 0.05;
            
            ball.lastHitBy = 'player';
            createHitEffect(ball.x, ball.y, player.color);
        }

        // AI paddle collision
        if (checkCollision(ai, ball) && ball.vy < 0) {
            ball.vy = Math.abs(ball.vy) + 0.5;
            
            // AI adds strategic angle
            const paddleCenter = ai.x + ai.width / 2;
            const hitPosition = (ball.x - paddleCenter) / (ai.width / 2);
            ball.vx += hitPosition * 2;
            ball.spinning = hitPosition * 0.1;
            
            ball.lastHitBy = 'ai';
            createHitEffect(ball.x, ball.y, ai.color);
        }

        // Score points
        if (ball.y > canvas.height + 50) {
            gameState.aiScore++;
            aiScoreEl.textContent = gameState.aiScore;
            resetBall();
        } else if (ball.y < -50) {
            gameState.playerScore++;
            playerScoreEl.textContent = gameState.playerScore;
            resetBall();
        }

        // Check for winner
        if (gameState.playerScore >= 11 && gameState.playerScore - gameState.aiScore >= 2) {
            gameState.winner = 'Player';
            gameState.playing = false;
        } else if (gameState.aiScore >= 11 && gameState.aiScore - gameState.playerScore >= 2) {
            gameState.winner = 'AI';
            gameState.playing = false;
        }

        // Speed limit
        const maxSpeed = 12;
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > maxSpeed) {
            ball.vx = (ball.vx / speed) * maxSpeed;
            ball.vy = (ball.vy / speed) * maxSpeed;
        }
    }

    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.vx = Math.random() > 0.5 ? 4 : -4;
        ball.vy = Math.random() > 0.5 ? 3 : -3;
        ball.spinning = 0;
        ball.trail = [];
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.update();
            if (particle.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function drawUI() {
        // Game status
        if (gameState.paused) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 48px Inter, Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }

        if (gameState.winner) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = gameState.winner === 'Player' ? '#4f46e5' : '#dc2626';
            ctx.font = 'bold 56px Inter, Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${gameState.winner} Wins!`, canvas.width / 2, canvas.height / 2 - 30);
            
            ctx.fillStyle = '#fff';
            ctx.font = '24px Inter, Arial';
            ctx.fillText('Click "New Game" to play again', canvas.width / 2, canvas.height / 2 + 30);
        }

        // Ball speed indicator
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '16px Inter, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Ball Speed: ${speed.toFixed(1)}`, 20, canvas.height - 20);
    }

    function gameLoop() {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a0a0f');
        gradient.addColorStop(1, '#12121b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw game elements
        drawTable();
        drawPaddle(ai, 'AI Opponent');
        drawPaddle(player, 'You');
        drawBall();

        // Update game state
        if (!gameState.paused) {
            updatePlayer();
            updateAI();
            updateBall();
            updateParticles();
        }

        // Draw particles
        particles.forEach(particle => particle.draw());

        // Draw UI
        drawUI();

        requestAnimationFrame(gameLoop);
    }

    // Start game
    resetBall();
    gameLoop();
})();