import {createContext} from 'react';

/** Fill color the skeleton shape primitives paint with, provided per layer by SkeletonViewContentLoader */
const SkeletonFillContext = createContext<string>('#f5f6f7');

export default SkeletonFillContext;
