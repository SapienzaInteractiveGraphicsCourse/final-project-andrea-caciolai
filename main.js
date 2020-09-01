import * as THREE from './lib/three.js/build/three.module.js'
import {GLTFLoader} from './lib/three.js/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from './lib/three.js/examples/jsm/controls/OrbitControls.js';
import {SkeletonUtils} from '/lib/three.js/examples/jsm/utils/SkeletonUtils.js';

// ============================================================================
// GLOBAL VARIABLES AND PARAMETERS
// ============================================================================

var renderer;
var textureLoader;
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
    loadModels();
}

// ============================================================================
// MODEL LOADING FUNCTIONS
// ============================================================================
function loadModels() {    
    const manager = new THREE.LoadingManager();
    manager.onLoad = function() {
        console.log('Loading complete!');
        displayModels();
    };

    const progressbarElem = document.querySelector('#progressbar');
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
        progressbarElem.style.width = `${itemsLoaded / itemsTotal * 100 | 0}%`;
    };

    models = {
        link:    { url: './assets/models/link.glb' },
    };
    
    const gltfLoader = new GLTFLoader(manager);
    for (const model of Object.values(models)) {
        gltfLoader.load(model.url, (gltf) => {
            model.gltf = gltf;
        });
    }
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
    var groundTexture = textureLoader.load( './assets/textures/grass_texture.png' );
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set( 256, 256 );
    groundTexture.anisotropy = 16;
    groundTexture.encoding = THREE.sRGBEncoding;
    groundTexture.magFilter = THREE.LinearFilter;
    groundTexture.minFilter = THREE.LinearMipmapLinearFilter;

    var groundMaterial = new THREE.MeshLambertMaterial( { map: groundTexture } );

    var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 20000, 20000 ), groundMaterial );
    mesh.position.y = - 10;
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add( mesh );
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
    });
}

function handleControls() {
    controls = new OrbitControls( camera, renderer.domElement );
    controls.maxPolarAngle = Math.PI / 2;
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
    init();
    buildScene();
    handleControls();
    requestAnimationFrame(render); 
}
main();