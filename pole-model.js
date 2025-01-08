// https://threejs.org/
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


// https://lil-gui.georgealways.com/#
// import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import GUI from 'lil-gui';

import { 
    decodePayloadHex, 
    calculateTheta, calculateLocalPhi, 
    calculateTiltX, calculateTiltZ,
    createCorrectionMatrix4,
    tiltToSphericalDeg, sphericalToTiltDeg
} from "./abeeway-decoder.js" 

const { sin, cos, tan, acos, atan, atan2, sqrt, PI, } = Math;


// Angle variable names:
// -- psi: The angle between the Abeeway Device's -Z Axis and the Geographical North when the pole is in vertical orientation.
// -- phi: The angle between the direction of the pole's lane and the Geographical North.
// -- theta: The angle between the vertical direction and the pole.


// Mesh Data

let gui, guiCalibration, scene, camera, renderer, controls,
    axes, localAxes, 
    dashedLines, localDashedLines,
    pole, poleShadows, poleLen,
    psiArc, phiArc, thetaArc, tiltXArc, tiltZArc,
    // abeewayFrameAxis, 
    abeewayGltf,
    textE, textW, textN, textS, textV, 
    textPsi, textPhi, textTheta, textTiltZ, textTiltX,
    textZ, textNegZ, textX, textNegX, textY;

const animationLoop = (t) => {

    controls.update();
    // axesMaterial.resolution.set(innerWidth, innerHeight); 

    // showAbeeway(renderParams.abeewaySensor);
    // showLocal(renderParams.localAxes);
    // showTilt(renderParams.tiltAngles);
    // showSpherical(renderParams.sphericalAngles);

    renderer.render(scene, camera);

}

export const showAbeeway = (shallShow) => {
    if (shallShow) {
        scene.add(
            // abeewayFrameAxis,
            abeewayGltf,
        );
    } else {
        scene.remove(
            // abeewayFrameAxis,
            abeewayGltf,
        );
    }
}

export const showLocal = (shallShow) => {
    if (shallShow) {
        scene.add(
            localAxes, textZ, textNegZ, textX, textNegX, textY, psiArc, textPsi,
        )
    } else {
        scene.remove(
            localAxes, textZ, textNegZ, textX, textNegX, textY, psiArc, textPsi,
        )
    }
}

export const showTilt = (shallShow) => {
    if (shallShow) {
        scene.add(
            poleShadows, localDashedLines, tiltXArc, tiltZArc, textTiltZ, textTiltX
        )
    } else {
        scene.remove(
            poleShadows, localDashedLines, tiltXArc, tiltZArc, textTiltZ, textTiltX
        )
    }
}

export const showSpherical = (shallShow) => {
    if (shallShow) {
        scene.add(
            dashedLines, thetaArc, phiArc, textTheta, textPhi
        )
    } else {
        scene.remove(
            dashedLines, thetaArc, phiArc, textTheta, textPhi
        )
    }
}

export const renderParams = {
    abeewaySensor: false,
    localAxes: false,
    tiltAngles: false,
    sphericalAngles: false,
    theta: 0, 
    phi: 0, 
    psi: 0,
    setFromPayloadHex: () => { 

        const g = decodePayloadHex(renderParams.actualPayloadHex);
        // console.log(g);
     
        renderParams.theta = Math.round(calculateTheta(g));
        renderParams.phi = Math.round(calculateLocalPhi(g) + renderParams.psi);
        renderParamsTilt.tiltX = Math.round(calculateTiltX(g));
        renderParamsTilt.tiltZ = Math.round(calculateTiltZ(g));

        setPoleCoordinates(renderParams.theta*PI/180, renderParams.phi*PI/180, renderParams.psi*PI/180);
        for (let controller of gui.controllers) { controller.updateDisplay(); };

    },
    setFromPayloadHexCalibr: () => { 

        const g = decodePayloadHex(renderParams.actualPayloadHex);
        
        // const c = createCorrectionMatrix(calibrationParams.theta, calibrationParams.phi - calibrationParams.psi, calibrationParams.calibrationPayloadHex);
        // const gCorrected = {
        //     x: c.xx*g.x + c.xy*g.y + c.xz*g.z,
        //     y: c.yx*g.x + c.yy*g.y + c.yz*g.z,
        //     z: c.zx*g.x + c.zy*g.y + c.zz*g.z,
        // }

        const gVec = new THREE.Vector3(g.x, g.y, g.z);
        const cMat = createCorrectionMatrix4(calibrationParams.theta, calibrationParams.phi - calibrationParams.psi, calibrationParams.calibrationPayloadHex);
        const gCorrected = gVec.applyMatrix4(cMat);


        renderParams.psi = calibrationParams.psi;

        renderParams.theta = Math.round(calculateTheta(gCorrected));
        renderParams.phi = Math.round(calculateLocalPhi(gCorrected) + renderParams.psi);
        renderParamsTilt.tiltX = Math.round(calculateTiltX(gCorrected));
        renderParamsTilt.tiltZ = Math.round(calculateTiltZ(gCorrected));

        setPoleCoordinates(renderParams.theta*PI/180, renderParams.phi*PI/180, renderParams.psi*PI/180);
        for (let controller of gui.controllers) { controller.updateDisplay(); };

    },
    actualPayloadHex: '0a04628c0002fe520352febe01',
};


export const renderParamsTilt = {
    tiltX: 90, 
    tiltZ: 90,
};

