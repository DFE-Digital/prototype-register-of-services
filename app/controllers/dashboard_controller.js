const API = require('../models/api');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dashboardController = {
    index: async (req, res) => {
       
        res.render('index')
    },
    getDashboard1: async (req, res) => {
        try {
            const api = new API();
            const services = await api.getServices();

            // Debug: log all service owners
            console.log('All service owners:', services.map(s => s.service_owner));

            // Robust filter for Bruce Banner (case-insensitive, handle missing fields)
            const filteredServices = services.filter(service =>
                (service.service_owner || '').toLowerCase().trim() === 'bruce banner'
            );

            // Debug: log filtered service names
            console.log('Filtered services:', filteredServices.map(s => s.name));

            // Load taxonomy phases mapping
            const taxonomy = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/data/taxonomy.json')));
            const phases = taxonomy.phases.items.reduce((acc, item) => {
                acc[item.id] = item.name;
                return acc;
            }, {});

            // Debug: log filtered service names
            console.log(filteredServices);

            res.render('dashboard/dashboard-1', {
                services: filteredServices,
                phases: phases
            });
        } catch (error) {
            console.error('Error in dashboard controller:', error);
            res.status(500).render('error', {
                message: 'Error loading dashboard',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    },
    getDashboard2: async (req, res) => {
        try {
            const api = new API();
            const services = await api.getServices();

            // Debug: log all service owners
            console.log('All service owners:', services.map(s => s.service_owner));

            // Robust filter for Bruce Banner (case-insensitive, handle missing fields)
            const filteredServices = services.filter(service =>
                (service.service_owner || '').toLowerCase().trim() === 'bruce banner'
            );

            // Debug: log filtered service names
            console.log('Filtered services:', filteredServices.map(s => s.name));

            // Load taxonomy phases mapping
            const taxonomy = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/data/taxonomy.json')));
            const phases = taxonomy.phases.items.reduce((acc, item) => {
                acc[item.id] = item.name;
                return acc;
            }, {});

            // Debug: log filtered service names
            console.log(filteredServices);

            res.render('dashboard/dashboard-2', {
                services: filteredServices,
                phases: phases
            });
        } catch (error) {
            console.error('Error in dashboard controller:', error);
            res.status(500).render('error', {
                message: 'Error loading dashboard',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    }, 
    getDashboard3: async (req, res) => {
        try {
            const api = new API();
            const services = await api.getServices();
            const taxonomy = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/data/taxonomy.json')));
            const servicelines = require('../common/data/servicelines.json');
            const standardsData = require('../common/data/standards.json');

            // 1. Total number of services
            const totalServices = services.length;

            // 2. Count by phase
            const phaseCounts = {};
            for (const phase of taxonomy.phases.items) {
                phaseCounts[phase.name] = 0;
            }
            services.forEach(service => {
                const phaseId = (service.categories.find(c => c.type === 'phases') || {}).values?.[0];
                const phase = taxonomy.phases.items.find(p => p.id === phaseId);
                if (phase) phaseCounts[phase.name]++;
            });

            // 3. Low compliance (compliance < 60)
            const lowCompliance = services.filter(s => typeof s.compliance === 'number' && s.compliance < 60);

            // 4. Low user satisfaction (user_satisfaction < 60)
            const lowSatisfaction = services.filter(s => typeof s.user_satisfaction === 'number' && s.user_satisfaction < 60);

            // 5. Count by business area
            const businessAreaCounts = {};
            for (const line of servicelines.service_lines) {
                if (line.business_area) businessAreaCounts[line.business_area] = 0;
            }
            services.forEach(service => {
                const line = servicelines.service_lines.find(l => l.id === service.service_line_id);
                if (line && line.business_area) businessAreaCounts[line.business_area]++;
            });

            // --- Monthly reporting completion ---
            // Calculate months
            const now = new Date(2025, 4, 1); // Hardcode to May 2025 for testing
            
            // Last month (April)
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthStr = lastMonth.toISOString().slice(0, 7); // e.g., '2025-04'
            const lastMonthLabel = lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' }); // 'April 2025'
            
            console.log('Debug - Last month string:', lastMonthStr);
            console.log('Debug - Total services:', totalServices);
            
            // Debug first service's monthly reporting data
            if (services.length > 0) {
                const firstService = services[0];
                console.log('Debug - First service monthly reporting:', JSON.stringify(firstService.monthly_reporting, null, 2));
            }
            
            // Count services with monthly reporting for last month
            const lastMonthReportedCount = services.filter(service => {
                if (!service.monthly_reporting?.history) {
                    console.log('Debug - Service missing monthly reporting:', service.name);
                    return false;
                }
                const hasReporting = service.monthly_reporting.history.find(h => {
                    console.log('Debug - Comparing:', h.month, 'with', lastMonthStr, 'status:', h.status);
                    return h.month === lastMonthStr && h.status === 'completed';
                });
                if (hasReporting) {
                    console.log('Debug - Found completed service for', lastMonthStr, ':', service.name);
                }
                return hasReporting;
            }).length;
            
            console.log('Debug - Last month reported count:', lastMonthReportedCount);
            const lastMonthReportingPercent = totalServices > 0 ? Math.round((lastMonthReportedCount / totalServices) * 100) : 0;
            
            // Determine reporting class for last month
            let lastMonthReportingClass = 'dfe-dashboard-reporting-red';
            if (lastMonthReportingPercent >= 80) {
                lastMonthReportingClass = 'dfe-dashboard-reporting-green';
            } else if (lastMonthReportingPercent >= 60) {
                lastMonthReportingClass = 'dfe-dashboard-reporting-amber';
            }
            
            // Generate data for previous 3 months (March, February, January)
            const previousMonths = [];
            for (let i = 2; i <= 4; i++) {  // This will give us March (i=2), February (i=3), January (i=4)
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthStr = monthDate.toISOString().slice(0, 7);
                const monthLabel = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                
                console.log('Debug - Processing month:', monthStr);
                
                // Count services with completed reporting for this month
                const monthReportedCount = services.filter(service => {
                    const hasReporting = service.monthly_reporting?.history?.find(h => 
                        h.month === monthStr && h.status === 'completed'
                    );
                    if (hasReporting) {
                        console.log('Debug - Found completed service for', monthStr, ':', service.name);
                    }
                    return hasReporting;
                }).length;
                
                console.log('Debug - Month reported count for', monthStr, ':', monthReportedCount);
                const monthReportingPercent = totalServices > 0 ? Math.round((monthReportedCount / totalServices) * 100) : 0;
                
                let reportingClass = 'dfe-dashboard-reporting-red';
                if (monthReportingPercent >= 80) {
                    reportingClass = 'dfe-dashboard-reporting-green';
                } else if (monthReportingPercent >= 60) {
                    reportingClass = 'dfe-dashboard-reporting-amber';
                }
                
                previousMonths.push({
                    label: monthLabel,
                    reportingPercent: monthReportingPercent,
                    reportingClass: reportingClass,
                    reportedCount: monthReportedCount,
                    totalServices: totalServices
                });
            }

            res.render('dashboard/dashboard-3', {
                totalServices,
                phaseCounts,
                lowCompliance,
                lowSatisfaction,
                businessAreaCounts,
                reportingPercent: lastMonthReportingPercent,
                reportedCount: lastMonthReportedCount,
                prevMonthLabel: lastMonthLabel,
                reportingClass: lastMonthReportingClass,
                previousMonths,
                standards: standardsData.standards
            });
        } catch (error) {
            console.error('Error in dashboard controller:', error);
            res.status(500).render('error', {
                message: 'Error loading dashboard',
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
    }
};

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

module.exports = dashboardController; 