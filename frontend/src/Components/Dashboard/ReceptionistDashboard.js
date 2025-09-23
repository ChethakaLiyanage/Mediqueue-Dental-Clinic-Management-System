import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReceptionistNav from "../Nav/ReceptionistNav";
import "./Receptionistdashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const tzOffsetMin = -new Date().getTimezoneOffset();

function getLocalYYYYMMDD(d = new Date()){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

export default function ReceptionistDashboard(){
  const [date,setDate]=useState(getLocalYYYYMMDD());
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const [refreshedAt,setRefreshedAt]=useState(null);

  const qs = useMemo(()=>{
    const p = new URLSearchParams({ date, tzOffsetMin:String(tzOffsetMin) });
    return p.toString();
  },[date]);

  const load = useCallback(async ()=>{
    try{
      setBusy(true); setErr("");
      const r = await fetch(`${API_BASE}/receptionist/dashboard?${qs}`);
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j); setRefreshedAt(new Date());
    }catch(e){ setErr(String(e.message||e)); }
    finally{ setBusy(false); }
  },[qs]);

  useEffect(()=>{ load(); },[load]);

  const appoint = data?.cards?.appointmentsToday || {};
  const queue = data?.cards?.queueToday || {};
  const inquiries = data?.cards?.inquiries || {};
  const events = data?.cards?.events || {};

  return (
    <div className={`rc-shell ${busy ? "rc-skel":""}`}>
      <ReceptionistNav />

      <main className="rc-main">
        {/* Top bar */}
        <header className="rc-topbar">
          <div className="rc-top-title">Dashboard</div>
          <div className="rc-top-actions">
            <input className="rc-date" type="date" value={date} onChange={e=>setDate(e.target.value)} />
            <button className="rc-btn" onClick={load} disabled={busy}>⟳ Refresh</button>
            <button className="rc-ghost" title="Notifications" onClick={() => window.location.href = '/receptionist/notifications'}>
              🔔
            {(data?.unreadNotificationCount ?? 0) > 0 && (
           <span className="rc-badge">{data.unreadNotificationCount}</span>
           )}
           </button>
          </div>
        </header>

        {/* Welcome */}
        <div className="rc-hero">
          <h2>Welcome to DentalCare Pro</h2>
          <p>Your receptionist console for appointments, queues, schedules, events, inquiries, and notifications.</p>
        </div>

        {err && <div className="rc-error">⚠️ {err}</div>}

        {/* Stats */}
        <div className="rc-grid">
          <div className="rc-card">
            <div className="rc-card-head">📅 Appointments Today</div>
            <div className="rc-stat">{appoint.total ?? 0}</div>
            <div className="rc-sub">
              <span className="rc-pill info">{appoint.pendingOrConfirmed ?? 0} pending/confirmed</span>
              <span className="rc-pill ok">{appoint.completed ?? 0} completed</span>
              <span className="rc-pill bad">{appoint.cancelled ?? 0} cancelled</span>
            </div>
          </div>

          <div className="rc-card">
            <div className="rc-card-head">👥 Queue (All Dentists)</div>
            <div className="rc-stat">{queue.totalWaiting ?? 0}</div>
            <div className="rc-sub">
              <span className="rc-pill warn">{queue.totalCalled ?? 0} called</span>
              <span className="rc-pill muted">{queue.totalNoShow ?? 0} no-show</span>
              <span className="rc-pill ok">{queue.totalCompleted ?? 0} done</span>
            </div>
          </div>

          <div className="rc-card">
            <div className="rc-card-head">📥 Open Inquiries</div>
            <div className="rc-stat">{inquiries.openCount ?? 0}</div>
            <div className="rc-sub">{inquiries.latest?.length ? `${inquiries.latest.length} recent updates` : "No recent updates"}</div>
          </div>

          <div className="rc-card">
             <div className="rc-card-head">📣 Published Events</div>
             <div className="rc-stat">{events.totalPublished ?? 0}</div>
             <div className="rc-sub">{events.publishedTodayCount ?? 0} today</div>
             </div>
          </div>

        {/* Next Appointments */}
        <section className="rc-section">
          <div className="rc-sec-head">
            <h3>Next Appointments (Today)</h3>
            <div className="rc-hint">{refreshedAt ? `Last refresh: ${refreshedAt.toLocaleTimeString()}` : ""}</div>
          </div>

          <div className="rc-table">
            <div className="rc-thead">
              <div>Time</div><div>Patient</div><div>Dentist</div><div>Status</div><div>Reason</div>
            </div>
            <div className="rc-tbody">
              {(data?.nextAppointments ?? []).map(a=>(
                <div className="rc-row" key={a.appointmentCode}>
                  <div>⏰ {a.timeLocal}</div>
                  <div>{a.patient_code}</div>
                  <div>{a.dentist_code}</div>
                  <div>
                    {a.status==="confirmed" && <span className="rc-pill ok">confirmed</span>}
                    {a.status==="pending" && <span className="rc-pill info">pending</span>}
                    {a.status==="cancelled" && <span className="rc-pill bad">cancelled</span>}
                    {!["confirmed","pending","cancelled"].includes(a.status||"") && <span className="rc-pill">{a.status||"-"}</span>}
                  </div>
                  <div title={a.reason||""}>{a.reason||"-"}</div>
                </div>
              ))}
              {(!data?.nextAppointments || data.nextAppointments.length===0) && (
                <div className="rc-row rc-empty">No upcoming appointments.</div>
              )}
            </div>
          </div>
        </section>

        {/* Queue */}
        <section className="rc-section">
          <div className="rc-sec-head"><h3>Queue by Dentist</h3><div className="rc-hint">ETA ≈ waiting × 15m</div></div>
          <div className="rc-table">
            <div className="rc-thead">
              <div>Dentist</div><div>Waiting</div><div>Called</div><div>No-show</div><div>Done</div><div>Cancelled</div><div>ETA (min)</div>
            </div>
            <div className="rc-tbody">
              {(data?.queuesByDentist ?? []).map(d=>(
                <div className="rc-row" key={d.dentist_code}>
                  <div>{d.dentist_name || d.dentist_code}</div>
                  <div>{d.waiting ?? 0}</div>
                  <div>{d.called ?? 0}</div>
                  <div>{d.no_show ?? 0}</div>
                  <div>{d.completed ?? 0}</div>
                  <div>{d.cancelled ?? 0}</div>
                  <div>{d.etaMinutes ?? 0}</div>
                </div>
              ))}
              {(!data?.queuesByDentist || data.queuesByDentist.length===0) && (
                <div className="rc-row rc-empty">No queue items today.</div>
              )}
            </div>
          </div>

         <div className="rc-live-container">
  {Object.entries(data?.queueLiveByDentist || {}).map(([dentist, buckets])=>(
    <div className="rc-card" key={dentist}>
      <div className="rc-card-head">Live • {dentist}</div>
      <div className="rc-live">
        <div>
          <div className="rc-live-h">Called</div>
          <ul>
            {(buckets.called||[]).map(q=>(
              <li key={q._id}>✅ {q.appointmentCode} (pos {q.position})</li>
            ))}
            {(buckets.called||[]).length===0 && <li className="rc-dim">None</li>}
          </ul>
        </div>
        <div>
          <div className="rc-live-h">Waiting</div>
          <ul>
            {(buckets.waiting||[]).map(q=>(
              <li key={q._id}>⏳ {q.appointmentCode} (pos {q.position})</li>
            ))}
            {(buckets.waiting||[]).length===0 && <li className="rc-dim">None</li>}
          </ul>
        </div>
        <div>
          <div className="rc-live-h">No-show</div>
          <ul>
            {(buckets.no_show||[]).map(q=>(
              <li key={q._id}>❌ {q.appointmentCode}</li>
            ))}
            {(buckets.no_show||[]).length===0 && <li className="rc-dim">None</li>}
          </ul>
        </div>
      </div>
    </div>
  ))}
</div>
        </section>

        {/* Availability */}
        <section className="rc-section">
          <div className="rc-sec-head"><h3>Dentist Availability (Today)</h3></div>
          <div className="rc-table">
            <div className="rc-thead">
              <div>Dentist</div><div>Window</div><div>Slots</div><div>Booked</div><div>Free</div><div>Next Free</div>
            </div>
            <div className="rc-tbody">
              {(data?.dentistAvailabilityToday ?? []).map(d=>(
                <div className="rc-row" key={d.dentist_code}>
                  <div title={d.dentist_code}>{d.dentist_name || d.dentist_code}</div>
                  <div>{d.schedule_window || "-"}</div>
                  <div>{d.slots_total}</div>
                  <div>{d.slots_booked}</div>
                  <div>{d.slots_available}</div>
                  <div>{d.next_free_slot || "-"}</div>
                </div>
              ))}
              {(!data?.dentistAvailabilityToday || data.dentistAvailabilityToday.length===0) && (
                <div className="rc-row rc-empty">No schedules configured.</div>
              )}
            </div>
          </div>
        </section>

        {/* Events + Inquiries */}
        <section className="rc-two">
          <div className="rc-card">
  <div className="rc-card-head">📣 Published Events</div>
  <div className="rc-list">
    {(events.items ?? []).map(e=>(
      <div className="rc-list-item" key={e.eventCode}>
        {e.imageUrl && (
          <img 
            src={e.imageUrl} 
            alt={e.title} 
            style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', marginRight: '12px'}}
          />
        )}
        <div>
          <div className="rc-list-title">{e.title}</div>
          <div className="rc-list-sub">{new Date(e.start).toLocaleString()} → {new Date(e.end).toLocaleString()}</div>
        </div>
      </div>
    ))}
    {(!events.items || events.items.length===0) && <div className="rc-empty">No published events.</div>}
  </div>
</div>

          <div className="rc-card">
            <div className="rc-card-head">💬 Latest Inquiries</div>
            <div className="rc-list">
              {(inquiries.latest ?? []).map(iq=>(
                <div className="rc-list-item" key={iq.inquiryCode || iq.updatedAt}>
                  <div>
                    <div className="rc-list-title">{iq.subject}</div>
                    <div className="rc-list-sub">
                      {iq.status ? <span className="rc-pill">{iq.status}</span> : null}
                      <span className="rc-dot"/> Updated {new Date(iq.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {(!inquiries.latest || inquiries.latest.length===0) && <div className="rc-empty">No recent inquiries.</div>}
            </div>
          </div>
        </section>

        <footer className="rc-footer">© MediQueue Dental — Reception</footer>
      </main>
    </div>
  );
}
