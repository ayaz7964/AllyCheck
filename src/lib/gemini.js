import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

if (!apiKey) {
  logger.warn("[Gemini] Init", "No API key configured. Please set NEXT_PUBLIC_GEMINI_API_KEY");
}

const genAI = new GoogleGenerativeAI(apiKey);
const MODEL_NAME = "gemini-1.5-flash"; // Using faster, more cost-effective model

/**
 * Explains an accessibility issue using Gemini AI
 * @param {Object} violation - The axe-core violation object
 * @returns {Promise<string>} AI-generated explanation
 */
export async function explainIssue(violation) {
  try {
    if (!apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `You are an expert web accessibility consultant. A website has an accessibility violation that needs to be fixed.

Rule ID: ${violation.id}
Severity: ${violation.impact}
Description: ${violation.description}
Help: ${violation.help}

Affected HTML:
${violation.nodes?.[0]?.html || "No HTML provided"}

Please provide:
1. A brief explanation of why this is an accessibility issue
2. Who is affected (e.g., visually impaired users, keyboard users, screen reader users, etc.)
3. Specific steps to fix this issue with code examples
4. Best practices to prevent this issue in the future

Format your response in clear, actionable paragraphs. Keep it concise.`;

    logger.debug("[Gemini] explainIssue", `Generating explanation for ${violation.id}`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    logger.debug("[Gemini] explainIssue", `Successfully generated explanation for ${violation.id}`);
    return response.text();
  } catch (error) {
    logger.error("[Gemini] explainIssue", `Error explaining issue: ${error.message}`);
    // Return a fallback generic explanation
    return `${violation.help}\n\nFor more details, visit: ${violation.helpUrl || "https://www.w3.org/WAI/"}`;
  }
}

/**
 * Generates a summary of all accessibility issues
 * @param {Array} violations - Array of axe-core violations
 * @returns {Promise<string>} Summary text
 */
export async function generateSummary(violations) {
  try {
    if (violations.length === 0) {
      return "✓ Great! No accessibility violations found. Your website meets WCAG 2.1 standards.";
    }

    if (!apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const issueList = violations
      .slice(0, 5) // Summarize top 5 issues
      .map((v) => `- ${v.id} (${v.impact}): ${v.description}`)
      .join("\n");

    const prompt = `Provide a brief executive summary (2-3 sentences) of these web accessibility issues found on a website:

${issueList}

The summary should be helpful for developers to understand the priority and impact of these issues. Be concise and actionable.`;

    logger.debug("[Gemini] generateSummary", `Generating summary for ${violations.length} violations`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    logger.debug("[Gemini] generateSummary", "Summary generated successfully");
    return response.text();
  } catch (error) {
    logger.error("[Gemini] generateSummary", `Error generating summary: ${error.message}`);
    return `Found ${violations.length} accessibility issues that need to be addressed for WCAG 2.1 compliance. Review the detailed results below to prioritize fixes.`;
  }
}

/**
 * Generates a detailed improvement plan
 * @param {Array} violations - Array of axe-core violations
 * @returns {Promise<string>} Improvement plan text
 */
export async function generateImprovementPlan(violations) {
  try {
    const critical = violations.filter((v) => v.impact === "critical").length;
    const serious = violations.filter((v) => v.impact === "serious").length;
    const moderate = violations.filter((v) => v.impact === "moderate").length;

    if (!apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `Create a prioritized improvement plan for this website with accessibility issues:
- Critical issues: ${critical}
- Serious issues: ${serious}
- Moderate issues: ${moderate}

Provide a plan in 3-4 bullet points that prioritizes:
1. Quick wins (easy fixes with high impact)
2. Medium-term improvements (moderate effort, significant impact)
3. Long-term strategy (comprehensive accessibility approach)

Be practical and actionable for a developer team. Keep it concise.`;

    logger.debug("[Gemini] generateImprovementPlan", `Generating plan for ${violations.length} violations`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    logger.debug("[Gemini] generateImprovementPlan", "Plan generated successfully");
    return response.text();
  } catch (error) {
    logger.error("[Gemini] generateImprovementPlan", `Error generating plan: ${error.message}`);
    return "Create a prioritized plan to fix issues starting with critical severity items, then serious, then moderate issues. Focus on quick wins first, then tackle structural improvements.";
  }
}
