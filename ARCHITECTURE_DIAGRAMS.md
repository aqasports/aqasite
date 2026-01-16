# AQA GROUPS MANAGER v3.1 - Architecture & Flow Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AQA GROUPS MANAGER v3.1                      │
│                      (Single HTML File)                         │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────┐
    │         HTML Interface (3-Column Layout)                 │
    │                                                          │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
    │  │  Column  │  │  Column  │  │  Column  │              │
    │  │   LEFT   │  │  MIDDLE  │  │  RIGHT   │              │
    │  │  (20%)   │  │  (60%)   │  │  (20%)   │              │
    │  │          │  │          │  │          │              │
    │  │ Sources  │  │  Visual  │  │  Output  │              │
    │  │ (Auto)   │  │  Editor  │  │  & Deploy│              │
    │  └──────────┘  └──────────┘  └──────────┘              │
    └─────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────┐
    │        JavaScript Engine (654 lines)                     │
    │                                                          │
    │  ┌──────────────────────────────────────────────┐      │
    │  │  FILE MANAGEMENT                             │      │
    │  │  • autoLoadFiles()                           │      │
    │  │  • refreshGroupes()                          │      │
    │  │  • refreshInscrip()                          │      │
    │  │  • downloadFile()                            │      │
    │  └──────────────────────────────────────────────┘      │
    │                                                          │
    │  ┌──────────────────────────────────────────────┐      │
    │  │  STATE MANAGEMENT                            │      │
    │  │  • docGroupes (DOM object)                   │      │
    │  │  • txtInscrip (text)                         │      │
    │  │  • hasUnsavedChanges (boolean)               │      │
    │  │  • originalGroupes, originalInscrip         │      │
    │  └──────────────────────────────────────────────┘      │
    │                                                          │
    │  ┌──────────────────────────────────────────────┐      │
    │  │  UI MANAGEMENT                               │      │
    │  │  • renderEditor()                            │      │
    │  │  • updateStatus()                            │      │
    │  │  • markAsChanged()                           │      │
    │  │  • markAsDeployed()                          │      │
    │  └──────────────────────────────────────────────┘      │
    │                                                          │
    │  ┌──────────────────────────────────────────────┐      │
    │  │  GENERATION & DEPLOYMENT                     │      │
    │  │  • generateAll()                             │      │
    │  │  • deployAll()                               │      │
    │  │  • loadFiles()                               │      │
    │  └──────────────────────────────────────────────┘      │
    └─────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────┐
    │        Data Flow & File System                           │
    │                                                          │
    │        Project Folder                                   │
    │        ├── groupes.html ────────┐                       │
    │        │                        │                       │
    │        ├── inscription.html ────┤                       │
    │        │                        ▼                       │
    │        │                    [Manager]                   │
    │        │                        │                       │
    │        │                        ▼                       │
    │        │            Visual Editor UI                    │
    │        │                        │                       │
    │        │                        ▼                       │
    │        │         User Makes Edits                       │
    │        │                        │                       │
    │        │                        ▼                       │
    │        │              GÉNÉRER Button                    │
    │        │              (Generate Code)                   │
    │        │                        │                       │
    │        │                        ▼                       │
    │        │        Output Textareas Filled                 │
    │        │                        │                       │
    │        │                        ▼                       │
    │        │         DÉPLOYER TOUT Button                   │
    │        │         (Deploy Both)                          │
    │        │                        │                       │
    │        │         ┌──────────────┴──────────────┐        │
    │        │         ▼                             ▼        │
    │        │    groupes.html                  inscription   │
    │        │    (Downloaded)                  .html         │
    │        │                                  (Downloaded)  │
    │        │         │                             │        │
    │        │         └──────────────┬──────────────┘        │
    │        │                        ▼                       │
    │        │              Browser Downloads                 │
    │        │                   Folder                       │
    │        │                        │                       │
    │        └────────────────────────┼──────────────────────┘
    │                                 │                       
    │              Manual Replace/Upload to Server            
    │                                 ▼                       
    │                      Updated Production                 
    │                                                          
    └─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
                    PAGE LOAD
                        │
                        ▼
        ┌───────────────────────────────┐
        │  window.addEventListener      │
        │  ('load', autoLoadFiles)      │
        └───────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    ┌────────┐     ┌────────┐    ┌─────────────┐
    │ Fetch  │     │ Fetch  │    │ Error Check │
    │groupes │     │inscrip │    │ & Fallback  │
    │.html   │     │.html   │    │             │
    └────────┘     └────────┘    └─────────────┘
         │              │              │
         ▼              ▼              ▼
    ┌──────────────────────────────────────┐
    │  Parse & Store Content               │
    │  • originalGroupes (backup)          │
    │  • originalInscrip (backup)          │
    │  • docGroupes (DOM)                  │
    │  • txtInscrip (text)                 │
    └──────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Update Status Badges                │
    │  • "✓ Chargé" (both files)           │
    │  • "AUTO-LOADED"                     │
    └──────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  loadFiles() → renderEditor()        │
    │  Display Coaches & Groups            │
    └──────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  Ready for User Editing              │
    │  Show: + AJOUTER COACH               │
    │        + CRÉNEAU buttons             │
    └──────────────────────────────────────┘
