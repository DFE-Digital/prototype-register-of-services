const removeFilter = (filters, filterToRemove) => {
  const newFilters = { ...filters };
  delete newFilters[filterToRemove];
  return Object.entries(newFilters)
    .filter(([_, value]) => value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
};

const findServiceName = (services, serviceId) => {
  const service = services.find(s => s.id === serviceId);
  return service ? service.name : '';
};

const findById = (items, id) => {
  return items.find(item => item.id === id);
};

const formatDateFilter = (value) => {
  switch (value) {
    case 'overdue':
      return 'Overdue';
    case 'next_month':
      return 'Next month';
    case 'next_3_months':
      return 'Next 3 months';
    case 'next_6_months':
      return 'Next 6 months';
    default:
      return value;
  }
};



function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    // not a number – just return as-is
    return value;
  }

  const abs = Math.abs(num);

  // Millions
  if (abs >= 1_000_000) {
    // one decimal, but drop trailing .0
    const result = (num / 1_000_000)
      .toFixed(1)
      .replace(/\.0$/, '');
    return `${result}M`;
  }

  // Thousands
  if (abs >= 1_000) {
    const result = (num / 1_000)
      .toFixed(1)
      .replace(/\.0$/, '');
    return `${result}K`;
  }

  // Under 1,000: commas, no decimals
  return num.toLocaleString('en-GB', {
    maximumFractionDigits: 0
  });
}

const servicesData = require('./data/services.json');
const taxonomyData = require('./data/taxonomy.json');

// Get all service patterns
function getServicePatterns() {
  return taxonomyData.service_patterns;
}

// Get all user groups
function getUserGroups() {
  return taxonomyData.user_groups;
}

// Get service pattern by ID
function getServicePatternById(id) {
  return taxonomyData.service_patterns.find(pattern => pattern.id === id);
}

// Get user group by ID
function getUserGroupById(id) {
  return taxonomyData.user_groups.find(group => group.id === id);
}

// Get services by pattern
function getServicesByPattern(patternId) {
  return servicesData.services.filter(service => 
    service.service_patterns.includes(patternId)
  );
}

// Get services by user group
function getServicesByUserGroup(userGroupId) {
  return servicesData.services.filter(service => 
    service.user_groups.includes(userGroupId)
  );
}

// Get service patterns for a service
function getServicePatternsForService(serviceId) {
  const service = servicesData.services.find(s => s.id === serviceId);
  if (!service) return [];
  return service.service_patterns.map(id => getServicePatternById(id));
}

// Get user groups for a service
function getUserGroupsForService(serviceId) {
  const service = servicesData.services.find(s => s.id === serviceId);
  if (!service) return [];
  return service.user_groups.map(id => getUserGroupById(id));
}

module.exports = {
  removeFilter,
  findServiceName,
  findById,
  formatDateFilter,
  formatNumber,
  getServicePatterns,
  getUserGroups,
  getServicePatternById,
  getUserGroupById,
  getServicesByPattern,
  getServicesByUserGroup,
  getServicePatternsForService,
  getUserGroupsForService
}; 