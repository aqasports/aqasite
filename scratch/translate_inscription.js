const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/pages/inscription.astro');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Insert frontmatter translation definitions
const frontmatter = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import Navbar from '../components/Navbar.astro';
import Footer from '../components/Footer.astro';
import scheduleData from '../data/schedule.json';

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
    metaTitle: "Inscription | AQA Sports Academy — Rejoignez-nous en Ligne",
    metaDesc: "Inscrivez-vous à AQA Sports Academy en ligne. Choisissez votre formule (G10, MAX5, Individuel), votre créneau et commencez votre transformation.",
    metaKeywords: "inscription natation algérie, s'inscrire aqa sports, rejoindre académie natation alger, coaching inscription",
    formTitle: "Formulaire d'inscription",
    step: "Étape",
    successTitle: "✅ Inscription envoyée avec succès!",
    successDesc: "Nous avons bien reçu votre demande d'inscription. Vous recevrez une confirmation par téléphone sous 24h.",
    newRegistration: "Nouvelle inscription",
    chooseCategory: "Choisissez votre catégorie",
    cat_men: "Hommes",
    cat_men_sub: "Adultes",
    cat_women: "Femmes",
    cat_women_sub: "Adultes et Ados",
    cat_teens: "Ados Garçon",
    cat_teens_sub: "13-16 ans",
    cat_kids: "Enfants",
    cat_kids_sub: "5-12 ans",
    cat_apnea: "AQA apnea",
    cat_apnea_sub: "atteindre 4min en apnée",
    err_category: "Veuillez sélectionner une catégorie",
    choosePool: "Choisissez votre piscine",
    pool_label: "Emplacement :",
    pool_select_default: "-- Sélectionnez une piscine --",
    err_pool: "Veuillez sélectionner une piscine",
    chooseFormule: "Choisissez votre formule",
    form_starter: "Starter",
    form_silver: "Silver",
    form_gold: "Gold",
    form_diamond: "Diamond",
    month1: "1 mois",
    month3: "3 mois",
    month6: "6 mois",
    month9: "9 mois",
    err_formule: "Veuillez sélectionner une formule",
    chooseFrequency: "Choisissez votre fréquence",
    session_duration_2h: "Séance = 2 heures",
    session_duration_1h: "Séance = 1 heure",
    times_1: "1 fois",
    times_2: "2 fois",
    times_3: "3 fois",
    per_week: "par semaine",
    err_frequency: "Veuillez sélectionner une fréquence",
    chooseGroups: "Choisissez vos groupes",
    select_hint: "Sélectionnez X groupe(s) selon votre fréquence",
    group_placeholder: "Complétez d'abord les étapes précédentes",
    err_groups: "Veuillez sélectionner le bon nombre de groupes",
    no_groups_msg: "Aucun groupe disponible pour cette combinaison. Essayez un autre emplacement.",
    personalInfoTitle: "Vos informations personnelles",
    label_fullname: "Nom complet :",
    err_fullname: "Veuillez saisir votre nom complet",
    label_phone: "Téléphone :",
    err_phone: "Veuillez saisir un numéro de téléphone valide",
    label_city: "Quelle est votre ville ?",
    err_city: "Veuillez saisir votre ville",
    label_equipement: "Avez-vous besoin d'équipement ?",
    summaryTitle: "Récapitulatif de votre inscription",
    summary_verify: "Vérifiez vos informations avant de confirmer votre inscription.",
    btn_next: "Suivant",
    btn_prev: "Précédent",
    btn_confirm: "Confirmer l'inscription"
  },
  ar: {
    metaTitle: "التسجيل | أكاديمية أكا الرياضية — انضم إلينا عبر الإنترنت",
    metaDesc: "سجل في أكاديمية أكا الرياضية عبر الإنترنت. اختر صيغتك (G10 ، MAX5 ، فردي) ، حصتك وابدأ تحولك.",
    metaKeywords: "تسجيل السباحة الجزائر، التسجيل أكا الرياضية، انضمام أكاديمية السباحة الجزائر، التسجيل التدريب",
    formTitle: "استمارة التسجيل",
    step: "الخطوة",
    successTitle: "✅ تم إرسال التسجيل بنجاح!",
    successDesc: "لقد استلمنا طلب التسجيل الخاص بك. ستتلقى تأكيدًا عبر الهاتف في غضون 24 ساعة.",
    newRegistration: "تسجيل جديد",
    chooseCategory: "اختر فئتك",
    cat_men: "رجال",
    cat_men_sub: "بالغون",
    cat_women: "نساء",
    cat_women_sub: "بالغات ومراهقات",
    cat_teens: "مراهقون ذكور",
    cat_teens_sub: "13-16 سنة",
    cat_kids: "أطفال",
    cat_kids_sub: "5-12 سنة",
    cat_apnea: "أكا للغوص الحر",
    cat_apnea_sub: "الوصول إلى 4 دقائق في الغوص الحر",
    err_category: "يرجى تحديد فئة",
    choosePool: "اختر المسبح الخاص بك",
    pool_label: "الموقع :",
    pool_select_default: "-- اختر مسبحاً --",
    err_pool: "يرجى تحديد مسبح",
    chooseFormule: "اختر صيغتك",
    form_starter: "مبتدئ (Starter)",
    form_silver: "فضي (Silver)",
    form_gold: "ذهبي (Gold)",
    form_diamond: "ألماسي (Diamond)",
    month1: "شهر 1",
    month3: "3 أشهر",
    month6: "6 أشهر",
    month9: "9 أشهر",
    err_formule: "يرجى تحديد صيغة",
    chooseFrequency: "اختر عدد الحصص",
    session_duration_2h: "الحصة = ساعتان",
    session_duration_1h: "الحصة = ساعة واحدة",
    times_1: "حصة واحدة",
    times_2: "حصتان",
    times_3: "3 حصص",
    per_week: "في الأسبوع",
    err_frequency: "يرجى تحديد التكرار",
    chooseGroups: "اختر مجموعتك",
    select_hint: "حدد X مجموعة (مجموعات) حسب عدد الحصص",
    group_placeholder: "أكمل الخطوات السابقة أولاً",
    err_groups: "يرجى اختيار العدد الصحيح للمجموعات",
    no_groups_msg: "لا توجد مجموعات متاحة لهذه الحصة. جرب موقعاً آخر.",
    personalInfoTitle: "معلوماتك الشخصية",
    label_fullname: "الاسم الكامل :",
    err_fullname: "يرجى إدخال اسمك الكامل",
    label_phone: "الهاتف :",
    err_phone: "يرجى إدخال رقم هاتف صالح",
    label_city: "ما هي مدينة إقامتك ؟",
    err_city: "يرجى إدخال مدينتك",
    label_equipement: "هل تحتاج إلى معدات ؟",
    summaryTitle: "ملخص التسجيل الخاص بك",
    summary_verify: "تحقق من معلوماتك قبل تأكيد التسجيل.",
    btn_next: "التالي",
    btn_prev: "السابق",
    btn_confirm: "تأكيد التسجيل"
  },
  en: {
    metaTitle: "Registration | AQA Sports Academy — Join Us Online",
    metaDesc: "Register for AQA Sports Academy online. Choose your formula (G10, MAX5, Individual), your slot and start your transformation.",
    metaKeywords: "swimming registration algeria, sign up aqa sports, join swimming academy alger, coaching registration",
    formTitle: "Registration Form",
    step: "Step",
    successTitle: "✅ Registration sent successfully!",
    successDesc: "We have received your registration request. You will receive a confirmation call within 24 hours.",
    newRegistration: "New Registration",
    chooseCategory: "Choose your category",
    cat_men: "Men",
    cat_men_sub: "Adults",
    cat_women: "Women",
    cat_women_sub: "Adults & Teens",
    cat_teens: "Teen Boys",
    cat_teens_sub: "13-16 years",
    cat_kids: "Kids",
    cat_kids_sub: "5-12 years",
    cat_apnea: "AQA apnea",
    cat_apnea_sub: "reach 4 min in apnea",
    err_category: "Please select a category",
    choosePool: "Choose your pool",
    pool_label: "Location :",
    pool_select_default: "-- Select a pool --",
    err_pool: "Please select a pool",
    chooseFormule: "Choose your formula",
    form_starter: "Starter",
    form_silver: "Silver",
    form_gold: "Gold",
    form_diamond: "Diamond",
    month1: "1 month",
    month3: "3 months",
    month6: "6 months",
    month9: "9 months",
    err_formule: "Please select a formula",
    chooseFrequency: "Choose your frequency",
    session_duration_2h: "Session = 2 hours",
    session_duration_1h: "Session = 1 hour",
    times_1: "1 time",
    times_2: "2 times",
    times_3: "3 times",
    per_week: "per week",
    err_frequency: "Please select a frequency",
    chooseGroups: "Choose your groups",
    select_hint: "Select X group(s) based on frequency",
    group_placeholder: "Complete the previous steps first",
    err_groups: "Please select the correct number of groups",
    no_groups_msg: "No groups available for this combination. Try another location.",
    personalInfoTitle: "Your personal information",
    label_fullname: "Full name :",
    err_fullname: "Please enter your full name",
    label_phone: "Phone number :",
    err_phone: "Please enter a valid phone number",
    label_city: "What is your city of residence ?",
    err_city: "Please enter your city",
    label_equipement: "Do you need equipment ?",
    summaryTitle: "Summary of your registration",
    summary_verify: "Verify your details before confirming your registration.",
    btn_next: "Next",
    btn_prev: "Previous",
    btn_confirm: "Confirm Registration"
  }
};

