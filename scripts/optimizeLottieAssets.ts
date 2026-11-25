/**
 * Rewrites expensive Lottie assets in `assets/animations` in place, without touching players,
 * components, or props. Run it again whenever Design re-exports any of the source animations.
 *
 * Usage: bun scripts/optimizeLottieAssets.ts
 *
 * What it does:
 *
 * 1. Concierge thinking avatars — removes track-matte pairs whose matte source is a static,
 *    full-canvas circle. The avatar container already clips the animation to a circle of the
 *    same size, so these mattes only duplicate work. Above four mattes/masks lottie-android
 *    falls back to software rendering on the UI thread, so every removed matte matters.
 *    Eye-shaped mattes (and any other non-trivial matte) are detected by geometry and kept.
 *
 * 2. Desk — deletes the explicit `"hd": false` property from matte-source layers (`"td": 1`).
 *    Matte sources are implicitly hidden by every player, but Skottie honors the explicit
 *    flag and paints them, which shows up as red shapes. Removing the property restores
 *    consistent rendering across players.
 *
 * 3. Desk — rescales the composition from 69 fps to 24 fps. Frame rate, in/out points, layer
 *    start times, keyframe times, and marker times are multiplied by 24/69, preserving the
 *    overall duration and timing while letting frame-driven players do a third of the work.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

const ANIMATIONS_DIR = path.resolve(__dirname, '..', 'assets', 'animations');

const CONCIERGE_ASSETS = ['ConciergeThinkingHypnotized.lottie', 'ConciergeThinkingInceptionTriangle.lottie', 'ConciergeThinkingScanGradient.lottie', 'ConciergeThinkingScanOuterGlow.lottie'];
const DESK_ASSET = 'Desk.lottie';
const DESK_TARGET_FPS = 24;

type AnimatedProperty = {
    a?: number;
    k?: unknown;
};

type ShapeItem = {
    ty: string;
    s?: AnimatedProperty;
    p?: AnimatedProperty;
    it?: ShapeItem[];
};

type Layer = {
    ty: number;
    ind?: number;
    nm?: string;
    parent?: number;
    td?: number;
    tt?: number;
    tp?: number;
    hd?: boolean;
    ip: number;
    op: number;
    st: number;
    ks: Record<string, AnimatedProperty>;
    shapes?: ShapeItem[];
    masksProperties?: unknown[];
};

type Marker = {
    tm: number;
    dr: number;
};

type Animation = {
    fr: number;
    ip: number;
    op: number;
    w: number;
    h: number;
    layers: Layer[];
    assets?: Array<{layers?: Layer[]}>;
    markers?: Marker[];
};

type ZipEntry = {
    name: string;
    data: Buffer;
};

/**
 * CRC-32 lookup table, required by the zip format.
 */
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            // eslint-disable-next-line no-bitwise
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(data: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of data) {
        // eslint-disable-next-line no-bitwise
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
    }
    // eslint-disable-next-line no-bitwise
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Reads every entry of a `.lottie` archive (a plain zip).
 */
function readZip(filePath: string): ZipEntry[] {
    const buffer = fs.readFileSync(filePath);

    // Locate the end-of-central-directory record, scanning backwards over an optional comment.
    let eocd = -1;
    for (let i = buffer.length - 22; i >= 0; i--) {
        if (buffer.readUInt32LE(i) === 0x06054b50) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) {
        throw new Error(`${filePath}: not a zip archive`);
    }

    const entryCount = buffer.readUInt16LE(eocd + 10);
    let offset = buffer.readUInt32LE(eocd + 16);
    const entries: ZipEntry[] = [];

    for (let i = 0; i < entryCount; i++) {
        if (buffer.readUInt32LE(offset) !== 0x02014b50) {
            throw new Error(`${filePath}: corrupt central directory`);
        }
        const method = buffer.readUInt16LE(offset + 10);
        const compressedSize = buffer.readUInt32LE(offset + 20);
        const nameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const localOffset = buffer.readUInt32LE(offset + 42);
        const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');

        const localNameLength = buffer.readUInt16LE(localOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

        let data: Buffer;
        if (method === 0) {
            data = Buffer.from(compressed);
        } else if (method === 8) {
            data = zlib.inflateRawSync(compressed);
        } else {
            throw new Error(`${filePath}: unsupported compression method ${method} for ${name}`);
        }
        entries.push({name, data});
        offset += 46 + nameLength + extraLength + commentLength;
    }

    return entries;
}

/**
 * Writes entries back as a deflate-compressed zip, which every dotLottie player accepts.
 */
function writeZip(filePath: string, entries: ZipEntry[]) {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBuffer = Buffer.from(entry.name, 'utf8');
        const compressed = zlib.deflateRawSync(entry.data, {level: 9});
        const checksum = crc32(entry.data);

        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4); // version needed to extract
        localHeader.writeUInt16LE(8, 8); // deflate
        localHeader.writeUInt32LE(checksum, 14);
        localHeader.writeUInt32LE(compressed.length, 18);
        localHeader.writeUInt32LE(entry.data.length, 22);
        localHeader.writeUInt16LE(nameBuffer.length, 26);
        localParts.push(localHeader, nameBuffer, compressed);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4); // version made by
        centralHeader.writeUInt16LE(20, 6); // version needed to extract
        centralHeader.writeUInt16LE(8, 10); // deflate
        centralHeader.writeUInt32LE(checksum, 16);
        centralHeader.writeUInt32LE(compressed.length, 20);
        centralHeader.writeUInt32LE(entry.data.length, 24);
        centralHeader.writeUInt16LE(nameBuffer.length, 28);
        centralHeader.writeUInt32LE(offset, 42);
        centralParts.push(centralHeader, nameBuffer);

        offset += 30 + nameBuffer.length + compressed.length;
    }

    const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(offset, 16);

    fs.writeFileSync(filePath, Buffer.concat([...localParts, ...centralParts, eocd]));
}

