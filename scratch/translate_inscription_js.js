const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/pages/inscription.astro');
let content = fs.readFileSync(targetFile, 'utf8');

// Define dictionary to be inserted inside the script block
const jsDictionaries = `
  const categoryDicts = {
    fr: { men: "Hommes", women: "Femmes", teens: "Adolescents", kids: "Enfants", apnea: "Apnée" },
    ar: { men: "رجال", women: "نساء", teens: "مراهقون", kids: "أطفال", apnea: "غوص حر" },
    en: { men: "Men", women: "Women", teens: "Teenagers", kids: "Kids", apnea: "Apnea" }
  };

  const poolDicts = {
    fr: { reghaia: 'Reghaïa - ADM AZAL', cheraga: 'Chéraga - BK Sport' },
    ar: { reghaia: 'الرغاية - أدم أزال', cheraga: 'الشراقة - بي كا سبورت' },
    en: { reghaia: 'Reghaia - ADM AZAL', cheraga: 'Cheraga - BK Sport' }
  };

  const poolLabelsDict = {
    fr: 'Reghaïa - ADM AZAL',
    cheraga: 'Chéraga - BK Sport'
  };

  const AQA_CATEGORIES = categoryDicts[lang] || categoryDicts.fr;
  const POOL_LABELS = poolDicts[lang] || poolDicts.fr;

  const errorsDict = {
    fr: {
      category: 'Veuillez sélectionner une catégorie',
      piscine: 'Veuillez sélectionner une piscine',
      formule: 'Veuillez sélectionner une formule',
      frequency: 'Veuillez sélectionner une fréquence',
      groups: (n) => \`Veuillez sélectionner exactement \${n} groupe(s)\`,
      fullname: 'Veuillez saisir votre nom complet',
      phone: 'Veuillez saisir un numéro de téléphone valide (au moins 8 caractères)',
      city: 'Veuillez saisir votre ville'
    },
    ar: {
      category: 'يرجى تحديد فئة',
      piscine: 'يرجى تحديد مسبح',
      formule: 'يرجى تحديد صيغة',
      frequency: 'يرجى تحديد التكرار',
      groups: (n) => \`يرجى اختيار بالضبط \${n} مجموعة (مجموعات)\`,
      fullname: 'يرجى إدخال اسمك الكامل',
      phone: 'يرجى إدخال رقم هاتف صالح (على الأقل 8 أرقام)',
      city: 'يرجى إدخال مدينتك'
    },
    en: {
      category: 'Please select a category',
      piscine: 'Please select a pool',
      formule: 'Please select a formula',
      frequency: 'Please select a frequency',
      groups: (n) => \`Please select exactly \${n} group(s)\`,
      fullname: 'Please enter your full name',
      phone: 'Please enter a valid phone number (at least 8 characters)',
      city: 'Please enter your city'
    }
  };
  const activeErrors = errorsDict[lang] || errorsDict.fr;

  const summaryLabels = {
    fr: {
      category: 'Catégorie :',
      piscine: 'Piscine :',
      formule: 'Formule :',
      frequency: 'Fréquence :',
      groups: 'Groupes sélectionnés :',
      fullname: 'Nom complet :',
      phone: 'Téléphone :',
      city: 'Ville :',
      equipement: 'Équipement nécessaire :',
      yes: 'Oui',
      no: 'Non',
      times: (n) => \`\${n} fois par semaine\`,
      contact: 'Contact :'
    },
    ar: {
      category: 'الفئة :',
      piscine: 'المسبح :',
      formule: 'الصيغة :',
      frequency: 'التكرار :',
      groups: 'المجموعات المختارة :',
      fullname: 'الاسم الكامل :',
      phone: 'الهاتف :',
      city: 'المدينة :',
      equipement: 'المعدات المطلوبة :',
      yes: 'نعم',
      no: 'لا',
      times: (n) => \`\${n} حصص في الأسبوع\`,
      contact: 'الاتصال :'
    },
    en: {
      category: 'Category:',
      piscine: 'Pool:',
      formule: 'Formula:',
      frequency: 'Frequency:',
      groups: 'Selected Groups:',
      fullname: 'Full name:',
      phone: 'Phone:',
      city: 'City:',
      equipement: 'Equipment needed:',
      yes: 'Yes',
      no: 'No',
      times: (n) => \`\${n} times per week\`,
      contact: 'Contact:'
    }
  };
  const sl = summaryLabels[lang] || summaryLabels.fr;
`;

