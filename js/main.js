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
var gameState = {
    gamePaused: false,
    optionsSet: false,
    guiInitialized: false,
    modelsLoaded: false,
    sceneBuilt: false,
    controlsSet: false,
    canShoot: false,
    shooting: false,
    shootInitTime: null,
    shootFinalTime: null,
    arrowFlying: false,
};

var difficulty;
var daylight;

var playerControls;
var gameControls = [];

// Objects variables
var scene;
var light;
var ambient;

var currentCamera;
var currentCameraIdx = 0;

var firstPersonCamera;
var thirdPersonCamera;
var arrowCamera;

var cameras;

// Model variables
var models;
var loadModelsList;

models = {
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
                head: null,
                spine001: null,
                spine002: null,
                spine003: null,
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

loadModelsList = [models.link, models.target, models.arrow];

// Camera parameters
const fov = 45;
const aspect = window.innerWidth / window.innerHeight;  // the canvas default
const near = 0.1;
const far = 100000;

const firstPersonCameraPosition = [ 2.0, 3.0, -12.0 ];
const firstPersonCameraTarget = [ 2.0, 3.0, 1.0 ];

const fogNear = 50;
const fogFar = 1000;
const daylightBackgroundColor = 0xcce0ff;
const nightBackgroundColor = 0x070B34;

// Terrain parameters
const terrainWidth = 500;
const terrainTextureRepeat = 32;
const terrainTextureAnisotropy = 16;

// Light parameters

// Directional light 
const lightDistance = 200;
const lightTarget = [ 0, 0, 0 ];
const sunlightColor = 0xfffeae;
const sunlightIntensity = 10.0;

const lightShadowMapWidth = 2048; 
const lightShadowMapHeight = 2048;

const lightShadowCameraWidth = terrainWidth / 2;
const lightShadowCameraHeight = terrainWidth / 2;
const lightShadowCameraDepth = 1024;

// Sun
const sunRadius = 20;
const sunWidthSegments = 12;
const sunHeightSegments = 12;

const sunPosition = [ 1, 0.5, -2 ];
const sunColor = 0xfffeae;

// Moon
const moonPosition = [ 1, 0.2, 2 ];
const moonColor = 0xe5e5e5;
const moonlightColor = 0xe5e5e5;
const moonlightIntensity = 2.0;

// Ambient light
const ambientDaylightColor = 0xFFFFFF;
const ambientDaylightIntensity = 1;
const ambientNightIntensity = 2;
const ambientNightColor = 0x2B2F77;

// Link movement variables and params
var linkRestJoints = {
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
        head: null,
        spine001: null,
        spine002: null,
        spine003: null,
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

const floorFriction = 10.0;
const linkMovementSpeed = 100.0;
const linkMass = 100.0;

const g = 9.81;
const linkMovementThreshold = 0.01*linkMovementSpeed;

var linkMovement = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

var linkCollision = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

var prevTime = performance.now();
var linkVelocity = new THREE.Vector3();
var linkDirection = new THREE.Vector3();

var linkMovementTweens = [];

// Arrow movement variables and params
const arrowAcceleration = new THREE.Vector3(0, -1.0*g, 0.0);
var arrowVelocity = new THREE.Vector3();
var arrowDirection = new THREE.Vector3();

var nockTween;
var nockingAmount;

const bowStringMaxStretching = 10.0;
const arrowForce = 10.0;
const arrowMass = 1.0; 
const maxCharge = 2.0;


// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

function loadAssets() {
    textureLoader = new THREE.TextureLoader();
    loadingManager = new THREE.LoadingManager();

    loadModels();
}

function initWebGL() {
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    renderer.shadowMap.enabled = true;
    window.addEventListener( 'resize', onWindowResize, false );

    
    // Hide the loading bar
    document.querySelector('#loadingScreen').hidden = true;
}

function initGUI() {
    // Hide game menu
    document.querySelector( '#gameMenu' ).hidden = true;

    // Show loading screen
    document.querySelector( '#loadingScreen' ).hidden = false;

    // Hide pauseScreen
    document.querySelector( '#gameMenu' ).hidden = true;


    // Hide crosshair
    document.querySelector( '#crosshair' ).hidden = true;


    gameState.guiInitialized = true;
}

function setOptions() {
    difficulty = $("#difficultySelect :selected").val(); 
    daylight = $('input[name=daylightRadio]:checked', '#daylightForm').val()

    // console.log(difficulty);
    // console.log(daylight);

    gameState.optionsSet = true;
}

// ============================================================================
// MODEL(s) CODE 
// ============================================================================

function loadModels() {   
    loadingManager.onLoad = function() {
        // console.log('Loading complete!');
        document.querySelector('#loadingScreen').classList.add( 'fade-out' );
        gameState.modelsLoaded = true;
        main();
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
    loadModelsList.forEach( model => {
        model.buildCallback();
    });
}

function initLinkJoints() {
    const link = models.link;

    link.root.traverse(obj => {

        if ( obj.isBone ) {
            // Head and back 
            if (obj.name === 'spine001') {
                link.joints.upper.spine001 = obj;
                linkRestJoints.upper.spine001 = new THREE.Euler();
                linkRestJoints.upper.spine001.copy(obj.rotation);
            }
            if (obj.name === 'spine002') {
                link.joints.upper.spine002 = obj;
                linkRestJoints.upper.spine002 = new THREE.Euler();
                linkRestJoints.upper.spine002.copy(obj.rotation);
            }
            if (obj.name === 'spine003') {
                link.joints.upper.spine003 = obj;
                linkRestJoints.upper.spine003 = new THREE.Euler();
                linkRestJoints.upper.spine003.copy(obj.rotation);
            }
            if (obj.name === 'spine004') {
                link.joints.upper.head = obj;
                linkRestJoints.upper.head = new THREE.Euler();
                linkRestJoints.upper.head.copy(obj.rotation);
            }

            // Upper left limbs
            if (obj.name === 'upper_armL') {
                link.joints.upper.left.arm = obj;
                linkRestJoints.upper.left.arm = new THREE.Euler();
                linkRestJoints.upper.left.arm.copy(obj.rotation);
            }
            if (obj.name === 'forearmL') {
                link.joints.upper.left.forearm = obj;
                linkRestJoints.upper.left.forearm = new THREE.Euler();
                linkRestJoints.upper.left.forearm.copy(obj.rotation);
            }
            if (obj.name === 'handL') {
                link.joints.upper.left.hand = obj;
                linkRestJoints.upper.left.hand = new THREE.Euler();
                linkRestJoints.upper.left.hand.copy(obj.rotation);
            }
        
            // Upper right limbs
            if (obj.name === 'upper_armR') {
                link.joints.upper.right.arm = obj;
                linkRestJoints.upper.right.arm = new THREE.Euler();
                linkRestJoints.upper.right.arm.copy(obj.rotation);
            }
            if (obj.name === 'forearmR') {
                link.joints.upper.right.forearm = obj;
                linkRestJoints.upper.right.forearm = new THREE.Euler();
                linkRestJoints.upper.right.forearm.copy(obj.rotation);
            }
            if (obj.name === 'handR') {
                link.joints.upper.right.hand = obj;
                linkRestJoints.upper.right.hand = new THREE.Euler();
                linkRestJoints.upper.right.hand.copy(obj.rotation);
            }
        
            // Lower left limbs
            if (obj.name === 'thighL') {
                link.joints.lower.left.thigh = obj;
                linkRestJoints.lower.left.thigh = new THREE.Euler();
                linkRestJoints.lower.left.thigh.copy(obj.rotation);
            }
            if (obj.name === 'shinL') {
                link.joints.lower.left.shin = obj;
                linkRestJoints.lower.left.shin = new THREE.Euler();
                linkRestJoints.lower.left.shin.copy(obj.rotation);
            }
            if (obj.name === 'footL') {
                link.joints.lower.left.foot = obj;
                linkRestJoints.lower.left.foot = new THREE.Euler();
                linkRestJoints.lower.left.foot.copy(obj.rotation);
            }
            if (obj.name === 'toeL') {
                link.joints.lower.left.toe = obj;
                linkRestJoints.lower.left.toe = new THREE.Euler();
                linkRestJoints.lower.left.toe.copy(obj.rotation);
            }
        
            // Lower right limbs
            if (obj.name === 'thighR') {
                link.joints.lower.right.thigh = obj;
                linkRestJoints.lower.right.thigh = new THREE.Euler();
                linkRestJoints.lower.right.thigh.copy(obj.rotation);
            }
            if (obj.name === 'shinR') {
                link.joints.lower.right.shin = obj;
                linkRestJoints.lower.right.shin = new THREE.Euler();
                linkRestJoints.lower.right.shin.copy(obj.rotation);
            }
            if (obj.name === 'footR') {
                link.joints.lower.right.foot = obj;
                linkRestJoints.lower.right.foot = new THREE.Euler();
                linkRestJoints.lower.right.foot.copy(obj.rotation);
            }
            if (obj.name === 'toeR') {
                link.joints.lower.right.toe = obj;
                linkRestJoints.lower.right.toe = new THREE.Euler();
                linkRestJoints.lower.right.toe.copy(obj.rotation);
            }
        }
    });
}

function buildLink() {
    const link = models.link;
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
    const bow = models.bow;
    const string = models.link.root.getObjectByName('string');
    bow.joints.string = string;
}

function buildBow() {
    scene.updateMatrixWorld();

    const linkHandL = models.link.root.getObjectByName('handL');
    const linkHandR = models.link.root.getObjectByName('handR');
    const bow = models.link.root.getObjectByName('Bow');

    models.bow.root = bow;
    linkHandL.attach(bow);
    initBowJoints();

    const string = models.bow.joints.string;
    bow.attach(string);
    // linkHandR.attach(string);
}

function buildTarget() {
    const target = models.target;
    target.root = target.gltf.scene.children[0];
    
    target.root.position.set(...target.position);
    target.root.scale.multiplyScalar(target.scale);
    const rotation = UTILS.degToRad3(target.rotation);
    target.root.rotation.set(...rotation);

    scene.add( target.root );
    console.log(UTILS.dumpObject(target.root));
}

function buildArrow() {
    const link = models.link;
    const bow = models.bow;
    const arrow = models.arrow;
    
    arrow.root = new THREE.Object3D();
    arrow.root.name = "Arrow";
    arrow.root.add(arrow.gltf.scene.children[0]);

    bow.root.add( arrow.root );
    
    const handR = link.joints.upper.right.hand;
    const string = bow.joints.string;
    handR.attach( string );
    
    arrow.root.scale.multiplyScalar(arrow.scale);
    const rotation = UTILS.degToRad3(arrow.rotation);
    arrow.root.rotation.set(...rotation);

    console.log(UTILS.dumpObject(arrow.root));
}


// ============================================================================
// SCENE BUILDING FUNCTIONS
// ============================================================================

// Scene
function buildScene() {
    scene = new THREE.Scene();

    if ( daylight === 'day' ) {
        scene.background = new THREE.Color( daylightBackgroundColor );
    } else {
        scene.background = new THREE.Color( nightBackgroundColor );
    }

    createLights();
    // createFog();

    buildTerrain();  
    buildModels();

    buildCameras();

    gameState.sceneBuilt = true;
    currentCamera = thirdPersonCamera;
}

function createFog() {
    scene.fog = new THREE.Fog( daylightBackgroundColor, fogNear, fogFar );
}

// Cameras
function buildFirstPersonCamera() {
    firstPersonCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);    
    // const bow = modelsMap.link.root.getObjectByName('Bow');
    const bow = models.bow.root;

    firstPersonCamera.position.set( ...firstPersonCameraPosition );
    firstPersonCamera.lookAt( ...firstPersonCameraTarget );
    
    bow.add( firstPersonCamera );
}

function buildThirdPersonCamera() {
    const link = models.link.root;

    const thirdPersonCameraPosition = [ link.position.x, link.position.y + 3, link.position.z - 5 ];
    const thirdPersonCameraTarget = [ link.position.x, link.position.y + 2 , link.position.z ];

    thirdPersonCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);    

    thirdPersonCamera.position.set( ...thirdPersonCameraPosition );
    thirdPersonCamera.lookAt( ...thirdPersonCameraTarget );
    
    link.add( thirdPersonCamera );
}

function buildArrowCamera() {
    const arrow = models.arrow.root;

    const yOffset = 0.1;
    const zOffset = 0.2;

    const arrowCameraPosition = [ arrow.position.x, arrow.position.y + yOffset, arrow.position.z + zOffset];
    const arrowCameraTarget = [ arrow.position.x, arrow.position.y + yOffset, arrow.position.z + zOffset + 1 ];

    arrowCamera = new THREE.PerspectiveCamera(2*fov, aspect, near, far);

    arrowCamera.position.set( ...arrowCameraPosition );
    arrowCamera.lookAt( ...arrowCameraTarget );

    arrow.add( arrowCamera );
}

function buildCameras() {
    buildFirstPersonCamera();
    buildThirdPersonCamera();
    buildArrowCamera();

    cameras = [thirdPersonCamera, firstPersonCamera];
}

// Lights
function createSun() {
    
    // Create the sun
    const sphereGeometry = new THREE.SphereBufferGeometry(1, sunWidthSegments, sunHeightSegments);
    
    const sunMaterial = new THREE.MeshBasicMaterial({color: sunColor});
    const sun = new THREE.Mesh(sphereGeometry, sunMaterial);
    sun.scale.set(sunRadius, sunRadius, sunRadius); 

    sun.position.set( ...sunPosition );
    sun.position.multiplyScalar( lightDistance );

    // Create the sunlight
    light = new THREE.DirectionalLight( sunlightColor, sunlightIntensity );
    light.position.set( ...sunPosition );
    light.position.multiplyScalar( lightDistance );
    light.target.position.set( ...lightTarget );

    light.castShadow = true;

    light.shadow.camera.left = - lightShadowCameraWidth;
    light.shadow.camera.right = lightShadowCameraWidth;
    light.shadow.camera.top = lightShadowCameraHeight;
    light.shadow.camera.bottom = - lightShadowCameraHeight;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = lightShadowCameraDepth;

    light.shadow.mapSize.width = lightShadowMapWidth;
    light.shadow.mapSize.height = lightShadowMapHeight;

    scene.add( sun );
    scene.add( light );
}

function createMoon() {
    
    // Create the moon
    const sphereGeometry = new THREE.SphereBufferGeometry(1, sunWidthSegments, sunHeightSegments);
    
    const moonMaterial = new THREE.MeshBasicMaterial({color: moonColor});
    const moon = new THREE.Mesh(sphereGeometry, moonMaterial);
    moon.scale.set(sunRadius, sunRadius, sunRadius); 

    moon.position.set( ...moonPosition );
    moon.position.multiplyScalar( lightDistance );

    // Create the moonlight
    var light = new THREE.DirectionalLight( moonlightColor, moonlightIntensity );
    light.position.set( ...moonPosition );
    light.position.multiplyScalar( lightDistance );
    light.target.position.set( ...lightTarget );

    light.castShadow = true;

    light.shadow.camera.left = - lightShadowCameraWidth;
    light.shadow.camera.right = lightShadowCameraWidth;
    light.shadow.camera.top = lightShadowCameraHeight;
    light.shadow.camera.bottom = - lightShadowCameraHeight;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = lightShadowCameraDepth;

    light.shadow.mapSize.width = lightShadowMapWidth;
    light.shadow.mapSize.height = lightShadowMapHeight;

    scene.add( moon );
    scene.add( light );
}

function createAmbientDaylight() {
    ambient = new THREE.AmbientLight(ambientDaylightColor, ambientDaylightIntensity);
    scene.add( ambient );
}

function createAmbientNightLight() {
    ambient = new THREE.AmbientLight(ambientNightColor, ambientNightIntensity);
    scene.add( ambient );
}

function createLights() {
    if ( daylight === 'day' ) {
        createSun();
        createAmbientDaylight();
    } else {
        createMoon();
        createAmbientNightLight();
    }
}

// Ground
function buildTerrain() {
    var terrainTexture = textureLoader.load( '../assets/textures/grass_texture.png' );
    terrainTexture.wrapS = terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set( terrainTextureRepeat, terrainTextureRepeat );
    terrainTexture.anisotropy = terrainTextureAnisotropy;
    terrainTexture.encoding = THREE.sRGBEncoding;
    terrainTexture.magFilter = THREE.LinearFilter;
    terrainTexture.minFilter = THREE.LinearMipmapLinearFilter;

    var terrainMaterial = new THREE.MeshLambertMaterial( { map: terrainTexture } );

    var terrain = new THREE.Mesh( new THREE.PlaneBufferGeometry( terrainWidth, terrainWidth ), terrainMaterial );
    terrain.position.y = 0;
    terrain.rotation.x = - Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add( terrain );
}

// ============================================================================
// HANDLING FUNCTIONS
// ============================================================================

function handleLinkCollision(collidedObject) {
    const link = models.link.root
    const linkPosition = link.position;
    const objPosition = collidedObject.position;

    // Get displacement vector
    var displacement = new THREE.Vector3();
    displacement.copy(objPosition);
    displacement.sub(linkPosition);
    displacement.normalize();

    // Account for link's rotation
    const yAxis = new THREE.Vector3(0, 1, 0);
    var linkRotation = link.rotation.y;
    displacement.applyAxisAngle( yAxis, linkRotation );

    if ( Math.abs(displacement.x) > Math.abs(displacement.z) ) {
        // Left/Right collision
        if ( displacement.x >= 0 ) {
            // console.log("Link collision right!");
            linkCollision.right = true;
        } else {
            // console.log("Link collision left!");
            linkCollision.left = true;
        }
    } else {
        // Forward/Backward collision
        if ( displacement.z >= 0 ) {
            // console.log("Link collision forward!");
            linkCollision.forward = true;
        } else {
            // console.log("Link collision backward!");
            linkCollision.backward = true;
        }
    }
}

function handleArrowCollision(collidedObject) {
    if ( gameState.arrowFlying ) {
        console.log("Target hit!");
        stopArrowFlight();
    }
}

function setCollider(object, collidableObjects, handleCollisionCallback) {

    var objectBox = new THREE.Box3();
    
    var collidableObject;
    var collidableBox = new THREE.Box3();

    var collider = function() {
        objectBox.setFromObject(object);
        
        for (var i = 0; i < collidableObjects.length; i++) {    
            
            collidableObject = collidableObjects[i];
            collidableBox.setFromObject(collidableObject);
            
            if ( objectBox.intersectsBox(collidableBox) ) {
                // a collision occurred... do something...
                handleCollisionCallback(collidableObject);
            }
        }
    }
    
    return collider;
}

function setLinkCollider() {
    const link = models.link.root;
    const target = models.target.root;

    const collidableObjects = [target];

    models.link.collider = setCollider(link, collidableObjects, handleLinkCollision);
}

function setArrowCollider() {
    const arrow = models.arrow.root;
    const target = models.target.root;

    const collideableTarget = target.getObjectByName('TargetObject');

    const collideableObjects = [target];

    models.arrow.collider = setCollider(arrow, collideableObjects, handleArrowCollision);
}

function setColliders() {
    setLinkCollider();
    setArrowCollider();
}

function checkCollisions() {
    models.link.collider();
    models.arrow.collider();
}

function switchCamera() {
    
    if (gameState.gamePaused) return;
    if (gameState.arrowFlying) return;

    currentCameraIdx = (currentCameraIdx + 1) % cameras.length;
    currentCamera = cameras[currentCameraIdx];

    if ( currentCamera === firstPersonCamera ) {
        document.querySelector( '#crosshair' ).hidden = false;
    } else {
        document.querySelector( '#crosshair' ).hidden = true;
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
    gameControls.push(playerControls);
}

function setLinkMovementControls() {

    const link = models.link.root;
    playerControls = new MovementPointerLockControls( link, document.body );
    
    playerControls.enableMouseVertical = false;

    var onKeyDown = function ( event ) {

        switch ( event.keyCode ) {

            case 38: // up
            case 87: // w
                linkMovement.forward = true;
                break;

            case 37: // left
            case 65: // a
                linkMovement.left = true;
                break;

            case 40: // down
            case 83: // s
                linkMovement.backward = true;
                break;

            case 39: // right
            case 68: // d
                linkMovement.right = true;
                break;

            // case 32: // space
            //     if ( canJump === true ) linkVelocity.y += linkJumpSpeed;
            //     canJump = false;
            //     break;
        }
    };

    var onKeyUp = function ( event ) {

        switch ( event.keyCode ) {

            case 38: // up
            case 87: // w
                linkMovement.forward = false;
                break;

            case 37: // left
            case 65: // a
                linkMovement.left = false;
                break;

            case 40: // down
            case 83: // s
                linkMovement.backward = false;
                break;

            case 39: // right
            case 68: // d
                linkMovement.right = false;
                break;

        }

    };

    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );

    gameControls.push(playerControls);
}

function setLinkAimControls() {

    const link = models.link;
    
    const armL = link.joints.upper.left.arm;
    const armR = link.joints.upper.right.arm;

    const head = link.joints.upper.head;

    // Controls for left and right arm (and bow)
    var bowControlsArmL = new AimPointerLockControls( armL, document.body );
    var bowControlsArmR = new AimPointerLockControls( armR, document.body );
    
    // Controls for link's head
    var headControls = new HeadPointerLockControls( head, document.body, )

    // Settings
    bowControlsArmR.inverted = true;
    bowControlsArmR.correctX = true;
    bowControlsArmR.correction = 0.002;

    headControls.increment = 0.05;
    
    // Assign listeners
    bowControlsArmL.minPolarAngle = -0.75 * Math.PI;
    bowControlsArmL.maxPolarAngle = -0.25 * Math.PI;
    gameControls.push(bowControlsArmL);

    bowControlsArmR.minPolarAngle = 0.25 * Math.PI;
    bowControlsArmR.maxPolarAngle = 0.75 * Math.PI;
    gameControls.push(bowControlsArmR);

    headControls.minPolarAngle = -0.1 * Math.PI;
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
        if (gameState.gamePaused) return;
        if (!gameState.canShoot) return;
        if (gameState.shooting) return;

        gameState.shooting = true;
        gameState.shootInitTime = performance.now();
        startNockingArrowAnimation();
    };

    var onClickRelease = function (event) {
        if (gameState.gamePaused) return;
        if (!gameState.shooting) return;

        gameState.canShoot = false;
        gameState.shootFinalTime = performance.now();
        gameState.shooting = false;
        startArrowAnimation();
    };

    document.addEventListener('mousedown', onClickPressed, false);
    document.addEventListener('mouseup', onClickRelease, false);
    gameControls.push(playerControls);
}

