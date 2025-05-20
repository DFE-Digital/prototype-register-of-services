// Get the service ID from the URL
const serviceId = window.location.pathname.split('/').pop();
console.log('Service ID:', serviceId);

// Find the service in the services array
const service = services.services.find(s => s.slug === serviceId);
console.log('Found service:', service);

if (service) {
    // Update the page title
    document.title = `${service.name} - Register of services`;

    // Update the service name
    const serviceName = document.getElementById('service-name');
    if (serviceName) {
        serviceName.textContent = service.name;
    }

    // Update the service description
    const serviceDescription = document.getElementById('service-description');
    if (serviceDescription && service.description) {
        serviceDescription.textContent = service.description;
    }

    // Update the service phase
    const servicePhase = document.getElementById('service-phase');
    if (servicePhase && service.phase) {
        servicePhase.textContent = service.phase;
    }

    // Update the service organisation
    const serviceOrganisation = document.getElementById('service-organisation');
    if (serviceOrganisation && service.organisation) {
        serviceOrganisation.textContent = Array.isArray(service.organisation) 
            ? service.organisation.join(', ') 
            : service.organisation;
    }

    // Update the service channels
    const serviceChannels = document.getElementById('service-channels');
    if (serviceChannels && service.channels) {
        serviceChannels.textContent = Array.isArray(service.channels) 
            ? service.channels.join(', ') 
            : service.channels;
    }

    // Update the service live service URL
    const serviceLiveService = document.getElementById('service-live-service');
    if (serviceLiveService && service.liveservice) {
        serviceLiveService.href = service.liveservice;
        serviceLiveService.textContent = service.liveservice;
    }

    // Update the service start page URL
    const serviceStartPage = document.getElementById('service-start-page');
    if (serviceStartPage && service['start-page'] && service['start-page'].length > 0) {
        serviceStartPage.href = service['start-page'][0];
        serviceStartPage.textContent = service['start-page'][0];
    }

    // Update the service source code URL
    const serviceSourceCode = document.getElementById('service-source-code');
    if (serviceSourceCode && service.sourceCode && service.sourceCode.length > 0) {
        serviceSourceCode.href = service.sourceCode[0].href;
        serviceSourceCode.textContent = service.sourceCode[0].text;
    }

    // Update the service timeline
    const serviceTimeline = document.getElementById('service-timeline');
    if (serviceTimeline && service.timeline && service.timeline.items) {
        const timelineItems = service.timeline.items.map(item => {
            let itemHtml = `<li class="govuk-timeline__item">`;
            itemHtml += `<h3 class="govuk-timeline__title">${item.label}</h3>`;
            itemHtml += `<p class="govuk-timeline__date">${item.date}</p>`;
            if (item.links) {
                itemHtml += `<ul class="govuk-list">`;
                item.links.forEach(link => {
                    itemHtml += `<li><a href="${link.href}" class="govuk-link">${link.text}</a></li>`;
                });
                itemHtml += `</ul>`;
            }
            itemHtml += `</li>`;
            return itemHtml;
        }).join('');
        serviceTimeline.innerHTML = timelineItems;
    }
} else {
    console.error('Service not found:', serviceId);
} 