import { scanWebsite } from "@/lib/accessibilityScanner";

/**
 * POST /api/scan
 * Scans a website for accessibility issues
 * 
 * Request: { url: "https://example.com" }
 * Response: { url, violations, passes, incomplete, timestamp }
 */
export async function POST(req) {
  try {
    const { url } = await req.json();

    // Validate URL
    if (!url) {
      return Response.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return Response.json(
        { error: "Invalid URL format. Please enter a valid URL starting with http:// or https://" },
        { status: 400 }
      );
    }

    // Run the scan
    const results = await scanWebsite(url);

    return Response.json({
      url,
      violations: results.violations || [],
      passes: results.passes || [],
      incomplete: results.incomplete || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API /scan] Error:", error);
    return Response.json(
      {
        error: error.message || "Failed to scan website. Please ensure the URL is accessible."
      },
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
