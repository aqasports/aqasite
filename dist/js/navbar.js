/**
 * AQA Sports Academy — Navbar & Global UI
 * Handles: mobile menu, scroll-hide, lang switcher bootstrap, WhatsApp widget
 */

let mobileMenuActive = false;

// ─── Mobile Menu ──────────────────────────────────────────────────────
function toggleMobileMenu() {
    const overlay    = document.getElementById('mobileMenuOverlay');
    const toggle     = document.querySelector('.menu-toggle');
    mobileMenuActive = !mobileMenuActive;

    if (mobileMenuActive) {
        overlay.classList.add('active');
        toggle.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        overlay.classList.remove('active');
        toggle.classList.remove('active');
        document.body.style.overflow = '';
    }
}


// ─── WhatsApp Floating Widget ─────────────────────────────────────────
function injectWhatsAppWidget() {
    if (document.getElementById('wa-widget')) return; // already exists

    const wa = document.createElement('a');
    wa.id        = 'wa-widget';
    wa.href      = 'https://wa.me/213540454907?text=Bonjour%20AQA%20Sports%20%F0%9F%8F%8A';
    wa.target    = '_blank';
    wa.rel       = 'noopener noreferrer';
    wa.setAttribute('aria-label', 'Chat sur WhatsApp');
    wa.setAttribute('data-i18n-label', 'wa_tooltip');
    wa.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span class="wa-pulse"></span>
    `;

    const style = document.createElement('style');
    style.textContent = `
        #wa-widget {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 56px;
            height: 56px;
            background: #25D366;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            z-index: 3000;
            box-shadow: 0 4px 20px rgba(37,211,102,.45);
            transition: transform .3s ease, box-shadow .3s ease;
            text-decoration: none;
        }
        #wa-widget:hover {
            transform: scale(1.12) translateY(-3px);
            box-shadow: 0 8px 30px rgba(37,211,102,.6);
        }
        #wa-widget svg { width: 30px; height: 30px; }
        .wa-pulse {
            position: absolute;
            top: 0; right: 0;
            width: 14px; height: 14px;
            background: #ff4444;
            border-radius: 50%;
            border: 2px solid #000;
            animation: waPulse 2s ease-in-out infinite;
        }
        @keyframes waPulse {
            0%,100% { transform: scale(1); }
            50%      { transform: scale(1.3); }
        }
        [dir="rtl"] #wa-widget { right: auto; left: 20px; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(wa);
}

// ─── DOM Ready ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    // Close mobile menu on nav link click
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenuActive) toggleMobileMenu();
        });
    });

    // Close menu on overlay backdrop click
    const overlay = document.getElementById('mobileMenuOverlay');
    if (overlay) {
        overlay.addEventListener('click', e => {
            if (e.target === overlay && mobileMenuActive) toggleMobileMenu();
        });
    }

    // Auto-close on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileMenuActive) toggleMobileMenu();
    });

    // Scroll-hide header
    let lastScrollY = window.scrollY;
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > lastScrollY && window.scrollY > 100) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            lastScrollY = window.scrollY;
        });
    }

    // Prevent double-tap zoom on iOS — passive listener so it does NOT block scroll
    let lastTouchEnd = 0;
    document.addEventListener('touchend', e => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
            // do NOT call preventDefault here — it blocks scroll on touch/trackpad
        }
        lastTouchEnd = now;
    }, { passive: true });

    // Inject WhatsApp widget
    injectWhatsAppWidget();
});
