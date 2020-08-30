import * as THREE from './lib/three/three.module.js'

const fov = 75;
const aspect = 2;  // the canvas default
const near = 0.1;
const far = 5;

const boxWidth = 1;
const boxHeight = 1;
const boxDepth = 1;

var canvas;
var renderer;
var camera;
var scene;
var cube;

function init() {
    canvas = document.querySelector('#canvas');
    renderer = new THREE.WebGLRenderer({canvas});
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
}

function createScene() {
    scene = new THREE.Scene();
    camera.position.z = 2;
    createCube();
}

function createCube() {
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    const material = new THREE.MeshBasicMaterial({color: 0x44aa88});  // greenish blue
  
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
}

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

function render(time) {
    time *= 0.001;  // convert time to seconds
    
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    
    cube.rotation.x = time;
    cube.rotation.y = time;

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

function main() {
    init();
    createScene();
    requestAnimationFrame(render);
}
main();