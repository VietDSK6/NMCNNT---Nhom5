import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import { AppLink, type ApplicationTab, resolveRoute, useDashboardPath } from "./app/routing";
import { AuditPage } from "./features/audit/AuditPage";
import { ApplicationsPage } from "./features/applications/ApplicationsPage";
import { GitSummary } from "./features/deployments/GitSummary";
import { DeleteServicePanel } from "./features/applications/DeleteServicePanel";
import { ApplicationControlPanel } from "./features/applications/ApplicationControlPanel";
import { ApplicationFacts, ApplicationIdentity, DeploymentSnapshot } from "./features/applications/ApplicationSummary";
import { AppShell } from "./components/layout/AppShell";
import type { Crumb } from "./components/layout/Header";
import { OverviewPage } from "./features/dashboard/OverviewPage";
import { GitDeploymentPanel } from "./features/deployments/GitDeploymentPanel";
import { ReleaseHistoryPanel } from "./features/deployments/ReleaseHistoryPanel";
import { EnvironmentVariablesPanel } from "./features/environment/EnvironmentVariablesPanel";
import { OperationsPage } from "./features/operations/OperationsPage";
import { OperationsTable } from "./features/operations/OperationsTable";
import { UsageSummary } from "./features/observability/UsageSummary";
import { AppStatCards } from "./features/applications/AppStatCards";
import { ObservabilityPanel } from "./features/observability/ObservabilityPanel";
import { CreateServiceForm, CreateServiceGuide } from "./features/services/CreateService";
import {
  AlertIcon,
  CheckIcon,
  ChevronIcon,
  DeployIcon,
  ExternalIcon,
} from "./icons";
import type {
  ApplicationItem,
  ApplicationsResponse,
  AuditEvent,
  DeploymentItem,
  OperationAction,
  OperationItem,
  ReleaseItem,
  TrustedSource,
  UserSession,
} from "./types";
import { grafanaUrl } from "./config/navigation";
import { operationActionLabels } from "./shared/labels";

