(() => {
	let canvas, engine, render, runner;
    let COLOR, BOARD, MODES, MODIFIER_TYPES;
    let players, player, ball, touchX, touchY, isTouchActive, turnCount, buttonSelected;
    let effectsCanvas, effectsContext, w, h, touchCounter=0;
// ================ DRAW EFFECTS ====================

    function initEffects(){
        w = $("#effects").width();
        h = $("#effects").height();
        effectsCanvas = document.getElementById("effects");
        effectsCanvas.width = w;
        effectsCanvas.height = h;
        effectsContext = effectsCanvas.getContext("2d");
    }

    let trailParticles = [];
    let distance = 0;
    let angle = 0;

    const IMAGES = {
        BALL0: document.getElementById("ball0"),
        BALL1: document.getElementById("ball1"),
        BLURRED_DOTS: [
            document.getElementById("blurred-dots0"),
            document.getElementById("blurred-dots1"),
            document.getElementById("blurred-dots2"),
            document.getElementById("blurred-dots3"),
            document.getElementById("blurred-dots4"),
            document.getElementById("blurred-dots5"),
            document.getElementById("blurred-dots6"),
            document.getElementById("blurred-dots7"),
            document.getElementById("blurred-dots8"),
            document.getElementById("blurred-dots9"),
            document.getElementById("blurred-dots10"),
            document.getElementById("blurred-dots11"),
            document.getElementById("blurred-dots12"),
            document.getElementById("blurred-dots13"),
            document.getElementById("blurred-dots14"),
            document.getElementById("blurred-dots15"),
            document.getElementById("blurred-dots16"),
            document.getElementById("blurred-dots17"),
            document.getElementById("blurred-dots18"),
            document.getElementById("blurred-dots19"),
        ],
        FIRE_DOTS: [
            document.getElementById("fire-dots0"),
            document.getElementById("fire-dots1"),
            document.getElementById("fire-dots2"),
            document.getElementById("fire-dots3"),
            document.getElementById("fire-dots4"),
            document.getElementById("fire-dots5"),
            document.getElementById("fire-dots6"),
            document.getElementById("fire-dots7"),
            document.getElementById("fire-dots8"),
            document.getElementById("fire-dots9"),
        ],
    }

    function redrawEffects() {
        effectsContext.clearRect(0, 0, canvas.width, canvas.height);
        
        //selected ball
        if (ball && buttonSelected){
            const ballX = ball.body.position.x;
            const ballY = ball.body.position.y;
            angle  = getTouchAngle();
            distance = Math.min(getTouchDistance(), BOARD.MAX_PULLBACK_DISTANCE);

            const effect = buttonSelected.mode.effect;
            if (effect){

                if (isTouchActive && effect.type==EFFECT_TYPES.AIM){

                    if (touchCounter%6==0){
                        const dx = (Math.random()-.5);
                        const dy = (Math.random()-.5);
                        const newParticle = {
                            x: ballX + dx*30,
                            y: ballY + dy*30,
                            r: (3-(Math.abs(dx)+Math.abs(dy)))*25,
                            v: Math.floor(Math.random()*20),
                            s: Math.random()/2+.5
                        }
                        trailParticles.push(newParticle);

                    }
                    touchCounter++;
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

        trailParticles.forEach( p => {
            const newPosition = polarToCartesian(p.x, p.y, distance*p.s/70, angle);
            p.x = newPosition.x;
            p.y = newPosition.y;
            p.r = Math.max( .1, p.r - .7);

            let isAttack = false;
            ball.modifiers.forEach( m => {
                if (m.type.name == "ATTACK") isAttack = true;
            })
            if (isAttack){
                if (p.v>9) p.v -= 10;
                effectsContext.drawImage(IMAGES.FIRE_DOTS[p.v],p.x-p.r/2,p.y-p.r/2,p.r,p.r);
            }
            else {
                effectsContext.drawImage(IMAGES.BLURRED_DOTS[p.v],p.x-p.r/2,p.y-p.r/2,p.r,p.r);
            }
            if (p.r<1) {
                trailParticles.forEach( (p2, p2Index) => {
                    if (p == p2) trailParticles.splice(p2Index, 1);
                })
            }
        })
        
        //all balls with modifiers 
        players.forEach( (p) => {
            p.balls.forEach( (b) => {
                b.modifiers.forEach( (m) => {
                    if (m.type.drawEffect) m.type.drawEffect(m, effectsContext);
                })

                bX = b.body.position.x;
                bY = b.body.position.y;
                effectsContext.drawImage(IMAGES["BALL"+p.index],bX-16,bY-16,35,35);
            });
        });
        
    }
    
// ================ INITIALIZE GAME ====================
	function init() {
        initValues();
        initEngine();
        initLevel();
        initTouchHandlers();
        startTurn();
        initEffects();
        setInterval(tick, 10);
	}
    function tick() {
        triggerModifiersForTick();
        redrawEffects();
    }

    function initValues() {
        COLOR = {
            WALL: "#FFFFFF66",
            BALL0: "#FFFFFF",
            BALL1: "#000000",
        };

        BOARD = {
            HEIGHT: $(window).innerHeight(),
            WIDTH: $(window).innerWidth(),
            HORIZONTAL_MARGIN: 3,
            CONTROL_WIDTH: 126,
            CONTROL_HEIGHT: 660,
            VERTICAL_MARGIN: 3,
            BALL_RADIUS: 15,
            GOAL_RADIUS: 138,
            EXISTING_BALL_PREFERRED_MARGIN: 10,
            MAX_PULLBACK_DISTANCE: 200,
            MAX_LAUNCH_VELOCITY: 15,
            WALL_PADDING: 30,
            MAX_MANA: 5,
            MANA_PER_ROUND: 4,
            SCORE_TO_WIN: 11,
            COLLISION_DELAY: 20,
        };
        
        EFFECT_TYPES = {
            AIM: 0,
            RADIUS: 1 
        }
        
        MODIFIER_TYPES = {
            STATIC: {
                name:"STATIC",
                onAdd: (me) => {
                    setBallVelocity(me.target.body, 0, 0);                        
                    me.target.body.isStatic = true;
                },
                onRemove: (me) => {
                    setBallVelocity(me.target.body, 0, 0); 
                    me.target.body.isStatic = false;
                },
                onTurnEnd: (me) => {
                    me.turnCounter++;
                    if (me.turnCounter>1) {
                        removeModifier(me.target, me)
                    }
                },
                drawEffect: (me, effectsContext) => {
                    const b = me.target;
                    const bX = b.body.position.x;
                    const bY = b.body.position.y;

                    effectsContext.lineWidth = 5;
                    effectsContext.strokeStyle = "#CCCC00CC";
                    effectsContext.setLineDash([1,0]);
                    effectsContext.beginPath();
                    effectsContext.arc(bX, bY, BOARD.BALL_RADIUS+10, 0, 2 * Math.PI, false);
                    effectsContext.stroke();
                }

            },
            REPEL: {
                name:"REPEL",
                onTurnEnd: (me) => {
                    me.turnCounter++;
                    if (me.turnCounter>3) {
                        removeModifier(me.target, me)
                    }
                },
                drawEffect: (me, effectsContext) => {
                    const b = me.target;
                    const bX = b.body.position.x;
                    const bY = b.body.position.y;

                    effectsContext.lineWidth = 5;
                    effectsContext.strokeStyle = "#0099FFCC";
                    effectsContext.setLineDash([5,10]);
                    effectsContext.beginPath();
                    effectsContext.arc(bX, bY, 120, 0, 2 * Math.PI, false);
                    effectsContext.stroke();
                },
                onTick: (me) => {
                    b = me.target;
                    const ballX = b.body.position.x;
                    const ballY = b.body.position.y;
                    const targets = findBallsWithinRange(ballX, ballY, 120, [b], null);
                    targets.forEach((ball2) => {
                        const ball2X = ball2.body.position.x;
                        const ball2Y = ball2.body.position.y;
                        const distance = getDistance(ballX, ballY, ball2X, ball2Y);
                        const velocity = (120 - distance)*(120-distance)/1800000;
                        const angle = getAngle(ballX, ballY, ball2X, ball2Y);
                        const force = polarToCartesian(0, 0, velocity, angle);
                        Matter.Body.applyForce( ball2.body, {x: ball2X, y: ball2Y}, force );
                    });
                }

            },
            ATTACK: {
                name:"ATTACK",
                onAdd: (me) => {

                },
                onRemove: (me) => {

                },
                onTick: (me) => {
                    // me.tickCounter++;
                    // if (me.tickCounter%20==0){
                    //     console.log("attack Tick:"+me.tickCounter);
                    // }
                },
                onTurnEnd: (me) => {
                    removeModifier(me.target, me)
                },
                onCollision: (me, other) => {
                    //console.log("Attack - collided");
                    //console.log("me",me);
                    //console.log("other",other);
                    if (other) removeBall(other);
                    else (console.log("wall"));
                },
                onStop : (me) => {
                    console.log("attack stop");
                },
                drawEffect: (me, effectsContext) => {
                    const b = me.target;
                    const bX = b.body.position.x;
                    const bY = b.body.position.y;

                    effectsContext.lineWidth = 5;
                    effectsContext.strokeStyle = "#FF0000CC";
                    effectsContext.setLineDash([5,10]);
                    effectsContext.beginPath();
                    effectsContext.arc(bX, bY, BOARD.BALL_RADIUS+10, 0, 2 * Math.PI, false);
                    effectsContext.stroke();
                }
            },
        }


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
                    if (!buttonSelected || buttonSelected.mode.cost > player.mana) return;
                    setBall();                        
                    isTouchActive = true;
                },
                onTouchEnd: () => {
                    if (buttonSelected && isTouchActive && ball){
                        player.mana -= buttonSelected.mode.cost;
                        const pullbackPercent = Math.min(1, getTouchDistance()/BOARD.MAX_PULLBACK_DISTANCE);
                        const velocity = BOARD.MAX_LAUNCH_VELOCITY * pullbackPercent * pullbackPercent;
                        const pullbackAngle = getTouchAngle();
                        setBallVelocity(ball.body, -velocity, pullbackAngle);                        
                        isTouchActive = false;
                        deactivateButton();
                        updateButtons();

                        const checkForStopInterval = setInterval(function() {
                            if ( Math.abs(ball.body.velocity.x)+Math.abs(ball.body.velocity.y)<.1 ) {
                                ball.modifiers.forEach( m => {
                                    if (m.type.onStop) m.type.onStop(m);
                                });
                                clearInterval(checkForStopInterval);
                            };
                        }, 100);

                        for (let i=0; i<10; i++){
                            const ballX = ball.body.position.x;
                            const ballY = ball.body.position.y;
                            const dx = (Math.random()-.5);
                            const dy = (Math.random()-.5);
                            const newParticle = {
                                x: ballX + dx*80* Math.sqrt(pullbackPercent),
                                y: ballY + dy*80* Math.sqrt(pullbackPercent),
                                r: (3-(Math.abs(dx)+Math.abs(dy)))*30*Math.sqrt(pullbackPercent),
                                v: Math.floor(Math.random()*20),
                                s: 0
                            }
                            trailParticles.push(newParticle);
                        }
                        

                        //do trail
                        let trailCounter=0;
                        const trailInterval = setInterval(function() {
                            let ballVelocity = Math.abs(ball.body.velocity.x)+Math.abs(ball.body.velocity.y);
                            ballVelocity = Math.min(20, ballVelocity);
                            if (trailCounter % Math.ceil(20-ballVelocity)==0){
                                const ballX = ball.body.position.x;
                                const ballY = ball.body.position.y;
                                const dx = (Math.random()-.5);
                                const dy = (Math.random()-.5);
                                const newParticle = {
                                    x: ballX + dx*30,
                                    y: ballY + dy*30,
                                    r: (3-(Math.abs(dx)+Math.abs(dy)))*15,
                                    v: Math.floor(Math.random()*20),
                                    s: 0
                                }
                                trailParticles.push(newParticle);
                            }
                            if ( ballVelocity <.5 ) {
                                clearInterval(trailInterval);
                            };
                        }, 40);
                        
                    }
                },
            },
            ADD: {
                name: "ADD",
                cost: 1,
                onModeEnd: () => {
                    if (!buttonSelected || buttonSelected.mode.cost > player.mana) return;
                    player.mana -= buttonSelected.mode.cost;
                    addBall(player);
                    deactivateButton();
                    if (!player.buttons.LAUNCH.isUsed) buttonSelected = player.buttons.LAUNCH;
                    updateButtons();
                },
            },
            STONE: {
                name: "STONE",
                cost: 1,
                onTouchStart: () => { 
                    if (!buttonSelected || buttonSelected.mode.cost > player.mana) return;
                    setBall();      
                    const m = {
                        type: MODIFIER_TYPES.STATIC,
                        target: ball,
                        turnCounter: 0,
                    }
                    m.type.onAdd(m);
                    ball.modifiers.push(m);
                    deactivateButton();
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
                    if (!buttonSelected || buttonSelected.mode.cost > player.mana) return;
                    setBall();
                    isTouchActive = true;
                    deactivateButton();
                },
                onTouchEnd: () => {
                    isTouchActive = false;
                    if (buttonSelected  && ball){
                        player.mana -= buttonSelected.mode.cost;
                        const ballX = ball.body.position.x;
                        const ballY = ball.body.position.y;
                        const targets = findBallsWithinRange(ballX, ballY, 120, [ball], null);
                        targets.forEach((ball2) => {
                            const ball2X = ball2.body.position.x;
                            const ball2Y = ball2.body.position.y;
                            const distance = getDistance(ballX, ballY, ball2X, ball2Y);
                            const velocity = (120 - distance)/20;
                            const angle = getAngle(ballX, ballY, ball2X, ball2Y);
                            setBallVelocity(ball2.body, velocity, angle);
                        });
                        deactivateButton();
                        updateButtons();
                    }
                },
            },
            FIRE: {
                name: "FIRE",
                cost: 1,
                onTouchStart: () => { 
                    if (!buttonSelected || buttonSelected.mode.cost > player.mana) return;
                    setBall();      
                    const m = {
                        type: MODIFIER_TYPES.ATTACK,
                        target: ball,
                        tickCounter: 0,
                    }
                    m.type.onAdd(m);
                    ball.modifiers.push(m);
                    deactivateButton();
                    if (!player.buttons.LAUNCH.isUsed) buttonSelected = player.buttons.LAUNCH;
                },
            },
            TIDE: {
                name: "TIDE",
                cost: 2,
                onTouchStart: () => { 
                    if (!buttonSelected || buttonSelected.mode.cost > player.mana) return;
                    setBall();      
                    const m = {
                        type: MODIFIER_TYPES.REPEL,
                        target: ball,
                        turnCounter: 0,
                    }
                    if (m.type.onAdd) m.type.onAdd(m);
                    ball.modifiers.push(m);
                    deactivateButton();
                },
            },
        }
    
        players = [
            {
                index: 0,
                name: "White",
                ballColor: COLOR.BALL0,
                launchX: 168,
                launchY: 166,
                balls: [],
                goals: [],
                score: 0,
                mana: 0,

                buttons: {
                    ADD: {
                        mode: MODES.ADD,
                        element: $("#mode0-p0"),
                        isUsed: false,
                    },
                    LAUNCH: {
                        mode: MODES.LAUNCH,
                        element: $("#mode1-p0"),
                        isUsed: false,
                    },
                    SPELL0: {
                        mode: MODES.TIDE,
                        element: $("#mode2-p0"),
                        isUsed: false,
                    },
                    SPELL1: {
                        mode: MODES.STONE,
                        element: $("#mode3-p0"),
                        isUsed: false,
                    },
                    SPELL2: {
                        mode: MODES.FIRE,
                        element: $("#mode4-p0"),
                        isUsed: false,
                    },
                }
            },
            {
                index: 1,
                name: "Black",
                ballColor: COLOR.BALL1,
                launchX: BOARD.WIDTH-165,
                launchY: BOARD.HEIGHT-183,
                balls: [],
                goals: [],
                score: 0,
                mana: 0,

                buttons: {
                    ADD: {
                        mode: MODES.ADD,
                        element: $("#mode0-p1"),
                        isUsed: false,
                    },
                    LAUNCH: {
                        mode: MODES.LAUNCH,
                        element: $("#mode1-p1"),
                        isUsed: false,
                    },
                    SPELL0: {
                        mode: MODES.TIDE,
                        element: $("#mode2-p1"),
                        isUsed: false,
                    },
                    SPELL1: {
                        mode: MODES.STONE,
                        element: $("#mode3-p1"),
                        isUsed: false,
                    },
                    SPELL2: {
                        mode: MODES.FIRE,
                        element: $("#mode4-p1"),
                        isUsed: false,
                    },
                }
            }
        ];
        player= players[1];

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

        Matter.Events.on(engine, "collisionStart", function(e) {
            e.pairs.forEach( pair => {
                if (pair.bodyA.ball) pair.bodyA.ball.modifiers.forEach( m => {
                    if (m.type.onCollision) {
                        setTimeout( function() {
                            m.type.onCollision(pair.bodyA.ball, pair.bodyB.ball);
                        }, BOARD.COLLISION_DELAY );
                    }   
                });
                if (pair.bodyB.ball) pair.bodyB.ball.modifiers.forEach( m => {
                    if (m.type.onCollision) {
                        setTimeout( function() {
                            m.type.onCollision(pair.bodyB.ball, pair.bodyA.ball);
                        }, BOARD.COLLISION_DELAY );
                    }   
                });
            })
        })

    }

    function initLevel(){
		Matter.World.add(engine.world, [
			addWall(-BOARD.WALL_PADDING, 0, BOARD.HORIZONTAL_MARGIN+BOARD.WALL_PADDING, BOARD.HEIGHT, COLOR.WALL), //left
			addWall(BOARD.WIDTH-BOARD.HORIZONTAL_MARGIN, 0, BOARD.HORIZONTAL_MARGIN+BOARD.WALL_PADDING, BOARD.HEIGHT, COLOR.WALL), //right
			addWall(0, -BOARD.WALL_PADDING, BOARD.WIDTH, BOARD.VERTICAL_MARGIN+BOARD.WALL_PADDING, COLOR.WALL), //top
			addWall(0, BOARD.HEIGHT-BOARD.VERTICAL_MARGIN, BOARD.WIDTH, BOARD.VERTICAL_MARGIN+BOARD.WALL_PADDING, COLOR.WALL), //bottom
		    addWall(BOARD.WIDTH-BOARD.CONTROL_WIDTH, 0, BOARD.CONTROL_WIDTH, BOARD.CONTROL_HEIGHT), //p0 controls
			addWall(0, BOARD.HEIGHT-BOARD.CONTROL_HEIGHT, BOARD.CONTROL_WIDTH, BOARD.CONTROL_HEIGHT), //p1 controls
            addRoundWall(BOARD.WIDTH, BOARD.CONTROL_HEIGHT, BOARD.CONTROL_WIDTH),
            addRoundWall(0, BOARD.HEIGHT-BOARD.CONTROL_HEIGHT, BOARD.CONTROL_WIDTH),
            addWall(-90, 385, 600, 25, null, 68), //obstacle 1
            addWall(BOARD.WIDTH-520, BOARD.HEIGHT-410, 600, 25, null, 68), //obstacle 1

        ]);

        players[0].goals.push({
            x: BOARD.WIDTH *.333,
            y: BOARD.HEIGHT/2,
            r: BOARD.GOAL_RADIUS
        })
        players[1].goals.push({
            x: BOARD.WIDTH *.67,
            y: BOARD.HEIGHT/2,
            r: BOARD.GOAL_RADIUS
        })
    }

// ================ UI HANDLERS ====================

    function initTouchHandlers() {

        $('.done-button').bind('touchstart', function(e){
            nextTurn();
        })

        $('.mode-button').bind('touchstart', function(e){
            const myIndex = $(e.target).data("index");
            const myName = $(e.target).data("name");
            const myPlayer = $(e.target).data("player");
            buttonSelected = player.buttons[myName];
            if (buttonSelected.mode.onModeStart) buttonSelected.mode.onModeStart();
            updateButtons();
        })

        $('.mode-button').bind('touchend', function(e){
            if (buttonSelected && buttonSelected.mode.onModeEnd) {
                buttonSelected.mode.onModeEnd();
            }
            updateButtons();
        })

        $('#container').bind('touchstart', function(e){
            e.preventDefault();
            const touch = e.targetTouches[0];
            touchX = touch.pageX;
            touchY = touch.pageY;
            if (buttonSelected && buttonSelected.mode.onTouchStart) {
                buttonSelected.mode.onTouchStart();
            }
            updateButtons();
        })

        $('#container').bind('touchmove', function(e){
            e.preventDefault();
            const touch = e.targetTouches[0];
            touchX = touch.pageX;
            touchY = touch.pageY;
            if (buttonSelected && buttonSelected.mode.onTouchMove) {
                buttonSelected.mode.onTouchMove();
            }
            updateButtons();
        })

        $('#container').bind('touchend touchcancel', function(e){
            e.preventDefault();
            if (buttonSelected && buttonSelected.mode.onTouchEnd) {
                buttonSelected.mode.onTouchEnd();
            }
            updateButtons();
        })
    }

    function updateButtons() {
        $(".active-mode").removeClass("active-mode");
        if (buttonSelected && !buttonSelected.isUsed){
            buttonSelected.element.addClass("active-mode");
        }

        for (b in player.buttons){
            const button = player.buttons[b];
            const disableMe = button.isUsed || button.mode.cost>player.mana;
            button.element.toggleClass("disabled", disableMe);
        };

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
            buttonSelected = player.buttons.ADD;
            MODES.ADD.onModeEnd();
        }
        buttonSelected = player.buttons.LAUNCH;
        activateButtons();
        updateButtons();
    }
    function endTurn() {
        scoreBalls();
        triggerModifiersForTurnEnd()
        turnCount++;
    }
    function deactivateButton() {
        buttonSelected.isUsed = true;
        buttonSelected = null;
    }
    function activateButtons() {
        for (b in player.buttons){
            player.buttons[b].isUsed = false;
        }
    }

    function triggerModifiersForTurnEnd(){
        players.forEach( (p) => {
            p.balls.forEach( (b) => {
                b.modifiers.forEach ( (m) => {
                    if (m.type.onTurnEnd) m.type.onTurnEnd(m);
                })
            })
        })
    }

    function triggerModifiersForTick(){
        players.forEach( (p) => {
            p.balls.forEach( (b) => {
                b.modifiers.forEach ( (m) => {
                    if (m.type.onTick) m.type.onTick(m);
                })
            })
        })
    }

    function scoreBalls(){
        player.balls.forEach( (b) => {
            player.goals.forEach( (g) => {
                const ballX = b.body.position.x;
                const ballY = b.body.position.y;
                if ( getDistance(ballX, ballY, g.x, g.y) < g.r ){
                    player.score += 1;
                }
            });
        });
        if (player.score>=BOARD.SCORE_TO_WIN){
            $(".message").html(player.name+" Won!").addClass("shown");
        }
    }


// ================ MANAGING PHYSICS ====================

	function addWall(x, y, width, height, color, rotation) {
        if (!color) color = "#00000000";
		const newWall = Matter.Bodies.rectangle(x+width/2, y+height/2, width, height,  {
			isStatic: true,
			render: { visible: false },
			render: { fillStyle: color }
		});
        if (rotation) Matter.Body.rotate(newWall, degreesToRadians(rotation));
        return newWall
	}

	function addRoundWall(x, y, r, color) {
        if (!color) color = "#00000000";
		return Matter.Bodies.circle(x, y, r, {
			isStatic: true,
			render: { fillStyle: color }
		});
	}

    function addBall(player){
        let body = Matter.Bodies.circle(player.launchX, player.launchY, BOARD.BALL_RADIUS, {
			isStatic: false,
			restitution: 1,
            friction: 0,
            render: {
                fillStyle: "#00000000"
            },
		});
		Matter.World.add(engine.world, body);
        let ball = {body: body, modifiers: []};
        player.balls.push(ball);
        body.ball = ball;
        return ball;
    }

    function removeBall(ball){
        Matter.World.remove(engine.world, ball.body);
        players.forEach( (player) => {
            player.balls.forEach( (ball2, ballIndex) => {
                if (ball2==ball) {
                    player.balls.splice(ballIndex, 1);
                }
            });
        });
    }

    function removeModifier(b, modifier){
        b.modifiers.forEach( (m, mIndex) => {
            if (m==modifier){
                if (m.type.onRemove) m.type.onRemove(modifier);
                b.modifiers.splice(mIndex, 1);
            }
        })
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