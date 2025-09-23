// src/Components/Events/ReceptionistEvents.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReceptionistNav from "../Nav/ReceptionistNav";
import { getJSON, postJSON, putJSON, delJSON } from "../../api";
import "./receptionistevents.css";

const EVENT_TYPES = ["Holiday", "Closure", "Maintenance", "Meeting", "Other"];

/* date helpers */
function toISODate(d){ if(!d) return ""; const [y,m,day]=d.split("-").map(Number); return new Date(y,m-1,day,0,0,0).toISOString(); }
function dateOnlyToISO(dateStr,end=false){ if(!dateStr) return ""; const [y,m,d]=dateStr.split("-").map(Number); return new Date(y,m-1,d,end?23:0,end?59:0,end?59:0).toISOString(); }
function dateTimeLocalToISO(dtStr){ if(!dtStr) return ""; const [datePart,timePart]=dtStr.split("T"); const [y,m,d]=datePart.split("-").map(Number); const [hh="00",mm="00"]=(timePart||"").split(":"); return new Date(y,m-1,d,Number(hh),Number(mm),0).toISOString(); }
function isoToInputDate(iso){ if(!iso) return ""; const d=new Date(iso); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function isoToInputDateTime(iso){ if(!iso) return ""; const d=new Date(iso); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); const hh=String(d.getHours()).padStart(2,"0"); const mm=String(d.getMinutes()).padStart(2,"0"); return `${y}-${m}-${day}T${hh}:${mm}`; }

/* code helpers */
function shortId(v){ const s=String(v||""); return s.length>6 ? `…${s.slice(-6)}` : s || "—"; }
function codeFromUser(u){
  if(!u) return "—";
  if (typeof u === "string") return shortId(u); // id only
  return u.receptionistCode || u.code || u.empCode || u.username || u.receptionistId || shortId(u._id);
}
function codeFromEvent(ev, key){
  if (!ev) return "—";
  if (ev[`${key}Code`]) return ev[`${key}Code`];        // backend added property
  const v = ev[key];
  return codeFromUser(v);
}
function ts(iso){ if(!iso) return "—"; return new Date(iso).toLocaleString(); }