export const setRenderParams = (params) => {
    if ('abeewaySensor' in params) {
        renderParams.abeewaySensor = params.abeewaySensor;
        showAbeeway(params.abeewaySensor);
    }
    if ('localAxes' in params) { 
        renderParams.localAxes = params.localAxes;
        showLocal(params.localAxes);
    }
    if ('tiltAngles' in params) {
        renderParams.tiltAngles = params.tiltAngles;
        showTilt(params.tiltAngles);
    }
    if ('sphericalAngles' in params) {
        renderParams.sphericalAngles = params.sphericalAngles;
        showSpherical(params.sphericalAngles);
    }

    if ('theta' in params) {
        renderParams.theta = params.theta;

        const {tiltXDeg, tiltZDeg} = sphericalToTiltDeg(renderParams.theta, renderParams.phi-renderParams.psi);
        renderParamsTilt.tiltX = Math.round(tiltXDeg);
        renderParamsTilt.tiltZ = Math.round(tiltZDeg);

    }
    if ('phi' in params) {
        renderParams.phi = params.phi;

        const {tiltXDeg, tiltZDeg} = sphericalToTiltDeg(renderParams.theta, renderParams.phi-renderParams.psi);
        renderParamsTilt.tiltX = Math.round(tiltXDeg);
        renderParamsTilt.tiltZ = Math.round(tiltZDeg);

    }
    if ('psi' in params) {
        renderParams.psi = params.psi;

        const {tiltXDeg, tiltZDeg} = sphericalToTiltDeg(renderParams.theta, renderParams.phi-renderParams.psi);
        renderParamsTilt.tiltX = Math.round(tiltXDeg);
        renderParamsTilt.tiltZ = Math.round(tiltZDeg);

    }

    for (let controller of gui.controllers) { controller.updateDisplay(); };

    setPoleCoordinates(params.theta*PI/180, params.phi*PI/180, params.psi*PI/180);
    for (let controller of gui.controllers) { controller.updateDisplay(); };

}

export const calibrationParams = {
    abeewaySensor: true,
    localAxes: false,
    tiltAngles: false,
    sphericalAngles: false,
    theta: 0, 
    phi: 0, 
    psi: 0,
    setFromPayloadHex: () => { 
        // alert(calibrationParams.actualPayloadHex);
        const g = decodePayloadHex(calibrationParams.calibrationPayloadHex);
        calibrationParams.theta = Math.round(calculateTheta(g));
        calibrationParams.phi = Math.round(calculateLocalPhi(g) + calibrationParams.psi);
        calibrationParamsTilt.tiltX = Math.round(calculateTiltX(g));
        calibrationParamsTilt.tiltZ = Math.round(calculateTiltZ(g));
        setPoleCoordinates(calibrationParams.theta*PI/180, calibrationParams.phi*PI/180, calibrationParams.psi*PI/180);
        for (let controller of guiCalibration.controllers) { controller.updateDisplay(); };
    },
    calibrationPayloadHex: '0a04628c0002000003c5000001', //'0a00648e0002ffd9fc22002901',
};

export const calibrationParamsTilt = {
    tiltX: 90, 
    tiltZ: 90,
};

