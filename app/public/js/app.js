document.addEventListener("DOMContentLoaded", function () {
    var servicesTab = document.getElementById("services-tab");
    var servicesPanel = document.getElementById("services-panel");
    var closeNav = document.getElementById("closeNav");

    if (servicesTab && servicesPanel) {
        servicesTab.addEventListener("click", function (e) {
            e.preventDefault();
            if (servicesPanel.style.display === "none") {
                servicesPanel.style.display = "block";
                servicesPanel.setAttribute("aria-hidden", "false");
                servicesTab.setAttribute("aria-expanded", "true");
            } else {
                servicesPanel.style.display = "none";
                servicesPanel.setAttribute("aria-hidden", "true");
                servicesTab.setAttribute("aria-expanded", "false");
            }
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" || e.key === "Esc") {
            e.preventDefault();
            if (servicesPanel && servicesPanel.style.display === "block") {
                servicesPanel.style.display = "none";
                servicesPanel.setAttribute("aria-hidden", "true");
                servicesTab.setAttribute("aria-expanded", "false");
            }
        }
    });

    if (closeNav && servicesPanel) {
        closeNav.addEventListener("click", function (e) {
            e.preventDefault();
            servicesPanel.style.display = "none";
            servicesPanel.setAttribute("aria-hidden", "true");
            servicesTab.setAttribute("aria-expanded", "false");
        });
    }

    const copyButtons = document.querySelectorAll(".copy-btn");

    copyButtons.forEach(button => {
        button.addEventListener("click", function () {
            const targetId = this.getAttribute("data-copy-target");
            const codeElement = document.getElementById(targetId);
            const textToCopy = codeElement.innerText;

            navigator
                .clipboard
                .writeText(textToCopy)
                .then(() => {
                    this.textContent = "Copied!";
                    setTimeout(() => {
                        this.textContent = "Copy code";
                    }, 2000);
                })
                .catch(err => {
                    console.error("Failed to copy text: ", err);
                });
        });
    });
});
