import puppeteer from "puppeteer";
import { logger } from "./logger";

const SCAN_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_SCAN_TIMEOUT || "60000");
const PAGE_LOAD_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_PAGE_LOAD_TIMEOUT || "45000");

/**
 * Get Puppeteer instance with stealth plugin for Vercel compatibility
 * @returns {Object} Puppeteer instance with stealth plugin applied
 */
async function getPuppeteerWithStealth() {
  try {
    const puppeteerExtra = await import("puppeteer-extra").then(m => m.default);
    const StealthPlugin = await import("puppeteer-extra-plugin-stealth").then(m => m.default);
    
    puppeteerExtra.use(StealthPlugin());
    return puppeteerExtra;
  } catch (error) {
    logger.warn("[Scanner]", "Failed to load puppeteer-extra, using standard puppeteer", {
      error: error.message
    });
    return puppeteer;
  }
}

/**
 * Scans a website for accessibility violations using Puppeteer and axe-core
 * @param {string} url - The website URL to scan
 * @returns {Promise<Object>} Results from axe-core
 */
export async function scanWebsite(url) {
  let browser;
  const startTime = Date.now();
  
  try {
    // Ensure URL has protocol
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = "https://" + url;
    }

    logger.info("[Scanner]", `Starting scan for: ${finalUrl}`);

    // Get Puppeteer instance with stealth plugin
    const puppeteerClient = await getPuppeteerWithStealth();
    
    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process=false"
      ],
      timeout: SCAN_TIMEOUT
    };

    browser = await puppeteerClient.launch(launchOptions);

    const page = await browser.newPage();
    
    // Set viewport and user agent for better detection
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set request timeout
    page.setDefaultNavigationTimeout(PAGE_LOAD_TIMEOUT);
    page.setDefaultTimeout(PAGE_LOAD_TIMEOUT);

    // Navigate with longer timeout and fallback strategy
    logger.debug("[Scanner]", `Navigating to ${finalUrl}...`);
    
    let pageLoaded = false;
    try {
      await page.goto(finalUrl, { 
        waitUntil: "networkidle2", 
        timeout: PAGE_LOAD_TIMEOUT 
      });
      pageLoaded = true;
      logger.debug("[Scanner]", "Page loaded with networkidle2");
    } catch (navError) {
      logger.warn("[Scanner]", "networkidle2 timeout, trying with domcontentloaded...");
      
      // Fallback: try with less strict waiting
      try {
        await page.goto(finalUrl, { 
          waitUntil: "domcontentloaded", 
          timeout: PAGE_LOAD_TIMEOUT - 15000 
        });
        pageLoaded = true;
        logger.debug("[Scanner]", "Page loaded with domcontentloaded");
      } catch (navError2) {
        logger.warn("[Scanner]", "domcontentloaded timeout, trying with load event...");
        
        // Last resort: try with just load event
        try {
          await page.goto(finalUrl, { 
            waitUntil: "load", 
            timeout: PAGE_LOAD_TIMEOUT - 30000 
          });
          pageLoaded = true;
          logger.debug("[Scanner]", "Page loaded with load event");
        } catch (e) {
          logger.error("[Scanner]", "All navigation attempts failed", { error: e.message });
          throw new Error(
            `Failed to load page: "${finalUrl}". The website may be unreachable, down for maintenance, or behind authentication. Please verify the URL and try again.`
          );
        }
      }
    }

    if (!pageLoaded) {
      throw new Error("Failed to load page after multiple attempts");
    }

    logger.debug("[Scanner]", "Page loaded, injecting axe-core...");

    // Inject and run axe-core
    const results = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        // Check if axe is already loaded
        if (window.axe) {
          window.axe.run(
            { runOnly: { type: "tag", values: ["wcag2aa", "wcag21aa"] } },
            (error, results) => {
              if (error) reject(error);
              resolve(results);
            }
          );
          return;
        }

        // Load axe-core from CDN
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.3/axe.min.js";
        
        // Set timeout for script loading
        const scriptTimeout = setTimeout(() => {
          reject(new Error("axe-core script loading timed out (>10s)"));
        }, 10000);

        script.onload = () => {
          clearTimeout(scriptTimeout);
          
          // Run axe after script loads
          window.axe.run(
            { runOnly: { type: "tag", values: ["wcag2aa", "wcag21aa"] } },
            (error, results) => {
              if (error) reject(error);
              resolve(results);
            }
          );
        };

        script.onerror = () => {
          clearTimeout(scriptTimeout);
          reject(new Error("Failed to load axe-core from CDN"));
        };

        // Prevent timeout issues
        script.async = true;
        document.head.appendChild(script);
      });
    });

    const scanDuration = Date.now() - startTime;
    logger.info("[Scanner]", `Scan complete in ${scanDuration}ms`, {
      url: finalUrl,
      violations: results.violations?.length || 0,
      passes: results.passes?.length || 0
    });

    await browser.close();
    return results;
  } catch (error) {
    const scanDuration = Date.now() - startTime;
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        logger.error("[Scanner]", "Error closing browser", { error: e.message });
      }
    }
    
    logger.error("[Scanner]", "Scan error", {
      url,
      error: error.message,
      duration: `${scanDuration}ms`
    });
    
    throw error;
  }
}
