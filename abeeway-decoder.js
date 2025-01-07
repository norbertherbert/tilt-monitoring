const { sin, cos, atan2, sqrt, PI, } = Math;

export const decodePayloadHex = (payloadHex) => {
    // const payloadHex = "0a00648e0002ffd9fc22002901";
    // const payloadHex = "070061890002faffffffe9fb0000000afc000003f2";
    const buffer = hexStringToArrayBuffer(payloadHex);
    const view = new DataView(buffer);
    const messageType = view.getUint8(0);

    /*

    Example messages:

    laying on its back, facing the sky:    0a04628a00020017000203ec01
    laying on its left side facing at you: 0a04628a000203f6fff6ffe501
    standig, upsid up, facing at you:      0a04628d0002fff20401000801

    Phi
    4    - 0a04628d0002ffe903affe9301
    53   - 0a04628c0002fe520352febe01
    90   - 0a04628d0002fd3b02cf000601
    148  - 0a04628c0002feac0325021b01
    176  - 0a04628d0002ffd102ea02b501
    -124 - 0a04628c000201c50350013301
    -85  - 0a04628c000202060365ffd301
    -38  - 0a04628c000201350373fe7401

    answer to 'orientation on demand' request: 070061890002faffffffe9fb0000000afc000003f2

    */

    if (messageType == 0x0a) {                       // event message
        const eventType = view.getUint8(5);
        // console.log(view.getInt16(6), view.getInt16(8), view.getInt16(10));
        if (eventType == 2) {                        // motion_end event
            return {
                x: -view.getInt16(6),  // local -x
                y: view.getInt16(8),   // local y
                z: -view.getInt16(10), // local -z
            };
        }
    } else if (messageType == 0x07) {                // messageType=0x07 -> config or shock_detect or activity_mon message
        const messageSubType = view.getUint8(5);
        if (messageSubType == 2) {                   // messageSubType=0x02 -> configuration message
            return {
                x: -view.getInt32(7),   // local -x
                y: view.getInt32(12),   // local y
                z: -view.getInt32(17),  // local -z
            }; 
        }
    } else {
        return undefined;
    }
}

export const hexStringToArrayBuffer = (hexString) => {
    // remove the leading 0x
    hexString = hexString.replace(/^0x/, '');
    
    // ensure even number of characters
    if (hexString.length % 2 != 0) {
        console.log('WARNING: expecting an even number of characters in the hexString');
    }
    
    // check for some non-hex characters
    let bad = hexString.match(/[G-Z\s]/i);
    if (bad) {
        console.log('WARNING: found non-hex characters', bad);    
    }
    
    // split the string into pairs of octets
    let pairs = hexString.match(/[\dA-F]{2}/gi);
    
    // convert the octets to integers
    let integers = pairs.map(function(s) {
        return parseInt(s, 16);
    });
    
    // convert the ArrayBuffer
    let array = new Uint8Array(integers);
    
    return array.buffer;
}

export const calculateTheta = (gVec) => {
    const angle = atan2(
        sqrt(gVec.x**2 + gVec.z**2), gVec.y
    ) 
    return angle * 180/PI
}

export const calculateLocalPhi = (gVec) => {
    const angle = atan2(gVec.x, gVec.z) 
    return angle * 180/PI
}

export const calculateTiltX = (gVec) => {
    const angle = atan2(gVec.y, gVec.x) 
    return angle * 180/PI
}

export const calculateTiltZ = (gVec) => {
    const angle = atan2(gVec.y, gVec.z) 
    return angle * 180/PI
}


export const createCorrectionMatrix = ( measuredTheta, measuredPhi, calibrationPayload ) => {

    const r = decodePayloadHex(calibrationPayload);
    // console.log('r: ', r.x, r.y, r.z);

    const len = sqrt(r.x**2 + r.y**2 + r.z**2);

    const r0 = {
        x: len*sin(measuredTheta*PI/180)*sin(measuredPhi*PI/180),
        y: len*cos(measuredTheta*PI/180),
        z: len*sin(measuredTheta*PI/180)*cos(measuredPhi*PI/180),
    };

    // console.log('r0: ', r0.x, r0.y, r0.z);

    const d = {
        x: r.x - r0.x,
        y: r.y - r0.y,
        z: r.z - r0.z,
    };

    // console.log('d: ', d.x, d.y, d.z);

    const c = {
        xx: 1, xy: (r0.x*d.y-r0.y*d.x)/(len**2), xz: -(r0.z*d.x-r0.x*d.z)/(len**2),
        yx: 0, yy: 1,                          yz: (r0.y*d.z-r0.z*d.y)/(len**2),
        zx: 0, zy: 0,                          zz: 1,
    };

    c.yx = -c.xy;
    c.zx = -c.xz;
    c.zy = -c.yz;

    // console.log('c: ', c);

    return c;

}
