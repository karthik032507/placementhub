import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, Search, Users, ArrowRight, Building2 } from "lucide-react";
import api, { getErrorMessage } from "../../api/axios";
import { CompanyStatus } from "../../components/ui/StatusBadge";
import EmptyState, { PageLoading } from "../../components/ui/EmptyState";
import SendUpdateModal from "./SendUpdateModal";
import { initials } from "../../utils/format";

// Admin picks a company and sends a message to its active applicants.
export default function CompanyUpdatesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState(null);

  useEffect(() => {
    api
      .get("/companies")
      .then((res) => setCompanies(res.data.data.companies))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => !q || c.name.toLowerCase().includes(q) || c.jobRole.toLowerCase().includes(q));
  }, [companies, search]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Updates</h1>
          <p className="page-subtitle">Send a notification to the active applicants of a company</p>
        </div>
      </div>

      <div className="alert alert-info mb-6">
        <Megaphone size={17} />
        <span>Updates reach students whose application is Applied, Shortlisted or Selected. Rejected and withdrawn applicants are not notified. Notifications are stored and shown to students the next time they open the portal.</span>
      </div>

      <div className="toolbar">
        <div className="input-icon-wrap">
          <Search size={17} />
          <input className="input" placeholder="Search company or role..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && <PageLoading text="Loading companies…" />}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && visible.length === 0 && (
        <div className="card">
          <EmptyState icon={Building2} title="No companies found" text={companies.length === 0 ? "Add a company first." : "Try a different search."} />
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="update-list">
          {visible.map((company) => (
            <div key={company._id} className="card update-card">
              <div className="update-card-head">
                <span className="company-logo">{initials(company.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="company-name" style={{ fontSize: 16 }}>
                    {company.name}
                  </div>
                  <div className="company-role" style={{ fontSize: 13 }}>
                    {company.jobRole}
                  </div>
                </div>
              </div>
              <div className="row between wrap gap-3">
                <CompanyStatus company={company} />
                <span className="chip chip-neutral">
                  <Users size={14} /> {company.applicantCount ?? 0} applicants
                </span>
              </div>
              <div className="row gap-2" style={{ marginTop: "auto" }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setTarget(company)} disabled={(company.applicantCount ?? 0) === 0}>
                  <Megaphone size={15} /> Send Update
                </button>
                <Link to={`/companies/${company._id}/applicants`} className="btn btn-ghost btn-sm">
                  Applicants <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {target && <SendUpdateModal company={target} onClose={() => setTarget(null)} />}
    </>
  );
}
