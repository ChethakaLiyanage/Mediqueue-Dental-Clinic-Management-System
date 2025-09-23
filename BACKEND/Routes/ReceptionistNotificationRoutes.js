const expressD = require('express');
const notifRouter = expressD.Router();
const NotifCtrl = require('../Controllers/ReceptionistNotificationController');

notifRouter.post('/test', NotifCtrl.testSend);
notifRouter.get('/logs', NotifCtrl.listLogs);
notifRouter.get('/appointments', NotifCtrl.listAppointmentNotifications);

module.exports = notifRouter;
