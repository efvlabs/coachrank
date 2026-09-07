import { WORDMARK } from "./brand-wordmark";
import { fitQuote, QOTD_LAYOUT, QOTD_SIZE, qotdFilename, type QotdArtwork } from "./qotd";

let wordmarkPaths: Path2D[] | undefined;
function drawWordmark(context: CanvasRenderingContext2D, left: number, bottom: number) {
  wordmarkPaths ??= WORDMARK.paths.map(path => new Path2D(path.d));
  const scale = QOTD_LAYOUT.logoWidth / WORDMARK.inkBounds.width;
  context.save();
  context.translate(left, bottom - WORDMARK.inkBounds.height * scale);
  context.scale(scale, scale);
  context.translate(-WORDMARK.inkBounds.x, -WORDMARK.inkBounds.y);
  WORDMARK.paths.forEach((path, index) => {
    context.save();
    context.translate(path.x, WORDMARK.baseline);
    context.scale(1, -1);
    context.fill(wordmarkPaths![index]);
    context.restore();
  });
  context.restore();
}

/** Align visible letter edges, including descenders, rather than the font's line box. */
function drawBottomAlignedText(context: CanvasRenderingContext2D, lines: string[], lineHeight: number, left: number, bottom: number) {
  const metrics = lines.map(line => context.measureText(line));
  const lastBaseline = bottom - metrics[metrics.length - 1].actualBoundingBoxDescent;
  let top = bottom;
  lines.forEach((line, index) => {
    const baseline = lastBaseline - (lines.length - 1 - index) * lineHeight;
    context.fillText(line, left + metrics[index].actualBoundingBoxLeft, baseline);
    top = Math.min(top, baseline - metrics[index].actualBoundingBoxAscent);
  });
  return top;
}

/** Draw once to a detached canvas. Preview and download use this identical renderer. */
export async function renderQotd(item: QotdArtwork, scale = 1): Promise<HTMLCanvasElement> {
  const styles = getComputedStyle(document.documentElement);
  const display = styles.getPropertyValue("--font-bricolage").split(",")[0].trim();
  const sans = styles.getPropertyValue("--font-inter").split(",")[0].trim();
  if (!display || !sans) throw new Error("CoachRank fonts are not ready. Reload and try again.");
  const [displayFaces, sansFaces] = await Promise.all([
    document.fonts.load(`700 108px ${display}`, `“${item.quote} ${item.author}`),
    document.fonts.load(`400 28px ${sans}`, item.role || "CoachRank"),
  ]);
  if (!displayFaces.length || !sansFaces.length) throw new Error("The brand fonts could not load. Please try again before downloading.");
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(QOTD_SIZE.width * scale);
  canvas.height = Math.round(QOTD_SIZE.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create the image. Please try another browser.");
  context.scale(scale, scale);
  context.fillStyle = QOTD_LAYOUT.background;
  context.fillRect(0, 0, QOTD_SIZE.width, QOTD_SIZE.height);
  context.fillStyle = QOTD_LAYOUT.ink;
  context.textBaseline = "alphabetic";
  const { margin, quoteHeight, logoWidth, footerColumnGap, attributionGap } = QOTD_LAYOUT;
  const bottom = QOTD_SIZE.height - margin;
  const logoLeft = QOTD_SIZE.width - margin - logoWidth;
  const attributionWidth = logoLeft - footerColumnGap - margin;
  drawWordmark(context, logoLeft, bottom);
  context.font = `700 240px ${display}`;
  const mark = context.measureText("“");
  context.fillText("“", margin + mark.actualBoundingBoxLeft, margin + mark.actualBoundingBoxAscent);
  const measure = (text: string, size: number) => {
    context.font = `700 ${size}px ${display}`;
    const metrics = context.measureText(text);
    return Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
  };
  const quote = fitQuote(item.quote, measure, QOTD_SIZE.width - 2 * margin, quoteHeight);
  if (!quote.fits) throw new Error("This quote needs more space. Shorten it or remove a few line breaks so every word stays readable.");
  context.font = `700 ${quote.size}px ${display}`;
  // Short quotes get a little breathing room; long quotes keep all available space.
  const top = QOTD_LAYOUT.quoteTop + Math.min(85, Math.max(0, (quoteHeight - quote.lines.length * quote.lineHeight) * 0.18));
  const firstBaseline = top + context.measureText(quote.lines[0]).actualBoundingBoxAscent;
  quote.lines.forEach((line, index) => context.fillText(line, margin + context.measureText(line).actualBoundingBoxLeft, firstBaseline + index * quote.lineHeight));
  if (item.author) {
    const author = fitQuote(item.author.replace(/\s+/g, " "), measure, attributionWidth, 84, 36, 24);
    if (!author.fits) throw new Error("Shorten the attribution name so it fits beside the wordmark.");
    let authorBottom = bottom;
    if (item.role) {
      const measureRole = (text: string, size: number) => {
        context.font = `400 ${size}px ${sans}`;
        const metrics = context.measureText(text);
        return Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
      };
      const role = fitQuote(item.role.replace(/\s+/g, " "), measureRole, attributionWidth, 62, 26, 20);
      if (!role.fits) throw new Error("Shorten the role or description so it fits on the card.");
      context.font = `400 ${role.size}px ${sans}`;
      context.globalAlpha = 0.85;
      authorBottom = drawBottomAlignedText(context, role.lines, role.lineHeight, margin, bottom) - attributionGap;
      context.globalAlpha = 1;
    }
    context.font = `700 ${author.size}px ${display}`;
    drawBottomAlignedText(context, author.lines, author.lineHeight, margin, authorBottom);
  }
  return canvas;
}

export async function downloadQotd(item: QotdArtwork) {
  const canvas = await renderQotd(item);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not export the image. Please try again.")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = qotdFilename(item);
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