export const initPoleModel = (callback) => {

    const container = document.getElementById( 'container' );
    const containerTopLeft = document.getElementById( 'container-top-left' );
    const containerTopRight = document.getElementById( 'container-top-right' );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf0f0f0 );

    camera = new THREE.PerspectiveCamera( 30, window.innerWidth/window.innerHeight, 1, 5000 );
    
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    container.appendChild( renderer.domElement );









    gui = new GUI({title: 'Actual Orientation', container: containerTopRight});
    gui.add( renderParams, 'abeewaySensor' )
        .name('Show Abeeway Sensor')
        .onChange( (val) => { showAbeeway(val); } );


    gui.add( renderParams, 'localAxes' )
        .name('Show Local Coordinate Axes')
        .onChange( (val) => { showLocal(val); } );
    gui.add( renderParams, 'psi', -180, 180, 2 )
        .name('ψ (psi)')
        .onChange( (val) => { 

            const {tiltXDeg, tiltZDeg} = sphericalToTiltDeg(renderParams.theta, renderParams.phi-val);
            renderParamsTilt.tiltX = Math.round(tiltXDeg);
            renderParamsTilt.tiltZ = Math.round(tiltZDeg);

            setPoleCoordinates(renderParams.theta*PI/180, renderParams.phi*PI/180, val*PI/180);
            for (let controller of gui.controllers) { controller.updateDisplay(); };

        } );

    gui.add( renderParams, 'sphericalAngles' )
        .name('Show Spherical Angles')
        .onChange( (val) => { showSpherical(val); } );
    gui.add( renderParams, 'theta', 0, 90, 2 )
        .name('Θ (theta)')
        .onChange( (val) => { 

            const {tiltXDeg, tiltZDeg} = sphericalToTiltDeg(val, renderParams.phi-renderParams.psi);
            renderParamsTilt.tiltX = Math.round(tiltXDeg);
            renderParamsTilt.tiltZ = Math.round(tiltZDeg);

            setPoleCoordinates(val*PI/180, renderParams.phi*PI/180, renderParams.psi*PI/180);
            for (let controller of gui.controllers) { controller.updateDisplay(); };
            // console.log(tiltToSphericalDeg(renderParamsTilt.tiltX, renderParamsTilt.tiltZ));
        } );
    gui.add( renderParams, 'phi', -180, 180, 2 )
        .name('φ (phi)')
        .onChange( (val) => {

            const {tiltXDeg, tiltZDeg} = sphericalToTiltDeg(renderParams.theta, val-renderParams.psi);
            renderParamsTilt.tiltX = Math.round(tiltXDeg);
            renderParamsTilt.tiltZ = Math.round(tiltZDeg);

            setPoleCoordinates(renderParams.theta*PI/180, val*PI/180, renderParams.psi*PI/180);
            for (let controller of gui.controllers) { controller.updateDisplay(); };
            // console.log(tiltToSphericalDeg(renderParamsTilt.tiltX, renderParamsTilt.tiltZ));
        } );

    gui.add( renderParams, 'tiltAngles' )
        .name('Show Tilt Angles')
        .onChange( (val) => { showTilt(val); } );
    gui.add( renderParamsTilt, 'tiltX', 0, 180, 2 )
        .name('tiltX')
        .onChange( (val) => {

            let {thetaDeg, phiLocalDeg} = tiltToSphericalDeg(val, renderParamsTilt.tiltZ);
            renderParams.theta = Math.round(thetaDeg);
            let phi = phiLocalDeg + renderParams.psi;
            if (phi>180) { phi -= 360 }
            renderParams.phi = Math.round(phi);

            // console.log(renderParams.theta, renderParams.phi);
            setPoleCoordinates(renderParams.theta*PI/180, renderParams.phi*PI/180, renderParams.psi*PI/180);
            for (let controller of gui.controllers) { controller.updateDisplay(); };

        } );
    gui.add( renderParamsTilt, 'tiltZ', 0, 180, 2 )
        .name('tiltZ')
        .onChange( (val) => { 

            let {thetaDeg, phiLocalDeg} = tiltToSphericalDeg(renderParamsTilt.tiltX, val);
            renderParams.theta = Math.round(thetaDeg);
            let phi = phiLocalDeg + renderParams.psi;
            if (phi>180) { phi -= 360 }
            renderParams.phi = Math.round(phi);

            // console.log(renderParams.theta, renderParams.phi);
            setPoleCoordinates(renderParams.theta*PI/180, renderParams.phi*PI/180, renderParams.psi*PI/180);
            for (let controller of gui.controllers) { controller.updateDisplay(); };

        } );

    gui.add( renderParams, 'setFromPayloadHex')
        .name('Decode Hex Payload');
    gui.add( renderParams, 'setFromPayloadHexCalibr')
        .name('Decode with Calibration Correction');
    
    gui.add( renderParams, 'actualPayloadHex')
        .name('Payload');

    gui.onOpenClose( changedGUI => {
        if( !changedGUI._closed ) {

            guiCalibration.close();

            showAbeeway(renderParams.abeewaySensor);
            showLocal(renderParams.localAxes);
            showTilt(renderParams.tiltAngles);
            showSpherical(renderParams.sphericalAngles);
            setPoleCoordinates(renderParams.theta*PI/180, renderParams.phi*PI/180, renderParams.psi*PI/180);
            for (let controller of gui.controllers) { controller.updateDisplay(); };

        };
    } );
    
    // gui.open();


    guiCalibration = new GUI({title: 'Calibration', container: containerTopLeft});
    guiCalibration.add( calibrationParams, 'abeewaySensor' )
        .name('Show Abeeway Sensor')
        .onChange( (val) => { showAbeeway(val); } );


    guiCalibration.add( calibrationParams, 'localAxes' )
        .name('Show Local Coordinate Axes')
        .onChange( (val) => { showLocal(val); } );
    guiCalibration.add( calibrationParams, 'psi', -180, 180, 2 )
        .name('Measured ψ (psi)')
        .onChange( (val) => { 

            const {tiltXDeg, tiltZDeg} = sphericalToTiltDeg(calibrationParams.theta, calibrationParams.phi-val);
            calibrationParamsTilt.tiltX = Math.round(tiltXDeg);
            calibrationParamsTilt.tiltZ = Math.round(tiltZDeg);

            setPoleCoordinates(calibrationParams.theta*PI/180, calibrationParams.phi*PI/180, val*PI/180);
            for (let controller of guiCalibration.controllers) { controller.updateDisplay(); };

        } );

    guiCalibration.add( calibrationParams, 'sphericalAngles' )
        .name('Show Spherical Angles')
        .onChange( (val) => { showSpherical(val); } );
    guiCalibration.add( calibrationParams, 'theta', 0, 90, 2 )
        .name('Measured Θ (theta)')
        .onChange( (val) => {

            const {tiltXDeg, tiltZDeg} = sphericalToTiltDeg(val, calibrationParams.phi-calibrationParams.psi);
            calibrationParamsTilt.tiltX = Math.round(tiltXDeg);
            calibrationParamsTilt.tiltZ = Math.round(tiltZDeg);

            setPoleCoordinates(val*PI/180, calibrationParams.phi*PI/180, calibrationParams.psi*PI/180);
            for (let controller of guiCalibration.controllers) { controller.updateDisplay(); };
            // console.log(tiltToSphericalDeg(calibrationParamsTilt.tiltX, calibrationParamsTilt.tiltZ));
        } );
    guiCalibration.add( calibrationParams, 'phi', -180, 180, 2 )
        .name('Measured φ (phi)')
        .onChange( (val) => {

            const {tiltXDeg, tiltZDeg} = sphericalToTiltDeg(calibrationParams.theta, val-calibrationParams.psi);
            calibrationParamsTilt.tiltX = Math.round(tiltXDeg);
            calibrationParamsTilt.tiltZ = Math.round(tiltZDeg);

            setPoleCoordinates(calibrationParams.theta*PI/180, val*PI/180, calibrationParams.psi*PI/180);
            for (let controller of guiCalibration.controllers) { controller.updateDisplay(); };
            // console.log(tiltToSphericalDeg(calibrationParamsTilt.tiltX, calibrationParamsTilt.tiltZ));
        } );

    guiCalibration.add( calibrationParams, 'tiltAngles' )
        .name('Show Tilt Angles')
        .onChange( (val) => { showTilt(val); } );
    guiCalibration.add( calibrationParamsTilt, 'tiltX', 0, 180, 2 )
        .name('Measured tiltX')
        .onChange( (val) => {
            
            const {thetaDeg, phiLocalDeg} = tiltToSphericalDeg(val, calibrationParamsTilt.tiltZ);
            calibrationParams.theta = Math.round(thetaDeg);
            let phi = phiLocalDeg + calibrationParams.psi;
            if (phi>180) { phi -= 360 }
            calibrationParams.phi = Math.round(phi);

            // console.log(calibrationParams.theta, calibrationParams.phi);
            setPoleCoordinates(calibrationParams.theta*PI/180, calibrationParams.phi*PI/180, calibrationParams.psi*PI/180);
            for (let controller of guiCalibration.controllers) { controller.updateDisplay(); };

        } );
    guiCalibration.add( calibrationParamsTilt, 'tiltZ', 0, 180, 2 )
        .name('Measured tiltZ')
        .onChange( (val) => { 
                      
            const {thetaDeg, phiLocalDeg} = tiltToSphericalDeg(calibrationParamsTilt.tiltX, val);
            calibrationParams.theta = Math.round(thetaDeg);
            let phi = phiLocalDeg + calibrationParams.psi;
            if (phi>180) { phi -= 360 }
            calibrationParams.phi = Math.round(phi);
            
            // console.log(calibrationParams.theta, calibrationParams.phi);
            setPoleCoordinates(calibrationParams.theta*PI/180, calibrationParams.phi*PI/180, calibrationParams.psi*PI/180);
            for (let controller of guiCalibration.controllers) { controller.updateDisplay(); };

        } );

    guiCalibration.add( calibrationParams, 'setFromPayloadHex')
        .name('Set From Payload');
    
    guiCalibration.add( calibrationParams, 'calibrationPayloadHex')
        .name('Reported Payload');

    guiCalibration.close();

    guiCalibration.onOpenClose( changedGUI => {
        if( !changedGUI._closed ) {

            gui.close();

            showAbeeway(calibrationParams.abeewaySensor);
            showLocal(calibrationParams.localAxes);
            showTilt(calibrationParams.tiltAngles);
            showSpherical(calibrationParams.sphericalAngles);
            setPoleCoordinates(calibrationParams.theta*PI/180, calibrationParams.phi*PI/180, calibrationParams.psi*PI/180);
            for (let controller of guiCalibration.controllers) { controller.updateDisplay(); };

        };
    } );


















    poleLen = 0.8*window.innerHeight;
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.position.set( 1.5*poleLen, 2*poleLen, 3*poleLen);
    camera.lookAt( scene.position );
    camera.updateProjectionMatrix( );
                
    window.addEventListener( "resize", (event) => {
        // poleLen = 0.8*window.innerHeight;
        camera.aspect = window.innerWidth/window.innerHeight;
        // camera.position.set( 1.5*poleLen, 2*poleLen, 3*poleLen);
        // camera.lookAt( scene.position );
        camera.updateProjectionMatrix( );
        renderer.setSize( window.innerWidth, window.innerHeight );
        setPoleCoordinates(renderParams.theta*PI/180, renderParams.phi*PI/180, renderParams.psi*PI/180);
    });

    controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;
    // controls.position.y = -100;




    // const light = new THREE.AmbientLight( 0x404040 ); // soft white light
    // scene.add( light );

    // White directional light at half intensity shining from the top.
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
    scene.add( directionalLight );



    // Define Geographical Axes

    const axesGeometry = new LineSegmentsGeometry();
    const axesMaterial = new LineMaterial({
        color: 'DarkSlateBlue',
        linewidth: 2, 
        alphaToCoverage: false,
    });
    axes = new LineSegments2( axesGeometry, axesMaterial );
    // axes.position.x = 0;


    // Define Local Axes

    const localAxesGeometry = new LineSegmentsGeometry();
    const localAxesMaterial = new LineMaterial({
        color: 'IndianRed',
        linewidth: 1, 
        alphaToCoverage: false,
    });
    localAxes = new LineSegments2( localAxesGeometry, localAxesMaterial );
    // localAxes.position.x = 0;



    // Define Geographical Dashed Lines

    const dashedLinesGeometry = new THREE.BufferGeometry()
    const dashedLinesMaterial = new THREE.LineDashedMaterial({ 
        color: 'SlateBlue', // 'DimGrey',
        linewidth: 1, 
        scale: 1, 
        dashSize: 15, 
        gapSize: 15,
    });
    dashedLines = new THREE.LineSegments( dashedLinesGeometry, dashedLinesMaterial );


    // Define Local Dashed Lines

    const localDashedLinesGeometry = new THREE.BufferGeometry()
    const localDashedLinesMaterial = new THREE.LineDashedMaterial({ 
        color: 'IndianRed',
        linewidth: 1, 
        scale: 1, 
        dashSize: 15, 
        gapSize: 15,
    });
    localDashedLines = new THREE.LineSegments( localDashedLinesGeometry, localDashedLinesMaterial );


    // Deefine Pole

    const poleGeometry = new LineGeometry();
    const poleMaterial = new LineMaterial({
        color: 'Maroon',
        linewidth: 6, 
        alphaToCoverage: false,
    });
    pole = new LineSegments2( poleGeometry, poleMaterial );


    // Define Shadows

    const poleShadowsGeometry = new LineGeometry();
    const poleShadowsMaterial = new LineMaterial({
        color: 'SlateGrey',
        linewidth: 4, 
        alphaToCoverage: false,
    });
    poleShadows = new LineSegments2( poleShadowsGeometry, poleShadowsMaterial );


    // Define Angle Arcs

    const angleArcBlueMaterial = new LineMaterial({
        color: 'SlateBlue',
        linewidth: 2, 
        alphaToCoverage: false,
    });
    const angleArcRedMaterial = new LineMaterial({
        color: 'IndianRed',
        linewidth: 2, 
        alphaToCoverage: false,
    });
    const angleArcBrownMaterial = new LineMaterial({
        color: 'Maroon',
        linewidth: 2, 
        alphaToCoverage: false,
    });
    const angleArcGreyMaterial = new LineMaterial({
        color: 'SlateGrey',
        linewidth: 2, 
        alphaToCoverage: false,
    });


    psiArc = new Line2( new LineGeometry(), angleArcRedMaterial );
    phiArc = new Line2( new LineGeometry(), angleArcBlueMaterial );
    thetaArc = new Line2( new LineGeometry(), angleArcBrownMaterial );
    tiltXArc = new Line2( new LineGeometry(), angleArcGreyMaterial );
    tiltZArc = new Line2( new LineGeometry(), angleArcGreyMaterial );


    // Define AbeewayFrameAxis

    // const abeewayMaterial = new LineMaterial({
    //     color: 'IndianRed',
    //     linewidth: 2, 
    //     alphaToCoverage: false,
    // });
    // abeewayFrameAxis = new LineSegments2(new LineSegmentsGeometry(), abeewayMaterial);


    // Define Axis labels

    const fontLoader = new FontLoader();
    fontLoader.load( 'assets/helvetiker_regular.typeface.json', (font) => {

        const fontProps = {
            font: font,
            size: 18,
            depth: 1,
            bevelEnabled: false,
            // bevelThickness: 10,
            // bevelSize: 8,
            // bevelOffset: 0,
            // bevelSegments: 5
        };
        const fontPropsSmall = {
            font: font,
            size: 16,
            depth: 1,
            bevelEnabled: false,
        }

        const textSlateBlueMaterial = new THREE.MeshBasicMaterial({color: 'SlateBlue'});
        const textRedMaterial = new THREE.MeshBasicMaterial({color: 'IndianRed'});
        const textBlueMaterial = new THREE.MeshBasicMaterial({color: 'DarkSlateBlue'});
        const textBrownMaterial = new THREE.MeshBasicMaterial({color: 'Maroon'});
        const textGreyMaterial = new THREE.MeshBasicMaterial({color: 'SlateGrey'});

        const textEGeometry = new TextGeometry('E', fontProps);
        textE = new THREE.Mesh( textEGeometry, textBlueMaterial );

        const textWGeometry = new TextGeometry('W', fontProps);
        textW = new THREE.Mesh( textWGeometry, textBlueMaterial );

        const textNGeometry = new TextGeometry('N', fontProps);
        textN = new THREE.Mesh( textNGeometry, textBlueMaterial );

        const textSGeometry = new TextGeometry('S', fontProps);
        textS = new THREE.Mesh( textSGeometry, textBlueMaterial );

        const textVGeometry = new TextGeometry( 'V', fontProps);
        textV = new THREE.Mesh( textVGeometry, textBlueMaterial );

        const textThetaGeometry = new TextGeometry( 'Θ', fontProps);
        textTheta = new THREE.Mesh( textThetaGeometry, textBrownMaterial );

        const textPhiGeometry = new TextGeometry( 'φ', fontProps);
        textPhi = new THREE.Mesh( textPhiGeometry, textSlateBlueMaterial );
        textPhi.rotation.x += -PI/2;

        const textPsiGeometry = new TextGeometry( 'ψ', fontProps); //ΘΦΨφψ
        textPsi = new THREE.Mesh( textPsiGeometry, textRedMaterial );
        textPsi.rotation.x += -PI/2;

        const textZGeometry = new TextGeometry( "+z", fontProps);
        textZ = new THREE.Mesh( textZGeometry, textRedMaterial );

        const textNegZGeometry = new TextGeometry( "-z", fontProps);
        textNegZ = new THREE.Mesh( textNegZGeometry, textRedMaterial );

        const textXGeometry = new TextGeometry( "+x", fontProps);
        textX = new THREE.Mesh( textXGeometry, textRedMaterial );

        const textNegXGeometry = new TextGeometry( "-x", fontProps);
        textNegX = new THREE.Mesh( textNegXGeometry, textRedMaterial );

        const textYGeometry = new TextGeometry( "y", fontProps);
        textY = new THREE.Mesh( textYGeometry, textRedMaterial );

        const textTiltZGeometry = new TextGeometry( "tiltZ", fontPropsSmall);
        textTiltZ = new THREE.Mesh( textTiltZGeometry, textGreyMaterial );

        const textTiltXGeometry = new TextGeometry( "tiltX", fontPropsSmall);
        textTiltX = new THREE.Mesh( textTiltXGeometry, textGreyMaterial );




        const gltfLoader = new GLTFLoader();
        gltfLoader.load( 'assets/Compact_Tracker.glb', function ( gltf ) {


            abeewayGltf = gltf.scene;

            scene.add(
                axes, 
                // localAxes, 
                // dashedLines, localDashedLines,
                pole, 
                // poleShadows,
                // psiArc, 
                // phiArc, thetaArc, tiltXArc, tiltZArc,
                // abeeway,
                textE, textW, textN, textS, textV, 
                // textPsi, 
                // textPhi, textTheta, textTiltZ, textTiltX,
                // textZ, textNegZ, textX, textNegX, textY
                abeewayGltf,
            );
            // scene.add( gltf.scene );
            callback();
            renderer.setAnimationLoop( animationLoop );
    
        }, undefined, function ( error ) {
            console.error( error );
        } );


    });
}


