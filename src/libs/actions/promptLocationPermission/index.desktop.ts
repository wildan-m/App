import ELECTRON_EVENTS from '@desktop/ELECTRON_EVENTS';
import type PromptLocationPermission from './types';

const promptLocationPermission: PromptLocationPermission = () => window.electron.invoke(ELECTRON_EVENTS.PROMPT_LOCATION_PERMISSION) as Promise<string>;

export default promptLocationPermission;
