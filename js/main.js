import * as THREE from '../lib/three.js/build/three.module.js'
import {GLTFLoader} from '../lib/three.js/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from '../lib/three.js/examples/jsm/controls/OrbitControls.js';
// import { PointerLockControls } from '../lib/three.js/examples/jsm/controls/PointerLockControls.js';
import { MovementPointerLockControls, AimPointerLockControls, HeadPointerLockControls } from './controls.js';
import TWEEN from '../lib/tween.js/dist/tween.esm.js'

import {SceneUtils} from '../lib/three.js/examples/jsm/utils/SceneUtils.js'
import {SkeletonUtils} from '../lib/three.js/examples/jsm/utils/SkeletonUtils.js';
import * as UTILS from './utils.js'

// ============================================================================
// GLOBAL VARIABLES AND PARAMETERS
// ============================================================================
var renderer;
var textureLoader;
var loadingManager;

// Game state
var gamePaused = true;

var modelsLoaded = false;
var sceneBuilt = false;
var controlsSet = false;

var playerControls;
var gameControls = [];

// Objects variables
var scene;
var light;
var ambient;

var currentCamera;
var firstPersonCamera;
var thirdPersonCamera;
var arrowCamera;

// Model variables
var modelsMap;
var loadModelsList;

modelsMap = {
    link:    { 
        url: '../assets/models/link_with_bow/link_with_bow.gltf',
        position: [ 0, 0, 0 ],
        rotation: [ 0, 0, 0, ],
        scale: 10,
        buildCallback: buildLink,
        joints: {
            upper: {
                left: {
                    arm: null,
                    forearm: null,
                    hand: null,
                },
                right: {
                    arm: null,
                    forearm: null,
                    hand: null,
                },
                head: null
            },
            lower: {
                left: {
                    thigh: null,
                    shin: null,
                    foot: null,
                    toe: null,
                },
                right: {
                    thigh: null,
                    shin: null,
                    foot: null,
                    toe: null,
                },
            }   
        }
    },
    bow: {
        joints: {
            string: null,
        }
    },
    target:  { 
        url: '../assets/models/target/target.gltf',
        position: [ 0, 0, 100 ],
        rotation: [ 0, 180, 0, ],
        scale: 10,
        buildCallback: buildTarget,
    },
    arrow: {
        url: '../assets/models/arrow/arrow.gltf',
        rotation: [0, 0, 0],
        scale: 22,
        buildCallback: buildArrow,
    }
};

loadModelsList = [modelsMap.link, modelsMap.target, modelsMap.arrow];

// Camera parameters
const fov = 45;
const aspect = window.innerWidth / window.innerHeight;  // the canvas default
const near = 0.1;
const far = 100000;

const firstPersonCameraPosition = [ 2.0, 3.0, -10.0 ];
const firstPersonCameraTarget = [ 2.0, 3.0, 1.0 ];

const thirdPersonCameraPosition = [ modelsMap.link.position[0], modelsMap.link.position[1] + 3, modelsMap.link.position[2] - 5 ];
const thirdPersonCameraTarget = [ modelsMap.link.position[0], modelsMap.link.position[1] + 2 , modelsMap.link.position[2] ];

const fogNear = 50;
const fogFar = 1000;
const fogColor = 0xcce0ff;

// Light parameters
const lightDistance = 200;
const lightPosition = [ 0, 1, 2 ];
const lightTarget = [ 0, 0, 0 ];
const lightColor = 0xFFFFFFFF;
const lightIntensity = 5;

const SHADOW_MAP_WIDTH = 2048; 
const SHADOW_MAP_HEIGHT = 2048;

const shadowCameraWidth = 100;
const shadowCameraHeight = 100;
const shadowCameraDepth = 1000;

// Controls parameters
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;

var canShoot = true;
var shooting = false;

// Link movement variables and params
const floorFriction = 10.0;
const linkMoveSpeed = 100.0;
const linkJumpSpeed = 200.0;
const linkMass = 100.0;

var prevTime = performance.now();
var linkVelocity = new THREE.Vector3();
var linkDirection = new THREE.Vector3();

var linkForwardTweens = [];
var linkBackwardTweens = [];
var linkSideTweens = [];

// Arrow movement variables and params
var arrowTweens = [];
var shootInitTime;
var shootFinalTime;

const arrowForce = 10.0;
const arrowMass = 1.0; 
const maxCharge = 2;
const g = 9.81;


// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