export function Dashboard({ session, onLoggedOut }: { readonly session: UserSession; readonly onLoggedOut: () => void }) {
  const [applications, setApplications] = useState<ApplicationsResponse | null>(null);
  const [operations, setOperations] = useState<readonly OperationItem[]>([]);
  const [sources, setSources] = useState<readonly TrustedSource[]>([]);
  const [deployments, setDeployments] = useState<readonly DeploymentItem[]>([]);
  const [releases, setReleases] = useState<readonly ReleaseItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<readonly AuditEvent[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [submittingApp, setSubmittingApp] = useState<string | null>(null);
  const [submittingDeployment, setSubmittingDeployment] = useState(false);
  const [submittingReleaseId, setSubmittingReleaseId] = useState<string | null>(null);
  const [submittingService, setSubmittingService] = useState(false);
  const [deletingApp, setDeletingApp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pathname = useDashboardPath();
  const route = resolveRoute(pathname);

  const inFlight = useRef<AbortController | null>(null);

  const loadData = useCallback(async (quiet = false) => {
    if (quiet && inFlight.current) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const options = { signal: controller.signal };
    if (!quiet) setRefreshing(true);
    setError("");
    try {
      const [apps, operationHistory, sourceCatalog, deploymentHistory, releaseHistory, audit] = await Promise.all([
        api.applications(options),
        api.operations(undefined, options),
        api.sources(options),
        api.deployments(options),
        api.releases(options),
        api.audit(undefined, options),
      ]);
      setApplications(apps);
      setOperations(operationHistory.data);
      setSources(sourceCatalog.data);
      setDeployments(deploymentHistory.data);
      setReleases(releaseHistory.data);
      setAuditEvents(audit.data);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLoggedOut();
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu hệ thống.");
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setRefreshing(false);
      }
    }
  }, [onLoggedOut]);

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => void loadData(true), 5_000);
    return () => {
      window.clearInterval(timer);
      inFlight.current?.abort();
    };
  }, [loadData]);

  async function executeAction(application: ApplicationItem, action: OperationAction, version?: string) {
    setSubmittingApp(application.id);
    setError("");
    setNotice("");
    try {
      await api.execute(application.id, action, version);
      const versionText = version ? ` ${version}` : "";
      setNotice(`Đã tiếp nhận yêu cầu ${operationActionLabels[action].toLowerCase()} ${application.name}${versionText}.`);
      await loadData(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi thao tác tới hệ thống.");
    } finally {
      setSubmittingApp(null);
    }
  }

  async function deploySource(sourceId: string, commit: string) {
    setSubmittingDeployment(true);
    setError("");
    setNotice("");
    try {
      await api.deploySource(sourceId, commit);
      setNotice(`Đã tiếp nhận yêu cầu build và triển khai commit ${commit.slice(0, 12)}.`);
      await loadData(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo deployment từ Git.");
    } finally {
      setSubmittingDeployment(false);
    }
  }

  async function deployLatestSource(sourceId: string) {
    setSubmittingDeployment(true);
    setError("");
    setNotice("");
    try {
      const response = await api.deployLatestSource(sourceId);
      setNotice(`Đã tiếp nhận commit mới nhất ${response.data.commitSha.slice(0, 12)} để build và triển khai.`);
      await loadData(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể triển khai commit mới nhất.");
    } finally {
      setSubmittingDeployment(false);
    }
  }

  async function rollbackRelease(release: ReleaseItem) {
    setSubmittingReleaseId(release.id);
    setError("");
    setNotice("");
    try {
      await api.rollbackRelease(release.id);
      setNotice(`Đã rollback ${release.applicationName} về ${release.version}.`);
      await loadData(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể rollback release.");
    } finally {
      setSubmittingReleaseId(null);
    }
  }

  async function createService(input: Parameters<typeof api.createService>[0]) {
    setSubmittingService(true);
    setError("");
    setNotice("");
    try {
      const response = await api.createService(input);
      setNotice(`Đã đăng ký ${input.name}; deployment commit mới nhất đang được xử lý.`);
      await loadData(true);
      window.history.pushState({}, "", `/applications/${response.data.application.id}/deployments`);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.scrollTo({ top: 0 });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo Web Service.");
    } finally {
      setSubmittingService(false);
    }
  }

  async function deleteService(application: ApplicationItem) {
    setDeletingApp(application.id);
    setError("");
    setNotice("");
    try {
      const response = await api.deleteService(application.id);
      setNotice(`Đã xóa ${application.name}: ${response.data.message}`);
      window.history.pushState({}, "", "/applications");
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.scrollTo({ top: 0 });
      await loadData(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa Web Service.");
    } finally {
      setDeletingApp(null);
    }
  }

  async function logout() {
    try { await api.logout(); } finally { onLoggedOut(); }
  }

  const currentApplication = route.kind === "application"
    ? applications?.data.find((application) => application.id === route.appId)
    : undefined;

  const pageTitle = (() => {
    if (route.kind === "applications") return "Ứng dụng";
    if (route.kind === "create-service") return "Tạo Web Service";
    if (route.kind === "deployments") return "Triển khai từ Git";
    if (route.kind === "operations") return "Lịch sử thao tác";
    if (route.kind === "audit") return "Nhật ký quản trị";
    if (route.kind === "observability") return "Log và tài nguyên";
    if (route.kind === "application") return currentApplication?.name ?? "Chi tiết ứng dụng";
    if (route.kind === "not-found") return "Không tìm thấy trang";
    return "Tổng quan hệ thống";
  })();

  function renderApplicationPage(application: ApplicationItem, tab: ApplicationTab) {
    const applicationDeployments = deployments.filter((deployment) => deployment.applicationId === application.id);
    const applicationOperations = operations.filter((operation) => operation.applicationId === application.id);
    const applicationSources = sources.filter((source) => source.appId === application.id);
    const applicationReleases = releases.filter((release) => release.applicationId === application.id);
    const basePath = `/applications/${application.id}`;

    return (
      <>
        <ApplicationIdentity application={application} />
        <nav className="detail-tabs" aria-label={`Khu vực ${application.name}`}>
          <AppLink to={basePath} active={tab === "overview"}>Tổng quan</AppLink>
          <AppLink to={`${basePath}/deployments`} active={tab === "deployments"}>Triển khai</AppLink>
          <AppLink to={`${basePath}/environment`} active={tab === "environment"}>Biến môi trường</AppLink>
          <AppLink to={`${basePath}/observability`} active={tab === "observability"}>Nhật ký &amp; tài nguyên</AppLink>
        </nav>

        {tab === "overview" && (
          <div className="detail-content">
            <AppStatCards application={application} />
            <ApplicationControlPanel
              application={application}
              submitting={submittingApp === application.id}
              onAction={(item, action, version) => void executeAction(item, action, version)}
            />
            <div className="detail-grid">
              <ApplicationFacts application={application} latestDeployment={applicationDeployments[0]} />
              <DeploymentSnapshot deployments={applicationDeployments} />
            </div>
            <section className="page-section">
              <div className="section-heading">
                <div><span className="eyebrow">HOẠT ĐỘNG CỦA ỨNG DỤNG</span><h2>Lịch sử thao tác gần đây</h2><p>Chỉ hiển thị các thao tác thuộc {application.name}.</p></div>
                <AppLink className="text-link" to="/operations">Xem toàn hệ thống<ChevronIcon /></AppLink>
              </div>
              <OperationsTable operations={applicationOperations} />
            </section>
            {application.kind === "git" && (
              <DeleteServicePanel application={application} submitting={deletingApp === application.id} onDelete={(item) => void deleteService(item)} />
            )}
          </div>
        )}

        {tab === "deployments" && (
          <section className="detail-content">
            <div className="page-intro page-intro--compact">
              <div><span className="eyebrow">TRIỂN KHAI RIÊNG CHO ỨNG DỤNG</span><h2>Source, commit và build log</h2><p>Mọi bản ghi dưới đây đều thuộc {application.name}.</p></div>
            </div>
          <GitDeploymentPanel
              sources={applicationSources}
              deployments={applicationDeployments}
              submitting={submittingDeployment}
              onDeploy={(sourceId, commit) => void deploySource(sourceId, commit)}
              onDeployLatest={(sourceId) => void deployLatestSource(sourceId)}
            />
            <ReleaseHistoryPanel
              application={application}
              releases={applicationReleases}
              submittingReleaseId={submittingReleaseId}
              onRollback={(release) => void rollbackRelease(release)}
            />
          </section>
        )}

        {tab === "environment" && (
          <section className="detail-content">
            <EnvironmentVariablesPanel
              application={application}
              onSaved={(count) => {
                setNotice(`Đã áp dụng ${count} biến môi trường cho ${application.name}.`);
                void loadData(true);
              }}
            />
          </section>
        )}

        {tab === "observability" && (
          <section className="detail-content">
            <div className="page-intro page-intro--compact">
              <div><span className="eyebrow">QUAN SÁT RIÊNG CHO ỨNG DỤNG</span><h2>Log và tài nguyên container</h2><p>Số liệu và nhật ký chỉ lấy từ container của {application.name}.</p></div>
              <a className="button button--secondary" href={grafanaUrl} target="_blank" rel="noreferrer">Mở Grafana<ExternalIcon /></a>
            </div>
            <ObservabilityPanel applications={[application]} />
          </section>
        )}
      </>
    );
  }

  function renderPage() {
    if (route.kind === "overview") {
      return <OverviewPage username={session.user.username} applications={applications} auditEvents={auditEvents} />;
    }

    if (route.kind === "applications") {
      return (
        <>
          <section className="page-intro"><div><span className="eyebrow">DANH MỤC DỊCH VỤ</span><h2>Ứng dụng</h2><p>Mỗi ứng dụng có không gian vận hành riêng cho vòng đời, deployment và quan sát.</p></div><div className="page-intro__actions"><span className="last-updated">Tự động làm mới mỗi 5 giây</span><AppLink className="button button--primary" to="/applications/new"><DeployIcon />Tạo Web Service</AppLink></div></section>
          <ApplicationsPage applications={applications} refreshing={refreshing} onRefresh={() => void loadData()} />
        </>
      );
    }

    if (route.kind === "create-service") {
      return (
        <>
          <section className="page-intro page-intro--create"><div><span className="eyebrow">WEB SERVICE MỚI</span><h2>Kết nối mã nguồn và triển khai</h2><p>Tạo một dịch vụ độc lập từ repository GitHub tin cậy. Deployment đầu tiên được bắt đầu ngay sau khi đăng ký.</p></div><AppLink className="text-link" to="/applications">Quay lại ứng dụng<ChevronIcon /></AppLink></section>
          <div className="new-service-layout">
            <CreateServiceForm submitting={submittingService} onCreate={(input) => void createService(input)} />
            <CreateServiceGuide />
          </div>
        </>
      );
    }

    if (route.kind === "application") {
      if (!applications) return <div className="skeleton-detail"><i /><i /><i /></div>;
      if (!currentApplication) {
        return <div className="page-empty"><AlertIcon /><div><h2>Không tìm thấy ứng dụng</h2><p>ID ứng dụng không nằm trong danh mục Control API.</p><AppLink className="button button--secondary" to="/applications">Về danh sách ứng dụng</AppLink></div></div>;
      }
      return renderApplicationPage(currentApplication, route.tab);
    }

    if (route.kind === "deployments") {
      return (
        <>
          <section className="page-intro"><div><span className="eyebrow">TRIỂN KHAI TỪ GIT</span><h2>Build commit mới nhất hoặc đã chọn</h2><p>Góc nhìn toàn hệ thống cho source được phép và lịch sử deployment gần đây.</p></div><span className="last-updated">Tự động làm mới mỗi 5 giây</span></section>
          <GitSummary sources={sources} deployments={deployments} />
          <GitDeploymentPanel
            sources={sources}
            deployments={deployments}
            submitting={submittingDeployment}
            onDeploy={(sourceId, commit) => void deploySource(sourceId, commit)}
            onDeployLatest={(sourceId) => void deployLatestSource(sourceId)}
          />
        </>
      );
    }

    if (route.kind === "operations") {
      return <><section className="page-intro"><div><span className="eyebrow">VÒNG ĐỜI ỨNG DỤNG</span><h2>Lịch sử thao tác</h2><p>Tất cả yêu cầu Start, Stop, Restart và Update trên các ứng dụng.</p></div></section><OperationsPage /></>;
    }

    if (route.kind === "audit") {
      return <><section className="page-intro"><div><span className="eyebrow">KIỂM TOÁN</span><h2>Nhật ký quản trị</h2><p>Kết quả đăng nhập và thao tác được lưu cùng người thực hiện và địa chỉ nguồn.</p></div></section><AuditPage /></>;
    }

    if (route.kind === "observability") {
      return (
        <>
          <section className="page-intro"><div><span className="eyebrow">QUAN SÁT HỆ THỐNG</span><h2>Log và tài nguyên</h2><p>Chọn ứng dụng để đọc log gần nhất và ảnh chụp tài nguyên container.</p></div><a className="button button--secondary" href={grafanaUrl} target="_blank" rel="noreferrer">Mở Grafana<ExternalIcon /></a></section>
          <UsageSummary applications={applications} />
          <ObservabilityPanel applications={applications?.data ?? []} />
        </>
      );
    }

    return <div className="page-empty"><AlertIcon /><div><h2>Không tìm thấy trang</h2><p>Đường dẫn không thuộc Dashboard Mini PaaS.</p><AppLink className="button button--secondary" to="/">Về Tổng quan</AppLink></div></div>;
  }

  const crumbs: readonly Crumb[] = [
    { label: "Mini PaaS", to: "/" },
    ...(route.kind === "application" || route.kind === "create-service" ? [{ label: "Ứng dụng", to: "/applications" }] : []),
    { label: pageTitle },
  ];

  return (
    <AppShell
      pathname={pathname}
      applicationCount={applications?.summary.total}
      crumbs={crumbs}
      title={pageTitle}
      refreshing={refreshing}
      username={session.user.username}
      onRefresh={() => void loadData()}
      onLogout={logout}
      notices={(
        <>
          {error && <div className="alert alert--error glass" role="alert"><AlertIcon /><div><strong>Thao tác chưa hoàn tất</strong><span>{error}</span></div><button onClick={() => void loadData()}>Tải lại dữ liệu</button></div>}
          {notice && <div className="alert alert--success glass" role="status"><CheckIcon /><div><strong>Yêu cầu đã được tiếp nhận</strong><span>{notice}</span></div><button onClick={() => setNotice("")}>Đóng</button></div>}
        </>
      )}
    >
      {renderPage()}
    </AppShell>
  );
}
