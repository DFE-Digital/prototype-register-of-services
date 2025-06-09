const API = require('../models/api');

const servicesController = {
  

    getCategories: async (req, res) => {
        try {
            const api = new API();
            const categories = await api.getCategories();
            
            // Get counts for each category
            const categoryCounts = {};
            for (const category of categories) {
                categoryCounts[category.id] = api.getCategoryItems(category.id)?.length || 0;
            }

            res.render('categories/index', {
                categories: categories,
                categoryCounts: categoryCounts
            });
        } catch (error) {
            console.error('Error in categories controller:', error);
            res.status(500).render('error', {
                message: 'Error loading categories',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    // API endpoints for miller columns
    getCategoryItems: async (req, res) => {
        try {
            const api = new API();
            const categoryId = req.params.categoryId;
            const items = api.getCategoryItems(categoryId);
            
            if (!items || items.length === 0) {
                return res.json([]);
            }

            res.json(items);
        } catch (error) {
            console.error('Error getting category items:', error);
            res.status(500).json({ error: 'Error loading category items' });
        }
    },

    getCategoryItemServices: async (req, res) => {
        try {
            const api = new API();
            const categoryId = req.params.categoryId;
            const itemId = req.params.itemId;
            
            // Get the category details
            const category = api.getCategory(categoryId);
            if (!category) {
                return res.status(404).render('error', {
                    message: 'Category not found',
                    error: null
                });
            }

            // Get the item details
            const items = api.getCategoryItems(categoryId);
            const item = items.find(i => i.id === itemId);
            if (!item) {
                return res.status(404).render('error', {
                    message: 'Category item not found',
                    error: null
                });
            }

            // Get services for this item
            const services = api.getServicesByCategoryItem(itemId);
            const taxonomy = require('../common/data/taxonomy.json');

            res.render('services/services', {
                category: category,
                item: item,
                services: services,
                taxonomy: taxonomy
            });
        } catch (error) {
            console.error('Error in category item services controller:', error);
            res.status(500).render('error', {
                message: 'Error loading services',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getFilteredServices: async (req, res) => {
        try {
            const api = new API();
            const categoryFilters = req.query.categories;
            const services = await api.getServicesByCategories(categoryFilters);
            
            res.json(services);
        } catch (error) {
            console.error('Error getting filtered services:', error);
            res.status(500).json({ error: 'Error loading filtered services' });
        }
    },

    filterPage: async (req, res) => {
        try {
            const api = new API();
            const services = await api.getServices();
            const categories = await api.getCategories();
            
            // Transform categories into array with items
            const categoriesWithItems = categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                description: cat.description,
                items: api.getCategoryItems(cat.id).map(item => ({
                    id: item.id,
                    name: item.name,
                    serviceCount: item.serviceCount
                }))
            }));

            res.render('services/filter', {
                services,
                categories: categoriesWithItems,
                layout: 'layouts/layout'
            });
        } catch (error) {
            console.error('Error in filter page:', error);
            res.status(500).render('error', {
                message: 'Error loading filter page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getSubCategory: async (req, res) => {
        try {
            const api = new API();
            const categoryId = req.params.categoryId;
            
            // Get the category details
            const category = api.getCategory(categoryId);
            if (!category) {
                return res.status(404).render('error', {
                    message: 'Category not found',
                    error: null
                });
            }

            // Get all items for this category
            const items = api.getCategoryItems(categoryId);

            res.render('categories/sub-category', {
                category: category,
                items: items
            });
        } catch (error) {
            console.error('Error in sub-category controller:', error);
            res.status(500).render('error', {
                message: 'Error loading category items',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getService: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            
            // Get the service details
            const service = api.getService(serviceId);
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }

            // Get the taxonomy for mapping IDs to names
            const taxonomy = require('../common/data/taxonomy.json');

            // Get all services and find related services in the same service_line
            const allServices = await api.getServices();
            const related_services = allServices.filter(
                s => s.service_line === service.service_line && s.id !== service.id
            );

            res.render('services/service/index', {
                service: service,
                taxonomy: taxonomy,
                related_services: related_services
            });
        } catch (error) {
            console.error('Error in service controller:', error);
            res.status(500).render('error', {
                message: 'Error loading service',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },
};

module.exports = servicesController; 