function loadAssets() {
    textureLoader = new THREE.TextureLoader();
    loadingManager = new THREE.LoadingManager();

    loadModels();
}

function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    renderer.shadowMap.enabled = true;
    window.addEventListener( 'resize', onWindowResize, false );
}

// ============================================================================
// MODEL(s) CODE (Loading, building, displaying)
// ============================================================================

function loadModels() {   
    loadingManager.onLoad = function() {
        console.log('Loading complete!');
        // hide the loading bar
        document.querySelector('#loading').hidden = true;
        modelsLoaded = true;
        main();
    };

    const progressbarElem = document.querySelector('#progressbar');
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        progressbarElem.style.width = `${itemsLoaded / itemsTotal * 100 | 0}%`;
    };
    
    const gltfLoader = new GLTFLoader(loadingManager);
    loadModelsList.forEach( model => {
        gltfLoader.load(model.url, (gltf) => {
            gltf.scene.traverse( function ( child ) {
                if ( child.isMesh ) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if ( child.material ) {
                        child.material.metalness = 0;
                        child.material.shininess = 0;
                    }
                }
            } );
            model.gltf = gltf;
        });
    });
}

function buildModels() {
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    loadModelsList.forEach( model => {
        // const root = new THREE.Object3D();
        model.buildCallback();
    });
}

function initLinkJoints() {
    const link = modelsMap.link;

    link.root.traverse(obj => {

        if ( obj.isBone ) {
            // console.log(obj.name);
            // console.log(obj.rotation);
            
            if (obj.name === 'spine006') {
                link.joints.upper.head = obj;
            }

            // Upper left limbs
            if (obj.name === 'upper_armL') {
                link.joints.upper.left.arm = obj;
            }
            if (obj.name === 'forearmL') {
                link.joints.upper.left.forearm = obj;
            }
            if (obj.name === 'handL') {
                link.joints.upper.left.hand = obj;
            }
        
            // Upper right limbs
            if (obj.name === 'upper_armR') {
                link.joints.upper.right.arm = obj;
            }
            if (obj.name === 'forearmR') {
                link.joints.upper.right.forearm = obj;
            }
            if (obj.name === 'handR') {
                link.joints.upper.right.hand = obj;
            }
        
            // Lower left limbs
            if (obj.name === 'thighL') {
                link.joints.lower.left.thigh = obj;
            }
            if (obj.name === 'shinL') {
                link.joints.lower.left.shin = obj;
            }
            if (obj.name === 'footL') {
                link.joints.lower.left.foot = obj;
            }
            if (obj.name === 'toeL') {
                link.joints.lower.left.toe = obj;
            }
        
            // Lower right limbs
            if (obj.name === 'thighR') {
                link.joints.lower.right.thigh = obj;
            }
            if (obj.name === 'shinR') {
                link.joints.lower.right.shin = obj;
            }
            if (obj.name === 'footR') {
                link.joints.lower.right.foot = obj;
            }
            if (obj.name === 'toeR') {
                link.joints.lower.right.toe = obj;
            }
        }
    });
}

function buildLink() {
    const link = modelsMap.link;
    const clonedScene = SkeletonUtils.clone(link.gltf.scene);
    link.root = clonedScene.children[0];
    
    link.root.position.set(...link.position);
    link.root.scale.multiplyScalar(link.scale);
    const rotation = UTILS.degToRad3(link.rotation);
    link.root.rotation.set(...rotation);

    scene.add( link.root );
    
    buildBow();

    initLinkJoints();

    console.log(UTILS.dumpObject(link.root));
}

function initBowJoints() {
    const bow = modelsMap.bow;
    const string = modelsMap.link.root.getObjectByName('string');
    bow.joints.string = string;
}

function buildBow() {
    scene.updateMatrixWorld();

    var linkHand = modelsMap.link.root.getObjectByName('handL');
    var bow = modelsMap.link.root.getObjectByName('Bow');

    modelsMap.bow.root = bow;
    linkHand.attach(bow);
    initBowJoints();
}

function buildTarget() {
    const target = modelsMap.target;
    target.root = target.gltf.scene.children[0];
    
    target.root.position.set(...target.position);
    target.root.scale.multiplyScalar(target.scale);
    const rotation = UTILS.degToRad3(target.rotation);
    target.root.rotation.set(...rotation);

    scene.add( target.root );
    console.log(UTILS.dumpObject(target.root));
}

