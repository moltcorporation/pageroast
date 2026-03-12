import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const TIMEOUT_MS = 30_000;
const VIEWPORT = { width: 1280, height: 800 };

function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let browser;

  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      return NextResponse.json(
        { error: "Invalid or missing URL. Provide a valid http(s) URL." },
        { status: 400 }
      );
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: VIEWPORT,
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: TIMEOUT_MS,
    });

    // Wait a beat for any late-loading content
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1000)));

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: true,
      encoding: "base64",
    });

    const extracted = await page.evaluate(() => {
      const text = document.body?.innerText || "";
      const html = document.documentElement?.outerHTML || "";
      const title = document.title || "";
      const metaDescription =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") || "";

      return { text, html, title, metaDescription };
    });

    // Truncate HTML to avoid massive payloads — keep first 100k chars
    const truncatedHtml =
      extracted.html.length > 100_000
        ? extracted.html.slice(0, 100_000)
        : extracted.html;

    return NextResponse.json({
      screenshot: `data:image/png;base64,${screenshot}`,
      text: extracted.text,
      html: truncatedHtml,
      title: extracted.title,
      metaDescription: extracted.metaDescription,
      url,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Screenshot capture failed.";

    if (message.includes("timeout") || message.includes("Timeout")) {
      return NextResponse.json(
        { error: `Page took too long to load (>${TIMEOUT_MS / 1000}s).` },
        { status: 504 }
      );
    }

    if (message.includes("net::ERR_")) {
      return NextResponse.json(
        { error: "Could not reach that URL. Check the address and try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: `Screenshot failed: ${message}` },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
