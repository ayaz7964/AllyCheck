import puppeteer from "puppeteer";

/**
 * Scans a website for accessibility violations using Puppeteer and axe-core
 * @param {string} url - The website URL to scan
 * @returns {Promise<Object>} Results from axe-core
 */
export async function scanWebsite(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to the URL
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Inject and run axe-core
    const results = await page.evaluate(async () => {
      // Dynamically load axe-core script
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js";
        script.onload = () => {
          // Run axe after script loads
          window.axe.run((error, results) => {
            if (error) reject(error);
            resolve(results);
          });
        };
        script.onerror = () => reject(new Error("Failed to load axe-core"));
        document.head.appendChild(script);
      });
    });

    await browser.close();
    return results;
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    throw error;
  }
}
