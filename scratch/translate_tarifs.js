const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/pages/tarifs.astro');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Insert frontmatter translation definitions
const frontmatter = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import Navbar from '../components/Navbar.astro';
import Footer from '../components/Footer.astro';

export interface Props {
  lang?: string;
}

const { lang = 'fr' } = Astro.props;

const getRelativePath = (path, targetLang) => {
  if (targetLang === 'fr') return path;
  return \`/\${targetLang}\${path === '/' ? '' : path}\`;
};

const pageTranslations = {
  fr: {
    metaTitle: "Tarifs AQA 2025 — Formules Natation, Apnée & Coaching Algérie",
    metaDesc: "Consultez les tarifs AQA 2025 : groupes G10, MAX5 et sessions individuelles. 1, 3, 6 ou 9 mois. Formules Homme, Femme, Enfants et Apnée.",
    metaKeywords: "tarifs natation algérie, prix coaching natation, abonnement piscine algérie, formules aqa 2025",
    heroTitle: "Formules AQA 2025",
    heroSubtitle: "Des programmes d'entraînement personnalisés pour tous les niveaux, avec des prix transparents et des économies attractives",
    tab_homme: "Homme",
    tab_femme: "Femme",
    tab_enfants: "Enfants",
    tab_apnea: "Apnée",
    title_homme: "Tarifs - Homme",
    title_femme: "Tarifs - Femme",
    title_enfants: "Tarifs - Enfants",
    title_apnea: "Formation Apnée",
    once_week: "Une fois par semaine",
    twice_week: "Deux fois par semaine",
    thrice_week: "Trois fois par semaine",
    duration: "Durée",
    month1: "1 Mois",
    month3: "3 Mois",
    month6: "6 Mois",
    month9: "9 Mois",
    economize: "Économisez",
    session_duration: "Durée de séance: Deux heures",
    coming_soon: "Bientôt Disponible",
    coming_soon_desc: "Les groupes de femmes et les tarifs associés seront affichés ici prochainement.",
    discovery: "Découverte",
    recommended: "Recommandé",
    economic: "Économique",
    feature_g10: "Groupe de 10",
    feature_coaching: "Coaching professionnel",
    feature_gear: "Pack de matériel offert",
    feature_tech: "Suivi Technique",
    feature_phys: "Suivi physique",
    btn_reserve: "Réserver",
    apnea_complete: "Apnée Complet",
    apnea_complete_desc: "Formation + Équipement",
    apnea_sessions: "4 séances de deux heures",
    apnea_fins: "Palmes de Piscine (Conquest) offertes",
    apnea_tech: "Formation technique complète",
    apnea_initial: "Formation Initiale",
    apnea_renewal: "Renouvellement",
    apnea_no_gear: "Sans équipement",
    apnea_btn: "S'inscrire à l'Apnée",
    btn_inscription: "Inscription",
    trimestre: "Trimestre",
    semestre: "Semestre",
    saison: "Annuel"
  },
  ar: {
    metaTitle: "أسعار أكا 2025 — عروض السباحة والغوص الحر والتدريب في الجزائر",
    metaDesc: "اطلع على أسعار أكا 2025: مجموعات G10، MAX5 والحصص الفردية. 1، 3، 6 أو 9 أشهر. عروض الرجال، النساء، الأطفال والغوص الحر.",
    metaKeywords: "أسعار السباحة الجزائر، أسعار تدريب السباحة، اشتراك مسبح الجزائر، عروض أكا 2025",
    heroTitle: "أسعار عروض أكا 2025",
    heroSubtitle: "برامج تدريبية مخصصة لجميع المستويات، بأسعار شفافة وتوفير مغري",
    tab_homme: "رجال",
    tab_femme: "نساء",
    tab_enfants: "أطفال",
    tab_apnea: "غوص حر",
    title_homme: "الأسعار - رجال",
    title_femme: "الأسعار - نساء",
    title_enfants: "الأسعار - أطفال",
    title_apnea: "دورة الغوص الحر",
    once_week: "مرة في الأسبوع",
    twice_week: "مرتين في الأسبوع",
    thrice_week: "ثلاث مرات في الأسبوع",
    duration: "المدة",
    month1: "شهر 1",
    month3: "3 أشهر",
    month6: "6 أشهر",
    month9: "9 أشهر",
    economize: "وفر",
    session_duration: "مدة الحصة: ساعتان",
    coming_soon: "قريباً",
    coming_soon_desc: "سيتم عرض مجموعات النساء والأسعار الخاصة بها هنا قريباً.",
    discovery: "اكتشاف",
    recommended: "موصى به",
    economic: "اقتصادي",
    feature_g10: "مجموعة من 10",
    feature_coaching: "تدريب احترافي",
    feature_gear: "حقيبة معدات مجانية",
    feature_tech: "متابعة فنية",
    feature_phys: "متابعة بدنية",
    btn_reserve: "حجز",
    apnea_complete: "غوص حر كامل",
    apnea_complete_desc: "دورة + معدات",
    apnea_sessions: "4 حصص مدة كل منها ساعتان",
    apnea_fins: "زعانف مسبح (Conquest) مجانية",
    apnea_tech: "تدريب فني كامل",
    apnea_initial: "دورة أولية",
    apnea_renewal: "تجديد",
    apnea_no_gear: "بدون معدات",
    apnea_btn: "التسجيل في الغوص الحر",
    btn_inscription: "تسجيل",
    trimestre: "فصل",
    semestre: "نصف سنة",
    saison: "موسم كامل"
  },
  en: {
    metaTitle: "AQA Rates 2025 — Swimming, Apnea & Coaching Rates Algeria",
    metaDesc: "Check AQA 2025 rates: G10, MAX5 groups and individual sessions. 1, 3, 6 or 9 months. Men, Women, Kids and Apnea formulas.",
    metaKeywords: "swimming rates algeria, swimming coaching price, pool subscription algeria, aqa formulas 2025",
    heroTitle: "AQA Formulas 2025",
    heroSubtitle: "Personalized training programs for all levels, with transparent pricing and attractive savings",
    tab_homme: "Men",
    tab_femme: "Women",
    tab_enfants: "Kids",
    tab_apnea: "Apnea",
    title_homme: "Rates - Men",
    title_femme: "Rates - Women",
    title_enfants: "Rates - Kids",
    title_apnea: "Apnea Training",
    once_week: "Once a week",
    twice_week: "Twice a week",
    thrice_week: "Three times a week",
    duration: "Duration",
    month1: "1 Month",
    month3: "3 Months",
    month6: "6 Months",
    month9: "9 Months",
    economize: "Save",
    session_duration: "Session duration: Two hours",
    coming_soon: "Coming Soon",
    coming_soon_desc: "Women's groups and associated rates will be displayed here soon.",
    discovery: "Discovery",
    recommended: "Recommended",
    economic: "Economic",
    feature_g10: "Group of 10",
    feature_coaching: "Professional coaching",
    feature_gear: "Free gear package",
    feature_tech: "Technical Tracking",
    feature_phys: "Physical Tracking",
    btn_reserve: "Reserve",
    apnea_complete: "Complete Apnea",
    apnea_complete_desc: "Training + Gear",
    apnea_sessions: "4 sessions of two hours",
    apnea_fins: "Free pool fins (Conquest)",
    apnea_tech: "Complete technical training",
    apnea_initial: "Initial Training",
    apnea_renewal: "Renewal",
    apnea_no_gear: "Without equipment",
    apnea_btn: "Register for Apnea",
    btn_inscription: "Registration",
    trimestre: "Quarter",
    semestre: "Semester",
    saison: "Full Season"
  }
};

const localT = pageTranslations[lang] || pageTranslations.fr;
---`;

// Replace original frontmatter block
content = content.replace(/^---[\s\S]*?---/, frontmatter);

// 2. Localize Layout attributes
content = content.replace(/title="Tarifs AQA 2025 — Formules Natation, Apnée & Coaching Algérie"/, 'title={localT.metaTitle}');
content = content.replace(/description="Consultez les tarifs AQA 2025 : groupes G10, MAX5 et sessions individuelles. 1, 3, 6 ou 9 mois. Formules Homme, Femme, Enfants et Apnée."/, 'description={localT.metaDesc}');
content = content.replace(/keywords="tarifs natation algérie, prix coaching natation, abonnement piscine algérie, formules aqa 2025"/, 'keywords={localT.metaKeywords}');

// 3. Localize Hero headers
content = content.replace(/<h1>Formules AQA 2025<\/h1>/, '<h1>{localT.heroTitle}</h1>');
content = content.replace(/<p>Des programmes d'entraînement personnalisés pour tous les niveaux, avec des prix transparents et des économies attractives<\/p>/, '<p>{localT.heroSubtitle}</p>');

// 4. Localize Nav Tabs
content = content.replace(/<button class="category-btn active" data-category="homme">Homme<\/button>/, '<button class="category-btn active" data-category="homme">{localT.tab_homme}</button>');
content = content.replace(/<button class="category-btn" data-category="femme">Femme<\/button>/, '<button class="category-btn" data-category="femme">{localT.tab_femme}</button>');
content = content.replace(/<button class="category-btn" data-category="enfants">Enfants<\/button>/, '<button class="category-btn" data-category="enfants">{localT.tab_enfants}</button>');
content = content.replace(/<button class="category-btn" data-category="apnea">Apnée<\/button>/, '<button class="category-btn" data-category="apnea">{localT.tab_apnea}</button>');

// 5. Localize Section titles
content = content.replace(/<h3 class="section-title">Tarifs - Homme<\/h3>/, '<h3 class="section-title">{localT.title_homme}</h3>');
content = content.replace(/<h3 class="section-title">Tarifs - Femme<\/h3>/, '<h3 class="section-title">{localT.title_femme}</h3>');
content = content.replace(/<h3 class="section-title">Tarifs - Enfants<\/h3>/, '<h3 class="section-title">{localT.title_enfants}</h3>');
content = content.replace(/<h3 class="section-title">Formation Apnée<\/h3>/, '<h3 class="section-title">{localT.title_apnea}</h3>');

// 6. Localize Frequency titles
content = content.replace(/<h4 class="section-title" style="font-size: 1.5rem;">Une fois par semaine<\/h4>/g, '<h4 class="section-title" style="font-size: 1.5rem;">{localT.once_week}</h4>');
content = content.replace(/<h4 class="section-title" style="font-size: 1.5rem;">Deux fois par semaine<\/h4>/g, '<h4 class="section-title" style="font-size: 1.5rem;">{localT.twice_week}</h4>');
content = content.replace(/<h4 class="section-title" style="font-size: 1.5rem;">Trois fois par semaine<\/h4>/g, '<h4 class="section-title" style="font-size: 1.5rem;">{localT.thrice_week}</h4>');

// 7. Localize Table cells: Durée, Mois, Savings, Session duration
content = content.replace(/<th>Durée<\/th>/g, '<th>{localT.duration}</th>');
content = content.replace(/<td>1 Mois<\/td>/g, '<td>{localT.month1}</td>');
content = content.replace(/<td>3 Mois<\/td>/g, '<td>{localT.month3}</td>');
content = content.replace(/<td>6 Mois<\/td>/g, '<td>{localT.month6}</td>');
content = content.replace(/<td>9 Mois<\/td>/g, '<td>{localT.month9}</td>');
content = content.replace(/Économisez\s+([\d,]+\s+DA)/g, '{localT.economize} $1');
content = content.replace(/<div class="session-duration">Durée de séance: Deux heures<\/div>/g, '<div class="session-duration">{localT.session_duration}</div>');

// 8. Localize Bientôt Disponible
content = content.replace(/<h3>Bientôt Disponible<\/h3>/, '<h3>{localT.coming_soon}</h3>');
content = content.replace(/<p>Les groupes de femmes et les tarifs associés seront affichés ici prochainement.<\/p>/, '<p>{localT.coming_soon_desc}</p>');

// 9. Localize Kids section
content = content.replace(/<div class="kids-pricing__badge">Découverte<\/div>/g, '<div class="kids-pricing__badge">{localT.discovery}</div>');
content = content.replace(/<div class="kids-pricing__badge">Recommandé<\/div>/g, '<div class="kids-pricing__badge">{localT.recommended}</div>');
content = content.replace(/<div class="kids-pricing__badge">Économique<\/div>/g, '<div class="kids-pricing__badge">{localT.economic}</div>');

content = content.replace(/<h3 class="kids-pricing__title">3 mois<\/h3>/g, '<h3 class="kids-pricing__title">{localT.month3}</h3>');
content = content.replace(/<h3 class="kids-pricing__title">6 mois<\/h3>/g, '<h3 class="kids-pricing__title">{localT.month6}</h3>');
content = content.replace(/<h3 class="kids-pricing__title">9 mois<\/h3>/g, '<h3 class="kids-pricing__title">{localT.month9}</h3>');

content = content.replace(/<div class="kids-pricing__period">Trimestre<\/div>/g, '<div class="kids-pricing__period">{localT.trimestre}</div>');
content = content.replace(/<div class="kids-pricing__period">Semestre<\/div>/g, '<div class="kids-pricing__period">{localT.semestre}</div>');
content = content.replace(/<div class="kids-pricing__period">Annuel<\/div>/g, '<div class="kids-pricing__period">{localT.saison}</div>');

content = content.replace(/<li class="kids-pricing__feature">Groupe de 10<\/li>/g, '<li class="kids-pricing__feature">{localT.feature_g10}</li>');
content = content.replace(/<li class="kids-pricing__feature">Coaching professionnel<\/li>/g, '<li class="kids-pricing__feature">{localT.feature_coaching}</li>');
content = content.replace(/<li class="kids-pricing__feature">Pack de matériel offert<\/li>/g, '<li class="kids-pricing__feature">{localT.feature_gear}</li>');
content = content.replace(/<li class="kids-pricing__feature">Suivi Technique<\/li>/g, '<li class="kids-pricing__feature">{localT.feature_tech}</li>');
content = content.replace(/<li class="kids-pricing__feature">Suivi physique<\/li>/g, '<li class="kids-pricing__feature">{localT.feature_phys}</li>');

// reserve buttons and floating button
content = content.replace(/<a href="\/inscription" class="kids-pricing__button">Réserver<\/a>/g, '<a href={getRelativePath(\'/inscription\', lang)} class="kids-pricing__button">{localT.btn_reserve}</a>');
content = content.replace(/<a href="\/inscription" class="floating-btn">Inscription<\/a>/g, '<a href={getRelativePath(\'/inscription\', lang)} class="floating-btn">{localT.btn_inscription}</a>');

// 10. Localize Apnea card
content = content.replace(/<h4>Apnée Complet<\/h4>/g, '<h4>{localT.apnea_complete}</h4>');
content = content.replace(/<p>Formation \+ Équipement<\/p>/g, '<p>{localT.apnea_complete_desc}</p>');
content = content.replace(/<span>4 séances de deux heures<\/span>/g, '<span>{localT.apnea_sessions}</span>');
content = content.replace(/<span>Palmes de Piscine \(Conquest\) offertes<\/span>/g, '<span>{localT.apnea_fins}</span>');
content = content.replace(/<span>Formation technique complète<\/span>/g, '<span>{localT.apnea_tech}</span>');
content = content.replace(/<span class="price-label">Formation Initiale<\/span>/g, '<span class="price-label">{localT.apnea_initial}</span>');
content = content.replace(/<span class="price-label">Renouvellement<\/span>/g, '<span class="price-label">{localT.apnea_renewal}</span>');
content = content.replace(/<span class="price-note">Sans équipement<\/span>/g, '<span class="price-note">{localT.apnea_no_gear}</span>');
content = content.replace(/onclick="showInfo\('Formation Apnée'\)"/g, `onclick="showInfo('{localT.title_apnea}')"`);
content = content.replace(/S'inscrire à l'Apnée/g, '{localT.apnea_btn}');

// 11. Script localized alert
const oldScript = `    <script>
    (function(){
        // 1. Tab Switching Logic`;

const newScript = `    <script is:inline define:vars={{ lang }}>
    (function(){
        // 1. Tab Switching Logic`;

content = content.replace(oldScript, newScript);

const oldShowInfo = `        // 4. Global Info Popup
        window.showInfo = function(type){
            alert(\`Plus d'informations sur \${type} - Contactez-nous au 0540454907 ou par email à aqa.sports.academy@gmail.com\`);
        };`;

const newShowInfo = `        // 4. Global Info Popup
        window.showInfo = function(type){
            const infoText = {
              fr: \`Plus d'informations sur \${type} - Contactez-nous au 0540454907 ou par email à aqa.sports.academy@gmail.com\`,
              ar: \`مزيد من المعلومات حول \${type} - اتصل بنا على 0540454907 أو عبر البريد الإلكتروني aqa.sports.academy@gmail.com\`,
              en: \`More information about \${type} - Contact us at 0540454907 or by email at aqa.sports.academy@gmail.com\`
            };
            alert(infoText[lang] || infoText.fr);
        };`;

content = content.replace(oldShowInfo, newShowInfo);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('✅ Done!');
