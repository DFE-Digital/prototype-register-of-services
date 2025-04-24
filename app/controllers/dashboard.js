// Version 1 controllers
const v1 = {
    g_dashboard: (req, res) => {
        res.render('v1/dashboard/index', {
           
        });
    }
};

// Export version controllers
module.exports = {
    v1
};

