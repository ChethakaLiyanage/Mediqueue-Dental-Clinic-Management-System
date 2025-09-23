// Routes/QueueRoutes.js
const express = require('express');
const queueRouter = express.Router();
const QueueCtrl = require('../Controllers/QueueController');

queueRouter.get('/today', QueueCtrl.getTodayQueue);
queueRouter.get('/ongoing', QueueCtrl.getOngoing);
queueRouter.get('/next', QueueCtrl.getNext);
queueRouter.patch('/update/:id', QueueCtrl.updateQueue);
queueRouter.delete('/delete-update/:id', QueueCtrl.deleteAndUpdate);

// Added  manual migration route
queueRouter.post('/migrate-today', QueueCtrl.migrateToday);

module.exports = queueRouter;