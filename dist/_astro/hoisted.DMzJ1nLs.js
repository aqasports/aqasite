import"./hoisted.CY-5tZQz.js";const g={men:{reghaia:[{id:"men_reg_youcef_mercredi_21h3023h30",label:"Mercredi - 21h30-23h30 - Youcef"},{id:"men_reg_youcef_jeudi_21h3023h30",label:"Jeudi - 21h30-23h30 - Youcef"},{id:"men_reg_nouga_mercredi_21h3023h30",label:"Mercredi - 21h30-23h30 - Nouga"},{id:"men_reg_abdelghani_mercredi_8h10h",label:"Mercredi - 8h - 10h - Abdelghani"},{id:"men_reg_abdelghani_mardi_7h9h",label:"Mardi - 7h - 9h - Abdelghani"},{id:"men_reg_abdelghani_jeudi_7h9h",label:"Jeudi - 7h - 9h - Abdelghani"},{id:"men_reg_abdelghani_samedielite_21h23h",label:"Samedi ELITE - 21h - 23h - Abdelghani"},{id:"men_reg_riyad_lundi_21h3023h30",label:"Lundi - 21h30-23h30 - Riyad"}],cheraga:[]},women:{reghaia:[],cheraga:[]},teens:{reghaia:[],cheraga:[]},kids:{reghaia:[{id:"kids_group_a",label:"Sam Merc 18h - Groupe A"},{id:"kids_group_b",label:"Dim Jeu 18h - Groupe B"},{id:"kids_group_c",label:"Dim Merc 19h20 - Groupe C"}],cheraga:[]},apnea:{reghaia:[{id:"apnea_group_1",label:"Mercredi - 21h30-23h30 - Objectif 4 min - Coach Nouga"}],cheraga:[]}},m={reghaia:"Reghaïa - ADM AZAL",cheraga:"Chéraga - BK Sport"},p={men:"Hommes",women:"Femmes",teens:"Adolescents",kids:"Enfants",apnea:"Apnée"};let i=1,t={category:null,piscine:null,formule:null,frequency:null,groupes:[],personalInfo:{}};E(),I(),B(),S(),L(),f();function E(){const e=document.getElementById("piscineSelect");e.innerHTML='<option value="">-- Sélectionnez une piscine --</option>',Object.keys(m).forEach(n=>{const s=document.createElement("option");s.value=n,s.textContent=m[n],e.appendChild(s)})}function I(){const e=document.querySelectorAll(".category-option");e.forEach(n=>{n.addEventListener("click",()=>{e.forEach(s=>s.classList.remove("selected")),n.classList.add("selected"),t.category=n.dataset.category,b(t.category),A(),c("categoryError"),setTimeout(()=>{u()&&d(1)},300)})})}function b(e){const n=document.body;switch(n.classList.remove("theme-women","theme-teens","theme-kids","theme-apnea"),e){case"women":n.classList.add("theme-women");break;case"teens":n.classList.add("theme-teens");break;case"kids":n.classList.add("theme-kids");break;case"apnea":n.classList.add("theme-apnea");break}}function B(){const e=document.querySelectorAll(".formule-card");e.forEach(n=>{n.addEventListener("click",()=>{e.forEach(s=>s.classList.remove("selected")),n.classList.add("selected"),t.formule=n.dataset.formule,c("formuleError"),setTimeout(()=>{u()&&d(1)},300)})})}function S(){const e=document.querySelectorAll(".frequency-option");e.forEach(n=>{n.addEventListener("click",()=>{e.forEach(s=>s.classList.remove("selected")),n.classList.add("selected"),t.frequency=parseInt(n.dataset.frequency),document.getElementById("maxGroups").textContent=t.frequency,c("frequencyError"),y(),setTimeout(()=>{u()&&d(1)},300)})})}function L(){document.getElementById("piscineSelect").addEventListener("change",e=>{t.piscine=e.target.value,c("piscineError"),y()}),document.getElementById("groupeSelect").addEventListener("change",e=>{const n=Array.from(e.target.selectedOptions);t.groupes=n.map(s=>s.value),c("groupeError")}),["nomComplet","telephone","ville"].forEach(e=>{document.getElementById(e).addEventListener("input",()=>{c(e.replace("Complet","")+"Error")})}),document.getElementById("inscriptionForm").addEventListener("submit",C)}function y(){const e=document.getElementById("groupeSelect"),n=document.getElementById("noGroupsMessage");if(e.innerHTML='<option value="">-- Sélectionnez vos groupes --</option>',!t.category||!t.piscine||!t.frequency){e.disabled=!0,e.innerHTML=`<option value="">-- Complétez d'abord les étapes précédentes --</option>`,n.classList.remove("show");return}const s=g[t.category],a=s&&s[t.piscine]?s[t.piscine]:[];a.length===0?(e.disabled=!0,e.innerHTML='<option value="">Aucun groupe disponible</option>',n.classList.add("show")):(e.disabled=!1,n.classList.remove("show"),a.forEach(l=>{const r=document.createElement("option");r.value=l.id,r.textContent=l.label,e.appendChild(r)})),t.groupes=[]}function d(e){const n=document.getElementById(`step${i}`);if(!u())return;n.classList.remove("active");let s=i+e;const a=t.category==="kids";if(s===3){const r=document.querySelector('.formule-card[data-formule="starter"]');r&&(r.style.display=a?"none":"block")}a&&s===4&&(s=5,t.frequency=1,document.getElementById("maxGroups").textContent="1",y()),i=s,document.getElementById(`step${i}`).classList.add("active"),f(),h(),i===7&&q()}function u(){switch(i){case 1:return t.category?!0:(o("categoryError","Veuillez sélectionner une catégorie"),!1);case 2:return t.piscine?!0:(o("piscineError","Veuillez sélectionner une piscine"),!1);case 3:return t.formule?!0:(o("formuleError","Veuillez sélectionner une formule"),!1);case 4:return t.frequency?!0:(o("frequencyError","Veuillez sélectionner une fréquence"),!1);case 5:return!t.groupes||t.groupes.length!==t.frequency?(o("groupeError",`Veuillez sélectionner exactement ${t.frequency} groupe(s)`),!1):!0;case 6:return _();default:return!0}}function _(){let e=!0;const n=document.getElementById("nomComplet").value.trim();n?t.personalInfo.nom=n:(o("nomError","Veuillez saisir votre nom complet"),e=!1);const s=document.getElementById("telephone").value.trim();!s||!/^[0-9 +()-]{8,}$/.test(s)?(o("telephoneError","Veuillez saisir un numéro de téléphone valide (au moins 8 caractères)"),e=!1):t.personalInfo.telephone=s;const l=document.getElementById("ville").value.trim();return l?t.personalInfo.ville=l:(o("villeError","Veuillez saisir votre ville"),e=!1),t.personalInfo.equipement=document.getElementById("equipement").checked,e}function o(e,n){const s=document.getElementById(e),a=s.previousElementSibling;s.textContent=n,s.classList.add("show"),(a.tagName==="INPUT"||a.tagName==="SELECT")&&a.classList.add("error")}function c(e){const n=document.getElementById(e),s=n.previousElementSibling;n.classList.remove("show"),(s.tagName==="INPUT"||s.tagName==="SELECT")&&s.classList.remove("error")}function f(){const e=i/7*100;document.getElementById("progressFill").style.width=e+"%",document.getElementById("currentStep").textContent=i}function h(){const e=document.getElementById("prevBtn"),n=document.getElementById("nextBtn"),s=document.getElementById("submitBtn");if(i===1?e.style.display="none":e.style.display="block",i===7?(n.style.display="none",s.style.display="block"):(n.style.display="block",s.style.display="none"),i===5){const a=document.getElementById("groupeSelect"),l=document.getElementById("noGroupsMessage").classList.contains("show");n.disabled=l||a.disabled}else n.disabled=!1}function q(){const e=document.getElementById("summarySection"),n=v();e.innerHTML=`
        <div class="summary-item">
          <div class="summary-label">Catégorie :</div>
          <div class="summary-value">${p[t.category]}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Piscine :</div>
          <div class="summary-value">${m[t.piscine]}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Formule :</div>
          <div class="summary-value">${t.formule.charAt(0).toUpperCase()+t.formule.slice(1)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Fréquence :</div>
          <div class="summary-value">${t.frequency} fois par semaine</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Groupes sélectionnés :</div>
          <div class="summary-value">
            ${n.map(s=>`• ${s.label}`).join("<br>")}
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Nom complet :</div>
          <div class="summary-value">${t.personalInfo.nom}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Téléphone :</div>
          <div class="summary-value">${t.personalInfo.telephone}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Ville :</div>
          <div class="summary-value">${t.personalInfo.ville}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Équipement nécessaire :</div>
          <div class="summary-value">${t.personalInfo.equipement?"Oui":"Non"}</div>
        </div>
      `}function v(){if(!t.category||!t.piscine||!t.groupes.length)return[];const n=g[t.category][t.piscine];return t.groupes.map(s=>n.find(a=>a.id===s)).filter(Boolean)}function C(e){if(e.preventDefault(),!u())return;document.getElementById("categoryInput").value=p[t.category],document.getElementById("piscineInput").value=m[t.piscine],document.getElementById("formuleInput").value=t.formule,document.getElementById("frequencyInput").value=t.frequency,document.getElementById("groupesInput").value=v().map(r=>r.label).join(", "),document.getElementById("nomInput").value=t.personalInfo.nom,document.getElementById("telephoneInput").value=t.personalInfo.telephone,document.getElementById("villeInput").value=t.personalInfo.ville,document.getElementById("equipementInput").value=t.personalInfo.equipement?"Oui":"Non";const n=v(),s={category:p[t.category],piscine:m[t.piscine],formule:t.formule,frequency:t.frequency,groupes:n.map(r=>r.label),personalInfo:t.personalInfo,timestamp:new Date().toISOString()};document.getElementById("payloadInput").value=JSON.stringify(s),document.getElementById("inscriptionForm").style.display="none";const a=document.getElementById("successMessage");k();const l=document.getElementById("finalSummary");l.innerHTML=`
        <div class="summary-item">
          <div class="summary-label">Catégorie :</div>
          <div class="summary-value">${s.category}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Piscine :</div>
          <div class="summary-value">${s.piscine}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Formule :</div>
          <div class="summary-value">${s.formule.charAt(0).toUpperCase()+s.formule.slice(1)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Fréquence :</div>
          <div class="summary-value">${s.frequency} fois par semaine</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Groupes :</div>
          <div class="summary-value">${s.groupes.join(", ")}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Contact :</div>
          <div class="summary-value">${s.personalInfo.nom} - ${s.personalInfo.telephone}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Ville :</div>
          <div class="summary-value">${s.personalInfo.ville}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Équipement :</div>
          <div class="summary-value">${s.personalInfo.equipement?"Oui":"Non"}</div>
        </div>
      `,a.classList.add("show"),setTimeout(()=>{e.target.submit()},1e3)}document.addEventListener("keydown",e=>{e.key==="Enter"&&e.target.type!=="submit"&&(e.preventDefault(),i<7&&u()&&d(1))});h();function k(){const e=document.getElementById("successMessage");e&&e.classList.add("show")}function A(){const e=document.getElementById("sessionDuration");e&&(t.category==="kids"?e.textContent="Séance = 1 heure":e.textContent="Séance = 2 heures")}