function buildArrow() {
    const arrow = modelsMap.arrow;
    
    arrow.root = new THREE.Object3D();
    arrow.root.name = "Arrow";
    arrow.root.add(arrow.gltf.scene.children[0]);

    var bow = modelsMap.link.root.getObjectByName('Bow');
    
    bow.add( arrow.root );
    
    arrow.root.scale.multiplyScalar(arrow.scale);
    const rotation = UTILS.degToRad3(arrow.rotation);
    arrow.root.rotation.set(...rotation);
    
    console.log(UTILS.dumpObject(arrow.root));
}


// ============================================================================
// SCENE BUILDING FUNCTIONS
// ============================================================================

function buildScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color( fogColor );

    createLight();
    createFog();

    createGround();  
    buildModels();

    createFirstPersonCamera();
    createThirdPersonCamera();
    createArrowCamera();

    sceneBuilt = true;
    currentCamera = thirdPersonCamera;
    main();
}

function createFog() {
    scene.fog = new THREE.Fog( fogColor, fogNear, fogFar );
}

function createFirstPersonCamera() {
    firstPersonCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);    
    const bow = modelsMap.link.root.getObjectByName('Bow');

    firstPersonCamera.position.set( ...firstPersonCameraPosition );
    firstPersonCamera.lookAt( ...firstPersonCameraTarget );
    
    bow.add( firstPersonCamera );
}

function createThirdPersonCamera() {
    thirdPersonCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);    
    const link = modelsMap.link.root;

    thirdPersonCamera.position.set( ...thirdPersonCameraPosition );
    thirdPersonCamera.lookAt( ...thirdPersonCameraTarget );
    
    link.add( thirdPersonCamera );
}

function createArrowCamera() {

}

function createDirectionalLight() {
    light = new THREE.DirectionalLight( lightColor, lightIntensity );
    light.position.set( ...lightPosition );
    light.position.multiplyScalar( lightDistance );
    light.target.position.set( ...lightTarget );

    light.castShadow = true;

    light.shadow.camera.left = - shadowCameraWidth;
    light.shadow.camera.right = shadowCameraWidth;
    light.shadow.camera.top = shadowCameraHeight;
    light.shadow.camera.bottom = - shadowCameraHeight;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = shadowCameraDepth;

    light.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    light.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

    scene.add( light );
}

function createAmbientLight() {
    const color = 0xFFFFFF;
    const intensity = 1;
    ambient = new THREE.AmbientLight(color, intensity);
    
    scene.add( ambient );
}

function createLight() {
    createDirectionalLight();
    createAmbientLight();
}

function createGround() {
    var groundTexture = textureLoader.load( '../assets/textures/grass_texture.png' );
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set( 256, 256 );
    groundTexture.anisotropy = 16;
    groundTexture.encoding = THREE.sRGBEncoding;
    groundTexture.magFilter = THREE.LinearFilter;
    groundTexture.minFilter = THREE.LinearMipmapLinearFilter;

    var groundMaterial = new THREE.MeshLambertMaterial( { map: groundTexture } );

    var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 20000, 20000 ), groundMaterial );
    mesh.position.y = 0;
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add( mesh );
}

// ============================================================================
// HANDLING FUNCTIONS
// ============================================================================

function initGUI() {
    var instructions = document.getElementById( 'instructions' );

    blocker.style.display = 'block';
    instructions.style.display = '';

    var crosshair = document.getElementById( 'crosshair' );
    crosshair.style.display = 'none';
}

function switchCamera() {
    if ( currentCamera === firstPersonCamera ) {
        currentCamera = thirdPersonCamera;
        var crosshair = document.getElementById( 'crosshair' );
        crosshair.style.display = 'none';
    } else {
        currentCamera = firstPersonCamera;
        var crosshair = document.getElementById( 'crosshair' );
        crosshair.style.display = '';
    }
}

function setCameraControls() {
    var onKeyDown = function( event ) {
        switch (  event.keyCode ) {
            case 81: // q
                switchCamera();
                break;
        }
    }
    
    document.addEventListener( 'keydown', onKeyDown, false );
}

