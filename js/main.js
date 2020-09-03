import * as THREE from '../lib/three.js/build/three.module.js'
import {GLTFLoader} from '../lib/three.js/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from '../lib/three.js/examples/jsm/controls/OrbitControls.js';
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
var ambientLight;
var models;

// Camera parameters
const fov = 45;
const aspect = window.innerWidth / window.innerHeight;  // the canvas default
const near = 0.1;
const far = 100000;

const cameraPosition = [ -0.5, 0.5, 0.5 ];
const cameraDistance = 100;

// Light parameters
const lightDistance = 200;
const lightPosition = [ 0, 0.25, 1 ];
const lightTarget = [ 0, 0, 0 ];
const lightColor = 0xFFFFFFFF;
const lightIntensity = 5;

// Model variables
var modelsLoaded = false;

models = {
    link:    { 
        url: '../assets/models/link/link.gltf',
        pos: [ 0, 0, 0 ],
        rotation: [ 0, 90, 0, ],
        scale: 10,
        buildCallback: buildLink,
    },
    target:  { 
        url: '../assets/models/target/target.gltf',
        pos: [ 100, 0, 0 ],
        rotation: [ 0, -90, 0, ],
        scale: 10,
        buildCallback: buildTarget,
    },
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
            gltf.scene.traverse( function ( child ) {
                if ( child.isMesh || child.isSkinnedMesh ) {
                    if ( child.castShadow !== undefined ) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                }
            } );
            model.gltf = gltf;
            console.log(dumpObject(model.gltf.scene));
        });
    }
}

function buildModels() {
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    for (const model of Object.values(models)) {
        const root = new THREE.Object3D();
        
        root.position.set(...model.pos);
        root.scale.multiplyScalar(model.scale);
        
        var rotation = degToRad3(model.rotation);
        root.rotation.set(...rotation);
        
        model.root = root;
        
        if ( typeof model.buildCallback !== 'undefined' ) {
            model.buildCallback();
        }
        
        scene.add( model.root );
    }
}

function buildLink() {
    const link = models.link;
    const clonedScene = SkeletonUtils.clone(link.gltf.scene);
    link.root.add(clonedScene);
}

function buildTarget() {
    const target = models.target;
    const scene = target.gltf.scene;
    target.root.add(scene);
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
    buildModels();
}

function createCamera() {
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set( ...cameraPosition );
    camera.position.multiplyScalar( cameraDistance )
    camera.lookAt( scene.position );
}

function createDirectionalLight() {
    light = new THREE.DirectionalLight( lightColor, lightIntensity );
    light.position.set( ...lightPosition );
    light.position.multiplyScalar( lightDistance );
    light.target.position.set( ...lightTarget );

    light.castShadow = true;
    scene.add( light );
}

function createAmbientLight() {
    const color = 0xFFFFFF;
    const intensity = 1;
    ambientLight = new THREE.AmbientLight(color, intensity);
    ambientLight.castShadow = true;

    scene.add( ambientLight );
}

function createLight() {
    createDirectionalLight();
    // createAmbientLight();
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