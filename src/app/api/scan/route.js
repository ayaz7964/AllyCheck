import { scanWebsite } from "@/lib/accessibilityScanner";
import { explainIssue, generateSummary, generateImprovementPlan } from "@/lib/gemini";

/**
 * POST /api/scan
 * Scans a website for accessibility issues and uses Gemini AI to explain them
 * 
 * Request: { url: "https://example.com" }
 * Response: { url, violations (with AI explanations), summary, improvementPlan, timestamp }
 */
export async function POST(req) {
  try {
    let { url } = await req.json();

    // Validate URL
    if (!url || !url.trim()) {
      return Response.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    url = url.trim();

    // Ensure URL has protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return Response.json(
        { error: "Invalid URL format. Please enter a valid URL like example.com or https://example.com" },
        { status: 400 }
      );
    }

    console.log(`[API /scan] Starting scan for: ${url}`);

    // Run the scan
    const results = await scanWebsite(url);
    const violations = results.violations || [];

    // Generate AI explanations for violations (with concurrency limit)
    console.log(`[API /scan] Generating explanations for ${violations.length} violations...`);
    const enhancedViolations = await Promise.all(
      violations.map(async (violation) => {
        try {
          const explanation = await explainIssue(violation);
          return {
            ...violation,
            aiExplanation: explanation
          };
        } catch (error) {
          console.error(`[API /scan] Error explaining violation ${violation.id}:`, error);
          return {
            ...violation,
            aiExplanation: violation.help || "Unable to generate explanation"
          };
        }
      })
    );

    // Generate summary and improvement plan
    const [summary, improvementPlan] = await Promise.all([
      generateSummary(violations),
      generateImprovementPlan(violations)
    ]);

    return Response.json({
      url,
      violations: enhancedViolations,
      passes: results.passes || [],
      incomplete: results.incomplete || [],
      summary,
      improvementPlan,
      stats: {
        total: violations.length,
        critical: violations.filter((v) => v.impact === "critical").length,
        serious: violations.filter((v) => v.impact === "serious").length,
        moderate: violations.filter((v) => v.impact === "moderate").length,
        minor: violations.filter((v) => v.impact === "minor").length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API /scan] Error:", error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || "Failed to scan website";
    
    if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
      errorMessage = "The website took too long to load. Please try a different URL or a faster website.";
    } else if (errorMessage.includes("ERR_NAME_NOT_RESOLVED") || errorMessage.includes("ENOTFOUND")) {
      errorMessage = "Could not find that website. Please check the URL and try again.";
    } else if (errorMessage.includes("ERR_CONNECTION_REFUSED")) {
      errorMessage = "Connection refused. The website may be down or blocked.";
    } else if (errorMessage.includes("net::ERR")) {
      errorMessage = "Network error. Please check the URL and your internet connection.";
    }
    
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    { error: "Use POST method with { url: '...' }" },
    { status: 405 }
  );
}
