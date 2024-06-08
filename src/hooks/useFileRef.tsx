import React, { createContext, useContext, useRef, ReactNode } from 'react';
import type {CustomRNImageManipulatorResult} from '@libs/cropOrRotateImage/types';

// Define the type for the context
type FileRefContextType = React.MutableRefObject<File | CustomRNImageManipulatorResult | undefined> | null;

// Create the context
const FileRefContext = createContext<FileRefContextType>(null);

// Custom hook to access the context
const useFileRef = (): FileRefContextType => useContext(FileRefContext);

// Define the type for the provider props
type FileRefProviderProps = {
    children: ReactNode;
};

// Provider component to manage the fileRef value
const FileRefProvider = ({ children }: FileRefProviderProps) => {
    const fileRef = useRef<File | CustomRNImageManipulatorResult | undefined>(null);

    return (
        <FileRefContext.Provider value={fileRef}>
            {children}
        </FileRefContext.Provider>
    );
};

export { FileRefProvider, useFileRef }