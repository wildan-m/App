import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {ReceiptTranslationRow} from '@src/types/onyx/ReceiptTranslation';

import React from 'react';
import {ScrollView, View} from 'react-native';

type TranslatedReceiptCardProps = {
    /** Translated rows in the order they are printed on the receipt */
    rows: ReceiptTranslationRow[];
};

type TranslatedReceiptCardRowProps = {
    /** The translated line to render */
    row: ReceiptTranslationRow;
};

function TranslatedReceiptCardRow({row}: TranslatedReceiptCardRowProps) {
    const styles = useThemeStyles();

    switch (row.type) {
        case CONST.RECEIPT.TRANSLATED_ROW_TYPE.DIVIDER:
            return <View style={[styles.sectionDividerLine, styles.mv2]} />;
        case CONST.RECEIPT.TRANSLATED_ROW_TYPE.LABEL_VALUE:
            return (
                <View style={[styles.flexRow, styles.justifyContentBetween, styles.mv1]}>
                    <Text>{row.text}</Text>
                    <Text>{row.value}</Text>
                </View>
            );
        case CONST.RECEIPT.TRANSLATED_ROW_TYPE.ITEM:
        case CONST.RECEIPT.TRANSLATED_ROW_TYPE.TOTAL: {
            const isTotal = row.type === CONST.RECEIPT.TRANSLATED_ROW_TYPE.TOTAL;
            return (
                <View style={[styles.flexRow, styles.justifyContentBetween, styles.mv1]}>
                    <View style={[styles.flex1, styles.mr3]}>
                        <Text style={isTotal ? styles.textStrong : undefined}>{row.text}</Text>
                        {!!row.secondaryText && <Text style={styles.textMicroSupporting}>{row.secondaryText}</Text>}
                    </View>
                    {/* Amounts render verbatim as the backend returned them, in the receipt's own number format */}
                    <Text style={isTotal ? styles.textStrong : undefined}>{row.value}</Text>
                </View>
            );
        }
        case CONST.RECEIPT.TRANSLATED_ROW_TYPE.TEXT:
        default:
            // A line whose numbers failed the backend's verification comes back untranslated and renders as plain left-aligned text
            return <Text style={[styles.mv1, row.isCentered ? styles.textAlignCenter : undefined]}>{row.text}</Text>;
    }
}

function TranslatedReceiptCard({rows}: TranslatedReceiptCardProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <ScrollView contentContainerStyle={[styles.ph5, styles.pv5]}>
            <View style={[styles.p5, styles.border, styles.highlightBG]}>
                {rows.map((row, index) => (
                    <TranslatedReceiptCardRow
                        // Rows have no identifier and never reorder within a saved translation
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${row.type}-${index}`}
                        row={row}
                    />
                ))}
            </View>
            <Text style={[styles.textMicroSupporting, styles.textAlignCenter, styles.mt3]}>{translate('receipt.translationDisclaimer')}</Text>
        </ScrollView>
    );
}

export default TranslatedReceiptCard;
