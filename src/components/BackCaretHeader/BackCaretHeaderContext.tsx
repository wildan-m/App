import React, {createContext, useMemo, useState} from 'react';

type BackCaretHeaderConfig = {
    /** Whether the back button should be displayed */
    shouldShowBackButton: boolean;

    /** Callback fired when the back button is pressed */
    onBackButtonPress?: () => void;
};

type BackCaretHeaderActions = {
    /** Registers the header configuration for the currently focused screen */
    setConfig: (config: BackCaretHeaderConfig) => void;
};

const DEFAULT_CONFIG: BackCaretHeaderConfig = {shouldShowBackButton: false};

/** Holds the header configuration registered by the currently focused screen */
const BackCaretHeaderConfigContext = createContext<BackCaretHeaderConfig>(DEFAULT_CONFIG);

/** Holds the actions used by screens to register their header configuration */
const BackCaretHeaderActionsContext = createContext<BackCaretHeaderActions>({setConfig: () => {}});

function BackCaretHeaderContextProvider({children}: {children: React.ReactNode}) {
    const [config, setConfig] = useState<BackCaretHeaderConfig>(DEFAULT_CONFIG);
    const actions = useMemo(() => ({setConfig}), [setConfig]);

    return (
        <BackCaretHeaderActionsContext.Provider value={actions}>
            <BackCaretHeaderConfigContext.Provider value={config}>{children}</BackCaretHeaderConfigContext.Provider>
        </BackCaretHeaderActionsContext.Provider>
    );
}

BackCaretHeaderContextProvider.displayName = 'BackCaretHeaderContextProvider';

export {BackCaretHeaderConfigContext, BackCaretHeaderActionsContext, BackCaretHeaderContextProvider};
export type {BackCaretHeaderConfig};
