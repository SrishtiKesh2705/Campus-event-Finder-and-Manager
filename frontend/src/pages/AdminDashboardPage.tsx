import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { createEvent, deleteEvent, getEvents, updateEvent } from "../services/eventService";
import { getEventRegistrations } from "../services/registrationService";
import type { EventItem } from "../types";

// ── palette ──────────────────────────────────────────────────────────────────
const C = {
  dark:   "#023047",
  cyan:   "#219EBC",
  light:  "#8ECAE6",
  yellow: "#FFB703",
  orange: "#FB8500",
  bg:     "#f0f7fb",
};

// ── default form ─────────────────────────────────────────────────────────────
const defaultForm = {
  title: "", description: "",
  type: "other" as EventItem["type"],
  date: "", time: "", registrationDeadline: "", location: "",
  maxRegistrations: 100,
};

// ── small reusable stat card ──────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent: string }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "20px 24px",
      boxShadow: "0 2px 12px rgba(2,48,71,0.08)", borderLeft: `4px solid ${accent}`,
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{ fontSize: "1.8rem" }}>{icon}</div>
      <div>
        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: C.dark, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

// ── capacity progress bar ─────────────────────────────────────────────────────
function CapacityBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
  const color = pct >= 90 ? C.orange : pct >= 60 ? C.yellow : C.cyan;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>
        <span>{count} / {max} registered</span>
        <span style={{ color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ── form field wrapper ────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: `1.5px solid #cde8f5`, borderRadius: 9, padding: "10px 12px",
  fontSize: "0.92rem", outline: "none", width: "100%",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

// ── main component ────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]   = useState<"overview" | "create" | "events">("overview");
  const [events, setEvents]         = useState<EventItem[]>([]);
  const [regCounts, setRegCounts]   = useState<Record<string, number>>({});
  const [form, setForm]             = useState(defaultForm);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [feedback, setFeedback]     = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [viewEvent, setViewEvent]   = useState<EventItem | null>(null);
  const [viewRegs, setViewRegs]     = useState<any[]>([]);

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
      const counts = await Promise.all(
        data.map(async (ev) => {
          try { return [ev._id, (await getEventRegistrations(ev._id)).length] as const; }
          catch { return [ev._id, 0] as const; }
        })
      );
      setRegCounts(Object.fromEntries(counts));
    } catch { setFeedback({ type: "error", message: "Unable to fetch events." }); }
  };

  useEffect(() => { void loadEvents(); }, []);

  const myEvents     = events.filter(e => e.createdBy === user?.id);
  const totalRegs    = myEvents.reduce((s, e) => s + (regCounts[e._id] ?? 0), 0);
  const activeEvents = myEvents.filter(e => new Date(e.registrationDeadline) > new Date()).length;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.name === "maxRegistrations" ? Number(e.target.value) : e.target.value }));

  const clearForm = () => { setForm(defaultForm); setEditingId(null); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ed = new Date(form.date), dd = new Date(form.registrationDeadline), today = new Date();
    today.setHours(0,0,0,0); ed.setHours(0,0,0,0); dd.setHours(0,0,0,0);
    if (ed < today)  { alert("❌ Event date cannot be in the past"); return; }
    if (dd < today)  { alert("❌ Registration deadline cannot be in the past"); return; }
    if (dd > ed)     { alert("❌ Registration deadline cannot be after event date"); return; }
    if (form.maxRegistrations < 1) { alert("❌ Max registrations must be at least 1"); return; }
    try {
      if (editingId) {
        await updateEvent(editingId, form);
        setFeedback({ type: "success", message: "Event updated." });
      } else {
        await createEvent(form);
        setFeedback({ type: "success", message: "Event created!" });
        localStorage.setItem("events_last_updated", String(Date.now()));
      }
      clearForm(); await loadEvents(); setActiveTab("events");
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.response?.data?.msg || "Failed to save event." });
    }
  };

  const handleEdit = (ev: EventItem) => {
    setEditingId(ev._id);
    setForm({
      title: ev.title, description: ev.description, type: ev.type,
      date: ev.date.slice(0,10), time: ev.time,
      registrationDeadline: ev.registrationDeadline.slice(0,16),
      location: ev.location, maxRegistrations: ev.maxRegistrations ?? 100,
    });
    setActiveTab("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteEvent(id);
      setFeedback({ type: "success", message: "Event deleted." });
      await loadEvents();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.response?.data?.msg || "Delete failed." });
    }
  };

  const handleViewRegs = async (ev: EventItem) => {
    try { setViewRegs(await getEventRegistrations(ev._id)); setViewEvent(ev); }
    catch { setFeedback({ type: "error", message: "Failed to load registrations." }); }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  // ── sidebar nav item ────────────────────────────────────────────────────────
  const NavItem = ({ id, icon, label }: { id: typeof activeTab; icon: string; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 16px", borderRadius: 10, border: 0, cursor: "pointer",
        width: "100%", textAlign: "left", fontSize: "0.9rem", fontWeight: 600,
        background: activeTab === id ? C.yellow : "transparent",
        color: activeTab === id ? C.dark : "rgba(255,255,255,0.8)",
        transition: "background 0.2s, color 0.2s",
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>{icon}</span> {label}
    </button>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: 230, background: C.dark, color: "#fff",
        display: "flex", flexDirection: "column", padding: "0 12px 24px",
        position: "sticky", top: 0, height: "100vh", flexShrink: 0,
      }}>
        {/* brand */}
        <div style={{ padding: "24px 8px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 16 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Poppins',sans-serif" }}>🎓 CampusEvents</div>
          <div style={{ fontSize: "0.75rem", color: C.light, marginTop: 3 }}>Admin Panel</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <NavItem id="overview" icon="📊" label="Overview" />
          <NavItem id="create"   icon="➕" label="Create Event" />
          <NavItem id="events"   icon="📋" label="My Events" />
        </nav>

        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 16px", borderRadius: 10, border: 0, cursor: "pointer",
            background: "rgba(251,133,0,0.15)", color: C.orange,
            fontWeight: 600, fontSize: "0.9rem", width: "100%",
          }}
        >
          🚪 Logout
        </button>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>

        {/* header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontFamily: "'Poppins',sans-serif", color: C.dark }}>
            {activeTab === "overview" && "Dashboard Overview"}
            {activeTab === "create"   && (editingId ? "Update Event" : "Create New Event")}
            {activeTab === "events"   && "My Events"}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.88rem" }}>
            Welcome back, Admin
          </p>
        </div>

        {feedback && (
          <div style={{ marginBottom: 20 }}>
            <Alert type={feedback.type} message={feedback.message} />
          </div>
        )}

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div>
            {/* stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard label="My Events"          value={myEvents.length}  icon="🗓️" accent={C.cyan}   />
              <StatCard label="Total Registrations" value={totalRegs}        icon="👥" accent={C.yellow} />
              <StatCard label="Active Events"       value={activeEvents}     icon="✅" accent={C.orange} />
            </div>

            {/* events table */}
            <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(2,48,71,0.07)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `2px solid ${C.light}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: C.dark, fontSize: "1rem" }}>Event Summary</h3>
                <button onClick={() => setActiveTab("create")} style={{ background: C.yellow, color: C.dark, border: 0, borderRadius: 8, padding: "7px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
                  + New Event
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ background: "#f0f7fb" }}>
                      {["Event Name","Date","Registrations","Status","Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.dark, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myEvents.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>No events yet. Create your first event!</td></tr>
                    ) : myEvents.map((ev, i) => {
                      const count = regCounts[ev._id] ?? 0;
                      const max   = ev.maxRegistrations ?? 100;
                      const open  = new Date(ev.registrationDeadline) > new Date();
                      return (
                        <tr key={ev._id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafcff" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: C.dark }}>{ev.title}</td>
                          <td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap" }}>{new Date(ev.date).toLocaleDateString()}</td>
                          <td style={{ padding: "12px 16px", minWidth: 160 }}>
                            <span style={{ fontWeight: 600, color: C.dark }}>{count}</span>
                            <span style={{ color: "#94a3b8" }}> / {max}</span>
                            <CapacityBar count={count} max={max} />
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: open ? "#dcfce7" : "#fee2e2", color: open ? "#166534" : "#991b1b", borderRadius: 99, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600 }}>
                              {open ? "Active" : "Closed"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => handleViewRegs(ev)} style={{ background: C.light, color: C.dark, border: 0, borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Registrants</button>
                              <button onClick={() => handleEdit(ev)} style={{ background: C.cyan, color: "#fff", border: 0, borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Edit</button>
                              <button onClick={() => handleDelete(ev._id)} style={{ background: C.orange, color: "#fff", border: 0, borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE / EDIT TAB ─────────────────────────────────────────── */}
        {activeTab === "create" && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, boxShadow: "0 2px 12px rgba(2,48,71,0.07)", maxWidth: 680 }}>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              <Field label="Event Title">
                <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Annual Hackathon 2025" style={inputStyle} required />
              </Field>
              <Field label="Description">
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the event…" style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} required />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Category">
                  <select name="type" value={form.type} onChange={handleChange} style={inputStyle}>
                    {["hackathon","tech","seminar","games","movie","other"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </Field>
                <Field label="Location">
                  <input name="location" value={form.location} onChange={handleChange} placeholder="Venue / Room" style={inputStyle} required />
                </Field>
                <Field label="Event Date">
                  <input type="date" name="date" value={form.date} onChange={handleChange} min={new Date().toISOString().split("T")[0]} style={inputStyle} required />
                </Field>
                <Field label="Event Time">
                  <input type="time" name="time" value={form.time} onChange={handleChange} style={inputStyle} required />
                </Field>
                <Field label="Registration Deadline">
                  <input type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange} min={new Date().toISOString().slice(0,16)} style={inputStyle} required />
                </Field>
                <Field label="Max Registrations">
                  <input type="number" name="maxRegistrations" value={form.maxRegistrations} onChange={handleChange} min={1} style={inputStyle} required />
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>Set the maximum number of participants</span>
                </Field>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="submit" style={{ background: C.dark, color: "#fff", border: 0, borderRadius: 10, padding: "12px 28px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
                  {editingId ? "Update Event" : "Create Event"}
                </button>
                {editingId && (
                  <button type="button" onClick={clearForm} style={{ background: "#e2e8f0", color: "#1e293b", border: 0, borderRadius: 10, padding: "12px 20px", fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── MY EVENTS TAB ────────────────────────────────────────────── */}
        {activeTab === "events" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
            {events.length === 0 && (
              <p style={{ color: "#94a3b8", gridColumn: "1/-1" }}>No events found.</p>
            )}
            {events.map(ev => {
              const count  = regCounts[ev._id] ?? ev.registrationCount ?? 0;
              const max    = ev.maxRegistrations ?? 100;
              const isOpen = new Date(ev.registrationDeadline) > new Date();
              const isMine = ev.createdBy === user?.id;
              return (
                <div key={ev._id} style={{
                  background: "#fff", borderRadius: 14, overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(2,48,71,0.08)",
                  border: `1px solid ${isMine ? C.light : "#e2e8f0"}`,
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 28px rgba(2,48,71,0.14)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(2,48,71,0.08)"; }}
                >
                  {/* card header */}
                  <div style={{ background: C.dark, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ background: C.yellow, color: C.dark, borderRadius: 99, padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700, textTransform: "capitalize" }}>{ev.type}</span>
                    <span style={{ background: isOpen ? "#dcfce7" : "#fee2e2", color: isOpen ? "#166534" : "#991b1b", borderRadius: 99, padding: "2px 10px", fontSize: "0.75rem", fontWeight: 600 }}>
                      {isOpen ? "Active" : "Closed"}
                    </span>
                  </div>

                  <div style={{ padding: "16px" }}>
                    <h4 style={{ margin: "0 0 6px", color: C.dark, fontSize: "1rem" }}>{ev.title}</h4>
                    <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "0.85rem", lineHeight: 1.5 }}>
                      {ev.description?.slice(0, 80)}{(ev.description?.length ?? 0) > 80 ? "…" : ""}
                    </p>
                    <div style={{ display: "flex", gap: 12, fontSize: "0.8rem", color: "#94a3b8", marginBottom: 12, flexWrap: "wrap" }}>
                      <span>📅 {new Date(ev.date).toLocaleDateString()}</span>
                      <span>⏰ {ev.time}</span>
                      <span>📍 {ev.location}</span>
                    </div>

                    <CapacityBar count={count} max={max} />

                    <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                      <button onClick={() => handleViewRegs(ev)} style={{ flex: 1, background: C.light, color: C.dark, border: 0, borderRadius: 8, padding: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                        👥 Registrants
                      </button>
                      {isMine && (
                        <>
                          <button onClick={() => handleEdit(ev)} style={{ background: C.cyan, color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>Edit</button>
                          <button onClick={() => handleDelete(ev._id)} style={{ background: C.orange, color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>Delete</button>
                        </>
                      )}
                    </div>
                    {!isMine && <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>Created by another admin</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── REGISTRANTS MODAL ────────────────────────────────────────────── */}
      {viewEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,48,71,0.55)", display: "grid", placeItems: "center", padding: 16, zIndex: 50, backdropFilter: "blur(4px)" }}
          onClick={() => setViewEvent(null)}>
          <div style={{ width: "min(700px,100%)", background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 24px 60px rgba(2,48,71,0.25)", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: C.dark }}>{viewEvent.title}</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.85rem" }}>{viewRegs.length} registrant(s)</p>
              </div>
              <button onClick={() => setViewEvent(null)} style={{ background: "#f1f5f9", border: 0, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600, color: "#475569" }}>✕ Close</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {viewRegs.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>No registrations yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.87rem" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                    <tr style={{ borderBottom: `2px solid ${C.light}` }}>
                      {["Name","College ID","College","Email"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.dark, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewRegs.map((r, i) => (
                      <tr key={r._id || i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={{ padding: "10px 12px", color: "#334155" }}>{r.name || "N/A"}</td>
                        <td style={{ padding: "10px 12px", color: "#475569" }}>{r.collegeId || "N/A"}</td>
                        <td style={{ padding: "10px 12px", color: "#475569" }}>{r.collegeName || "N/A"}</td>
                        <td style={{ padding: "10px 12px", color: "#475569" }}>{r.email || r.userId?.email || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
