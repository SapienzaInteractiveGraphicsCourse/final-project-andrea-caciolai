import * as THREE from '../lib/three.js/build/three.module.js'
import {GLTFLoader} from '../lib/three.js/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from '../lib/three.js/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../lib/three.js/examples/jsm/controls/PointerLockControls.js';
import TWEEN from '../lib/tween.js/dist/tween.esm.js'

import {SkeletonUtils} from '../lib/three.js/examples/jsm/utils/SkeletonUtils.js';
import {dumpObject, degToRad, degToRad3} from './utils.js'

// ============================================================================
// GLOBAL VARIABLES AND PARAMETERS
// ============================================================================

var renderer;
var textureLoader;
var loadingManager;
var controls;

// Objects variables
var camera;
var scene;
var light;
var ambient;
var models;

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
var modelsLoaded = false;

models = {
    // link:    { 
    //     url: '../assets/models/link/link.gltf',
    //     position: [ 0, 0, 0 ],
    //     rotation: [ 0, 0, 0, ],
    //     scale: 10,
    //     buildCallback: buildLink,
    // },
    link:    { 
        url: '../assets/models/link_with_bow/link_with_bow.gltf',
        position: [ 0, 0, 0 ],
        rotation: [ 0, 0, 0, ],
        scale: 10,
        buildCallback: buildLink,
    },
    target:  { 
        url: '../assets/models/target/target.gltf',
        position: [ 0, 0, 100 ],
        rotation: [ 0, 180, 0, ],
        scale: 10,
        buildCallback: buildTarget,
    },
    // bow: {
    //     url: '../assets/models/bow/bow.gltf',
    //     name: 'Bow',
    //     position: [-0.05, 0.15, 0.05],
    //     rotation: [-180, 90, 90],
    //     scale: 0.05,
    //     buildCallback: buildBow,
    // }
};

// Controls parameters
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;

var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================
function loadAssets() {
    textureLoader = new THREE.TextureLoader();
    loadingManager = new THREE.LoadingManager();

    loadModels(main);
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

function loadModels(callback) {   
    loadingManager.onLoad = function() {
        console.log('Loading complete!');
        // hide the loading bar
        document.querySelector('#loading').hidden = true;
        modelsLoaded = true;
        callback();
    };

    const progressbarElem = document.querySelector('#progressbar');
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        progressbarElem.style.width = `${itemsLoaded / itemsTotal * 100 | 0}%`;
    };
    
    const gltfLoader = new GLTFLoader(loadingManager);
    for (const model of Object.values(models)) {
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
    }
}

function buildModels() {
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    for (const model of Object.values(models)) {
        // const root = new THREE.Object3D();
        model.buildCallback();
    }
}

// function buildLink() {
//     const link = models.link;
//     const clonedScene = SkeletonUtils.clone(link.gltf.scene);
//     link.root = clonedScene.children[0];
    
//     link.root.position.set(...link.position);
//     link.root.scale.multiplyScalar(link.scale);
//     const rotation = degToRad3(link.rotation);
//     link.root.rotation.set(...rotation);
        
//     scene.add( link.root );
//     console.log(dumpObject(link.root));
// }

function buildLink() {
    const link = models.link;
    const clonedScene = SkeletonUtils.clone(link.gltf.scene);
    link.root = clonedScene.children[0];
    
    link.root.position.set(...link.position);
    link.root.scale.multiplyScalar(link.scale);
    const rotation = degToRad3(link.rotation);
    link.root.rotation.set(...rotation);
    
    buildBow();

    scene.add( link.root );
    console.log(dumpObject(link.root));
}

function buildBow() {
    scene.updateMatrixWorld();

    var linkHand = models.link.root.getObjectByName('handL');
    var bow = models.link.root.getObjectByName('Bow');

    linkHand.attach(bow);
}


// function buildBow() {
//     const bow = models.bow;
//     const clonedScene = SkeletonUtils.clone(bow.gltf.scene);

//     scene.updateMatrixWorld();

//     var linkHand = models.link.root.getObjectByName('handL');

//     bow.root = clonedScene.children[0];
//     bow.root.add(clonedScene);

//     bow.root.position.x += bow.position[0];
//     bow.root.position.y += bow.position[1];
//     bow.root.position.z += bow.position[2];
//     const rotation = degToRad3(bow.rotation);
//     bow.root.rotation.set(...rotation);
//     bow.root.scale.multiplyScalar(bow.scale);
    
//     linkHand.add(bow.root);
//     console.log(dumpObject(bow.root));
// }

function buildTarget() {
    const target = models.target;
    target.root = target.gltf.scene.children[0];
    
    target.root.position.set(...target.position);
    target.root.scale.multiplyScalar(target.scale);
    const rotation = degToRad3(target.rotation);
    target.root.rotation.set(...rotation);

    scene.add( target.root );
    console.log(dumpObject(target.root));
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

    createCamera();
}

function createFog() {
    scene.fog = new THREE.Fog( fogColor, fogNear, fogFar );
}

// Third person camera
function createCamera() {
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);    
    const link = models.link.root;

    camera.position.set( ...cameraPosition );
    var target = [link.position.x, link.position.y, link.position.z];
    target[1] += 2;
    camera.lookAt( ...target );
    
    link.add( camera );
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
    var blocker = document.getElementById( 'blocker' );

    instructions.style.display = 'none';
    blocker.style.display = 'none';
}

function pointerLockControls() {
    controls = new PointerLockControls( camera, document.body );
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
                if ( canJump === true ) velocity.y += 350;
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

function orbitControls() {
    controls = new OrbitControls( camera, renderer.domElement );
    controls.minPolarAngle = 0.0;
    controls.maxPolarAngle = Math.PI * 0.5 - 0.1;
    controls.target.set(0, 0, 0);
    controls.update();
}

function handleControls() {
    // orbitControls();
    pointerLockControls();
}
 
function moveCamera() {
    var time = performance.now();
    var delta = ( time - prevTime ) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number( moveForward ) - Number( moveBackward );
    direction.x = Number( moveRight ) - Number( moveLeft );
    direction.normalize(); // this ensures consistent movements in all directions

    if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
    if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;

    controls.moveRight( - velocity.x * delta );
    controls.moveForward( - velocity.z * delta );

    controls.getObject().position.y += ( velocity.y * delta ); // new behavior

    if ( controls.getObject().position.y < cameraPosition[1] ) {
        velocity.y = 0;
        controls.getObject().position.y = cameraPosition[1];
        canJump = true;
    } else {
        velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
    }

    prevTime = time;
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function render(time) {
    time *= 0.001;  // convert time to seconds
    
    TWEEN.update();
    
    moveCamera();
    
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function main() {
    // initGUI();
    if (!modelsLoaded) {
        loadAssets(main);
    } else {
        init();
        buildScene();
        handleControls();

        requestAnimationFrame(render);
    }
}
main();