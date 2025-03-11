// Initialize Supabase (wrapped in a try-catch to prevent initialization errors)
let supabase;
try {
    const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your Supabase URL
    const supabaseKey = 'YOUR_SUPABASE_KEY'; // Replace with your Supabase anon key
    supabase = Supabase.createClient(supabaseUrl, supabaseKey);
} catch (error) {
    console.log('Supabase initialization error:', error);
    // Create a dummy supabase object to prevent errors
    supabase = {
        from: () => ({
            insert: () => Promise.resolve(),
            select: () => Promise.resolve({ data: [] })
        })
    };
}

// Debug flag - set to true to see collision hitboxes
const DEBUG_HITBOXES = false;

// Game variables
let player;
let platforms;
let obstacles;
let distanceText;
let isGameOver = false;
let baseSpeed = -300; // Base speed value
let currentSpeed = -300; // Current speed that can change with score
let score = 0;
let lastObstacleTime = 0;
let debugText;
let speedText;
let lastMilestone = 0; // Track the last milestone reached for speed boosts
let scoreboardText; // UI for score display
let highScore = 0; // Track high score

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: DEBUG_HITBOXES // Show hitboxes when debugging is enabled
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Constants
const PLAYER_VELOCITY = 300; // Base velocity for player movement
const PLAYER_VELOCITY_BOOST = 15; // Fixed amount to increase player velocity per phase
const MILESTONE_BOOST = 0.20; // Boost at each 100-point milestone (20% increase)
const DISTANCE_FACTOR = 5; // Distance increases faster (was 10, now 5)
const BASE_SPIKE_SCALE = 0.8; // Increased from 0.5 to make spikes larger from beginning
const MAX_OBSTACLES = 7; // Maximum concurrent obstacles allowed

// Game positions (centralized for easy modification)
const GAME_POSITIONS = {
    floorY: 400,    // Moved up from 580
    ceilingY: 200,  // Moved down from 20
    playerStartY: 380, // Just above the floor
    floorObstacleY: 380, // Adjusted for new floor position
    ceilingObstacleY: 220 // Adjusted for new ceiling position
};

// Font style for all text elements
const GAME_FONT = { 
    fontFamily: '"Press Start 2P"',
    fontSize: '12px',
    fill: '#665544'
};

// Initialize game
window.onload = function() {
    // Wait for the font to be loaded before starting the game
    WebFont.load({
        google: {
            families: ['Press Start 2P']
        },
        active: function() {
            console.log('Font loaded, starting game');
            window.game = new Phaser.Game(config);
        }
    });
};

// Preload assets
function preload() {
    // Create simple colored rectangles for the game elements
    generateSimpleAssets(this);
    
    // Load audio (in try-catch to prevent errors if files don't exist)
    try {
        this.load.audio('flip', 'assets/flip.wav');
        this.load.audio('hit', 'assets/hit.wav');
        this.load.audio('bgm', 'assets/bgm.mp3');
    } catch (error) {
        console.log('Audio loading error:', error);
    }
}

