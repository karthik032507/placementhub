import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Upload, CheckCircle2, AlertCircle, Lock, ArrowRight, Eye, EyeOff, Plus } from "lucide-react";
import Modal from "../../components/ui/Modal";
import api, { getErrorMessage } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/format";

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_RESUMES = 5;

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

// Three steps: 1) pick a saved resume or upload one  2) confirm with password  3) success
export default function ApplyModal({ company, onClose, onApplied }) {
  const { user, setUser } = useAuth();
  // A resume uploaded before PDFs moved into the database has no file to send.
  const savedResumes = (user.resumes || []).filter((r) => r.available !== false);

  const [step, setStep] = useState(1);
  // "saved:<id>" or "new"
  const [choice, setChoice] = useState(savedResumes.length > 0 ? `saved:${savedResumes[0].id}` : "new");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const usingNewFile = choice === "new";
  const selectedSaved = usingNewFile ? null : savedResumes.find((r) => `saved:${r.id}` === choice);
  const canContinue = usingNewFile ? Boolean(file) : Boolean(selectedSaved);
  const profileFull = savedResumes.length >= MAX_RESUMES;

  function pickFile(selected) {
    setFileError("");
    if (!selected) return;
    const isPdf = selected.type === "application/pdf" && selected.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return setFileError("Only PDF files are allowed.");
    if (selected.size > MAX_SIZE) return setFileError("Resume must be smaller than 5 MB.");
    setFile(selected);
    setChoice("new");
  }

  async function submit(event) {
    event.preventDefault();
    if (!password) return setError("Please enter your password to confirm.");
    setSubmitting(true);
    setError("");
    try {
      // multipart/form-data: the backend accepts either resumeId (saved) or a resume file.
      const formData = new FormData();
      formData.append("companyId", company._id);
      formData.append("password", password);
      if (usingNewFile) {
        formData.append("resume", file);
        formData.append("saveToProfile", profileFull ? "false" : "true");
      } else {
        formData.append("resumeId", selectedSaved.id);
      }
      const res = await api.post("/applications", formData);
      setPassword(""); // never keep the password around longer than needed
      if (res.data.data.savedToProfile) {
        // Refresh the profile so the new resume shows up in the list next time
        api.get("/auth/me").then((me) => setUser(me.data.data.user)).catch(() => {});
      }
      setStep(3);
      onApplied(res.data.data.application);
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit your application."));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 3) {
    return (
      <Modal onClose={onClose}>
        <div className="success-screen">
          <div className="success-ring">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="modal-title">Application Submitted</h3>
          <p className="text-2 mt-2" style={{ maxWidth: 380, margin: "8px auto 0" }}>
            Your application to <strong>{company.name}</strong> for <strong>{company.jobRole}</strong> has been received. You will be notified when its status changes.
          </p>
          <div className="row gap-3 mt-6" style={{ justifyContent: "center" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <Link to="/my-applications" className="btn btn-primary">
              View My Applications <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </Modal>
    );
  }

  const resumeSummary = usingNewFile ? file?.name : `${selectedSaved?.label} (${selectedSaved?.originalName})`;

  return (
    <Modal title={`Apply to ${company.name}`} subtitle={company.jobRole} onClose={onClose} locked={submitting}>
      <div className="steps">
        <div className={`step ${step === 1 ? "is-active" : "is-done"}`}>
          <span className="num">{step > 1 ? "✓" : "1"}</span> Resume
        </div>
        <div className="step-line" />
        <div className={`step ${step === 2 ? "is-active" : ""}`}>
          <span className="num">2</span> Confirm
        </div>
      </div>

      {step === 1 && (
        <div className="stack gap-4">
          <div className="form-grid">
            <div className="field">
              <span className="label">Name</span>
              <input className="input" value={user.name} readOnly />
            </div>
            <div className="field">
              <span className="label">Email</span>
              <input className="input" value={user.email} readOnly />
            </div>
          </div>

          <div className="field">
            <span className="label">Resume</span>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pickFile(e.target.files?.[0])} />

            {savedResumes.length > 0 && (
              <div className="stack gap-2">
                {savedResumes.map((resume) => {
                  const selected = choice === `saved:${resume.id}`;
                  return (
                    <button type="button" key={resume.id} className={`resume-option ${selected ? "is-selected" : ""}`} onClick={() => setChoice(`saved:${resume.id}`)}>
                      <span className="radio" />
                      <span className="pdf-icon">
                        <FileText size={17} />
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <div className="resume-label">{resume.label}</div>
                        <div className="resume-meta">
                          {resume.originalName} · {formatSize(resume.size)} · {formatDate(resume.uploadedAt)}
                        </div>
                      </span>
                    </button>
                  );
                })}

                <button type="button" className={`resume-option ${usingNewFile ? "is-selected" : ""}`} onClick={() => (file ? setChoice("new") : inputRef.current?.click())}>
                  <span className="radio" />
                  <span className="pdf-icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <Plus size={17} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <div className="resume-label">{file ? file.name : "Upload a new resume"}</div>
                    <div className="resume-meta">{file ? `${formatSize(file.size)} · click to change` : profileFull ? "PDF, max 5 MB. Your profile already holds 5 resumes, so this one is used for this application only." : "PDF, max 5 MB. It will also be saved to your profile."}</div>
                  </span>
                  {file && usingNewFile && (
                    <span className="link-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                      Change
                    </span>
                  )}
                </button>
              </div>
            )}

            {savedResumes.length === 0 && !file && (
              <div
                className={`dropzone ${dragging ? "is-drag" : ""}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
              >
                <div className="dropzone-icon">
                  <Upload size={20} />
                </div>
                <div className="dropzone-title">Upload Resume</div>
                <div className="dropzone-hint">Click to browse or drag a PDF here · Max 5 MB · Also saved to your profile</div>
              </div>
            )}

            {savedResumes.length === 0 && file && (
              <div className="file-chip">
                <span className="pdf-icon">
                  <FileText size={18} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{formatSize(file.size)}</div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>
                  Change
                </button>
              </div>
            )}

            {fileError && (
              <span className="field-error row gap-2">
                <AlertCircle size={14} /> {fileError}
              </span>
            )}
            <span className="field-hint">The chosen resume is attached to this application only. You can use a different one for other companies.</span>
          </div>

          <div className="modal-footer" style={{ padding: "4px 0 0" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={() => setStep(2)}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form className="stack gap-4" onSubmit={submit}>
          <div className="summary-box">
            <div className="summary-row">
              <span className="k">Company</span>
              <span className="v">{company.name}</span>
            </div>
            <div className="summary-row">
              <span className="k">Role</span>
              <span className="v">{company.jobRole}</span>
            </div>
            <div className="summary-row">
              <span className="k">Applicant</span>
              <span className="v">{user.name}</span>
            </div>
            <div className="summary-row">
              <span className="k">Resume</span>
              <span className="v row gap-2" style={{ justifyContent: "flex-end" }}>
                <FileText size={14} /> {resumeSummary}
              </span>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={17} /> {error}
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="confirm-password">
              Confirm your password
            </label>
            <div className="input-icon-wrap has-trailing">
              <Lock size={17} />
              <input id="confirm-password" className="input" type={showPassword ? "text" : "password"} placeholder="Enter your account password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              <button type="button" className="input-trailing-btn" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <span className="field-hint">Applications cannot be edited after submission. You can withdraw while the status is still Applied.</span>
          </div>

          <div className="modal-footer" style={{ padding: "4px 0 0" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} disabled={submitting}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !password}>
              {submitting && <span className="spinner" />}
              {submitting ? "Submitting…" : "Submit Application"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