const localT = pageTranslations[lang] || pageTranslations.fr;
---`;

// Replace original frontmatter block
content = content.replace(/^---[\s\S]*?---/, frontmatter);

// 2. Localize Layout attributes
content = content.replace(/title="Inscription \| AQA Sports Academy — Rejoignez-nous en Ligne"/, 'title={localT.metaTitle}');
content = content.replace(/description="Inscrivez-vous à AQA Sports Academy en ligne. Choisissez votre formule \(G10, MAX5, Individuel\), votre créneau et commencez votre transformation."/, 'description={localT.metaDesc}');
content = content.replace(/keywords="inscription natation algérie, s'inscrire aqa sports, rejoindre académie natation alger, coaching inscription"/, 'keywords={localT.metaKeywords}');

// 3. Localize Form Elements
content = content.replace(/<h1>Formulaire d'inscription<\/h1>/, '<h1>{localT.formTitle}</h1>');
content = content.replace(/Étape <span id="currentStep">1<\/span> \/ 7/, '{localT.step} <span id="currentStep">1</span> / 7');

content = content.replace(/<h3>✅ Inscription envoyée avec succès!<\/h3>/, '<h3>{localT.successTitle}</h3>');
content = content.replace(/<p>Nous avons bien reçu votre demande d'inscription. Vous recevrez une confirmation par téléphone sous 24h.<\/p>/, '<p>{localT.successDesc}</p>');
content = content.replace(/Nouvelle inscription/, '{localT.newRegistration}');

// Step 1
content = content.replace(/<h3>Choisissez votre catégorie<\/h3>/, '<h3>{localT.chooseCategory}</h3>');
content = content.replace(/<strong>Hommes<\/strong><br>\s*<small>Adultes<\/small>/, '<strong>{localT.cat_men}</strong><br><small>{localT.cat_men_sub}</small>');
content = content.replace(/<strong>Femmes<\/strong><br>\s*<small>Adultes et Ados<\/small>/, '<strong>{localT.cat_women}</strong><br><small>{localT.cat_women_sub}</small>');
content = content.replace(/<strong>Ados Garçon<\/strong><br>\s*<small>13-16 ans<\/small>/, '<strong>{localT.cat_teens}</strong><br><small>{localT.cat_teens_sub}</small>');
content = content.replace(/<strong>Enfants<\/strong><br>\s*<small>5-12 ans<\/small>/, '<strong>{localT.cat_kids}</strong><br><small>{localT.cat_kids_sub}</small>');
content = content.replace(/<strong>AQA apnea<\/strong><br>\s*<small>atteindre 4min en apnéé<\/small>/, '<strong>{localT.cat_apnea}</strong><br><small>{localT.cat_apnea_sub}</small>');
content = content.replace(/<div class="error-message" id="categoryError">Veuillez sélectionner une catégorie<\/div>/, '<div class="error-message" id="categoryError">{localT.err_category}</div>');

// Step 2
content = content.replace(/<h3>Choisissez votre piscine<\/h3>/, '<h3>{localT.choosePool}</h3>');
content = content.replace(/<label for="piscineSelect">Emplacement :<\/label>/, '<label for="piscineSelect">{localT.pool_label}</label>');
content = content.replace(/<option value="">-- Sélectionnez une piscine --<\/option>/, '<option value="">{localT.pool_select_default}</option>');
content = content.replace(/<div class="error-message" id="piscineError">Veuillez sélectionner une piscine<\/div>/, '<div class="error-message" id="piscineError">{localT.err_pool}</div>');

// Step 3
content = content.replace(/<h3>Choisissez votre formule<\/h3>/, '<h3>{localT.chooseFormule}</h3>');
content = content.replace(/<strong>Starter<\/strong><br>\s*<small>1 mois<\/small>/, '<strong>{localT.form_starter}</strong><br><small>{localT.month1}</small>');
content = content.replace(/<strong>Silver<\/strong><br>\s*<small>3 mois<\/small>/, '<strong>{localT.form_silver}</strong><br><small>{localT.month3}</small>');
content = content.replace(/<strong>Gold<\/strong><br>\s*<small>6 mois<\/small>/, '<strong>{localT.form_gold}</strong><br><small>{localT.month6}</small>');
content = content.replace(/<strong>Diamond<\/strong><br>\s*<small>9 mois<\/small>/, '<strong>{localT.form_diamond}</strong><br><small>{localT.month9}</small>');
content = content.replace(/<div class="error-message" id="formuleError">Veuillez sélectionner une formule<\/div>/, '<div class="error-message" id="formuleError">{localT.err_formule}</div>');

// Step 4
content = content.replace(/<h3>Choisissez votre fréquence<\/h3>/, '<h3>{localT.chooseFrequency}</h3>');
content = content.replace(/<h5 id="sessionDuration">Séance = 2 heures<\/h5>/, '<h5 id="sessionDuration">{localT.session_duration_2h}</h5>');
content = content.replace(/<strong>1 fois<\/strong><br>\s*<small>par semaine<\/small>/, '<strong>{localT.times_1}</strong><br><small>{localT.per_week}</small>');
content = content.replace(/<strong>2 fois<\/strong><br>\s*<small>par semaine<\/small>/, '<strong>{localT.times_2}</strong><br><small>{localT.per_week}</small>');
content = content.replace(/<strong>3 fois<\/strong><br>\s*<small>par semaine<\/small>/, '<strong>{localT.times_3}</strong><br><small>{localT.per_week}</small>');
content = content.replace(/<div class="error-message" id="frequencyError">Veuillez sélectionner une fréquence<\/div>/, '<div class="error-message" id="frequencyError">{localT.err_frequency}</div>');

// Step 5
content = content.replace(/<h3>Choisissez vos groupes<\/h3>/, '<h3>{localT.chooseGroups}</h3>');
content = content.replace(/Sélectionnez <span id="maxGroups">1<\/span> groupe\(s\) selon votre fréquence/, '{lang === \'ar\' ? \'حدد\' : (lang === \'en\' ? \'Select\' : \'Sélectionnez\')} <span id="maxGroups">1</span> {lang === \'ar\' ? \'مجموعة (مجموعات) حسب عدد الحصص\' : (lang === \'en\' ? \'group(s) based on frequency\' : \'groupe(s) selon votre fréquence\')}');
content = content.replace(/<div class="group-placeholder">Complétez d'abord les étapes précédentes<\/div>/g, '<div class="group-placeholder">{localT.group_placeholder}</div>');
content = content.replace(/<div class="error-message" id="groupeError">Veuillez sélectionner le bon nombre de groupes<\/div>/, '<div class="error-message" id="groupeError">{localT.err_groups}</div>');
content = content.replace(/Aucun groupe disponible pour cette combinaison. Essayez un autre emplacement./, '{localT.no_groups_msg}');

// Step 6
content = content.replace(/<h3>Vos informations personnelles<\/h3>/, '<h3>{localT.personalInfoTitle}</h3>');
content = content.replace(/<label for="nomComplet">Nom complet :<\/label>/, '<label for="nomComplet">{localT.label_fullname}</label>');
content = content.replace(/<div class="error-message" id="nomError">Veuillez saisir votre nom complet<\/div>/, '<div class="error-message" id="nomError">{localT.err_fullname}</div>');
content = content.replace(/<label for="telephone">Téléphone :<\/label>/, '<label for="telephone">{localT.label_phone}</label>');
content = content.replace(/<div class="error-message" id="telephoneError">Veuillez saisir un numéro de téléphone valide<\/div>/, '<div class="error-message" id="telephoneError">{localT.err_phone}</div>');
content = content.replace(/<label for="ville">Quelle est votre ville \?<\/label>/, '<label for="ville">{localT.label_city}</label>');
content = content.replace(/<div class="error-message" id="villeError">Veuillez saisir votre ville<\/div>/, '<div class="error-message" id="villeError">{localT.err_city}</div>');
content = content.replace(/Avez-vous besoin d'équipement \?/, '{localT.label_equipement}');

// Step 7
content = content.replace(/<h3>Récapitulatif de votre inscription<\/h3>/, '<h3>{localT.summaryTitle}</h3>');
content = content.replace(/Vérifiez vos informations avant de confirmer votre inscription./, '{localT.summary_verify}');

// Buttons
content = content.replace(/Suivant/, '{localT.btn_next}');
content = content.replace(/Précédent/, '{localT.btn_prev}');
content = content.replace(/Confirmer l'inscription/, '{localT.btn_confirm}');

fs.writeFileSync(targetFile, content, 'utf8');
console.log('✅ Inscription HTML replaced successfully!');