// Create scene
function create() {
    console.log("Creating game scene");
    
    // Reset game state
    isGameOver = false;
    score = 0;
    lastObstacleTime = 0;
    currentSpeed = baseSpeed; // Reset to base speed
    lastMilestone = 0; // Reset milestone counter
    
    // Set background - CHANGED TO DARKER BEIGE
    this.cameras.main.setBackgroundColor('#cdb891');
    // Remove neon overlay or change its color
    // this.add.rectangle(400, 300, 800, 600, 0x00ffcc, 0.1); // Neon overlay
    
    // Create player
    player = this.physics.add.sprite(100, GAME_POSITIONS.playerStartY, 'guy');
    player.setScale(0.5);
    player.setBounce(0); // No bouncing
    player.setCollideWorldBounds(true);
    player.setGravity(0, 0); // No gravity
    player.setVelocityY(PLAYER_VELOCITY); // Start with downward velocity
    player.isCeiling = false; // Track surface
    player.isOnSurface = false; // Track if touching floor or ceiling
    
    // Adjust the player's hitbox to be smaller than the visual appearance
    // This creates a more forgiving collision area that better matches what players see
    const playerHitboxReduction = 5; // Reduce hitbox by 5 pixels on each side
    player.body.setSize(
        player.width - (playerHitboxReduction * 2),
        player.height - (playerHitboxReduction * 2)
    );
    // Center the hitbox
    player.body.setOffset(playerHitboxReduction, playerHitboxReduction);
    
    // Create platforms
    platforms = this.physics.add.staticGroup();
    const floor = platforms.create(400, GAME_POSITIONS.floorY, 'platform');
    floor.setScale(2, 1).refreshBody(); // Floor
    const ceiling = platforms.create(400, GAME_POSITIONS.ceilingY, 'platform');
    ceiling.setScale(2, 1).refreshBody(); // Ceiling
    
    // Create obstacles group
    obstacles = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });
    
    // Add initial obstacles (with time spacing)
    this.time.addEvent({
        delay: 500,
        callback: () => {
            for (let i = 1; i <= 3; i++) {
                this.time.delayedCall(i * 500, () => {
                    const x = 600 + i * 300;
                    const yPos = Math.random() > 0.5 ? GAME_POSITIONS.floorObstacleY : GAME_POSITIONS.ceilingObstacleY;
                    createObstacle(this, x, yPos);
                });
            }
        },
        callbackScope: this
    });
    
    // Add colliders
    this.physics.add.collider(player, platforms, handleCollision, null, this);
    this.physics.add.collider(player, obstacles, gameOver, null, this);
    
    // Add score text - CHANGED TO SOFT BROWN
    distanceText = this.add.text(16, 16, 'Distance: 0', { 
        fontFamily: '"Press Start 2P"',
        fontSize: '12px', 
        fill: '#665544'
    });
    
    // Add the new clean UI scoreboard above the ceiling on the right
    // Get high score from localStorage or default to 0
    highScore = 0;
    try {
        const savedHighScore = localStorage.getItem('gravityGuyHighScore');
        if (savedHighScore) {
            highScore = parseInt(savedHighScore);
        }
    } catch (error) {
        console.log('Could not load high score:', error);
    }
    
    // Create the high score / current score display - positioned above ceiling, right side, dark brown color
    scoreboardText = this.add.text(750, GAME_POSITIONS.ceilingY - 30, `HI ${highScore.toString().padStart(5, '0')} ${0..toString().padStart(5, '0')}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#404040', // Same gray as floor, ceiling and spikes
        align: 'right'
    });
    scoreboardText.setOrigin(1, 0.5);
    
    // Add speed text - CHANGED TO PASTEL PURPLE
    speedText = this.add.text(16, 80, 'Speed: ' + Math.abs(Math.floor(currentSpeed)), {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#cc99ff'
    });
    
    // Add speed multiplier text - CHANGED TO PASTEL PURPLE
    this.speedMultiplierText = this.add.text(16, 110, 'Multiplier: 1.00x', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        fill: '#cc99ff'
    });
    
    // Add surface status text - CHANGED TO SOFT BROWN
    this.surfaceText = this.add.text(16, 140, 'On Surface: No', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        fill: '#665544'
    });
    
    // Add controls info text - CHANGED TO SOFT BROWN
    this.controlsText = this.add.text(400, 100, 'Press SPACE or CLICK\nwhen on surface to flip', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#665544',
        align: 'center'
    });
    this.controlsText.setOrigin(0.5);
    this.controlsTextShown = true; // Track if controls text is shown
    
    // Debug text - CHANGED TO SOFT BROWN
    debugText = this.add.text(16, 50, 'Debug: 0 obstacles', {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        fill: '#665544'
    });
    
    // Add sounds
    try {
        this.flipSound = this.sound.add('flip');
        this.hitSound = this.sound.add('hit');
        
        // Try to load BGM, but don't let it crash the game
        const bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
        if (bgm) {
            bgm.play().catch(err => console.log('BGM play error:', err));
        }
    } catch (error) {
        console.log('Audio setup error:', error);
        // Create dummy sound objects to prevent errors
        this.flipSound = { play: () => {} };
        this.hitSound = { play: () => {} };
    }
    
    // Setup keyboard input
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Setup touch/click input
    this.input.on('pointerdown', () => {
        flipGravity(this);
    });
    
    // Obstacle generation timer - initially slower but will speed up in later phases
    this.obstacleTimer = this.time.addEvent({
        delay: 1500,
        callback: () => {
            if (!isGameOver) {
                // Calculate max obstacles based on current phase
                const maxForPhase = Math.min(MAX_OBSTACLES, 3 + lastMilestone);
                
                // Generate more obstacles at higher phases
                const obstacleCount = obstacles.countActive();
                if (obstacleCount < maxForPhase) {
                    // Higher chance of generating multiple obstacles in later phases
                    // Phase 1: mostly single obstacles
                    // Phase 3+: chance of double obstacles
                    if (lastMilestone >= 2 && Math.random() > 0.7) {
                        // Generate a pair of obstacles (one on floor, one on ceiling)
                        const x = 900;
                        createObstacle(this, x, GAME_POSITIONS.floorObstacleY);
                        createObstacle(this, x + 50, GAME_POSITIONS.ceilingObstacleY);
                    } else {
                        // Generate a single obstacle
                        generateObstacle(this);
                    }
                }
            }
        },
        callbackScope: this,
        loop: true
    });
    
    // Try to fetch top scores
    try {
        fetchTopScores(this);
    } catch (error) {
        console.log('Error fetching scores:', error);
    }
    
    console.log("Game scene created successfully");
}

// Handle collision with platforms
function handleCollision(player, platform) {
    // Set player as on surface
    player.isOnSurface = true;
    
    // Reset surface status after a short delay
    // This helps ensure accurate surface detection
    if (this.surfaceTimer) {
        this.surfaceTimer.remove();
    }
    
    this.surfaceTimer = this.time.delayedCall(100, () => {
        if (player) {
            // Only set to false if there's no active collision
            if (!this.physics.overlap(player, platforms)) {
                player.isOnSurface = false;
            }
        }
    });
    
    // Ensure the player doesn't bounce or oscillate by maintaining its position
    if (player.isCeiling) {
        player.y = GAME_POSITIONS.ceilingY + player.height/2;
    } else {
        player.y = GAME_POSITIONS.floorY - player.height/2;
    }
    
    // Get dynamic velocity based on current phase
    const currentVelocity = getPlayerVelocity();
    
    // Keep the velocity dynamic based on the current phase
    player.setVelocityY(player.isCeiling ? -currentVelocity : currentVelocity);
}

// Update loop
function update(time, delta) {
    if (isGameOver) return;
    
    // Update score - now increases faster
    score++;
    const displayScore = Math.floor(score / DISTANCE_FACTOR);
    distanceText.setText(`Distance: ${displayScore}`);
    
    // Update the clean scoreboard display (formatted with leading zeros)
    scoreboardText.setText(`HI ${highScore.toString().padStart(5, '0')} ${displayScore.toString().padStart(5, '0')}`);
    
    // Hide controls text when player reaches a distance of 25
    if (this.controlsTextShown && displayScore >= 25) {
        this.controlsTextShown = false;
        this.tweens.add({
            targets: this.controlsText,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.controlsText.visible = false;
            }
        });
    }
    
    // Check for milestone (every 100 points)
    const currentMilestone = Math.floor(displayScore / 100);
    if (currentMilestone > lastMilestone) {
        // Milestone reached! Add a speed boost
        lastMilestone = currentMilestone;
        
        // Calculate new speed based only on milestones
        // Each milestone adds a fixed percentage boost
        currentSpeed = baseSpeed * (1 + (lastMilestone * MILESTONE_BOOST));
        
        // Visual and audio feedback for milestone
        this.cameras.main.flash(300, 255, 255, 255, true);
        
        // Show milestone text
        const milestoneText = this.add.text(400, 200, `PHASE ${lastMilestone}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#ff0000'
        }).setOrigin(0.5);
        
        // Make the text disappear after a short time
        this.tweens.add({
            targets: milestoneText,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: function() { milestoneText.destroy(); }
        });
        
        // Try to play a sound for milestone
        try {
            this.sound.play('hit', { volume: 0.5 });
        } catch (error) {
            console.log('Could not play milestone sound');
        }
        
        // Adjust obstacle generator for the new phase
        if (this.obstacleTimer) {
            // Decrease delay between obstacle generations as phases progress
            const newDelay = Math.max(500, 1500 - (lastMilestone * 200));
            this.obstacleTimer.delay = newDelay;
            console.log(`Phase ${lastMilestone}: Obstacle delay: ${newDelay}ms`);
        }
    }
    
    // Calculate speed multiplier for display - based only on milestones
    const speedMultiplier = 1 + (lastMilestone * MILESTONE_BOOST);
    
    // Update speed display
    speedText.setText(`Speed: ${Math.abs(Math.floor(currentSpeed))}`);
    
    // Update multiplier display with 2 decimal places
    this.speedMultiplierText.setText(`Phase: ${lastMilestone}`);
    
    // Update surface status display
    this.surfaceText.setText(`On Surface: ${player.isOnSurface ? 'Yes' : 'No'}`);
    
    // Get current player velocity for display
    const currentPlayerVelocity = getPlayerVelocity();
    
    // Update debug info with accurate player velocity
    debugText.setText(`Phase: ${lastMilestone} | Obstacles: ${obstacles.countActive()} | Player Speed: ${Math.round(currentPlayerVelocity)} | FPS: ${Math.round(this.game.loop.actualFps)}`);
    
    // Force update player velocity in real-time if they're on a surface
    if (player.isOnSurface) {
        player.setVelocityY(player.isCeiling ? -currentPlayerVelocity : currentPlayerVelocity);
    }
    
    // Handle space key
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        flipGravity(this);
    }
    
    // Move and clean up obstacles
    obstacles.children.iterate(child => {
        if (!child || !child.body) return;
        
        // Use current speed based on score
        child.x += currentSpeed * (delta / 1000);
        
        // Remove obstacles that are off-screen
        if (child.x < -50) {
            child.destroy();
        }
    });
    
    // Check if player is out of bounds
    if (player.y > 600 || player.y < 0) {
        gameOver.call(this, player, null);
    }
}

