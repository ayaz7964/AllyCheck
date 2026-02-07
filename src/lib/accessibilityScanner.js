import puppeteer from "puppeteer";

/**
 * Scans a website for accessibility violations using Puppeteer and axe-core
 * @param {string} url - The website URL to scan
 * @returns {Promise<Object>} Results from axe-core
 */
export async function scanWebsite(url) {
  let browser;
  try {
    // Ensure URL has protocol
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = "https://" + url;
    }

    console.log(`[Scanner] Starting scan for: ${finalUrl}`);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 60000
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

    // Navigate with longer timeout and fallback strategy
    console.log(`[Scanner] Navigating to ${finalUrl}...`);
    try {
      await page.goto(finalUrl, { 
        waitUntil: "networkidle2", 
        timeout: 45000 
      });
    } catch (navError) {
      console.log(`[Scanner] networkidle2 timeout, trying with domcontentloaded...`);
      // Fallback: try with less strict waiting
      try {
        await page.goto(finalUrl, { 
          waitUntil: "domcontentloaded", 
          timeout: 30000 
        });
      } catch (navError2) {
        console.log(`[Scanner] domcontentloaded also timed out, loading partial page...`);
        // Last resort: just wait for load event
        try {
          await Promise.race([
            page.goto(finalUrl, { waitUntil: "load", timeout: 20000 }),
            new Promise(resolve => setTimeout(resolve, 15000))
          ]);
        } catch (e) {
          console.error(`[Scanner] All navigation attempts failed:`, e.message);
          throw new Error(`Failed to load page. The website may be unreachable or took too long to respond. Please check the URL: ${finalUrl}`);
        }
      }
    }

    console.log(`[Scanner] Page loaded, injecting axe-core...`);

    // Inject and run axe-core
    const results = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        // Check if axe is already loaded
        if (window.axe) {
          console.log("axe-core already loaded");
          window.axe.run((error, results) => {
            if (error) reject(error);
            resolve(results);
          });
          return;
        }

        // Load axe-core from CDN
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js";
        
        // Set timeout for script loading
        const scriptTimeout = setTimeout(() => {
          reject(new Error("axe-core script loading timed out"));
        }, 10000);

        script.onload = () => {
          clearTimeout(scriptTimeout);
          console.log("axe-core loaded, running scan...");
          // Run axe after script loads
          window.axe.run({ runOnly: { type: "tag", values: ["wcag2aa", "wcag21aa"] } }, (error, results) => {
            if (error) reject(error);
            resolve(results);
          });
        };

        script.onerror = () => {
          clearTimeout(scriptTimeout);
          reject(new Error("Failed to load axe-core from CDN"));
        };

        document.head.appendChild(script);
      });
    });

    console.log(`[Scanner] Scan complete, closing browser...`);
    await browser.close();
    return results;
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error("[Scanner] Error closing browser:", e.message);
      }
    }
    console.error("[Scanner] Scan error:", error.message);
    throw error;
  }
}