function setListeners(controls) {
    pauseScreen.addEventListener( 'click', function () {

        controls.lock();

    }, false );

    controls.addEventListener( 'lock', function () {
        document.querySelector( '#pauseScreen' ).hidden = true;
        gameState.gamePaused = false;
    } );

    controls.addEventListener( 'unlock', function () {
        document.querySelector( '#pauseScreen' ).hidden = false;
        gameState.gamePaused = true;
    } );
}

function setControls() {
    // setOrbitControls();
    setLinkMovementControls();
    setLinkAimControls();
    setShootControls();
    setCameraControls();

    gameControls.forEach(
        (controls) => {
            setListeners(controls);
        }
    );

    setColliders();

    gameState.controlsSet = true;
}

function lockControls() {
    gameControls.forEach(
        (controls) => {
            controls.lock();
        }
    );
}

function onWindowResize() {
    thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
    thirdPersonCamera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
 
// ============================================================================
// ANIMATION FUNCTIONS
// ============================================================================

function startNockingArrowAnimation() {
    const link = models.link;
    const arrow = models.arrow.root;

    const bowString = models.bow.joints.string;
    const spine001 = link.joints.upper.spine001;
    const spine002 = link.joints.upper.spine002;
    const spine003 = link.joints.upper.spine003;
    const armL = link.joints.upper.left.arm;
    const armR = link.joints.upper.right.arm;
    const forearmR = link.joints.upper.right.forearm;
    const head = link.joints.upper.head;

    // Recording initial position
    const spine001Angle = spine001.rotation.y;
    const spine002Angle = spine002.rotation.y;
    const spine003Angle = spine003.rotation.y;
    const armLAngle = armL.rotation.y;
    const armRAngle = armR.rotation.y;
    const forearmRAngle = forearmR.rotation.y;
    const headAngle = head.rotation.y;

    const arrowPosition = arrow.position.z;

    var delta = { dz: 0.0, dAngle: 0.0 };
    nockTween = new TWEEN.Tween( delta )
    .to({dz: bowStringMaxStretching, dAngle: 0.2*Math.PI}, 1000*maxCharge)
    .easing(TWEEN.Easing.Quadratic.In)
    .onUpdate(
        () => {
            arrow.position.z = arrowPosition - delta.dz;
            nockingAmount = delta.dz;

            spine001.rotation.y = spine001Angle - delta.dAngle;
            spine002.rotation.y = spine002Angle - delta.dAngle;
            spine003.rotation.y = spine003Angle - delta.dAngle;

            armR.rotation.y = armRAngle + delta.dAngle;
            forearmR.rotation.y = forearmRAngle + delta.dAngle;

            armL.rotation.y = armLAngle + 3*delta.dAngle;
            head.rotation.y = headAngle + 3*delta.dAngle;
        }
    )
    .onComplete(
        () => {
            console.log("Max nocking!");
        }
    )
    .start();
}

function computeArrowDirection() {
    const arrow = models.arrow.root;
    
    var dir = new THREE.Vector3();
    arrow.getWorldDirection(dir);
    return dir;
}

function computeArrowInitialVelocity(direction) {
    var charge = (gameState.shootFinalTime - gameState.shootInitTime) * 0.001;
    var deltaT = Math.min(charge, maxCharge);

    var impulse = arrowForce * deltaT;
    var initialSpeed = impulse / arrowMass;
    var initialVelocity = direction.multiplyScalar(initialSpeed);
    return initialVelocity;
}

function restoreLinkLowerLimbs() {
    const linkJoints = models.link.joints;

    linkJoints.lower.left.thigh.rotation.copy(linkRestJoints.lower.left.thigh);
    linkJoints.lower.left.shin.rotation.copy(linkRestJoints.lower.left.shin);
    linkJoints.lower.right.thigh.rotation.copy(linkRestJoints.lower.right.thigh);
    linkJoints.lower.right.shin.rotation.copy(linkRestJoints.lower.right.shin);
}

function restoreLinkUpperLimbs() {
    const link = models.link;

    const spine001 = link.joints.upper.spine001;
    const spine002 = link.joints.upper.spine002;
    const spine003 = link.joints.upper.spine003;
    const armL = link.joints.upper.left.arm;
    const armR = link.joints.upper.right.arm;
    const forearmR = link.joints.upper.right.forearm;
    const head = link.joints.upper.head;

    spine001.rotation.copy(linkRestJoints.upper.spine001);
    spine002.rotation.copy(linkRestJoints.upper.spine002);
    spine003.rotation.copy(linkRestJoints.upper.spine003);
    head.rotation.copy(linkRestJoints.upper.head);

    armL.rotation.copy(linkRestJoints.upper.left.arm);
    armR.rotation.copy(linkRestJoints.upper.right.arm);
    forearmR.rotation.copy(linkRestJoints.upper.right.forearm);
}

function animateLinkMovement(time) {
    var dt = ( time - prevTime ) / 1000;

    // Apply friction
    linkVelocity.x -= linkVelocity.x * floorFriction * dt;
    linkVelocity.z -= linkVelocity.z * floorFriction * dt;

    // Update velocity based on current direction
    linkDirection.z = Number( linkMovement.backward ) - Number( linkMovement.forward );
    linkDirection.x = Number( linkMovement.left ) - Number( linkMovement.right );
    linkDirection.normalize(); // this ensures consistent movements in all directions

    if ( linkMovement.forward && !linkCollision.forward ) {
        linkVelocity.z += linkDirection.z * linkMovementSpeed * dt;
    }
    if ( linkMovement.backward && !linkCollision.backward ) {
        linkVelocity.z += linkDirection.z * linkMovementSpeed * dt;
    }
    if ( linkMovement.left && !linkCollision.left ) {
        linkVelocity.x += linkDirection.x * linkMovementSpeed * dt;
    }
    if ( linkMovement.right && !linkCollision.right ) {
        linkVelocity.x += linkDirection.x * linkMovementSpeed * dt;
    }

    // Update position
    playerControls.moveRight( linkVelocity.x * dt );
    playerControls.moveForward( linkVelocity.z * dt );
    
    if ( (Math.abs(linkVelocity.z) >= linkMovementThreshold) || (Math.abs(linkVelocity.x) >= linkMovementThreshold) ) {
        // Start animation if movement
        startLinkWalkAnimation();
    } else {
        // Stop animation if no movement
        stopLinkWalkAnimation();
        restoreLinkLowerLimbs();
    }

    // Update vertical position
    playerControls.getObject().position.y += ( linkVelocity.y * dt ); 

    // Check vertical position (no infinite falling)
    if ( playerControls.getObject().position.y < 0 ) {
        linkVelocity.y = 0;
        playerControls.getObject().position.y = 0;
        // canJump = true;
    } else {
        linkVelocity.y -= g * linkMass * dt; 
    }

    // Reset collisions
    linkCollision.forward = false;
    linkCollision.backward = false;
    linkCollision.left = false;
    linkCollision.right = false;
}

function startLinkWalkAnimation() {
    const linkJoints = models.link.joints;

    // Set initial position for lower limbs
    if ( linkMovementTweens.length != 0 ) return;
    
    restoreLinkLowerLimbs();

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
    linkMovementTweens.push(thighTween1);
    linkMovementTweens.push(shinTween1);

    linkMovementTweens.push(thighTween2);
    linkMovementTweens.push(shinTween2);
    
    linkMovementTweens.push(thighTween3);
    linkMovementTweens.push(shinTween3);

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

function stopLinkWalkAnimation() {
    UTILS.stopTweens(linkMovementTweens);
    linkMovementTweens = [];
}

function startArrowAnimation() {    
    console.log("Arrow shot!");

    const bow = models.bow.root;
    const handR = models.link.joints.upper.right.hand;
    const bowString = models.bow.joints.string;
    const arrow = models.arrow.root;

    bow.attach(bowString);
    scene.attach(arrow);

    // Compute arrow trajectory
    var dir = computeArrowDirection();

    // Initial position
    var arrowInitialPosition = new THREE.Vector3();
    arrow.getWorldPosition(arrowInitialPosition);

    // Initial velocity
    var arrowInitialVelocity = computeArrowInitialVelocity(dir);

    arrowVelocity.copy(arrowInitialVelocity);

    // Create tween to shoot arrow
    const arrowPosition = arrow.position.z;
    
    var delta = {dz: nockingAmount};
    var shootTween = new TWEEN.Tween(delta)
    .to({dz: 0.0}, 0.1)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(
        () => {
            arrow.position.z = arrowPosition + (nockingAmount - delta.dz);
        }
    )
    .onComplete(
        () => {
            gameState.shooting = false;
            gameState.arrowFlying = true;

            currentCamera = arrowCamera;
            handR.attach(bowString);
            restoreLinkUpperLimbs();
        }
    );
    
    nockTween.stop();
    shootTween.start();
}

function animateArrowFlight(time) {
    var dt = ( time - prevTime ) / 1000;
    const groundLevel = 2.0;

    const arrow = models.arrow.root;
    arrowVelocity.addScaledVector(arrowAcceleration, dt);
    
    arrowDirection.copy(arrowVelocity)
    arrowDirection.normalize();
    arrow.position.addScaledVector(arrowVelocity, 5*dt);

    arrow.rotateX(Math.PI * Math.abs(arrowDirection.y) * 0.5 * dt);
    
    if ( arrow.position.y < groundLevel ) {
        stopArrowFlight();
    }
}

function repositionArrow() {
    const arrow = models.arrow.root;
    var bow = models.bow.root;

    bow.attach(arrow);

    arrow.position.x = 0.0;
    arrow.position.y = 0.0;
    arrow.position.z = 0.0;

    arrow.rotation.x = 0.0;
    arrow.rotation.y = 0.0;
    arrow.rotation.z = 0.0;
}

function stopArrowFlight() {
    gameState.arrowFlying = false;

    console.log("Arrow landed!");

    var delayedStopArrowTween = new TWEEN.Tween({})
    .to({}, 1000)
    .onComplete(
        () => {
            currentCamera = cameras[currentCameraIdx];
            repositionArrow();
            gameState.canShoot = true;
        })
    .start();
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

function render(time) {
    if ( !gameState.gamePaused ) {
        checkCollisions();
        
        TWEEN.update();
        animateLinkMovement(time);

        if ( gameState.arrowFlying ) {
            animateArrowFlight(time);
        }
    
        prevTime = time;
        renderer.render(scene, currentCamera);
    }
    requestAnimationFrame(render);
}

export function main() {
    if ( !gameState.optionsSet ) {
        setOptions();
        main();
    }

    if ( !gameState.guiInitialized ) {
        initGUI();
        main();
    }

    if ( !gameState.modelsLoaded ) {
        loadAssets();
        return;
        // main();
    }
    
    if ( !gameState.sceneBuilt ) {
        initWebGL();
        buildScene();
        main();
    }

    if ( !gameState.controlsSet ) {
        setControls();
        main();
    } else {
        lockControls();
        gameState.canShoot = true;
    }
    
    requestAnimationFrame(render);
}