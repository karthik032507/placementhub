import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Download, XCircle, ArrowRight } from "lucide-react";
import api, { getErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState, { PageLoading } from "../../components/ui/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { formatDate, initials, STATUS_LABELS } from "../../utils/format";
import { downloadResume } from "../../utils/download";

const FILTERS = ["ALL", "APPLIED", "SHORTLISTED", "SELECTED", "REJECTED", "WITHDRAWN"];

export default function MyApplicationsPage() {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    api
      .get("/applications/my")
      .then((res) => setApplications(res.data.data.applications))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function withdraw() {
    setWithdrawing(true);
    try {
      const res = await api.patch(`/applications/${withdrawTarget._id}/withdraw`);
      setApplications((list) => list.map((a) => (a._id === withdrawTarget._id ? { ...a, status: res.data.data.application.status } : a)));
      toast.success("Application withdrawn.");
      setWithdrawTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setWithdrawing(false);
    }
  }

  const visible = filter === "ALL" ? applications : applications.filter((a) => a.status === filter);
  const counts = applications.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {});

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Applications</h1>
          <p className="page-subtitle">Track the status of every company you applied to</p>
        </div>
        <div className="page-header-actions">
          <Link to="/companies" className="btn btn-secondary">
            Browse Companies <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {loading && <PageLoading text="Loading applications…" />}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && applications.length === 0 && (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No applications yet"
            text="When you apply to a company, it will show up here along with its current status."
            action={
              <Link to="/companies" className="btn btn-primary">
                Browse Companies <ArrowRight size={16} />
              </Link>
            }
          />
        </div>
      )}

      {!loading && applications.length > 0 && (
        <div className="card">
          <div className="filters-bar">
            <div className="filter-pills">
              {FILTERS.map((value) => (
                <button key={value} type="button" className={`pill ${filter === value ? "is-active" : ""}`} onClick={() => setFilter(value)}>
                  {value === "ALL" ? `All (${applications.length})` : `${STATUS_LABELS[value]} (${counts[value] || 0})`}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState title="Nothing here" text={`You have no ${STATUS_LABELS[filter]?.toLowerCase()} applications.`} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Package</th>
                    <th>Applied On</th>
                    <th>Resume</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((application) => {
                    const company = application.company || {};
                    return (
                      <tr key={application._id}>
                        <td>
                          <Link to={`/companies/${company._id}`} className="company-cell" style={{ color: "inherit" }}>
                            <span className="company-logo">{initials(company.name || "?")}</span>
                            <span>
                              <div className="cell-primary">{company.name || "Company removed"}</div>
                              <div className="cell-muted">{company.jobRole}</div>
                            </span>
                          </Link>
                        </td>
                        <td className="fw-600">{company.package || "—"}</td>
                        <td className="cell-muted">{formatDate(application.appliedAt)}</td>
                        <td>
                          <button type="button" className="link-btn row gap-2" onClick={() => downloadResume(application).catch(() => toast.error("Could not download the resume."))} title={application.resume?.originalName}>
                            <Download size={14} /> PDF
                          </button>
                        </td>
                        <td>
                          <StatusBadge status={application.status} />
                        </td>
                        <td>
                          <div className="actions-cell">
                            {application.status === "APPLIED" ? (
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => setWithdrawTarget(application)}>
                                <XCircle size={14} /> Withdraw
                              </button>
                            ) : (
                              <span className="cell-muted">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {withdrawTarget && (
        <ConfirmDialog
          title={`Withdraw application to ${withdrawTarget.company?.name}?`}
          message="This cannot be undone. Once withdrawn, you will not be able to apply to this company again."
          confirmText="Withdraw Application"
          danger
          loading={withdrawing}
          onConfirm={withdraw}
          onClose={() => setWithdrawTarget(null)}
        />
      )}
    </>
  );
}
