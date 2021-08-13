(() => {
    const ACTION = {
        LAUNCH: 0,
        TRIGGER: 1   
    }
    const COLOR = {
        WALL: "#222222",
        BALL1: "#FF0000",
        BALL2: "#0000FF",
    }
    const BALL_TYPE = [
        {
            name: "Air",
            radius: 8,
            density: 0.0005,
            friction: .025,
            maxVelocity: 1, 
        },
        {
            name: "Water",
            radius: 10,
            density: 0.001,
            friction: .03,
            maxVelocity: 1,
        },
        {
            name: "Earth",
            radius: 16,
            density: 0.0009,
            friction: .05,
            maxVelocity: 1,
        },
        {
            name:"Fire",
            radius: 10,
            density: 0.001,
            friction: .03,
            maxVelocity: 1,
        },
    ];
    const BOARD = {
        HEIGHT: 1024,
        WIDTH: 768,
        HORIZONTAL_MARGIN: 10,
        VERTICAL_MARGIN: 70,
        AIM_RADIUS: 80,
    }

    let runCounter=0;
	let canvas, engine, render, runner;
	let players = [
        {
            index: 0,
            ballColor: COLOR.BALL1,
            launchX: 410,
            launchY: 130,
            aimCenterX: 410,
            aimCenterY: 60,
            balls: [null, null, null, null],
            score: 0,
            actionMode: 0,
            actionTarget: null,
            isAiming: false,
        },
        {
            index: 1,
            ballColor: COLOR.BALL2,
            launchX: 90,
            launchY: 670,
            aimCenterX: 90,
            aimCenterY: 750,
            balls: [null, null, null, null],
            score: 0,
            actionMode: 0,
            actionTarget: null,
            isAiming: false,
        }
    ];
    let goals = [];


// ================ INITIALIZE GAME ====================
	function init() {
        initEngine();
        initLevel();
        initHandlers();
        setInterval(run, 50);
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

    function initHandlers() {
        $(".button.trigger").click((e)=>{
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
        $(".button.launch").click((e)=>{
            let player = players[ $(e.target).data('player') ];
            player.actionMode = ACTION.LAUNCH;
            player.actionTarget = player.balls[ $(e.target).data('ball') ];
        })

        $("#overlay").mousedown((e)=>{
            let myOffset = $("#overlay").offset();
            let mX = e.pageX - myOffset.left;
            let mY = e.pageY - myOffset.top;
            //console.log("mouse @ "+mX+","+mY);
            if ( getDistance(mX, mY, players[0].aimCenterX, players[0].aimCenterY) < BOARD.AIM_RADIUS) {
                players[0].isAiming = true;
            }
            if ( getDistance(mX, mY, players[1].aimCenterX, players[1].aimCenterY) < BOARD.AIM_RADIUS) {
                players[1].isAiming = true;
            }
        })
        $("#overlay").mouseup((e)=>{
            var myOffset = $("#overlay").offset();
            var mx = e.pageX - myOffset.left;
            var my = e.pageY - myOffset.top;

            if (players[0].isAiming && players[0].actionMode==ACTION.LAUNCH && players[0].actionTarget!==null) {
                launchBall(players[0], mx, my);
            }
            else if (players[1].isAiming && players[1].actionMode==ACTION.LAUNCH && players[1].actionTarget!==null) {
                launchBall(players[1], mx, my)
            }

            else if (players[0].isAiming && players[0].actionMode==ACTION.TRIGGER && players[0].actionTarget!==null) {
                
            }

            else if (players[1].isAiming && players[1].actionMode==ACTION.TRIGGER && players[1].actionTarget!==null) {
                
            }
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
        $("#score_0").html(players[0].score);
        $("#score_1").html(players[1].score);
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
            let player0Balls = players[0].balls.reduce( function(total, ball){
                let output = total;
                if (ball!==null && getDistance(goal.x, goal.y, ball.position.x, ball.position.y) < goal.r) output++;
                return output;
            }, 0);
            let player1Balls = players[1].balls.reduce( function(total, ball){
                let output = total;
                if (ball!==null && getDistance(goal.x, goal.y, ball.position.x, ball.position.y) < goal.r) output++;
                return output;
            }, 0);

            // if (player0Balls > player1Balls) players[0].score++;
            // else if (player0Balls < player1Balls) players[1].score++;
            players[0].score += player0Balls;
            players[1].score += player1Balls;
        })
    }


// ================ MANAGING PHYSICS ====================

    function initLevel(){
		Matter.World.add(engine.world, [
			addWall(0, 0, BOARD.WIDTH, BOARD.VERTICAL_MARGIN), //top
			addWall(0, BOARD.HEIGHT-BOARD.VERTICAL_MARGIN, BOARD.WIDTH, BOARD.VERTICAL_MARGIN), //bottom
			addWall(0, 0, BOARD.HORIZONTAL_MARGIN, BOARD.HEIGHT), //left
			addWall(BOARD.WIDTH-BOARD.HORIZONTAL_MARGIN, 0, BOARD.HORIZONTAL_MARGIN, BOARD.HEIGHT), //left
		]);

        goals.push({
            x: 250,
            y: 400,
            r: 125
        })
    }

    function launchBall(player, mx, my){
        vx = (player.aimCenterX - mx)/5;
        vy = (player.aimCenterY - my)/5;
        if (vx<-10) vx = -10;
        if (vx>10) vx = 10;
        if (vy<-10) vy = -10;
        if (vx>10) vy = 10;
        Matter.Body.setVelocity( player.actionTarget, {x: vx, y: vy});
        player.isAiming = false;
    }

    function addBall(player, ballIndex){
        let type = BALL_TYPE[ballIndex];
        let ball = Matter.Bodies.circle(player.launchX, player.launchY, type.radius, {
			isStatic: false,
			restitution: 1,
            frictionAir: type.friction, 
            density: type.density,
			render: { fillStyle: player.ballColor }
		});
		Matter.World.add(engine.world, ball);
        player.balls[ballIndex] = ball;
    }

	function addWall(x, y, width, height) {
		return Matter.Bodies.rectangle(x+width/2, y+height/2, width, height,  {
			isStatic: true,
			render: { visible: false },
			render: { fillStyle: COLOR.WALL }
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

// ================ CALL INIT ====================

	window.addEventListener('load', init, false);

})();