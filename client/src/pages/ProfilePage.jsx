import { useRef, useState } from "react";
import { Pencil, ShieldCheck, AlertCircle, Save, FileText, Upload, Download, Trash2, Plus } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { initials, ROLE_LABELS, BRANCHES, formatDate } from "../utils/format";
import { downloadSavedResume } from "../utils/download";

const MAX_RESUMES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function ProfilePage() {
  const { user, setUser, isStudent } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [addingResume, setAddingResume] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const resumes = user.resumes || [];
  const incomplete = isStudent && (!user.rollNumber || !user.branch || user.cgpa === null || user.cgpa === undefined);

  async function deleteResume() {
    setDeleting(true);
    try {
      const res = await api.delete(`/users/resumes/${deleteTarget.id}`);
      setUser(res.data.data.user);
      toast.success("Resume removed.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="profile-head">
        <div className="profile-head-main">
          <span className="avatar">{initials(user.name)}</span>
          <div>
            <h2>{user.name}</h2>
            <div className="text-muted">{user.email}</div>
            <div className="profile-tags">
              <span className={`badge ${user.role === "SUPER_ADMIN" ? "badge-purple" : "badge-accent"}`}>
                <ShieldCheck size={12} /> {ROLE_LABELS[user.role]}
              </span>
              {isStudent && user.rollNumber && <span className="badge badge-neutral">{user.rollNumber}</span>}
              {isStudent && user.branch && <span className="badge badge-neutral">{user.branch}</span>}
            </div>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
          <Pencil size={16} /> Edit Profile
        </button>
      </div>

      {incomplete && (
        <div className="alert alert-warning" style={{ marginTop: 20 }}>
          <AlertCircle size={17} />
          <span>Your profile is incomplete. Add your roll number, branch and CGPA so administrators can review your applications properly.</span>
        </div>
      )}

      <div className={isStudent ? "profile-grid" : ""}>
        <section className="section">
          <h3 className="section-title">Personal Information</h3>
          <dl className="dl mt-2">
            <dt>Full name</dt>
            <dd>{user.name}</dd>
            <dt>Official email</dt>
            <dd>{user.email}</dd>
            {isStudent && (
              <>
                <dt>Roll number</dt>
                <dd>{user.rollNumber || <span className="text-muted">Not provided</span>}</dd>
                <dt>Branch</dt>
                <dd>{user.branch || <span className="text-muted">Not provided</span>}</dd>
                <dt>CGPA</dt>
                <dd>{user.cgpa === null || user.cgpa === undefined ? <span className="text-muted">Not provided</span> : user.cgpa.toFixed(2)}</dd>
              </>
            )}
            <dt>Member since</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </dl>
        </section>

        {isStudent && (
          <section className="section">
            <div className="section-head">
              <div>
                <h3 className="section-title">Resumes</h3>
                <p className="text-muted text-sm">
                  {resumes.length} of {MAX_RESUMES} saved. Pick one of these when you apply.
                </p>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAddingResume(true)} disabled={resumes.length >= MAX_RESUMES} title={resumes.length >= MAX_RESUMES ? "Delete a resume to add another" : ""}>
                <Plus size={15} /> Add Resume
              </button>
            </div>

            {resumes.length === 0 ? (
              <div className="dropzone" onClick={() => setAddingResume(true)}>
                <div className="dropzone-icon">
                  <Upload size={20} />
                </div>
                <div className="dropzone-title">No resumes yet</div>
                <div className="dropzone-hint">Upload up to five PDFs, for example one per role type, and choose the right one while applying.</div>
              </div>
            ) : (
              <div className="resume-list">
                {resumes.map((resume) => (
                  <div key={resume.id} className="resume-row">
                    <span className="pdf-icon">
                      <FileText size={17} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="resume-label">
                        {resume.label}
                        {resume.available === false && <span className="badge badge-warning" style={{ marginLeft: 8 }}>File missing</span>}
                      </div>
                      <div className="resume-meta">
                        {resume.available === false
                          ? "Uploaded before the file storage change, so the PDF is gone. Delete it and upload again."
                          : `${resume.originalName} · ${formatSize(resume.size)} · Uploaded ${formatDate(resume.uploadedAt)}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      title={resume.available === false ? "This PDF is no longer available" : "Download"}
                      disabled={resume.available === false}
                      style={resume.available === false ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                      onClick={() => downloadSavedResume(resume).catch(() => toast.error("Could not download the resume."))}
                    >
                      <Download size={17} />
                    </button>
                    <button type="button" className="icon-btn" title="Delete" style={{ color: "var(--danger)" }} onClick={() => setDeleteTarget(resume)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {editing && (
        <EditProfileModal
          user={user}
          isStudent={isStudent}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setUser(updated);
            toast.success("Profile updated.");
            setEditing(false);
          }}
        />
      )}

      {addingResume && (
        <AddResumeModal
          onClose={() => setAddingResume(false)}
          onSaved={(updated) => {
            setUser(updated);
            toast.success("Resume saved to your profile.");
            setAddingResume(false);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget.label}"?`}
          message="This removes the resume from your profile. Applications you already submitted keep their own copy and are not affected."
          confirmText="Delete Resume"
          danger
          loading={deleting}
          onConfirm={deleteResume}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

function AddResumeModal({ onClose, onSaved }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  function pickFile(selected) {
    setError("");
    if (!selected) return;
    const isPdf = selected.type === "application/pdf" && selected.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return setError("Only PDF files are allowed.");
    if (selected.size > MAX_SIZE) return setError("Resume must be smaller than 5 MB.");
    setFile(selected);
    if (!label) setLabel(selected.name.replace(/\.pdf$/i, ""));
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) return setError("Please choose a PDF file.");
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("label", label.trim());
      const res = await api.post("/users/resumes", formData);
      onSaved(res.data.data.user);
    } catch (err) {
      setError(getErrorMessage(err, "Could not upload the resume."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Resume" subtitle="PDF only, up to 5 MB. Give it a short label so you can tell your resumes apart." onClose={onClose} locked={saving}>
      <form className="stack gap-4" onSubmit={submit}>
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={17} /> {error}
          </div>
        )}
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
        {!file ? (
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
            <div className="dropzone-title">Choose a PDF</div>
            <div className="dropzone-hint">Click to browse or drag a file here</div>
          </div>
        ) : (
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
        <div className="field">
          <label className="label" htmlFor="resume-label">
            Label
          </label>
          <input id="resume-label" className="input" placeholder="e.g. Software roles, Data science, Core ECE" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
        </div>
        <div className="modal-footer" style={{ padding: "4px 0 0" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !file}>
            {saving ? <span className="spinner" /> : <Upload size={16} />}
            {saving ? "Uploading…" : "Save Resume"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditProfileModal({ user, isStudent, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || "",
    rollNumber: user.rollNumber || "",
    branch: user.branch || "",
    cgpa: user.cgpa ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return setError("Name cannot be empty.");
    if (isStudent && form.cgpa !== "" && (Number(form.cgpa) < 0 || Number(form.cgpa) > 10 || Number.isNaN(Number(form.cgpa)))) {
      return setError("CGPA must be a number between 0 and 10.");
    }
    setSaving(true);
    try {
      const payload = isStudent ? form : { name: form.name };
      const res = await api.put("/users/profile", payload);
      onSaved(res.data.data.user);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update your profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit Profile" subtitle="Your email and role are managed by the placement cell." onClose={onClose} locked={saving}>
      <form className="stack gap-4" onSubmit={submit}>
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={17} /> {error}
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="p-name">
            Full Name
          </label>
          <input id="p-name" className="input" value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        {isStudent && (
          <>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="p-roll">
                  Roll Number
                </label>
                <input id="p-roll" className="input" placeholder="e.g. S20220010101" value={form.rollNumber} onChange={(e) => update("rollNumber", e.target.value.toUpperCase())} />
              </div>
              <div className="field">
                <label className="label" htmlFor="p-cgpa">
                  CGPA
                </label>
                <input id="p-cgpa" className="input" type="number" step="0.01" min="0" max="10" placeholder="e.g. 8.6" value={form.cgpa} onChange={(e) => update("cgpa", e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="p-branch">
                Branch
              </label>
              <select id="p-branch" className="select" value={form.branch} onChange={(e) => update("branch", e.target.value)}>
                <option value="">Select branch</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="modal-footer" style={{ padding: "4px 0 0" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : <Save size={16} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
