"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [activeTab, setActiveTab] = useState("issues");

  useEffect(() => {
    const resultsData = searchParams.get("data");
    if (resultsData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(resultsData));
        setResults(parsed);
      } catch (e) {
        console.error("Failed to parse results:", e);
      }
    } else {
      const stored = localStorage.getItem("scanResults");
      if (stored) {
        setResults(JSON.parse(stored));
      }
    }
    setLoading(false);
  }, [searchParams]);

  const calculateScore = (violations) => {
    if (!violations) return 100;
    let score = 100;
    violations.forEach((v) => {
      if (v.impact === "critical") score -= 10;
      else if (v.impact === "serious") score -= 5;
      else if (v.impact === "moderate") score -= 2;
      else if (v.impact === "minor") score -= 1;
    });
    return Math.max(0, score);
  };

  const getSeverityBadge = (impact) => {
    const config = {
      critical: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-400", label: "🔴 Critical" },
      serious: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-400", label: "🟠 Serious" },
      moderate: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-400", label: "🔵 Moderate" },
      minor: { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-400", label: "🟡 Minor" }
    };
    return config[impact] || config.minor;
  };

  const handleReScan = () => {
    localStorage.removeItem("scanResults");
    router.push("/");
  };

  const handleExportJSON = () => {
    if (results) {
      const dataStr = JSON.stringify(results, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `accessibility-report-${new Date().getTime()}.json`;
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">No scan results found</p>
          <button
            onClick={handleReScan}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Start New Scan
          </button>
        </div>
      </div>
    );
  }

  const score = calculateScore(results.violations);
  const { critical = 0, serious = 0, moderate = 0, minor = 0, total = 0 } = results.stats || {};

  const filteredViolations = selectedSeverity === "all" 
    ? results.violations 
    : results.violations?.filter((v) => v.impact === selectedSeverity);


  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Top Navigation */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 lg:px-10 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-6 text-blue-600 dark:text-blue-400">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">AllyCheck</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportJSON}
            aria-label="Export scan results as JSON file"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            📥 Export JSON
          </button>
          <button
            onClick={handleReScan}
            aria-label="Start a new scan"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            🔄 Re-scan
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        <div className="layout-content w-full max-w-7xl px-4 lg:px-10 py-8 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <button onClick={handleReScan} className="hover:text-blue-600">Dashboard</button>
              <span>›</span>
              <span className="text-gray-900 dark:text-white font-medium truncate">{results.url}</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">Scan Results</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{results.url}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1 rounded-xl p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">Score</p>
              <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">{score}%</div>
              <p className={`text-sm font-medium ${score >= 80 ? "text-green-600 dark:text-green-400" : score >= 50 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"}`}>
                {score >= 80 ? "✓ Good" : score >= 50 ? "⚠ Needs Work" : "✗ Critical"}
              </p>
            </div>

            {[
              { label: "Total Issues", count: total, icon: "⚠️" },
              { label: "Critical", count: critical, icon: "🔴" },
              { label: "Serious", count: serious, icon: "🟠" },
              { label: "Moderate", count: moderate, icon: "🔵" },
            ].map((stat, idx) => (
              <div key={idx} className="rounded-xl p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">{stat.icon} {stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-800 flex gap-8">
            {[
              { key: "issues", label: "Issues & Fixes", icon: "🔧" },
              { key: "summary", label: "Summary", icon: "✨" },
              { key: "plan", label: "Roadmap", icon: "📋" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-selected={activeTab === tab.key}
                role="tab"
                className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {tab.icon} {tab.label}
                {tab.key !== "issues" && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded">AI</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "issues" && (
            <div className="space-y-4">
              {/* Filter buttons */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                  { key: "all", label: `All (${total})` },
                  { key: "critical", label: `Critical (${critical})` },
                  { key: "serious", label: `Serious (${serious})` },
                  { key: "moderate", label: `Moderate (${moderate})` },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setSelectedSeverity(filter.key)}
                    aria-label={`Filter by ${filter.label}`}
                    aria-pressed={selectedSeverity === filter.key}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedSeverity === filter.key
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-600"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Issues */}
              {filteredViolations && filteredViolations.length > 0 ? (
                <div className="space-y-4">
                  {filteredViolations.map((issue, idx) => {
                    const badge = getSeverityBadge(issue.impact);
                    const isExpanded = expandedIssue === idx;

                    return (
                      <div
                        key={idx}
                        className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                          aria-expanded={isExpanded}
                          aria-label={`${issue.id}: ${issue.description}. ${isExpanded ? "Collapse" : "Expand"} details`}
                          className="w-full p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className={`${badge.bg} ${badge.text} text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded`}>
                                  {badge.label}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">{issue.id}</span>
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{issue.description}</h3>
                              <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">{issue.help}</p>
                            </div>
                            <div className="text-gray-400 hover:text-blue-600 transition-colors text-xl flex-shrink-0" aria-hidden="true">
                              {isExpanded ? "▼" : "▶"}
                            </div>
                          </div>
                        </button>

                        {/* Expanded */}
                        {isExpanded && (
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
                              {/* AI Explanation */}
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-lg">🤖</span>
                                  <h4 className="font-bold text-sm text-blue-900 dark:text-blue-200">AI-Powered Explanation (Gemini)</h4>
                                </div>
                                <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap leading-relaxed">
                                  {issue.aiExplanation || issue.help}
                                </p>
                              </div>

                              {/* HTML */}
                              {issue.nodes?.[0]?.html && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 border border-gray-100 dark:border-gray-800">
                                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-500 dark:text-gray-400 uppercase tracking-tighter font-bold text-xs">HTML</span>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(issue.nodes[0].html)}
                                      className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 uppercase font-bold"
                                    >
                                      📋 Copy
                                    </button>
                                  </div>
                                  <div className="bg-gray-900 text-gray-100 p-4 font-mono text-xs overflow-x-auto rounded">
                                    <pre className="text-green-400 whitespace-pre-wrap break-words">
                                      {issue.nodes[0].html}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-700 dark:text-green-300 text-lg font-medium">✓ No issues found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8">
              <div className="flex items-start gap-4">
                <span className="text-4xl flex-shrink-0">✨</span>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Executive Summary</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {results.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "plan" && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8">
              <div className="flex items-start gap-4">
                <span className="text-4xl flex-shrink-0">📋</span>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Improvement Roadmap</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {results.improvementPlan}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 AllyCheck. Powered by Gemini AI.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-blue-600 transition-colors">Docs</a>
            <a href="#" className="hover:text-blue-600 transition-colors">API</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
