import ImageSVG from '@components/ImageSVG';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';

import type IconAsset from '@src/types/utils/IconAsset';

import type {ReactNode} from 'react';

import React from 'react';

import type {MapMarkerType} from './types';

import getMapMarkerSize from './getMapMarkerSize';

function useMapMarkers() {
    const {
        MapStartWaypoint: mapStartWaypointIcon,
        MapStopWaypoint: mapStopWaypointIcon,
        MapWaypoint: mapWaypointIcon,
    } = useMemoizedLazyExpensifyIcons(['MapStartWaypoint', 'MapStopWaypoint', 'MapWaypoint']);

    const getMapMarkerIconAsset = (markerType: MapMarkerType): IconAsset => {
        switch (markerType) {
            case 'START_WAYPOINT':
                return mapStartWaypointIcon;
            case 'STOP_WAYPOINT':
                return mapStopWaypointIcon;
            default:
                return mapWaypointIcon;
        }
    };

    const getMapMarkerIconComponent = (markerType: MapMarkerType): ReactNode => {
        const size = getMapMarkerSize(markerType);
        return (
            <ImageSVG
                src={getMapMarkerIconAsset(markerType)}
                width={size.width}
                height={size.height}
            />
        );
    };

    return getMapMarkerIconComponent;
}

export default useMapMarkers;
