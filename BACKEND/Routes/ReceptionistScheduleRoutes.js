const expressA = require('express');
const scheduleRouter = expressA.Router();
const { getBookableSlots: getSlotsCtrl } = require('../Controllers/ReceptionistScheduleController');

// GET /receptionist/schedule/dentists/:dentistCode/slots?date=YYYY-MM-DD&slot=30
scheduleRouter.get('/dentists/:dentistCode/slots', getSlotsCtrl);

module.exports = scheduleRouter;
