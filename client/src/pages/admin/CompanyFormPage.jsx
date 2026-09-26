import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle, Save, FileText, Upload, Trash2 } from "lucide-react";
import api, { getErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading } from "../../components/ui/EmptyState";
import { WORK_MODE_LABELS, toDateTimeLocal } from "../../utils/format";

const EMPTY = {
  name: "",
  jobRole: "",
  package: "",
  location: "",
  workMode: "ON_SITE",
  applicationDeadline: "",
  description: "",
  jobDescription: "",
  companyWebsite: "",
  status: "OPEN",
};

const MAX_SIZE = 5 * 1024 * 1024;

// One form for both "Add Company" (/companies/new) and "Edit Company" (/companies/:id/edit).
export default function CompanyFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Job description PDF: the current one on the server, a newly picked file, or a pending removal
  const [existingJd, setExistingJd] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [removeJd, setRemoveJd] = useState(false);
  const jdInputRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/companies/${id}`)
      .then((res) => {
        const c = res.data.data.company;
        setForm({
          name: c.name,
          jobRole: c.jobRole,
          package: c.package,
          location: c.location,
          workMode: c.workMode,
          applicationDeadline: toDateTimeLocal(c.applicationDeadline),
          description: c.description,
          jobDescription: c.jobDescription || "",
          companyWebsite: c.companyWebsite || "",
          status: c.status,
        });
        setExistingJd(c.jobDescriptionFile || null);
      })
      .catch((err) => setError(getErrorMessage(err, "Company not found.")))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: "" }));
    setError("");
  }

  function pickJd(file) {
    if (!file) return;
    const isPdf = file.type === "application/pdf" && file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return setFieldErrors((e) => ({ ...e, jdFile: "Only PDF files are allowed." }));
    if (file.size > MAX_SIZE) return setFieldErrors((e) => ({ ...e, jdFile: "File must be smaller than 5 MB." }));
    setFieldErrors((e) => ({ ...e, jdFile: "" }));
    setJdFile(file);
    setRemoveJd(false);
  }

  function validate() {
    const errors = {};
    for (const field of ["name", "jobRole", "package", "location", "description", "applicationDeadline"]) {
      if (!String(form[field]).trim()) errors[field] = "This field is required.";
    }
    if (form.applicationDeadline && !isEdit && new Date(form.applicationDeadline) <= new Date()) {
      errors.applicationDeadline = "Deadline must be in the future.";
    }
    if (form.companyWebsite && !/^https?:\/\/.+/i.test(form.companyWebsite.trim())) {
      errors.companyWebsite = "Website must start with http:// or https://";
    }
    return errors;
  }

  async function submit(event) {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) return setFieldErrors(errors);

    setSaving(true);
    try {
      const payload = { ...form, applicationDeadline: new Date(form.applicationDeadline).toISOString() };
      if (!isEdit) delete payload.status; // new companies always start OPEN
      const res = isEdit ? await api.put(`/companies/${id}`, payload) : await api.post("/companies", payload);
      const companyId = res.data.data.company._id;

      // The PDF travels in a separate multipart request after the company itself is saved.
      if (jdFile) {
        const formData = new FormData();
        formData.append("file", jdFile);
        await api.post(`/companies/${companyId}/job-description`, formData);
      } else if (removeJd && existingJd) {
        await api.delete(`/companies/${companyId}/job-description`);
      }

      toast.success(res.data.message);
      navigate(`/companies/${companyId}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the company."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading text="Loading company…" />;

  const showingExisting = existingJd && !jdFile && !removeJd;

  return (
    <>
      <Link to={isEdit ? `/companies/${id}` : "/companies"} className="back-link">
        <ArrowLeft size={16} /> {isEdit ? "Back to Company" : "Back to Companies"}
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "Edit Company" : "Add Company"}</h1>
          <p className="page-subtitle">{isEdit ? "Update the placement drive details" : "Students are notified once the company is added"}</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate style={{ maxWidth: 880 }}>
        {error && (
          <div className="alert alert-error mb-6">
            <AlertCircle size={17} /> {error}
          </div>
        )}

        <section className="section" style={{ paddingTop: 0 }}>
          <h3 className="section-title mb-4">Company and role</h3>
          <div className="form-grid">
            <Field label="Company Name" error={fieldErrors.name}>
              <input className={`input ${fieldErrors.name ? "has-error" : ""}`} placeholder="e.g. Microsoft" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </Field>
            <Field label="Job Role" error={fieldErrors.jobRole}>
              <input className={`input ${fieldErrors.jobRole ? "has-error" : ""}`} placeholder="e.g. Software Development Engineer" value={form.jobRole} onChange={(e) => update("jobRole", e.target.value)} />
            </Field>
            <Field label="Package / Stipend" error={fieldErrors.package}>
              <input className={`input ${fieldErrors.package ? "has-error" : ""}`} placeholder="e.g. ₹12 LPA or ₹40,000 / month" value={form.package} onChange={(e) => update("package", e.target.value)} />
            </Field>
            <Field label="Location" error={fieldErrors.location}>
              <input className={`input ${fieldErrors.location ? "has-error" : ""}`} placeholder="e.g. Hyderabad" value={form.location} onChange={(e) => update("location", e.target.value)} />
            </Field>
            <Field label="Work Mode">
              <select className="select" value={form.workMode} onChange={(e) => update("workMode", e.target.value)}>
                {Object.entries(WORK_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Application Deadline" error={fieldErrors.applicationDeadline}>
              <input className={`input ${fieldErrors.applicationDeadline ? "has-error" : ""}`} type="datetime-local" value={form.applicationDeadline} onChange={(e) => update("applicationDeadline", e.target.value)} />
            </Field>
            {isEdit && (
              <Field label="Status" hint="Closing stops new applications. Existing applications are kept.">
                <select className="select" value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </Field>
            )}
            <Field label="Company Website" optional error={fieldErrors.companyWebsite} className={isEdit ? "" : "span-2"}>
              <input className={`input ${fieldErrors.companyWebsite ? "has-error" : ""}`} placeholder="https://careers.example.com" value={form.companyWebsite} onChange={(e) => update("companyWebsite", e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="section">
          <h3 className="section-title mb-4">Descriptions</h3>
          <div className="form-grid">
            <Field label="Company Description" error={fieldErrors.description} className="span-2" hint="Shown on the company card and details page.">
              <textarea className={`textarea ${fieldErrors.description ? "has-error" : ""}`} placeholder="Short overview of the company and the drive." value={form.description} onChange={(e) => update("description", e.target.value)} />
            </Field>
            <Field label="Job Description" optional className="span-2" hint="Responsibilities, selection process, eligibility notes. Plain text; the system does not enforce eligibility.">
              <textarea className="textarea" style={{ minHeight: 150 }} placeholder="Role details, rounds, eligibility requirements..." value={form.jobDescription} onChange={(e) => update("jobDescription", e.target.value)} />
            </Field>

            <Field label="Job Description PDF" optional className="span-2" error={fieldErrors.jdFile} hint="Attach the official JD document. Students can download it from the company page.">
              <input ref={jdInputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pickJd(e.target.files?.[0])} />
              {jdFile || showingExisting ? (
                <div className="file-chip">
                  <span className="pdf-icon">
                    <FileText size={18} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="file-name">{jdFile ? jdFile.name : existingJd.originalName}</div>
                    <div className="file-size">{jdFile ? "New file, uploaded when you save" : "Currently attached"}</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => jdInputRef.current?.click()}>
                    Replace
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--danger)" }}
                    onClick={() => {
                      setJdFile(null);
                      if (existingJd) setRemoveJd(true);
                    }}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ) : (
                <button type="button" className="dropzone" style={{ width: "100%", font: "inherit" }} onClick={() => jdInputRef.current?.click()}>
                  <div className="dropzone-icon">
                    <Upload size={20} />
                  </div>
                  <div className="dropzone-title">{removeJd ? "PDF will be removed when you save" : "Attach a PDF"}</div>
                  <div className="dropzone-hint">Click to browse · PDF only · Max 5 MB</div>
                </button>
              )}
            </Field>
          </div>
        </section>

        <div className="form-actions" style={{ borderTop: 0, paddingTop: 0 }}>
          <Link to={isEdit ? `/companies/${id}` : "/companies"} className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : <Save size={16} />}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Company"}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({ label, optional, hint, error, className = "", children }) {
  return (
    <div className={`field ${className}`}>
      <span className="label">
        {label} {optional && <span className="optional">(optional)</span>}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
