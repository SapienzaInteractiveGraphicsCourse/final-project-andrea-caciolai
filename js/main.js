import * as THREE from '../lib/three.js/build/three.module.js'
import {GLTFLoader} from '../lib/three.js/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from '../lib/three.js/examples/jsm/controls/OrbitControls.js';
// import { PointerLockControls } from '../lib/three.js/examples/jsm/controls/PointerLockControls.js';
import { CustomPointerLockControls, AimPointerLockControls } from './controls.js';
import TWEEN from '../lib/tween.js/dist/tween.esm.js'

import {SkeletonUtils} from '../lib/three.js/examples/jsm/utils/SkeletonUtils.js';
import {dumpObject, degToRad, degToRad3, vec3ToArr} from './utils.js'

// ============================================================================
// GLOBAL VARIABLES AND PARAMETERS
// ============================================================================

var renderer;
var textureLoader;
var loadingManager;
var controls;

// Objects variables
var thirdPersonCamera;
var scene;
var light;
var ambient;

var modelsLoaded = false;
var sceneBuilt = false;
var controlsSet = false;


// Camera parameters
const fov = 45;
const aspect = window.innerWidth / window.innerHeight;  // the canvas default
const near = 0.1;
const far = 100000;

// const cameraPosition = [ 1, 1, 0.0 ];
// const cameraDistance = 100;

var cameraPosition = [ 0, 3, -5 ];

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
                }
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

// Controls parameters
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;

const friction = 10.0;
const moveSpeed = 100.0;
const jumpSpeed = 200.0;
const mass = 100.0;

var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();

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
        // Upper left limbs
        if (obj.isBone && obj.name === 'upper_armL') {
            link.joints.upper.left.arm = obj;
        }
        if (obj.isBone && obj.name === 'forearmL') {
            link.joints.upper.left.forearm = obj;
        }
        if (obj.isBone && obj.name === 'handL') {
            link.joints.upper.left.hand = obj;
        }
    
        // Upper right limbs
        if (obj.isBone && obj.name === 'upper_armR') {
            link.joints.upper.right.arm = obj;
        }
        if (obj.isBone && obj.name === 'forearmR') {
            link.joints.upper.right.forearm = obj;
        }
        if (obj.isBone && obj.name === 'handR') {
            link.joints.upper.right.hand = obj;
        }
    
        // Lower left limbs
        if (obj.isBone && obj.name === 'thighL') {
            link.joints.lower.left.thigh = obj;
        }
        if (obj.isBone && obj.name === 'shinL') {
            link.joints.lower.left.shin = obj;
        }
        if (obj.isBone && obj.name === 'footL') {
            link.joints.lower.left.foot = obj;
        }
        if (obj.isBone && obj.name === 'toeL') {
            link.joints.lower.left.toe = obj;
        }
    
        // Lower right limbs
        if (obj.isBone && obj.name === 'thighR') {
            link.joints.lower.right.thigh = obj;
        }
        if (obj.isBone && obj.name === 'shinR') {
            link.joints.lower.right.shin = obj;
        }
        if (obj.isBone && obj.name === 'footR') {
            link.joints.lower.right.foot = obj;
        }
        if (obj.isBone && obj.name === 'toeR') {
            link.joints.lower.right.toe = obj;
        }
    });
}

function buildLink() {
    const link = modelsMap.link;
    const clonedScene = SkeletonUtils.clone(link.gltf.scene);
    link.root = clonedScene.children[0];
    
    link.root.position.set(...link.position);
    link.root.scale.multiplyScalar(link.scale);
    const rotation = degToRad3(link.rotation);
    link.root.rotation.set(...rotation);

    scene.add( link.root );
    
    buildBow();

    initLinkJoints();

    console.log(link.joints);
    console.log(dumpObject(link.root));
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
    const rotation = degToRad3(target.rotation);
    target.root.rotation.set(...rotation);

    scene.add( target.root );
    console.log(dumpObject(target.root));
}

function buildArrow() {
    const arrow = modelsMap.arrow;
    
    arrow.root = new THREE.Object3D();
    arrow.root.name = "Arrow";
    arrow.root.add(arrow.gltf.scene.children[0]);

    var bow = modelsMap.link.root.getObjectByName('Bow');
    
    bow.add( arrow.root );
    
    arrow.root.scale.multiplyScalar(arrow.scale);
    const rotation = degToRad3(arrow.rotation);
    arrow.root.rotation.set(...rotation);
    
    console.log(dumpObject(arrow.root));
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

    createThirdPersonCamera();

    sceneBuilt = true;
    main();
}

