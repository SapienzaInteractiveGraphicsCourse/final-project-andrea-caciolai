import {
	Euler,
	EventDispatcher,
	Vector3
} from "../lib/three.js/build/three.module.js";

var MovementPointerLockControls = function ( object, domElement ) {

	if ( domElement === undefined ) {

		console.warn( 'THREE.MovementPointerLockControls: The second parameter "domElement" is now mandatory.' );
		domElement = document.body;

	}

	this.domElement = domElement;
	this.isLocked = false;

	// Set to constrain the pitch of the camera
	// Range is 0 to Math.PI radians
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

    // Set to constrain rotation of the camera
    this.enableMouseHorizontal = true;
    this.enableMouseVertical = true;
    
    this.invertedHorizontal = false;
    this.invertedVertical = false;
    
    //
	// internals
	//

	var scope = this;

	var changeEvent = { type: 'change' };
	var lockEvent = { type: 'lock' };
	var unlockEvent = { type: 'unlock' };

    var euler = new Euler( 0, 0, 0, 'YXZ' );

	var PI_2 = Math.PI / 2;

	var vec = new Vector3();

	function onMouseMove( event ) {

        if ( scope.isLocked === false ) return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		euler.setFromQuaternion( object.quaternion );
        
        if ( scope.enableMouseHorizontal === true ) {
            if ( scope.invertedHorizontal === true ) {
                euler.y += movementX * 0.002;;
            } else {
                euler.y -= movementX * 0.002;
            }
        }
		if ( scope.enableMouseVertical === true ) {
            if ( scope.invertedVertical === true ) {
                euler.x -= movementY * 0.002;
            } else {
                euler.x += movementY * 0.002;
            }
        }
        
		euler.x = Math.max( PI_2 - scope.maxPolarAngle, Math.min( PI_2 - scope.minPolarAngle, euler.x ) );

		object.quaternion.setFromEuler( euler );

		scope.dispatchEvent( changeEvent );

	}

	function onPointerlockChange() {

		if ( scope.domElement.ownerDocument.pointerLockElement === scope.domElement ) {

			scope.dispatchEvent( lockEvent );

			scope.isLocked = true;

		} else {

			scope.dispatchEvent( unlockEvent );

			scope.isLocked = false;

		}

	}

	function onPointerlockError() {

		console.error( 'THREE.MovementPointerLockControls: Unable to use Pointer Lock API' );

	}

	this.connect = function () {

		scope.domElement.ownerDocument.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.ownerDocument.addEventListener( 'pointerlockchange', onPointerlockChange, false );
		scope.domElement.ownerDocument.addEventListener( 'pointerlockerror', onPointerlockError, false );

	};

	this.disconnect = function () {

		scope.domElement.ownerDocument.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.ownerDocument.removeEventListener( 'pointerlockchange', onPointerlockChange, false );
		scope.domElement.ownerDocument.removeEventListener( 'pointerlockerror', onPointerlockError, false );

	};

	this.dispose = function () {

		this.disconnect();

	};

	this.getObject = function () { // retaining this method for backward compatibility

		return object;

	};

	this.getDirection = function () {

		var direction = new Vector3( 0, 0, - 1 );

		return function ( v ) {

			return v.copy( direction ).applyQuaternion( object.quaternion );

		};

	}();

	this.moveForward = function ( distance ) {

		// move forward parallel to the xz-plane
		// assumes camera.up is y-up

		vec.setFromMatrixColumn( object.matrix, 0 );

		vec.crossVectors( object.up, vec );

		object.position.addScaledVector( vec, distance );

	};

	this.moveRight = function ( distance ) {

		vec.setFromMatrixColumn( object.matrix, 0 );

		object.position.addScaledVector( vec, distance );

	};

	this.lock = function () {

		this.domElement.requestPointerLock();

	};

	this.unlock = function () {

		scope.domElement.ownerDocument.exitPointerLock();

	};

	this.connect();

};

MovementPointerLockControls.prototype = Object.create( EventDispatcher.prototype );
MovementPointerLockControls.prototype.constructor = MovementPointerLockControls;

