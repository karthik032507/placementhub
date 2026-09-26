import { useEffect, useState } from "react";
import { ShieldCheck, UserPlus, UserX, AlertCircle, Mail, Lock, UserRound, Eye, EyeOff } from "lucide-react";
import api, { getErrorMessage } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState, { PageLoading } from "../../components/ui/EmptyState";
import { formatDate, initials, ROLE_LABELS, isCollegeEmail } from "../../utils/format";

// Super Admin only: list, create and deactivate ADMIN / SUPER_ADMIN accounts.
export default function AdministratorsPage() {
  const { user: me } = useAuth();
  const toast = useToast();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    api
      .get("/admin/users")
      .then((res) => setAdmins(res.data.data.administrators))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function deactivate() {
    setDeactivating(true);
    try {
      const res = await api.patch(`/admin/users/${deactivateTarget.id}/deactivate`);
      setAdmins((list) => list.map((a) => (a.id === deactivateTarget.id ? res.data.data.user : a)));
      toast.success(res.data.message);
      setDeactivateTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeactivating(false);
    }
  }

  const activeSuperAdmins = admins.filter((a) => a.role === "SUPER_ADMIN" && a.isActive).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Administrators</h1>
          <p className="page-subtitle">Manage Admin and Super Admin accounts</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <UserPlus size={17} /> Add Administrator
          </button>
        </div>
      </div>

      {!loading && admins.length > 0 && (
        <div className="summary-line">
          <span><strong>{admins.filter((a) => a.isActive).length}</strong> active administrators</span>
          <span><strong>{activeSuperAdmins}</strong> active super admins</span>
          <span><strong>{admins.filter((a) => !a.isActive).length}</strong> deactivated</span>
        </div>
      )}

      <div className="card">
        {loading && <PageLoading text="Loading administrators…" />}
        {error && <div className="alert alert-error" style={{ margin: 20 }}>{error}</div>}
        {!loading && !error && admins.length === 0 && <EmptyState icon={ShieldCheck} title="No administrators" />}

        {!loading && admins.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const isMe = admin.id === me.id;
                  const isLastSuperAdmin = admin.role === "SUPER_ADMIN" && admin.isActive && activeSuperAdmins <= 1;
                  const cannotDeactivate = isMe || isLastSuperAdmin || !admin.isActive;
                  const reason = isMe ? "You cannot deactivate your own account" : isLastSuperAdmin ? "The last active Super Admin cannot be deactivated" : "";
                  return (
                    <tr key={admin.id} style={{ opacity: admin.isActive ? 1 : 0.6 }}>
                      <td>
                        <div className="person-cell">
                          <span className="avatar">{initials(admin.name)}</span>
                          <span style={{ minWidth: 0 }}>
                            <div className="cell-primary">
                              {admin.name} {isMe && <span className="text-muted fw-600 text-sm">(you)</span>}
                            </div>
                            <div className="sub">{admin.email}</div>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${admin.role === "SUPER_ADMIN" ? "badge-purple" : "badge-accent"}`}>{ROLE_LABELS[admin.role]}</span>
                      </td>
                      <td>
                        <span className={`badge ${admin.isActive ? "badge-success" : "badge-neutral"}`}>{admin.isActive ? "Active" : "Deactivated"}</span>
                      </td>
                      <td className="cell-muted">{formatDate(admin.createdAt)}</td>
                      <td>
                        <div className="actions-cell">
                          {admin.isActive ? (
                            <button type="button" className="btn btn-danger btn-sm" disabled={cannotDeactivate} title={reason} onClick={() => setDeactivateTarget(admin)}>
                              <UserX size={14} /> Deactivate
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

      {showCreate && (
        <CreateAdminModal
          onClose={() => setShowCreate(false)}
          onCreated={(created, message) => {
            setAdmins((list) => [created, ...list]);
            toast.success(message);
            setShowCreate(false);
          }}
        />
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title={`Deactivate ${deactivateTarget.name}?`}
          message={`${deactivateTarget.name} will no longer be able to log in. Companies they created and their history remain intact. Reactivation requires a database change.`}
          confirmText="Deactivate"
          danger
          loading={deactivating}
          onConfirm={deactivate}
          onClose={() => setDeactivateTarget(null)}
        />
      )}
    </>
  );
}

function CreateAdminModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ADMIN" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: "" }));
    setError("");
  }

  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!isCollegeEmail(form.email)) errors.email = "Use an @iiits.in email address.";
    if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
    return errors;
  }

  async function submit(event) {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) return setFieldErrors(errors);
    setSaving(true);
    try {
      const res = await api.post("/admin/users", { ...form, name: form.name.trim(), email: form.email.trim() });
      onCreated(res.data.data.user, res.data.message);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create the account."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Administrator" subtitle="Share the password with the new administrator securely." onClose={onClose} locked={saving}>
      <form className="stack gap-4" onSubmit={submit} noValidate>
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={17} /> {error}
          </div>
        )}

        <div className="field">
          <span className="label">Role</span>
          <div className="segmented">
            <button type="button" className={form.role === "ADMIN" ? "is-active" : ""} onClick={() => update("role", "ADMIN")}>
              Admin
            </button>
            <button type="button" className={form.role === "SUPER_ADMIN" ? "is-active" : ""} onClick={() => update("role", "SUPER_ADMIN")}>
              Super Admin
            </button>
          </div>
          <span className="field-hint">{form.role === "SUPER_ADMIN" ? "Super Admins can also manage administrator accounts." : "Admins manage companies, applicants and notifications."}</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="a-name">
            Full Name
          </label>
          <div className="input-icon-wrap">
            <UserRound size={17} />
            <input id="a-name" className={`input ${fieldErrors.name ? "has-error" : ""}`} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Placement Coordinator" />
          </div>
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="a-email">
            Email
          </label>
          <div className="input-icon-wrap">
            <Mail size={17} />
            <input id="a-email" className={`input ${fieldErrors.email ? "has-error" : ""}`} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@iiits.in" />
          </div>
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="a-password">
            Temporary Password
          </label>
          <div className="input-icon-wrap has-trailing">
            <Lock size={17} />
            <input id="a-password" className={`input ${fieldErrors.password ? "has-error" : ""}`} type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
            <button type="button" className="input-trailing-btn" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </div>

        <div className="modal-footer" style={{ padding: "4px 0 0" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : <UserPlus size={16} />}
            {saving ? "Creating…" : "Create Account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
