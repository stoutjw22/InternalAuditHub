import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAtom } from "jotai";
import { authLoadingAtom, currentUserAtom, fetchCurrentUser } from "@/lib/auth";
import { tokenStorage } from "@/lib/api-client";
import Layout from "@/pages/_layout";
import LoginPage from "@/pages/login";

// Lazy-loaded pages for code splitting
const AuditPlanDashboard = lazy(() => import("@/pages/audit-plan/index"));
const AuditableEntityDetail = lazy(() => import("@/pages/audit-plan/entity-detail"));
const AuditPlanRiskScoring = lazy(() => import("@/pages/audit-plan/risk-scoring"));
const AuditPlanGrcThemes = lazy(() => import("@/pages/audit-plan/grc-themes"));
const AuditPlanYear6 = lazy(() => import("@/pages/audit-plan/year6"));
const AuditPlanImport = lazy(() => import("@/pages/audit-plan/import-plan"));
const HomePage = lazy(() => import("@/pages/index"));
const EngagementsPage = lazy(() => import("@/pages/engagements"));
const RisksPage = lazy(() => import("@/pages/risks"));
const ControlsPage = lazy(() => import("@/pages/controls"));
const FindingsPage = lazy(() => import("@/pages/findings"));
const ApprovalsPage = lazy(() => import("@/pages/approvals"));
const AuditLogsPage = lazy(() => import("@/pages/audit-logs"));
const ReportsPage = lazy(() => import("@/pages/reports"));
const ReportTemplatesPage = lazy(() => import("@/pages/report-templates"));
const UsersPage = lazy(() => import("@/pages/users"));
const AuditorDashboardPage = lazy(() => import("@/pages/auditor-dashboard"));
const ManagerDashboardPage = lazy(() => import("@/pages/manager-dashboard"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
const TestingPage = lazy(() => import("@/pages/testing"));
const TestPlanDetailPage = lazy(() => import("@/pages/testing-plan-detail"));
const TestInstancePage = lazy(() => import("@/pages/testing-instance"));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function ProtectedRoutes() {
  const [user] = useAtom(currentUserAtom);
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="engagements/*" element={<EngagementsPage />} />
          <Route path="risks" element={<RisksPage />} />
          <Route path="controls" element={<ControlsPage />} />
          <Route path="findings" element={<FindingsPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="report-templates" element={<ReportTemplatesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="dashboard/auditor" element={<AuditorDashboardPage />} />
          <Route path="dashboard/manager" element={<ManagerDashboardPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="testing" element={<TestingPage />} />
          <Route path="testing/:planId" element={<TestPlanDetailPage />} />
          <Route path="testing/:planId/instances/:instanceId" element={<TestInstancePage />} />
          {/* 6-Year Integrated Audit Plan */}
          <Route path="audit-plan" element={<AuditPlanDashboard />} />
          <Route path="audit-plan/entities/:id" element={<AuditableEntityDetail />} />
          <Route path="audit-plan/risk-scoring" element={<AuditPlanRiskScoring />} />
          <Route path="audit-plan/grc-themes" element={<AuditPlanGrcThemes />} />
          <Route path="audit-plan/year6" element={<AuditPlanYear6 />} />
          <Route path="audit-plan/import" element={<AuditPlanImport />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  const [, setUser] = useAtom(currentUserAtom);
  const [, setLoading] = useAtom(authLoadingAtom);

  useEffect(() => {
    // Rehydrate auth state on mount
    const token = tokenStorage.getAccess();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        tokenStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [setUser, setLoading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
