const services = require('../common/data/services.json');
const taxonomy = require('../common/data/taxonomy.json');

class Api {
    constructor(version) {
        this.version = version;
    }

    // Taxonomy endpoints
    getCategories() {
        return Object.entries(taxonomy).map(([key, value]) => ({
            id: value.id,
            name: value.name,
            description: value.description
        }));
    }

    getCategoryItems(categoryId) {
        // Find the taxonomy key for the given categoryId
        const taxonomyKey = Object.keys(taxonomy).find(key => taxonomy[key].id === categoryId);
        if (!taxonomyKey) return [];
        const category = taxonomy[taxonomyKey];
        if (!category) return [];

        // Get all items for this category
        const items = category.items.map(item => {
            // Count services that have this item in their categories for this taxonomyKey
            const serviceCount = services.filter(service => {
                return service.categories.some(cat => {
                    return cat.type === taxonomyKey && cat.values.includes(item.id);
                });
            }).length;

            return {
                id: item.id,
                name: item.name,
                description: item.description,
                serviceCount: serviceCount
            };
        });

        return items;
    }

    getCategory(categoryId) {
        return Object.values(taxonomy).find(cat => cat.id === categoryId);
    }

    // Services endpoints
    getServices() {
        // deep clone
        return services.map(service => JSON.parse(JSON.stringify(service)));
    }

    // New method: get a service line (by slid) from servicelines.json.
    getServiceLine(slid) {
        const servicelines = require("../common/data/servicelines.json");
        const sl = servicelines.service_lines.find(sl => (sl.id === slid));
        return sl ? { ...sl } : (null);
    }

    // New method: get all services (from services.json) whose "service_line_id" equals the given slid.
    getServicesByServiceLine(slid) {
        const filtered = services.filter(service => (service.service_line_id === slid));
        return (filtered.map(service => JSON.parse(JSON.stringify(service))));
    }

    getService(id) {
        return services.find(service => service.id === id);
    }

    getServicesByCategoryItem(itemId) {
        return services
            .filter(service => {
                return service.categories.some(category => {
                    return category.values.includes(itemId);
                });
            })
            .map(service => JSON.parse(JSON.stringify(service))); // deep clone
    }

    getServicesByCategories(categoryFilters) {
        if (!categoryFilters) return services;

        const filters = categoryFilters.split(',');
        
        return services.filter(service => {
            return service.categories.every(category => {
                const categoryType = category.type;
                const categoryValues = category.values;
                
                // Check if any of the filters match this category's values
                return filters.some(filter => {
                    const [type, value] = filter.split('_');
                    const categoryTypeMatch = Object.values(taxonomy)
                        .find(t => t.id === type)?.name.toLowerCase()
                        .replace(/\s+/g, '_') === categoryType;
                    
                    return categoryTypeMatch && categoryValues.includes(filter);
                });
            });
        });
    }
}

module.exports = Api;