function createFog() {
    scene.fog = new THREE.Fog( fogColor, fogNear, fogFar );
}

// Third person camera
function createThirdPersonCamera() {
    thirdPersonCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);    
    const link = modelsMap.link.root;

    thirdPersonCamera.position.set( ...cameraPosition );
    var target = [link.position.x, link.position.y, link.position.z];
    target[1] += 2;
    thirdPersonCamera.lookAt( ...target );
    
    link.add( thirdPersonCamera );
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


function thirdPersonCameraControls() {
    const link = modelsMap.link.root;
    controls = new CustomPointerLockControls( link, document.body );
    
    controls.enableMouseVertical = false;

    var instructions = document.getElementById( 'instructions' );

    blocker.style.display = 'block';
    instructions.style.display = '';

    instructions.addEventListener( 'click', function () {

        controls.lock();

    }, false );

    controls.addEventListener( 'lock', function () {

        instructions.style.display = 'none';
        blocker.style.display = 'none';

    } );

    controls.addEventListener( 'unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';

    } );

    // scene.add( controls.getObject() );

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
                if ( canJump === true ) velocity.y += jumpSpeed;
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
}

function bowVerticalControls() {

    var instructions = document.getElementById( 'instructions' );

    blocker.style.display = 'block';
    instructions.style.display = '';

    const link = modelsMap.link;
    const armL = link.joints.upper.left.arm;
    const armR = link.joints.upper.right.arm;

    // Controls for left and right arm (and bow)
    var bowControlsL = new AimPointerLockControls( armL, document.body );
    var bowControlsR = new AimPointerLockControls( armR, document.body );
    bowControlsR.inverted = true;
    
    var bowControlsArray = [bowControlsL, bowControlsR];

    // Assign listeners
    bowControlsArray.forEach(bowControls => {
        bowControls.minPolarAngle = 0.25 * Math.PI;
        bowControls.maxPolarAngle = 0.75 * Math.PI;

        instructions.addEventListener( 'click', function () {

            bowControls.lock();
    
        }, false );
    
        bowControls.addEventListener( 'lock', function () {
    
            instructions.style.display = 'none';
            blocker.style.display = 'none';
    
        } );
    
        bowControls.addEventListener( 'unlock', function () {
    
            blocker.style.display = 'block';
            instructions.style.display = '';
    
        } ); 
    });
}

function orbitControls() {
    var orbit = new OrbitControls( thirdPersonCamera, renderer.domElement );
    orbit.minPolarAngle = 0.0;
    orbit.maxPolarAngle = Math.PI * 0.5 - 0.1;
    orbit.target.set(0, 0, 0);
    orbit.update();
}

function handleControls() {
    // orbitControls();
    thirdPersonCameraControls();
    bowVerticalControls();
    
    controlsSet = true;
    main();
}
 
function updateThirdPersonCamera() {
    var time = performance.now();
    var dt = ( time - prevTime ) / 1000;

    // Apply friction
    velocity.x -= velocity.x * friction * dt;
    velocity.z -= velocity.z * friction * dt;

    // Update velocity based on current direction
    direction.z = Number( moveForward ) - Number( moveBackward );
    direction.x = Number( moveRight ) - Number( moveLeft );
    direction.normalize(); // this ensures consistent movements in all directions

    if ( moveForward || moveBackward ) velocity.z -= direction.z * moveSpeed * dt;
    if ( moveLeft || moveRight ) velocity.x -= direction.x * moveSpeed * dt;

    // Update position
    controls.moveRight( velocity.x * dt );
    controls.moveForward( velocity.z * dt );

    // Update vertical position
    controls.getObject().position.y += ( velocity.y * dt ); // new behavior

    // Check vertical position (no infinite falling)
    if ( controls.getObject().position.y < 0 ) {
        velocity.y = 0;
        controls.getObject().position.y = 0;
        canJump = true;
    } else {
        velocity.y -= 9.8 * mass * dt; // 100.0 = mass
    }

    prevTime = time;
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================


function onWindowResize() {
    thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
    thirdPersonCamera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function render(time) {
    time *= 0.001;  // convert time to seconds
    
    TWEEN.update();
    
    updateThirdPersonCamera();
    
    renderer.render(scene, thirdPersonCamera);
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
        handleControls();
        return;
    }
    
    requestAnimationFrame(render);
}
main();