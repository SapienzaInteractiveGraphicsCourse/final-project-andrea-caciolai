import * as THREE from './lib/three.js/build/three.module.js'
import {GLTFLoader} from './lib/three.js/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from './lib/three.js/examples/jsm/controls/OrbitControls.js';

// ============================================================================
// GLOBAL VARIABLES AND PARAMETERS
// ============================================================================

var canvas;
var renderer;
var textureLoader;

// Objects variables
var camera;
var scene;
var light;

// Camera parameters
const fov = 75;
const aspect = window.innerWidth / window.innerHeight;  // the canvas default
const near = 0.1;
const far = 100000;

const distance = 100;


// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    renderer.shadowMap.enabled = true;

    window.addEventListener( 'resize', onWindowResize, false );

    textureLoader = new THREE.TextureLoader();
}

// ============================================================================
// MODEL LOADING FUNCTIONS
// ============================================================================


// ============================================================================
// SCENE BUILDING FUNCTIONS
// ============================================================================

function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xcce0ff );
    scene.fog = new THREE.Fog( 0xcce0ff, 500, 10000 );
    createCamera();
    createLight();
    createGround();
}

function createCamera() {
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set( 0, 0, 1 );
    camera.position.multiplyScalar( distance );
    camera.lookAt( scene.position );
}


function createLight() {
    light = new THREE.DirectionalLight( 0xdfebff, 1 );
    light.position.set( 0, 1, 0 );
    light.position.multiplyScalar( 100 );

    scene.add( light );
}

function createGround() {
    var groundTexture = textureLoader.load( './assets/grass_texture.jpg' );
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set( 25, 25 );
    groundTexture.anisotropy = 16;
    groundTexture.encoding = THREE.sRGBEncoding;

    var groundMaterial = new THREE.MeshLambertMaterial( { map: groundTexture } );

    var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 20000, 20000 ), groundMaterial );
    mesh.position.y = - 250;
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add( mesh );
}

function handleControls() {
    var controls = new OrbitControls( camera, renderer.domElement );
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.minDistance = 1000;
    controls.maxDistance = 5000;
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width  = canvas.clientWidth  * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

function onWindowResize() {
    if (resizeRendererToDisplaySize(renderer)) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }
}

function render(time) {
    time *= 0.001;  // convert time to seconds
    
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function main() {
    init();
    createScene();
    handleControls();
    requestAnimationFrame(render);
}
main();