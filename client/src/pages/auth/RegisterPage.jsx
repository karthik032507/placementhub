import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle, Eye, EyeOff, Mail, Lock, UserRound } from "lucide-react";
import AuthShell from "./AuthShell";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/axios";
import { isCollegeEmail } from "../../utils/format";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((errs) => ({ ...errs, [field]: "" }));
    setError("");
  }

  // Inline validation mirrors the backend rules for a better experience.
  // The backend still enforces every rule independently.
  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = "Please enter your full name.";
    if (!form.email.trim()) errors.email = "Please enter your college email.";
    else if (!isCollegeEmail(form.email)) errors.email = "Please use your IIITS college email ending with @iiits.in";
    if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match.";
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, confirmPassword: form.confirmPassword });
      navigate("/companies", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create your account. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  const emailLooksWrong = form.email.includes("@") && !isCollegeEmail(form.email);

  return (
    <AuthShell>
      <h1 className="auth-title">Create Account</h1>
      <p className="auth-subtitle">Create your student account</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={17} /> {error}
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="name">
            Full Name
          </label>
          <div className="input-icon-wrap">
            <UserRound size={17} />
            <input id="name" className={`input ${fieldErrors.name ? "has-error" : ""}`} placeholder="Your full name" autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="email">
            College Email
          </label>
          <div className="input-icon-wrap">
            <Mail size={17} />
            <input id="email" className={`input ${fieldErrors.email || emailLooksWrong ? "has-error" : ""}`} type="email" placeholder="yourname@iiits.in" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          {fieldErrors.email ? (
            <span className="field-error">{fieldErrors.email}</span>
          ) : emailLooksWrong ? (
            <span className="field-error">Please use your IIITS college email ending with @iiits.in</span>
          ) : (
            <span className="field-hint">Only @iiits.in email addresses can register.</span>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <div className="input-icon-wrap has-trailing">
            <Lock size={17} />
            <input id="password" className={`input ${fieldErrors.password ? "has-error" : ""}`} type={showPassword ? "text" : "password"} placeholder="At least 8 characters" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} />
            <button type="button" className="input-trailing-btn" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <div className="input-icon-wrap">
            <Lock size={17} />
            <input id="confirmPassword" className={`input ${fieldErrors.confirmPassword ? "has-error" : ""}`} type={showPassword ? "text" : "password"} placeholder="Re-enter your password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
          </div>
          {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
          {submitting ? <span className="spinner" /> : null}
          {submitting ? "Creating account…" : "Create Account"}
          {!submitting && <ArrowRight size={18} />}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </AuthShell>
  );
}
