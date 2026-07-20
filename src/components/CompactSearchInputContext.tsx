import React, {createContext, useContext} from 'react';

/**
 * Marks a subtree as one whose search inputs should render in the small/compact size instead of the
 * default large form input. Popover menus that contain a search field opt in by wrapping their content
 * in the provider, so every search input below them stays consistent without threading a prop through
 * each intermediate component.
 */
const CompactSearchInputContext = createContext(false);

function CompactSearchInputContextProvider({children}: React.PropsWithChildren) {
    return <CompactSearchInputContext.Provider value>{children}</CompactSearchInputContext.Provider>;
}

function useShouldUseCompactSearchInput() {
    return useContext(CompactSearchInputContext);
}

export {CompactSearchInputContextProvider, useShouldUseCompactSearchInput};
export default CompactSearchInputContext;
