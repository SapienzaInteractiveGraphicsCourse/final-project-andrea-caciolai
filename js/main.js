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

const cameraPosition = [ 1, 1, 0.0 ];
const cameraDistance = 100;
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
    link:    { 
        url: '../assets/models/link/link.gltf',
        name: 'Link',
        pos: [ 0, 0, 0 ],
        rotation: [ 0, 0, 0, ],
        scale: 10,
        buildCallback: buildLink,
    },
    target:  { 
        url: '../assets/models/target/target.gltf',
        name: 'Target',
        pos: [ 0, 0, 100 ],
        rotation: [ 0, 180, 0, ],
        scale: 10,
    },
    bow: {
        url: '../assets/models/bow/bow.gltf',
        name: 'Bow',
        rotation: [90, -180, 0],
        offset: [1, 0.5, 0.5],
        scale: 0.5,
        buildCallback: buildBow,
    }
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
        
        model.root = model.gltf.scene.children[0];
        if (model.pos) {
            model.root.position.set(...model.pos);
        }
        if (model.scale) {
            model.root.scale.multiplyScalar(model.scale);
        }
        if (model.rotation) {
            const rotation = degToRad3(model.rotation);
            model.root.rotation.set(...rotation);
        }
        // model.root.name = model.name;
        
        if ( model.buildCallback ) {
            model.buildCallback();
        }
        
        scene.add( model.root );
        console.log(dumpObject(model.root));
    }

    camera.updateProjectionMatrix();
}

function buildLink() {
    const link = models.link;
    const clonedScene = SkeletonUtils.clone(link.gltf.scene);
    link.root = clonedScene.children[0];
}

function buildBow() {
    const bow = models.bow;
    const clonedScene = SkeletonUtils.clone(bow.gltf.scene);

    scene.updateMatrixWorld();

    var linkHand = models.link.root.getObjectByName('handL');
    var pos = linkHand.getWorldPosition();
    
    const offset = bow.offset;
    const pos_x = pos.x + offset[0];
    const pos_y = pos.y + offset[1];
    const pos_z = pos.z + offset[2];

    bow.root = clonedScene.children[0];
    bow.root.position.set(pos_x, pos_y, pos_z);
    bow.root.add(clonedScene);
}

// ============================================================================
// SCENE BUILDING FUNCTIONS
// ============================================================================

function buildScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color( fogColor );

    createCamera();
    createLight();
    createFog();

    createGround();  
    buildModels();
}

function createFog() {
    scene.fog = new THREE.Fog( fogColor, fogNear, fogFar );
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
    
    TWEEN.update();
    
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