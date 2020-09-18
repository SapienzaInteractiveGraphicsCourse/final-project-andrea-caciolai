import * as THREE from '../lib/three.js/build/three.module.js'

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
    return (Math.PI / 180.0) * degrees;
}

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

export function ArrToVec3(arr) {
    return new THREE.Vector3(arr[0], arr[1], arr[2]);
}



export function pauseTweens(tweens) {
	tweens.forEach( 
		(tween) => {
			tween.pause();
		} 
	);
}

export function resumeTweens(tweens) {
	tweens.forEach( 
		(tween) => {
			tween.resume();
		} 
	);	
}