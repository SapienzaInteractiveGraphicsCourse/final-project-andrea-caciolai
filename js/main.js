import * as THREE from '../lib/three.js/build/three.module.js'
import {GLTFLoader} from '../lib/three.js/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from '../lib/three.js/examples/jsm/controls/OrbitControls.js';
import {SkeletonUtils} from '../lib/three.js/examples/jsm/utils/SkeletonUtils.js';
import {dumpObject} from './utils.js'

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
var models;

// Camera parameters
const fov = 45;
const aspect = window.innerWidth / window.innerHeight;  // the canvas default
const near = 0.1;
const far = 100000;

const cameraDistance = 100;
const lightDistance = 200;

// Model variables
var modelsLoaded = false;

models = {
    link:    { url: '../assets/models/link/link.gltf' },
};

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
            model.gltf = gltf;
        });
    }
}

function displayModels() {
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    Object.values(models).forEach((model, ndx) => {
        const clonedScene = SkeletonUtils.clone(model.gltf.scene);
        const root = new THREE.Object3D();
        root.add(clonedScene);
        scene.add(root);
        root.position.set(0, 0, 0);
        root.scale.multiplyScalar(10);
        console.log(dumpObject(model.gltf.scene));
    });
}

// ============================================================================
// SCENE BUILDING FUNCTIONS
// ============================================================================

function buildScene() {
    scene = new THREE.Scene();
    const color = 0xcce0ff;
    scene.background = new THREE.Color( color );
    scene.fog = new THREE.Fog( color, 500, 10000 );
    createCamera();
    createLight();
    createGround();  
    displayModels();
}

function createCamera() {
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set( 0, .2, 1 );
    camera.position.multiplyScalar( cameraDistance );
    camera.lookAt( scene.position );
}


function createLight() {
    light = new THREE.DirectionalLight( 'rgb(255, 255, 255)', 5 );
    light.position.set( 0, 1, 1 );
    light.position.multiplyScalar( lightDistance );
    light.target.position.set( 0, 0, 0 );

    scene.add( light );
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

function handleControls() {
    controls = new OrbitControls( camera, renderer.domElement );
    controls.minPolarAngle = 0.0;
    controls.maxPolarAngle = Math.PI * 0.5 - 0.1;
    controls.target.set(0, 0, 0);
    controls.update();
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
    
    controls.update();

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function main() {
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