const API = require('../models/api');
const XLSX = require('xlsx');
const path = require('path');
const serviceStandards = require('../common/data/service-standards.json');
const servicelines = require('../common/data/servicelines.json');
const newProduct = require('../common/data/new_product.json');
const fs = require('fs');

// Function to read standards from Excel file
const getStandardsFromExcel = () => {
    try {
        const standardsPath = path.join(__dirname, '../common/data/standards.xlsx');
        const workbook = XLSX.readFile(standardsPath);
        const worksheet = workbook.Sheets['Standards']; // Get the Standards sheet
        const standards = XLSX.utils.sheet_to_json(worksheet);
        
        // Transform the data to match the expected format
        return standards.map(standard => ({
            id: standard['Standard ID'],
            name: standard['Title'],
            url: standard['Link'],
            summary: standard['Summary'],
            categories: standard['Categories'],
            subCategories: standard['Sub-categories'],
            owner: standard['Owner'],
            ownerEmail: standard['Owner Email'],
            contact: standard['Contact'],
            contactEmail: standard['Contact Email']
        }));
    } catch (error) {
        console.error('Error reading standards from Excel:', error);
        return [];
    }
};

function updateServiceInJson(serviceId, updatedData) {
    const servicesPath = path.join(__dirname, '../common/data/services.json');
    const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
    const idx = services.findIndex(s => String(s.id) === String(serviceId));
    if (idx === -1) throw new Error('Service not found');
    services[idx] = { ...services[idx], ...updatedData };
    fs.writeFileSync(servicesPath, JSON.stringify(services, null, 2), 'utf8');
    return services[idx];
}

const servicesv2Path = path.join(__dirname, '../common/data/servicesv2.json');
const newProductQuestions = newProduct;

function getNextStep(currentStep, totalSteps) {
    const idx = parseInt(currentStep, 10);
    if (isNaN(idx) || idx < 0 || idx >= totalSteps - 1) return null;
    return idx + 1;
}

function getPrevStep(currentStep) {
    const idx = parseInt(currentStep, 10);
    if (isNaN(idx) || idx <= 0) return null;
    return idx - 1;
}

const getAnswersFromSession = req => req.session && req.session.newServiceAnswers ? req.session.newServiceAnswers : {};
const setAnswersInSession = (req, answers) => { req.session.newServiceAnswers = answers; };

