const express = require('express');
const router = express.Router();
const dashboardController = require('./controllers/dashboard_controller');
const servicesController = require('./controllers/services_controller');
const categoriesController = require('./controllers/categories_controller');
const policyController = require('./controllers/policy_controller');
const dataController = require('./controllers/dataController');
const departmentController = require('./controllers/department_controller');

// Dashboard route
router.get('/', dashboardController.index);
router.get('/dashboard', (req, res, next) => {
  if (req.session.lastDashboard) {
    return res.redirect(req.session.lastDashboard);
  }
  next();
}, dashboardController.index);
router.get('/dashboard-1', (req, res, next) => {
  req.session.lastDashboard = '/dashboard-1';
  next();
}, dashboardController.getDashboard1);
router.get('/dashboard-2', (req, res, next) => {
  req.session.lastDashboard = '/dashboard-2';
  next();
}, dashboardController.getDashboard2);
router.get('/dashboard-3', (req, res, next) => {
  req.session.lastDashboard = '/dashboard-3';
  next();
}, dashboardController.getDashboard3);

// Services routes
router.get('/services', servicesController.getServices);
router.get('/services/new', servicesController.newServicePage);
router.get('/services/categories', servicesController.getCategories);
router.get('/services/filter', servicesController.filterPage);
router.get('/services/categories/:categoryId', servicesController.getSubCategory);
router.get('/services/categories/:categoryId/items/:itemId', servicesController.getCategoryItemServices);
router.get('/services/service/:serviceId', servicesController.getService);
router.get('/services/service/:serviceId/user-need', servicesController.getUserNeed);
router.get('/services/service-lines/:slid', servicesController.getServiceLineDetail);
router.get('/services/service/:serviceId/compliance', servicesController.getCompliancePage);
router.get('/services/service/:serviceId/taxonomy', servicesController.getTaxonomyPage);
router.get('/services/service/:serviceId/assurance', servicesController.getAssurancePage);

// Edit service routes
router.get('/services/service/:serviceId/edit', servicesController.getEditService);
router.post('/services/service/:serviceId/edit', servicesController.postEditService);

// Multi-section edit routes
router.get('/services/service/:serviceId/edit/taxonomy', servicesController.getEditTaxonomy);
router.post('/services/service/:serviceId/edit/taxonomy', servicesController.postEditTaxonomy);

router.get('/services/service/:serviceId/edit/assurance', servicesController.getEditAssurance);
router.post('/services/service/:serviceId/edit/assurance', servicesController.postEditAssurance);

router.get('/services/service/:serviceId/edit/assessment', servicesController.getEditAssessment);
router.post('/services/service/:serviceId/edit/assessment', servicesController.postEditAssessment);

router.get('/services/service/:serviceId/edit/contacts', servicesController.getEditContacts);
router.post('/services/service/:serviceId/edit/contacts', servicesController.postEditContacts);

router.get('/services/service/:serviceId/edit/metrics', servicesController.getEditMetrics);
router.post('/services/service/:serviceId/edit/metrics', servicesController.postEditMetrics);

// Technical configuration routes
router.get('/services/service/:serviceId/edit/technical', servicesController.getEditTechnical);
router.get('/services/service/:serviceId/edit/cmdb', servicesController.getEditCmdb);
router.post('/services/service/:serviceId/edit/cmdb', servicesController.postEditCmdb);
router.get('/services/service/:serviceId/sync-check', servicesController.getSyncCheck);
router.post('/services/service/:serviceId/update-phase', servicesController.postUpdatePhase);
router.post('/services/service/:serviceId/update-owner', servicesController.postUpdateOwner);

// Categories routes
router.get('/categories', categoriesController.getCategories);
router.get('/categories/:categoryId', categoriesController.getSubCategory);


// API routes
router.get('/api/services', servicesController.getServices);
router.get('/api/services/filtered', servicesController.getFilteredServices);
router.get('/api/categories/:categoryId/items', servicesController.getCategoryItems);
router.get('/api/categories/items/:itemId/services', servicesController.getCategoryItemServices);

router.get('/policy', policyController.index);

// Data schema route
router.get('/data/schema', dataController.getSchemaPage);

// Department routes
router.get('/department', departmentController.index);
router.get('/api/department', departmentController.getDepartmentData);
router.get('/api/department/:division/:stage', departmentController.getDivisionStageServices);

// New service routes
router.get('/services/new/check-answers', servicesController.newServiceCheckAnswers);
router.get('/services/new/confirmation', servicesController.newServiceConfirmation);
router.post('/services/new/submit', servicesController.newServiceSubmit);
router.get('/services/new/:step', servicesController.newServiceStep);
router.post('/services/new/:step', servicesController.newServiceStepPost);

// Add the new route
router.get('/reports/services', servicesController.getServicesReport);
router.get('/reports/services/:serviceId', servicesController.getSingleServiceReport);

module.exports = router; 