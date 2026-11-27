export function hexToHslChannels(hex: string | undefined | null): string | null {
    if (!hex) {
        return null;
    }
    const match = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) {
        return null;
    }
    const captured = match[1];
    if (!captured) {
        return null;
    }
    let raw = captured;
    if (raw.length === 3) {
        raw = raw
            .split('')
            .map((ch) => ch + ch)
            .join('');
    }
    const r = parseInt(raw.slice(0, 2), 16) / 255;
    const g = parseInt(raw.slice(2, 4), 16) / 255;
    const b = parseInt(raw.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (max + min) / 2;
    const delta = max - min;
    let hue = 0;
    let sat = 0;
    if (delta !== 0) {
        sat = delta / (1 - Math.abs(2 * light - 1));
        switch (max) {
            case r:
                hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
                break;
            case g:
                hue = ((b - r) / delta + 2) * 60;
                break;
            default:
                hue = ((r - g) / delta + 4) * 60;
                break;
        }
    }
    return `${Math.round(hue)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

export const FALLBACK_PRIMARY_HSL = '215 16% 47%';

export interface AppManifestTheme {
    primaryColor?: string;
    accentColor?: string;
    mode?: string;
    logoUrl?: string;
}

export interface AppManifest {
    name?: string;
    displayName?: string;
    theme?: AppManifestTheme;
}

/** Apply manifest brand colour onto a .gf-federated-app mount. */
export function applyManifestTheme(el: HTMLElement, theme: AppManifestTheme | undefined): void {
    const channels = hexToHslChannels(theme?.primaryColor) ?? FALLBACK_PRIMARY_HSL;
    el.style.setProperty('--primary', channels);
    el.style.setProperty('--ring', channels);
}
