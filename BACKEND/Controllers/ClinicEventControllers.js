const mongoose = require("mongoose");
const ClinicEvent = require("../Model/ClinicEventModel");
const Receptionist = require("../Model/ReceptionistModel");

const AUDIT_FIELDS = ["receptionistCode", "code", "empCode", "username", "receptionistId"];

// pick visible code from a user/receptionist doc
function pickCode(doc){ if(!doc) return null; for(const k of AUDIT_FIELDS) if(doc[k]) return doc[k]; return null; }

// try to get a tiny user object (by id) and return its code
async function lookupUserMini(userId){
  if(!userId || !mongoose.Types.ObjectId.isValid(userId)) return {};
  const _id = new mongoose.Types.ObjectId(userId);
  const select = AUDIT_FIELDS.join(" ");
  const receptionistSelect = `${select} userId`;

  try {
    const doc = await Receptionist.findById(_id).select(receptionistSelect).lean();
    if (doc) {
      const code = pickCode(doc) || doc.receptionistCode || null;
      return { doc, code };
    }
  } catch {}

  try {
    const doc = await Receptionist.findOne({ userId: _id }).select(receptionistSelect).lean();
    if (doc) {
      const code = pickCode(doc) || doc.receptionistCode || null;
      return { doc, code };
    }
  } catch {}

  try {
    const User = mongoose.model("User");
    const doc = await User.findById(_id).select(select).lean();
    if (doc) return { doc, code: pickCode(doc) };
  } catch {}

  const db = mongoose.connection?.db;
  if (db) {
    const proj = AUDIT_FIELDS.reduce((o,k)=> (o[k]=1,o),{});
    try {
      const doc = await db.collection("receptionistmodels").findOne(
        { $or: [{ _id }, { userId: _id }] },
        { projection: { ...proj, userId: 1 } }
      );
      if (doc) {
        const code = pickCode(doc) || doc.receptionistCode || null;
        return { doc, code };
      }
    } catch {}
    try {
      const doc = await db.collection("receptionists").findOne(
        { $or: [{ _id }, { userId: _id }] },
        { projection: { ...proj, userId: 1 } }
      );
      if (doc) {
        const code = pickCode(doc) || doc.receptionistCode || null;
        return { doc, code };
      }
    } catch {}

    try {
      const doc = await db.collection("users").findOne({ _id }, { projection: proj });
      if (doc) return { doc, code: pickCode(doc) };
    } catch {}
  }

  return {};
}

// attach codes for older events that don’t have snapshot fields
async function hydrateAudit(items){
  const arr = Array.isArray(items)? items : [items];
  const needIds = new Set();
  for(const ev of arr){
    for(const k of ["createdBy","updatedBy","deletedBy"]){
      if(!ev[k]) continue;
      if (ev[`${k}Code`]) continue;
      if (typeof ev[k] === "object"){ ev[`${k}Code`] = pickCode(ev[k]); }
      else needIds.add(String(ev[k]));
    }
  }
  if(!needIds.size) return Array.isArray(items)? arr : arr[0];
  const cache = new Map();
  for(const id of needIds){ cache.set(id, await lookupUserMini(id)); }
  for(const ev of arr){
    for(const k of ["createdBy","updatedBy","deletedBy"]){
      const v = ev[k]; if(!v || ev[`${k}Code`]) continue;
      if (typeof v === "string"){ const hit = cache.get(v); if(hit?.code){ ev[`${k}Code`] = hit.code; ev[k] = hit.doc || v; } }
    }
  }
  return Array.isArray(items)? arr : arr[0];
}

/* -------- LIST -------- */
exports.getAllEvents = async (req,res)=>{
  const { from, to, q, type, published, page=1, limit=10, includeDeleted } = req.query;
  try{
    const filter = {};
    if(!includeDeleted) filter.isDeleted = false;
    if(type) filter.eventType = type;
    if(published && published!=="all") filter.isPublished = (published==="true");
    if(from || to){
      filter.$or = [{ startDate:{ $lte: to? new Date(to): new Date("9999-12-31") },
                      endDate:{ $gte: from? new Date(from): new Date("0001-01-01") } }];
    }
    if(q){
      filter.$or = [ ...(filter.$or||[]),
        { title:{ $regex:q, $options:"i" } }, { description:{ $regex:q, $options:"i" } }
      ];
    }

    const pageNum = +page||1, limitNum = +limit||10, skip=(pageNum-1)*limitNum;

    let items = await ClinicEvent.find(filter)
      .sort({ startDate:1, title:1 })
      .skip(skip).limit(limitNum)
      .populate({ path:"createdBy", select: AUDIT_FIELDS.join(" ") })
      .populate({ path:"updatedBy", select: AUDIT_FIELDS.join(" ") })
      .populate({ path:"deletedBy", select: AUDIT_FIELDS.join(" ") })
      .lean();

    items = await hydrateAudit(items);

    const total = await ClinicEvent.countDocuments(filter);
    res.status(200).json({ items, page:pageNum, limit:limitNum, total, pages:Math.ceil(total/limitNum) });
  }catch(err){ res.status(500).json({ message:"Failed to list clinic events", error: err.message }); }
};

