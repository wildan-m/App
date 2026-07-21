import {createContext, useContext} from 'react';

type HeaderContextValue = {
    /** Fill color inherited by header icon buttons (back, close, download, rotate) */
    iconFill?: string;
};

const HeaderContext = createContext<HeaderContextValue>({});

function useHeaderContext(): HeaderContextValue {
    return useContext(HeaderContext);
}

export default HeaderContext;
export {useHeaderContext};
export type {HeaderContextValue};