const servicesController = {
    getServices: async (req, res) => {
        try {
            const api = new API();
            let services = await api.getServices();
            const taxonomy = require('../common/data/taxonomy.json');

            // Helper to always return an array
            const toArray = v => v === undefined ? [] : Array.isArray(v) ? v : [v];

            // Extract filter query params (including sort, sort_dir, show, and page)
            let { SP, UG, SA, PH, CH, TE, LS, EP, PF, q, sort, sort_dir, show, page } = req.query;

            // Parse as arrays for multi-select
            const selected_patterns = toArray(SP);
            const selected_user_groups = toArray(UG);
            const selected_phases = toArray(PH);
            const selected_technologies = toArray(TE);
            const selected_archetypes = toArray(SA);
            const selected_channels = toArray(CH);
            const selected_portfolios = toArray(PF);
            // If you have filters for life stages and education phases, add:
            const selected_life_stages = toArray(LS);
            const selected_education_phases = toArray(EP);
            // Service lines and owners remain as before
            const selected_service_lines = toArray(req.query.service_line);
            const selected_owners = toArray(req.query.owner);

            // Set defaults
            show = 15;
            sort = sort || 'name';
            sort_dir = sort_dir === 'desc' ? 'desc' : 'asc';
            page = page && !isNaN(parseInt(page, 10)) ? parseInt(page, 10) : 1;

            // Filtering logic (multi-value support)
            if (selected_portfolios.length) {
                services = services.filter(service => selected_portfolios.includes(service.portfolio));
            }
            if (selected_patterns.length) {
                services = services.filter(service => {
                    const cat = service.categories.find(c => c.type === 'service_patterns');
                    return cat && cat.values && selected_patterns.some(val => cat.values.includes(val));
                });
            }
            if (selected_user_groups.length) {
                services = services.filter(service => {
                    const cat = service.categories.find(c => c.type === 'user_groups');
                    return cat && cat.values && selected_user_groups.some(val => cat.values.includes(val));
                });
            }
            if (selected_phases.length) {
                services = services.filter(service => {
                    const cat = service.categories.find(c => c.type === 'phases');
                    return cat && cat.values && selected_phases.some(val => cat.values.includes(val));
                });
            }
            if (selected_technologies.length) {
                services = services.filter(service => {
                    const cat = service.categories.find(c => c.type === 'technologies');
                    return cat && cat.values && selected_technologies.some(val => cat.values.includes(val));
                });
            }
            if (selected_archetypes.length) {
                services = services.filter(service => {
                    const cat = service.categories.find(c => c.type === 'service_archetypes');
                    return cat && cat.values && selected_archetypes.some(val => cat.values.includes(val));
                });
            }
            if (selected_channels.length) {
                services = services.filter(service => {
                    const cat = service.categories.find(c => c.type === 'channels');
                    return cat && cat.values && selected_channels.some(val => cat.values.includes(val));
                });
            }
            if (selected_life_stages && selected_life_stages.length) {
                services = services.filter(service => {
                    const cat = service.categories.find(c => c.type === 'life_stages');
                    return cat && cat.values && selected_life_stages.some(val => cat.values.includes(val));
                });
            }
            if (selected_education_phases && selected_education_phases.length) {
                services = services.filter(service => {
                    const cat = service.categories.find(c => c.type === 'education_phases');
                    return cat && cat.values && selected_education_phases.some(val => cat.values.includes(val));
                });
            }
            if (selected_service_lines.length) {
                services = services.filter(service => selected_service_lines.includes(service.service_line_id));
            }
            if (selected_owners.length) {
                services = services.filter(service => selected_owners.includes(service.service_owner));
            }
            if (q) {
                const qLower = q.toLowerCase();

                // Build a lookup for all taxonomy values
                const taxonomyLookups = {};
                for (const [type, group] of Object.entries(taxonomy)) {
                    if (group.items) {
                        taxonomyLookups[type] = {};
                        for (const item of group.items) {
                            taxonomyLookups[type][item.id] = item.name.toLowerCase();
                        }
                    }
                }

                services = services.filter(service => {
                    // Name/description match
                    if (
                        (service.name && service.name.toLowerCase().includes(qLower)) ||
                        (service.description && service.description.toLowerCase().includes(qLower))
                    ) {
                        return true;
                    }
                    // Category label match
                    for (const cat of (service.categories || [])) {
                        const lookup = taxonomyLookups[cat.type];
                        if (lookup) {
                            for (const val of cat.values || []) {
                                if (lookup[val] && lookup[val].includes(qLower)) {
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                });
            }

            // Sort services (if sort query param is provided)
            if (sort) {
                let compareFn;
                if (sort === "name") {
                    compareFn = (a, b) => (a.name || "").localeCompare(b.name || "");
                } else if (sort === "business") {
                    compareFn = (a, b) => (a.business_area || "").localeCompare(b.business_area || "");
                } else if (sort === "phase") {
                    compareFn = (a, b) => {
                        const aPhase = a.categories.find(c => c.type === "phases")?.values?.[0] || "";
                        const bPhase = b.categories.find(c => c.type === "phases")?.values?.[0] || "";
                        return aPhase.localeCompare(bPhase);
                    };
                }
                if (compareFn) {
                    services.sort(compareFn);
                    if (sort_dir === 'desc') {
                        services.reverse();
                    }
                }
            }

            // Pagination logic
            const totalServices = services.length;
            const totalPages = Math.ceil(totalServices / show);
            const startIdx = (page - 1) * show;
            const endIdx = startIdx + show;
            const pagedServices = services.slice(startIdx, endIdx);

            // --- BEGIN SUMMARY AGGREGATION ---
            function aggregateByCategory(services, type) {
                const counts = {};
                services.forEach(service => {
                    const cat = service.categories.find(c => c.type === type);
                    if (cat && cat.values) {
                        cat.values.forEach(val => {
                            counts[val] = (counts[val] || 0) + 1;
                        });
                    }
                });
                return counts;
            }
            function aggregateByField(services, field) {
                const counts = {};
                services.forEach(service => {
                    const val = service[field];
                    if (val) {
                        counts[val] = (counts[val] || 0) + 1;
                    }
                });
                return counts;
            }
            // Taxonomy-based
            const userGroups = aggregateByCategory(services, 'user_groups');
            const technologies = aggregateByCategory(services, 'technologies');
            const lifeStages = aggregateByCategory(services, 'life_stages');
            const educationPhases = aggregateByCategory(services, 'education_phases');
            const servicePatterns = aggregateByCategory(services, 'service_patterns');
            const serviceArchetypes = aggregateByCategory(services, 'service_archetypes');
            const channels = aggregateByCategory(services, 'channels');
            const phasesAgg = aggregateByCategory(services, 'phases');
            const policies = aggregateByCategory(services, 'policy');
            // Service-based
            const serviceLines = aggregateByField(services, 'service_line_id');
            // Business areas from servicelines
            const businessAreas = {};
            Object.keys(serviceLines).forEach(slid => {
                const sl = servicelines.service_lines.find(l => l.id === slid);
                if (sl && sl.business_area) {
                    businessAreas[sl.business_area] = (businessAreas[sl.business_area] || 0) + serviceLines[slid];
                }
            });
            // Missions and pillars
            const missionsAgg = {};
            const pillarsAgg = {};
            services.forEach(service => {
                if (service.mission && service.mission.missionId) {
                    missionsAgg[service.mission.missionId] = (missionsAgg[service.mission.missionId] || 0) + 1;
                }
                if (service.mission && service.mission.pillarId) {
                    pillarsAgg[service.mission.pillarId] = (pillarsAgg[service.mission.pillarId] || 0) + 1;
                }
            });
            // --- EXEC SUMMARY (simple version) ---
            function getTopKeys(counts, taxonomyItems, n=3) {
                return Object.entries(counts)
                    .sort((a,b) => b[1]-a[1])
                    .slice(0,n)
                    .map(([id, count]) => {
                        const item = taxonomyItems.find(i => i.id === id);
                        return item ? item.name : id;
                    });
            }
            let execSummary = '';
            if (services.length > 0) {
                execSummary = `There are ${services.length} services matching your filters. `;
                const topGroups = getTopKeys(userGroups, taxonomy.user_groups.items);
                if (topGroups.length) execSummary += `Most services are aimed at: ${topGroups.join(', ')}. `;
                const topPatterns = getTopKeys(servicePatterns, taxonomy.service_patterns.items);
                if (topPatterns.length) execSummary += `Common user actions include: ${topPatterns.join(', ')}. `;
                const topTech = getTopKeys(technologies, taxonomy.technology.items);
                if (topTech.length) execSummary += `Key technologies: ${topTech.join(', ')}. `;
                const topLines = getTopKeys(serviceLines, servicelines.service_lines);
                if (topLines.length) execSummary += `Main service lines: ${topLines.join(', ')}. `;
            }
            // --- END SUMMARY AGGREGATION ---

            // Build baseQueryString (all query params except page)
            const query = { ...req.query };
            delete query.page;
            const baseQueryString = Object.entries(query)
              .map(([k, v]) => Array.isArray(v) ? v.map(val => `${encodeURIComponent(k)}=${encodeURIComponent(val)}`).join('&') : `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
              .join('&');

            // Pass selected filter values (and sort/show/page) to template
            res.render('services/index', {
                services: pagedServices,
                taxonomy: taxonomy,
                servicelines: servicelines,
                selected_patterns,
                selected_user_groups,
                selected_phases,
                selected_technologies,
                selected_archetypes,
                selected_channels,
                selected_service_lines,
                selected_owners,
                selected_portfolios,
                selected_education_phases,
                // For backward compatibility (single value)
                selected_pattern: SP || '',
                selected_user_group: UG || '',
                selected_phase: PH || '',
                selected_technology: TE || '',
                selected_archetype: SA || '',
                selected_channel: CH || '',
                query: q || '',
                sort: sort || '',
                sort_dir: sort_dir,
                show: show,
                page: page,
                totalPages: totalPages,
                totalServices: totalServices,
                baseQueryString: baseQueryString,
                queryParams: req.query,
                summary: {
                    userGroups, technologies, lifeStages, educationPhases, servicePatterns, serviceArchetypes, channels, phases: phasesAgg, policies,
                    serviceLines, businessAreas, missions: missionsAgg, pillars: pillarsAgg
                },
                execSummary
            });
        } catch (error) {
            console.error('Error in services controller:', error);
            if (req.path.startsWith('/api/')) {
                res.status(500).json({ error: 'Error loading services' });
            } else {
                res.status(500).render('error', {
                    message: 'Error loading services',
                    error: process.env.NODE_ENV === 'development' ? error : null
                });
            }
        }
    },

    getCategories: async (req, res) => {
        try {
            const api = new API();
            const categories = await api.getCategories();
            
            // Get counts for each category
            const categoryCounts = {};
            for (const category of categories) {
                categoryCounts[category.id] = api.getCategoryItems(category.id)?.length || 0;
            }

            res.render('services/categories', {
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

            res.render('services/sub-category', {
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

            // Map category values to flat arrays for template use
            function extractCategoryValues(service, type) {
                const cat = service.categories.find(c => c.type === type);
                return cat && cat.values ? cat.values : [];
            }
            service.userGroup = extractCategoryValues(service, 'user_groups');
            service.servicePattern = extractCategoryValues(service, 'service_patterns');
            service.technology = extractCategoryValues(service, 'technologies');
            service.policy = extractCategoryValues(service, 'policy_areas');

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

    getUserNeed: async (req, res) => {
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

            res.render('services/service/user-need', {
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

    getServiceLineDetail: async (req, res) => {
        try {
            const api = new API();
            const slid = req.params.slid;
            const serviceLine = api.getServiceLine(slid);
            if (!serviceLine) {
                return res.status(404).render('error', {
                    message: 'Service line not found',
                    error: process.env.NODE_ENV === 'development' ? {} : null
                });
            }
            const services = api.getServicesByServiceLine(slid);
            const taxonomy = require('../common/data/taxonomy.json');
            res.render('services/service-lines/detail', {
                serviceLine,
                services,
                taxonomy
            });
        } catch (error) {
            console.error('Error in service line detail controller:', error);
            res.status(500).render('error', {
                message: 'Error loading service line',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getCompliancePage: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const api = new API();
            const service = api.getService(serviceId);
            const service_compliance = serviceStandards.find(s => s.service_id == serviceId);
            const standards = getStandardsFromExcel(); 

            // Add DDTS- prefix to all Excel standard IDs for matching
            standards.forEach(s => {
                s.id = String(s.id);
                if (!s.id.startsWith('DDTS-')) {
                    s.id = `DDTS-${s.id}`;
                }
            });


            const taxonomy = require('../common/data/taxonomy.json');
            
            // Log the standards for debugging
            console.log('Loaded standards from Excel:', standards.length);
            console.log('Service compliance:', service_compliance);
            res.render('services/service/compliance', {
                service,
                standards,
                taxonomy,
                service_compliance: service_compliance || { standards: [] }
            });
        } catch (error) {
            console.error('Error loading compliance page:', error);
            res.status(500).render('error', {
                message: 'Error loading compliance page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getTaxonomyPage: async (req, res) => {
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

            // Map category values to flat arrays for template use
            function extractCategoryValues(service, type) {
                const cat = service.categories.find(c => c.type === type);
                return cat && cat.values ? cat.values : [];
            }
            service.userGroup = extractCategoryValues(service, 'user_groups');
            service.servicePattern = extractCategoryValues(service, 'service_patterns');
            service.technology = extractCategoryValues(service, 'technologies');
            service.policy = extractCategoryValues(service, 'policy_areas');
            service.channels = extractCategoryValues(service, 'channels');
            service.policy = extractCategoryValues(service, 'policy');
            const serviceLine = api.getServiceLine(service.service_line_id);

            // Get the taxonomy for mapping IDs to names
            const taxonomy = require('../common/data/taxonomy.json');

            // Get all services and find related services in the same service_line
            const allServices = await api.getServices();
            const related_services = allServices.filter(
                s => s.service_line === service.service_line && s.id !== service.id
            );

            res.render('services/service/taxonomy', {
                service: service,
                taxonomy: taxonomy,
                related_services: related_services,
                serviceLine: serviceLine
            });
        } catch (error) {
            console.error('Error in service controller:', error);
            res.status(500).render('error', {
                message: 'Error loading service',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getAssurancePage: async (req, res) => {
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
            // Get the taxonomy for mapping IDs to names (if needed)
            const taxonomy = require('../common/data/taxonomy.json');
            // Get all services and find related services in the same service_line
            const allServices = await api.getServices();
            const related_services = allServices.filter(
                s => s.service_line === service.service_line && s.id !== service.id
            );
            res.render('services/service/assurance', {
                service: service,
                taxonomy: taxonomy,
                related_services: related_services
            });
        } catch (error) {
            console.error('Error in assurance controller:', error);
            res.status(500).render('error', {
                message: 'Error loading assurance page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getEditService: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const servicesPath = path.join(__dirname, '../common/data/services.json');
            const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
            const service = services.find(s => String(s.id) === String(serviceId));
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }
            function extractCategoryValues(service, type) {
                const cat = service.categories.find(c => c.type === type);
                return cat && cat.values ? cat.values : [];
            }
            service.userGroup = extractCategoryValues(service, 'user_groups');
            service.servicePattern = extractCategoryValues(service, 'service_patterns');
            service.technology = extractCategoryValues(service, 'technologies');
            service.policy = extractCategoryValues(service, 'policy_areas');

            const taxonomy = require('../common/data/taxonomy.json');
            const servicelines = require('../common/data/servicelines.json');

            res.render('services/service/edit', {
                service,
                taxonomy,
                servicelines
            });
        } catch (error) {
            console.error('Error loading edit service page:', error);
            res.status(500).render('error', {
                message: 'Error loading edit service page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    postEditService: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            updateServiceInJson(serviceId, req.body);
            res.redirect(`/services/service/${serviceId}`);
        } catch (error) {
            console.error('Error saving service:', error);
            res.status(500).render('error', {
                message: 'Error saving service',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getEditTaxonomy: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const servicesPath = path.join(__dirname, '../common/data/services.json');
            const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
            const service = services.find(s => String(s.id) === String(serviceId));
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }
            // Always extract arrays for template
            function extractCategoryValues(service, type) {
                const cat = service.categories.find(c => c.type === type);
                return cat && cat.values ? cat.values : [];
            }
            service.userGroup = extractCategoryValues(service, 'user_groups');
            service.servicePattern = extractCategoryValues(service, 'service_patterns');
            service.technology = extractCategoryValues(service, 'technologies');
            service.policy = extractCategoryValues(service, 'policy_areas');

            const taxonomy = require('../common/data/taxonomy.json');
            res.render('services/service/edit_taxonomy', { service, taxonomy });
        } catch (error) {
            console.error('Error loading edit taxonomy page:', error);
            res.status(500).render('error', {
                message: 'Error loading edit taxonomy page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },
    postEditTaxonomy: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const servicesPath = path.join(__dirname, '../common/data/services.json');
            const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
            const idx = services.findIndex(s => String(s.id) === String(serviceId));
            if (idx === -1) throw new Error('Service not found');
            const service = services[idx];

            // Helper to ensure array
            const toArray = v => v === undefined ? [] : Array.isArray(v) ? v : [v];

            // Update categories for each taxonomy type
            const taxonomyTypes = [
                { type: 'user_groups', field: 'userGroup' },
                { type: 'service_patterns', field: 'servicePattern' },
                { type: 'technologies', field: 'technology' },
                { type: 'policy_areas', field: 'policy' }
            ];

            taxonomyTypes.forEach(({ type, field }) => {
                const values = toArray(req.body[field]);
                let cat = service.categories.find(c => c.type === type);
                if (cat) {
                    cat.values = values;
                } else if (values.length) {
                    service.categories.push({ type, values });
                }
            });

            fs.writeFileSync(servicesPath, JSON.stringify(services, null, 2), 'utf8');
            res.redirect(`/services/service/${serviceId}/edit/taxonomy`);
        } catch (error) {
            console.error('Error saving taxonomy:', error);
            res.status(500).render('error', {
                message: 'Error saving taxonomy',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getEditAssurance: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const servicesPath = path.join(__dirname, '../common/data/services.json');
            const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
            const service = services.find(s => String(s.id) === String(serviceId));
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }
            res.render('services/service/edit_assurance', { service });
        } catch (error) {
            console.error('Error loading edit assurance page:', error);
            res.status(500).render('error', {
                message: 'Error loading edit assurance page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },
    postEditAssurance: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            updateServiceInJson(serviceId, req.body);
            res.redirect(`/services/service/${serviceId}/edit/assurance`);
        } catch (error) {
            console.error('Error saving assurance:', error);
            res.status(500).render('error', {
                message: 'Error saving assurance',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getEditAssessment: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const servicesPath = path.join(__dirname, '../common/data/services.json');
            const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
            const service = services.find(s => String(s.id) === String(serviceId));
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }
            res.render('services/service/edit_assessment', { service });
        } catch (error) {
            console.error('Error loading edit assessment page:', error);
            res.status(500).render('error', {
                message: 'Error loading edit assessment page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },
    postEditAssessment: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            updateServiceInJson(serviceId, req.body);
            res.redirect(`/services/service/${serviceId}/edit/assessment`);
        } catch (error) {
            console.error('Error saving assessment:', error);
            res.status(500).render('error', {
                message: 'Error saving assessment',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getEditContacts: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const servicesPath = path.join(__dirname, '../common/data/services.json');
            const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
            const service = services.find(s => String(s.id) === String(serviceId));
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }
            res.render('services/service/edit_contacts', { service });
        } catch (error) {
            console.error('Error loading edit contacts page:', error);
            res.status(500).render('error', {
                message: 'Error loading edit contacts page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },
    postEditContacts: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            updateServiceInJson(serviceId, req.body);
            res.redirect(`/services/service/${serviceId}/edit/contacts`);
        } catch (error) {
            console.error('Error saving contacts:', error);
            res.status(500).render('error', {
                message: 'Error saving contacts',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getEditMetrics: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const servicesPath = path.join(__dirname, '../common/data/services.json');
            const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
            const service = services.find(s => String(s.id) === String(serviceId));
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }
            // Extract metrics for the form
            function getPerformanceValue(service, type) {
                if (!service.performanceData || !Array.isArray(service.performanceData.items)) return '';
                const item = service.performanceData.items.find(i => i.type === type);
                return item ? item.value : '';
            }
            service.user_satisfaction = getPerformanceValue(service, 'user_satisfaction');
            service.availability = getPerformanceValue(service, 'service_availability');
            res.render('services/service/edit_metrics', { service });
        } catch (error) {
            console.error('Error loading edit metrics page:', error);
            res.status(500).render('error', {
                message: 'Error loading edit metrics page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },
    postEditMetrics: async (req, res) => {
        try {
            const serviceId = req.params.serviceId;
            const servicesPath = path.join(__dirname, '../common/data/services.json');
            const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
            const idx = services.findIndex(s => String(s.id) === String(serviceId));
            if (idx === -1) throw new Error('Service not found');
            const service = services[idx];
            // Ensure performanceData structure
            if (!service.performanceData) service.performanceData = { items: [] };
            if (!Array.isArray(service.performanceData.items)) service.performanceData.items = [];
            // Helper to update or add metric
            function setMetric(type, value) {
                let item = service.performanceData.items.find(i => i.type === type);
                if (item) {
                    item.value = value;
                } else {
                    service.performanceData.items.push({ type, value });
                }
            }
            setMetric('user_satisfaction', req.body.user_satisfaction);
            setMetric('service_availability', req.body.availability);
            fs.writeFileSync(servicesPath, JSON.stringify(services, null, 2), 'utf8');
            res.redirect(`/services/service/${serviceId}/edit/metrics`);
        } catch (error) {
            console.error('Error saving metrics:', error);
            res.status(500).render('error', {
                message: 'Error saving metrics',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getEditTechnical: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            const service = api.getService(serviceId);
            
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }

            res.render('services/service/edit_technical', {
                service,
                nav: 'technical',
                x: new Date() // For the timestamp
            });
        } catch (error) {
            console.error('Error loading edit technical page:', error);
            res.status(500).render('error', {
                message: 'Error loading edit technical page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getEditCmdb: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            const service = api.getService(serviceId);
            
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }

            res.render('services/service/edit_cmdb', {
                service,
                nav: 'technical'
            });
        } catch (error) {
            console.error('Error loading edit CMDB page:', error);
            res.status(500).render('error', {
                message: 'Error loading edit CMDB page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    postEditCmdb: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            const cmdbId = req.body.cmdbId;

            await api.updateService(serviceId, {
                otherIds: {
                    cmdb: cmdbId
                }
            });

            res.redirect(`/services/service/${serviceId}/edit/technical`);
        } catch (error) {
            console.error('Error updating CMDB ID:', error);
            res.status(500).render('error', {
                message: 'Error updating CMDB ID',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    getSyncCheck: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            
            // Get the service details
            const service = await api.getService(serviceId);
            if (!service) {
                return res.status(404).render('error', {
                    message: 'Service not found',
                    error: null
                });
            }

            // In a real implementation, this would fetch the CMDB data
            // For the prototype, we'll simulate differences
            const cmdbData = {
                phase: {
                    'Public Beta': 'Private Beta',
                    'Private Beta': 'Alpha',
                    'Alpha': 'Discovery',
                    'Live': 'Alpha'
                }[service.phase] || 'Unknown',
                owner: service.owner ? {
                    'Jane Smith': 'John Smith',
                    'John Smith': 'Sarah Jones',
                    'Sarah Jones': 'Michael Brown',
                    'Michael Brown': 'Emma Wilson'
                }[service.owner.name] || 'Unknown' : 'Unknown'
            };

            res.render('services/service/sync_check', {
                service,
                cmdbData,
                x: new Date() // For the timestamp
            });
        } catch (error) {
            console.error('Error in sync check:', error);
            res.status(500).render('error', {
                message: 'Error checking CMDB sync',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    postUpdatePhase: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            const phase = req.body.phase;

            // In a real implementation, this would update the CMDB
            // For the prototype, we'll just redirect back to the sync check
            res.redirect(`/services/service/${serviceId}/sync-check`);
        } catch (error) {
            console.error('Error updating CMDB phase:', error);
            res.status(500).render('error', {
                message: 'Error updating CMDB phase',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    postUpdateOwner: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            const owner = req.body.owner;
            const email = req.body.email;

            // In a real implementation, this would update the CMDB
            // For the prototype, we'll just redirect back to the sync check
            res.redirect(`/services/service/${serviceId}/sync-check`);
        } catch (error) {
            console.error('Error updating CMDB owner:', error);
            res.status(500).render('error', {
                message: 'Error updating CMDB owner',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    newServicePage: async (req, res) => {


        try {
            res.render('services/service/new', {
                questions: newProduct
            });
        } catch (error) {
            console.error('Error rendering new service page:', error);
            res.status(500).render('error', {
                message: 'Error rendering new service page',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },

    newServiceStep: (req, res) => {
        const step = parseInt(req.params.step, 10);
        const questions = newProductQuestions;
        if (isNaN(step) || step < 0 || step >= questions.length) {
            return res.redirect('/services/new/0');
        }
        const question = questions[step];
        const answers = getAnswersFromSession(req);
        const value = answers['q' + step] || '';
        const errors = req.session.newServiceErrors || null;
        req.session.newServiceErrors = null;
        res.render('services/service/new_question', {
            step,
            totalSteps: questions.length,
            question,
            value,
            errors,
            prevStep: getPrevStep(step),
            nextStep: getNextStep(step, questions.length)
        });
    },

    newServiceStepPost: (req, res) => {
        const step = parseInt(req.params.step, 10);
        const questions = newProductQuestions;
        console.log('Step navigation debug:', {
            step,
            stepType: typeof step,
            questionsLength: questions.length,
            isLastStep: step === questions.length - 1,
            rawStep: req.params.step
        });
        
        if (isNaN(step) || step < 0 || step >= questions.length) {
            console.log('Invalid step, redirecting to 0');
            return res.redirect('/services/new/0');
        }
        const question = questions[step];
        let value = req.body['q' + step];
        let errors = [];
        if (question.required && (!value || (Array.isArray(value) && value.length === 0))) {
            errors.push({ text: 'This field is required', href: '#q' + step });
        }
        if (errors.length) {
            req.session.newServiceErrors = errors;
            return res.redirect('/services/new/' + step);
        }
        // Store answer
        let answers = getAnswersFromSession(req);
        answers['q' + step] = value;
        setAnswersInSession(req, answers);
        // Next or check answers
        if (step < questions.length - 1) {
            console.log('Going to next step:', step + 1);
            return res.redirect('/services/new/' + (step + 1));
        } else {
            console.log('Going to check answers');
            return res.redirect('/services/new/check-answers');
        }
    },

    newServiceCheckAnswers: (req, res) => {
        const questions = newProductQuestions;
        const answers = getAnswersFromSession(req);
        res.render('services/service/new_check_answers', {
            questions,
            answers
        });
    },

    newServiceSubmit: (req, res) => {
        const questions = newProductQuestions;
        const answers = getAnswersFromSession(req);
        // Map answers to taxonomy values if needed (placeholder, can be expanded)
        let newEntry = { id: 1 };
        try {
            // Read current file
            let data = [];
            if (fs.existsSync(servicesv2Path)) {
                const raw = fs.readFileSync(servicesv2Path, 'utf8');
                if (raw.trim()) data = JSON.parse(raw);
            }
            // Incremental ID
            newEntry.id = data.length ? Math.max(...data.map(e => e.id || 0)) + 1 : 1;
            // Store answers by question key
            questions.forEach((q, idx) => {
                newEntry[q.key || ('q' + idx)] = answers['q' + idx];
            });
            data.push(newEntry);
            fs.writeFileSync(servicesv2Path, JSON.stringify(data, null, 2), 'utf8');
            req.session.newServiceAnswers = null;
            res.redirect('/services/new/confirmation');
        } catch (e) {
            console.error('Error writing to servicesv2.json:', e);
            res.status(500).render('error', { message: 'Error saving new service', error: e });
        }
    },

    newServiceConfirmation: (req, res) => {
        res.render('services/service/new_confirmation');
    },

    getServicesReport: async (req, res) => {
        // Load all services from JSON
        const services = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/data/services.json'), 'utf8'));
        res.render('reports/services.html', { services });
    },

    getSingleServiceReport: async (req, res) => {
        const serviceId = req.params.serviceId;
        const services = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/data/services.json'), 'utf8'));
        const service = services.find(s => String(s.id) === String(serviceId));
        if (!service) {
            return res.status(404).render('error', { message: 'Service not found', error: null });
        }
        res.render('reports/service.html', { service });
    },

    getEditUptime: async (req, res) => {
        const serviceId = req.params.serviceId;
        const services = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/data/services.json'), 'utf8'));
        const service = services.find(s => String(s.id) === String(serviceId));
        if (!service) {
            return res.status(404).render('error', { message: 'Service not found', error: null });
        }
        res.render('reports/edit-uptime.html', { service });
    },
    postEditUptime: async (req, res) => {
        const serviceId = req.params.serviceId;
        const { uptime } = req.body;
        const servicesPath = path.join(__dirname, '../common/data/services.json');
        const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
        const idx = services.findIndex(s => String(s.id) === String(serviceId));
        if (idx === -1) {
            return res.status(404).render('error', { message: 'Service not found', error: null });
        }
        // Update uptime value
        if (!services[idx].reporting_metrics) services[idx].reporting_metrics = {};
        if (!services[idx].reporting_metrics.availability_performance) services[idx].reporting_metrics.availability_performance = {};
        services[idx].reporting_metrics.availability_performance.uptime = uptime;
        fs.writeFileSync(servicesPath, JSON.stringify(services, null, 2), 'utf8');
        res.redirect(`/reports/services/${serviceId}`);
    },

    getServiceData: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            const service = api.getService(serviceId);
            if (!service) {
                return res.status(404).render('error', { message: 'Service not found', error: null });
            }
            const taxonomy = require('../common/data/taxonomy.json');
            res.render('services/service/data', { service, taxonomy });
        } catch (error) {
            res.status(500).render('error', { message: 'Error loading service data page', error });
        }
    },

    getServicePeople: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            const service = api.getService(serviceId);
            if (!service) {
                return res.status(404).render('error', { message: 'Service not found', error: null });
            }
            const taxonomy = require('../common/data/taxonomy.json');
            res.render('services/service/people', { service, taxonomy });
        } catch (error) {
            res.status(500).render('error', { message: 'Error loading service people page', error });
        }
    },

    getServiceResources: async (req, res) => {
        try {
            const api = new API();
            const serviceId = req.params.serviceId;
            const service = api.getService(serviceId);
            if (!service) {
                return res.status(404).render('error', { message: 'Service not found', error: null });
            }
            const taxonomy = require('../common/data/taxonomy.json');
            res.render('services/service/resources', { service, taxonomy });
        } catch (error) {
            res.status(500).render('error', { message: 'Error loading service resources page', error });
        }
    },

};

module.exports = servicesController; 