function setPlayerControls() {

    const link = modelsMap.link.root;
    playerControls = new MovementPointerLockControls( link, document.body );
    
    playerControls.enableMouseVertical = false;

    var onKeyDown = function ( event ) {

        switch ( event.keyCode ) {

            case 38: // up
            case 87: // w
                moveForward = true;
                break;

            case 37: // left
            case 65: // a
                moveLeft = true;
                break;

            case 40: // down
            case 83: // s
                moveBackward = true;
                break;

            case 39: // right
            case 68: // d
                moveRight = true;
                break;

            case 32: // space
                if ( canJump === true ) linkVelocity.y += linkJumpSpeed;
                canJump = false;
                break;
        }
    };

    var onKeyUp = function ( event ) {

        switch ( event.keyCode ) {

            case 38: // up
            case 87: // w
                moveForward = false;
                break;

            case 37: // left
            case 65: // a
                moveLeft = false;
                break;

            case 40: // down
            case 83: // s
                moveBackward = false;
                break;

            case 39: // right
            case 68: // d
                moveRight = false;
                break;

        }

    };

    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );

    gameControls.push(playerControls);
}

function setBowControls() {

    const link = modelsMap.link;
    const armL = link.joints.upper.left.arm;
    const armR = link.joints.upper.right.arm;
    const head = link.joints.upper.head;

    // Controls for left and right arm (and bow)
    var bowControlsL = new AimPointerLockControls( armL, document.body );
    var bowControlsR = new AimPointerLockControls( armR, document.body );
    bowControlsR.inverted = true;
    
    // Controls for link's head
    var headControls = new HeadPointerLockControls( head, document.body, )
    
    var bowControlsArray = [bowControlsL, bowControlsR];

    // Assign listeners
    bowControlsArray.forEach(bowControls => {
        bowControls.minPolarAngle = 0.25 * Math.PI;
        bowControls.maxPolarAngle = 0.75 * Math.PI;

        gameControls.push(bowControls);
    });

    headControls.minPolarAngle = -0.25 * Math.PI;
    headControls.maxPolarAngle = 0.25 * Math.PI;
    gameControls.push(headControls);
}

function setOrbitControls() {
    var orbitControls = new OrbitControls( thirdPersonCamera, renderer.domElement );
    orbitControls.minPolarAngle = 0.0;
    orbitControls.maxPolarAngle = Math.PI * 0.5 - 0.1;
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();

    gameControls.push(orbitControls);
}

function setShootControls () {
    var onClickPressed = function (event) {
        if (gamePaused) return;
        if (!canShoot) return;
        if (shooting) return;

        shooting = true;
        shootInitTime = performance.now();
    };

    var onClickRelease = function (event) {
        if (gamePaused) return;
        if (!shooting) return;

        canShoot = false;
        shootFinalTime = performance.now();
        shooting = false;
        shootArrow();
    };

    document.addEventListener('mousedown', onClickPressed, false);
    document.addEventListener('mouseup', onClickRelease, false);
}

function setListeners(controls) {
    var instructions = document.getElementById( 'instructions' );

    instructions.addEventListener( 'click', function () {

        controls.lock();

    }, false );

    controls.addEventListener( 'lock', function () {

        instructions.style.display = 'none';
        blocker.style.display = 'none';
        gamePaused = false;
    } );

    controls.addEventListener( 'unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';
        gamePaused = true;
    } );
}

function setControls() {
    initGUI();
    
    // setOrbitControls();
    setPlayerControls();
    setBowControls();
    setShootControls();
    setCameraControls();

    gameControls.forEach(
        (controls) => {
            setListeners(controls);
        }
    );

    controlsSet = true;
    main();
}

