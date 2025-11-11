// auto-translate.js - Add this ONE file to your site
// Just include: <script src="/auto-translate.js"></script> before </body>

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION - Edit your translations here
    // ============================================
    
    const translations = {
        en: {
            // Navigation & Common
            "Home": "Home",
            "About": "About",
            "Services": "Services",
            "Contact": "Contact",
            "Get Started": "Get Started",
            "Learn More": "Learn More",
            "Read More": "Read More",
            
            // Hero/Main content
            "Welcome to AQA Sports": "Welcome to AQA Sports",
            "Your premier destination for sports excellence": "Your premier destination for sports excellence",
            
            // Features
            "Premium Quality": "Premium Quality",
            "Expert Guidance": "Expert Guidance",
            "24/7 Support": "24/7 Support",
            
            // Footer
            "All rights reserved": "All rights reserved",
            "Privacy Policy": "Privacy Policy",
            "Terms of Service": "Terms of Service"
        },
        
        ar: {
            // Navigation & Common
            "Home": "الرئيسية",
            "About": "من نحن",
            "Services": "خدماتنا",
            "Contact": "اتصل بنا",
            "Get Started": "ابدأ الآن",
            "Learn More": "اعرف المزيد",
            "Read More": "اقرأ المزيد",
            
            // Hero/Main content
            "Welcome to AQA Sports": "مرحباً بكم في AQA رياضة",
            "Your premier destination for sports excellence": "وجهتكم الأولى للتميز الرياضي",
            
            // Features
            "Premium Quality": "جودة متميزة",
            "Expert Guidance": "إرشاد خبراء",
            "24/7 Support": "دعم على مدار الساعة",
            
            // Footer
            "All rights reserved": "جميع الحقوق محفوظة",
            "Privacy Policy": "سياسة الخصوصية",
            "Terms of Service": "شروط الخدمة"
        }
    };

    // ============================================
    // AUTO TRANSLATION ENGINE
    // ============================================
    
    let currentLang = 'en';
    const STORAGE_KEY = 'preferredLanguage';

    // Detect browser language
    function detectLanguage() {
        // 1. Check saved preference
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && (saved === 'ar' || saved === 'en')) {
            return saved;
        }

        // 2. Check browser language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('ar')) {
            return 'ar';
        }

        // 3. Default to English
        return 'en';
    }

    // Translate text content
    function translateText(text, lang) {
        if (!text || !lang || !translations[lang]) return text;
        
        // Trim whitespace for matching
        const trimmed = text.trim();
        
        // Direct match
        if (translations[lang][trimmed]) {
            return translations[lang][trimmed];
        }

        // Partial match (for text containing translation keys)
        for (let key in translations[lang]) {
            if (trimmed.includes(key)) {
                return text.replace(key, translations[lang][key]);
            }
        }

        return text;
    }

    // Walk through DOM and translate
    function translatePage(lang) {
        const elementsToTranslate = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'a', 'button', 'span', 'li',
            'label', 'td', 'th'
        ];

        elementsToTranslate.forEach(tag => {
            document.querySelectorAll(tag).forEach(element => {
                // Skip if element has no direct text or is part of a script
                if (element.children.length === 0 || 
                    (element.children.length > 0 && element.innerText.trim() === '')) {
                    
                    const text = element.textContent.trim();
                    if (text) {
                        const translated = translateText(text, lang);
                        if (translated !== text) {
                            element.textContent = translated;
                        }
                    }
                } else {
                    // Handle elements with mixed content
                    Array.from(element.childNodes).forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent.trim();
                            if (text) {
                                const translated = translateText(text, lang);
                                if (translated !== text) {
                                    node.textContent = node.textContent.replace(text, translated);
                                }
                            }
                        }
                    });
                }
            });
        });

        // Translate placeholders
        document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(element => {
            const placeholder = element.getAttribute('placeholder');
            const translated = translateText(placeholder, lang);
            if (translated !== placeholder) {
                element.setAttribute('placeholder', translated);
            }
        });

        // Translate alt text
        document.querySelectorAll('img[alt]').forEach(element => {
            const alt = element.getAttribute('alt');
            const translated = translateText(alt, lang);
            if (translated !== alt) {
                element.setAttribute('alt', translated);
            }
        });

        // Translate title attributes
        document.querySelectorAll('[title]').forEach(element => {
            const title = element.getAttribute('title');
            const translated = translateText(title, lang);
            if (translated !== title) {
                element.setAttribute('title', translated);
            }
        });
    }

    // Update page attributes and direction
    function updatePageAttributes(lang) {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.body.style.direction = lang === 'ar' ? 'rtl' : 'ltr';
        document.body.style.textAlign = lang === 'ar' ? 'right' : 'left';
    }

    // Change language
    function changeLanguage(lang) {
        if (lang !== 'ar' && lang !== 'en') return;
        
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        
        updatePageAttributes(lang);
        translatePage(lang);
        
        // Update language buttons if they exist
        updateLanguageButtons(lang);
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    // Update language switcher buttons
    function updateLanguageButtons(lang) {
        // Find language switcher buttons (customize selectors as needed)
        document.querySelectorAll('[data-lang], .lang-btn, .language-btn').forEach(btn => {
            const btnLang = btn.getAttribute('data-lang') || 
                           btn.getAttribute('data-language') ||
                           (btn.textContent.includes('ع') ? 'ar' : 'en');
            
            if (btnLang === lang) {
                btn.classList.add('active', 'selected');
            } else {
                btn.classList.remove('active', 'selected');
            }
        });
    }

    // Initialize language switcher
    function initLanguageSwitcher() {
        // Auto-attach to existing language buttons
        document.querySelectorAll('[data-lang], .lang-btn, .language-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const lang = this.getAttribute('data-lang') || 
                           this.getAttribute('data-language') ||
                           (this.textContent.includes('ع') ? 'ar' : 'en');
                changeLanguage(lang);
            });
        });
    }

    // Initialize on page load
    function init() {
        // Detect initial language
        currentLang = detectLanguage();
        
        // Apply translations
        updatePageAttributes(currentLang);
        translatePage(currentLang);
        
        // Setup language switcher
        initLanguageSwitcher();
        
        // Expose API globally
        window.autoTranslate = {
            changeLanguage: changeLanguage,
            getCurrentLanguage: () => currentLang,
            addTranslations: (lang, newTranslations) => {
                if (!translations[lang]) translations[lang] = {};
                Object.assign(translations[lang], newTranslations);
            }
        };

        console.log('🌐 Auto-translate initialized:', currentLang);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();