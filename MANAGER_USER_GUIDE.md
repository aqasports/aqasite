# AQA GROUPS MANAGER v3.1 - Live Editor Mode

## 🚀 New Features

### Auto-Load System
The manager now **automatically loads** `groupes.html` and `inscription.html` from the same folder when the page loads. No more copy-pasting!

### Live Editing
- ✅ Visual editor for coaches and groups
- ✅ Real-time status tracking
- ✅ Change indicators on modified files
- ✅ One-click deployment

### Smart Deployment
- ✅ Generate both files at once
- ✅ Download both files simultaneously
- ✅ Clear deployment status badge
- ✅ Professional workflow

---

## 📋 How to Use

### **Step 1: Set Up (First Time)**
1. Place `AQA GROUPS MANAGER.html` in the same folder as `groupes.html` and `inscription.html`
2. Open the manager in your browser
3. Files auto-load automatically ✓

### **Step 2: Edit Your Groups**
The visual editor displays your coaches and groups with:
- **Coach Name** - Click to rename
- **Day/Time** - Edit the schedule
- **Taken/Total** - Update availability
- **Type** - Select G10, Max5, Apnée, or Elite
- **Delete** - Remove groups or coaches

### **Step 3: Add New Content**
- **+ AJOUTER UN NOUVEAU COACH** - Add a new coach section
- **+ CRÉNEAU** - Add a new group/time slot

### **Step 4: Generate Code**
Click **GÉNÉRER** to:
- Update `groupes.html` with your changes
- Auto-sync `inscription.html` with new groups

### **Step 5: Deploy**
Once generated, click **DÉPLOYER TOUT** to:
- Download both updated files automatically
- Get deployment confirmation

---

## 🔄 Status Indicators

### Header Badge
- **✓ AUTO-LOADED** (Green) - Files loaded from folder
- **CHANGES UNSAVED** (Red) - Modifications made but not deployed

### File Status
- **✓ Chargé** - File loaded from folder
- **⚠ Manuel** - File needs manual loading (fallback mode)

### Modification Indicators
- **⚠ MODIFIÉ** - Shows red next to filenames when edited

---

## 🔧 Workflow

```
┌─────────────────────────────────────┐
│  1. OPEN MANAGER                    │
│  (Files auto-load from folder)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  2. EDIT IN VISUAL EDITOR           │
│  (Watch for ⚠ MODIFIÉ indicators)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  3. CLICK GÉNÉRER                   │
│  (Generate updated code)            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  4. CLICK DÉPLOYER TOUT             │
│  (Download both files)              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  5. REPLACE ORIGINALS IN FOLDER     │
│  (Or upload to server)              │
└─────────────────────────────────────┘
```

---

## 💡 Pro Tips

### Refresh Files Anytime
Click **🔄 REFRESH** to reload files from folder (useful if edited externally)

### Manual Refresh Individual Files
- **Groupes**: Click 🔄 next to "Groupes.html"
- **Inscription**: Click 🔄 next to "Inscription.html"

### Copy Before Deploy
- Use **📋 COPIER** to copy generated code to clipboard
- Use **💾 TÉLÉCHARGER** to download individual files

### Batch Deployment
1. Edit multiple coaches/groups
2. Click **GÉNÉRER** once
3. Click **DÉPLOYER TOUT** for both files at once

---

## ⚡ Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Generate | Manual click |
| Deploy | Manual click |
| Copy | Manual click |

---

## 🛡️ Error Handling

### File Not Loading?
- Check browser console (F12)
- Verify files are in same folder
- Try clicking **🔄 REFRESH**
- Use manual paste as fallback

### Regex Error on Generate?
- Ensure `inscription.html` has proper structure: `men: { reghaia: [ ... ] }`
- Check that array is properly formatted
- Contact support if structure differs

### Deployment Issues?
- Ensure both textareas have generated content
- Files download to your Downloads folder
- Check browser download settings

---

## 📊 What Gets Synced?

### groupes.html → inscription.html
The system extracts:
- ✓ Coach names
- ✓ Day/Time schedules
- ✓ Availability (only non-full groups)
- ✓ Group type info

### Auto-Generated in inscription.html
- ✓ Group IDs (normalized from coach/day/time)
- ✓ Group labels (formatted for display)
- ✓ Filters out full (0 available) groups

---

## 🚨 Important Notes

1. **Backup First** - Always backup original files before deploying
2. **Test Changes** - Generate and review code before deploying
3. **Manual Sync Needed** - Other categories (women, teens, kids, apnea) require manual updates
4. **Check Regex** - If inscription fails, check the file structure is correct
5. **Deploy When Ready** - Don't share incomplete/unsaved changes

---

## 📞 Troubleshooting

**Q: Files not auto-loading?**
A: Check browser console for CORS errors. Ensure files are in the same folder. Try manual paste.

**Q: Generate button not working?**
A: Ensure files are loaded first. Check that coach names don't have special characters.

**Q: Deploy downloads nothing?**
A: Check browser download settings. Try using COPIER first to verify content exists.

**Q: Multiple coaches with same name?**
A: Rename them - IDs are generated from coach names.

---

**Version**: 3.1 Live Editor
**Last Updated**: January 16, 2026
**Status**: Ready for production
