import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Search, Download, Users, Megaphone, ArrowUpDown } from "lucide-react";
import api, { getErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState, { PageLoading } from "../../components/ui/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SendUpdateModal from "./SendUpdateModal";
import { formatDate, initials, BRANCHES, STATUS_LABELS } from "../../utils/format";
import { downloadResume } from "../../utils/download";

// Same transition rules as the backend, so the dropdown only offers valid next steps.
const NEXT_STATUSES = {
  APPLIED: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["SELECTED", "REJECTED"],
  SELECTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const SORT_OPTIONS = [
  { value: "appliedAt:desc", label: "Newest first" },
  { value: "appliedAt:asc", label: "Oldest first" },
  { value: "cgpa:desc", label: "CGPA: high to low" },
  { value: "cgpa:asc", label: "CGPA: low to high" },
];

export default function ApplicantsPage() {
  const { id } = useParams();
  const toast = useToast();

  const [company, setCompany] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search / filter / sort are sent to the backend as query parameters.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("appliedAt:desc");

  const [pendingChange, setPendingChange] = useState(null); // { application, status }
  const [changing, setChanging] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  // Wait until the user stops typing before hitting the API.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sortBy, order] = sort.split(":");
      const params = { sortBy, order };
      if (debouncedSearch) params.search = debouncedSearch;
      if (branch) params.branch = branch;
      if (status) params.status = status;
      const res = await api.get(`/companies/${id}/applications`, { params });
      setCompany(res.data.data.company);
      setApplications(res.data.data.applications);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load applicants."));
    } finally {
      setLoading(false);
    }
  }, [id, debouncedSearch, branch, status, sort]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmStatusChange() {
    const { application, status: nextStatus } = pendingChange;
    setChanging(true);
    try {
      const res = await api.patch(`/applications/${application._id}/status`, { status: nextStatus });
      setApplications((list) => list.map((a) => (a._id === application._id ? { ...a, status: res.data.data.application.status } : a)));
      toast.success(`${application.student?.name} marked as ${STATUS_LABELS[nextStatus]}. The student has been notified.`);
      setPendingChange(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChanging(false);
    }
  }

  const hasFilters = debouncedSearch || branch || status;
  const summary = applications.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {});

  return (
    <>
      <Link to={`/companies/${id}`} className="back-link">
        <ArrowLeft size={16} /> Back to Company
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">Applicants</h1>
          <p className="page-subtitle">{company ? `${company.name} · ${company.jobRole}` : "Students who applied to this company"}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setShowUpdate(true)} disabled={!company}>
            <Megaphone size={17} /> Send Update
          </button>
        </div>
      </div>

      {!hasFilters && !loading && applications.length > 0 && (
        <div className="summary-line">
          <span><strong>{applications.length}</strong> applicants</span>
          <span><strong>{summary.APPLIED || 0}</strong> applied</span>
          <span><strong>{summary.SHORTLISTED || 0}</strong> shortlisted</span>
          <span><strong>{summary.SELECTED || 0}</strong> selected</span>
          <span><strong>{summary.REJECTED || 0}</strong> rejected</span>
          <span><strong>{summary.WITHDRAWN || 0}</strong> withdrawn</span>
        </div>
      )}

      <div className="card">
        <div className="filters-bar">
          <div className="input-icon-wrap">
            <Search size={17} />
            <input className="input" placeholder="Search name, roll number or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">All branches</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="input-icon-wrap" style={{ flex: "0 0 auto", maxWidth: 220 }}>
            <ArrowUpDown size={15} />
            <select className="select" style={{ paddingLeft: 40 }} value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {!loading && <span className="result-count">{applications.length} result{applications.length === 1 ? "" : "s"}</span>}
        </div>

        {loading && <PageLoading text="Loading applicants…" />}
        {error && <div className="alert alert-error" style={{ margin: 20 }}>{error}</div>}

        {!loading && !error && applications.length === 0 && (
          <EmptyState icon={Users} title={hasFilters ? "No matching applicants" : "No applicants yet"} text={hasFilters ? "Try changing the search or filters." : "Students who apply to this company will be listed here."} />
        )}

        {!loading && applications.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No.</th>
                  <th>Branch</th>
                  <th>CGPA</th>
                  <th>Applied On</th>
                  <th>Resume</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Change Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => {
                  const student = application.student || {};
                  const nextOptions = NEXT_STATUSES[application.status] || [];
                  return (
                    <tr key={application._id}>
                      <td>
                        <div className="person-cell">
                          <span className="avatar">{initials(student.name || "?")}</span>
                          <span style={{ minWidth: 0 }}>
                            <div className="cell-primary">{student.name || "Unknown"}</div>
                            <div className="sub">{student.email}</div>
                          </span>
                        </div>
                      </td>
                      <td className="cell-muted">{student.rollNumber || "—"}</td>
                      <td>{student.branch || <span className="cell-muted">—</span>}</td>
                      <td className="fw-600">{student.cgpa ?? <span className="cell-muted">—</span>}</td>
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
                          {nextOptions.length === 0 ? (
                            <span className="cell-muted">Final</span>
                          ) : (
                            <select className="select status-select" value="" onChange={(e) => e.target.value && setPendingChange({ application, status: e.target.value })}>
                              <option value="">Move to…</option>
                              {nextOptions.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
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

      {pendingChange && (
        <ConfirmDialog
          title={`Mark ${pendingChange.application.student?.name} as ${STATUS_LABELS[pendingChange.status]}?`}
          message={`The status will change from ${STATUS_LABELS[pendingChange.application.status]} to ${STATUS_LABELS[pendingChange.status]} and the student will receive a notification. This cannot be reversed.`}
          confirmText={`Mark as ${STATUS_LABELS[pendingChange.status]}`}
          danger={pendingChange.status === "REJECTED"}
          loading={changing}
          onConfirm={confirmStatusChange}
          onClose={() => setPendingChange(null)}
        />
      )}

      {showUpdate && company && <SendUpdateModal company={company} onClose={() => setShowUpdate(false)} />}
    </>
  );
}

