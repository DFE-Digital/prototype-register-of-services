document.addEventListener('DOMContentLoaded', function () {
    console.log('Service filter script loaded');

    const millerColumns = document.querySelector('miller-columns');
    console.log('Miller columns element:', millerColumns);

    if (!millerColumns) {
        console.error('Miller columns element not found');
        return;
    }

    // Wait for miller-columns to be fully initialized
    const checkInitialization = setInterval(() => {
        const checkboxes = millerColumns.querySelectorAll('input[type="checkbox"]');
        console.log('Found checkboxes:', checkboxes.length);

        if (checkboxes.length > 0) {
            clearInterval(checkInitialization);
            console.log('Checkboxes found, attaching event listeners');

            // Attach event listeners to each checkbox
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function (e) {
                    console.log('Checkbox changed:', e.target);
                    console.log('Checkbox checked:', e.target.checked);
                    console.log('Checkbox value:', e.target.value);
                    console.log('Checkbox id:', e.target.id);
                    console.log('Checkbox name:', e.target.name);
                    console.log('Checkbox parent:', e.target.parentElement);
                    console.log('Checkbox parent text:', e.target.parentElement.textContent);

                    const selectedCategories = getSelectedCategories();
                    console.log('Selected categories:', selectedCategories);
                    if (selectedCategories.length > 0) updateServiceResults(selectedCategories);
                });

                // Add click event listener to ensure change event is dispatched
                checkbox.addEventListener('click', function (e) {
                    console.log('Checkbox clicked:', e.target);
                    // Create and dispatch a change event
                    const changeEvent = new Event('change', { bubbles: true });
                    e.target.dispatchEvent(changeEvent);
                });
            });
        }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkInitialization);
        console.error('Timed out waiting for checkboxes');
    }, 10000);

    function getSelectedCategories() {
        const columns = Array.from(millerColumns.querySelectorAll('.miller-columns__column'));
        const checkboxes = millerColumns.querySelectorAll('input[type="checkbox"]:checked');
        const categoryMap = new Map();
        // For each checked subcategory (columns > 0), use data-parent attribute
        Array.from(checkboxes).forEach(checkbox => {
            const column = checkbox.closest('.miller-columns__column');
            const columnIndex = columns.indexOf(column);
            const label = checkbox.nextElementSibling.textContent.trim();
            if (columnIndex > 0) {
                // Subcategory: get parent from data-parent attribute
                const parentLabel = checkbox.closest('li').getAttribute('data-parent');
                if (parentLabel) {
                    if (!categoryMap.has(parentLabel)) {
                        categoryMap.set(parentLabel, new Set());
                    }
                    categoryMap.get(parentLabel).add(label);
                }
            }
        });
        // Build result array: only include categories with non-empty subCategories
        const result = Array.from(categoryMap.entries())
            .map(([category, subSet]) => ({
                category,
                subCategories: Array.from(subSet)
            }))
            .filter(item => item.subCategories.length > 0);
        console.log('[DEBUG] Selected categories:', result);
        return result;
    }

    // Remove any existing results column before adding a new one
    function ensureResultsColumnAfter(columnElement) {
        // Remove old results column if it exists
        const oldResults = millerColumns.querySelector('.miller-columns__column.results-column');
        if (oldResults) {
            oldResults.remove();
        }

        // Find the last active column
        const activeColumns = millerColumns.querySelectorAll('.miller-columns__column--active');
        const lastActiveColumn = activeColumns[activeColumns.length - 1];

        // Create new results column
        const resultsColumn = document.createElement('div');
        resultsColumn.className = 'miller-columns__column results-column';
        resultsColumn.innerHTML = `
            <h3 class="govuk-heading-s">Found services</h3>
            <ul class="miller-columns__list" id="service-results"></ul>
        `;

        // Insert after the last active column, or after the given column if no active columns
        const targetColumn = lastActiveColumn || columnElement;
        if (targetColumn && targetColumn.nextSibling) {
            targetColumn.parentNode.insertBefore(resultsColumn, targetColumn.nextSibling);
        } else if (targetColumn) {
            targetColumn.parentNode.appendChild(resultsColumn);
        } else {
            millerColumns.appendChild(resultsColumn);
        }
        return resultsColumn;
    }

    function updateServiceResults(selectedCategories) {
        console.log('updateServiceResults called with:', selectedCategories);

        // Find the rightmost selected column
        let resultsList;
        if (selectedCategories.length > 0) {
            const checkboxes = millerColumns.querySelectorAll('input[type="checkbox"]:checked');
            const columns = Array.from(millerColumns.querySelectorAll('.miller-columns__column'));
            let rightmostColumn = null;
            let maxIndex = -1;
            checkboxes.forEach(checkbox => {
                const column = checkbox.closest('.miller-columns__column');
                const idx = columns.indexOf(column);
                if (idx > maxIndex) {
                    maxIndex = idx;
                    rightmostColumn = column;
                }
            });
            const resultsColumn = ensureResultsColumnAfter(rightmostColumn);
            resultsList = resultsColumn.querySelector('#service-results');
        } else {
            // No selection, just append to end
            const resultsColumn = ensureResultsColumnAfter(null);
            resultsList = resultsColumn.querySelector('#service-results');
        }
        console.log('Results list element:', resultsList);
        if (!resultsList) {
            console.error('Service results element not found');
            return;
        }
        resultsList.innerHTML = '';
        if (selectedCategories.length === 0) {
            console.log('No categories selected, showing default message');
            resultsList.innerHTML = '<li class="miller-columns__item">Select a category to see matching services</li>';
            return;
        }

        // Send as JSON in POST request
        const url = '/api/services/filter';
        const requestBody = {
            criteria: selectedCategories,
            logic: 'and'  // Default to AND logic
        };
        console.log('Posting to URL:', url, 'with body:', requestBody);
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
            .then(response => {
                console.log('Response status:', response.status);
                console.log('Response headers:', Object.fromEntries(response.headers.entries()));
                return response.json();
            })
            .then(matchingServices => {
                console.log('Received services:', matchingServices);
                
                // Update the heading with the count
                const resultsColumn = resultsList.closest('.miller-columns__column');
                const heading = resultsColumn.querySelector('h3');
                if (heading) {
                    heading.textContent = `Found ${matchingServices.length} services`;
                }

                if (matchingServices.length === 0) {
                    resultsList.innerHTML = '<li class="miller-columns__item">No services match the selected criteria</li>';
                    return;
                }

                // For the first 10 services, then stop
                const first10Services = matchingServices.slice(0, 10);
                first10Services.forEach(service => {
                    const li = document.createElement('li');
                    li.className = 'miller-columns__item';
                    li.innerHTML = `
                        <h4 class="govuk-heading-s"><a href="/service/${service.slug}" class="govuk-link govuk-link--no-visited-state">${service.name}</a></h4>
                    `;
                    resultsList.appendChild(li);
                });

                // If there are more than 10 services, add a "view all" link with a count of the total
                if (matchingServices.length > 10) {
                    const viewAllLink = document.createElement('a');
                    viewAllLink.href = '/categories/index.html?channels=digital&phase=live';
                    viewAllLink.textContent = `View all ${matchingServices.length} services`;
                    viewAllLink.className = 'govuk-link govuk-link--no-visited-state';
                    resultsList.appendChild(viewAllLink);
                }
            })
            .catch(error => {
                console.error('Error fetching services:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                });
                resultsList.innerHTML = '<li class="miller-columns__item">Error loading services</li>';
            });
    }
}); 