export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// ── Auth token storage ────────────────────────────────────────────────────────
const TOKEN_KEY = 'nirikshan_token';
const USER_KEY  = 'nirikshan_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function getStoredUser(): Record<string, any> | null {
  const raw = localStorage.getItem(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { clearStoredAuth(); return null; }
}
export function setStoredAuth(token: string, user: Record<string, any>) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
export async function fetchJson(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401 && endpoint !== '/auth/login') {
      clearStoredAuth();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body || res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`[API Client] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// ── Auth APIs ─────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getMe = () => fetchJson('/auth/me');
export const getDemoUsers = () => fetchJson('/auth/demo-users');

function buildQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null') {
      searchParams.append(key, String(val));
    }
  }
  const q = searchParams.toString();
  return q ? `?${q}` : '';
}

// ── Dashboard APIs ────────────────────────────────────────────────────────────
export const getDashboardStats = (params?: { state?: string; district?: string }) =>
  fetchJson(`/dashboard/stats${buildQuery(params)}`);

export const getDashboardCharts = () => fetchJson('/dashboard/charts');

// ── Works APIs ────────────────────────────────────────────────────────────────
export const getWorksList = (params?: Record<string, any>) =>
  fetchJson(`/works${buildQuery(params)}`);

export const getWorkDetail = (idOrCode: string | number) => fetchJson(`/works/${idOrCode}`);
export const getWorkEvidence = (idOrCode: string | number) => fetchJson(`/works/${idOrCode}/evidence`);

// ── Review Queue APIs ─────────────────────────────────────────────────────────
export const getReviewQueue = (params?: Record<string, any>) =>
  fetchJson(`/reviews${buildQuery(params)}`);

export const submitReviewDecision = (
  caseId: number,
  data: { reviewer_name: string; reviewer_role: string; decision: string; comment: string }
) => fetchJson(`/reviews/${caseId}/decision`, { method: 'POST', body: JSON.stringify(data) });

export const assignReviewer = (
  caseId: number,
  data: { assigned_to: string; assigned_role: string }
) => fetchJson(`/reviews/${caseId}/assign`, { method: 'POST', body: JSON.stringify(data) });

// ── Geo GIS APIs ──────────────────────────────────────────────────────────────
export const getGeoDistricts = (layer = 'Risk Score', state?: string) => {
  const query = new URLSearchParams({ layer, ...(state ? { state } : {}) }).toString();
  return fetchJson(`/geo/districts?${query}`);
};

// ── Price Intelligence APIs ───────────────────────────────────────────────────
export const getPriceStats       = ()                          => fetchJson('/prices/stats');
export const getPriceDistribution = ()                         => fetchJson('/prices/distribution');
export const getPriceBenchmarks  = (params?: Record<string, any>) => {
  const query = new URLSearchParams(params).toString();
  return fetchJson(`/prices/benchmarks?${query}`);
};

// ── Duplicate Detection APIs ──────────────────────────────────────────────────
export const getDuplicateStats = ()                          => fetchJson('/duplicates/stats');
export const getDuplicatePairs = (params?: Record<string, any>) => {
  const query = new URLSearchParams(params).toString();
  return fetchJson(`/duplicates/pairs?${query}`);
};

// ── Reports APIs ──────────────────────────────────────────────────────────────
export const getReportTypes   = () => fetchJson('/reports/types');
export const getRecentReports = () => fetchJson('/reports/recent');
export const generateReport   = (payload: any) =>
  fetchJson('/reports/generate', { method: 'POST', body: JSON.stringify(payload) });

// ── Audit Trail APIs ──────────────────────────────────────────────────────────
export const getAuditTrail = (params?: Record<string, any>) => {
  const query = new URLSearchParams(params).toString();
  return fetchJson(`/audit?${query}`);
};

// ── Data Ingestion APIs ───────────────────────────────────────────────────────
export const getIngestionSources  = () => fetchJson('/ingestion/sources');
export const getIngestionLogs     = () => fetchJson('/ingestion/logs');
export const triggerNormalization = () => fetchJson('/ingestion/normalize', { method: 'POST' });
export const triggerAnomalyAnalysis = () => fetchJson('/ingestion/analyze', { method: 'POST' });

// ── Risk Analysis APIs ────────────────────────────────────────────────────────
export const getRiskAnalysisStats  = () => fetchJson('/risk-analysis/stats');
export const getRiskMatrix         = () => fetchJson('/risk-analysis/matrix');
export const getSignalPerformance  = () => fetchJson('/risk-analysis/signals');

// ── Official MPLADS MP Summary ────────────────────────────────────────────────
export const getOfficialSummary = (params?: { state?: string; house?: string }) =>
  fetchJson(`/official/summary${buildQuery(params)}`);
export const getOfficialStates = (house?: string) =>
  fetchJson(`/official/states${buildQuery({ house })}`);
export const getOfficialMPs = (params?: Record<string, any>) =>
  fetchJson(`/official/mps${buildQuery(params)}`);
export const getOfficialComparison = () => fetchJson('/official/comparison');
