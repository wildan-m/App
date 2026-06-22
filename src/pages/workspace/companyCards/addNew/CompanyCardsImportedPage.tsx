import React, {useMemo, useState} from 'react';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import type {ColumnRole} from '@components/ImportColumn';
import ImportSpreadsheetColumns from '@components/ImportSpreadsheetColumns';
import ScreenWrapper from '@components/ScreenWrapper';
import useCloseImportPage from '@hooks/useCloseImportPage';
import useImportSpreadsheetConfirmModal from '@hooks/useImportSpreadsheetConfirmModal';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePolicy from '@hooks/usePolicy';
import {getCSVFeedType} from '@libs/CardUtils';
import {findDuplicate, generateColumnNames} from '@libs/importSpreadsheetUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import {goBackFromInvalidPolicy} from '@libs/PolicyUtils';
import type {WorkspaceSplitNavigatorParamList} from '@navigation/types';
import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import {importCSVCompanyCards, parseCSVAmount} from '@userActions/CompanyCards';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {Errors} from '@src/types/onyx/OnyxCommon';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

type CompanyCardsImportedPageProps = PlatformStackScreenProps<WorkspaceSplitNavigatorParamList, typeof SCREENS.WORKSPACE.COMPANY_CARDS_IMPORTED>;

function CompanyCardsImportedPage({route}: CompanyCardsImportedPageProps) {
    const {translate} = useLocalize();
    const [spreadsheet, spreadsheetMetadata] = useOnyx(ONYXKEYS.IMPORTED_SPREADSHEET);
    const [addNewCard] = useOnyx(ONYXKEYS.ADD_NEW_COMPANY_CARD);
    const policyID = route.params.policyID;
    const policy = usePolicy(policyID);
    const workspaceAccountID = policy?.policyAccountID ?? CONST.DEFAULT_NUMBER_ID;
    const [lastSelectedFeed] = useOnyx(`${ONYXKEYS.COLLECTION.LAST_SELECTED_FEED}${policyID}`);
    const [workspaceCardFeeds] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${workspaceAccountID}`);
    const [isImportingTransactions, setIsImportingTransactions] = useState(false);
    const {setIsClosing} = useCloseImportPage();
    const showImportSpreadsheetConfirmModal = useImportSpreadsheetConfirmModal();
    const shouldUseAdvancedFields = addNewCard?.data?.useAdvancedFields ?? false;
    const layoutName = addNewCard?.data?.companyCardLayoutName ?? '';
    const prefilledLayoutType = addNewCard?.data?.layoutType;
    const generatedLayoutType = useMemo(
        () => prefilledLayoutType ?? getCSVFeedType(workspaceCardFeeds?.settings?.companyCards),
        [prefilledLayoutType, workspaceCardFeeds?.settings?.companyCards],
    );
    const layoutType = prefilledLayoutType ?? generatedLayoutType;

    const columnNames = generateColumnNames(spreadsheet?.data?.length ?? 0);

    const columnRoles: ColumnRole[] = (() => {
        const baseRoles: ColumnRole[] = [
            {text: translate('workspace.companyCards.addNewCard.csvColumns.ignore'), value: CONST.CSV_IMPORT_COLUMNS.IGNORE},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.cardNumber'), value: CONST.CSV_IMPORT_COLUMNS.CARD_NUMBER, isRequired: true},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.postedDate'), value: CONST.CSV_IMPORT_COLUMNS.POSTED_DATE, isRequired: true},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.merchant'), value: CONST.CSV_IMPORT_COLUMNS.MERCHANT, isRequired: true},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.amount'), value: CONST.CSV_IMPORT_COLUMNS.AMOUNT, isRequired: true},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.currency'), value: CONST.CSV_IMPORT_COLUMNS.CURRENCY, isRequired: true},
        ];

        if (!shouldUseAdvancedFields) {
            return baseRoles;
        }

        const advancedRoles: ColumnRole[] = [
            {text: translate('workspace.companyCards.addNewCard.csvColumns.originalTransactionDate'), value: CONST.CSV_IMPORT_COLUMNS.ORIGINAL_TRANSACTION_DATE},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.originalAmount'), value: CONST.CSV_IMPORT_COLUMNS.ORIGINAL_AMOUNT},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.originalCurrency'), value: CONST.CSV_IMPORT_COLUMNS.ORIGINAL_CURRENCY},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.comment'), value: CONST.CSV_IMPORT_COLUMNS.COMMENT},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.category'), value: CONST.CSV_IMPORT_COLUMNS.CATEGORY},
            {text: translate('workspace.companyCards.addNewCard.csvColumns.tag'), value: CONST.CSV_IMPORT_COLUMNS.TAG},
        ];

        return [...baseRoles, ...advancedRoles];
    })();

    const requiredColumns = columnRoles.filter((role) => role.isRequired);

    // Scan the mapped rows for the exact data conditions that `buildOptimisticCompanyCardCSVTransactions` uses to silently skip a row
    // (empty card number, posted date or currency, or an amount that can't be parsed). Returns a human-readable list of the offending
    // rows and missing fields so the user gets an actionable message instead of the generic import-failure modal.
    const findInvalidRows = (): string | undefined => {
        const columnNamesByIndex = Object.values(spreadsheet?.columns ?? {});
        const columnMappings = columnNames.map((_, index) => columnNamesByIndex.at(index) ?? CONST.CSV_IMPORT_COLUMNS.IGNORE);
        const cardNumberColumnIndex = columnMappings.findIndex((column) => column === CONST.CSV_IMPORT_COLUMNS.CARD_NUMBER);
        const postedDateColumnIndex = columnMappings.findIndex((column) => column === CONST.CSV_IMPORT_COLUMNS.POSTED_DATE);
        const currencyColumnIndex = columnMappings.findIndex((column) => column === CONST.CSV_IMPORT_COLUMNS.CURRENCY);
        const amountColumnIndex = columnMappings.findIndex((column) => column === CONST.CSV_IMPORT_COLUMNS.AMOUNT);

        const dataColumns = spreadsheet?.data ?? [];
        const rowCount = dataColumns.at(0)?.length ?? 0;
        // The first row holds headers when `containsHeader` is set, so skip it when scanning the actual data.
        const firstDataRowIndex = spreadsheet?.containsHeader ? 1 : 0;
        const getCell = (columnIndex: number, rowIndex: number) => (columnIndex >= 0 ? (dataColumns.at(columnIndex)?.at(rowIndex) ?? '') : '');

        const invalidRows: string[] = [];
        for (let rowIndex = firstDataRowIndex; rowIndex < rowCount; rowIndex++) {
            const missingFields: string[] = [];
            if (!getCell(cardNumberColumnIndex, rowIndex).trim()) {
                missingFields.push(translate('workspace.companyCards.addNewCard.csvColumns.cardNumber'));
            }
            if (!getCell(postedDateColumnIndex, rowIndex).trim()) {
                missingFields.push(translate('workspace.companyCards.addNewCard.csvColumns.postedDate'));
            }
            if (!getCell(currencyColumnIndex, rowIndex).trim()) {
                missingFields.push(translate('workspace.companyCards.addNewCard.csvColumns.currency'));
            }
            if (parseCSVAmount(getCell(amountColumnIndex, rowIndex)) === undefined) {
                missingFields.push(translate('workspace.companyCards.addNewCard.csvColumns.amount'));
            }
            if (missingFields.length === 0) {
                continue;
            }
            // Report the row number as it appears in the user's file (1-based, header row included).
            invalidRows.push(`${rowIndex + 1} (${missingFields.join(', ')})`);
            if (invalidRows.length >= CONST.COMPANY_CARDS.MAX_INVALID_ROWS_TO_REPORT) {
                break;
            }
        }

        return invalidRows.length > 0 ? invalidRows.join('; ') : undefined;
    };

    const validate = () => {
        const columns = Object.values(spreadsheet?.columns ?? {});
        let errors: Errors = {};

        const missingRequiredColumns = requiredColumns
            .filter((requiredColumn) => !columns.includes(requiredColumn.value))
            .map((requiredColumn) => requiredColumn.text)
            .join(', ');
        if (missingRequiredColumns) {
            errors.required = translate('workspace.companyCards.addNewCard.csvErrors.requiredColumns', missingRequiredColumns);
        } else {
            const duplicate = findDuplicate(columns);
            if (duplicate) {
                errors.duplicates = translate('workspace.companyCards.addNewCard.csvErrors.duplicateColumns', duplicate);
            } else {
                const invalidRows = findInvalidRows();
                if (invalidRows) {
                    errors.invalidRows = translate('workspace.companyCards.addNewCard.csvErrors.invalidRows', invalidRows);
                } else {
                    errors = {};
                }
            }
        }
        return errors;
    };

    const validationErrors = validate();

    const closeImportPageAndModal = () => {
        setIsClosing(true);
        setIsImportingTransactions(false);
        Navigation.goBack(ROUTES.WORKSPACE_COMPANY_CARDS.getRoute(policyID));
    };

    const importTransactions = async () => {
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            return;
        }

        if (!layoutName) {
            return;
        }

        const columnNamesByIndex = Object.values(spreadsheet?.columns ?? {});
        const columnMappings = columnNames.map((_, index) => columnNamesByIndex.at(index) ?? CONST.CSV_IMPORT_COLUMNS.IGNORE);

        // Transform columns-based data to rows-based data.
        const columns = spreadsheet?.data ?? [];
        const rows: string[][] = [];
        if (columns.length > 0) {
            if (!spreadsheet?.containsHeader) {
                rows.push(columnMappings);
            }
            for (let rowIndex = 0; rowIndex < (columns.at(0)?.length ?? 0); rowIndex++) {
                const row: string[] = [];
                for (const column of columns) {
                    row.push(column.at(rowIndex) ?? '');
                }
                rows.push(row);
            }
        }
        setIsImportingTransactions(true);
        const importFinalModal = await importCSVCompanyCards({
            policyID,
            workspaceAccountID,
            layoutName,
            layoutType,
            columnMappings,
            csvData: rows,
            lastSelectedFeed: lastSelectedFeed ?? undefined,
            workspaceCardFeeds,
            existingInstanceID: addNewCard?.data?.existingInstanceID,
        });
        const didShowImportFinalModal = await showImportSpreadsheetConfirmModal(importFinalModal);
        if (!didShowImportFinalModal) {
            setIsImportingTransactions(false);
            return;
        }
        closeImportPageAndModal();
    };

    if (!spreadsheet && isLoadingOnyxValue(spreadsheetMetadata)) {
        return null;
    }

    const spreadsheetColumns = spreadsheet?.data;
    if (!spreadsheetColumns) {
        return <NotFoundPage />;
    }

    return (
        <AccessOrNotFoundWrapper
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_COMPANY_CARDS_ENABLED}
            policyFeature={CONST.POLICY.POLICY_FEATURE.COMPANY_CARDS}
            policyFeatureAccess={CONST.POLICY.POLICY_FEATURE_ACCESS.WRITE}
            fullPageNotFoundViewProps={{subtitleKey: isEmptyObject(policy) ? undefined : 'workspace.common.notAuthorized', onLinkPress: goBackFromInvalidPolicy}}
        >
            <ScreenWrapper
                testID="CompanyCardsImportedPage"
                enableEdgeToEdgeBottomSafeAreaPadding
                shouldShowOfflineIndicatorInWideScreen
            >
                <HeaderWithBackButton
                    title={translate('spreadsheet.importSpreadsheet')}
                    onBackButtonPress={() => Navigation.goBack(ROUTES.WORKSPACE_COMPANY_CARDS_IMPORT_SPREADSHEET.getRoute(policyID))}
                />
                <ImportSpreadsheetColumns
                    spreadsheetColumns={spreadsheetColumns}
                    columnNames={columnNames}
                    importFunction={importTransactions}
                    errors={validationErrors}
                    columnRoles={columnRoles}
                    learnMoreLink={CONST.COMPANY_CARDS_CREATE_FILE_FEED_HELP_URL}
                    isButtonLoading={isImportingTransactions}
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

export default CompanyCardsImportedPage;
