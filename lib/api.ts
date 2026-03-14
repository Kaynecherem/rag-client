// const API_BASE = "http://localhost:8000/api/v1";
const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : "https://d28pes0iok9s89.cloudfront.net/api/v1";

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
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const message = body.error || body.detail || `Request failed: ${res.status}`;

    // On 401 (invalid/expired token): clear auth and redirect
    // EXCEPT for auth endpoints themselves (login, verify) — those should
    // just return the error to the calling component
    if (res.status === 401 && !path.startsWith("/auth/")) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("auth");
        // Give the current call a chance to return, then redirect
        setTimeout(() => {
          window.location.href = "/auth";
        }, 100);
      }
    }

    throw new Error(message);
  }

  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────────

export async function testSetup() {
  return request("/auth/test-setup", { method: "POST" });
}

export async function verifyPolicyholder(data: {
  tenant_id?: string;
  slug?: string;
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
// ── Batch Upload ────────────────────────────────────────────────────────

export async function uploadPoliciesBatch(
  files: File[],
  policyNumbers: string[]
) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("policy_numbers", policyNumbers.join(","));
  return request("/policies/upload-batch", { method: "POST", body: formData });
}

export async function uploadCommunicationsBatch(
  files: File[],
  communicationType: string,
  titles?: string[]
) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("communication_type", communicationType);
  if (titles && titles.length > 0) {
    formData.append("titles", titles.join(","));
  }
  return request("/communications/upload-batch", {
    method: "POST",
    body: formData,
  });
}

// ── Query History ───────────────────────────────────────────────────────

export async function getStaffQueryHistory(params?: {
  page?: number;
  page_size?: number;
  user_type?: string;
  document_type?: string;
  policy_number?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size) searchParams.set("page_size", String(params.page_size));
  if (params?.user_type) searchParams.set("user_type", params.user_type);
  if (params?.document_type)
    searchParams.set("document_type", params.document_type);
  if (params?.policy_number)
    searchParams.set("policy_number", params.policy_number);
  if (params?.search) searchParams.set("search", params.search);

  const qs = searchParams.toString();
  return request(`/history/staff${qs ? `?${qs}` : ""}`);
}

export async function getStaffQueryStats() {
  return request("/history/staff/stats");
}

export async function getQueryDetail(queryId: string) {
  return request(`/history/staff/${queryId}`);
}

// Policyholder: get full detail for one of their own past queries
export async function getPolicyholderQueryDetail(queryId: string) {
  return request(`/history/policyholder/${queryId}`);
}

export async function getPolicyholderQueryHistory(
  page = 1,
  pageSize = 25
) {
  return request(
    `/history/policyholder?page=${page}&page_size=${pageSize}`
  );
}

// ── Policy Search & Download ─────────────────────────────────────────

export async function searchPolicies(q: string = "", page = 1, pageSize = 20) {
  return request(`/policies/search?q=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`);
}

export async function downloadPolicy(policyNumber: string): Promise<Blob> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/policies/${policyNumber}/download`, { headers });
  if (!res.ok) throw new Error("Failed to download policy");
  return res.blob();
}

export async function getPolicyText(policyNumber: string) {
  return request(`/policies/${policyNumber}/text`);
}

// ── Communication Search ────────────────────────────────────────────

export async function searchCommunications(
  search: string = "",
  communicationType?: string,
  page = 1,
  pageSize = 20
) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search) params.set("search", search);
  if (communicationType) params.set("communication_type", communicationType);
  return request(`/communications?${params.toString()}`);
}

// Staff: Get full conversation history for a specific policy (current user only)
export async function getStaffConversation(policyNumber: string) {
  return request(`/history/staff/conversation/${encodeURIComponent(policyNumber)}`);
}

// Policyholder: Get full conversation history for their policy
export async function getPolicyholderConversation() {
  return request("/history/policyholder/conversation");
}

// ── Tenant Info (served by client backend, managed by back office) ───

export async function getTenantNotifications() {
  return request("/tenant/notifications");
}

export async function getTenantDisclaimer() {
  return request("/tenant/disclaimer");
}

export async function getTenantUsage() {
  return request("/tenant/usage");
}

export async function getTenantStatus() {
  return request("/tenant/status");
}

// ── Admin Management (tenant admin only) ────────────────────────────────

export async function adminListStaff(params: {
  page?: number; page_size?: number; search?: string;
  show_deleted?: boolean; sort_by?: string; sort_order?: string;
} = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  if (params.search) qs.set("search", params.search);
  if (params.show_deleted) qs.set("show_deleted", "true");
  if (params.sort_by) qs.set("sort_by", params.sort_by);
  if (params.sort_order) qs.set("sort_order", params.sort_order);
  return request(`/admin/staff?${qs}`);
}

export async function adminCreateStaff(data: { email: string; name: string; role?: string }) {
  return request("/admin/staff", { method: "POST", body: JSON.stringify(data) });
}

export async function adminUpdateStaff(staffId: string, data: { name?: string; role?: string; email?: string }) {
  return request(`/admin/staff/${staffId}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function adminToggleStaffStatus(staffId: string, isActive: boolean) {
  return request(`/admin/staff/${staffId}/status`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) });
}

export async function resetStaffPassword(staffId: string) {
  return request(`/admin/staff/${staffId}/reset-password`, { method: "POST" });
}

export async function adminListPolicyholders(params: { page?: number; page_size?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  if (params.search) qs.set("search", params.search);
  return request(`/admin/policyholders?${qs}`);
}

export async function adminCreatePolicyholder(data: { policy_number: string; last_name?: string; company_name?: string }) {
  return request("/admin/policyholders", { method: "POST", body: JSON.stringify(data) });
}

export async function adminUpdatePolicyholder(phId: string, data: { policy_number?: string; last_name?: string; company_name?: string }) {
  return request(`/admin/policyholders/${phId}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function adminTogglePolicyholderStatus(phId: string, isActive: boolean) {
  return request(`/admin/policyholders/${phId}/status`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) });
}

export async function getCurrentUserInfo() {
  return request("/tenant/me");
}

export async function staffAuth0Login(accessToken: string, email?: string) {
  // This calls the backend directly — NOT through the `request` helper,
  // because we don't have our own JWT yet (that's what we're getting).
  const API_BASE = process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
      : "http://localhost:8000/api/v1";

  const res = await fetch(`${API_BASE}/auth/staff-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, email }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const message = Array.isArray(body.detail)
        ? body.detail.map((e: any) => e.msg || JSON.stringify(e)).join("; ")
        : body.detail || body.error || `Login failed: ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

