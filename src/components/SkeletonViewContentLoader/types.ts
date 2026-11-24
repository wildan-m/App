import type {ReactNode} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';

type SkeletonViewContentLoaderProps = {
    /** Whether the shimmer animation runs; only the static background layer renders when false */
    animate?: boolean;

    /** Seconds one shimmer cycle takes, matching the old react-content-loader speed prop */
    speed?: number;

    /** Width of the skeleton canvas; fills the parent when omitted */
    width?: number | string;

    /** Height of the skeleton canvas */
    height?: number | string;

    /** Color the shapes rest at between shimmer peaks */
    backgroundColor?: string;

    /** Color the shapes crossfade to at the shimmer peak */
    foregroundColor?: string;

    /** Styles applied to the clipping container */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the clipping container */
    testID?: string;

    /** Skeleton shapes, built from SkeletonRect and SkeletonCircle */
    children: ReactNode;
};

export default SkeletonViewContentLoaderProps;
