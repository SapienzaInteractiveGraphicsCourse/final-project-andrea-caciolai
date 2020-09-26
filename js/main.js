import * as THREE from '../lib/three.js/build/three.module.js'
import {GLTFLoader} from '../lib/three.js/examples/jsm/loaders/GLTFLoader.js'

import { CameraOrbitControls, CameraPointerLockControls, AimPointerLockControls, HeadPointerLockControls } from './controls.js';
import TWEEN from '../lib/tween.js/dist/tween.esm.js'

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
    gameOver: false,
    optionsSet: false,
    guiInitialized: false,
    modelsLoaded: false,
    sceneBuilt: false,
    controlsSet: false,
    canWalk: true,
    walking: true,
    canAim: false,
    aiming: false,
    canShoot: false,
    nocking: false,
    nockingInitTime: null,
    nockingFinalTime: null,
    arrowFlying: false,
};

var difficulty;
var daylight;

// Objects variables
var scene;
var light;
var ambient;

var currentCamera;

var firstPersonCamera;
var thirdPersonCamera;
var thirdPersonCameraPivot;
var arrowCamera;

var cameras;
var trees = [];

// Camera parameters
const fov = 45;
const aspect = window.innerWidth / window.innerHeight; 
const near = 0.1;
const far = 100000;

const fogNear = 50;
const fogFar = 1000;
const daylightBackgroundColor = 0xcce0ff;
const nightBackgroundColor = 0x070B34;

// Terrain parameters
const terrainWidth = 500;
const terrainTextureRepeat = 32;
const terrainTextureAnisotropy = 16;

// Map limits
const mapLimitForward = 10.0;
const mapLimitBackward = -terrainWidth/2 + 20.0;
const mapLimitLeft = -terrainWidth/2 + 20.0;
const mapLimitRight = terrainWidth/2 - 20.0;

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
const lightShadowCameraFar = 1024;

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
                    heel: null,
                    toe: null,
                },
                right: {
                    thigh: null,
                    shin: null,
                    foot: null,
                    heel: null,
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
        url: '../assets/models/new_target/new_target.gltf',
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
    },
    tree: {
        url: '../assets/models/new_tree/new_tree.gltf',
        rotation: [0, 0, 0],
        scale: 3,
        buildCallback: buildTrees,
    }
};

loadModelsList = [models.link, models.target, models.arrow, models.tree];

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
            heel: null,
            toe: null,
        },
        right: {
            thigh: null,
            shin: null,
            foot: null,
            heel: null,
            toe: null
        },
    }   
}

const floorFriction = 10.0;
const linkMovementSpeed = 500.0;

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
const arrowForce = 20.0;
const arrowMass = 1.0; 
const maxCharge = 2.0;

var arrowsLeft = 3;
var arrowHits = 0;

// Target movement
var targetMovementTweens = [];

// Controls variables

var linkThirdCameraControls;
var linkFirstCameraControls;

var aimControlsArmL;
var aimControlsArmR;
var aimControlsHead;
var gameControls = [];

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

function initLoadingScreen() {
    // Hide game menu
    document.querySelector( '#gameMenu' ).hidden = true;

    // Show loading screen
    document.querySelector( '#loadingScreen' ).hidden = false;

    // Hide pause screen
    document.querySelector( '#pauseScreen' ).hidden = true;


    // Hide crosshair
    document.querySelector( '#crosshair' ).hidden = true;


    gameState.guiInitialized = true;
}

function setOptions() {
    difficulty = $("#difficultySelect :selected").val(); 
    daylight = $('input[name=daylightRadio]:checked', '#daylightForm').val()

    gameState.optionsSet = true;
}

// ============================================================================
// MODEL(s) CODE 
// ============================================================================

