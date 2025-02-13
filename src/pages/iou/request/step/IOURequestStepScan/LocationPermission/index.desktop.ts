import {RESULTS} from 'react-native-permissions';
import type {PermissionStatus} from 'react-native-permissions';
import CONST from '@src/CONST';

function requestLocationPermission(): Promise<PermissionStatus> {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                () => resolve(RESULTS.GRANTED),
                (error) => resolve(error.TIMEOUT || error.POSITION_UNAVAILABLE ? RESULTS.BLOCKED : RESULTS.DENIED),
                {
                    timeout: CONST.GPS.TIMEOUT,
                    enableHighAccuracy: true,
                },
            );
        } else {
            resolve(RESULTS.UNAVAILABLE);
        }
    });
}

function getLocationPermission(): Promise<PermissionStatus> {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            const startTime = Date.now();
            navigator.geolocation.getCurrentPosition(
                () => {
                    const endTime = Date.now();
                    const timeElapsed = endTime - startTime;
                    console.log("[wildebug] ~ success~ timeElapsed:", timeElapsed)
                    resolve(RESULTS.GRANTED)},
                (error) => {
                    console.log("[wildebug] ~ index.desktop.ts:33 ~ returnnewPromise ~ error:", error)
                    const endTime = Date.now();
                    const timeElapsed = endTime - startTime;
                    console.log("[wildebug] ~ index.tsx:34 ~ getLocationPermission ~ timeElapsed:", timeElapsed)
                    // If user denies permission, error.code will be 1 (PERMISSION_DENIED)
                    if (error.code === 1) {
                        resolve(RESULTS.BLOCKED);
                    } else if (error.code === 2) { // POSITION_UNAVAILABLE
                        resolve(RESULTS.BLOCKED);
                    } else if (error.code === 3) { // TIMEOUT
                        resolve(RESULTS.BLOCKED);
                    } else {
                        resolve(RESULTS.DENIED);
                    }
                },
                {
                    timeout:5000,
                    enableHighAccuracy: true,
                }
            );
        } else {
            resolve(RESULTS.UNAVAILABLE);
        }
    });
}

// function getLocationPermission(): Promise<PermissionStatus> {
//     return new Promise((resolve) => {
//         if (navigator.geolocation) {
//             navigator.permissions.query({name: 'geolocation'}).then((result) => {
//                 if (result.state === 'prompt') {
//                     resolve(RESULTS.DENIED);
//                     return;
//                 }
//                 resolve(result.state === 'granted' ? RESULTS.GRANTED : RESULTS.BLOCKED);
//             });
//         } else {
//             resolve(RESULTS.UNAVAILABLE);
//         }
//     });
// }

export {requestLocationPermission, getLocationPermission};
