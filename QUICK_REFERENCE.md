# AQA GROUPS MANAGER - Quick Reference Card

## 🎯 Key Changes in v3.1

### ❌ BEFORE (v3.0)
- Had to open files and copy-paste content manually
- Manual file loading each time
- No change tracking
- No deployment workflow
- Tedious repetitive process

### ✅ AFTER (v3.1 - Live Editor)
- **Auto-loads files** from folder on startup
- **Live visual editing** with real-time changes
- **Change tracking** with visual indicators
- **One-click deployment** with file downloads
- **Professional workflow** with status badges

---

## 🚀 Quick Start (30 seconds)

1. **Place file in folder** with `groupes.html` and `inscription.html`
2. **Open in browser** → Files load automatically ✓
3. **Edit groups** in the visual editor
4. **Click GÉNÉRER** → Updates both files
5. **Click DÉPLOYER TOUT** → Downloads both files
6. **Replace originals** → Done! 🎉

---

## 📍 Location of Each Feature

```
┌─────────────────────────────────────────────────────────┐
│ HEADER: Status + Refresh Buttons                       │
│ ✓ AUTO-LOADED | CHANGES UNSAVED | 🔄 REFRESH | DEPLOY  │
└─────────────────────────────────────────────────────────┘
│                                                         │
├─ LEFT COLUMN:      ├─ MIDDLE COLUMN:   ├─ RIGHT COLUMN:
│  Fichiers Sources  │  Éditeur Visuel   │  Code Généré
│  (Auto-Chargés)    │  (Hommes-Reghaia) │  & Déploiement
│                    │                   │
│  📄 Groupes.html   │  👨 Coach Youcef  │  [GÉNÉRER]
│  🔄 RECHARGER      │  📅 Mon 7h-9h     │  [DÉPLOYER TOUT]
│                    │  ❌ SUPPR         │
│  📄 Inscription    │  ➕ CRÉNEAU       │  📋 COPIER
│  🔄 RECHARGER      │                   │  💾 TÉLÉCHARGER
│                    │  ➕ AJOUTER COACH │
└────────────────────┴───────────────────┴─────────────────┘
```

---

## ⚡ Common Tasks

### Add a New Coach
1. Scroll to bottom of visual editor
2. Click **➕ AJOUTER UN NOUVEAU COACH**
3. Edit the name (default: "Nouveau Coach")

### Add a Time Slot for a Coach
1. Find the coach section
2. Click **➕ CRÉNEAU** button
3. Edit: Day, Time, Availability, Type

### Change Group Availability
1. Find the group in the visual editor
2. Edit **Taken** field (e.g., 9/10)
3. Edit **Total** field (e.g., 10)

### Update Coach Name
1. Click on the coach name text field
2. Type new name
3. Changes auto-track (watch for ⚠ indicator)

### Deploy Changes
1. Edit coaches/groups as needed
2. Click **GÉNÉRER** button
3. Wait for code to generate
4. Click **DÉPLOYER TOUT** button
5. Two files download automatically
6. Replace originals in your folder

---

## 🔔 Status Indicators

| Badge | Meaning |
|-------|---------|
| ✓ AUTO-LOADED | Files loaded from folder |
| CHANGES UNSAVED | Modifications not yet deployed |
| ✓ Chargé | File successfully loaded |
| ⚠ Manuel | Fallback mode (manual loading) |
| ⚠ MODIFIÉ | File has been edited |

---

## 💾 Download Options

- **📋 COPIER** - Copy text to clipboard (for manual updates)
- **💾 TÉLÉCHARGER** - Download individual file
- **DÉPLOYER TOUT** - Download both files at once

---

## 🎨 Color Coding in Editor

| Color | Meaning |
|-------|---------|
| 🟢 Green border | Group has availability |
| 🔴 Red border | Group is full (0 slots) |
| Opacity 0.7 | Group marked as full |

---

## ⌨️ Keyboard Tips

- **Tab** to move between fields in editor
- **Enter** to confirm edits
- **Escape** to cancel edit (in most browsers)

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Files not loading | Check browser console, try 🔄 REFRESH |
| GÉNÉRER doesn't work | Ensure files are loaded, check coach names |
| Download stuck | Check browser downloads folder |
| Changes lost | Don't close browser without DEPLOYING |
| Regex error | Check `inscription.html` structure: `men: { reghaia: [...] }` |

---

## 📊 What Syncs Between Files

**groupes.html** (Visual):
- Coach names & schedules
- Group types & availability
- Visual styling

**inscription.html** (Data):
- Auto-generated from groupes.html
- Group IDs & labels
- Only non-full groups included
- Updates: `men: { reghaia: [ ... ] }`

---

## ✨ Pro Features

- **Real-time validation** - Prevents invalid data entry
- **Auto-ID generation** - Creates clean IDs from coach/day/time
- **Smart filtering** - Excludes full groups from inscription
- **Batch operations** - Deploy both files in one click
- **Change tracking** - Knows exactly what changed
- **Error recovery** - Console logs for debugging

---

**Version**: 3.1 Live Editor  
**Status**: Production Ready  
**Supported**: Chrome, Firefox, Edge, Safari  
**File Size**: ~25 KB  
**Dependencies**: None (pure HTML/CSS/JS)

