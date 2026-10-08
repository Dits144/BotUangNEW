import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const targetUrl = "https://demo.codeandchill.store/fernly/";
const outputDir = "test-results/fernly-motion-reference";

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1366, height: 900 },
  reducedMotion: "no-preference",
});
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

function snapshotScript() {
  const describe = (element) => {
    if (!(element instanceof Element)) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: typeof element.className === "string" ? element.className : null,
      text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
      opacity: style.opacity,
      transform: style.transform,
      transition: style.transition,
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      animationDelay: style.animationDelay,
      animationTimingFunction: style.animationTimingFunction,
      visibility: style.visibility,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  };

  const first = (...selectors) => {
    for (const selector of selectors) {
      const match = document.querySelector(selector);
      if (match) return describe(match);
    }
    return null;
  };

  const animations = document.getAnimations({ subtree: true }).map((animation) => {
    const effect = animation.effect;
    const target = effect && "target" in effect ? effect.target : null;
    const timing = effect?.getTiming?.() ?? null;
    const computedTiming = effect?.getComputedTiming?.() ?? null;
    return {
      playState: animation.playState,
      currentTime: animation.currentTime,
      startTime: animation.startTime,
      target: describe(target),
      timing,
      computedTiming,
      keyframes: effect?.getKeyframes?.().map((frame) => ({
        offset: frame.offset,
        easing: frame.easing,
        opacity: frame.opacity,
        transform: frame.transform,
      })) ?? [],
    };
  });

  return {
    timestamp: performance.now(),
    scrollY: window.scrollY,
    representatives: {
      shell: first("main", ".app", "body > div"),
      sidebar: first("aside", ".sidebar"),
      topbar: first("header", ".topbar"),
      heading: first("main h1", "h1"),
      headingCharacter: first("main h1 .ch", "h1 .ch", ".ch"),
      paragraph: first("main h1 + p", "main p", "p"),
      card: first("main article", "main .card", ".card"),
      image: first("main img", "img"),
      footer: first("footer"),
    },
    animationCount: animations.length,
    animations,
  };
}

async function captureTimeline(label, delays) {
  const frames = [];
  let previous = 0;
  for (const delay of delays) {
    await page.waitForTimeout(delay - previous);
    frames.push({ at: delay, ...(await page.evaluate(snapshotScript)) });
    previous = delay;
  }
  await page.screenshot({ path: `${outputDir}/${label}.png`, fullPage: true });
  return frames;
}

await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
const loadTimeline = await captureTimeline("load-finished", [0, 50, 120, 220, 400, 700, 1100]);

const stylesheetUrls = await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
  links.map((link) => link.href),
);
const stylesheets = [];
for (const url of stylesheetUrls) {
  const response = await context.request.get(url);
  stylesheets.push({ url, status: response.status(), text: await response.text() });
}

const viewportHeight = await page.evaluate(() => window.innerHeight);
const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
const scrollObservations = [];
for (const y of [0, viewportHeight * 0.75, viewportHeight * 1.5, documentHeight]) {
  await page.evaluate((nextY) => window.scrollTo({ top: nextY, behavior: "instant" }), y);
  scrollObservations.push({ phase: "first-pass", y, ...(await page.evaluate(snapshotScript)) });
  await page.waitForTimeout(500);
  scrollObservations.push({ phase: "settled", y, ...(await page.evaluate(snapshotScript)) });
}
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(250);
await page.evaluate((nextY) => window.scrollTo({ top: nextY, behavior: "instant" }), documentHeight);
scrollObservations.push({ phase: "second-pass", y: documentHeight, ...(await page.evaluate(snapshotScript)) });

const taskLink = page.getByRole("link", { name: /^Tasks/ }).first();
let viewTimeline = [];
if (await taskLink.count()) {
  await taskLink.click();
  viewTimeline = await captureTimeline("tasks-transition", [0, 50, 120, 220, 400, 700]);
}

await context.close();
await browser.close();

const motionCss = stylesheets.map(({ url, status, text }) => ({
  url,
  status,
  excerpts: Array.from(text.matchAll(/[^{}]*(?:animation|transition|@keyframes)[^{}]*\{[^{}]*\}/gi))
    .slice(0, 200)
    .map((match) => match[0].trim()),
}));

const report = {
  targetUrl,
  capturedAt: new Date().toISOString(),
  viewport: { width: 1366, height: 900 },
  consoleErrors,
  loadTimeline,
  scrollObservations,
  viewTimeline,
  motionCss,
};

await writeFile(`${outputDir}/inspection.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  output: `${outputDir}/inspection.json`,
  loadAnimationCounts: loadTimeline.map((frame) => [frame.at, frame.animationCount]),
  viewAnimationCounts: viewTimeline.map((frame) => [frame.at, frame.animationCount]),
  stylesheets: motionCss.map((sheet) => ({ url: sheet.url, excerpts: sheet.excerpts.length })),
  documentHeight,
  consoleErrors,
}, null, 2));
