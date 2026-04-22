import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import axios from "axios";
import type { EventItem } from "../types";

export default function LandingPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/events");
      setEvents(res.data);
      console.log(res.data);
    } catch (err) {
      console.error("Error fetching events", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const isLoggedIn = Boolean(token && storedUser);
  const userRole = storedUser ? JSON.parse(storedUser).role : null;

  return (
    <main>
      <section className="landing-hero">
        <div className="landing-overlay" />
        <AppNavbar links={[{ label: "Login", to: "/login" }, { label: "Signup", to: "/signup" }]} />
        <div className="landing-content app-container">
          <h1>Campus Event Finder</h1>
          <p>Discover and manage college events with ease</p>
          <div className="landing-role-grid">
            <article className="landing-role-card">
              <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b" alt="Student exploring events" />
              <h3>Student Access</h3>
              <div className="button-row">
                <Link to="/login" className="btn btn-gradient">Login</Link>
                <Link to="/signup" className="btn btn-secondary">Signup</Link>
              </div>
            </article>
            <article className="landing-role-card">
              <img src="https://images.unsplash.com/photo-1552664730-d307ca884978" alt="Admin managing events" />
              <h3>Admin Access</h3>
              <div className="button-row">
                <Link to="/login" className="btn btn-gradient">Login</Link>
                <Link to="/signup" className="btn btn-secondary">Signup</Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="app-container public-events-section">
        <h2>Explore Events</h2>
        <div className="event-grid">
          {events.map((event) => (
            <article key={event._id} className="event-card">
              <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b" alt="Public event" />
              <div className="event-card-body">
                <h4>{event.title}</h4>
                <p>{event.description}</p>
                <div className="event-meta">
                  <span>{event.date}</span>
                  <span>{event.location}</span>
                </div>
                {(!isLoggedIn || userRole !== "admin") && (
                  <button
                    type="button"
                    className="btn btn-gradient"
                    onClick={() => navigate(isLoggedIn ? "/user" : "/login")}
                  >
                    {isLoggedIn ? "Register" : "Login to Register"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