function isStaticProperty(property: AnimatedProperty | undefined): property is AnimatedProperty & {k: unknown} {
    return !!property && property.a === 0;
}

function staticVector(property: AnimatedProperty | undefined): number[] | undefined {
    if (!isStaticProperty(property) || !Array.isArray(property.k)) {
        return undefined;
    }
    return property.k as number[];
}

function staticScalar(property: AnimatedProperty | undefined): number | undefined {
    if (!isStaticProperty(property) || typeof property.k !== 'number') {
        return undefined;
    }
    return property.k;
}

/**
 * A matte source is redundant when it is a static circle that covers the whole composition:
 * it cannot reveal or hide anything that the composition bounds (and the circular avatar
 * container) do not already enforce.
 */
function isFullCanvasCircleMatte(layer: Layer, width: number, height: number): boolean {
    if (layer.td !== 1 || layer.ty !== 4 || (layer.masksProperties ?? []).length > 0) {
        return false;
    }

    // The layer transform must be a static identity centered on the canvas.
    const position = staticVector(layer.ks.p);
    const anchor = staticVector(layer.ks.a);
    const scale = staticVector(layer.ks.s);
    const rotation = staticScalar(layer.ks.r) ?? 0;
    const opacity = staticScalar(layer.ks.o);
    if (!position || position[0] !== width / 2 || position[1] !== height / 2) {
        return false;
    }
    if (!anchor || anchor[0] !== 0 || anchor[1] !== 0) {
        return false;
    }
    if (!scale || scale[0] !== 100 || scale[1] !== 100 || rotation !== 0 || opacity !== 100) {
        return false;
    }

    // The content must be a single group holding one ellipse at least as large as the canvas.
    if (layer.shapes?.length !== 1 || layer.shapes[0].ty !== 'gr') {
        return false;
    }
    const items = layer.shapes[0].it ?? [];
    const ellipses = items.filter((item) => item.ty === 'el');
    if (ellipses.length !== 1) {
        return false;
    }
    const ellipseSize = staticVector(ellipses[0].s);
    const ellipsePosition = staticVector(ellipses[0].p);
    if (!ellipseSize || ellipseSize[0] < width || ellipseSize[1] < height || !ellipsePosition || ellipsePosition[0] !== 0 || ellipsePosition[1] !== 0) {
        return false;
    }
    const transform = items.find((item) => item.ty === 'tr');
    if (transform) {
        const transformPosition = staticVector(transform.p);
        const transformScale = staticVector(transform.s);
        if (!transformPosition || transformPosition[0] !== 0 || transformPosition[1] !== 0 || !transformScale || transformScale[0] !== 100 || transformScale[1] !== 100) {
            return false;
        }
    }

    // Nothing but the ellipse, its fill/stroke, and the group transform.
    return items.every((item) => ['el', 'fl', 'st', 'tr'].includes(item.ty));
}

/**
 * Removes redundant full-canvas circle mattes from the top-level layers together with the
 * matte flag of the layer they were applied to. Matte source and consumer are adjacent in
 * the layer list (the files use no `tp` indirection), so the pair is removed in one pass.
 */
