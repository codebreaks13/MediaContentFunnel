function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (ctx.measureText(next).width <= maxWidth || !line)
            line = next;
        else {
            lines.push(line);
            line = w;
        }
    }
    if (line)
        lines.push(line);
    return lines;
}
/** Largest font size (down to a floor) at which the text fits in `maxLines`. */
function fit(ctx: CanvasRenderingContext2D, text: string, family: string, start: number, min: number, maxWidth: number, maxLines: number) {
    for (let size = start; size >= min; size -= 2) {
        ctx.font = `${size}px "${family}"`;
        const lines = wrap(ctx, text, maxWidth);
        if (lines.length <= maxLines && lines.every(line => ctx.measureText(line).width <= maxWidth))
            return { size, lines };
    }
    ctx.font = `${min}px "${family}"`;
    throw new Error('Text does not fit. Shorten the headline or supporting line.');
}
function validHex(c: string | undefined): string | null {
    return c && /^#[0-9a-f]{6}$/i.test(c.trim()) ? c.trim() : null;
}
/** Text colour with enough contrast on the given background. */
function onColor(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150 ? '#111418' : '#ffffff';
}
export interface PosterCopy {
    headline: string;
    credit?: string;
    subheadline?: string;
    cta?: string;
    palette?: string[];
    fontFamily?: string;
    logoPosition?: 'TOP_RIGHT' | 'TOP_LEFT' | 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
    aiLabel?: boolean;
}
/** Browser adaptation of the private renderer; user-selected local images only. */
export function composePoster(canvas: HTMLCanvasElement, img: HTMLImageElement | null, copy: PosterCopy) {
    const W = canvas.width = 1080;
    const H = canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Canvas is unavailable in this browser.');
    const fonts = { bold: 'sans-serif', regular: 'sans-serif' };
    ctx.fillStyle = '#1b3545';
    ctx.fillRect(0, 0, W, H);
    if (img) {
        const scale = Math.max(W / img.width, H * 0.56 / img.height);
        const iw = img.width * scale, ih = img.height * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H * 0.56);
        ctx.clip();
        ctx.drawImage(img, (W - iw) / 2, (H * 0.56 - ih) / 2, iw, ih);
        ctx.restore();
    }
    else {
        ctx.strokeStyle = '#9de7d2';
        ctx.lineWidth = 5;
        ctx.strokeRect(90, 85, W - 180, H * 0.56 - 170);
        ctx.beginPath();
        ctx.arc(W / 2, H * 0.28, 130, 0, Math.PI * 2);
        ctx.stroke();
    }
    // Dedicated opaque panel protects type from the photo, with fixed safe margins.
    ctx.fillStyle = '#101722';
    ctx.fillRect(0, H * 0.56, W, H * 0.44);
    const margin = Math.round(W * 0.07);
    const maxWidth = W - margin * 2;
    const accent = validHex(copy.palette?.find((c) => validHex(c) && onColor(c) === '#111418')) ?? validHex(copy.palette?.[0]) ?? '#ffd23f';
    // Measure the text block first, bottom-up, so the scrim covers exactly it.
    const cta = copy.cta?.trim();
    const ctaSize = Math.round(W * 0.036);
    const sub = copy.subheadline?.trim()
        ? fit(ctx, copy.subheadline.trim(), fonts.regular, Math.round(W * 0.045), Math.round(W * 0.032), maxWidth, 3)
        : null;
    const head = fit(ctx, copy.headline.trim().toUpperCase(), fonts.bold, Math.round(W * 0.11), Math.round(W * 0.06), maxWidth, 3);
    const gap = Math.round(W * 0.025);
    const ctaH = cta ? Math.round(ctaSize * 2.3) : 0;
    const headH = head.lines.length * Math.round(head.size * 1.05);
    const subH = sub ? sub.lines.length * Math.round(sub.size * 1.3) : 0;
    const blockH = headH + (sub ? gap + subH : 0) + (cta ? gap * 1.5 + ctaH : 0);
    let y = H - margin - 65 - blockH;
    if (y < H * 0.56 + 35)
        throw new Error('Text exceeds the panel. Shorten the copy.');
    // Readability gradient from mid-image to the bottom edge.
    const scrimTop = Math.max(0, y - H * 0.18);
    const g = ctx.createLinearGradient(0, scrimTop, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, scrimTop, W, H - scrimTop);
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = Math.round(W * 0.01);
    // Headline
    ctx.fillStyle = '#ffffff';
    ctx.font = `${head.size}px "${fonts.bold}"`;
    for (const line of head.lines) {
        ctx.fillText(line, margin, y);
        y += Math.round(head.size * 1.05);
    }
    // Accent rule under the headline
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.fillRect(margin, y + gap * 0.3, Math.round(W * 0.12), Math.max(3, Math.round(W * 0.006)));
    // Subheadline
    if (sub) {
        y += gap;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `${sub.size}px "${fonts.regular}"`;
        for (const line of sub.lines) {
            ctx.fillText(line, margin, y);
            y += Math.round(sub.size * 1.3);
        }
    }
    // Call-to-action button
    if (cta) {
        y += gap * 1.5;
        ctx.font = `${ctaSize}px "${fonts.bold}"`;
        const label = cta.toUpperCase();
        const tw = ctx.measureText(label).width;
        const padX = Math.round(ctaSize * 1.1);
        const bw = Math.min(maxWidth, tw + padX * 2);
        const r = ctaH / 2;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(margin, y, bw, ctaH, r);
        ctx.fill();
        ctx.fillStyle = onColor(accent);
        ctx.textBaseline = 'middle';
        ctx.fillText(label, margin + (bw - tw) / 2, y + ctaH / 2);
        ctx.textBaseline = 'top';
    }
    // Transparency label, away from where the logo will sit.
    if (copy.aiLabel !== false) {
        const size = Math.max(11, Math.round(W * 0.018));
        ctx.font = `${size}px "${fonts.regular}"`;
        const label = 'AI-generated image';
        const tw = ctx.measureText(label).width;
        const left = copy.logoPosition === 'TOP_LEFT';
        const x = left ? W - margin * 0.6 - tw : margin * 0.6;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.roundRect(x - size * 0.5, margin * 0.5 - size * 0.35, tw + size, size * 1.7, size * 0.4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(label, x, margin * 0.5);
    }
    ctx.shadowBlur = 0;
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#c5d5e4';
    const credit = copy.credit?.trim() || 'Synthetic demonstration';
    if (ctx.measureText(credit).width > maxWidth)
        throw new Error('Credit is too long. Shorten it.');
    ctx.fillText(credit, margin, H - 45);
}
