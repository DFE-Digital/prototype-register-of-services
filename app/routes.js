const express = require('express');
const router = express.Router();

const homeController = require('./controllers/home.js');
const dashboardController = require('./controllers/dashboard.js');

// Base route remains unversioned
router.get('/', homeController.g_home);

// v1 routes
const v1Routes = express.Router();

// Dashboard route
v1Routes.get('/dashboard', dashboardController.v1.g_dashboard);

// Register v1 routes
router.use('/v1', v1Routes);

module.exports = router; 