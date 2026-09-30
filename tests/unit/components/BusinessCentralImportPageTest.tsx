import {fireEvent, render, screen} from '@testing-library/react-native';

import type ConnectionLayout from '@components/ConnectionLayout';

import * as BusinessCentral from '@libs/actions/connections/BusinessCentral';

import BusinessCentralImportPage from '@pages/workspace/accounting/businessCentral/import/BusinessCentralImportPage';
import type {WithPolicyProps} from '@pages/workspace/withPolicy';
import type {ToggleSettingOptionRowProps} from '@pages/workspace/workflows/ToggleSettingsOptionRow';

import CONST from '@src/CONST';
import type {Policy} from '@src/types/onyx';

import React from 'react';
import {Switch, Text, View} from 'react-native';

import createMock from '../../utils/createMock';

const MockSwitch = Switch;
const MockText = Text;
const MockView = View;
const POLICY_ID = '123';
const CUSTOMER_ROW_LABEL = 'workspace.businessCentral.customers';
const PROJECT_ROW_LABEL = 'workspace.businessCentral.projects';
let mockPolicy: Policy;

jest.mock('@hooks/useLocalize', () => () => ({
    translate: (key: string) => key,
}));
jest.mock('@hooks/useThemeStyles', () => () => ({}));
jest.mock('@libs/actions/connections/BusinessCentral');
jest.mock('@components/Text', () => ({children}: {children: React.ReactNode}) => <MockText>{children}</MockText>);
jest.mock('@components/ConnectionLayout', () => ({children}: React.ComponentProps<typeof ConnectionLayout>) => <>{children}</>);
jest.mock('@pages/workspace/withPolicyConnections', () => (WrappedComponent: React.ComponentType<WithPolicyProps>) => {
    function MockPolicyConnections({route}: Pick<WithPolicyProps, 'route'>) {
        return (
            <WrappedComponent
                policy={mockPolicy}
                policyDraft={undefined}
                isLoadingPolicy={false}
                route={route}
            />
        );
    }
    return MockPolicyConnections;
});
jest.mock('@pages/workspace/workflows/ToggleSettingsOptionRow', () => ({isActive, onToggle, disabled, showLockIcon, switchAccessibilityLabel}: ToggleSettingOptionRowProps) => (
    <MockView>
        <MockSwitch
            accessibilityRole="switch"
            accessibilityLabel={switchAccessibilityLabel}
            accessibilityState={{disabled}}
            value={isActive}
            onValueChange={onToggle}
            disabled={disabled}
        />
        {showLockIcon && <MockText testID="lock-icon">locked</MockText>}
    </MockView>
));

function renderImportPage() {
    return render(
        <BusinessCentralImportPage
            route={createMock<WithPolicyProps['route']>({
                params: {policyID: POLICY_ID},
            })}
            isConnectionDataFetchNeeded={false}
        />,
    );
}

