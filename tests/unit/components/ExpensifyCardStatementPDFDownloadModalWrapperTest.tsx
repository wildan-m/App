import {act, renderHook} from '@testing-library/react-native';

import {ModalActions, ModalProvider} from '@components/Modal/Global/ModalContext';

import useExpensifyCardStatementPDFDownloadModal from '@hooks/useExpensifyCardStatementPDFDownloadModal';

import type {ExpensifyCardStatementParams} from '@libs/ExpensifyCardStatementUtils';

import React from 'react';

type MockStatementModalProps = {
    statementParams: ExpensifyCardStatementParams;
    isVisible: boolean;
    onClose: () => void;
    onModalHide?: () => void;
};

let mockLatestProps: MockStatementModalProps | undefined;
let mockMountCount = 0;

jest.mock('@components/ExpensifyCardStatementPDFDownloadModal', () => {
    const {useEffect} = jest.requireActual<typeof React>('react');
    function MockExpensifyCardStatementPDFDownloadModal(props: MockStatementModalProps) {
        mockLatestProps = props;
        useEffect(() => {
            mockMountCount++;
            return () => {
                mockLatestProps = undefined;
            };
        }, []);
        return null;
    }
    return MockExpensifyCardStatementPDFDownloadModal;
});

const MODAL_ID = 'statement-modal';
const statementParams: ExpensifyCardStatementParams = {policyID: 'policy1', feedCountry: 'US', entryIDs: [123]};

function renderStatementModalHook() {
    return renderHook(() => useExpensifyCardStatementPDFDownloadModal(), {
        wrapper: ({children}: {children: React.ReactNode}) => <ModalProvider>{children}</ModalProvider>,
    });
}

describe('ExpensifyCardStatementPDFDownloadModalWrapper', () => {
    beforeEach(() => {
        mockLatestProps = undefined;
        mockMountCount = 0;
    });

    it('opens the statement modal on the global modal stack with the statement params', () => {
        // Given the global modal stack is mounted
        const {result} = renderStatementModalHook();

        // When a statement export shows its modal
        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams});
        });

        // Then the statement modal is rendered visible with the params passed to the show API
        expect(mockLatestProps?.isVisible).toBe(true);
        expect(mockLatestProps?.statementParams).toEqual(statementParams);
    });

    it('updates the open modal in place when the statement key arrives', () => {
        // Given a statement modal opened before the server returned its statement key
        const {result} = renderStatementModalHook();

        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams});
        });

        // When the key arrives and the same modal ID is shown again with it
        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams: {...statementParams, statementKey: 'statement-key'}});
        });

        // Then the same modal instance receives the key, so it stays open and reactive instead of remounting
        expect(mockMountCount).toBe(1);
        expect(mockLatestProps?.isVisible).toBe(true);
        expect(mockLatestProps?.statementParams.statementKey).toBe('statement-key');
    });

    it('resolves only after the modal has finished hiding', async () => {
        // Given an open statement modal whose caller clears the selection when the show promise resolves
        const {result} = renderStatementModalHook();
        const onResolved = jest.fn();

        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams}).then(onResolved);
        });

        // When the user closes it, the modal starts hiding but the promise must not resolve yet
        await act(async () => {
            mockLatestProps?.onClose();
            await Promise.resolve();
        });
        expect(mockLatestProps?.isVisible).toBe(false);
        expect(onResolved).not.toHaveBeenCalled();

        // Then the promise resolves with CLOSE and the modal leaves the stack only once the hide animation has finished
        await act(async () => {
            mockLatestProps?.onModalHide?.();
            await Promise.resolve();
        });
        expect(onResolved).toHaveBeenCalledWith({action: ModalActions.CLOSE});
        expect(mockLatestProps).toBeUndefined();
    });

    it('closes the modal by its ID', async () => {
        // Given an open statement modal
        const {result} = renderStatementModalHook();
        const onResolved = jest.fn();

        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams}).then(onResolved);
        });

        // When the statement request fails and the caller closes the modal by its ID
        await act(async () => {
            result.current.closeExpensifyCardStatementPDFDownloadModal(MODAL_ID);
            await Promise.resolve();
        });

        // Then the modal leaves the stack and its promise resolves with CLOSE
        expect(onResolved).toHaveBeenCalledWith({action: ModalActions.CLOSE});
        expect(mockLatestProps).toBeUndefined();
    });
});