export default function ReceptionistEvents(){
  // filters
  const [q,setQ]=useState(""); const [type,setType]=useState(""); const [published,setPublished]=useState("all");
  const [from,setFrom]=useState(""); const [to,setTo]=useState(""); const [showDeleted,setShowDeleted]=useState(false);
  // paging
  const [page,setPage]=useState(1); const [limit,setLimit]=useState(10);
  // data & ui
  const [items,setItems]=useState([]); const [total,setTotal]=useState(0); const [pages,setPages]=useState(1);
  const [busy,setBusy]=useState(false); const [err,setErr]=useState("");
  // modal
  const emptyForm={_id:null,title:"",description:"",startDate:"",endDate:"",allDay:true,eventType:"Other",isPublished:false,imageUrl:""};
  const [form,setForm]=useState(emptyForm);
  const [showModal,setShowModal]=useState(false);
  const [isEdit,setIsEdit]=useState(false);

  const params=useMemo(()=>{
    const p={};
    if(q) p.q=q;
    if(type) p.type=type;
    if(published!=="all") p.published=published;
    if(from) p.from=toISODate(from);
    if(to) p.to=toISODate(to);
    if(showDeleted) p.includeDeleted=true;
    p.page=page; p.limit=limit;
    return p;
  },[q,type,published,from,to,showDeleted,page,limit]);

  const load=useCallback(async()=>{
    try{
      setBusy(true); setErr("");
      const qs=new URLSearchParams(params).toString();
      const j=await getJSON(`/clinicevent?${qs}`);
      setItems(j.items||[]); setTotal(j.total||0); setPages(j.pages||1);
    } catch(e){ setErr(e?.message||"Failed to load"); } finally{ setBusy(false); }
  },[params]);

  useEffect(()=>{ load(); },[load]);

  function resetFilters(){ setQ(""); setType(""); setPublished("all"); setFrom(""); setTo(""); setShowDeleted(false); setPage(1); }
  function openCreate(){ setForm({...emptyForm}); setIsEdit(false); setShowModal(true); }
  function openEdit(ev){
    setForm({
      _id:ev._id, title:ev.title||"", description:ev.description||"",
      startDate:ev.allDay?isoToInputDate(ev.startDate):isoToInputDateTime(ev.startDate),
      endDate:ev.allDay?isoToInputDate(ev.endDate):isoToInputDateTime(ev.endDate),
      allDay:ev.allDay??true, eventType:ev.eventType||"Other", isPublished:!!ev.isPublished, imageUrl:ev.imageUrl||""
    });
    setIsEdit(true); setShowModal(true);
  }

  async function saveForm(e){
    e.preventDefault();
    try{
      setBusy(true); setErr("");
      const payload={
        title:form.title.trim(), description:form.description.trim(),
        allDay:!!form.allDay, eventType:form.eventType, isPublished:!!form.isPublished, imageUrl:(form.imageUrl||"").trim()
      };
      if(form.allDay){
        payload.startDate=dateOnlyToISO(form.startDate,false);
        payload.endDate=dateOnlyToISO(form.endDate||form.startDate,true);
      } else {
        payload.startDate=dateTimeLocalToISO(form.startDate);
        payload.endDate=dateTimeLocalToISO(form.endDate||form.startDate);
      }
      if(isEdit) await putJSON(`/clinicevent/${form._id}`, payload);
      else await postJSON("/clinicevent", payload);
      setShowModal(false); await load();
    } catch(e2){ setErr(e2?.message||"Save failed"); } finally{ setBusy(false); }
  }

  async function togglePublish(ev){
    try{ await putJSON(`/clinicevent/${ev._id}`, { isPublished: !ev.isPublished }); await load(); }
    catch(e){ setErr(e?.message||"Update failed"); }
  }
  async function deleteEvent(ev){
    if(!window.confirm(`Delete ${ev.title}?`)) return;
    try{ await delJSON(`/clinicevent/${ev._id}`); await load(); }
    catch(e){ setErr(e?.message||"Delete failed"); }
  }

  function fmtDateRange(ev){
    const s=new Date(ev.startDate), e=new Date(ev.endDate);
    if(ev.allDay){ const same=s.toDateString()===e.toDateString(); return same?s.toLocaleDateString():`${s.toLocaleDateString()} – ${e.toLocaleDateString()}`; }
    return `${s.toLocaleString()} → ${e.toLocaleString()}`;
  }

  return (
    <div className={`ev-shell ${busy ? "ev-busy" : ""}`}>
      <ReceptionistNav />
      <main className="ev-main">
        <header className="ev-top">
          <h1>Clinic Events</h1>
          <div className="ev-actions">
            <button className="ev-btn" onClick={openCreate}>＋ New Event</button>
            <button className="ev-btn ghost" onClick={load}>⟳ Refresh</button>
          </div>
        </header>

        <div className="ev-filters">
          <input placeholder="Search title/description…" value={q} onChange={(e)=>{setQ(e.target.value); setPage(1);}} />
          <select value={type} onChange={(e)=>{setType(e.target.value); setPage(1);}}>
            <option value="">All types</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={published} onChange={(e)=>{setPublished(e.target.value); setPage(1);}}>
            <option value="all">All</option><option value="true">Published</option><option value="false">Unpublished</option>
          </select>
          <label>From <input type="date" value={from} onChange={(e)=>{setFrom(e.target.value); setPage(1);}} /></label>
          <label>To <input type="date" value={to} onChange={(e)=>{setTo(e.target.value); setPage(1);}} /></label>
          <label className="ev-inline">
            <input type="checkbox" checked={showDeleted} onChange={(e)=>{setShowDeleted(e.target.checked); setPage(1);}} /> Show deleted
          </label>
          <button className="ev-btn" onClick={()=>setPage(1)}>Apply</button>
          <button className="ev-btn ghost" onClick={resetFilters}>Clear</button>
        </div>

        {err && <div className="ev-error">⚠️ {err}</div>}

        <div className="ev-table">
          <div className="ev-thead">
            <div>Dates</div><div>Title</div><div>Type</div><div>Published</div><div>Code</div><div>By</div><div>Actions</div>
          </div>
          <div className="ev-tbody">
            {items.map(ev => (
              <div className={`ev-row ${ev.isDeleted ? "ev-row-deleted" : ""}`} key={ev._id}>
                <div title={`${new Date(ev.startDate).toLocaleString()} → ${new Date(ev.endDate).toLocaleString()}`}>{fmtDateRange(ev)}</div>
                <div className="ev-ttl">{ev.title}</div>
                <div>{ev.eventType || "-"}</div>
                <div>{ev.isPublished ? <span className="ev-pill ok">Published</span> : <span className="ev-pill">Draft</span>}</div>
                <div>{ev.eventCode || "—"}</div>

                <div className="ev-audit">
                  <div><b>C</b> {codeFromEvent(ev, "createdBy")} <span className="ev-muted">{ts(ev.createdAt)}</span></div>
                  <div><b>U</b> {codeFromEvent(ev, "updatedBy")} <span className="ev-muted">{ts(ev.updatedAt)}</span></div>
                  {ev.isDeleted && (
                    <div className="ev-deleted-pill">
                      <b>D</b> {codeFromEvent(ev, "deletedBy")} <span className="ev-muted">{ts(ev.deletedAt)}</span>
                    </div>
                  )}
                </div>

                <div className="ev-actions-row">
                  <button className="ev-mini" onClick={()=>openEdit(ev)}>✏️ Edit</button>
                  <button className="ev-mini" onClick={()=>togglePublish(ev)}>{ev.isPublished ? "Unpublish" : "Publish"}</button>
                  <button className="ev-mini danger" onClick={()=>deleteEvent(ev)}>🗑️ Delete</button>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="ev-row ev-empty">No events found.</div>}
          </div>
        </div>

        {/* modal */}
        {showModal && (
          <div className="ev-modal">
            <div className="ev-modal-card">
              <div className="ev-modal-head">
                <h3>{isEdit ? "Edit Event" : "New Event"}</h3>
                <button className="ev-x" onClick={()=>setShowModal(false)}>✖</button>
              </div>
              <form onSubmit={saveForm} className="ev-form">
                <label>Title <input required value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} /></label>
                <label>Description <textarea rows={3} value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} /></label>

                <div className="ev-two">
                  <label>{form.allDay ? "Start date" : "Start date & time"}
                    <input required type={form.allDay ? "date" : "datetime-local"} step={form.allDay?undefined:60} value={form.startDate} onChange={(e)=>setForm({...form, startDate:e.target.value})} />
                  </label>
                  <label>{form.allDay ? "End date" : "End date & time"}
                    <input type={form.allDay ? "date" : "datetime-local"} step={form.allDay?undefined:60} value={form.endDate} onChange={(e)=>setForm({...form, endDate:e.target.value})} />
                  </label>
                </div>

                <div className="ev-two">
                  <label>Type
                    <select value={form.eventType} onChange={(e)=>setForm({...form, eventType:e.target.value})}>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label>Image URL
                    <input placeholder="https://…" value={form.imageUrl} onChange={(e)=>setForm({...form, imageUrl:e.target.value})} />
                  </label>
                </div>

                <div className="ev-checks">
                  <label><input type="checkbox" checked={form.allDay} onChange={(e)=>setForm({...form, allDay:e.target.checked})}/> All-day</label>
                  <label><input type="checkbox" checked={form.isPublished} onChange={(e)=>setForm({...form, isPublished:e.target.checked})}/> Published</label>
                </div>

                <div className="ev-modal-actions">
                  <button type="button" className="ev-btn ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                  <button type="submit" className="ev-btn">{isEdit ? "Save changes" : "Create event"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="ev-pager">
          <button className="ev-mini" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
          <span>Page {page} / {pages} • {total} total</span>
          <button className="ev-mini" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
          <select value={limit} onChange={(e)=>{setLimit(Number(e.target.value)); setPage(1);}}>
            {[5,10,20,50].map(n=><option key={n} value={n}>{n}/page</option>)}
          </select>
        </div>

        <footer className="ev-foot">© MediQueue Dental — Reception</footer>
      </main>
    </div>
  );
}
