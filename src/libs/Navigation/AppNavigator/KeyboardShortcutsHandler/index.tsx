import React from 'react';
import EscapeHandler from './EscapeHandler';
import MarkAllMessagesAsReadHandler from './MarkAllMessagesAsReadHandler';
import NewChatHandler from './NewChatHandler';
import OpenWorkspaceShortcutHandler from './OpenWorkspaceShortcutHandler';
import QuickReportSearchHandler from './QuickReportSearchHandler';
import SearchHandler from './SearchHandler';
import ShortcutsOverviewHandler from './ShortcutsOverviewHandler';

function KeyboardShortcutsHandler() {
    return (
        <>
            <EscapeHandler />
            <ShortcutsOverviewHandler />
            <SearchHandler />
            <NewChatHandler />
            <MarkAllMessagesAsReadHandler />
            <QuickReportSearchHandler />
            <OpenWorkspaceShortcutHandler />
        </>
    );
}

export default KeyboardShortcutsHandler;
