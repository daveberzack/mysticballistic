(() => {
	let canvas, engine, render, runner;
    let COLOR, BOARD, MODES, EFFECTS, TARGETS;
    let players, goals, buttons;
    let player, ball, touchX, touchY, isTouchActive, turnCount, buttonSelected;
    let effectsCanvas, effectsContext, w, h;
// ================ DRAW EFFECTS ====================

    function initEffects(){
        effectsCanvas = document.getElementById("effects");
        w = $("#effects").width();
        h = $("#effects").height();
        effectsCanvas.width = w;
        effectsCanvas.height = h;
        effectsContext = effectsCanvas.getContext("2d");
    }

    function redrawEffects() {
        effectsContext.clearRect(0, 0, canvas.width, canvas.height);
        
        if (ball){
            const ballX = ball.body.position.x;
            const ballY = ball.body.position.y;
            const angle  = getTouchAngle();
            const distance = Math.min(getTouchDistance(), BOARD.MAX_PULLBACK_DISTANCE);

            const effect = buttonSelected.mode.effect;
            if (effect){
                if (isTouchActive && effect.type==EFFECT_TYPES.AIM){
                    const lineEnd = polarToCartesian(ballX, ballY, distance, angle);
                    const color = effect.color || player.ballColor;
                    effectsContext.lineWidth = effect.lineWidth;
                    effectsContext.strokeStyle = color;
                    effectsContext.setLineDash(effect.lineDash);
                    effectsContext.beginPath();
                    effectsContext.moveTo(ballX, ballY);
                    effectsContext.lineTo(lineEnd.x, lineEnd.y);
                    effectsContext.stroke();
                }
                else if (isTouchActive && effect.type==EFFECT_TYPES.AREA){
                    const color = effect.color || player.ballColor;
                    effectsContext.lineWidth = effect.lineWidth;
                    effectsContext.strokeStyle = color;
                    effectsContext.setLineDash(effect.lineDash);
                    effectsContext.beginPath();
                    effectsContext.arc(ballX, ballY, effect.radius, 0, 2 * Math.PI, false);
                    effectsContext.stroke();
                }
            }
        }
    }

// ================ INITIALIZE GAME ====================
	function init() {
        initValues();
        initEngine();
        initLevel();
        initTouchHandlers();
        startTurn();
        initEffects();
        setInterval(run, 20);
	}
    function run() {
        redrawEffects();
    }

    function initValues() {
        COLOR = {
            WALL: "#666666",
            BALL0: "#FFFFFF",
            BALL1: "#000000",
            WALL0: "#FFFFFF",
            WALL1: "#000000",
        };
        EFFECTS = {
            AIM: 0,
            AREA: 1
        };

        BOARD = {
            HEIGHT: $(window).innerHeight(),
            WIDTH: $(window).innerWidth(),
            HORIZONTAL_MARGIN: 3,
            CONTROL_WIDTH: 80,
            CONTROL_HEIGHT: 550,
            VERTICAL_MARGIN: 3,
            SCORE_BAR_HEIGHT: 115,
            BALL_RADIUS: 15,
            GOAL_RADIUS: 125,
            EXISTING_BALL_PREFERRED_MARGIN: 10,
            MAX_PULLBACK_DISTANCE: 200,
            MAX_LAUNCH_VELOCITY: 30,
            WALL_PADDING: 30,
            MAX_MANA: 5,
            MANA_PER_ROUND: 3,
        };
        
        EFFECT_TYPES = {
            AIM: 0,
            RADIUS: 1 
        }
        
        TARGETS = {
            BALL: 0,
            GLOBAL: 1,
            POINT: 2,
        }
    
        players = [
            {
                index: 0,
                ballColor: COLOR.BALL0,
                launchX: 100,
                launchY: 200,
                balls: [],
                goals: [],
                score: 0,
                mana: 0,
            },
            {
                index: 1,
                ballColor: COLOR.BALL1,
                launchX: BOARD.WIDTH-100,
                launchY: BOARD.HEIGHT-200,
                balls: [],
                goals: [],
                score: 0,
                mana: 0,
            }
        ];
        player= players[1];

        MODES = {
            LAUNCH: {
                name: "LAUNCH",
                cost: 1,
                effect: {
                    type: EFFECT_TYPES.AIM,
                    lineWidth: 7,
                    lineDash: [15, 5],
                },
                onTouchStart: () => { 
                    if (buttonSelected.mode.cost > player.mana) return;
                    setBall();                        
                    isTouchActive = true;
                },
                onTouchEnd: () => {
                    if (isTouchActive && ball){
                        player.mana -= buttonSelected.mode.cost;
                        const pullbackPercent = Math.min(1, getTouchDistance()/BOARD.MAX_PULLBACK_DISTANCE);
                        const velocity = BOARD.MAX_LAUNCH_VELOCITY * pullbackPercent * pullbackPercent;
                        const pullbackAngle = getTouchAngle();
                        setBallVelocity(ball.body, -velocity, pullbackAngle);                        
                        isTouchActive = false;
                    }
                    
                },
            },
            ADD: {
                name: "ADD",
                cost: 1,
                onModeEnd: () => {
                    if (buttonSelected.mode.cost > player.mana) return;
                    player.mana -= buttonSelected.mode.cost;
                    addBall(player);
                    buttonSelected = buttons.LAUNCH;
                    updateButtons();
                },
            },
            SPLASH: {
                name: "SPLASH",
                cost: 1,
                effect: {
                    type: EFFECT_TYPES.AREA,
                    lineWidth: 5,
                    lineDash: [5, 15],
                    radius: 100,
                    color: "#0033CC",
                },
                onTouchStart: () => {
                    if (buttonSelected.mode.cost > player.mana) return;
                    setBall();
                    isTouchActive = true;
                    
                },
                onTouchEnd: () => {
                    isTouchActive = false;
                    if (ball){
                        player.mana -= buttonSelected.mode.cost;
                        const ballX = ball.body.position.x;
                        const ballY = ball.body.position.y;
                        const targets = findBallsWithinRange(ballX, ballY, 120, [ball], null)
                        targets.forEach((ball2) => {
                            const ball2X = ball2.body.position.x;
                            const ball2Y = ball2.body.position.y;
                            const distance = getDistance(ballX, ballY, ball2X, ball2Y);
                            const velocity = (120 - distance)/20;
                            const angle = getAngle(ballX, ballY, ball2X, ball2Y);
                            setBallVelocity(ball2.body, velocity, angle);
                        });
                        updateButtons();
                    }
                },
            }
        }
        
        buttons = {
            ADD: {
                mode: MODES.ADD,
                element: $(".mode-button0"),
            },
            LAUNCH: {
                mode: MODES.LAUNCH,
                element: $(".mode-button1"),
            },
            SPELL0: {
                mode: MODES.SPLASH,
                element: $(".mode-button2"),
            },
            SPELL1: {
                mode: MODES.LAUNCH,
                element: $(".mode-button3"),
            },
            SPELL3: {
                mode: MODES.LAUNCH,
                element: $(".mode-button4"),
            },
        }

        turnCount=0;
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

    function initLevel(){
		Matter.World.add(engine.world, [
			addWall(-BOARD.WALL_PADDING, 0, BOARD.HORIZONTAL_MARGIN+BOARD.WALL_PADDING, BOARD.HEIGHT, COLOR.WALL), //left
			addWall(BOARD.WIDTH-BOARD.HORIZONTAL_MARGIN, 0, BOARD.HORIZONTAL_MARGIN+BOARD.WALL_PADDING, BOARD.HEIGHT, COLOR.WALL), //right
			addWall(0, -BOARD.WALL_PADDING, BOARD.WIDTH, BOARD.VERTICAL_MARGIN+BOARD.WALL_PADDING, COLOR.WALL), //top
			addWall(0, BOARD.HEIGHT-BOARD.VERTICAL_MARGIN, BOARD.WIDTH, BOARD.VERTICAL_MARGIN+BOARD.WALL_PADDING, COLOR.WALL), //bottom
		    addWall(BOARD.WIDTH-BOARD.CONTROL_WIDTH, 0, BOARD.CONTROL_WIDTH, BOARD.CONTROL_HEIGHT, COLOR.WALL0), //p0 controls
			addWall(0, BOARD.HEIGHT-BOARD.CONTROL_HEIGHT, BOARD.CONTROL_WIDTH, BOARD.CONTROL_HEIGHT, COLOR.WALL1), //p1 controls
            addRoundWall(BOARD.WIDTH, BOARD.CONTROL_HEIGHT, BOARD.CONTROL_WIDTH, COLOR.WALL0),
            addRoundWall(0, BOARD.HEIGHT-BOARD.CONTROL_HEIGHT, BOARD.CONTROL_WIDTH, COLOR.WALL1),
            addWall(-150, 450, 500, 25, COLOR.WALL, 45), //obstacle 1
            addWall(BOARD.WIDTH-350, BOARD.HEIGHT-450, 500, 25, COLOR.WALL, 45), //obstacle 1

        ]);

        players[0].goals.push({
            x: BOARD.WIDTH/4,
            y: BOARD.HEIGHT/2,
            r: BOARD.GOAL_RADIUS
        })
        players[1].goals.push({
            x: BOARD.WIDTH*3/4,
            y: BOARD.HEIGHT/2,
            r: BOARD.GOAL_RADIUS
        })
        $("#goal0").css({
            "top":BOARD.HEIGHT/2 - BOARD.GOAL_RADIUS,
            "left":BOARD.WIDTH/4 - BOARD.GOAL_RADIUS,
            "width":BOARD.GOAL_RADIUS*2,
            "height":BOARD.GOAL_RADIUS*2,
        })
        $("#goal1").css({
            "top":BOARD.HEIGHT/2 - BOARD.GOAL_RADIUS,
            "right":BOARD.WIDTH/4 - BOARD.GOAL_RADIUS,
            "width":BOARD.GOAL_RADIUS*2,
            "height":BOARD.GOAL_RADIUS*2,
        })
    }

// ================ UI HANDLERS ====================

    function initTouchHandlers() {

        $('.done-button').bind('touchstart', function(e){
            nextTurn();
        })

        $('.mode-button').bind('touchstart', function(e){
            for (const button in buttons) {
                console.log(`${button}:`, buttons[button]);
                if (button.element == $(e.target)) {
                    buttonSelected = button;
                }
            }

            if (buttonSelected.mode.onModeStart) buttonSelected.mode.onModeStart();
            updateButtons();
        })

        $('.mode-button').bind('touchend', function(e){
            if (buttonSelected.mode.onModeEnd) buttonSelected.mode.onModeEnd();
            updateButtons();
        })

        $('#container').bind('touchstart', function(e){
            e.preventDefault();
            const touch = e.targetTouches[0];
            touchX = touch.pageX;
            touchY = touch.pageY;
            if (buttonSelected.mode.onTouchStart) buttonSelected.mode.onTouchStart();
            updateButtons();
        })

        $('#container').bind('touchmove', function(e){
            e.preventDefault();
            const touch = e.targetTouches[0];
            touchX = touch.pageX;
            touchY = touch.pageY;
            if (buttonSelected.mode.onTouchMove) buttonSelected.mode.onTouchMove();
            updateButtons();
        })

        $('#container').bind('touchend touchcancel', function(e){
            e.preventDefault();
            if (buttonSelected.mode.onTouchEnd) buttonSelected.mode.onTouchEnd();
            updateButtons();
        })
    }

    function updateButtons() {
        $(".active-mode").removeClass("active-mode");
        buttonSelected.element.addClass("active-mode");

        $("#mana0").html(players[0].mana);
        $("#mana1").html(players[1].mana);
        $("#score0").html(players[0].score);
        $("#score1").html(players[1].score);
    }
// ================ GAMEPLAY ====================

    function nextTurn() {
        endTurn();
        const newPlayerIndex = (player.index+1) % 2;
        player = players[newPlayerIndex];
        startTurn();
    }
    function startTurn() {
        $(".active-player").removeClass("active-player");
        $("#player"+player.index).addClass("active-player");
        launchesRemaining = 1;
        player.mana = Math.min(BOARD.MAX_MANA, player.mana+BOARD.MANA_PER_ROUND);
        if (turnCount<2){
            buttonSelected = buttons.ADD;
            MODES.ADD.onModeEnd();
        }
        buttonSelected = buttons.LAUNCH;
        updateButtons();
    }
    function endTurn() {
        turnCount++;
    }

// ================ MANAGING PHYSICS ====================

	function addWall(x, y, width, height, color, rotation) {
		const newWall = Matter.Bodies.rectangle(x+width/2, y+height/2, width, height,  {
			isStatic: true,
			render: { visible: false },
			render: { fillStyle: color }
		});
        if (rotation) Matter.Body.rotate(newWall, degreesToRadians(rotation));
        return newWall
	}

	function addRoundWall(x, y, r, color) {
		return Matter.Bodies.circle(x, y, r, {
			isStatic: true,
			render: { fillStyle: color }
		});
	}

    function addBall(player){
        const color = player.ballColor; 
        let body = Matter.Bodies.circle(player.launchX, player.launchY, BOARD.BALL_RADIUS, {
			isStatic: false,
			restitution: 1,
            friction: 0,
            render: {
                fillStyle: color,
            }
		});
		Matter.World.add(engine.world, body);
        let ball = {body: body};
        player.balls.push(ball);
        return ball;
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

    function setBall(){
        ball = getClosestBall({
            x: touchX,
            y: touchY,
            owner: player
        });
    }


    function setBallVelocity(body, velocity, angle){
        let vx = velocity * Math.cos(angle);
        let vy = velocity * Math.sin(angle);
        Matter.Body.setVelocity( body, {x: vx, y: vy});
    }

    function findBallsWithinRange(x, y, r, ballsToIgnore, owner){
        const output = [];
        players.forEach( (player) => {
            if (!owner || player==owner){
                player.balls.forEach( (ball) => {
                    if (ball) {
                        const distance = getDistance(x, y, ball.body.position.x, ball.body.position.y);
                        const ignored = !ballsToIgnore || ballsToIgnore.includes(ball);
                        if (distance <= r && !ignored) {
                            output.push(ball);
                        }
                    }
                });
            }
        });
        return output;
    }

    function getClosestBall(options){
        let output = null;
        let minDistance=99999;
        players.forEach( (player) => {
            if (!options.owner || options.owner==player){
                player.balls.forEach( (ball) => {
                    if (ball) {
                        const distance = getDistance(options.x, options.y, ball.body.position.x, ball.body.position.y);
                        const ignored = options.ballsToIgnore && options.ballsToIgnore.includes(ball);
                        if (distance < minDistance && !ignored) {
                            output = ball;
                            minDistance = distance;
                        }
                    }
                });
            }
            
        });
        // if (options.includeLaunchPoint){
        //     const distance = getDistance(options.x, options.y, player.launchX, player.launchY );
        //     if (distance < minDistance-BOARD.EXISTING_BALL_PREFERRED_MARGIN) {
        //         output = null;
        //     }
        // }
        return output;
    }

// ================ UTILITY FUNCTIONS ====================



    function getTouchDistance(){
        const ballPos = ball.body.position;
        return getDistance(touchX, touchY, ballPos.x, ballPos.y); 
    }

    function getDistance(x1, y1, x2, y2){
        let dx = x2-x1;
        let dy = y2-y1;
        return Math.sqrt(dx*dx + dy*dy );
    }
    function getTouchAngle(){
        const ballPos = ball.body.position;
        return getAngle(ballPos.x, ballPos.y, touchX, touchY);
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

    function log(msg){
        //$("#debug").append(msg+"<br/>");
    }

// ================ CALL INIT ====================
    $( document ).ready(function() {
        init();
    });

})();




// function checkForWin(){
//     if (players[0].score>=100) {
//         $("#message").html("Player 1 Won!")
//     }
//     if (players[1].score>=100) {
//         $("#message").html("Player 2 Won!")
//     }
// }

// function scoreGoals(){
//     goals.forEach((goal) => {
//         let player0BallsIn = players[0].balls.reduce( function(total, ball){
//             let output = total;
//             if (ball!==null) {
//                 let body = ball.body;
//                 if (getDistance(goal.x, goal.y, body.position.x, body.position.y) <= goal.r+ball.type.radius) {
//                     output++;    
//                 }
//             }
//             return output;
//         }, 0);
//         let player1BallsIn = players[1].balls.reduce( function(total, ball){
//             let output = total;
//             if (ball!==null) {
//                 let body = ball.body;
//                 if (getDistance(goal.x, goal.y, body.position.x, body.position.y) < goal.r+ball.type.radius) output++;
//             }
//             return output;
//         }, 0);
//         players[0].score = Math.min(100, players[0].score + player0BallsIn);
//         players[1].score = Math.min(100, players[1].score + player1BallsIn);
//     })
// }