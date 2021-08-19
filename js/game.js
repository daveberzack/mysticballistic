(() => {
    let ACTION, COLOR, BALL_TYPE, BOARD
    let runCounter, players, goals;
	let canvas, engine, render, runner;


// ================ INITIALIZE GAME ====================
	function init() {
        initValues();
        initEngine();
        initLevel();
        initTouchHandlers();
        setInterval(run, 20);
	}

    function initValues() {
        ACTION = {
            LAUNCH: 0,
            TRIGGER: 1   
        };
        COLOR = {
            WALL: "#222222",
            WALL0: "#FFFFFF",
            BALL0: "#FFFFFF",
            WALL1: "#000000",
            BALL1: "#000000",
        };
        BALL_TYPE = [
            {
                name: "air",
                radius: 20,
                density: 0.0005,
                friction: .025,
                maxVelocity: 15, 
                cooldownLimit: 4,                
                effectRadius: 0,
                color: "#7260be",
            },
            {
                name: "water",
                radius: 30,
                density: 0.001,
                friction: .03,
                maxVelocity: 10, 
                cooldownLimit: 15,                
                effectRadius: 140,
                color: "#61d0ee",
            },
            {
                name: "earth",
                radius: 48,
                density: 0.0008,
                friction: .045,
                maxVelocity: 9, 
                cooldownLimit: 0,
                effectRadius: 0,
                color: "#774a21",
            },
            {
                name: "fire",
                radius: 30,
                density: 0.001,
                friction: .03,
                maxVelocity: 10, 
                cooldownLimit: 20,
                effectRadius: 60,
                color: "#f0843b",
            },
        ];

        BOARD = {
            HEIGHT: $(window).innerHeight(),
            WIDTH: $(window).innerWidth(),
            HORIZONTAL_MARGIN: 10,
            VERTICAL_MARGIN: 150,
            AIM_RADIUS: 100,
            SCORE_BAR_HEIGHT: 115,
            GOAL_RADIUS: 125,
            LAUNCH_COOLDOWN_LIMIT: 7
        }
    
        runCounter=0;
        players = [
            {
                index: 0,
                ballColor: COLOR.BALL0,
                launchX: 225,
                launchY: 225,
                aimCenterX: 110,
                aimCenterY: 110,
                balls: [null, null, null, null],
                score: 0,
                actionMode: 0,
                actionTarget: null,
                joystickAngle: 0,
                joystickPercent: 0,
                joystickTimer: 0,
                joystickActive: false,
                launchCooldown: BOARD.LAUNCH_COOLDOWN_LIMIT,
                unlaunchedBallIndex: -1,
            },
            {
                index: 1,
                ballColor: COLOR.BALL1,
                launchX: BOARD.WIDTH-225,
                launchY: BOARD.HEIGHT-225,
                aimCenterX: BOARD.WIDTH-110,
                aimCenterY: BOARD.HEIGHT-110,
                balls: [null, null, null, null],
                score: 0,
                actionMode: 0,
                actionTarget: null,
                joystickAngle: 0,
                joystickPercent: 0,
                joystickTimer: 0,
                joystickActive: false,
                launchCooldown: BOARD.LAUNCH_COOLDOWN_LIMIT,
                unlaunchedBallIndex: -1,
            }
        ];
        goals = [];
    }
    function initEngine() {

		engine = Matter.Engine.create();
        canvas = document.getElementById('canvas');
		engine.world.gravity.y = 0;
		render = Matter.Render.create({
			canvas: canvas,
			engine: engine,
			options: {
				width: BOARD.WIDTH,
				height: BOARD.HEIGHT,
				wireframes: false, // need this or various render styles won't take
				background: 'transparent',
                wireframeBackground: 'transparent'
			}
		});
		Matter.Render.run(render);
		runner = Matter.Runner.create();
		Matter.Runner.run(runner, engine);
    }

// ================ UI HANDLERS ====================


    function startJoystick(player, x, y) {
        player.joystickTimer = 0;
        player.joystickActive = true;
        moveJoystick(player, x, y);
    }
    function endJoystick(player) {
        if (player.actionMode == ACTION.LAUNCH && player.launchCooldown>=BOARD.LAUNCH_COOLDOWN_LIMIT) {
            launchBall(player);
            player.launchCooldown = 0;
        }
        else if (player.actionMode == ACTION.TRIGGER) {
            triggerBall(player);
        }
        player.joystickTimer=0;
        player.joystickActive = false;
    }
    function moveJoystick(player, x, y) {
        let distance = getDistance(0, 0, x, y);
        let percent = Math.min(distance/BOARD.AIM_RADIUS, 1);
        let angle = getAngle(0, 0, x, y);
        player.joystickAngle = angle;
        player.joystickPercent = percent;
    }
    function initTouchHandlers() {
        $('.button.trigger').bind('touchstart', function(e){
            const player = players[ $(e.target).data('player') ];
            const targetClass = "targeted"+player.index;
            $("."+targetClass).removeClass(targetClass);
            const ballIndex = $(e.target).data('ball');
            const whichBall = player.balls[ballIndex];
            console.log(player.unlaunchedBallIndex);
            if (whichBall==null && player.unlaunchedBallIndex<0) {
                addBall(player, ballIndex);
                player.actionMode = ACTION.LAUNCH;
                player.actionTarget = player.balls[ballIndex];
                player.unlaunchedBallIndex = ballIndex;
                player.actionTarget.graphic.addClass(targetClass);
            }
            else if (whichBall!=null)  {
                player.actionMode = ACTION.TRIGGER;
                player.actionTarget = whichBall;
                player.actionTarget.graphic.addClass(targetClass);
            }
            
        })
        $('.button.launch').bind('touchstart', function(e){
            const player = players[ $(e.target).data('player') ];
            const ballIndex = $(e.target).data('ball');
            const thisBall = player.balls[ ballIndex ];
            if (thisBall){
                const targetClass = "targeted"+player.index;
                $("."+targetClass).removeClass(targetClass);
                player.actionMode = ACTION.LAUNCH;
                player.actionTarget = thisBall;
                player.actionTarget.graphic.addClass(targetClass);
            }
            console.log(ballIndex+"=="+player.unlaunchedBallIndex);
            
        })


        $('.joystick').bind('touchstart', function(e){
            e.preventDefault();
            const player = players[e.target.getAttribute("data-player")];
            const touch = e.targetTouches[0];
            const x = touch.pageX - player.aimCenterX;
            const y = touch.pageY - player.aimCenterY;
            startJoystick(player, x, y);
        })
        $('.joystick').bind('touchmove', function(e){
            e.preventDefault();
            const player = players[e.target.getAttribute("data-player")];
            const touch = e.targetTouches[0];
            const x = touch.pageX - player.aimCenterX;
            const y = touch.pageY - player.aimCenterY;
            moveJoystick(player,x,y);
        })
        $('.joystick').bind('touchend touchcancel', function(e){
            e.preventDefault();
            const player = players[e.target.getAttribute("data-player")];
            endJoystick(player);
        })
    }

// ================ GAME LOOP ====================

	function run() {
        if (players[0].joystickActive) players[0].joystickTimer += .02;
        if (players[1].joystickActive) players[1].joystickTimer += .02;
        if (runCounter%50 == 0) {
            updateScores();
        }
        updateCooldowns();
        updateBallGraphics();
		runCounter++;
	}

// ================ SCORING FUNCTIONS ====================

    function updateCooldowns() {
        players.forEach( (player) => {
            player.balls.forEach( (ball) => {
                if (ball) {
                    ball.cooldown += 1/50;
                }
            });
            player.launchCooldown += 1/50;
            updateLaunchGraphics();
        });
    }

    function updateLaunchGraphics() {
        players.forEach( (player) => {
            const cooldownPercent = Math.min(.99999, player.launchCooldown/BOARD.LAUNCH_COOLDOWN_LIMIT);
            const arcValues = describeArc(100,100, 50, 0, 360*cooldownPercent);
            $("#cooldownPath"+player.index).attr("d", arcValues);  
        }); 
    }

    function updateBallGraphics() {
        players.forEach( (player) => {
            player.balls.forEach( (ball) => {
                if (ball) {
                    ball.graphic.css({
                        left: ball.body.position.x,
                        top: ball.body.position.y,
                    })
                    if (ball.type.cooldownLimit>0){
                        const cooldownPercent = Math.min(.99999,ball.cooldown/ball.type.cooldownLimit);
                        ball.graphic.toggleClass("cooldownReady", cooldownPercent>.99);
                        ball.graphic.find(".cooldownPath").attr("d", describeArc(100,100, ball.type.radius-3, 0, 360*cooldownPercent));    
                    }
                    if (ball.graphic.hasClass("targeted"+player.index) && player.joystickActive && (player.actionMode==ACTION.LAUNCH || player.actionTarget.type.name=="air")){
                        const aimLine = ball.graphic.find(".aimLinePath");
                        const lineLength = player.joystickPercent*ball.type.maxVelocity*8;
                        const p1 = polarToCartesian(300, 300, ball.type.radius+20, player.joystickAngle);
                        const p2 = polarToCartesian(300, 300, ball.type.radius+20+lineLength, player.joystickAngle);
                        aimLine.attr("x1", p1.x);   
                        aimLine.attr("y1", p1.y);    
                        aimLine.attr("x2", p2.x);   
                        aimLine.attr("y2", p2.y); 
                        aimLine.show();   
                    }
                    else {
                        ball.graphic.find(".aimLinePath").hide();
                    }
                }
            });
        });
    }
    function updateScores() {
        scoreGoals();
        checkForWin();
        $("#score_0 .bar").css({"height":players[0].score*BOARD.SCORE_BAR_HEIGHT/100});
        $("#score_1 .bar").css({"height":players[1].score*BOARD.SCORE_BAR_HEIGHT/100});
    }

    function checkForWin(){
        if (players[0].score>=100) {
            $("#message").html("Player 1 Won!")
        }
        if (players[1].score>=100) {
            $("#message").html("Player 2 Won!")
        }
    }

    function scoreGoals(){
        goals.forEach((goal) => {
            let player0BallsIn = players[0].balls.reduce( function(total, ball){
                let output = total;
                if (ball!==null) {
                    let body = ball.body;
                    if (getDistance(goal.x, goal.y, body.position.x, body.position.y) <= goal.r+ball.type.radius) {
                        output++;    
                    }
                }
                return output;
            }, 0);
            let player1BallsIn = players[1].balls.reduce( function(total, ball){
                let output = total;
                if (ball!==null) {
                    let body = ball.body;
                    if (getDistance(goal.x, goal.y, body.position.x, body.position.y) < goal.r+ball.type.radius) output++;
                }
                return output;
            }, 0);
            players[0].score = Math.min(100, players[0].score + player0BallsIn);
            players[1].score = Math.min(100, players[1].score + player1BallsIn);
        })
    }


// ================ MANAGING PHYSICS ====================

    function initLevel(){
		Matter.World.add(engine.world, [
			addWall(0, 0, BOARD.HORIZONTAL_MARGIN, BOARD.HEIGHT, COLOR.WALL0), //left
			addWall(BOARD.WIDTH-BOARD.HORIZONTAL_MARGIN, 0, BOARD.HORIZONTAL_MARGIN, BOARD.HEIGHT, COLOR.WALL1), //right
			addWall(0, 0, BOARD.WIDTH, BOARD.VERTICAL_MARGIN, COLOR.WALL0), //top
			addWall(0, BOARD.HEIGHT-BOARD.VERTICAL_MARGIN, BOARD.WIDTH, BOARD.VERTICAL_MARGIN, COLOR.WALL1), //bottom
			addRoundWall(110, 110, 120, COLOR.WALL0), //joystick0
			addWall(0, 0, 110, 230, COLOR.WALL0), //joystick0 to edge
			addRoundWall(BOARD.WIDTH-110, BOARD.HEIGHT-110, 120, COLOR.WALL1), //joystick1
			addWall(BOARD.WIDTH-110, BOARD.HEIGHT-230, 110, 230, COLOR.WALL1), //joystick1 to edge
		]);

        goals.push({
            x: BOARD.WIDTH/2,
            y: BOARD.HEIGHT/2,
            r: BOARD.GOAL_RADIUS
        })
        $("#goal").css({
            "top":BOARD.HEIGHT/2 - BOARD.GOAL_RADIUS,
            "left":BOARD.WIDTH/2 - BOARD.GOAL_RADIUS,
            "width":BOARD.GOAL_RADIUS*2,
            "height":BOARD.GOAL_RADIUS*2,
        })
    }

	function addWall(x, y, width, height, color) {
		return Matter.Bodies.rectangle(x+width/2, y+height/2, width, height,  {
			isStatic: true,
			render: { visible: false },
			render: { fillStyle: color }
		});
	}

	function addRoundWall(x, y, r, color) {
		return Matter.Bodies.circle(x, y, r, {
			isStatic: true,
			render: { fillStyle: color }
		});
	}

    function addBall(player, ballIndex){
        let type = BALL_TYPE[ballIndex];
        let body = Matter.Bodies.circle(player.launchX, player.launchY, type.radius, {
			isStatic: false,
			restitution: 1,
            frictionAir: type.friction, 
            friction: 0,
            density: type.density,
            render: {
                opacity: 0
            }
		});
		Matter.World.add(engine.world, body);
        let ball = {type: type, body: body, cooldown:0, index: ballIndex};
        player.balls[ballIndex] = ball;

        let newBall = $(`
                <div class="ball type_${ball.type.name} player_${player.index}" id="ball_${player.index}_${ballIndex}">
                    <div class="body" style="width:${ball.type.radius*2}px; height:${ball.type.radius*2}px; top:-${ball.type.radius}px; left:-${ball.type.radius}px"></div>
                    <svg class="highlight">
                        <circle class="cooldownPath" fill="${player.ballColor}33" cx="100" cy="100" r="${ball.type.radius+12}px"/>
                    </svg>
                    <svg class="effectCooldown">
                        <path class="cooldownPath" fill="none" stroke="${ball.type.color}" stroke-width="3" />
                    </svg>
                    <svg class="effectRadius">
                        <circle class="cooldownPath" fill="none" stroke="${ball.type.color}" stroke-linecap="round" stroke-dasharray="1,12" stroke-width="4" 
                        cx="200" cy="200" r="${ball.type.effectRadius}"/>
                    </svg>
                    <svg class="aimLine">
                        <line class="aimLinePath" stroke="${player.ballColor}33" stroke-width="7" stroke-linecap="round" stroke-dasharray="1, 15"/>
                    </svg>
                </div>`);
        $("#balls").append(newBall);
        ball.graphic = newBall;
    }

    function launchBall(player){
        const ball = player.actionTarget;
        const velocity = ball.type.maxVelocity * player.joystickPercent;
        launchBall2(ball.body, velocity, player.joystickAngle);
        if (ball.index==player.unlaunchedBallIndex) player.unlaunchedBallIndex = -1;
    }

    function launchBall2(body, velocity, angle){
        let vx = velocity * Math.cos(angle);
        let vy = velocity * Math.sin(angle);
        Matter.Body.setVelocity( body, {x: vx, y: vy});
    }

    function removeBall(ball){
        Matter.World.remove(engine.world, ball.body);
        ball.graphic.remove();
        players.forEach( (player) => {
            player.balls.forEach( (ball2, ballIndex) => {
                if (ball2==ball) {
                    player.balls[ballIndex] = null;
                }
            });
        });
    }

    function triggerBall(player){
        const type = player.actionTarget.type;
        if (player.actionTarget.cooldown >= type.cooldownLimit) {
            if (type.name=="water"){
                triggerWater(player);
            }
            if (type.name=="air"){
                triggerAir(player);
            }
            if (type.name=="fire"){
                triggerFire(player);
            }
        }
    }

    function triggerWater(player){
        const ball = player.actionTarget;
        const ballX = ball.body.position.x;
        const ballY = ball.body.position.y;
        const ballsInRange = findBallsWithinRange(ballX, ballY, ball.type.effectRadius, [ball]);
        console.log("balls in range of water:",ballsInRange);
        ballsInRange.forEach((ball2) => {
            if (ball2!=ball) {
                const ball2X = ball2.body.position.x;
                const ball2Y = ball2.body.position.y;
                const distance = getDistance(ballX, ballY, ball2X, ball2Y) - ball2.type.radius;
                const velocity = (ball.type.effectRadius - distance)/20;
                const angle = getAngle(ballX, ballY, ball2X, ball2Y);
                launchBall2(ball2.body, velocity, angle);
            }
        });
        ball.cooldown=0;
    }

    function triggerAir(player){
        player.actionTarget.cooldown=0;
        launchBall(player);
    }
    function triggerFire(player){
        console.log("fire:"+player.joystickTimer);
        if (true) {//(player.joystickTimer>2){
            const ball = player.actionTarget;
            const ballX = ball.body.position.x;
            const ballY = ball.body.position.y;
            const ballsInRange = findBallsWithinRange(ballX, ballY, 50, [ball]);
            console.log("balls in range of fire:",ballsInRange);
            ballsInRange.forEach((ball2) => {
                console.log("remove?",ball2);
                if (ball2!=ball) {
                    console.log("remove",ball2);
                    removeBall(ball2);
                }
            });
            ball.cooldown=0;
        }
    }

    function findBallsWithinRange(x, y, r, ballsToIgnore){
        const output = [];
        players.forEach( (player) => {
            player.balls.forEach( (ball) => {
                if (ball) {
                    const distance = getDistance(x, y, ball.body.position.x, ball.body.position.y) - ball.type.radius;
                    const ignored = !ballsToIgnore || ballsToIgnore.includes(ball);
                    if (distance <= r && !ignored) {
                        output.push(ball);
                    }
                }
            });
        });
        return output;
    }

// ================ UTILITY FUNCTIONS ====================

    function getDistance(x1, y1, x2, y2){
        let dx = x2-x1;
        let dy = y2-y1;
        return Math.sqrt(dx*dx + dy*dy );
    }

    function getAngle(x1, y1, x2, y2){
        return angleRadians = Math.atan2(y2 - y1, x2 - x1);
    }

    function describeArc(x, y, r, startAngle, endAngle){
            var start = polarToCartesian(x, y, r, degreesToRadians(endAngle));
            var end = polarToCartesian(x, y, r, degreesToRadians(startAngle));
            var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
            var d = [
                "M", start.x, start.y, 
                "A", r, r, 0, largeArcFlag, 0, end.x, end.y
            ].join(" ");
            return d;
    }

    function polarToCartesian(centerX, centerY, radius, angleInRadians) {
        return {
          x: centerX + (radius * Math.cos(angleInRadians)),
          y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    function degreesToRadians(degrees){
        return (degrees-90) * Math.PI / 180.0;
    }

// ================ CALL INIT ====================
    $( document ).ready(function() {
        init();
    });

})();