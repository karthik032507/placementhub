import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Briefcase, ArrowRight, Building2, Plus, Users, CheckCircle2 } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { CompanyStatus } from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { WORK_MODE_LABELS, STATUS_LABELS, initials } from "../utils/format";

// Shared by students and administrators. The cards are the same; only the actions differ.
export default function CompaniesPage() {
  const { isAdmin } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL | OPEN | CLOSED

  useEffect(() => {
    api
      .get("/companies")
      .then((res) => setCompanies(res.data.data.companies))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  // Simple client-side search over the list we already have (company name or job role).
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      const isOpen = c.status === "OPEN" && new Date() < new Date(c.applicationDeadline);
      if (filter === "OPEN" && !isOpen) return false;
      if (filter === "CLOSED" && isOpen) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.jobRole.toLowerCase().includes(q);
    });
  }, [companies, search, filter]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies</h1>
          <p className="page-subtitle">{isAdmin ? "Manage placement drives and applicants" : "Available placement opportunities"}</p>
        </div>
        {isAdmin && (
          <div className="page-header-actions">
            <Link to="/companies/new" className="btn btn-primary">
              <Plus size={18} /> Add Company
            </Link>
          </div>
        )}
      </div>

      <div className="toolbar">
        <div className="input-icon-wrap">
          <Search size={17} />
          <input className="input" placeholder="Search company or role..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-pills">
          {["ALL", "OPEN", "CLOSED"].map((value) => (
            <button key={value} type="button" className={`pill ${filter === value ? "is-active" : ""}`} onClick={() => setFilter(value)}>
              {value === "ALL" ? "All" : value === "OPEN" ? "Open" : "Closed"}
            </button>
          ))}
        </div>
        {!loading && (
          <span className="result-count">
            {visible.length} {visible.length === 1 ? "company" : "companies"}
          </span>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="company-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton-card">
              <div className="skeleton title" />
              <div className="skeleton short" />
              <div className="skeleton" />
              <div className="skeleton block" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Building2}
            title={companies.length === 0 ? "No companies yet" : "No matching companies"}
            text={companies.length === 0 ? (isAdmin ? "Add the first company to start a placement drive." : "Companies will appear here once the placement cell adds them.") : "Try a different search term or filter."}
          />
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="company-grid">
          {visible.map((company) => (
            <CompanyCard key={company._id} company={company} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </>
  );
}

function CompanyCard({ company, isAdmin }) {
  const applied = company.myApplicationStatus;

  return (
    <Link to={`/companies/${company._id}`} className="card card-hover company-card">
      {applied && (
        <span className="badge badge-success card-corner-badge">
          <CheckCircle2 size={12} /> {STATUS_LABELS[applied]}
        </span>
      )}
      {isAdmin && (
        <span className="badge badge-neutral card-corner-badge">
          <Users size={12} /> {company.applicantCount ?? 0}
        </span>
      )}

      <div className="company-card-head">
        <div className="company-logo">{initials(company.name)}</div>
        <div style={{ minWidth: 0, paddingRight: applied || isAdmin ? 84 : 0 }}>
          <div className="company-name">{company.name}</div>
          <div className="company-role">{company.jobRole}</div>
        </div>
      </div>

      <div className="company-package">{company.package}</div>
      <div className="company-meta">
        <span className="meta-item">
          <MapPin size={14} /> {company.location}
        </span>
        <span className="meta-item">
          <Briefcase size={14} /> {WORK_MODE_LABELS[company.workMode] || company.workMode}
        </span>
      </div>
      <p className="company-desc">{company.description}</p>

      <div className="company-card-foot">
        <CompanyStatus company={company} />
        <span className="view-link">
          View Details <ArrowRight size={15} />
        </span>
      </div>
    </Link>
  );
}
