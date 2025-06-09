const taxonomy = require('../common/data/taxonomy.json');

exports.index = (req, res) => {
  res.render('insights/index', { taxonomy });
};

exports.youngPeople = (req, res) => {
  res.render('insights/young-people');
}; 