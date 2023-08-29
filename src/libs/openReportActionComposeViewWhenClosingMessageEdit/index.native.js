import {Keyboard} from 'react-native';
import * as Composer from '../actions/Composer';
import * as ReportActionContextMenu from '../../pages/home/report/ContextMenu/ReportActionContextMenu';

let keyboardDidHideListener = null;
export default (reportActionID) => {
    console.log('[debug] keyboardDidHideListener', keyboardDidHideListener)
    if(keyboardDidHideListener){
        return;
    }

    keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        console.log('[debug] const keyboardDidHideListener = Keyboard.addListener(keyboardDidHide')
        console.log('[debug] reportActionID', reportActionID)
        console.log('[debug] ReportActionContextMenu.isActiveReportAction(reportActionID)', ReportActionContextMenu.isActiveReportAction(reportActionID));
        // if(!ReportActionContextMenu.isActiveReportAction(reportActionID))
        // {
            Composer.setShouldShowComposeInput(true);
        // }
        keyboardDidHideListener.remove();
        keyboardDidHideListener = null;
    });
};
