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
        setInterval(run, 50);
	}

    function initValues() {
        ACTION = {
            LAUNCH: 0,
            TRIGGER: 1   
        }
        COLOR = {
            WALL: "#222222",
            WALL0: "#FFFFFF",
            WALL1: "#000000"
        }
        BALL_TYPE = [
            {
                name: "air",
                radius: 10,
                density: 0.0005,
                friction: .025,
                maxVelocity: 15, 
            },
            {
                name: "water",
                radius: 15,
                density: 0.001,
                friction: .03,
                maxVelocity: 10,
            },
            {
                name: "earth",
                radius: 24,
                density: 0.0008,
                friction: .045,
                maxVelocity: 10,
            },
            {
                name:"fire",
                radius: 15,
                density: 0.001,
                friction: .03,
                maxVelocity: 10,
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
        }
    
        runCounter=0;
        players = [
            {
                index: 0,
                ballColor: COLOR.BALL1,
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
            },
            {
                index: 1,
                ballColor: COLOR.BALL2,
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
        moveJoystick(player, x, y);
    }
    function endJoystick(player) {
        if (player.actionMode == ACTION.LAUNCH) {
            launchBall(player);
        }
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
            let player = players[ $(e.target).data('player') ];
            let ballIndex = $(e.target).data('ball');
            let whichBall = player.balls[ballIndex];
            if (whichBall===null) {
                addBall(player, ballIndex);
                player.actionMode = ACTION.LAUNCH;
                player.actionTarget = player.balls[ballIndex];
            }
            else {
                player.actionMode = ACTION.TRIGGER;
                player.actionTarget = whichBall;
            }
        })
        $('.button.launch').bind('touchstart', function(e){
            let player = players[ $(e.target).data('player') ];
            player.actionMode = ACTION.LAUNCH;
            player.actionTarget = player.balls[ $(e.target).data('ball') ];
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
        if (runCounter%20 == 0) {
            updateScores();
        }
		runCounter++;
	}

// ================ SCORING FUNCTIONS ====================

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
                    if (getDistance(goal.x, goal.y, body.position.x, body.position.y) < goal.r) output++;    
                }
                return output;
            }, 0);
            let player1BallsIn = players[1].balls.reduce( function(total, ball){
                let output = total;
                if (ball!==null) {
                    let body = ball.body;
                    if (getDistance(goal.x, goal.y, body.position.x, body.position.y) < goal.r) output++;
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

    function launchBall(player){
        console.log("Launch",player);
        let velocity = player.actionTarget.type.maxVelocity * player.joystickPercent;
        let vx = -velocity * Math.cos(player.joystickAngle);
        let vy = -velocity * Math.sin(player.joystickAngle);
        Matter.Body.setVelocity( player.actionTarget.body, {x: vx, y: vy});

    }

    function addBall(player, ballIndex){
        let type = BALL_TYPE[ballIndex];
        let body = Matter.Bodies.circle(player.launchX, player.launchY, type.radius, {
			isStatic: false,
			restitution: 1,
            frictionAir: type.friction, 
            density: type.density,
            render: {
                sprite: {
                    texture: './img/'+type.name+player.index+'.png',
                    xScale: (type.radius*2)/160,
                    yScale: (type.radius*2)/160
                }
            }
		});
		Matter.World.add(engine.world, body);
        let ball = {type: type, body: body};
        player.balls[ballIndex] = ball;
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

// ================ UTILITY FUNCTIONS ====================

    function getDistance(x1, y1, x2, y2){
        let dx = x2-x1;
        let dy = y2-y1;
        return Math.sqrt(dx*dx + dy*dy );
    }

    function getAngle(x1, y1, x2, y2){
        return angleRadians = Math.atan2(y2 - y1, x2 - x1);
    }

    function log(msg){
        $("#debug").append(msg+"<br/>")
    }
    $("#debug").click( ()=> {
        $("#debug").html("");
    })

// ================ CALL INIT ====================
    $( document ).ready(function() {
        init();
    });

})();