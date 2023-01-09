import AnchorRenderer from './AnchorRenderer';
import CodeRenderer from './CodeRenderer';
import EditedRenderer from './EditedRenderer';
import ImageRenderer from './ImageRenderer';
import PreRenderer from './PreRenderer';
import TextRenderer from './TextRenderer';

/**
 * This collection defines our custom renderers. It is a mapping from HTML tag type to the corresponding component.
 */
export default {
    // Standard HTML tag renderers
    a: AnchorRenderer,
    code: CodeRenderer,
    img: ImageRenderer,

    // Custom tag renderers
    edited: EditedRenderer,
    pre: PreRenderer,
    comment: TextRenderer,
    'email-comment': TextRenderer,
    'muted-text': TextRenderer,
};
