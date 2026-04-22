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
      const res = await axios.get("http://localhost:5000/api/events");
      setEvents(res.data);
      console.log(res.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Could not load events." });
    }
  }, []);

  const loadRegistrations = useCallback(async () => {
    try {
      const data = await getMyRegistrations();
      setRegistrations(data);
    } catch {
      setFeedback({ type: "error", message: "Could not load registrations." });
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
    void loadRegistrations();

    const intervalId = window.setInterval(() => {
      void fetchEvents();
    }, 5000);

    const onStorageUpdate = (event: StorageEvent) => {
      if (event.key === "events_last_updated") {
        void fetchEvents();
      }
    };
    window.addEventListener("storage", onStorageUpdate);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", onStorageUpdate);
    };
  }, [fetchEvents, loadRegistrations]);

  const registeredEventIds = useMemo(() => {
    return new Set(
      registrations
        .map((registration) =>
          typeof registration.eventId === "string" ? registration.eventId : registration.eventId._id,
        )
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
                    <span>{event.date}</span>
                    <span>{event.location}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(event._id)}
                    disabled={registeredEventIds.has(event._id)}
                    className="btn btn-gradient"
                  >
                    {registeredEventIds.has(event._id) ? "Registered" : "Register"}
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