describe('Business Central Customer and Project import rows', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPolicy = createMock<Policy>({
            id: POLICY_ID,
            connections: {
                businessCentral: {
                    config: {
                        coding: {
                            // The Customer mapping is stored before the fixture locks the rows, so tests can assert it survives the lock
                            fieldMappings: {
                                [CONST.BUSINESS_CENTRAL_FIELD_MAPPING_CODE.CUSTOMER]: CONST.BUSINESS_CENTRAL_MAPPING_VALUE.TAG,
                            },
                            syncItems: false,
                            syncTaxRates: false,
                        },
                        export: {
                            reimbursable: CONST.BUSINESS_CENTRAL_EXPORT_DESTINATION.JOURNAL_ENTRY,
                            nonReimbursable: CONST.BUSINESS_CENTRAL_EXPORT_DESTINATION.JOURNAL_ENTRY,
                        },
                    },
                    data: {
                        customers: [{number: 'C00010', name: 'Alpha Customer'}],
                        projects: [{number: 'J00010', name: 'Beta Project'}],
                    },
                },
            },
        });
    });

    it('locks both rows while neither destination exports purchase invoices', () => {
        // Given a connection whose reimbursable and non-reimbursable expenses both export as general journals
        renderImportPage();

        // Then the Customer and Project rows are visible but locked, because nothing would carry the mapping to Business Central
        expect(screen.getByLabelText(CUSTOMER_ROW_LABEL)).toBeDisabled();
        expect(screen.getByLabelText(PROJECT_ROW_LABEL)).toBeDisabled();
        expect(screen.getAllByTestId('lock-icon')).toHaveLength(2);

        // And the stored Customer mapping is preserved, still shown as imported rather than being cleared by the lock
        expect(screen.getByLabelText(CUSTOMER_ROW_LABEL).props.value).toBe(true);
        expect(screen.getByLabelText(PROJECT_ROW_LABEL).props.value).toBe(false);
    });

    it('unlocks the rows when reimbursable expenses export as purchase invoices', () => {
        // Given reimbursable expenses exporting as purchase invoices
        const exportConfig = mockPolicy.connections?.businessCentral?.config?.export;
        if (!exportConfig) {
            throw new Error('Missing Business Central fixture');
        }
        exportConfig.reimbursable = CONST.BUSINESS_CENTRAL_EXPORT_DESTINATION.PURCHASE_INVOICE;
        renderImportPage();

        // Then both rows are editable with no lock icon
        expect(screen.getByLabelText(CUSTOMER_ROW_LABEL)).toBeEnabled();
        expect(screen.getByLabelText(PROJECT_ROW_LABEL)).toBeEnabled();
        expect(screen.queryAllByTestId('lock-icon')).toHaveLength(0);

        // When the Project row is switched on
        fireEvent(screen.getByLabelText(PROJECT_ROW_LABEL), 'valueChange', true);

        // Then the generic field-mapping action receives the fixed PROJECT code, with no previous mapping to roll back to
        expect(BusinessCentral.updateBusinessCentralFieldMapping).toHaveBeenCalledWith(
            POLICY_ID,
            CONST.BUSINESS_CENTRAL_FIELD_MAPPING_CODE.PROJECT,
            CONST.BUSINESS_CENTRAL_MAPPING_VALUE.TAG,
            undefined,
        );
    });

    it('unlocks the rows when only non-reimbursable expenses export as purchase invoices', () => {
        // Given only non-reimbursable expenses exporting as purchase invoices
        const exportConfig = mockPolicy.connections?.businessCentral?.config?.export;
        if (!exportConfig) {
            throw new Error('Missing Business Central fixture');
        }
        exportConfig.nonReimbursable = CONST.BUSINESS_CENTRAL_EXPORT_DESTINATION.PURCHASE_INVOICE;
        renderImportPage();

        // Then either destination is enough to unlock the rows
        expect(screen.getByLabelText(CUSTOMER_ROW_LABEL)).toBeEnabled();

        // When the imported Customer row is switched off
        fireEvent(screen.getByLabelText(CUSTOMER_ROW_LABEL), 'valueChange', false);

        // Then the action receives the fixed CUSTOMER code and the old mapping so a failed save can roll back
        expect(BusinessCentral.updateBusinessCentralFieldMapping).toHaveBeenCalledWith(
            POLICY_ID,
            CONST.BUSINESS_CENTRAL_FIELD_MAPPING_CODE.CUSTOMER,
            CONST.BUSINESS_CENTRAL_MAPPING_VALUE.NONE,
            CONST.BUSINESS_CENTRAL_MAPPING_VALUE.TAG,
        );
    });

    it('only offers the rows whose lists have synced', () => {
        // Given a connection that has synced customers but no projects yet
        const data = mockPolicy.connections?.businessCentral?.data;
        if (!data) {
            throw new Error('Missing Business Central fixture');
        }
        data.projects = [];
        renderImportPage();

        // Then only the Customer row is offered, following the page's data-driven visibility convention
        expect(screen.getByLabelText(CUSTOMER_ROW_LABEL)).toBeOnTheScreen();
        expect(screen.queryByLabelText(PROJECT_ROW_LABEL)).toBeNull();
    });

    it('still shows the Tags section when there are fixed rows but no dimensions', () => {
        // Given a company with customers and projects but no dimensions
        renderImportPage();

        // Then the Tags section renders for the fixed rows alone
        expect(screen.getByText('workspace.common.tags')).toBeOnTheScreen();
    });

    it('hides the Tags section when nothing can be imported as tags', () => {
        // Given a connection with no dimensions, customers, or projects synced
        const data = mockPolicy.connections?.businessCentral?.data;
        if (!data) {
            throw new Error('Missing Business Central fixture');
        }
        data.customers = [];
        data.projects = [];
        renderImportPage();

        // Then no Tags section renders, matching the behavior before the fixed rows existed
        expect(screen.queryByText('workspace.common.tags')).toBeNull();
    });
});
