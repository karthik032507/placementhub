import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Briefcase, IndianRupee, CalendarClock, Globe, Pencil, Lock, Users, Megaphone, CheckCircle2, ArrowRight, Clock, Building2, FileText, Download } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CompanyStatus } from "../components/ui/StatusBadge";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState, { PageLoading } from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ApplyModal from "./student/ApplyModal";
import SendUpdateModal from "./admin/SendUpdateModal";
import { WORK_MODE_LABELS, formatDateTime, formatDate, isDeadlinePassed, daysUntil, initials } from "../utils/format";
import { downloadJobDescription } from "../utils/download";

export default function CompanyDetailsPage() {
  const { id } = useParams();
  const { isStudent, isAdmin } = useAuth();
  const toast = useToast();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/companies/${id}`)
      .then((res) => setCompany(res.data.data.company))
      .catch((err) => setError(getErrorMessage(err, "Company not found.")))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  async function closeCompany() {
    setClosing(true);
    try {
      const res = await api.patch(`/companies/${id}/close`);
      setCompany((c) => ({ ...c, ...res.data.data.company }));
      toast.success(res.data.message);
      setShowClose(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setClosing(false);
    }
  }

  if (loading) return <PageLoading text="Loading company…" />;

  if (error || !company) {
    return (
      <EmptyState
        icon={Building2}
        title="Company not found"
        text={error}
        action={
          <Link to="/companies" className="btn btn-secondary">
            <ArrowLeft size={16} /> Back to Companies
          </Link>
        }
      />
    );
  }

  const deadlinePassed = isDeadlinePassed(company.applicationDeadline);
  const acceptsApplications = company.status === "OPEN" && !deadlinePassed;
  const myApplication = company.myApplication;
  const days = daysUntil(company.applicationDeadline);
  const jdFile = company.jobDescriptionFile;

  return (
    <>
      <Link to="/companies" className="back-link">
        <ArrowLeft size={16} /> Back to Companies
      </Link>

      {/* Title block */}
      <div className="details-head">
        <div className="details-head-main">
          <div className="company-logo lg">{initials(company.name)}</div>
          <div>
            <h1 className="details-title">{company.name}</h1>
            <p className="details-role">{company.jobRole}</p>
            <div className="row gap-3 wrap" style={{ marginTop: 12 }}>
              <CompanyStatus company={company} />
              {company.status === "CLOSED" && <span className="badge badge-neutral">Closed by placement cell</span>}
              {company.status === "OPEN" && deadlinePassed && <span className="badge badge-neutral">Deadline passed</span>}
              {isAdmin && (
                <span className="chip chip-neutral">
                  <Users size={14} /> {company.applicantCount ?? 0} applicants
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="details-actions">
          {isAdmin && (
            <>
              <Link to={`/companies/${id}/applicants`} className="btn btn-primary">
                <Users size={17} /> View Applicants
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => setShowUpdate(true)}>
                <Megaphone size={17} /> Send Update
              </button>
              <Link to={`/companies/${id}/edit`} className="btn btn-secondary">
                <Pencil size={16} /> Edit
              </Link>
              {company.status === "OPEN" && (
                <button type="button" className="btn btn-danger" onClick={() => setShowClose(true)}>
                  <Lock size={16} /> Close
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Key facts strip */}
      <div className="facts-strip">
        <Fact icon={IndianRupee} label="Package" value={company.package} />
        <Fact icon={MapPin} label="Location" value={company.location} />
        <Fact icon={Briefcase} label="Work Mode" value={WORK_MODE_LABELS[company.workMode] || company.workMode} />
        <Fact icon={CalendarClock} label="Deadline" value={formatDate(company.applicationDeadline)} />
      </div>

      <div className="details-layout">
        <div>
          <section className="section">
            <h3 className="section-title">About the Company</h3>
            <p className="prose mt-2">{company.description}</p>
          </section>

          {(company.jobDescription || jdFile) && (
            <section className="section">
              <div className="section-head">
                <h3 className="section-title">Job Description</h3>
              </div>
              {company.jobDescription && <p className="prose">{company.jobDescription}</p>}
              {jdFile && (
                <div className="attachment-row" style={{ marginTop: company.jobDescription ? 16 : 0 }}>
                  <span className="pdf-icon">
                    <FileText size={18} />
                  </span>
                  <span className="file-name">{jdFile.originalName}</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadJobDescription(company).catch(() => toast.error("Could not download the file."))}>
                    <Download size={14} /> Download PDF
                  </button>
                </div>
              )}
            </section>
          )}

          <section className="section">
            <h3 className="section-title">Other Details</h3>
            <dl className="dl mt-2">
              <dt>Application deadline</dt>
              <dd>{formatDateTime(company.applicationDeadline)}</dd>
              <dt>Status</dt>
              <dd>{company.status === "OPEN" ? "Open" : "Closed"}</dd>
              {company.companyWebsite && (
                <>
                  <dt>Website</dt>
                  <dd>
                    <a className="row gap-2" href={company.companyWebsite} target="_blank" rel="noreferrer">
                      <Globe size={14} /> {company.companyWebsite.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </>
              )}
              <dt>Posted on</dt>
              <dd>{formatDate(company.createdAt)}</dd>
              {isAdmin && company.createdBy?.name && (
                <>
                  <dt>Added by</dt>
                  <dd>{company.createdBy.name}</dd>
                </>
              )}
            </dl>
          </section>
        </div>

        {/* Application panel (students) */}
        {isStudent && (
          <aside className="card card-pad apply-panel">
            <h3 className="section-title">Application</h3>

            <div className="deadline-row mt-4">
              <Clock size={18} style={{ color: deadlinePassed ? "var(--muted)" : "var(--warning)" }} />
              <div>
                <div className="text-sm text-muted">Deadline</div>
                <div className="fw-600">
                  {formatDateTime(company.applicationDeadline)}
                  {!deadlinePassed && days >= 0 && <span className="text-muted fw-600"> · {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} left`}</span>}
                </div>
              </div>
            </div>

            <div className="mt-4">
              {myApplication ? (
                <div className="stack gap-3">
                  <div className="alert alert-success">
                    <CheckCircle2 size={18} />
                    <span>Application submitted on {formatDate(myApplication.appliedAt)}.</span>
                  </div>
                  <div className="row between">
                    <span className="text-muted text-sm">Current status</span>
                    <StatusBadge status={myApplication.status} />
                  </div>
                  <Link to="/my-applications" className="btn btn-secondary btn-block">
                    View My Applications <ArrowRight size={16} />
                  </Link>
                </div>
              ) : acceptsApplications ? (
                <div className="stack gap-3">
                  <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => setShowApply(true)}>
                    Apply Now <ArrowRight size={18} />
                  </button>
                  <p className="text-sm text-muted">Choose one of your saved resumes or upload a new PDF, then confirm with your password.</p>
                </div>
              ) : (
                <div className="alert alert-warning">
                  <Lock size={17} />
                  <span>{company.status === "CLOSED" ? "This company is no longer accepting applications." : "The application deadline has passed."}</span>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {showApply && (
        <ApplyModal
          company={company}
          onClose={() => setShowApply(false)}
          onApplied={(application) => setCompany((c) => ({ ...c, myApplication: { status: application.status, appliedAt: application.appliedAt } }))}
        />
      )}

      {showClose && (
        <ConfirmDialog
          title={`Close applications for ${company.name}?`}
          message="Students will no longer be able to apply. Existing applications, resumes and statuses are kept, and you can still update applicants and send them notifications."
          confirmText="Close Company"
          danger
          loading={closing}
          onConfirm={closeCompany}
          onClose={() => setShowClose(false)}
        />
      )}

      {showUpdate && <SendUpdateModal company={company} onClose={() => setShowUpdate(false)} />}
    </>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="fact">
      <div className="fact-icon">
        <Icon size={17} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="fact-label">{label}</div>
        <div className="fact-value">{value}</div>
      </div>
    </div>
  );
}
