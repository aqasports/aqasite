let mobileMenuActive = false;

function toggleMobileMenu() {
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const menuToggle = document.querySelector('.menu-toggle');
    
    mobileMenuActive = !mobileMenuActive;
    
    if (mobileMenuActive) {
        mobileMenuOverlay.classList.add('active');
        menuToggle.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
    } else {
        mobileMenuOverlay.classList.remove('active');
        menuToggle.classList.remove('active');
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    }
}

function toggleLanguage() {
    alert('Version arabe à venir'); // Use a custom modal in a real application instead of alert()
}

document.addEventListener('DOMContentLoaded', function() {
    // Close mobile menu when clicking on nav links
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (mobileMenuActive) {
                toggleMobileMenu();
            }
        });
    });

    // Close mobile menu when clicking outside (on overlay itself)
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', function(e) {
            if (e.target === mobileMenuOverlay && mobileMenuActive) {
                toggleMobileMenu();
            }
        });
    }

    // Handle window resize: close mobile menu if resized to desktop view
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && mobileMenuActive) {
            toggleMobileMenu();
        }
    });

    // Navbar hide/show on scroll
    let lastScrollY = window.scrollY;
    const header = document.querySelector("header");
    if (header) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > lastScrollY && window.scrollY > 100) {
                header.style.transform = "translateY(-100%)";
            } else {
                header.style.transform = "translateY(0)";
            }
            lastScrollY = window.scrollY;
        });
    }

    // Prevent zoom on double tap for iOS
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
});
