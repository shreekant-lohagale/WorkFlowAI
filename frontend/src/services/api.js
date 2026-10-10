const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function parseApiError(response, fallback) {
  try {
    const data = await response.json();
    return data.detail || fallback;
  } catch {
    return fallback;
  }
}

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);

  if (!response.ok) {
    throw new Error("WorkFlowAI API is unavailable.");
  }

  return response.json();
}

export async function generateEmail(payload) {
  const response = await fetch(`${API_BASE_URL}/api/email/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 422) {
      throw new Error("Please review the form and correct the highlighted information.");
    }
    throw new Error(await parseApiError(response, "The AI service could not complete this request. Please try again."));
  }

  return response.json();
}

export async function summarizeMeeting(payload) {
  const response = await fetch(`${API_BASE_URL}/api/meetings/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 422) {
      throw new Error("Please review the meeting input and correct the highlighted information.");
    }
    throw new Error(await parseApiError(response, "The AI service could not complete this request. Your meeting content has been preserved."));
  }

  return response.json();
}

export async function extractActions(payload) {
  const response = await fetch(`${API_BASE_URL}/api/actions/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 422) {
      throw new Error("Please review the source content and extraction settings.");
    }
    throw new Error(await parseApiError(response, "The AI service could not extract action items. Your source content has been preserved."));
  }

  return response.json();
}

export async function generateWeeklyReport(payload) {
  const response = await fetch(`${API_BASE_URL}/api/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 422) {
      throw new Error("Please review the report settings and source content.");
    }
    throw new Error(await parseApiError(response, "The AI service could not generate the weekly report. Your source content has been preserved."));
  }

  return response.json();
}

export async function generateExecutiveSummary(payload) {
  const response = await fetch(`${API_BASE_URL}/api/executive/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 422) {
      throw new Error("Please review the executive summary settings and source content.");
    }
    throw new Error(await parseApiError(response, "The AI service could not generate the executive summary. Your source content has been preserved."));
  }

  return response.json();
}

export async function getAnalyticsRecords() {
  const response = await fetch(`${API_BASE_URL}/api/analytics/records`);
  if (!response.ok) throw new Error(await parseApiError(response, "Benchmark history is unavailable."));
  return response.json();
}

export async function createAnalyticsRecord(payload) {
  const response = await fetch(`${API_BASE_URL}/api/analytics/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    if (response.status === 422) throw new Error("Please review the benchmark measurements and correct invalid values.");
    throw new Error(await parseApiError(response, "The benchmark could not be saved."));
  }
  return response.json();
}

export async function deleteAnalyticsRecord(recordId) {
  const response = await fetch(`${API_BASE_URL}/api/analytics/records/${encodeURIComponent(recordId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await parseApiError(response, "The benchmark could not be deleted."));
  return response.json();
}

export async function getAnalyticsSummary() {
  const response = await fetch(`${API_BASE_URL}/api/analytics/summary`);
  if (!response.ok) throw new Error(await parseApiError(response, "Productivity analytics are unavailable."));
  return response.json();
}

export async function getKnowledgeStatus() {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/status`);
  if (!response.ok) throw new Error(await parseApiError(response, "Knowledge status is unavailable."));
  return response.json();
}

export async function getKnowledgeDocuments() {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/documents`);
  if (!response.ok) throw new Error(await parseApiError(response, "Knowledge documents are unavailable."));
  return response.json();
}

export async function uploadKnowledgeDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE_URL}/api/knowledge/upload`, { method: "POST", body: formData });
  if (!response.ok) throw new Error(await parseApiError(response, "The document could not be indexed."));
  return response.json();
}

export async function deleteKnowledgeDocument(documentId) {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await parseApiError(response, "The document could not be deleted."));
  return response.json();
}

export async function searchKnowledge(query, topK = 4) {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
  });
  if (!response.ok) throw new Error(await parseApiError(response, "Knowledge search is unavailable."));
  return response.json();
}

export async function askKnowledge(question, topK = 4) {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, top_k: topK }),
  });
  if (!response.ok) throw new Error(await parseApiError(response, "The knowledge answer could not be generated."));
  return response.json();
}
