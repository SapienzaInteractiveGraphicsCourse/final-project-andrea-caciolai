import * as THREE from '../lib/three/build/three.module.js'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function dumpObject(obj, lines = [], isLast = true, prefix = '') {
	const localPrefix = isLast ? '└─' : '├─';
	lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`);
	const newPrefix = prefix + (isLast ? '  ' : '│ ');
	const lastNdx = obj.children.length - 1;
	obj.children.forEach((child, ndx) => {
		const isLast = ndx === lastNdx;
		dumpObject(child, lines, isLast, newPrefix);
	});
	return lines;
}

export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
};

export function degToRad3(degrees3) {
    var rad = [];
    for (var i = 0; i < 3; i++) {
        rad.push(degToRad(degrees3[i]));
    }
    return rad;
}

export function vec3ToArr(vec) {
    return [vec.x, vec.y, vec.z];
}

export function arrToVec3(arr) {
    return new THREE.Vector3(arr[0], arr[1], arr[2]);
}

export function startTweens(tweens) {
    tweens.forEach(
        (tween) => {
            if (tween === undefined ) return;
            tween.start();
        }
    );
}

export function pauseTweens(tweens) {
	tweens.forEach( 
		(tween) => {
            if (tween === undefined ) return;
			tween.pause();
		} 
	);
}

export function resumeTweens(tweens) {
	tweens.forEach( 
		(tween) => {
            if (tween === undefined ) return;
			tween.resume();
		} 
	);	
}

export function stopTweens(tweens) {
    tweens.forEach(
        (tween) => {
            if (tween === undefined ) return;
            tween.stop();
        }
    );
}

export function removeFromArray(array, obj) {
    var filtered = array.filter(function(el) { return el !== obj; }); 
    return filtered;
}

export function vector3Norm(vec) {
    var x, y, z;
    x = vec.x; y = vec.y; z = vec.z;

    return Math.sqrt(x*x + y*y + z*z);
}