const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : "/api/v1";

async function request(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────────

export async function testSetup() {
  return request("/auth/test-setup", { method: "POST" });
}

export async function verifyPolicyholder(data: {
  tenant_id: string;
  policy_number: string;
  last_name?: string;
  company_name?: string;
}) {
  return request("/auth/verify-policyholder", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Policies ────────────────────────────────────────────────────────────

export async function uploadPolicy(file: File, policyNumber: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("policy_number", policyNumber);
  return request("/policies/upload", { method: "POST", body: formData });
}

export async function getPolicyStatus(jobId: string) {
  return request(`/policies/upload/${jobId}`);
}

export async function deletePolicy(policyNumber: string) {
  return request(`/policies/${policyNumber}`, { method: "DELETE" });
}

export async function checkPolicyAvailable(policyNumber: string) {
  return request(`/policies/${policyNumber}/available`);
}

export async function queryPolicy(policyNumber: string, question: string) {
  return request(`/policies/${policyNumber}/query`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

// ── Communications ──────────────────────────────────────────────────────

export async function uploadCommunication(
  file: File,
  communicationType: string,
  title?: string
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("communication_type", communicationType);
  if (title) formData.append("title", title);
  return request("/communications/upload", { method: "POST", body: formData });
}

export async function listCommunications(
  page = 1,
  pageSize = 20,
  communicationType?: string
) {
  let url = `/communications?page=${page}&page_size=${pageSize}`;
  if (communicationType) url += `&communication_type=${communicationType}`;
  return request(url);
}

export async function deleteCommunication(docId: string) {
  return request(`/communications/${docId}`, { method: "DELETE" });
}

export async function queryCommunications(
  question: string,
  communicationType?: string
) {
  return request("/communications/query", {
    method: "POST",
    body: JSON.stringify({
      question,
      communication_type: communicationType || undefined,
    }),
  });
}
