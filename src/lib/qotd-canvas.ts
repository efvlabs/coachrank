import { fitQuote, QOTD_SIZE, QOTD_TEMPLATE, qotdFilename, type QotdArtwork } from "./qotd";

let templatePromise: Promise<HTMLImageElement> | undefined;
function template() {
  templatePromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { templatePromise = undefined; reject(new Error("The blue template could not load. Check your connection and try again.")); };
    image.src = QOTD_TEMPLATE;
  });
  return templatePromise;
}

/** Draw once to a detached canvas. Preview and download use this identical renderer. */
export async function renderQotd(item: QotdArtwork, scale = 1): Promise<HTMLCanvasElement> {
  const styles = getComputedStyle(document.documentElement);
  const display = styles.getPropertyValue("--font-bricolage").split(",")[0].trim();
  const sans = styles.getPropertyValue("--font-inter").split(",")[0].trim();
  if (!display || !sans) throw new Error("CoachRank fonts are not ready. Reload and try again.");
  const [background, displayFaces, sansFaces] = await Promise.all([
    template(),
    document.fonts.load(`700 108px ${display}`, `“${item.quote} ${item.author}`),
    document.fonts.load(`400 28px ${sans}`, `QUOTE OF THE DAY ${item.role}`),
  ]);
  if (!displayFaces.length || !sansFaces.length) throw new Error("The brand fonts could not load. Please try again before downloading.");
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(QOTD_SIZE.width * scale);
  canvas.height = Math.round(QOTD_SIZE.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create the image. Please try another browser.");
  context.scale(scale, scale);
  context.drawImage(background, 0, 0, QOTD_SIZE.width, QOTD_SIZE.height);
  context.fillStyle = "#ffffff";
  context.textBaseline = "alphabetic";
  context.font = `700 240px ${display}`;
  context.fillText("“", 64, 236);
  context.font = `400 22px ${sans}`;
  context.textAlign = "right";
  context.fillText("QUOTE OF THE DAY", 1008, 100);
  if (item.date) {
    context.globalAlpha = 0.72;
    context.font = `400 19px ${sans}`;
    const date = new Date(`${item.date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
    context.fillText(date.toUpperCase(), 1008, 138);
    context.globalAlpha = 1;
  }
  context.textAlign = "left";
  const measure = (text: string, size: number) => { context.font = `700 ${size}px ${display}`; return context.measureText(text).width; };
  const quote = fitQuote(item.quote, measure);
  if (!quote.fits) throw new Error("This quote needs more space. Shorten it or remove a few line breaks so every word stays readable.");
  context.font = `700 ${quote.size}px ${display}`;
  // Short quotes get a little breathing room; long quotes keep all available space.
  const top = 255 + Math.min(85, Math.max(0, (790 - quote.lines.length * quote.lineHeight) * 0.18));
  quote.lines.forEach((line, index) => context.fillText(line, 72, top + quote.size * 0.85 + index * quote.lineHeight));
  if (item.author) {
    const author = fitQuote(item.author.replace(/\s+/g, " "), measure, 690, 84, 36, 24);
    if (!author.fits) throw new Error("Shorten the attribution name so it fits beside the wordmark.");
    context.font = `700 ${author.size}px ${display}`;
    author.lines.forEach((line, index) => context.fillText(line, 72, 1194 + index * author.lineHeight));
    if (item.role) {
      const measureRole = (text: string, size: number) => { context.font = `400 ${size}px ${sans}`; return context.measureText(text).width; };
      const role = fitQuote(item.role.replace(/\s+/g, " "), measureRole, 690, 62, 26, 20);
      if (!role.fits) throw new Error("Shorten the role or description so it fits on the card.");
      context.font = `400 ${role.size}px ${sans}`;
      context.globalAlpha = 0.85;
      role.lines.forEach((line, index) => context.fillText(line, 72, 1194 + author.lines.length * author.lineHeight + 8 + index * role.lineHeight));
      context.globalAlpha = 1;
    }
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