function removeRedundantCircleMattes(animation: Animation): number {
    const keptLayers: Layer[] = [];
    const removedIndices = new Set<number>();
    let removedCount = 0;

    for (let i = 0; i < animation.layers.length; i++) {
        const layer = animation.layers[i];
        const consumer = animation.layers.at(i + 1);
        if (consumer && typeof consumer.tt === 'number' && consumer.tp === undefined && isFullCanvasCircleMatte(layer, animation.w, animation.h)) {
            delete consumer.tt;
            if (layer.ind !== undefined) {
                removedIndices.add(layer.ind);
            }
            removedCount++;
            continue;
        }
        keptLayers.push(layer);
    }

    // A removed matte source must not be referenced by anything else.
    for (const layer of keptLayers) {
        if (layer.parent !== undefined && removedIndices.has(layer.parent)) {
            throw new Error(`layer "${layer.nm}" is parented to a removed matte source`);
        }
    }

    animation.layers = keptLayers;
    return removedCount;
}

function allLayerLists(animation: Animation): Layer[][] {
    const lists = [animation.layers];
    for (const asset of animation.assets ?? []) {
        if (asset.layers) {
            lists.push(asset.layers);
        }
    }
    return lists;
}

/**
 * Deletes the explicit `"hd": false` flag from matte-source layers so that Skottie hides
 * them like every other player does.
 */
function stripHiddenFlagFromMatteSources(animation: Animation): number {
    let strippedCount = 0;
    for (const layers of allLayerLists(animation)) {
        for (const layer of layers) {
            if (layer.td === 1 && layer.hd === false) {
                delete layer.hd;
                strippedCount++;
            }
        }
    }
    return strippedCount;
}

function roundTime(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * Scales every keyframe time (`t` inside a `k` keyframe list) by the given factor. Keyframe
 * values are left alone: time-remap values are expressed in seconds, which do not change
 * when every composition is rescaled by the same factor.
 */
function scaleKeyframeTimes(node: unknown, factor: number) {
    if (Array.isArray(node)) {
        for (const item of node) {
            scaleKeyframeTimes(item, factor);
        }
        return;
    }
    if (!node || typeof node !== 'object') {
        return;
    }
    for (const [key, value] of Object.entries(node)) {
        if (key === 'k' && Array.isArray(value) && value.length > 0 && value.every((keyframe) => !!keyframe && typeof keyframe === 'object' && typeof keyframe.t === 'number')) {
            for (const keyframe of value) {
                keyframe.t = roundTime(keyframe.t * factor);
            }
        } else {
            scaleKeyframeTimes(value, factor);
        }
    }
}

/**
 * Retimes the whole animation to a new frame rate while preserving its duration.
 */
function retime(animation: Animation, targetFps: number): number {
    const factor = targetFps / animation.fr;
    animation.fr = targetFps;
    animation.ip = roundTime(animation.ip * factor);
    animation.op = Math.round(animation.op * factor);

    for (const layers of allLayerLists(animation)) {
        for (const layer of layers) {
            layer.ip = roundTime(layer.ip * factor);
            layer.op = roundTime(layer.op * factor);
            layer.st = roundTime(layer.st * factor);
        }
    }
    for (const marker of animation.markers ?? []) {
        marker.tm = roundTime(marker.tm * factor);
        marker.dr = roundTime(marker.dr * factor);
    }
    scaleKeyframeTimes(animation, factor);
    return factor;
}

function rewriteAsset(fileName: string, transform: (animation: Animation) => string) {
    const filePath = path.join(ANIMATIONS_DIR, fileName);
    const entries = readZip(filePath);
    const animationEntries = entries.filter((entry) => entry.name.startsWith('animations/') && entry.name.endsWith('.json'));
    if (animationEntries.length !== 1) {
        throw new Error(`${fileName}: expected exactly one animation JSON, found ${animationEntries.length}`);
    }

    const animationEntry = animationEntries[0];
    const animation = JSON.parse(animationEntry.data.toString('utf8')) as Animation;
    const summary = transform(animation);
    animationEntry.data = Buffer.from(JSON.stringify(animation), 'utf8');

    writeZip(filePath, entries);
    console.log(`${fileName}: ${summary}`);
}

for (const fileName of CONCIERGE_ASSETS) {
    rewriteAsset(fileName, (animation) => {
        const removedCount = removeRedundantCircleMattes(animation);
        const remainingMattes = animation.layers.filter((layer) => layer.td === 1).length;
        return `removed ${removedCount} redundant full-canvas circle mattes, ${remainingMattes} shaped mattes kept`;
    });
}

rewriteAsset(DESK_ASSET, (animation) => {
    const strippedCount = stripHiddenFlagFromMatteSources(animation);
    const factor = retime(animation, DESK_TARGET_FPS);
    return `stripped "hd": false from ${strippedCount} matte sources, retimed x${factor.toFixed(4)} to ${animation.fr} fps (${animation.op} frames)`;
});
