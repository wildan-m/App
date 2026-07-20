/**
 * Measures the rendered width (in px) of a single line of text in the app's standard font at the given font size.
 */
type MeasureTextWidth = (text: string, fontSize: number) => number;

export default MeasureTextWidth;
