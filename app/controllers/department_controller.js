const fs = require('fs');
const path = require('path');

/**
 * Controller for department-related routes
 */
class DepartmentController {
    /**
     * Get the department index page
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async index(req, res) {
        try {
            // Read the department data from dfe.json
            const dfeData = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, '../common/data/dfe.json'),
                    'utf8'
                )
            );

            // Render the department index page with the data
            res.render('department/index', {
                dfe: dfeData,
                title: 'Department View',
                currentPage: 'department'
            });
        } catch (error) {
            console.error('Error loading department data:', error);
            res.status(500).render('error', {
                message: 'Error loading department data',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }

    /**
     * Get department data as JSON
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getDepartmentData(req, res) {
        try {
            const dfeData = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, '../common/data/dfe.json'),
                    'utf8'
                )
            );
            res.json(dfeData);
        } catch (error) {
            console.error('Error loading department data:', error);
            res.status(500).json({
                error: 'Error loading department data'
            });
        }
    }

    /**
     * Get services for a specific division and stage
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getDivisionStageServices(req, res) {
        try {
            const { division, stage } = req.params;
            const dfeData = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, '../common/data/dfe.json'),
                    'utf8'
                )
            );

            const divisionData = dfeData.department.find(
                d => d.slug === division
            );

            if (!divisionData || !divisionData.stage) {
                return res.status(404).json({
                    error: 'Division or stage not found'
                });
            }

            const stageData = divisionData.stage[0][stage] || [];
            res.json({
                division: divisionData.division,
                stage: stage,
                services: stageData
            });
        } catch (error) {
            console.error('Error loading division stage data:', error);
            res.status(500).json({
                error: 'Error loading division stage data'
            });
        }
    }
}

module.exports = new DepartmentController(); 