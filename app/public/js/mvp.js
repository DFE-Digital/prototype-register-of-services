document.addEventListener('DOMContentLoaded', function() {
    // Add click tracking for cards
    const cards = document.querySelectorAll('.dfe-card');
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Only track if clicking the card itself, not its children
            if (e.target === this) {
                const link = this.querySelector('a');
                if (link) {
                    window.location.href = link.href;
                }
            }
        });
    });

    // Add keyboard navigation
    cards.forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const link = this.querySelector('a');
                if (link) {
                    window.location.href = link.href;
                }
            }
        });
    });

    // Add service count animation
    const serviceCount = document.querySelector('[class*="govuk-!-font-weight-bold"]');
    if (serviceCount) {
        const count = parseInt(serviceCount.textContent);
        let currentCount = 0;
        const duration = 1000; // 1 second
        const interval = 20; // Update every 20ms
        const steps = duration / interval;
        const increment = count / steps;

        const counter = setInterval(() => {
            currentCount += increment;
            if (currentCount >= count) {
                serviceCount.textContent = count;
                clearInterval(counter);
            } else {
                serviceCount.textContent = Math.floor(currentCount);
            }
        }, interval);
    }
});
