import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AppProvider } from './context/AppContext';
import { ErrorState } from './components/common/ErrorState';
import { LoadingState } from './components/common/LoadingState';
import { LoginPage } from './pages/LoginPage';
import { AuthUser, UserRole } from './types';
import { getStoredToken, getStoredUser, clearStoredAuth } from './services/api';

// Pages — lazy-friendly standard imports
import { CommandCenter } from './pages/CommandCenter';
import { WorksExplorer } from './pages/WorksExplorer';
import { WorkInvestigation } from './pages/WorkInvestigation';
import { RiskEvidence } from './pages/RiskEvidence';
import { ReviewQueue } from './pages/ReviewQueue';
import { GeographicIntelligence } from './pages/GeographicIntelligence';
import { PriceIntelligence } from './pages/PriceIntelligence';
import { DuplicateDetection } from './pages/DuplicateDetection';
import { Reports } from './pages/Reports';
import { AuditTrail } from './pages/AuditTrail';
import { DataIngestion } from './pages/DataIngestion';
import { RiskAnalysis } from './pages/RiskAnalysis';
import { Settings } from './pages/Settings';
import { OfficialMPLADS } from './pages/OfficialMPLADS';

// ── Error Boundary ────────────────────────────────────────────────────────────

interface EBState { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <ErrorState
              title="Application Error"
              message={this.state.error?.message ?? 'An unexpected error occurred.'}
              onRetry={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              variant="generic"
            />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Route wrappers that use URL params ────────────────────────────────────────

function WorkInvestigationRoute({ currentRole }: { currentRole: UserRole }) {
  const { workCode } = useParams<{ workCode: string }>();
  const navigate = useNavigate();
  return <WorkInvestigation workCode={workCode!} onNavigate={navigate} currentUserRole={currentRole} />;
}

function RiskEvidenceRoute() {
  const { workCode } = useParams<{ workCode: string }>();
  const navigate = useNavigate();
  return <RiskEvidence workCode={workCode!} onNavigate={navigate} />;
}

function WorksExplorerRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  return (
    <WorksExplorer
      onNavigate={navigate}
      initialSearch={params.get('search') ?? ''}
      initialDistrict={params.get('district') ?? ''}
      initialRisk={params.get('risk') ?? ''}
    />
  );
}

// ── Protected layout (requires auth) ─────────────────────────────────────────

interface ShellLayoutProps {
  currentRole: UserRole;
  onRoleChange: (r: UserRole) => void;
}

function ShellLayout({ currentRole, onRoleChange }: ShellLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppShell
      currentRoute={location.pathname}
      onNavigate={navigate}
      currentRole={currentRole}
      onRoleChange={onRoleChange}
    >
      <Outlet />
    </AppShell>
  );
}


// ── App Root ──────────────────────────────────────────────────────────────────

export function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const stored = getStoredUser();
    return stored as AuthUser | null;
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const stored = getStoredUser();
    return (stored?.role as UserRole) ?? 'District Officer';
  });

  const handleLogin = (user: AuthUser, _token: string) => {
    setAuthUser(user);
    setCurrentRole(user.role as UserRole);
  };

  const handleLogout = () => {
    clearStoredAuth();
    setAuthUser(null);
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
  };

  return (
    <ErrorBoundary>
      <AppProvider currentRole={currentRole} onRoleChange={handleRoleChange}>
        <BrowserRouter>
          <Routes>
            {/* Public: login */}
            <Route
              path="/login"
              element={
                authUser
                  ? <Navigate to="/" replace />
                  : <LoginPage onLogin={handleLogin} />
              }
            />

            {/* Protected: all app routes */}
            <Route
              element={
                authUser
                  ? <ShellLayout currentRole={currentRole} onRoleChange={handleRoleChange} />
                  : <Navigate to="/login" replace />
              }
            >
              <Route index element={<CommandCenterRoute />} />
              <Route path="official-data" element={<OfficialMPLADS />} />
              <Route path="works" element={<WorksExplorerRoute />} />
              <Route path="works/:workCode" element={<WorkInvestigationRoute currentRole={currentRole} />} />
              <Route path="works/:workCode/evidence" element={<RiskEvidenceRoute />} />
              <Route path="review-queue" element={<ReviewQueueRoute currentRole={currentRole} />} />
              <Route path="geo" element={<GeoRoute />} />
              <Route path="price-intelligence" element={<PriceRoute />} />
              <Route path="duplicates" element={<DupRoute />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit-trail" element={<AuditRoute />} />
              <Route path="ingestion" element={<DataIngestion />} />
              <Route path="risk-analysis" element={<RiskAnalysisRoute />} />
              <Route path="settings" element={<SettingsRoute currentRole={currentRole} onRoleChange={handleRoleChange} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

// ── Per-route wrappers (pages that receive onNavigate as a prop) ─────────────

function CommandCenterRoute() {
  const navigate = useNavigate();
  return <CommandCenter onNavigate={navigate} />;
}

function ReviewQueueRoute({ currentRole }: { currentRole: UserRole }) {
  const navigate = useNavigate();
  return <ReviewQueue onNavigate={navigate} currentUserRole={currentRole} />;
}

function GeoRoute() {
  const navigate = useNavigate();
  return <GeographicIntelligence onNavigate={navigate} />;
}

function PriceRoute() {
  const navigate = useNavigate();
  return <PriceIntelligence onNavigate={navigate} />;
}

function DupRoute() {
  const navigate = useNavigate();
  return <DuplicateDetection onNavigate={navigate} />;
}

function AuditRoute() {
  const navigate = useNavigate();
  return <AuditTrail onNavigate={navigate} />;
}

function RiskAnalysisRoute() {
  const navigate = useNavigate();
  return <RiskAnalysis onNavigate={navigate} />;
}

function SettingsRoute({ currentRole, onRoleChange }: { currentRole: UserRole; onRoleChange: (r: UserRole) => void }) {
  return <Settings currentUserRole={currentRole} onRoleChange={onRoleChange} />;
}

export default App;
