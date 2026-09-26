import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff, Mail, Lock } from "lucide-react";
import AuthShell from "./AuthShell";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/axios";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginAs, setLoginAs] = useState("STUDENT"); // "STUDENT" | "ADMIN" (Super Admin also uses ADMIN)
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password, loginAs });
      navigate(location.state?.from || "/companies", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to sign in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="auth-title">Welcome Back</h1>
      <p className="auth-subtitle">Sign in to access your account</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <span className="label">Login as</span>
          <div className="segmented" role="tablist">
            <button type="button" className={loginAs === "STUDENT" ? "is-active" : ""} onClick={() => setLoginAs("STUDENT")}>
              <GraduationCap size={17} /> Student
            </button>
            <button type="button" className={loginAs === "ADMIN" ? "is-active" : ""} onClick={() => setLoginAs("ADMIN")}>
              <ShieldCheck size={17} /> Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={17} /> {error}
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="email">
            Email Address
          </label>
          <div className="input-icon-wrap">
            <Mail size={17} />
            <input id="email" className="input" type="email" autoComplete="email" placeholder="you@iiits.in" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <div className="input-icon-wrap has-trailing">
            <Lock size={17} />
            <input id="password" className="input" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={(e) => update("password", e.target.value)} />
            <button type="button" className="input-trailing-btn" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
          {submitting ? <span className="spinner" /> : null}
          {submitting ? "Signing in…" : "Sign In"}
          {!submitting && <ArrowRight size={18} />}
        </button>
      </form>

      {loginAs === "STUDENT" ? (
        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/register">Create Account</Link>
        </p>
      ) : (
        <p className="auth-switch">Administrator accounts are created by the placement cell.</p>
      )}
    </AuthShell>
  );
}
