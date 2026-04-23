import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import Alert from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { getMyRegistrations, registerForEvent } from "../services/registrationService";
import axios from "axios";
import type { EventItem, RegistrationItem } from "../types";

export default function UserDashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState({ name: "", collegeId: "", collegeName: "", email: "" });

  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/events");
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("[UserDashboard] fetchEvents failed:", err);
      setFeedback({ type: "error", message: "Could not load events." });
    }
  }, []);

  const loadRegistrations = useCallback(async () => {
    try {
      const data = await getMyRegistrations();
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[UserDashboard] loadRegistrations failed:", err);
      // Don't show error — user may not have any registrations yet
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
    void loadRegistrations();

    const onStorageUpdate = (event: StorageEvent) => {
      if (event.key === "events_last_updated") {
        void fetchEvents();
      }
    };
    window.addEventListener("storage", onStorageUpdate);

    return () => {
      window.removeEventListener("storage", onStorageUpdate);
    };
  }, [fetchEvents, loadRegistrations]);

  const registeredEventIds = useMemo(() => {
  return new Set(
    registrations
      .map((registration) => {
        if (!registration.eventId) return null;

        return typeof registration.eventId === "string"
          ? registration.eventId
          : registration.eventId?._id;
      })
      .filter(Boolean),
  );
}, [registrations]);

  const handleRegister = async (eventId: string) => {
    if (!registerForm.name || !registerForm.collegeId || !registerForm.collegeName || !registerForm.email) {
      setFeedback({ type: "error", message: "Please fill all registration details." });
      return;
    }
    try {
      const response = await registerForEvent(eventId, registerForm);
      setFeedback({ type: "success", message: response.msg });
      await loadRegistrations();
      setSelectedEventId(null);
      setRegisterForm({ name: "", collegeId: "", collegeName: "", email: "" });
    } catch {
      setFeedback({ type: "error", message: "Registration failed. You may already be registered." });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-page">
      <AppNavbar
        links={[
          { label: "Events", href: "#events" },
          { label: "My Registrations", href: "#registrations" },
          { label: "Logout", onClick: handleLogout },
        ]}
      />

      <section className="dashboard-banner app-container">
        <img
          src="https://images.unsplash.com/photo-1511578314322-379afb476865"
          alt="Students at a campus event"
        />
        <div className="dashboard-banner-overlay">
          <h1>User Dashboard</h1>
          <p>Explore and register for events</p>
        </div>
      </section>

      <main className="app-container dashboard-content">
        {feedback && <Alert type={feedback.type} message={feedback.message} />}

        <section id="events" className="dashboard-section">
          <h3>Events</h3>
          <div className="event-grid">
            {events.map((event) => (
              <article key={event._id} className="event-card">
                <img
                  src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b"
                  alt="Campus event"
                />
                <div className="event-card-body">
                  <h4>{event.title}</h4>
                  <p>{event.description}</p>
                  <div className="event-meta">
                    <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                    <span>📍 {event.location}</span>
                  </div>
                  {/* capacity indicator */}
                  {event.maxRegistrations != null && (
                    <div style={{ marginTop: 2 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", marginBottom: 3 }}>
                        <span>{event.registrationCount ?? 0} registered so far</span>
                        <span>max {event.maxRegistrations}</span>
                      </div>
                      <div style={{ height: 5, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          width: `${Math.min(100, Math.round(((event.registrationCount ?? 0) / event.maxRegistrations) * 100))}%`,
                          background: (event.registrationCount ?? 0) >= event.maxRegistrations ? "#FB8500" : "#219EBC",
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(event._id)}
                    disabled={registeredEventIds.has(event._id) || (event.maxRegistrations != null && (event.registrationCount ?? 0) >= event.maxRegistrations)}
                    className="btn btn-gradient"
                  >
                    {registeredEventIds.has(event._id)
                      ? "✓ Registered"
                      : (event.maxRegistrations != null && (event.registrationCount ?? 0) >= event.maxRegistrations)
                        ? "Event Full"
                        : "Register"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="registrations" className="dashboard-section">
          <h3>My Registrations</h3>
          <div className="simple-card-list">
            {registrations.length === 0 ? (
              <p className="muted">No registrations yet.</p>
            ) : (
              registrations.map((registration) => {
                const event = registration.eventId as EventItem;
                return (
                  <div key={registration._id} className="simple-card">
                    <h4>{event?.title ?? "Event Removed"}</h4>
                    <p>{event?.location ?? "-"}</p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {selectedEventId && (
        <div className="modal-backdrop" onClick={() => setSelectedEventId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Register for Event</h3>
            <div className="admin-form">
              <input
                value={registerForm.name}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
              />
              <input
                value={registerForm.collegeId}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, collegeId: e.target.value }))}
                placeholder="College ID"
              />
              <input
                value={registerForm.collegeName}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, collegeName: e.target.value }))}
                placeholder="College Name"
              />
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="College Email"
              />
              <div className="button-row">
                <button type="button" className="btn btn-gradient" onClick={() => void handleRegister(selectedEventId)}>
                  Submit Registration
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedEventId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