function onWindowResize() {
    thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
    thirdPersonCamera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
 
// ============================================================================
// ANIMATION FUNCTIONS
// ============================================================================

function computeArrowDirection() {
    // World axis: 
    // links rotation (x axis)
    // arrow up/down (y axis)
    const arrow = modelsMap.arrow.root;
    
    var dir = new THREE.Vector3();
    arrow.getWorldDirection(dir);
    return dir;
}

function computeArrowInitialVelocity(direction) {
    var charge = (shootFinalTime - shootInitTime) * 0.001;
    var deltaT = Math.min(charge, maxCharge);

    var impulse = arrowForce * deltaT;
    var initialSpeed = impulse / arrowMass;
    var initialVelocity = direction.multiplyScalar(initialSpeed);
    return initialVelocity;
}

function shootArrow() {
    console.log("Arrow shot!");
    const arrow = modelsMap.arrow.root;
    
    var bow = modelsMap.link.root.getObjectByName('Bow');
    SceneUtils.detach(arrow, bow, scene);
    
    // Compute arrow trajectory
    var dir = computeArrowDirection();

    // Initial position
    var arrowInitialPosition = new THREE.Vector3();
    arrow.getWorldPosition(arrowInitialPosition);
    
    // Initial velocity
    var arrowInitialVelocity = computeArrowInitialVelocity(dir);
    
    console.log("Initial position: " + UTILS.vec3ToArr(arrowInitialPosition));
    console.log("Initial velocity: " + UTILS.vec3ToArr(arrowInitialVelocity));

    var y0 = arrowInitialPosition.y;
    var vy0 = arrowInitialVelocity.y;
    
    var time = (vy0 + Math.sqrt(Math.pow(vy0, 2) + 2 * g * y0) ) / g ;
    var riseTime = Math.max(vy0 / g, 0.0);
    var fallTime = time - riseTime;

    console.log(riseTime);
    console.log(fallTime);
    
    shooting = false;
    // canShoot = true;
    
    // Create tweens to update velocities (first and second half of parabolic trajectory)
    var v1 = {x: arrowInitialVelocity.x, y: arrowInitialVelocity.y, z: arrowInitialVelocity.z};

    var arrowTween1 = new TWEEN.Tween(v1)
    .to({x: arrowInitialVelocity.x, y: 0.0, z: arrowInitialVelocity.z},
        1000 * riseTime)
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate( 
        () => {
            arrow.position.x += v1.x;
            arrow.position.y += v1.y;
            arrow.position.z += v1.z;
        }
    );
    
    var v2 = {x: arrowInitialVelocity.x, y: 0.0, z: arrowInitialVelocity.z};
    
    var arrowTween2 = new TWEEN.Tween(v2)
    .to({x: arrowInitialVelocity.x, y: -1.0 * arrowInitialVelocity.y, z: arrowInitialVelocity.z}, 
        1000 * fallTime
    ) 
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate( 
        () => {
            arrow.position.x += v2.x;
            arrow.position.y += v2.y;
            arrow.position.z += v2.z;
        })
    .easing(TWEEN.Easing.Quadratic.Out)
    .onComplete(
        () => {
            canShoot = true;
            console.log("Arrow landed");
            arrowTweens = [];
        }
    );

    var arrowAngles = {x: arrow.rotation.x};

    var arrowTweenAngle = new TWEEN.Tween(arrowAngles)
    .to({x: -1.0 * arrowAngles.x}, 1000*time)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(
        () => {
            arrow.rotation.x = arrowAngles.x
        }
    );
    
    const eps = 1e-3;
    if (riseTime > eps) {
        arrowTween1 = arrowTween1.onComplete(
            () => {
                arrowTweens.push(arrowTween2);
                arrowTween2.start();
            }
        );
        
        arrowTweens.push(arrowTween1);
        arrowTweens.push(arrowTweenAngle);
    } else {
        arrowTweens.push(arrowTween2);
        arrowTweens.push(arrowTweenAngle);
    }

    UTILS.startTweens(arrowTweens);
}

function initLinkLowerLimbsX() {
    const linkJoints = modelsMap.link.joints;

    // Set initial position for lower limbs
    linkJoints.lower.left.thigh.rotation.x = UTILS.degToRad(180);
    linkJoints.lower.left.shin.rotation.x = 0.0;
    // linkJoints.lower.left.foot.rotation.x = 0.0;
    // linkJoints.lower.left.toe.rotation.x = 0.0;
    
    linkJoints.lower.right.thigh.rotation.x = UTILS.degToRad(180);
    linkJoints.lower.right.shin.rotation.x = 0.0;
    // linkJoints.lower.right.foot.rotation.x = 0.0;
    // linkJoints.lower.right.toe.rotation.x = 0.0;
}

function initLinkLowerLimbsZ() {
    const linkJoints = modelsMap.link.joints;

    // Set initial position for lower limbs
    linkJoints.lower.left.thigh.rotation.z = 0.0;
    linkJoints.lower.left.shin.rotation.z = 0.0;
    // linkJoints.lower.left.foot.rotation.z = 0.0;
    // linkJoints.lower.left.toe.rotation.z = 0.0;

    linkJoints.lower.right.thigh.rotation.z = 0.0;
    linkJoints.lower.right.shin.rotation.z = 0.0;
    // linkJoints.lower.right.foot.rotation.z = 0.0;
    // linkJoints.lower.right.toe.rotation.z = 0.0;
}

function controlLinkMovement() {
    var time = performance.now();
    var dt = ( time - prevTime ) / 1000;

    // Apply friction
    linkVelocity.x -= linkVelocity.x * floorFriction * dt;
    linkVelocity.z -= linkVelocity.z * floorFriction * dt;

    // Update velocity based on current direction
    linkDirection.z = Number( moveForward ) - Number( moveBackward );
    linkDirection.x = Number( moveRight ) - Number( moveLeft );
    linkDirection.normalize(); // this ensures consistent movements in all directions

    if ( moveForward || moveBackward ) linkVelocity.z -= linkDirection.z * linkMoveSpeed * dt;
    if ( moveLeft || moveRight ) linkVelocity.x -= linkDirection.x * linkMoveSpeed * dt;

    // Update position
    playerControls.moveRight( linkVelocity.x * dt );
    playerControls.moveForward( linkVelocity.z * dt );

    const eps = 0.001;

    // z-axis animation
    if ( linkVelocity.z < -eps ) {
        startLinkWalkForward();
        stopLinkWalkBackward();
    }
    if ( Math.abs(linkVelocity.z) < eps ) {
        stopLinkWalkForward();
        stopLinkWalkBackward();
        initLinkLowerLimbsX();
    }
    if ( linkVelocity.z > eps ) {
        stopLinkWalkForward();
        startLinkWalkBackward();
    }

    // x-axis animation
    if ( linkVelocity.x < -eps ) {
        startLinkWalkSideways();
    }
    if ( Math.abs(linkVelocity.x) < eps ) {
        stopLinkWalkSideways();
        initLinkLowerLimbsZ();
    }
    if ( linkVelocity.x > eps ) {
        startLinkWalkSideways();
    }

    // Update vertical position
    playerControls.getObject().position.y += ( linkVelocity.y * dt ); // new behavior

    // Check vertical position (no infinite falling)
    if ( playerControls.getObject().position.y < 0 ) {
        linkVelocity.y = 0;
        playerControls.getObject().position.y = 0;
        canJump = true;
    } else {
        linkVelocity.y -= 9.8 * linkMass * dt; // 100.0 = mass
    }

    prevTime = time;
}

function startLinkWalkForward() {
    const linkJoints = modelsMap.link.joints;

    // Set initial position for lower limbs
    if ( linkForwardTweens.length != 0 ) return;
    
    initLinkLowerLimbsX();

    // Params
    const time1 = 200;
    const time2 = 400;
    const time3 = 200;
    
    const thighAngle1 = 30;
    const shinLAngle1 = 0;
    const shingRAngle1 = -30;
    
    const thighAngle2 = -30;
    const shinLAngle2 = 30;
    const shinRAngle2 = 0;
    
    const thighAngle3 = 0;
    const shinLAngle3 = 0;
    const shinRAngle3 = 0;

    // Thigh tweens
    var thigh = {angle: 0.0};
    var thighTween1 = new TWEEN.Tween(thigh)
	.to({ angle: thighAngle1}, time1) 
	.easing(TWEEN.Easing.Quadratic.In)
	.onUpdate( 
            () => {
                linkJoints.lower.left.thigh.rotation.x = UTILS.degToRad(180 +  thigh.angle ); // forward
                linkJoints.lower.right.thigh.rotation.x = UTILS.degToRad(180 - 1.0 * thigh.angle ); // backward
            }
    );

    var thighTween2 = new TWEEN.Tween(thigh)
	.to({ angle: thighAngle2}, time2) 
	.easing(TWEEN.Easing.Quadratic.In)
	.onUpdate( 
            () => {
                linkJoints.lower.left.thigh.rotation.x = UTILS.degToRad(180 +  thigh.angle ); // forward
                linkJoints.lower.right.thigh.rotation.x = UTILS.degToRad(180 -1.0 * thigh.angle ); // backward
            }
    );

    var thighTween3 = new TWEEN.Tween(thigh)
	.to({ angle: thighAngle3}, time3) 
	.easing(TWEEN.Easing.Quadratic.In)
	.onUpdate( 
            () => {
                linkJoints.lower.left.thigh.rotation.x = UTILS.degToRad(180 +  thigh.angle ); // forward
                linkJoints.lower.right.thigh.rotation.x = UTILS.degToRad(180 -1.0 * thigh.angle ); // backward
            }
    );
        

    // Shin tweens
    var shin = {angleL: 0.0, angleR: 0.0};
    var shinTween1 = new TWEEN.Tween(shin)
	.to({ angleL: shinLAngle1, angleR: shingRAngle1 }, time1) 
	.easing(TWEEN.Easing.Quadratic.Out)
	.onUpdate( 
            () => {
                linkJoints.lower.left.shin.rotation.x = UTILS.degToRad( shin.angleL ); // forward
                linkJoints.lower.right.shin.rotation.x = UTILS.degToRad( shin.angleR ); // backward
            }
	);
    
    var shinTween2 = new TWEEN.Tween(shin)
	.to({ angleL: shinLAngle2, angleR: shinRAngle2 }, time2) 
	.easing(TWEEN.Easing.Quadratic.Out)
	.onUpdate( 
            () => {
                linkJoints.lower.left.shin.rotation.x = UTILS.degToRad( shin.angleL ); // forward
                linkJoints.lower.right.shin.rotation.x = UTILS.degToRad( shin.angleR ); // backward
            }
	);
    
    var shinTween3 = new TWEEN.Tween(shin)
	.to({ angleL: shinLAngle3, angleR: shinRAngle3 }, time3) 
	.easing(TWEEN.Easing.Quadratic.Out)
	.onUpdate( 
            () => {
                linkJoints.lower.left.shin.rotation.x = UTILS.degToRad( shin.angleL ); // forward
                linkJoints.lower.right.shin.rotation.x = UTILS.degToRad( shin.angleR ); // backward
            }
	);

    // Add tweens to list
    linkForwardTweens.push(thighTween1);
    linkForwardTweens.push(shinTween1);

    linkForwardTweens.push(thighTween2);
    linkForwardTweens.push(shinTween2);
    
    linkForwardTweens.push(thighTween3);
    linkForwardTweens.push(shinTween3);

    // Start tweens in a cyclic fashion
    thighTween1.onComplete( () => { thighTween2.start(); } );
    shinTween1.onComplete( () => { shinTween2.start(); } );
    
    thighTween2.onComplete( () => { thighTween3.start(); } );
    shinTween2.onComplete( () => { shinTween3.start(); } );
    
    thighTween3.onComplete( () => { thighTween1.start(); } );
    shinTween3.onComplete( () => { shinTween1.start(); } );

    thighTween1.start();
    shinTween1.start();
}

function stopLinkWalkForward() {
    UTILS.stopTweens(linkForwardTweens);
    linkForwardTweens = [];
}

function startLinkWalkBackward() {
    const linkJoints = modelsMap.link.joints;

    // Set initial position for lower limbs
    if ( linkBackwardTweens.length != 0 ) return;
    
    initLinkLowerLimbsX();

    // Params
    const time1 = 200;
    const time2 = 400;
    const time3 = 200;
    
    const thighAngle1 = -30;
    const shinLAngle1 = 0;
    const shingRAngle1 = 30;
    
    const thighAngle2 = 30;
    const shinLAngle2 = -30;
    const shinRAngle2 = 0;
    
    const thighAngle3 = 0;
    const shinLAngle3 = 0;
    const shinRAngle3 = 0;

    // Thigh tweens
    var thigh = {angle: 0.0};
    var thighTween1 = new TWEEN.Tween(thigh)
	.to({ angle: thighAngle1}, time1) 
	.easing(TWEEN.Easing.Quadratic.In)
	.onUpdate( 
            () => {
                linkJoints.lower.left.thigh.rotation.x = UTILS.degToRad(180 +  thigh.angle ); // forward
                linkJoints.lower.right.thigh.rotation.x = UTILS.degToRad(180 - 1.0 * thigh.angle ); // backward
            }
    );

    var thighTween2 = new TWEEN.Tween(thigh)
	.to({ angle: thighAngle2}, time2) 
	.easing(TWEEN.Easing.Quadratic.In)
	.onUpdate( 
            () => {
                linkJoints.lower.left.thigh.rotation.x = UTILS.degToRad(180 +  thigh.angle ); // forward
                linkJoints.lower.right.thigh.rotation.x = UTILS.degToRad(180 -1.0 * thigh.angle ); // backward
            }
    );

    var thighTween3 = new TWEEN.Tween(thigh)
	.to({ angle: thighAngle3}, time3) 
	.easing(TWEEN.Easing.Quadratic.In)
	.onUpdate( 
            () => {
                linkJoints.lower.left.thigh.rotation.x = UTILS.degToRad(180 +  thigh.angle ); // forward
                linkJoints.lower.right.thigh.rotation.x = UTILS.degToRad(180 -1.0 * thigh.angle ); // backward
            }
    );
        

    // Shin tweens
    var shin = {angleL: 0.0, angleR: 0.0};
    var shinTween1 = new TWEEN.Tween(shin)
	.to({ angleL: shinLAngle1, angleR: shingRAngle1 }, time1) 
	.easing(TWEEN.Easing.Quadratic.Out)
	.onUpdate( 
            () => {
                linkJoints.lower.left.shin.rotation.x = UTILS.degToRad( shin.angleL ); // forward
                linkJoints.lower.right.shin.rotation.x = UTILS.degToRad( shin.angleR ); // backward
            }
	);
    
    var shinTween2 = new TWEEN.Tween(shin)
	.to({ angleL: shinLAngle2, angleR: shinRAngle2 }, time2) 
	.easing(TWEEN.Easing.Quadratic.Out)
	.onUpdate( 
            () => {
                linkJoints.lower.left.shin.rotation.x = UTILS.degToRad( shin.angleL ); // forward
                linkJoints.lower.right.shin.rotation.x = UTILS.degToRad( shin.angleR ); // backward
            }
	);
    
    var shinTween3 = new TWEEN.Tween(shin)
	.to({ angleL: shinLAngle3, angleR: shinRAngle3 }, time3) 
	.easing(TWEEN.Easing.Quadratic.Out)
	.onUpdate( 
            () => {
                linkJoints.lower.left.shin.rotation.x = UTILS.degToRad( shin.angleL ); // forward
                linkJoints.lower.right.shin.rotation.x = UTILS.degToRad( shin.angleR ); // backward
            }
	);

    // Add tweens to list
    linkBackwardTweens.push(thighTween1);
    linkBackwardTweens.push(shinTween1);

    linkBackwardTweens.push(thighTween2);
    linkBackwardTweens.push(shinTween2);
    
    linkBackwardTweens.push(thighTween3);
    linkBackwardTweens.push(shinTween3);

    // Start tweens in a cyclic fashion
    thighTween1.onComplete( () => { thighTween2.start(); } );
    shinTween1.onComplete( () => { shinTween2.start(); } );
    
    thighTween2.onComplete( () => { thighTween3.start(); } );
    shinTween2.onComplete( () => { shinTween3.start(); } );
    
    thighTween3.onComplete( () => { thighTween1.start(); } );
    shinTween3.onComplete( () => { shinTween1.start(); } );

    thighTween1.start();
    shinTween1.start();
}

function stopLinkWalkBackward() {
    UTILS.stopTweens(linkBackwardTweens);
    linkBackwardTweens = [];
}

function startLinkWalkSideways() {
    const linkJoints = modelsMap.link.joints;

    // Set initial position for lower limbs
    if ( linkSideTweens.length != 0 ) return;
    
    initLinkLowerLimbsX();

    // Params
    const time1 = 200;
    const time2 = 400;
    
    const thighAngle1 = -15;
    const thighAngle2 = 0;

    // Thigh tweens
    var thigh = {angle: 0.0};
    var thighTween1 = new TWEEN.Tween(thigh)
	.to({ angle: thighAngle1}, time1) 
	.easing(TWEEN.Easing.Quadratic.In)
	.onUpdate( 
            () => {
                linkJoints.lower.left.thigh.rotation.z = UTILS.degToRad( thigh.angle ); // forward
                linkJoints.lower.right.thigh.rotation.z = UTILS.degToRad( -thigh.angle ); // backward
            }
    );

    var thighTween2 = new TWEEN.Tween(thigh)
	.to({ angle: thighAngle2}, time2) 
	.easing(TWEEN.Easing.Quadratic.In)
	.onUpdate( 
            () => {
                linkJoints.lower.left.thigh.rotation.z = UTILS.degToRad( thigh.angle ); // forward
                linkJoints.lower.right.thigh.rotation.z = UTILS.degToRad( -thigh.angle ); // backward
            }
    );

    // Add tweens to list
    linkSideTweens.push(thighTween1);
    linkSideTweens.push(thighTween2);

    // Start tweens in a cyclic fashion
    thighTween1.onComplete( () => { thighTween2.start(); } );
    thighTween2.onComplete( () => { thighTween1.start(); } );

    thighTween1.start();
}

function stopLinkWalkSideways() {
    UTILS.stopTweens(linkSideTweens);
    linkSideTweens = [];
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

function render(time) {
    time *= 0.001;  // convert time to seconds
    
    TWEEN.update();
    
    controlLinkMovement();
    
    renderer.render(scene, currentCamera);
    requestAnimationFrame(render);
}

function main() {
    if (!modelsLoaded) {
        loadAssets();
        return;
    }
    
    if (!sceneBuilt) {
        init();
        buildScene();
        return;
    }

    if (!controlsSet) {
        setControls();
        return;
    }
    
    requestAnimationFrame(render);
}
main();