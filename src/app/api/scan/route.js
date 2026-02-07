import { scanWebsite } from "@/lib/accessibilityScanner";
import { explainIssue, generateSummary, generateImprovementPlan } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimiter";
import { logger } from "@/lib/logger";

/**
 * POST /api/scan
 * Scans a website for accessibility issues and uses Gemini AI to explain them
 * 
 * Request: { url: "https://example.com" }
 * Response: { url, violations (with AI explanations), summary, improvementPlan, timestamp }
 */
export async function POST(req) {
  const requestId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    // Get client IP for rate limiting
    const ip = req.headers.get("x-forwarded-for") || 
               req.headers.get("x-client-ip") || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";

    // Rate limiting
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      logger.warn("[API /scan]", "Rate limit exceeded", { ip, requestId });
      return new Response(
        JSON.stringify({
          error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter
        }),
        { status: 429, headers: { "Retry-After": rateLimitResult.retryAfter } }
      );
    }

    let { url } = await req.json();

    // Validate URL
    if (!url || !url.trim()) {
      logger.warn("[API /scan]", "Missing URL", { requestId });
      return new Response(
        JSON.stringify({ error: "URL is required" }),
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
      logger.warn("[API /scan]", "Invalid URL format", { url, requestId });
      return new Response(
        JSON.stringify({
          error: "Invalid URL format. Please enter a valid URL like example.com or https://example.com"
        }),
        { status: 400 }
      );
    }

    logger.info("[API /scan]", `Starting scan`, { url, requestId, ip });

    // Run the scan
    const results = await scanWebsite(url);
    const violations = results.violations || [];

    logger.info("[API /scan]", `Found ${violations.length} violations`, {
      requestId,
      violations: violations.length,
      passes: (results.passes || []).length
    });

    // Generate AI explanations for violations
    logger.info("[API /scan]", `Generating explanations for ${violations.length} violations`, { requestId });
    
    const enhancedViolations = await Promise.all(
      violations.map(async (violation) => {
        try {
          const explanation = await explainIssue(violation);
          return {
            ...violation,
            aiExplanation: explanation
          };
        } catch (error) {
          logger.error("[API /scan]", `Error explaining violation ${violation.id}`, {
            requestId,
            violationId: violation.id,
            error: error.message
          });
          return {
            ...violation,
            aiExplanation: violation.help || "Unable to generate explanation. Please see help URL for more details."
          };
        }
      })
    );

    // Generate summary and improvement plan in parallel
    logger.info("[API /scan]", "Generating summary and improvement plan", { requestId });
    
    const [summary, improvementPlan] = await Promise.all([
      generateSummary(violations).catch(err => {
        logger.error("[API /scan]", "Error generating summary", { requestId, error: err.message });
        return "Unable to generate summary at this time.";
      }),
      generateImprovementPlan(violations).catch(err => {
        logger.error("[API /scan]", "Error generating improvement plan", { requestId, error: err.message });
        return "Unable to generate improvement plan at this time.";
      })
    ]);

    const scanDuration = Date.now() - startTime;
    logger.info("[API /scan]", "Scan completed successfully", {
      requestId,
      duration: `${scanDuration}ms`,
      violations: violations.length
    });

    return new Response(
      JSON.stringify({
        requestId,
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
        timestamp: new Date().toISOString(),
        performance: {
          duration: scanDuration,
          unit: "ms"
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const scanDuration = Date.now() - startTime;
    
    logger.error("[API /scan]", "Scan error", {
      requestId,
      error: error.message,
      duration: `${scanDuration}ms`
    });
    
    // Provide more helpful error messages
    let errorMessage = error.message || "Failed to scan website";
    
    if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
      errorMessage = "The website took too long to load. Please try a different URL or a faster website.";
    } else if (errorMessage.includes("ERR_NAME_NOT_RESOLVED") || errorMessage.includes("ENOTFOUND")) {
      errorMessage = "Could not find that website. Please check the URL and try again.";
    } else if (errorMessage.includes("ERR_CONNECTION_REFUSED")) {
      errorMessage = "Connection refused. The website may be down or blocked.";
    } else if (errorMessage.includes("net::ERR") || errorMessage.includes("ERR::")) {
      errorMessage = "Network error. Please check the URL and your internet connection.";
    }
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        requestId,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      error: "Use POST method with { url: '...' }",
      example: "POST /api/scan with body: { \"url\": \"https://example.com\" }"
    }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}
