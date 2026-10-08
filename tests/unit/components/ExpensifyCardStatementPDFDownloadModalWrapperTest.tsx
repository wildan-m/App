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
        const {result} = renderStatementModalHook();

        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams});
        });

        expect(mockLatestProps?.isVisible).toBe(true);
        expect(mockLatestProps?.statementParams).toEqual(statementParams);
    });

    it('updates the open modal in place when the statement key arrives', () => {
        const {result} = renderStatementModalHook();

        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams});
        });
        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams: {...statementParams, statementKey: 'statement-key'}});
        });

        // The same modal instance receives the key, so it stays open and reactive instead of remounting.
        expect(mockMountCount).toBe(1);
        expect(mockLatestProps?.isVisible).toBe(true);
        expect(mockLatestProps?.statementParams.statementKey).toBe('statement-key');
    });

    it('resolves only after the modal has finished hiding', async () => {
        const {result} = renderStatementModalHook();
        const onResolved = jest.fn();

        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams}).then(onResolved);
        });

        await act(async () => {
            mockLatestProps?.onClose();
            await Promise.resolve();
        });
        expect(mockLatestProps?.isVisible).toBe(false);
        expect(onResolved).not.toHaveBeenCalled();

        await act(async () => {
            mockLatestProps?.onModalHide?.();
            await Promise.resolve();
        });
        expect(onResolved).toHaveBeenCalledWith({action: ModalActions.CLOSE});
        expect(mockLatestProps).toBeUndefined();
    });

    it('closes the modal by its ID', async () => {
        const {result} = renderStatementModalHook();
        const onResolved = jest.fn();

        act(() => {
            result.current.showExpensifyCardStatementPDFDownloadModal(MODAL_ID, {statementParams}).then(onResolved);
        });
        await act(async () => {
            result.current.closeExpensifyCardStatementPDFDownloadModal(MODAL_ID);
            await Promise.resolve();
        });

        expect(onResolved).toHaveBeenCalledWith({action: ModalActions.CLOSE});
        expect(mockLatestProps).toBeUndefined();
    });
});