function loadModels() {   
    loadingManager.onLoad = function() {
        // console.log('Loading complete!');
        document.querySelector('#loadingScreen').classList.add( 'fade-out' );
        
        document.querySelector('#arrowsDiv').hidden = false;

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
            if (obj.name === 'heel02L') {
                link.joints.lower.left.heel = obj;
                linkRestJoints.lower.left.heel = new THREE.Euler();
                linkRestJoints.lower.left.heel.copy(obj.rotation);
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
            if (obj.name === 'heel02R') {
                link.joints.lower.right.heel = obj;
                linkRestJoints.lower.right.heel = new THREE.Euler();
                linkRestJoints.lower.right.heel.copy(obj.rotation);
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
    // setLinkPosition();
    link.root.scale.multiplyScalar(link.scale);
    const rotation = UTILS.degToRad3(link.rotation);
    link.root.rotation.set(...rotation);

    scene.add( link.root );
    
    buildBow();

    initLinkJoints();

    // Compute bounding box
    link.root.traverse((mesh) => {
        if (mesh.isMesh) {
            mesh.geometry.computeBoundingBox();
        }
    });

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

    // Compute bounding box
    target.root.traverse((mesh) => {
        if (mesh.isMesh) {
            mesh.geometry.computeBoundingBox();
        }
    });

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

    // Compute bounding box
    arrow.root.traverse((mesh) => {
        if (mesh.isMesh) {
            mesh.geometry.computeBoundingBox();
        }
    });

    console.log(UTILS.dumpObject(arrow.root));
}

function buildTree(idx, position, rotation) {
    var tree = new THREE.Object3D();
    tree.name = "Tree" + idx;
    tree.add(models.tree.gltf.scene.children[0].clone());

    tree.position.set(...position);
    tree.scale.multiplyScalar(models.tree.scale);
    tree.rotation.set(...rotation);

    scene.add( tree );
    trees.push( tree );
}

function buildTrees() {

    const numTrees = 5;
    const treeWidth = 0;
    const offset = (terrainWidth - 2*treeWidth) / numTrees;
    
    var position = [terrainWidth/2 - treeWidth, 0, terrainWidth/2 - treeWidth];
    var rotation = [0, 0, 0];

    // Trees on the front
    for (var i = 0; i < numTrees; i++) {
        buildTree(i, position, rotation);
        position[0] -= offset;
    }
    rotation[1] -= 0.5 * Math.PI;

    // Trees on the right
    for (var i = numTrees; i < 2*numTrees; i++) {
        buildTree(i, position, rotation);
        position[2] -= offset;
    }
    rotation[1] -= 0.5 * Math.PI;

    // Trees on the back
    for (var i = 2*numTrees; i < 3*numTrees; i++) {
        buildTree(i, position, rotation);
        position[0] += offset;
    }
    rotation[1] -= 0.5 * Math.PI;

    // Trees on the left
    for (var i = 3*numTrees; i < 4*numTrees; i++) {
        buildTree(i, position, rotation);
        position[2] += offset;
    }
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
    const bow = models.bow.root;
    
    const firstPersonCameraPosition = [ 2.0, 3.0, -12.0 ];
    const firstPersonCameraTarget = [ 2.0, 3.0, 1.0 ];

    firstPersonCamera.position.set( ...firstPersonCameraPosition );
    firstPersonCamera.lookAt( ...firstPersonCameraTarget );
    
    bow.add( firstPersonCamera );
}

function buildThirdPersonCamera() {
    const link = models.link.root;

    const thirdPersonCameraPosition = [ 0, 3, - 5 ];
    const thirdPersonCameraTarget = [ link.position.x, link.position.y + 2 , link.position.z ];

    thirdPersonCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);    

    thirdPersonCameraPivot = new THREE.Object3D();
    thirdPersonCameraPivot.position.set( ...thirdPersonCameraTarget );
    
    // link.add( thirdPersonCamera );
    link.add(thirdPersonCameraPivot);
    thirdPersonCameraPivot.add(thirdPersonCamera);
    
    thirdPersonCamera.position.set( ...thirdPersonCameraPosition );
    thirdPersonCamera.lookAt( ...thirdPersonCameraTarget );
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

    cameras = {
        third: thirdPersonCamera, 
        first: firstPersonCamera,
        arrow: arrowCamera
    };
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
    light.shadow.camera.far = lightShadowCameraFar;

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
    light.shadow.camera.far = lightShadowCameraFar;

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

function randomHeightTerrain(terrainGeometry) {
    var vertices = terrainGeometry.attributes.position.array;
    var noise;
    const scale = 2;

    for (var i = 0; i < vertices.length; i++) {
        noise = Math.random();
        vertices[i] += scale*noise;
    }
}

function buildTerrain() {
    var terrainTexture = textureLoader.load( '../assets/textures/grass_texture.png' );
    terrainTexture.wrapS = terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set( terrainTextureRepeat, terrainTextureRepeat );
    terrainTexture.anisotropy = terrainTextureAnisotropy;
    terrainTexture.encoding = THREE.sRGBEncoding;
    terrainTexture.magFilter = THREE.LinearFilter;
    terrainTexture.minFilter = THREE.LinearMipmapLinearFilter;

    var terrainMaterial = new THREE.MeshLambertMaterial( { map: terrainTexture } );

    var terrainGeometry = new THREE.PlaneBufferGeometry( terrainWidth, terrainWidth, terrainTextureRepeat, terrainTextureRepeat );

    // randomHeightTerrain(terrainGeometry);

    var terrain = new THREE.Mesh(terrainGeometry, terrainMaterial );

    terrain.position.y = 0;
    terrain.rotation.x = - Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add( terrain );
}

// ============================================================================
// HANDLING FUNCTIONS
// ============================================================================

// Game state handling
function checkGameOver() {
    if ( arrowsLeft <= 0 ) {
        console.log("GAME OVER!");
        gameOver();
    }
}

function gameOver() {
    gameState.gameOver = true;

    // Unlock game controls
    gameControls.forEach((controls) => {
        controls.unlock();
    });

    // Stop all tweens
    UTILS.stopTweens(linkMovementTweens);
    UTILS.stopTweens(targetMovementTweens);
    nockTween.stop();

    // Show game over screen
    var gameOverDiv = document.querySelector("#gameOverDiv");
    gameOverDiv.innerHTML += "You hit the target " + arrowHits + " times!<br/><br/>Reload the page to play again!"  

    document.querySelector("#arrowsDiv").hidden = true;
    document.querySelector("#gameOverScreen").hidden = false;
}

function unpauseGame() {
    document.querySelector( '#pauseScreen' ).hidden = true;
    gameState.gamePaused = false;

    UTILS.resumeTweens(linkMovementTweens);
    UTILS.resumeTweens(targetMovementTweens);
    if (nockTween !== undefined ) {
        nockTween.resume();        
    }
}

function pauseGame() {
    document.querySelector( '#pauseScreen' ).hidden = false;
    gameState.gamePaused = true;

    UTILS.pauseTweens(linkMovementTweens);
    UTILS.pauseTweens(targetMovementTweens);
    
    if (nockTween !== undefined ) {
        nockTween.pause();        
    }
}

// Collisions
function handleLinkCollision(collidedObject) {
    const link = models.link.root;
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

    const eps = 1e-6;

    if ( Math.abs(displacement.x) >= eps ) {
        // Left/Right collision
        if ( displacement.x >= 0 ) {
            linkCollision.right = true;
        } else {
            linkCollision.left = true;
        }
    }
    if ( Math.abs(displacement.z) >= eps ) {
        // Forward/Backward collision
        if ( displacement.z >= 0 ) {
            linkCollision.forward = true;
        } else {
            linkCollision.backward = true;
        }
    }
}

function handleArrowCollision(collidedObject) {
    if ( !gameState.arrowFlying ) return;

    if ( collidedObject.name === "Bullseye" ) {
        console.log("Target hit!");
        registerArrowHit();
    }

    stopArrowFlight();
    collidedObject.attach( models.arrow.root );
}

function registerArrowHit() {
    arrowHits += 1;
}

function registerArrowMiss() {

    var imgName = "arrowImg" + arrowsLeft;
    document.querySelector("#"+imgName).style.visibility = "hidden";
    
    arrowsLeft -= 1;
}

function setRaycasterCollider(object, collideableObjects, handleCollisionCallback) {
    var raycaster = new THREE.Raycaster();
    var origin = new THREE.Vector3();
    var direction = new THREE.Vector3();
    var results;
    var closest;

    const threshold = 1;

    var collider = function() {
        origin.copy(object.position);
        object.getWorldDirection(direction);
        
        raycaster.set(origin, direction);
        results = raycaster.intersectObjects(collideableObjects);
        
        console.log(results);
        
        if (results.length <= 0) return; 
        closest = results[0];
        
        if ( closest.distance < threshold ) {
            // Collision detected
            handleCollisionCallback(closest.object);
        }
    }

    return collider;
}

function setBoxCollider(object, collidableObjects, handleCollisionCallback) {

    var objBox = new THREE.Box3();
    var collBox = new THREE.Box3();
    var collObj;

    var collider = function() {
        var collisionDetected = false;

        object.traverse((objMesh) => {
            if (collisionDetected) return;
            if (!objMesh.isMesh) return;

            objBox.copy( objMesh.geometry.boundingBox ).applyMatrix4( objMesh.matrixWorld );

            for (var i = 0; i < collidableObjects.length; i++) {    
                collObj = collidableObjects[i];
                collObj.traverse((collMesh) => {
                    if (collisionDetected) return;
                    if (!collMesh.isMesh) return;

                    collBox.copy( collMesh.geometry.boundingBox ).applyMatrix4( collMesh.matrixWorld );

                    if ( objBox.intersectsBox(collBox) ) {
                        // a collision occurred... do something...
                        handleCollisionCallback(collObj);
                    }
                });
            }
        });
    }
    
    return collider;
}

function setLinkColliders() {
    const link = models.link.root;
    const target = models.target.root;

    const collidableObjects = [target];

    // trees.forEach((tree) => {collidableObjects.push(tree)});

    models.link.colliders = [];
    models.link.colliders.push(setBoxCollider(link, collidableObjects, handleLinkCollision));

}

function setArrowColliders() {
    const arrow = models.arrow.root;
    const target = models.target.root;

    const collideableTarget = target.getObjectByName('Bullseye');

    const collideableObjects = [collideableTarget];

    // trees.forEach((tree) => {collideableObjects.push(tree)});

    models.arrow.colliders = [];
    // models.arrow.colliders.push(setRaycasterCollider(arrow, collideableObjects, handleArrowCollision));
    models.arrow.colliders.push(setBoxCollider(arrow, collideableObjects, handleArrowCollision));

}

function setColliders() {
    setLinkColliders();
    setArrowColliders();
}

function checkCollisions() {
    models.link.colliders.forEach((collider) => {
        collider();
    });
    models.arrow.colliders.forEach((collider) => {
        collider();
    });
}

// Controls
function setFirstPersonCamera() {
    if (gameState.gamePaused) return;
    if (gameState.arrowFlying) return;
    
    currentCamera = cameras.first;
    linkFirstCameraControls.enabled = true;
    linkThirdCameraControls.enabled = false;
    document.querySelector( '#crosshair' ).hidden = false;
}

function setThirdPersonCamera() {
    if (gameState.gamePaused) return;
    if (gameState.arrowFlying) return;
    
    // Restore link orientation
    
    if (!gameState.nocking) models.link.root.rotation.set(0, 0, 0);
    currentCamera = cameras.third;
    
    linkFirstCameraControls.enabled = false;
    linkThirdCameraControls.enabled = true;
    document.querySelector( '#crosshair' ).hidden = true;
}

function setAimListeners() {
    var onMouseClick = function (event) {
        if (gameState.gamePaused) return;
        if (gameState.gameOver) return;
        if (!gameState.canAim) return;

        if (event.button === 2) {
            // Right mouse clicked
            
            if (gameState.walking) stopLinkWalkAnimation();
            enableAimControls();
            gameState.aiming = true;
            gameState.canAim = false;
            setFirstPersonCamera();
            if (gameState.walking) startLinkWalkAnimation();
        }
    };

    var onMouseRelease = function (event) {
        if (gameState.gamePaused) return;
        if (gameState.gameOver) return;
        if (!gameState.aiming) return;

        if ( event.button === 2 ) {
            // Right mouse released
            gameState.aiming = false;
            gameState.canAim = true;
            setThirdPersonCamera();
            
            if (!gameState.nocking && gameState.walking) startLinkUpperWalkAnimation();
        }
    };
    
    document.addEventListener('mousedown', onMouseClick, false);
    document.addEventListener('mouseup', onMouseRelease, false);
}

function setShootListeners () {
    var onMouseClick = function (event) {
        if (gameState.gamePaused) return;
        if (gameState.gameOver) return;

        if ( event.button === 0 ){
            // Left mouse clicked
            
            if (!gameState.canShoot) return;
            if (gameState.nocking) return;

            gameState.nocking = true;
            gameState.walking = false;
            gameState.canWalk = false;
            
            stopLinkWalkAnimation();

            if (!gameState.aiming) {
                // Rotate link towards direction of third camera
                scene.attach(thirdPersonCameraPivot);
                models.link.root.rotation.y = thirdPersonCameraPivot.rotation.z;
                models.link.root.attach(thirdPersonCameraPivot);

                // Keep third camera but enable controls
                // gameState.canAim = false;
                enableAimControls();
                linkFirstCameraControls.enabled = true;
                linkThirdCameraControls.enabled = false;
            }
            
            gameState.nockingInitTime = performance.now();
            startNockingArrowAnimation();
        }
    };

    var onMouseRelease = function (event) {
        if (gameState.gamePaused) return;
        if (gameState.gameOver) return;

        if ( event.button === 0 ) {
            // Left mouse released

            if (!gameState.nocking) return;

            gameState.canShoot = false;
            gameState.nocking = false;

            if (!gameState.aiming) {
                // Keep camera but enable controls
                disableAimControls();
                linkFirstCameraControls.enabled = false;
            }
            
            gameState.nockingFinalTime = performance.now();
            startArrowAnimation();
        }
    };

    document.addEventListener('mousedown', onMouseClick, false);
    document.addEventListener('mouseup', onMouseRelease, false);
}

function setLinkThirdCameraControls() {
    
    linkThirdCameraControls = new CameraOrbitControls( thirdPersonCameraPivot, document.body );
    
    // Settings
    linkThirdCameraControls.enabled = true;
    linkThirdCameraControls.minPolarAngle = -0.25*Math.PI; // radians
    linkThirdCameraControls.maxPolarAngle = 0.15*Math.PI; // radians
    
    gameControls.push(linkThirdCameraControls);
}

function setLinkFirstCameraControls() {
    const link = models.link.root;
    linkFirstCameraControls = new CameraPointerLockControls( link, document.body );

    linkFirstCameraControls.enableMouseVertical = false;
    linkFirstCameraControls.enabled = false;    
    
    gameControls.push(linkFirstCameraControls);
}

function setLinkMovementControls() {
    const link = models.link.root;
    
    var onKeyDown = function ( event ) {
        if ( gameState.gameOver ) return;
        if ( gameState.gamePaused ) return;
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
        }
    };

    var onKeyUp = function ( event ) {
        if ( gameState.gamePaused ) return;
        if ( gameState.gamePaused ) return;
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
}

function setLinkAimControls() {

    const link = models.link;
    
    const armL = link.joints.upper.left.arm;
    const armR = link.joints.upper.right.arm;

    const head = link.joints.upper.head;

    // Controls for left and right arm (and bow)
    aimControlsArmL = new AimPointerLockControls( armL, document.body );
    aimControlsArmR = new AimPointerLockControls( armR, document.body );
    
    // Controls for link's head
    aimControlsHead = new HeadPointerLockControls( head, document.body, )

    // Settings
    aimControlsArmR.inverted = true;
    aimControlsArmR.correctX = true;
    aimControlsArmR.correction = 0.002;

    aimControlsHead.increment = 0.05;

    // Initially disabled, enabled when in fps mode
    aimControlsArmL.enabled = false;
    aimControlsArmR.enabled = false;
    aimControlsHead.enabled = false;
    
    // Assign listeners
    aimControlsArmL.minPolarAngle = -0.75 * Math.PI;
    aimControlsArmL.maxPolarAngle = -0.25 * Math.PI;
    gameControls.push(aimControlsArmL);

    aimControlsArmR.minPolarAngle = 0.25 * Math.PI;
    aimControlsArmR.maxPolarAngle = 0.75 * Math.PI;
    gameControls.push(aimControlsArmR);

    aimControlsHead.minPolarAngle = -0.1 * Math.PI;
    aimControlsHead.maxPolarAngle = 0.25 * Math.PI;
    gameControls.push(aimControlsHead);
}

function setListeners(controls) {
    pauseScreen.addEventListener( 'click', function () {
        
        if ( !gameState.gameOver ) { controls.lock(); }

    }, false );

    controls.addEventListener( 'lock', function () {
        if ( !gameState.gameOver ) { unpauseGame(); }
    });

    controls.addEventListener( 'unlock', function () {
        if ( !gameState.gameOver ) { pauseGame(); }
    } );
}

function setControls() {
    setLinkMovementControls();
    setLinkThirdCameraControls();
    setLinkFirstCameraControls();
    setLinkAimControls();
    setShootListeners();
    setAimListeners();

    gameControls.forEach(
        (controls) => {
            setListeners(controls);
        }
    );

    setColliders();

    gameState.controlsSet = true;
}

function enableAimControls() {
    linkFirstCameraControls.enabled = false;
    aimControlsArmL.enabled = true;
    aimControlsArmR.enabled = true;
    aimControlsHead.enabled = true;
}

function disableAimControls() {
    linkFirstCameraControls.enabled = false;
    aimControlsArmL.enabled = false;
    aimControlsArmR.enabled = false;
    aimControlsHead.enabled = false;
}

function lockControls() {
    gameControls.forEach(
        (controls) => {
            controls.lock();
        }
    );
}

// Renderer callbacks
function onWindowResize() {
    thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
    thirdPersonCamera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
 
// ============================================================================
// ANIMATION FUNCTIONS
// ============================================================================


// Link
function restoreLinkLowerJoints() {
    const linkJoints = models.link.joints;

    // Thighs
    linkJoints.lower.left.thigh.rotation.copy(linkRestJoints.lower.left.thigh);
    linkJoints.lower.right.thigh.rotation.copy(linkRestJoints.lower.right.thigh);

    // Shins
    linkJoints.lower.left.shin.rotation.copy(linkRestJoints.lower.left.shin);
    linkJoints.lower.right.shin.rotation.copy(linkRestJoints.lower.right.shin);

    // Feet
    linkJoints.lower.left.foot.rotation.copy(linkRestJoints.lower.left.foot);
    linkJoints.lower.right.foot.rotation.copy(linkRestJoints.lower.right.foot);

}

function restoreLinkUpperJoints() {
    const link = models.link;

    const head = link.joints.upper.head;
    const spine001 = link.joints.upper.spine001;
    const spine002 = link.joints.upper.spine002;
    const spine003 = link.joints.upper.spine003;
    
    const armL = link.joints.upper.left.arm;
    const armR = link.joints.upper.right.arm;
    const forearmL = link.joints.upper.left.forearm;
    const forearmR = link.joints.upper.right.forearm;

    spine001.rotation.copy(linkRestJoints.upper.spine001);
    spine002.rotation.copy(linkRestJoints.upper.spine002);
    spine003.rotation.copy(linkRestJoints.upper.spine003);
    head.rotation.copy(linkRestJoints.upper.head);

    armL.rotation.copy(linkRestJoints.upper.left.arm);
    armR.rotation.copy(linkRestJoints.upper.right.arm);
    forearmL.rotation.copy(linkRestJoints.upper.left.forearm);
    forearmR.rotation.copy(linkRestJoints.upper.right.forearm);
}

function animateLinkMovement(time) {
    var movSpeed = linkMovementSpeed;
    
    if (!gameState.canWalk) return;
    if (gameState.aiming) {
        movSpeed /= 5;
    }

    if (gameState.nocking) return;

    var dt = ( time - prevTime ) / 1000;

    // Apply friction
    linkVelocity.x -= linkVelocity.x * floorFriction * dt;
    linkVelocity.z -= linkVelocity.z * floorFriction * dt;

    // Update velocity based on current direction
    linkDirection.z = Number( linkMovement.forward )- Number( linkMovement.backward );
    linkDirection.x = Number( linkMovement.left ) - Number( linkMovement.right );
    linkDirection.normalize(); // this ensures consistent movements in all directions

    // Update velocity (with collision check)
    if ( linkMovement.forward && !linkCollision.forward ) {
        linkVelocity.z += linkDirection.z * movSpeed * dt;
    }
    if ( linkMovement.backward && !linkCollision.backward ) {
        linkVelocity.z += linkDirection.z * movSpeed * dt;
    }
    if ( linkMovement.left && !linkCollision.left ) {
        linkVelocity.x += linkDirection.x * movSpeed * dt;
    }
    if ( linkMovement.right && !linkCollision.right ) {
        linkVelocity.x += linkDirection.x * movSpeed * dt;
    }

    // Update position with velocity
    models.link.root.position.x += linkVelocity.x * dt;
    models.link.root.position.z += linkVelocity.z * dt;
    
    // Check map boundaries
    if (models.link.root.position.z >= mapLimitForward) {
        models.link.root.position.z = mapLimitForward;
        linkVelocity.z = 0.0;
    } 
    if (models.link.root.position.z <= mapLimitBackward) {
        models.link.root.position.z = mapLimitBackward;
        linkVelocity.z = 0.0;
    }
    if (models.link.root.position.x <= mapLimitLeft) {
        models.link.root.position.x = mapLimitLeft;
        linkVelocity.x = 0.0;
    } 
    if (models.link.root.position.x >= mapLimitRight) {
        models.link.root.position.x = mapLimitRight;
        linkVelocity.x = 0.0;
    }

    // Animate
    if ( (Math.abs(linkVelocity.z) >= linkMovementThreshold) || (Math.abs(linkVelocity.x) >= linkMovementThreshold) ) {
        // Start animation if movement
        gameState.walking = true;
        startLinkWalkAnimation();
    } else {
        // Stop animation if no movement
        if (gameState.walking) {
            gameState.walking = false;
            stopLinkWalkAnimation();
        }
    }

    // Reset collisions
    linkCollision.forward = false;
    linkCollision.backward = false;
    linkCollision.left = false;
    linkCollision.right = false;
}

function startLinkLowerWalkAnimation() {
    restoreLinkLowerJoints();
    const linkJoints = models.link.joints;

    // Params
    const time1 = 200;
    const time2 = 400;
    const time3 = 200;

    const thighLAngle = linkJoints.lower.left.thigh.rotation.x;
    const thighRAngle = linkJoints.lower.right.thigh.rotation.x;
    const shinLAngle = linkJoints.lower.left.shin.rotation.x;
    const shinRAngle = linkJoints.lower.right.shin.rotation.x;
    const footLAngle = linkJoints.lower.left.foot.rotation.x;
    const footRAngle = linkJoints.lower.right.foot.rotation.x;

    const thighLAngle1 = UTILS.degToRad(30);
    const thighRAngle1 = UTILS.degToRad(-30);
    const shinLAngle1 = 0;
    const shinRAngle1 = UTILS.degToRad(30);
    const footLAngle1 = UTILS.degToRad(60);
    const footRAngle1 = UTILS.degToRad(-60);
    
    const thighLAngle2 = UTILS.degToRad(-30);
    const thighRAngle2 = UTILS.degToRad(30);
    const shinLAngle2 = UTILS.degToRad(30);
    const shinRAngle2 = 0;
    const footLAngle2 = UTILS.degToRad(-60);
    const footRAngle2 = UTILS.degToRad(60);
    
    const thighLAngle3 = 0
    const thighRAngle3 = 0;
    const shinLAngle3 = 0;
    const shinRAngle3 = 0;
    const footLAngle3 = 0;
    const footRAngle3 = 0;

    // Tweens
    var lower = {thighL: 0.0, thighR: 0.0, shinL: 0.0, shinR: 0.0, footL: 0.0, footR: 0.0};
    var upperTween1 = new TWEEN.Tween(lower)
	.to({ thighL: thighLAngle1, thighR: thighRAngle1, shinL: shinLAngle1, shinR: shinRAngle1, footL: footLAngle1, footR: footRAngle1}, time1) 
	.onUpdate( 
        () => {
            linkJoints.lower.left.thigh.rotation.x = thighLAngle + lower.thighL; 
            linkJoints.lower.right.thigh.rotation.x = thighRAngle + lower.thighR; 

            linkJoints.lower.left.shin.rotation.x = shinLAngle + lower.shinL; 
            linkJoints.lower.right.shin.rotation.x = shinRAngle + lower.shinR;

            linkJoints.lower.left.foot.rotation.x = footLAngle + lower.footL;
            linkJoints.lower.right.foot.rotation.x = footRAngle + lower.footR;
        }
    );
        
    var upperTween2 = new TWEEN.Tween(lower)
	.to({ thighL: thighLAngle2, thighR: thighRAngle2, shinL: shinLAngle2, shinR: shinRAngle2, footL: footLAngle2, footR: footRAngle2}, time2) 
	.onUpdate( 
        () => {
            linkJoints.lower.left.thigh.rotation.x = thighLAngle + lower.thighL; 
            linkJoints.lower.right.thigh.rotation.x = thighRAngle + lower.thighR; 

            linkJoints.lower.left.shin.rotation.x = shinLAngle + lower.shinL; 
            linkJoints.lower.right.shin.rotation.x = shinRAngle + lower.shinR;

            linkJoints.lower.left.foot.rotation.x = footLAngle + lower.footL;
            linkJoints.lower.right.foot.rotation.x = footRAngle + lower.footR;
        }
    );
    var upperTween3 = new TWEEN.Tween(lower)
	.to({ thighL: thighLAngle3, thighR: thighRAngle3, shinL: shinLAngle3, shinR: shinRAngle3, footL: footLAngle3, footR: footRAngle3}, time3) 
	.onUpdate( 
        () => {
            linkJoints.lower.left.thigh.rotation.x = thighLAngle + lower.thighL; 
            linkJoints.lower.right.thigh.rotation.x = thighRAngle + lower.thighR; 

            linkJoints.lower.left.shin.rotation.x = shinLAngle + lower.shinL; 
            linkJoints.lower.right.shin.rotation.x = shinRAngle + lower.shinR;

            linkJoints.lower.left.foot.rotation.x = footLAngle + lower.footL;
            linkJoints.lower.right.foot.rotation.x = footRAngle + lower.footR;
        }
    );
    // Chaining
    upperTween1.chain(upperTween2);
    upperTween2.chain(upperTween3);
    upperTween3.chain(upperTween1);

    // Start
    linkMovementTweens.push(upperTween1);
    linkMovementTweens.push(upperTween2);
    linkMovementTweens.push(upperTween3);

    upperTween1.start();
}

function linkInitialWalkUpperJoints() {
    const linkJoints = models.link.joints;
    
    // Detach bow string from handR
    models.bow.root.attach(models.bow.joints.string);

    linkJoints.upper.spine003.rotation.y = 0.0;
    
    const armRJoints = UTILS.degToRad3([30, 0, 90]);
    linkJoints.upper.right.arm.rotation.x += armRJoints[0];
    linkJoints.upper.right.arm.rotation.y += armRJoints[1];
    linkJoints.upper.right.arm.rotation.z += armRJoints[2];

    const forearmRJoints = UTILS.degToRad3([-60, 0, -30]);
    linkJoints.upper.right.forearm.rotation.x += forearmRJoints[0];
    linkJoints.upper.right.forearm.rotation.y += forearmRJoints[1];
    linkJoints.upper.right.forearm.rotation.z += forearmRJoints[2];

    const armLJoints = UTILS.degToRad3([30, 0, -90]);
    linkJoints.upper.left.arm.rotation.x += armLJoints[0];
    linkJoints.upper.left.arm.rotation.y += armLJoints[1];
    linkJoints.upper.left.arm.rotation.z += armLJoints[2];

    const forearmLJoints = UTILS.degToRad3([0, 0, 60]);
    linkJoints.upper.left.forearm.rotation.x += forearmLJoints[0];
    linkJoints.upper.left.forearm.rotation.y += forearmLJoints[1];
    linkJoints.upper.left.forearm.rotation.z += forearmLJoints[2];
}

function startLinkUpperWalkAnimation() {
    linkInitialWalkUpperJoints();

    const linkJoints = models.link.joints;

    const spineAngle = linkJoints.upper.spine003.rotation.y;
    const headAngle = linkJoints.upper.head.rotation.y;

    const armRAngle = linkJoints.upper.right.arm.rotation.z;
    const forearmRAngle = linkJoints.upper.right.forearm.rotation.z;
    const armLAngle = linkJoints.upper.left.arm.rotation.z;
    const forearmLAngle = linkJoints.upper.left.forearm.rotation.z;

    // Params
    const time1 = 200;
    const time2 = 400;
    const time3 = 200;
    
    const spineAngle1 = UTILS.degToRad(15);
    const armAngle1 = UTILS.degToRad(30);
    const forearmAngle1 = UTILS.degToRad(15);
    
    const spineAngle2 = UTILS.degToRad(-15);
    const armAngle2 = UTILS.degToRad(-30);
    const forearmAngle2 = UTILS.degToRad(-15);
    
    const spineAngle3 = 0.0;
    const armAngle3 = 0.0;
    const forearmAngle3 = 0.0;

    // Tweens
    var upper = {arm: 0.0, forearm: 0.0, spine: 0.0};
    var upperTween1 = new TWEEN.Tween(upper)
    .to({arm: armAngle1, forearm: forearmAngle1, spine: spineAngle1}, time1)
    .onUpdate(() => {
        linkJoints.upper.right.arm.rotation.z = armRAngle + upper.arm;
        linkJoints.upper.left.arm.rotation.z = armLAngle + upper.arm;

        linkJoints.upper.right.forearm.rotation.z = forearmRAngle + upper.forearm;
        linkJoints.upper.left.forearm.rotation.z = forearmLAngle + upper.forearm;

        linkJoints.upper.spine003.rotation.y = spineAngle + upper.spine;
        linkJoints.upper.head.rotation.y = headAngle - upper.spine;
    });

    var upperTween2 = new TWEEN.Tween(upper)
    .to({arm: armAngle2, forearm: forearmAngle2, spine: spineAngle2}, time2)
    .onUpdate(() => {
        linkJoints.upper.right.arm.rotation.z = armRAngle + upper.arm;
        linkJoints.upper.left.arm.rotation.z = armLAngle + upper.arm;

        linkJoints.upper.right.forearm.rotation.z = forearmRAngle + upper.forearm;
        linkJoints.upper.left.forearm.rotation.z = forearmLAngle + upper.forearm;

        linkJoints.upper.spine003.rotation.y = spineAngle + upper.spine;
        linkJoints.upper.head.rotation.y = headAngle - upper.spine;
    });

    var upperTween3 = new TWEEN.Tween(upper)
    .to({arm: armAngle3, forearm: forearmAngle3, spine: spineAngle3}, time3)
    .onUpdate(() => {
        linkJoints.upper.right.arm.rotation.z = armRAngle + upper.arm;
        linkJoints.upper.left.arm.rotation.z = armLAngle + upper.arm;

        linkJoints.upper.right.forearm.rotation.z = forearmRAngle + upper.forearm;
        linkJoints.upper.left.forearm.rotation.z = forearmLAngle + upper.forearm;

        linkJoints.upper.spine003.rotation.y = spineAngle + upper.spine;
        linkJoints.upper.head.rotation.y = headAngle - upper.spine;
    });

    // Chaining
    upperTween1.chain(upperTween2);
    upperTween2.chain(upperTween3);
    upperTween3.chain(upperTween1);

    // Starting all
    linkMovementTweens.push(upperTween1);
    linkMovementTweens.push(upperTween2);
    linkMovementTweens.push(upperTween3);

    upperTween1.start();
}

function startLinkWalkAnimation() {

    // Set initial position for lower limbs
    if ( linkMovementTweens.length != 0 ) return;

    startLinkLowerWalkAnimation();

    if (!gameState.aiming) startLinkUpperWalkAnimation();
}

function stopLinkWalkAnimation() {
    UTILS.stopTweens(linkMovementTweens);
    linkMovementTweens = [];
    
    restoreLinkLowerJoints();
    
    if (!gameState.aiming && !gameState.nocking) restoreLinkUpperJoints();

    // Attach bow string back to handR
    models.link.joints.upper.right.hand.attach(models.bow.joints.string);
}

// Arrow
function startNockingArrowAnimation() {
    const link = models.link;
    const arrow = models.arrow.root;

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
    var charge = (gameState.nockingFinalTime - gameState.nockingInitTime) * 0.001;
    var deltaT = Math.min(charge, maxCharge);

    var impulse = arrowForce * deltaT;
    var initialSpeed = impulse / arrowMass;
    var initialVelocity = direction.multiplyScalar(initialSpeed);
    return initialVelocity;
}

function startArrowAnimation() {    
    console.log("Arrow shot!");

    const bow = models.bow.root;
    const handR = models.link.joints.upper.right.hand;
    const bowString = models.bow.joints.string;
    const arrow = models.arrow.root;

    var arrowRotation = new THREE.Vector3();
    arrowRotation.copy(arrow.rotation);

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

    // Reparent arrow to a pivot object (better rotation handling)
    var arrowPivot = new THREE.Object3D();
    scene.add(arrowPivot);

    arrowPivot.position.copy(arrow.position);
    arrowPivot.rotation.set(0, arrow.rotation.y, arrowRotation.z);
    arrowPivot.scale.copy(arrow.scale);

    arrow.position.set(0, 0, 0);
    arrow.rotation.set(arrowRotation.x, 0, 0);
    arrow.scale.set(1, 1, 1);

    arrowPivot.add(arrow);
    models.arrow.root = arrowPivot;

    // Create tween to shoot arrow
    const arrowPosition = arrow.position.z;
    
    var delta = {dz: nockingAmount};
    var shootTween = new TWEEN.Tween(delta)
    .to({dz: 0.0}, 10)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(
        () => {
            arrowPivot.position.z = arrowPosition + (nockingAmount - delta.dz);
        }
    )
    .onComplete(
        () => {
            gameState.nocking = false;
            gameState.arrowFlying = true;

            currentCamera = arrowCamera;
            
            // Restore bowstring position
            handR.attach(bowString);
            bowString.position.set(0, 0, 0);
            
            restoreLinkUpperJoints();
            document.querySelector( '#crosshair' ).hidden = true;
        }
    );
    
    nockTween.stop();
    shootTween.start();
}

function animateArrowFlight(time) {
    var dt = ( time - prevTime ) / 1000;
    const groundLevel = 2.0;

    const arrowPivot = models.arrow.root;
    const arrow = models.arrow.root.children[0];

    arrowVelocity.addScaledVector(arrowAcceleration, dt);
    
    arrowDirection.copy(arrowVelocity)
    arrowDirection.normalize();
    arrowPivot.position.addScaledVector(arrowVelocity, 5*dt);

    var angle = -0.5*Math.PI * arrowDirection.y;
    arrow.rotation.x = angle;
    
    if ( arrowPivot.position.y < groundLevel ) {
        registerArrowMiss();
        stopArrowFlight();
    }
}

function buildNewArrow() {
    const bow = models.bow;
    const arrow = models.arrow;
    
    const arrowMesh = arrow.root.children[0].children[0].clone();

    arrow.root = new THREE.Object3D();
    arrow.root.name = "Arrow";
    arrow.root.add(arrowMesh);

    bow.root.add( arrow.root );
    arrow.root.add( arrowCamera );
    
    arrow.root.scale.multiplyScalar(arrow.scale);
    const rotation = UTILS.degToRad3(arrow.rotation);
    arrow.root.rotation.set(...rotation);

    // Reset collider
    setArrowColliders();
}

function stopArrowFlight() {
    gameState.arrowFlying = false;

    console.log("Arrow landed!");

    var delayedStopArrowTween = new TWEEN.Tween({})
    .to({}, 1000)
    .onComplete(() => 
    {
        buildNewArrow();

        setThirdPersonCamera();
        
        gameState.canShoot = true; 
        gameState.aiming = false;
        gameState.canAim = true;
        gameState.canWalk = true;

        checkGameOver();
    });
    
    delayedStopArrowTween.start();
}

// Target
function startTargetAnimation() {
    switch (difficulty) {
        case "easy":
            console.log("Difficulty selected: easy. Target is still.")
            startTargetEasyAnimation();
            break;
        case "medium":
            console.log("Difficulty selected: medium. Starting target movement.")
            startTargetMediumAnimation();
            break;
        case "hard":
            console.log("Difficulty selected: hard. Starting target movement.")
            startTargetHardAnimation();
            break;
    }
}

function startTargetEasyAnimation() {}

function startTargetMediumAnimation() {
    const xLimit = 0.1 * terrainWidth;
    const targetTime = 5 * 1000;
    const target = models.target.root;

    var targetTween1 = new TWEEN.Tween(target.position)
    .to({x: -1.0*xLimit}, 0.5 * targetTime);

    var targetTween2 = new TWEEN.Tween(target.position)
    .to({x: 1.0*xLimit}, targetTime);
    
    var targetTween3 = new TWEEN.Tween(target.position)
    .to({x: 0.0}, 0.5 * targetTime);

    // Chaining (infinite loop)
    targetTween1.chain(targetTween2);
    targetTween2.chain(targetTween3);
    targetTween3.chain(targetTween1);

    // Start
    targetMovementTweens.push(targetTween1);
    targetMovementTweens.push(targetTween2);
    targetMovementTweens.push(targetTween3);

    targetTween1.start();
}

function startTargetHardAnimation() {
    const xLimit = 0.25 * terrainWidth;
    const zLimit = xLimit;
    
    const targetTime = 5 * 1000;
    const target = models.target.root;
    
    // Setting waypoints
    const initX = target.position.x;
    const initZ = target.position.z;

    // Right circle
    const A = {x: initX, z: initZ};
    const B = {x: initX + 0.5*xLimit, z: initZ - 0.5*zLimit};
    const C = {x: initX + xLimit, z: initZ};
    const D = {x: initX + 0.5*xLimit, z: initZ + 0.5*zLimit};

    // Left circle
    const E = {x: initX - 0.5*xLimit, z: initZ - 0.5*zLimit};
    const F = {x: initX - xLimit, z: initZ};
    const G = {x: initX - 0.5*xLimit, z: initZ + 0.5*zLimit};

    // Setting tweens
    var targetTweenAB = new TWEEN.Tween(target.position)
    .to(B, 0.25 * targetTime);
    var targetTweenBC = new TWEEN.Tween(target.position)
    .to(C, 0.25 * targetTime);
    var targetTweenCD = new TWEEN.Tween(target.position)
    .to(D, 0.25 * targetTime);
    var targetTweenDA = new TWEEN.Tween(target.position)
    .to(A, 0.25 * targetTime);

    var targetTweenAE = new TWEEN.Tween(target.position)
    .to(E, 0.25 * targetTime);
    var targetTweenEF = new TWEEN.Tween(target.position)
    .to(F, 0.25 * targetTime);
    var targetTweenFG = new TWEEN.Tween(target.position)
    .to(G, 0.25 * targetTime);
    var targetTweenGA = new TWEEN.Tween(target.position)
    .to(A, 0.25 * targetTime);
    
    // Chaining (infinite loop)
    targetTweenAB.chain(targetTweenBC);
    targetTweenBC.chain(targetTweenCD);
    targetTweenCD.chain(targetTweenDA);
    targetTweenDA.chain(targetTweenAE);
    targetTweenAE.chain(targetTweenEF);
    targetTweenEF.chain(targetTweenFG);
    targetTweenFG.chain(targetTweenGA);
    targetTweenGA.chain(targetTweenAB);

    // Start
    targetMovementTweens.push(targetTweenAB);
    targetMovementTweens.push(targetTweenBC);
    targetMovementTweens.push(targetTweenCD);
    targetMovementTweens.push(targetTweenDA);
    targetMovementTweens.push(targetTweenAE);
    targetMovementTweens.push(targetTweenEF);
    targetMovementTweens.push(targetTweenFG);
    targetMovementTweens.push(targetTweenGA);

    targetTweenAB.start();
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
    }
    renderer.render(scene, currentCamera);
    requestAnimationFrame(render);
}

export function main() {
    if ( !gameState.optionsSet ) {
        setOptions();
        main();
        return;
    }

    if ( !gameState.guiInitialized ) {
        initLoadingScreen();
        main();
        return;
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
        return;
    }

    if ( !gameState.controlsSet ) {
        setControls();
        main();
        return;
    } else {
        // All is set
        
        lockControls();
        startTargetAnimation();
        
        gameState.canWalk = true;
        gameState.canAim = true;
        gameState.canShoot = true;
    }
    
    requestAnimationFrame(render);
}