// Calculate player velocity based on current phase
function getPlayerVelocity() {
    // Start with base velocity
    let velocity = PLAYER_VELOCITY;
    
    // Add 15 units per phase
    if (lastMilestone > 0) {
        velocity += lastMilestone * PLAYER_VELOCITY_BOOST;
    }
    
    return velocity;
}

// Function to flip gravity
function flipGravity(scene) {
    // Only allow flipping when on a surface (floor or ceiling)
    if (!player || !player.isOnSurface || isGameOver) return;
    
    // Flip the direction
    player.isCeiling = !player.isCeiling;
    
    // Get dynamic velocity based on current phase
    const currentVelocity = getPlayerVelocity();
    
    // Set dynamic velocity based on phase
    player.setVelocityY(player.isCeiling ? -currentVelocity : currentVelocity);
    
    // Play flip sound
    try {
        scene.flipSound.play();
    } catch (error) {
        console.log('Could not play flip sound');
    }
}

// Helper function to create an obstacle
function createObstacle(scene, x, yPos) {
    if (!obstacles) return null;
    
    const newObstacle = obstacles.create(x, yPos, 'spike');
    newObstacle.setScale(0.8); // Increased from 0.5 to 0.8 (1.6x larger)
    
    if (yPos === GAME_POSITIONS.ceilingObstacleY) {
        newObstacle.setFlipY(true);
    }
    
    // Ensure physics properties are set
    newObstacle.body.setAllowGravity(false);
    newObstacle.body.setImmovable(true);
    
    // Adjust the hitbox to be smaller than the visual appearance
    // This creates a more forgiving collision area that better matches what players see
    const hitboxReduction = 10; // Reduce hitbox by 10 pixels on each side
    newObstacle.body.setSize(
        newObstacle.width - (hitboxReduction * 2),
        newObstacle.height - (hitboxReduction * 2)
    );
    // Center the hitbox
    newObstacle.body.setOffset(hitboxReduction, hitboxReduction);
    
    return newObstacle;
}

