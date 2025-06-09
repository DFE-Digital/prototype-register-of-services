const path = require('path');
const government = require('../common/data/government.json');
const services = require('../common/data/services.json');
const taxonomy = require('../common/data/taxonomy.json');
const servicelines = require('../common/data/servicelines.json');

module.exports = {
  index: (req, res) => {
    // Flatten all priorities from all missions/pillars
    let priorities = [];
    government.missions.forEach(mission => {
      if (mission.pillars) {
        mission.pillars.forEach(pillar => {
          if (pillar.priorities) {
            pillar.priorities.forEach(priority => {
              // Add mission and pillar info to each priority
              priorities.push({
                ...priority,
                missionId: mission.id,
                missionName: mission.name,
                pillarId: pillar.id,
                pillarName: pillar.name,
                pillarIndex: pillar.index || pillar.id.split('_')[1],
                services: [] // Initialize empty services array
              });
            });
          }
        });
      }
    });

    const selectedPriorityId = req.query.priority;
    let selectedPriority = null;
    let selectedPillar = null;
    let taxonomySummary = null;

    if (selectedPriorityId) {
      // Find the selected priority
      selectedPriority = priorities.find(p => p.id === selectedPriorityId);
      
      if (selectedPriority) {
        // Find matching services for this priority using mission.priorityId
        selectedPriority.services = services.filter(service => 
          service.mission && service.mission.priorityId === selectedPriorityId
        );

        // Find the parent pillar
        selectedPillar = government.missions
          .flatMap(m => m.pillars || [])
          .find(p => p.id === selectedPriority.pillarId);

        // Optionally, build a taxonomy summary for the selected priority's services
        taxonomySummary = {};
        selectedPriority.services.forEach(service => {
          (service.categories || []).forEach(category => {
            if (!taxonomySummary[category.type]) taxonomySummary[category.type] = [];
            category.values.forEach(val => {
              if (!taxonomySummary[category.type].includes(val)) {
                taxonomySummary[category.type].push(val);
              }
            });
          });
        });
      }
    } else if (req.query.pillar) {
      // If only a pillar is selected, find it
      selectedPillar = government.missions
        .flatMap(m => m.pillars || [])
        .find(p => p.id === req.query.pillar);
    }

    // Create a mapping of taxonomy IDs to names
    const taxonomyMap = {};
    Object.entries(taxonomy).forEach(([category, data]) => {
      if (data.items) {
        taxonomyMap[category] = {};
        data.items.forEach(item => {
          taxonomyMap[category][item.id] = item.name;
        });
      }
    });

    res.render('policy/index', {
      missions: government.missions,
      selectedPriority,
      selectedPillar,
      taxonomyMap,
      servicelines,
      taxonomy, // This is the full taxonomy.json object
      taxonomySummary // This is the summary of taxonomy values for the selected priority's services
    });
  }
}; 