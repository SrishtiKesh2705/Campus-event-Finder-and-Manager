import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import Alert from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { createEvent, deleteEvent, getEvents, updateEvent } from "../services/eventService";
import { getEventRegistrations } from "../services/registrationService";
import type { EventItem } from "../types";

const defaultForm = {
  title: "",
  description: "",
  type: "other" as EventItem["type"],
  date: "",
  time: "",
  registrationDeadline: "",
  location: "",
};

export default function AdminDashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [viewRegistrationsEvent, setViewRegistrationsEvent] = useState<EventItem | null>(null);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
      const counts = await Promise.all(
        data.map(async (event) => {
          try {
            const registrations = await getEventRegistrations(event._id);
            return [event._id, registrations.length] as const;
          } catch {
            return [event._id, 0] as const;
          }
        }),
      );
      setRegistrationCounts(Object.fromEntries(counts));
    } catch {
      setFeedback({ type: "error", message: "Unable to fetch events." });
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const eventDate = new Date(form.date);
    const deadlineDate = new Date(form.registrationDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    if (eventDate < today) {
      alert("❌ Event date cannot be in the past");
      return;
    }

    if (deadlineDate < today) {
      alert("❌ Registration deadline cannot be in the past");
      return;
    }

    if (deadlineDate > eventDate) {
      alert("❌ Registration deadline cannot be after event date");
      return;
    }

    try {
      if (editingId) {
        await updateEvent(editingId, form);
        setFeedback({ type: "success", message: "Event updated successfully." });
      } else {
        await createEvent(form);
        setFeedback({ type: "success", message: "Event created successfully." });
        localStorage.setItem("events_last_updated", String(Date.now()));
      }
      clearForm();
      await loadEvents();
    } catch {
      setFeedback({ type: "error", message: "Failed to save event." });
    }
  };

  const handleEdit = (event: EventItem) => {
    setEditingId(event._id);
    setForm({
      title: event.title,
      description: event.description,
      type: event.type,
      date: event.date.slice(0, 10),
      time: event.time,
      registrationDeadline: event.registrationDeadline.slice(0, 16),
      location: event.location,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteEvent(id);
      setFeedback({ type: "success", message: "Event deleted." });
      await loadEvents();
    } catch {
      setFeedback({ type: "error", message: "Delete failed." });
    }
  };

  const handleViewRegistrations = async (event: EventItem) => {
    try {
      const data = await getEventRegistrations(event._id);
      setEventRegistrations(data);
      setViewRegistrationsEvent(event);
    } catch {
      setFeedback({ type: "error", message: "Failed to load registrations." });
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
          { label: "Manage Events", href: "#manage-events" },
          { label: "Create Event", href: "#create-event" },
          { label: "Logout", onClick: handleLogout },
        ]}
      />

      <section className="dashboard-banner app-container">
        <img
          src="https://images.unsplash.com/photo-1552664730-d307ca884978"
          alt="Team planning event"
        />
        <div className="dashboard-banner-overlay">
          <h1>Admin Dashboard</h1>
          <p>Create, edit, and manage campus events</p>
        </div>
      </section>

      <main className="app-container dashboard-content">
        {feedback && <Alert type={feedback.type} message={feedback.message} />}

        <section id="create-event" className="dashboard-section form-section">
          <h3>{editingId ? "Update Event" : "Create Event"}</h3>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="title" style={{ fontWeight: 600, color: "#334155" }}>Event Title</label>
              <input id="title" name="title" value={form.title} onChange={handleChange} placeholder="Enter event title" required />
            </div>
            
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="description" style={{ fontWeight: 600, color: "#334155" }}>Event Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter event description"
                required
              />
            </div>
            
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="type" style={{ fontWeight: 600, color: "#334155" }}>Category</label>
              <select id="type" name="type" value={form.type} onChange={handleChange}>
                <option value="hackathon">Hackathon</option>
                <option value="tech">Tech</option>
                <option value="seminar">Seminar</option>
                <option value="games">Games</option>
                <option value="movie">Movie</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="location" style={{ fontWeight: 600, color: "#334155" }}>Location</label>
              <input id="location" name="location" value={form.location} onChange={handleChange} placeholder="Enter location" required />
            </div>
            
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="date" style={{ fontWeight: 600, color: "#334155" }}>Event Date</label>
              <input id="date" type="date" name="date" value={form.date} onChange={handleChange} min={new Date().toISOString().split("T")[0]} required />
            </div>
            
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="time" style={{ fontWeight: 600, color: "#334155" }}>Event Time</label>
              <input id="time" type="time" name="time" value={form.time} onChange={handleChange} required />
            </div>
            
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="registrationDeadline" style={{ fontWeight: 600, color: "#334155" }}>Registration Deadline</label>
              <input
                id="registrationDeadline"
                type="datetime-local"
                name="registrationDeadline"
                value={form.registrationDeadline}
                onChange={handleChange}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
            
            <div className="button-row" style={{ marginTop: "10px" }}>
              <button type="submit" className="btn btn-create">
                {editingId ? "Update Event" : "Create Event"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={clearForm}>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section id="manage-events" className="dashboard-section">
          <h3>Manage Events</h3>
          <div className="event-grid">
            {events.map((event) => (
              <article
                key={event._id}
                className={`event-card ${new Date(event.registrationDeadline) > new Date() ? "upcoming" : ""}`}
              >
                <img
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644"
                  alt="Campus management"
                />
                <div className="event-card-body">
                  <h4>{event.title}</h4>
                  <p>{event.description}</p>
                  <div className="event-meta">
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                    <span>{event.location}</span>
                  </div>
                  <div className="event-meta">
                    <span>Registrations: {registrationCounts[event._id] ?? 0}</span>
                    <span>
                      Status: {new Date(event.registrationDeadline) > new Date() ? "Upcoming" : "Closed"}
                    </span>
                  </div>
                  <div className="button-row">
                    <button type="button" className="btn btn-secondary full-width" onClick={() => handleViewRegistrations(event)}>
                      View Registrations
                    </button>
                    <button type="button" className="btn btn-edit" onClick={() => handleEdit(event)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-delete" onClick={() => handleDelete(event._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {viewRegistrationsEvent && (
        <div className="modal-backdrop" onClick={() => setViewRegistrationsEvent(null)}>
          <div className="modal-card" style={{ maxWidth: "700px" }} onClick={(e) => e.stopPropagation()}>
            <h3>Registrations for {viewRegistrationsEvent.title}</h3>
            <p className="muted" style={{ fontWeight: 500, marginBottom: "16px" }}>Total Registrations: {eventRegistrations.length}</p>
            {eventRegistrations.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "8px" }}>
                No students registered yet
              </div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "500px" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 10px", color: "#334155" }}>Name</th>
                      <th style={{ padding: "12px 10px", color: "#334155" }}>College ID</th>
                      <th style={{ padding: "12px 10px", color: "#334155" }}>College Name</th>
                      <th style={{ padding: "12px 10px", color: "#334155" }}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRegistrations.map((reg, idx) => (
                      <tr key={reg._id || idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#f8fafc" : "#fff", transition: "background 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")} onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#f8fafc" : "#fff")}>
                        <td style={{ padding: "12px 10px", color: "#475569" }}>{reg.name || "N/A"}</td>
                        <td style={{ padding: "12px 10px", color: "#475569" }}>{reg.collegeId || "N/A"}</td>
                        <td style={{ padding: "12px 10px", color: "#475569" }}>{reg.collegeName || "N/A"}</td>
                        <td style={{ padding: "12px 10px", color: "#475569" }}>{reg.email || reg.userId?.email || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="button-row" style={{ marginTop: "24px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewRegistrationsEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