// Function to generate new obstacles
function generateObstacle(scene) {
    const now = scene.time.now;
    
    // Ensure obstacles aren't generated too frequently
    if (now - lastObstacleTime < 800) {
        return;
    }
    
    lastObstacleTime = now;
    const x = 900;
    
    // Determine if we should create a group of spikes based on game phase/milestone
    // Higher milestone = higher chance of spike groups
    const groupProbability = Math.min(0.7, 0.2 + (lastMilestone * 0.1)); // Caps at 70% chance
    const createGroup = Math.random() < groupProbability;
    
    if (createGroup) {
        // Create a group of 2-3 spikes
        const spikeCount = Math.random() < 0.5 ? 2 : 3;
        const groupLocation = Math.random() > 0.5 ? GAME_POSITIONS.floorObstacleY : GAME_POSITIONS.ceilingObstacleY;
        
        for (let i = 0; i < spikeCount; i++) {
            // Create spikes with slight horizontal offset
            createObstacle(scene, x + (i * 60), groupLocation);
        }
    } else {
        // Create a single spike as before
        const yPos = Math.random() > 0.5 ? GAME_POSITIONS.floorObstacleY : GAME_POSITIONS.ceilingObstacleY;
        createObstacle(scene, x, yPos);
    }
}

// Game over function
function gameOver(player, obstacle) {
    if (isGameOver) return; // Prevent multiple game over calls
    
    isGameOver = true;
    console.log("Game over triggered");
    
    // Stop physics and timers
    this.physics.pause();
    if (this.obstacleTimer) {
        this.obstacleTimer.remove();
    }
    if (this.surfaceTimer) {
        this.surfaceTimer.remove();
    }
    
    // Play hit sound
    try {
        this.hitSound.play();
    } catch (error) {
        console.log('Could not play hit sound');
    }
    
    // Visual feedback
    player.setTint(0xff0000);
    
    // Add a collision indicator if the obstacle exists
    if (obstacle) {
        // Create a flash effect at the collision point
        const collisionPoint = this.add.circle(
            player.x, 
            player.y, 
            20, 
            0xff0000, 
            0.8
        );
        
        // Animate the collision point
        this.tweens.add({
            targets: collisionPoint,
            alpha: 0,
            scale: 2,
            duration: 500,
            ease: 'Power2'
        });
    }
    
    // Calculate final score
    const finalScore = Math.floor(score / DISTANCE_FACTOR);
    
    // Update high score if needed
    if (finalScore > highScore) {
        highScore = finalScore;
        try {
            localStorage.setItem('gravityGuyHighScore', highScore.toString());
        } catch (error) {
            console.log('Could not save high score:', error);
        }
    }
    
    // Try to save score to Supabase
    try {
        supabase.from('highscores').insert({ score: finalScore });
    } catch (error) {
        console.log('Could not save score: ' + error.message);
    }
    
    // Show game over text - CHANGED TO SOFT BROWN
    this.add.text(400, 300, 'GAME OVER', {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        fill: '#665544'
    }).setOrigin(0.5);
    
    this.add.text(400, 340, `Distance: ${finalScore}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#665544'
    }).setOrigin(0.5);
    
    // Restart button - CHANGED TO SOFT BROWN
    const restartButton = this.add.text(400, 450, 'Tap to Restart', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#665544'
    }).setOrigin(0.5);
    
    restartButton.setInteractive();
    restartButton.on('pointerdown', () => {
        console.log("Restarting game");
        this.scene.restart();
    });
}

// Helper function to fetch top scores from Supabase
async function fetchTopScores(scene) {
    try {
        const { data, error } = await supabase
            .from('highscores')
            .select('score')
            .order('score', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            let topScoresText = 'Top Scores:\n';
            data.forEach((scoreData, index) => {
                topScoresText += `${index + 1}. ${scoreData.score}\n`;
            });
            
            scene.add.text(650, 16, topScoresText, {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                fill: '#665544' // CHANGED TO SOFT BROWN
            });
        }
    } catch (error) {
        console.log('Could not fetch top scores: ' + error.message);
    }
}

// Helper function to generate simple colored rectangles for game elements
function generateSimpleAssets(scene) {
    // Create textures
    
    // Player (teal square)
    const playerGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    playerGraphics.fillStyle(0x3399CC, 1); // STRONG TEAL
    playerGraphics.fillRect(0, 0, 50, 50);
    playerGraphics.generateTexture('guy', 50, 50);
    
    // Platform (darker gray rectangle)
    const platformGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    platformGraphics.fillStyle(0x404040, 1); // DARKER GRAY
    platformGraphics.fillRect(0, 0, 400, 20);
    platformGraphics.generateTexture('platform', 400, 20);
    
    // Spike (dark gray triangle - same as platforms)
    const spikeGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    spikeGraphics.fillStyle(0x404040, 1); // MATCH PLATFORMS
    spikeGraphics.beginPath();
    // Make the spike triangle larger and more menacing
    spikeGraphics.moveTo(0, 50); // Wider base
    spikeGraphics.lineTo(25, 0); // Taller, sharper point
    spikeGraphics.lineTo(50, 50); // Wider base
    spikeGraphics.closePath();
    spikeGraphics.fillPath();
    spikeGraphics.generateTexture('spike', 50, 50);
} 