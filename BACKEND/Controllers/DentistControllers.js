const Dentist = require("../Model/DentistModel");
//display part
const getAllDentists = async (req,res,next)=>{

    let dentists;

    try{// return database
        dentists = await Dentist.find();
    }catch(err){
        console.log(err);
    }
    //not found
    if(!dentists){
        return res.status(404).json({message:"Dentist not found"});
    }
    //display all users 
    return res.status(200).json({dentists});
};
//data insert
const addDentists = async(req,res,next)=>{

    const{userId, license_no, specialization, availability_schedule} = req.body;

    let dentists;

    try{
        //userge call krgaththu details const
        dentists = new Dentist({ userId, license_no, specialization, availability_schedule});
        //to save in database
        await dentists.save();
         return res.status(201).json({ dentists });

    }catch(err){
        console.log(err);
    //not inserting users
     if (err?.code === 11000) {
      return res.status(409).json({ message: "Duplicate key", detail: err.keyValue });
    }
    return res.status(422).json({ message: err.message || "Unable to add dentist" });
  }

};
//retrieve data Get by Id
const getById = async(req,res,next)=>{

    const id = req.params.id;

    let dentists;

    try{
       dentists = await Dentist.findById(id);
    }catch(err){
        console.log(err);
    }
      //not available dentist
    if(!dentists){
        return res.status(404).json({message:"User not found"});

    }
    return res.status(200).json({ dentists });

};
// GET /dentists/code/:dentistCode  (e.g., Dr-0007)
const getByCode = async (req, res) => {
  try {
    const { dentistCode } = req.params;
    const dentist = await Dentist.findOne({ dentistCode }).lean();
    if (!dentist) return res.status(404).json({ message: "Dentist not found" });
    return res.status(200).json({ dentist });
  } catch (err) {
    console.error("getByCode error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /dentists/code/:dentistCode  (update availability only; name/license/specialization immutable here)
const updateAvailabilityByCode = async (req, res) => {
  try {
    const { dentistCode } = req.params;
    const { availability_schedule } = req.body || {};

    if (req.user?.role === "Dentist" && req.user?.dentistCode && req.user.dentistCode !== dentistCode) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const $set = {};
    if (typeof availability_schedule !== "undefined") {
      $set.availability_schedule = availability_schedule;
    }
    if (Object.keys($set).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const dentist = await Dentist.findOneAndUpdate(
      { dentistCode },
      { $set },
      { new: true, runValidators: true }
    ).lean();
    if (!dentist) return res.status(404).json({ message: "Dentist not found" });
    return res.status(200).json({ dentist });
  } catch (err) {
    console.error("updateAvailabilityByCode error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
const resyncCounterForDentist = async (req, res) => {
  try {
    const dentistCode = String(req.params.dentistCode || "").trim();
    const scope = `dentist:${dentistCode}`;

    const old = await Counter.findOne({ scope }).lean();
    const oldSeq = old?.seq || 0;

    // you’ll need a helper like getMaxDentistNumberInDb(dentistCode)
    const maxInDb = await getMaxDentistNumberInDb(dentistCode);

    const updated = await Counter.findOneAndUpdate(
      { scope },
      { $set: { seq: maxInDb } },
      { upsert: true, new: true }
    ).lean();

    return res.status(200).json({
      dentistCode,
      scope,
      oldSeq,
      maxDentistNumberInDb: maxInDb,
      newSeq: updated.seq,
      note:
        "Counter aligned to existing dentist data. Next insert will be Dr-" +
        String(updated.seq + 1).padStart(3, "0") +
        ". Avoid hard deletes in production.",
    });
  } catch (err) {
    console.error("resyncCounterForDentist error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};




exports.getAllDentists=getAllDentists;
exports.addDentists= addDentists;
exports.getById= getById; 
exports.getByCode = getByCode; 
exports.updateAvailabilityByCode = updateAvailabilityByCode;
exports.resyncCounterForDentist = resyncCounterForDentist;