// Insert the jsDictionaries block at the start of script block
content = content.replace(
  /const appEl = document\.getElementById\('registrationApp'\);([\s\S]*?)const AQA_GROUPS = \{/,
  (match, p1) => {
    return `const appEl = document.getElementById('registrationApp');\n  let scheduleData = JSON.parse(appEl?.dataset?.schedule || '{}');\n\n${jsDictionaries}\n\n  const AQA_GROUPS = {`;
  }
);

// Remove the old hardcoded AQA_CATEGORIES, POOL_LABELS declarations
content = content.replace(/const AQA_POOLS = \{\};[\s\S]*?const AQA_CATEGORIES = \{[\s\S]*?\};/, 'const AQA_POOLS = {};');

// Replace pool mapping logic in parseAndSetup:
// POOL_LABELS[locKey] is now dynamic, so we just use that.
// Let's make sure it matches:
content = content.replace(
  /AQA_POOLS\[locKey\] = POOL_LABELS\[locKey\] \|\| \(scheduleData\[locKey\]\.name \|\| locKey\);/,
  'AQA_POOLS[locKey] = POOL_LABELS[locKey] || (scheduleData[locKey].name || locKey);'
);

// Localize dynamic option details in renderGroupCards:
// - remaining and day abbreviation
const oldDayAbbr = `      const dayAbbr  = { 
        'Lundi':'Lun','Mardi':'Mar','Mercredi':'Mer','Jeudi':'Jeu','Vendredi':'Ven','Samedi':'Sam','Dimanche':'Dim',
        'Sam Merc': 'Sam/Mer', 'Dim Jeu': 'Dim/Jeu', 'Dim Merc': 'Dim/Mer', 'Samedi ELITE': 'Sam (Elite)'
      };
      const dayShort = dayAbbr[dayFull] || dayFull;
      const color    = typeColors[group.type] || '#00f2ff';
      const remTxt   = \`\${group.remaining} pl.\`;
      const typeTxt  = group.type.toUpperCase();`;

const newDayAbbr = `      const dayAbbrTexts = {
        fr: { 
          'Lundi':'Lun','Mardi':'Mar','Mercredi':'Mer','Jeudi':'Jeu','Vendredi':'Ven','Samedi':'Sam','Dimanche':'Dim',
          'Sam Merc': 'Sam/Mer', 'Dim Jeu': 'Dim/Jeu', 'Dim Merc': 'Dim/Mer', 'Samedi ELITE': 'Sam (Elite)'
        },
        ar: {
          'Lundi':'اثنين','Mardi':'ثلاثاء','Mercredi':'أربعاء','Jeudi':'خميس','Vendredi':'جمعة','Samedi':'سبت','Dimanche':'أحد',
          'Sam Merc': 'السبت/الأربعاء', 'Dim Jeu': 'الأحد/الخميس', 'Dim Merc': 'الأحد/الأربعاء', 'Samedi ELITE': 'السبت (نخبة)'
        },
        en: {
          'Lundi':'Mon','Mardi':'Tue','Mercredi':'Wed','Jeudi':'Thu','Vendredi':'Fri','Samedi':'Sat','Dimanche':'Sun',
          'Sam Merc': 'Sat/Wed', 'Dim Jeu': 'Sun/Thu', 'Dim Merc': 'Sun/Wed', 'Samedi ELITE': 'Sat (Elite)'
        }
      };
      const dayAbbr = dayAbbrTexts[lang] || dayAbbrTexts.fr;
      const dayShort = dayAbbr[dayFull] || dayFull;
      const color    = typeColors[group.type] || '#00f2ff';
      
      const remWord = { fr: 'pl.', ar: 'شواغر', en: 'left' };
      const remTxt   = \`\${group.remaining} \${remWord[lang] || remWord.fr}\`;

      const typeLabels = {
        fr: { g10: 'G10', max5: 'MAX5', apnea: 'Apnée', elite: 'Elite' },
        ar: { g10: 'G10', max5: 'MAX5', apnea: 'غوص حر', elite: 'نخبة' },
        en: { g10: 'G10', max5: 'MAX5', apnea: 'Apnea', elite: 'Elite' }
      };
      const typeTxt  = (typeLabels[lang] || typeLabels.fr)[group.type]?.toUpperCase() || group.type.toUpperCase();`;

content = content.replace(oldDayAbbr, newDayAbbr);

// Localize dropdown default option in populatePiscineOptions
content = content.replace(
  /piscineSelect\.innerHTML = '<option value="">-- Sélectionnez une piscine --<\/option>';/,
  `const selectLabel = {
      fr: '-- Sélectionnez une piscine --',
      ar: '-- اختر مسبحاً --',
      en: '-- Select a pool --'
    };
    piscineSelect.innerHTML = \`<option value="">\${selectLabel[lang] || selectLabel.fr}</option>\`;`
);

// Localize slot dynamic labeling: "remaining places" text inside parseAndSetup
const oldSlotLabeling = `            // Slot type label
            const typeLabels = { g10: 'G10', max5: 'MAX5', apnea: 'Apnée', elite: 'Elite' };
            const typeLabel = typeLabels[slot.type] || slot.type.toUpperCase();
            
            // Rich label with remaining places
            const groupPrefix = slot.group ? \`Groupe \${slot.group} • \` : '';
            const label = \`\${groupPrefix}\${slot.day} • \${slot.time} — \${coach.name} [\${typeLabel} — \${remaining} place\${remaining > 1 ? 's' : ''} restante\${remaining > 1 ? 's' : ''}]\`;
            // Short label for form submission
            const shortLabel = slot.group ? \`\${slot.day}||\${slot.time}||\${coach.name} (Groupe \${slot.group})\` : \`\${slot.day}||\${slot.time}||\${coach.name}\`;`;

const newSlotLabeling = `            // Slot type label
            const typeLabelTexts = {
              fr: { g10: 'G10', max5: 'MAX5', apnea: 'Apnée', elite: 'Elite' },
              ar: { g10: 'G10', max5: 'MAX5', apnea: 'غوص حر', elite: 'نخبة' },
              en: { g10: 'G10', max5: 'MAX5', apnea: 'Apnea', elite: 'Elite' }
            };
            const typeLabels = typeLabelTexts[lang] || typeLabelTexts.fr;
            const typeLabel = typeLabels[slot.type] || slot.type.toUpperCase();
            
            const localTexts = {
              fr: { group: 'Groupe', place: 'place restante', places: 'places restantes' },
              ar: { group: 'المجموعة', place: 'مكان شاغر', places: 'أماكن شاغرة' },
              en: { group: 'Group', place: 'place left', places: 'places left' }
            };
            const lt = localTexts[lang] || localTexts.fr;
            const groupPrefix = slot.group ? \`\${lt.group} \${slot.group} • \` : '';
            const placesWord = remaining > 1 ? lt.places : lt.place;
            const label = \`\${groupPrefix}\${slot.day} • \${slot.time} — \${coach.name} [\${typeLabel} — \${remaining} \${placesWord}]\`;
            // Short label for form submission
            const shortLabel = slot.group ? \`\${slot.day}||\${slot.time}||\${coach.name} (\${lt.group} \${slot.group})\` : \`\${slot.day}||\${slot.time}||\${coach.name}\`;`;

content = content.replace(oldSlotLabeling, newSlotLabeling);

// Localize Group placeholder inside updateGroupeOptions
content = content.replace(
  /document\.getElementById\('groupCardsContainer'\)\.innerHTML = '<div class="group-placeholder">Complétez d\\'abord les étapes précédentes<\/div>';/,
  `const placeholderText = {
        fr: "Complétez d'abord les étapes précédentes",
        ar: "أكمل الخطوات السابقة أولاً",
        en: "Complete the previous steps first"
      };
      document.getElementById('groupCardsContainer').innerHTML = \`<div class="group-placeholder">\${placeholderText[lang] || placeholderText.fr}</div>\`;`
);

// Localize validation errors
content = content.replace(
  /showError\('categoryError', 'Veuillez sélectionner une catégorie'\);/,
  "showError('categoryError', activeErrors.category);"
);
content = content.replace(
  /showError\('piscineError', 'Veuillez sélectionner une piscine'\);/,
  "showError('piscineError', activeErrors.piscine);"
);
content = content.replace(
  /showError\('formuleError', 'Veuillez sélectionner une formule'\);/,
  "showError('formuleError', activeErrors.formule);"
);
content = content.replace(
  /showError\('frequencyError', 'Veuillez sélectionner une fréquence'\);/,
  "showError('frequencyError', activeErrors.frequency);"
);
content = content.replace(
  /showError\('groupeError', `Veuillez sélectionner exactement \${selectedData.frequency} groupe\(s\)`\);/,
  "showError('groupeError', activeErrors.groups(selectedData.frequency));"
);
content = content.replace(
  /showError\('nomError', 'Veuillez saisir votre nom complet'\);/,
  "showError('nomError', activeErrors.fullname);"
);
content = content.replace(
  /showError\('telephoneError', 'Veuillez saisir un numéro de téléphone valide'\);/,
  "showError('telephoneError', activeErrors.phone);"
);
content = content.replace(
  /showError\('villeError', 'Veuillez saisir votre ville'\);/,
  "showError('villeError', activeErrors.city);"
);

// Localize renderGroupCards "Aucun groupe disponible"
content = content.replace(
  /container\.innerHTML = '<div style="text-align:center;padding:2rem 1rem;opacity:0.5;font-style:italic;font-size:0.9rem;">Aucun groupe disponible<\/div>';/,
  `const noGroupsText = {
        fr: 'Aucun groupe disponible',
        ar: 'لا توجد مجموعات متاحة',
        en: 'No groups available'
      };
      container.innerHTML = \`<div style="text-align:center;padding:2rem 1rem;opacity:0.5;font-style:italic;font-size:0.9rem;">\${noGroupsText[lang] || noGroupsText.fr}</div>\`;`
);

// Localize updateSummary HTML output
const oldSummary = `    summarySection.innerHTML = \`
      <div class="summary-item">
        <div class="summary-label">Catégorie :</div>
        <div class="summary-value">\${AQA_CATEGORIES[selectedData.category] || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Piscine :</div>
        <div class="summary-value">\${AQA_POOLS[selectedData.piscine] || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Formule :</div>
        <div class="summary-value">\${selectedData.formule ? selectedData.formule.charAt(0).toUpperCase() + selectedData.formule.slice(1) : ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Fréquence :</div>
        <div class="summary-value">\${selectedData.frequency || 0} fois par semaine</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Groupes sélectionnés :</div>
        <div class="summary-value">
          \${selectedGroups.map(group => \`• \${group.shortLabel || group.label}\`).join('<br>')}
        </div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Nom complet :</div>
        <div class="summary-value">\${selectedData.personalInfo.nom || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Téléphone :</div>
        <div class="summary-value">\${selectedData.personalInfo.telephone || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Ville :</div>
        <div class="summary-value">\${selectedData.personalInfo.ville || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Équipement nécessaire :</div>
        <div class="summary-value">\${selectedData.personalInfo.equipement ? 'Oui' : 'Non'}</div>
      </div>
    \`;`;

const newSummary = `    summarySection.innerHTML = \`
      <div class="summary-item">
        <div class="summary-label">\${sl.category}</div>
        <div class="summary-value">\${AQA_CATEGORIES[selectedData.category] || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.piscine}</div>
        <div class="summary-value">\${AQA_POOLS[selectedData.piscine] || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.formule}</div>
        <div class="summary-value">\${selectedData.formule ? selectedData.formule.charAt(0).toUpperCase() + selectedData.formule.slice(1) : ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.frequency}</div>
        <div class="summary-value">\${sl.times(selectedData.frequency || 0)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.groups}</div>
        <div class="summary-value">
          \${selectedGroups.map(group => \`• \${group.shortLabel || group.label}\`).join('<br>')}
        </div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.fullname}</div>
        <div class="summary-value">\${selectedData.personalInfo.nom || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.phone}</div>
        <div class="summary-value">\${selectedData.personalInfo.telephone || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.city}</div>
        <div class="summary-value">\${selectedData.personalInfo.ville || ''}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.equipement}</div>
        <div class="summary-value">\${selectedData.personalInfo.equipement ? sl.yes : sl.no}</div>
      </div>
    \`;`;

content = content.replace(oldSummary, newSummary);

// Localize handleSubmit finalSummary HTML output
const oldFinalSummary = `    finalSummary.innerHTML = \`
      <div class="summary-item">
        <div class="summary-label">Catégorie :</div>
        <div class="summary-value">\${payload.category}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Piscine :</div>
        <div class="summary-value">\${payload.piscine}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Formule :</div>
        <div class="summary-value">\${payload.formule.charAt(0).toUpperCase() + payload.formule.slice(1)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Fréquence :</div>
        <div class="summary-value">\${payload.frequency} fois par semaine</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Groupes :</div>
        <div class="summary-value">\${payload.groupes.join(', ')}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Contact :</div>
        <div class="summary-value">\${payload.personalInfo.nom} - \${payload.personalInfo.telephone}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Ville :</div>
        <div class="summary-value">\${payload.personalInfo.ville}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Équipement :</div>
        <div class="summary-value">\${payload.personalInfo.equipement ? 'Oui' : 'Non'}</div>
      </div>
    \`;`;

const newFinalSummary = `    finalSummary.innerHTML = \`
      <div class="summary-item">
        <div class="summary-label">\${sl.category}</div>
        <div class="summary-value">\${payload.category}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.piscine}</div>
        <div class="summary-value">\${payload.piscine}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.formule}</div>
        <div class="summary-value">\${payload.formule.charAt(0).toUpperCase() + payload.formule.slice(1)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.frequency}</div>
        <div class="summary-value">\${sl.times(payload.frequency)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.groups.replace('sélectionnés', '').replace('المختارة', '').replace('Selected', '')}</div>
        <div class="summary-value">\${payload.groupes.join(', ')}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.contact}</div>
        <div class="summary-value">\${payload.personalInfo.nom} - \${payload.personalInfo.telephone}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.city}</div>
        <div class="summary-value">\${payload.personalInfo.ville}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">\${sl.equipement.replace('nécessaire', '').replace('المطلوبة', '').replace('needed', '')}</div>
        <div class="summary-value">\${payload.personalInfo.equipement ? sl.yes : sl.no}</div>
      </div>
    \`;`;

content = content.replace(oldFinalSummary, newFinalSummary);

// Localize updateSessionDuration duration labeling
const oldSessionDuration = `  function updateSessionDuration() {
    const durationLabel = document.getElementById('sessionDuration');
    if (!durationLabel) return;
    if (selectedData.category === 'kids') {
      durationLabel.textContent = 'Séance = 1 heure';
    } else {
      durationLabel.textContent = 'Séance = 2 heures';
    }
  }`;

const newSessionDuration = `  function updateSessionDuration() {
    const durationLabel = document.getElementById('sessionDuration');
    if (!durationLabel) return;
    const sessionTexts = {
      fr: { h1: 'Séance = 1 heure', h2: 'Séance = 2 heures' },
      ar: { h1: 'الحصة = ساعة واحدة', h2: 'الحصة = ساعتان' },
      en: { h1: 'Session = 1 hour', h2: 'Session = 2 hours' }
    };
    const texts = sessionTexts[lang] || sessionTexts.fr;
    if (selectedData.category === 'kids') {
      durationLabel.textContent = texts.h1;
    } else {
      durationLabel.textContent = texts.h2;
    }
  }`;

content = content.replace(oldSessionDuration, newSessionDuration);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('✅ Inscription JS replaced successfully!');
