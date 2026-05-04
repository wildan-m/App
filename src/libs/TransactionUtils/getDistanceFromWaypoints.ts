import type {WaypointCollection} from '@src/types/onyx/Transaction';

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
}

/**
 * Sum great-circle distances between consecutive waypoints that carry valid lat/lng pairs.
 * Returns 0 when fewer than two waypoints have coordinates, signalling that no offline
 * estimate is possible and callers should fall back to the pending placeholder.
 */
function getDistanceFromWaypoints(waypoints: WaypointCollection | undefined): number {
    if (!waypoints) {
        return 0;
    }

    const orderedPoints = Object.keys(waypoints)
        .sort((a, b) => {
            const aIndex = Number(a.replace('waypoint', ''));
            const bIndex = Number(b.replace('waypoint', ''));
            return aIndex - bIndex;
        })
        .map((key) => waypoints[key])
        .filter((waypoint): waypoint is {lat: number; lng: number} => typeof waypoint?.lat === 'number' && typeof waypoint?.lng === 'number');

    if (orderedPoints.length < 2) {
        return 0;
    }

    let total = 0;
    for (let i = 1; i < orderedPoints.length; i++) {
        const prev = orderedPoints.at(i - 1);
        const curr = orderedPoints.at(i);
        if (!prev || !curr) {
            continue;
        }
        total += haversineMeters(prev.lat, prev.lng, curr.lat, curr.lng);
    }
    return total;
}

export default getDistanceFromWaypoints;