export const setPoleCoordinates = (theta, phi, psi) => {


    const yAxisUnitVec = new THREE.Vector3(0, 1, 0);

    // Rotate by psi areound Y axis
    let psiRotMat = new THREE.Matrix4();
    psiRotMat.makeRotationAxis(yAxisUnitVec, psi);
    // poleVec.applyMatrix4(psiRotMat);

    // let phi = atan2(poleVec.x, poleVec.z);
    let phiRotMat = new THREE.Matrix4();
    phiRotMat.makeRotationAxis(yAxisUnitVec, phi);

    // let poleLen = 0.8*innerHeight;
    let poleVec = new THREE.Vector3();
    poleVec.setFromSphericalCoords(poleLen, theta, phi);

    // let theta = atan2(sqrt(poleVec.x**2 + poleVec.z**2), abs(poleVec.y));
    let thetaRotMat = new THREE.Matrix4();
    let thetaRotAxis = (new THREE.Vector3()).crossVectors(yAxisUnitVec, poleVec).normalize();
    thetaRotMat.makeRotationAxis(thetaRotAxis, theta);



    const localXAxisUnitVec = (new THREE.Vector3(1,0,0)).applyMatrix4(psiRotMat);
    const localZAxisUnitVec = (new THREE.Vector3(0,0,1)).applyMatrix4(psiRotMat);
    let tiltX = poleVec.clone().projectOnPlane(localZAxisUnitVec).angleTo(localXAxisUnitVec);
    // renderParamsTilt.tiltX = Math.round(tiltX*180/PI);
    let tiltZ = poleVec.clone().projectOnPlane(localXAxisUnitVec).angleTo(localZAxisUnitVec);
    // renderParamsTilt.tiltZ = Math.round(tiltZ*180/PI);


    // let poleLocalVecX = poleLen*sin(theta)*sin(phi-psi);
    // let poleLocalVecZ = poleLen*sin(theta)*cos(phi-psi);
    // let tiltX = atan2(poleVec.y, poleLocalVecX);
    // let tiltZ = atan2(poleVec.y, poleLocalVecZ);





    scene.position.y = -poleVec.y*0.4;
    scene.background = new THREE.Color( 'gainsboro' );

    // camera.aspect = innerWidth/innerHeight;
    // camera.position.set( 1.5*poleLen, 2*poleLen, 3*poleLen);
    // camera.lookAt( scene.position );
    // camera.updateProjectionMatrix( );

    renderer.setSize( innerWidth, innerHeight );


    // Update Pole

    pole.geometry.setPositions([0,0,0,  poleVec.x,poleVec.y,poleVec.z]);


    // Update Geographical Axes

    axes.geometry.setPositions([
        0,  0, -poleLen,       0, 0, poleLen,
        -poleLen, 0, 0,        poleLen, 0, 0,       
        0,  0, 0,              0, poleLen, 0,
    ] );
   

    // Update Dashed Lines

    const dashedLinesPositions = [
        poleVec.x, 0,  0,            poleVec.x, poleVec.y, 0,
        poleVec.x, 0,  0,            poleVec.x, 0,  poleVec.z,
        0,  poleVec.y, 0,            poleVec.x, poleVec.y, 0,
        0,  poleVec.y, 0,            0,  poleVec.y, poleVec.z,
        0,  0,  poleVec.z,           poleVec.x, 0,  poleVec.z,
        0,  0,  poleVec.z,           0,  poleVec.y, poleVec.z,
        0,  poleVec.y, 0,            poleVec.x, poleVec.y, poleVec.z,
        0,  0,  0,                   poleVec.x, 0,  poleVec.z,
        poleVec.x, 0,  poleVec.z,    poleVec.x, poleVec.y, poleVec.z,
        0,  poleVec.y, poleVec.z,    poleVec.x, poleVec.y, poleVec.z,
        poleVec.x, poleVec.y, 0,     poleVec.x, poleVec.y, poleVec.z,
    ];
    let dashedLinesBufferAttribute = new THREE.BufferAttribute( new Float32Array(dashedLinesPositions), 3 );
    // dashedLinesBufferAttribute.needsUpdate = true;
    dashedLines.geometry.setAttribute( 
        'position', dashedLinesBufferAttribute
    );
    dashedLines.computeLineDistances();


    // Update Local Axes

    const localAxesPositions = [];

    const localXAxisNegVec = localXAxisUnitVec.clone().negate().multiplyScalar(poleLen);
    localXAxisNegVec.toArray(localAxesPositions, localAxesPositions.length);
    const localXAxisPosVec = localXAxisUnitVec.clone().multiplyScalar(poleLen);
    localXAxisPosVec.toArray(localAxesPositions, localAxesPositions.length);

    const localZAxisNegVec = localZAxisUnitVec.clone().negate().multiplyScalar(poleLen);
    localZAxisNegVec.toArray(localAxesPositions, localAxesPositions.length);
    const localZAxisPosVec = localZAxisUnitVec.clone().multiplyScalar(poleLen);
    localZAxisPosVec.toArray(localAxesPositions, localAxesPositions.length);
    
    localAxes.geometry.setPositions(localAxesPositions);


    // Update Local Dashed Lines

    const poleLocalXAxisProjVec = poleVec.clone().projectOnVector(localXAxisUnitVec);
    const poleLocalYAxisProjVec = poleVec.clone().projectOnVector(yAxisUnitVec);
    const poleLocalZAxisProjVec = poleVec.clone().projectOnVector(localZAxisUnitVec);
    const poleLocalZYPlaneProjVec = poleLocalZAxisProjVec.clone().add(poleLocalYAxisProjVec);
    const poleLocalXYPlaneProjVec = poleLocalXAxisProjVec.clone().add(poleLocalYAxisProjVec);
    const poleLocalXZPlaneProjVec = poleLocalXAxisProjVec.clone().add(poleLocalZAxisProjVec);

    const localDashedLinesPositions = [];

    // -- Vertical Lines
    poleLocalXAxisProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalXYPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalZAxisProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalZYPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalXZPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);

    // -- XZ Plane at Y=0
    // localDashedLinesPositions.push(0,0,0);
    // poleLocalXZPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalZAxisProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalXZPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalXAxisProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalXZPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);

    // -- XZ Plane at Y=poleLen
    // poleLocalYAxisProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    // poleVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalXYPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalZYPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalYAxisProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalZYPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalYAxisProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);
    poleLocalXYPlaneProjVec.toArray(localDashedLinesPositions, localDashedLinesPositions.length);

    const localDashedLinesBufferAttribute = new THREE.BufferAttribute( new Float32Array(localDashedLinesPositions), 3 );
    localDashedLines.geometry.setAttribute( 
        'position', localDashedLinesBufferAttribute
    );
    localDashedLines.computeLineDistances();
    

    //Update Shadows

    let poleShadowsPositions = [0,0,0,  0,0,0,  0,0,0,  0,0,0,];
    poleLocalXYPlaneProjVec.toArray(poleShadowsPositions, 3);
    poleLocalZYPlaneProjVec.toArray(poleShadowsPositions, 9);

    // let poleShadowsPositions = [
    //     0, 0, 0,    poleVec.x, poleVec.y, 0,
    //     0, 0, 0,    0,  poleVec.y, poleVec.z,
    // ];

    poleShadows.geometry.setPositions(poleShadowsPositions);


    // Update AngleArcs

    const angleStep = PI/50;
    let angleVec;

    let thetaArcPositions = [];
    const thetaArcRadius = 0.3*poleLen;
    for (let alpha = 0; alpha < theta; alpha += angleStep) {
        angleVec = new THREE.Vector3(0, cos(alpha), sin(alpha));
        angleVec.multiplyScalar(thetaArcRadius);
        angleVec.applyMatrix4(phiRotMat);
        angleVec.toArray(thetaArcPositions, thetaArcPositions.length);
    }
    angleVec = new THREE.Vector3(0, cos(theta), sin(theta));
    angleVec.multiplyScalar(thetaArcRadius);
    angleVec.applyMatrix4(phiRotMat);
    angleVec.toArray(thetaArcPositions, thetaArcPositions.length);
    const thetaArcGeometry = new LineGeometry();
    thetaArcGeometry.setPositions(thetaArcPositions);
    thetaArc.geometry = thetaArcGeometry;

    let phiArcPositions = [];
    const phiArcRadius = 0.2*poleLen;
    if (phi > 0) {
        for (let alpha = 0; alpha < phi; alpha += angleStep) {
            angleVec = new THREE.Vector3(sin(alpha), 0, cos(alpha));
            angleVec.multiplyScalar(phiArcRadius);
            angleVec.toArray(phiArcPositions, phiArcPositions.length);
        }
    } else {
        for (let alpha = 0; alpha > phi; alpha -= angleStep) {
            angleVec = new THREE.Vector3(sin(alpha), 0, cos(alpha));
            angleVec.multiplyScalar(phiArcRadius);
            angleVec.toArray(phiArcPositions, phiArcPositions.length);
        }
    }
    angleVec = new THREE.Vector3(sin(phi), 0, cos(phi));
    angleVec.multiplyScalar(phiArcRadius);
    angleVec.toArray(phiArcPositions, phiArcPositions.length);
    phiArcPositions.push(0,0,0);
    const phiArcGeometry = new LineGeometry();
    phiArcGeometry.setPositions(phiArcPositions);
    phiArc.geometry = phiArcGeometry;


 






    let psiArcPositions = [];
    const psiArcRadius = 0.4*poleLen;
    if (psi > 0) {
        for (let alpha = 0; alpha < psi; alpha += angleStep) {
            angleVec = new THREE.Vector3(sin(alpha), 0, cos(alpha));
            angleVec.multiplyScalar(psiArcRadius);
            angleVec.toArray(psiArcPositions, psiArcPositions.length);
        }
    } else {
        for (let alpha = 0; alpha > psi; alpha -= angleStep) {
            angleVec = new THREE.Vector3(sin(alpha), 0, cos(alpha));
            angleVec.multiplyScalar(psiArcRadius);
            angleVec.toArray(psiArcPositions, psiArcPositions.length);
        }
    }
    angleVec = new THREE.Vector3(sin(psi), 0, cos(psi));
    angleVec.multiplyScalar(psiArcRadius);
    angleVec.toArray(psiArcPositions, psiArcPositions.length);
    const psiArcGeometry = new LineGeometry();
    psiArcGeometry.setPositions(psiArcPositions);
    psiArc.geometry = psiArcGeometry;


    let tiltXArcPositions = [0,0,0];
    const tiltXArcRadius = 0.5*poleLen;
    if (tiltX > 0) {
        for (let alpha = 0; alpha < tiltX; alpha += angleStep) {
            angleVec = new THREE.Vector3(cos(alpha), sin(alpha), 0);
            angleVec.multiplyScalar(tiltXArcRadius)
            angleVec.applyMatrix4(psiRotMat);
            angleVec.toArray(tiltXArcPositions, tiltXArcPositions.length);
        }
    } else {
        for (let alpha = 0; alpha > tiltX; alpha -= angleStep) {
            angleVec = new THREE.Vector3(cos(alpha), sin(alpha), 0);
            angleVec.multiplyScalar(tiltXArcRadius)
            angleVec.applyMatrix4(psiRotMat);
            angleVec.toArray(tiltXArcPositions, tiltXArcPositions.length);
        }
    }
    angleVec = new THREE.Vector3(cos(tiltX), sin(tiltX), 0);
    angleVec.multiplyScalar(tiltXArcRadius)
    angleVec.applyMatrix4(psiRotMat);
    angleVec.toArray(tiltXArcPositions, tiltXArcPositions.length);
    tiltXArcPositions.push(0,0,0);
    const tiltXArcGeometry = new LineGeometry();
    tiltXArcGeometry.setPositions(tiltXArcPositions);
    tiltXArc.geometry = tiltXArcGeometry;
 

    let tiltZArcPositions = [0,0,0];
    const tiltZArcRadius = 0.5*poleLen;
    if (tiltZ > 0) {
        for (let alpha = 0; alpha < tiltZ; alpha += angleStep) {
            angleVec = new THREE.Vector3(0, sin(alpha), cos(alpha));
            angleVec.multiplyScalar(tiltZArcRadius);
            angleVec.applyMatrix4(psiRotMat);
            angleVec.toArray(tiltZArcPositions, tiltZArcPositions.length);
        }
    } else {
        for (let alpha = 0; alpha > tiltZ; alpha -= angleStep) {
            angleVec = new THREE.Vector3(0, sin(alpha), cos(alpha));
            angleVec.multiplyScalar(tiltZArcRadius);
            angleVec.applyMatrix4(psiRotMat);
            angleVec.toArray(tiltZArcPositions, tiltZArcPositions.length);
        }
    }
    angleVec = new THREE.Vector3(0, sin(tiltZ), cos(tiltZ));
    angleVec.multiplyScalar(tiltZArcRadius);
    angleVec.applyMatrix4(psiRotMat);
    angleVec.toArray(tiltZArcPositions, tiltZArcPositions.length);
    tiltZArcPositions.push(0,0,0);
    const tiltZArcGeometry = new LineGeometry();
    tiltZArcGeometry.setPositions(tiltZArcPositions);
    tiltZArc.geometry = tiltZArcGeometry;


    // Update AbeewayFrameAxis

    // let abeewayVertices = [
    //     0, poleLen/2, 10,    0,  (poleLen/2),    10+80,
    //     0, poleLen/2, 10,    80, (poleLen/2),    10,       
    //     0, poleLen/2, 10,    0,  (poleLen/2)+80, 10,
    // ];
    // let abeewayVerticeVecs = [];
    // for (let i=0; i<abeewayVertices.length-2; i+=3) {
    //     let v = new THREE.Vector3(abeewayVertices[i], abeewayVertices[i+1], abeewayVertices[i+2]);
    //     v.applyMatrix4(psiRotMat);
    //     // v.applyMatrix4(phiRotMat);
    //     v.applyMatrix4(thetaRotMat);
    //     // console.log(v);
    //     abeewayVerticeVecs.push(v.x, v.y, v.z);
    // }
    // abeewayFrameAxis.geometry.setPositions(abeewayVerticeVecs);


    abeewayGltf.rotation.x = 0;
    abeewayGltf.rotation.y = -PI/2;
    abeewayGltf.rotation.z = 0;
    abeewayGltf.position.x = 0;
    abeewayGltf.position.y = poleLen/2;
    abeewayGltf.position.z = 16;
    abeewayGltf.applyMatrix4(psiRotMat);
    abeewayGltf.applyMatrix4(thetaRotMat);


    // Updates Axis labels

    let v;

    textE.position.x = poleLen - 8;
    textE.position.y = -30;
    textE.position.z = 0;

    textW.position.x = -(poleLen + 10);
    textW.position.y = -30;
    textW.position.z = 0;

    textN.position.x = -8;
    textN.position.y = -30;
    textN.position.z = poleLen;

    textS.position.x = -8;
    textS.position.y = -30;
    textS.position.z = -poleLen;

    textV.position.x = -8;
    textV.position.y = poleLen + 10;
    textV.position.z = 0;

    v = new THREE.Vector3( 0, thetaArcRadius - 10, -25 ).applyMatrix4(phiRotMat);
    textTheta.position.x = v.x;
    textTheta.position.y = v.y;
    textTheta.position.z = v.z;
    textTheta.rotation.y = -(PI/2) + phi;

    textPhi.position.x = phi>0 ? -25 : 8;
    textPhi.position.y = 0;
    textPhi.position.z = phiArcRadius + 8;

    textPsi.position.x = psi>0 ? -25 : 8;
    textPsi.position.y = 0;
    textPsi.position.z = psiArcRadius + 8;

    v = new THREE.Vector3( (poleLen-35) - 8, -30, 0 ).applyMatrix4(psiRotMat);
    textX.position.x =v.x;
    textX.position.y =v.y;
    textX.position.z =v.z;
    textX.rotation.y = psi;

    v = new THREE.Vector3( -((poleLen-30) + 10), -30, 0 ).applyMatrix4(psiRotMat);
    textNegX.position.x =v.x;
    textNegX.position.y =v.y;
    textNegX.position.z =v.z;
    textNegX.rotation.y = psi;

    v = new THREE.Vector3( -13, -30, (poleLen-30) ).applyMatrix4(psiRotMat);
    textZ.position.x = v.x;
    textZ.position.y = v.y;
    textZ.position.z = v.z;
    textZ.rotation.y = psi;

    v = new THREE.Vector3( -13, -30, -(poleLen-30) ).applyMatrix4(psiRotMat);
    textNegZ.position.x = v.x;
    textNegZ.position.y = v.y;
    textNegZ.position.z = v.z;
    textNegZ.rotation.y = psi;

    textY.position.x = -8;
    textY.position.y = (poleLen+30) + 10;
    textY.position.z = 0;

    v = new THREE.Vector3( tiltXArcRadius-20 , -25, 0 ).applyMatrix4(psiRotMat);
    textTiltX.position.x =v.x;
    textTiltX.position.y =v.y;
    textTiltX.position.z =v.z;
    textTiltX.rotation.y = psi;

    v = new THREE.Vector3( 0, -25, tiltZArcRadius+20 ).applyMatrix4(psiRotMat);
    textTiltZ.position.x = v.x;
    textTiltZ.position.y = v.y;
    textTiltZ.position.z = v.z;
    textTiltZ.rotation.y = psi + PI/2;

}