var AimPointerLockControls = function ( object, domElement ) {

	if ( domElement === undefined ) {

		console.warn( 'THREE.AimPointerLockControls: The second parameter "domElement" is now mandatory.' );
		domElement = document.body;

	}

	this.domElement = domElement;
	this.isLocked = false;

	// Set to constrain the pitch of the camera
	// Range is 0 to Math.PI radians
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians
    this.inverted = false;
    this.increment = 0.002;

    this.correction = 0.001;
    this.correctX = false;
    this.correctY = false;
    this.correctZ = false;
    
    //
	// internals
	//

	var scope = this;

	var changeEvent = { type: 'change' };
	var lockEvent = { type: 'lock' };
	var unlockEvent = { type: 'unlock' };

	function onMouseMove( event ) {
        const increment = scope.increment;
        const correction = scope.correction;

        if ( scope.isLocked === false ) return;

		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        if ( scope.inverted ) {
            object.rotation.z += movementY * increment;
        } else {
            object.rotation.z -= movementY * increment;
        }
            
        object.rotation.z = Math.min(
            scope.maxPolarAngle, 
            Math.max(
                object.rotation.z,
                scope.minPolarAngle
            )
        );

        if ( object.rotation.z < scope.maxPolarAngle && object.rotation.z > scope.minPolarAngle) {
            if (scope.correctX) {
                var weight = Math.sin(object.rotation.z + scope.minPolarAngle);
                object.rotation.x += movementY * correction * weight;
            }
            if (scope.correctY) {
                var weight = Math.cos(object.rotation.z + scope.minPolarAngle);
                object.rotation.y += movementY * correction;
            }
            if (scope.correctZ) {
                object.rotation.z += movementY * correction;
            }
        }

		scope.dispatchEvent( changeEvent );
    }
    

	function onPointerlockChange() {

		if ( scope.domElement.ownerDocument.pointerLockElement === scope.domElement ) {

			scope.dispatchEvent( lockEvent );

			scope.isLocked = true;

		} else {

			scope.dispatchEvent( unlockEvent );

			scope.isLocked = false;

		}

	}

	function onPointerlockError() {

		console.error( 'THREE.AimPointerLockControls: Unable to use Pointer Lock API' );

	}

	this.connect = function () {

		scope.domElement.ownerDocument.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.ownerDocument.addEventListener( 'pointerlockchange', onPointerlockChange, false );
		scope.domElement.ownerDocument.addEventListener( 'pointerlockerror', onPointerlockError, false );

	};

	this.disconnect = function () {

		scope.domElement.ownerDocument.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.ownerDocument.removeEventListener( 'pointerlockchange', onPointerlockChange, false );
		scope.domElement.ownerDocument.removeEventListener( 'pointerlockerror', onPointerlockError, false );

	};

	this.dispose = function () {

		this.disconnect();

	};

	this.getObject = function () { // retaining this method for backward compatibility

		return object;

	};

	this.getDirection = function () {

		var direction = new Vector3( 0, 0, - 1 );

		return function ( v ) {

			return v.copy( direction ).applyQuaternion( object.quaternion );

		};

	}();

	this.lock = function () {

		this.domElement.requestPointerLock();

	};

	this.unlock = function () {

		scope.domElement.ownerDocument.exitPointerLock();

	};

	this.connect();

};

AimPointerLockControls.prototype = Object.create( EventDispatcher.prototype );
AimPointerLockControls.prototype.constructor = AimPointerLockControls;

var HeadPointerLockControls = function ( object, domElement ) {

	if ( domElement === undefined ) {

		console.warn( 'THREE.CustomPointerLockControls: The second parameter "domElement" is now mandatory.' );
		domElement = document.body;

	}

	this.domElement = domElement;
	this.isLocked = false;

	// Set to constrain the pitch of the camera
	// Range is 0 to Math.PI radians
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians
    this.inverted = false;
    
    //
	// internals
	//

	var scope = this;

	var changeEvent = { type: 'change' };
	var lockEvent = { type: 'lock' };
	var unlockEvent = { type: 'unlock' };

	function onMouseMove( event ) {

        if ( scope.isLocked === false ) return;

		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        object.rotation.x += movementY * 0.001;
        object.rotation.x = Math.min(
            scope.maxPolarAngle, 
            Math.max(
                object.rotation.x,
                scope.minPolarAngle
            )
        );
            
		scope.dispatchEvent( changeEvent );
	}

	function onPointerlockChange() {

		if ( scope.domElement.ownerDocument.pointerLockElement === scope.domElement ) {

			scope.dispatchEvent( lockEvent );

			scope.isLocked = true;

		} else {

			scope.dispatchEvent( unlockEvent );

			scope.isLocked = false;

		}

	}

	function onPointerlockError() {

		console.error( 'THREE.HeadPointerLockControls: Unable to use Pointer Lock API' );

	}

	this.connect = function () {

		scope.domElement.ownerDocument.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.ownerDocument.addEventListener( 'pointerlockchange', onPointerlockChange, false );
		scope.domElement.ownerDocument.addEventListener( 'pointerlockerror', onPointerlockError, false );

	};

	this.disconnect = function () {

		scope.domElement.ownerDocument.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.ownerDocument.removeEventListener( 'pointerlockchange', onPointerlockChange, false );
		scope.domElement.ownerDocument.removeEventListener( 'pointerlockerror', onPointerlockError, false );

	};

	this.dispose = function () {

		this.disconnect();

	};

	this.getObject = function () { // retaining this method for backward compatibility

		return object;

	};

	this.getDirection = function () {

		var direction = new Vector3( 0, 0, - 1 );

		return function ( v ) {

			return v.copy( direction ).applyQuaternion( object.quaternion );

		};

	}();

	this.lock = function () {

		this.domElement.requestPointerLock();

	};

	this.unlock = function () {

		scope.domElement.ownerDocument.exitPointerLock();

	};

	this.connect();

};

HeadPointerLockControls.prototype = Object.create( EventDispatcher.prototype );
HeadPointerLockControls.prototype.constructor = HeadPointerLockControls;

export { MovementPointerLockControls, AimPointerLockControls, HeadPointerLockControls};