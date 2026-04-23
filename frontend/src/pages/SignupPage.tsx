import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../components/Alert";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: "student" | "admin" }>({
    name: "", email: "", password: "", role: "student",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const message = await signup(form);
      setSuccess(message || "Account created! Redirecting to login…");
      setTimeout(() => navigate("/login"), 1400);
    } catch (err: any) {
      setError(
        err.response?.data?.msg ||
        (err.message === "Network Error" ? "Backend is unreachable." : (err.message || "Something went wrong."))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎓</div>
          <h1 style={{ fontSize: "1.6rem" }}>Create your account</h1>
          <p>Join Campus Event Finder today</p>
        </div>

        {error   && <Alert type="error"   message={error} />}
        {success && <Alert type="success" message={success} />}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Full name</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" className="input" required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Email address</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="input" required autoComplete="email" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" className="input" required minLength={6} autoComplete="new-password" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>I am a…</label>
            <select name="role" value={form.role} onChange={handleChange} className="input" required>
              <option value="student">Student</option>
              <option value="admin">Admin / Organizer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-gradient full-width"
            style={{ marginTop: "4px", padding: "13px", fontSize: "1rem" }}
          >
            {loading ? "Creating account…" : "Create Account →"}
          </button>
        </form>

        <p className="auth-footnote">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-footnote" style={{ marginTop: "8px" }}>
          <Link to="/" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>← Back to home</Link>
        </p>
      </section>
    </main>
  );
}