/* -------- CREATE (snapshot code) -------- */
exports.addEvent = async (req,res)=>{
  try{
    const { title, description, startDate, endDate, allDay, eventType, isPublished, imageUrl } = req.body;
    if(!title || !startDate) return res.status(400).json({ message:"title and startDate are required" });

    const doc = {
      title, description,
      startDate: new Date(startDate),
      endDate:   endDate ? new Date(endDate) : new Date(startDate),
      allDay: typeof allDay==="boolean" ? allDay : true,
      eventType: eventType || "Other",
      isPublished: !!isPublished,
      imageUrl: imageUrl || null,
    };

    if (mongoose.isValidObjectId(req.user?.id)) {
      doc.createdBy = req.user.id;
      // best effort snapshot
      const code = req.user?.receptionistCode || req.user?.code || req.user?.empCode || req.user?.username;
      if (code) doc.createdByCode = code;
      else {
        const hit = await lookupUserMini(req.user.id);
        if (hit?.code) doc.createdByCode = hit.code;
      }
    }

    const event = await ClinicEvent.create(doc);
    res.status(201).json({ event });
  }catch(err){ res.status(500).json({ message:"Failed to create event", error: err.message }); }
};

/* -------- READ BY ID -------- */
exports.getById = async (req,res)=>{
  try{
    const includeDeleted = req.query.includeDeleted==="true";
    let event = await ClinicEvent.findById(req.params.id)
      .populate({ path:"createdBy", select: AUDIT_FIELDS.join(" ") })
      .populate({ path:"updatedBy", select: AUDIT_FIELDS.join(" ") })
      .populate({ path:"deletedBy", select: AUDIT_FIELDS.join(" ") })
      .lean();
    if(!event || (!includeDeleted && event.isDeleted)) return res.status(404).json({ message:"Event not found" });
    event = await hydrateAudit(event);
    res.status(200).json({ event });
  }catch(err){ res.status(500).json({ message:"Failed to get event", error: err.message }); }
};

/* -------- READ BY CODE -------- */
exports.getByCode = async (req,res)=>{
  try{
    const includeDeleted = req.query.includeDeleted==="true";
    let event = await ClinicEvent.findOne({ eventCode: req.params.eventCode })
      .populate({ path:"createdBy", select: AUDIT_FIELDS.join(" ") })
      .populate({ path:"updatedBy", select: AUDIT_FIELDS.join(" ") })
      .populate({ path:"deletedBy", select: AUDIT_FIELDS.join(" ") })
      .lean();
    if(!event || (!includeDeleted && event.isDeleted)) return res.status(404).json({ message:"Event not found" });
    event = await hydrateAudit(event);
    res.status(200).json({ event });
  }catch(err){ res.status(500).json({ message:"Failed to get event", error: err.message }); }
};

/* -------- UPDATE (snapshot code) -------- */
exports.updateEvent = async (req,res)=>{
  try{
    const allowed=["title","description","startDate","endDate","allDay","eventType","isPublished","imageUrl"];
    const updates={}; for(const k of allowed) if(k in req.body) updates[k]=req.body[k];
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate)   updates.endDate   = new Date(updates.endDate);

    if (mongoose.isValidObjectId(req.user?.id)) {
      updates.updatedBy = req.user.id;
      const code = req.user?.receptionistCode || req.user?.code || req.user?.empCode || req.user?.username;
      if (code) updates.updatedByCode = code;
      else {
        const hit = await lookupUserMini(req.user.id);
        if (hit?.code) updates.updatedByCode = hit.code;
      }
    }

    const event = await ClinicEvent.findByIdAndUpdate(req.params.id, updates, { new:true, runValidators:true });
    if(!event) return res.status(404).json({ message:"Event not found" });
    res.status(200).json({ event });
  }catch(err){ res.status(500).json({ message:"Failed to update event", error: err.message }); }
};

/* -------- DELETE (soft default; snapshot code) -------- */
exports.deleteEvent = async (req,res)=>{
  try{
    const hard = String(req.query.hard||"").toLowerCase()==="true";
    if(hard){
      const deleted = await ClinicEvent.findByIdAndDelete(req.params.id);
      if(!deleted) return res.status(404).json({ message:"Event not found" });
      return res.status(200).json({ message:"Event hard-deleted", id:req.params.id });
    }
    const updates = { isDeleted:true, deletedAt:new Date() };
    if (mongoose.isValidObjectId(req.user?.id)) {
      updates.deletedBy = req.user.id;
      const code = req.user?.receptionistCode || req.user?.code || req.user?.empCode || req.user?.username;
      if (code) updates.deletedByCode = code;
      else {
        const hit = await lookupUserMini(req.user.id);
        if (hit?.code) updates.deletedByCode = hit.code;
      }
    }
    const event = await ClinicEvent.findByIdAndUpdate(req.params.id, updates, { new:true });
    if(!event) return res.status(404).json({ message:"Event not found" });
    res.status(200).json({ message:"Event soft-deleted", id:req.params.id });
  }catch(err){ res.status(500).json({ message:"Failed to delete event", error: err.message }); }
};
