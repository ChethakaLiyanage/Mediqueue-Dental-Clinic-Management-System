const express = require("express");
const event_router = express.Router();
const Events = require("../Controllers/DentistClinicEventControllers");

// list
event_router.get("/", Events.getAllEvents);

// create
event_router.post("/", Events.addEvent);

// read
event_router.get("/code/:eventCode", Events.getByCode);
event_router.get("/:id", Events.getById);

// update
event_router.put("/:id", Events.updateEvent);

// delete
event_router.delete("/:id", Events.deleteEvent);

module.exports = event_router;


