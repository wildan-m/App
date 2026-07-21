/**
 * Header Compound Component
 *
 * Composable screen-header built from granular blocks plus presets,
 * following the same compound-component pattern as `Table` and `Button`.
 *
 * @example Preset — default screen header (back button + title)
 * ```tsx
 * import Header from '@components/Header';
 *
 * <Header.Screen title={translate('common.settings')} />
 * ```
 *
 * @example Preset — wizard / onboarding header
 * ```tsx
 * <Header.Wizard
 *     progressBarPercentage={percentage}
 *     stepCounter={{step: 2, total: 5}}
 * />
 * ```
 *
 * @example Granular — custom header composition
 * ```tsx
 * <Header>
 *     <Header.BackButton onPress={goBack} />
 *     <Header.Center>
 *         <Header.Title title={title} />
 *     </Header.Center>
 *     <Header.Right>
 *         <Header.CloseButton />
 *     </Header.Right>
 * </Header>
 * ```
 *
 * `HeaderWithBackButton` remains fully supported and is being re-implemented
 * on top of these blocks; call sites migrate incrementally.
 */
import HeaderBackButton from './BackButton';
import HeaderCloseButton from './CloseButton';
import HeaderContext from './HeaderContext';
import HeaderProgressBar from './ProgressBar';
import HeaderRoot from './Root';
import ScreenHeader from './ScreenHeader';
import {HeaderCenter, HeaderLeft, HeaderRight} from './Slots';
import HeaderTitle from './Title';
import WizardHeader from './WizardHeader';

/**
 * Header compound component with attached sub-components.
 *
 * Sub-components:
 * - `Header.Title` - Title/subtitle text block (the former `@components/Header` primitive)
 * - `Header.BackButton` - Back navigation button (keyboard dismissal + topmost-report routing)
 * - `Header.CloseButton` - Modal close button
 * - `Header.ProgressBar` - Centered wizard progress bar
 * - `Header.Left` / `Header.Center` / `Header.Right` - Placement slots
 * - `Header.Screen` - Preset: back button + title (the ~90% case)
 * - `Header.Wizard` - Preset: back button + progress bar + step counter
 * - `Header.Context` - The React context (for advanced usage)
 */
const Header = Object.assign(HeaderRoot, {
    /** The React context for accessing shared header state directly. */
    Context: HeaderContext,
    /** Title/subtitle text block (the former `@components/Header` primitive). */
    Title: HeaderTitle,
    /** Back navigation button with keyboard dismissal and topmost-report routing. */
    BackButton: HeaderBackButton,
    /** Modal close button. */
    CloseButton: HeaderCloseButton,
    /** Centered wizard progress bar. */
    ProgressBar: HeaderProgressBar,
    /** Leading placement slot. */
    Left: HeaderLeft,
    /** Flexible center placement slot. */
    Center: HeaderCenter,
    /** Trailing placement slot for action buttons. */
    Right: HeaderRight,
    /** Preset: back button + title — the default screen header. */
    Screen: ScreenHeader,
    /** Preset: wizard / onboarding header with progress bar. */
    Wizard: WizardHeader,
});

export default Header;

export type {HeaderTitleProps} from './Title';
export type {HeaderRootProps} from './Root';
export type {ScreenHeaderProps} from './ScreenHeader';
export type {WizardHeaderProps} from './WizardHeader';
