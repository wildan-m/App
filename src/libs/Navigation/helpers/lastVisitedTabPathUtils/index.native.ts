function clearSessionStorage() {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function saveWorkspacesTabPathToSessionStorage(url: string) {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function saveSettingsTabPathToSessionStorage(url: string) {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function saveSearchTabPathToSessionStorage(url: string) {}

function getWorkspacesTabStateFromSessionStorage() {
    return undefined;
}

function getSearchTabStateFromSessionStorage() {
    return undefined;
}

export {
    clearSessionStorage,
    saveSettingsTabPathToSessionStorage,
    saveWorkspacesTabPathToSessionStorage,
    getWorkspacesTabStateFromSessionStorage,
    saveSearchTabPathToSessionStorage,
    getSearchTabStateFromSessionStorage,
};
