import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../components/Alert";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<{name: string, email: string, password: string, role: "student" | "admin"}>({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const message = await signup(form);
      setSuccess(message || "Registered successfully. Please login.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      if (err.response?.data?.msg) {
        setError(err.response.data.msg);
      } else {
        setError(err.message === "Network Error" ? "Network Error: Backend is unreachable." : (err.message || "An unknown error occurred."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Create Account</h1>
        <p>Start exploring campus events.</p>
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Full name"
            className="input"
            required
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="input"
            required
          />
          <div className="flex flex-col space-y-1">
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="input"
              required
              minLength={6}
            />
          </div>
          <select
            name="role"
            value={form.role}
            onChange={handleChange as any}
            className="input"
            required
          >
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={loading} className="btn btn-gradient full-width">
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>
        <p className="auth-footnote">
          Already have an account?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
