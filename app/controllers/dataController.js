const path = require('path');
const fs = require('fs');

exports.getSchemaPage = (req, res) => {
  const schemaPath = path.join(__dirname, '../common/data/uk_gov_schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  res.render('data/schema', {
    schema,
    example: schema.examples && schema.examples[0] ? JSON.stringify(schema.examples[0], null, 2) : ''
  });
}; 