```

---

## 🔄 Edit & Change Detection Flow

```
USER MAKES AN EDIT
    │
    ├─ updateCoachName()
    │  └─→ markAsChanged()
    │
    ├─ updateData() / updateAttr()
    │  └─→ markAsChanged()
    │
    ├─ updateType()
    │  └─→ markAsChanged()
    │
    ├─ addCoach() / delCoach()
    │  └─→ markAsChanged()
    │
    └─ addGroup() / delGroup()
       └─→ markAsChanged()
                │
                ▼
        markAsChanged() {
            hasUnsavedChanges = true;
            
            // Show badge
            #statusBadge.style.display = 'block';
            
            // Show deploy buttons
            #deployBtn.style.display = 'block';
            #deployBtn2.style.display = 'block';
            
            // Show modification indicator
            #groupesMod.textContent = ' ⚠ MODIFIÉ';
            #inscripMod.textContent = ' ⚠ MODIFIÉ';
        }
```

---

## 🎬 Generation & Deployment Flow

```
USER CLICKS: GÉNÉRER
       │
       ▼
  validateFiles()
       │
       ├─ docGroupes exists? ✓
       ├─ txtInscrip exists? ✓
       │
       ▼
  generateGroupesHTML()
       │
       ├─ Remove .expanded classes
       ├─ Generate full HTML
       ├─ Remove xmlns attributes
       └─ Set #outGroupes textarea
       │
       ▼
  generateInscriptionJS()
       │
       ├─ Extract coaches from docGroupes
       ├─ Filter non-full groups only
       ├─ Generate IDs (clean names)
       ├─ Apply regex to txtInscrip
       │   /(men\s*:\s*\{\s*reghaia\s*:\s*)\[...\]/
       ├─ Replace with new array
       └─ Set #outInscrip textarea
       │
       ▼
  markAsChanged()
       │
       ├─ Show "CHANGES UNSAVED"
       └─ Show "DÉPLOYER TOUT"
       │
       ▼
  Ready for Deployment ✓


USER CLICKS: DÉPLOYER TOUT
       │
       ▼
  validateOutputs()
       │
       ├─ #outGroupes has content? ✓
       ├─ #outInscrip has content? ✓
       │
       ▼
  downloadFile('outGroupes', 'groupes.html')
       │
       ├─ Create Blob from textarea
       ├─ Generate download URL
       └─ Trigger browser download #1
       │
       ▼
  setTimeout(500ms)  ← Delay for queue
       │
       ▼
  downloadFile('outInscrip', 'inscription.html')
       │
       ├─ Create Blob from textarea
       ├─ Generate download URL
       └─ Trigger browser download #2
       │
       ▼
  setTimeout(500ms)  ← Wait for both
       │
       ▼
  markAsDeployed()
       │
       ├─ Hide "CHANGES UNSAVED"
       ├─ Hide "DÉPLOYER TOUT"
       ├─ Show alert: "✓ Déployé!"
       └─ hasUnsavedChanges = false
       │
       ▼
  Deployment Complete ✓
  Files in Downloads folder
```

---

## 🔄 Refresh Flow

```
USER CLICKS: 🔄 REFRESH (header button)
       │
       ├─→ refreshFiles()
       │   ├─→ refreshGroupes()
       │   └─→ refreshInscrip()
       │
       ├─ Fetch groupes.html?t=[timestamp]
       │   └─ Update textarea
       │   └─ Update originalGroupes
       │   └─ Show status
       │
       ├─ Fetch inscription.html?t=[timestamp]
       │   └─ Update textarea
       │   └─ Update originalInscrip
       │   └─ Show status
       │
       ├─ Call loadFiles()
       │   └─ Re-parse and render
       │
       └─ Show alert: "✓ Rechargé"


USER CLICKS: 🔄 RECHARGER (next to filename)
       │
       ├─→ refreshGroupes() or refreshInscrip()
       │
       ├─ Similar process as above
       │ but for single file
       │
       └─ Show alert: "✓ Fichier rechargé"
```

---

## 🎯 Status Indicators Timeline

```
PAGE LOAD
    │
    ▼
┌─────────────────────────────────┐
│ STEP 1: Files Loading           │
│ Badge: (loading...)             │
│ Files: -- (waiting)             │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ STEP 2: Files Loaded            │
│ Badge: AUTO-LOADED ✓ (green)    │
│ Files: ✓ Chargé (both green)    │
└─────────────────────────────────┘
    │
    ▼ (USER MAKES EDITS)
┌─────────────────────────────────┐
│ STEP 3: Changes Detected        │
│ Badge: CHANGES UNSAVED (red)    │
│ Files: ⚠ MODIFIÉ (red labels)   │
│ Buttons: DEPLOY visible         │
└─────────────────────────────────┘
    │
    ▼ (CLICK GÉNÉRER)
┌─────────────────────────────────┐
│ STEP 4: Code Generated          │
│ Output: Textareas filled        │
│ Status: Still unsaved           │
│ Buttons: DEPLOY still visible   │
└─────────────────────────────────┘
    │
    ▼ (CLICK DÉPLOYER TOUT)
┌─────────────────────────────────┐
│ STEP 5: Files Downloaded        │
│ Downloads: Both files ready     │
│ Alert: "✓ Déployé!"             │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ STEP 6: Deployment Complete     │
│ Badge: AUTO-LOADED (green)      │
│ Files: ✓ Chargé (both green)    │
│ DEPLOY Buttons: Hidden          │
│ Ready for next edits            │
└─────────────────────────────────┘
```

---

## 🗂️ Function Dependency Graph

```
window.load
    │
    └─→ autoLoadFiles()
        ├─→ fetch(groupes.html)
        ├─→ fetch(inscription.html)
        ├─→ updateGroupesStatus()
        ├─→ updateInscripStatus()
        └─→ loadFiles()
            ├─→ DOMParser.parseFromString()
            ├─→ renderEditor()
            │   └─→ for each coach section
            │       ├─→ updateCoachName()
            │       └─→ for each group
            │           ├─→ updateData()
            │           ├─→ updateAttr()
            │           └─→ updateType()
            │
            ├─→ markAsChanged()
            │   ├─→ Show badge
            │   ├─→ Show buttons
            │   └─→ Show indicators
            │
            └─→ Compare to original
                ├─→ markAsChanged() if modified

User Events:
    ├─→ Click [GÉNÉRER]
    │   └─→ generateAll()
    │       ├─→ generateGroupesHTML()
    │       ├─→ generateInscriptionJS()
    │       └─→ markAsChanged()
    │
    ├─→ Click [DÉPLOYER TOUT]
    │   └─→ deployAll()
    │       ├─→ downloadFile() #1
    │       ├─→ setTimeout(500)
    │       ├─→ downloadFile() #2
    │       ├─→ setTimeout(500)
    │       └─→ markAsDeployed()
    │           ├─→ Hide badge
    │           └─→ Hide buttons
    │
    ├─→ Click [🔄 REFRESH]
    │   └─→ refreshFiles()
    │       ├─→ refreshGroupes()
    │       ├─→ refreshInscrip()
    │       └─→ loadFiles()
    │
    └─→ Click [Edit Fields]
        ├─→ updateCoachName()
        │   └─→ markAsChanged()
        ├─→ updateData()
        │   └─→ markAsChanged()
        ├─→ updateAttr()
        │   └─→ markAsChanged()
        └─→ updateType()
            └─→ markAsChanged()
```

---

## 📱 Column Layout Architecture

```
┌────────────────────────────────────────────────────────────┐
│  HEADER (100% width, fixed)                               │
│  ┌──────┐  ┌────────────────────────┐  ┌──────────────┐   │
│  │ Logo │  │ Status Indicators     │  │ Buttons     │   │
│  │      │  │ Files | Refresh       │  │ Deploy      │   │
│  └──────┘  └────────────────────────┘  └──────────────┘   │
└────────────────────────────────────────────────────────────┘
│
├─────────────────────┬──────────────────────┬──────────────┤
│                     │                      │              │
│  COLUMN 1           │  COLUMN 2            │ COLUMN 3     │
│  (20%, left)        │  (60%, center)       │ (20%, right) │
│  Fixed Height       │  Scrollable          │ Fixed Height │
│                     │                      │              │
│  INPUTS             │  EDITOR              │ OUTPUTS      │
│                     │                      │              │
│  • Groupes.html     │  • Coach Cards       │ • Gen. Code  │
│    - Load           │  • Group Rows        │ • Down.      │
│    - Refresh        │  • Edit Fields       │ • Deploy     │
│                     │                      │              │
│  • Inscription.html │  • Add Coach         │ • Groupes    │
│    - Load           │  • Add Group         │ • Inscrip    │
│    - Refresh        │  • Delete Buttons    │              │
│                     │                      │              │
│  • Status Mods      │  • Color Coding      │ • Download   │
│    (⚠ indicators)   │  • Live Preview      │ • Copy       │
│                     │                      │              │
└─────────────────────┴──────────────────────┴──────────────┘
```

---

**Architecture Version**: 3.1
**Diagram Date**: January 16, 2026
**Status**: ✅ Production Ready
