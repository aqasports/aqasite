import os

file_path = r"c:\Users\dell\Desktop\aqasportsdotpro\src\pages\[adminSlug].astro"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update <script> tag to remove define:vars
old_script_tag = "<script is:inline define:vars={{ scheduleData, formationsData, infrastructuresData, countersData, passwordHash }}>"
new_script_tag = "<script is:inline>"
if old_script_tag in content:
    content = content.replace(old_script_tag, new_script_tag)
    print("Step 1: Removed define:vars from script tag.")
else:
    # Try with different spacing/quotes
    old_script_tag_variant = old_script_tag.replace("define:vars={{", "define:vars={ {")
    if old_script_tag_variant in content:
        content = content.replace(old_script_tag_variant, new_script_tag)
        print("Step 1: Removed define:vars from script tag (variant).")
    else:
        print("Step 1 Warning: script tag not found.")

# 2. Add Netlify function mappings to safeFetchJson
old_fetch_mapping = "if (!isLocal && url.startsWith('/api/save-')) {"
new_fetch_mapping = """if (!isLocal && url === '/api/admin-auth') {
      url = '/.netlify/functions/admin-auth';
    }
    if (!isLocal && url === '/api/verify-token') {
      url = '/.netlify/functions/verify-token';
    }
    if (!isLocal && url === '/api/admin-data') {
      url = '/.netlify/functions/admin-data';
    }

    if (!isLocal && url.startsWith('/api/save-')) {"""

if old_fetch_mapping in content:
    content = content.replace(old_fetch_mapping, new_fetch_mapping)
    print("Step 2: Mapped production auth/data API endpoints to Netlify functions.")
else:
    print("Step 2 Warning: fetch mapping not found.")

# 3. Replace Auth layer & Core data variables
# We will find the block from the start of login form handler to the core data definitions
start_token = "  // LOGIN FORM HANDLER — server-side verified auth with client-side fallback"
end_token = "  let currentCounters = JSON.parse(JSON.stringify(countersData));"

start_idx = content.find(start_token)
end_idx = content.find(end_token)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_token)
    
    new_auth_and_data = """  // LOGIN FORM HANDLER — server-side verified auth
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = document.getElementById('adminPassword').value;
    const btn = document.getElementById('loginBtn');
    const errDiv = document.getElementById('loginError');
    const btnText = document.getElementById('loginBtnText');
    const btnSpinner = document.getElementById('loginBtnSpinner');

    errDiv.style.display = 'none';
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    btn.disabled = true;

    let token = '';
    let authenticated = false;

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('text/html')) {
        let errText = 'Mot de passe incorrect ou erreur serveur.';
        try {
          const data = await res.json();
          errText = data.error || errText;
        } catch(e) {}
        errDiv.style.display = 'block';
        errDiv.textContent = '❌ ' + errText;
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        btn.disabled = false;
        return;
      }

      const data = await res.json();
      if (data.success && data.token) {
        token = data.token;
        authenticated = true;
      }
    } catch(err) {
      errDiv.style.display = 'block';
      errDiv.textContent = '❌ Erreur réseau: ' + err.message;
    }

    if (authenticated) {
      adminToken = token;
      sessionStorage.setItem(SESSION_KEY, adminToken);
      showAdminPanel();
    }

    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    btn.disabled = false;
  });

  // LOGOUT HELPER
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    adminToken = '';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('adminPassword').value = '';
  }

  // LOGOUT EVENT
  document.getElementById('logoutBtn').addEventListener('click', logout);

  function showAdminPanel() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'grid';
    loadLiveDashboard();
  }

  // On page load: if token stored in session, verify it against the server
  async function checkExistingSession() {
    if (!adminToken) return; // no token → show login
    let valid = false;

    try {
      const res = await fetch('/api/verify-token', {
        headers: authHeaders()
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        const data = await res.json();
        if (data.success) {
          valid = true;
        }
      }
    } catch (e) {
      console.warn("Session check failed:", e);
    }

    if (valid) {
      showAdminPanel();
    } else {
      logout();
    }
  }

  checkExistingSession();

  // ==================== CORE DATA ====================
  let currentSchedule = {};
  let currentFormations = [];
  let currentInfrastructures = [];
  let currentCounters = {};"""

    content = content[:start_idx] + new_auth_and_data + content[end_idx:]
    print("Step 3: Replaced Auth block and core data definitions with dynamic setups.")
else:
    print(f"Step 3 Warning: Could not find start ({start_idx != -1}) or end ({end_idx != -1}) tokens for Auth block.")

# 4. Replace loadLiveDashboard function
old_dashboard_start = "  async function loadLiveDashboard() {"
old_dashboard_end = "    updateDashboardStats();\n  }"
start_dash = content.find(old_dashboard_start)

# Let's locate the first occurrences after start_dash
if start_dash != -1:
    # Find the end of the loadLiveDashboard function (updateDashboardStats();\r\n  })
    # Since line endings might be CRLF, we search for updateDashboardStats() followed by }
    search_area = content[start_dash:start_dash+2000]
    end_dash_rel = search_area.find("updateDashboardStats();")
    if end_dash_rel != -1:
        end_dash_close = search_area.find("}", end_dash_rel)
        if end_dash_close != -1:
            end_dash = start_dash + end_dash_close + 1
            
            new_dashboard = """  async function loadLiveDashboard() {
    try {
      const res = await safeFetchJson('/api/admin-data', {
        headers: authHeaders()
      });
      if (res.ok && res.data.success) {
        currentSchedule = res.data.schedule || {};
        currentFormations = res.data.formations || [];
        currentInfrastructures = res.data.infrastructures || [];
        currentCounters = res.data.counters || {};

        // Populate settings slug displays dynamically
        const config = res.data.config || {};
        if (config.loginSlug) {
          const displays = ['currentSlugDisplay', 'urlSlugDisplay'];
          displays.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = config.loginSlug;
          });
        }
      } else {
        alert("Session expirée ou non autorisée. Veuillez vous reconnecter.");
        logout();
        return;
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors du chargement des données d'administration : " + e.message);
      logout();
      return;
    }

    try {
      Object.keys(currentSchedule).forEach(locKey => {
        const loc = currentSchedule[locKey];
        if (loc && loc.categories) {
          Object.keys(loc.categories).forEach(catKey => {
            const cat = loc.categories[catKey];
            if (cat && cat.coaches) {
              cat.coaches.forEach(coach => {
                if (coach.slots) {
                  coach.slots.forEach(slot => {
                    if (slot.type === 'complet') {
                      slot.type = slot.total <= 5 ? 'max5' : 'g10';
                    }
                  });
                }
              });
            }
          });
        }
      });
    } catch (e) {
      console.warn("Failed to load live scheduler occupancy data.");
    }

    initSelectors();
    renderPlanning();
    renderFormations();
    renderInfrastructures();
    initCountersInput();
    updateDashboardStats();
  }"""
            content = content[:start_dash] + new_dashboard + content[end_dash:]
            print("Step 4: Replaced loadLiveDashboard with secure dynamic fetch loader.")
        else:
            print("Step 4 Warning: Could not find closing brace of loadLiveDashboard.")
    else:
        print("Step 4 Warning: Could not find updateDashboardStats call in loadLiveDashboard.")
else:
    print("Step 4 Warning: Could not find start of loadLiveDashboard.")

# 5. Add Deploy verification popup and loadSettingsConfig authorization header
# We will locate the deploy click listener
old_deploy_listener_start = "  // ==================== DEPLOY ====================\n  document.getElementById('deployGitBtn').addEventListener('click', async () => {"
if old_deploy_listener_start not in content:
    old_deploy_listener_start = "  // ==================== DEPLOY ====================\r\n  document.getElementById('deployGitBtn').addEventListener('click', async () => {"

new_deploy_and_settings = """  // ==================== DEPLOY ====================
  document.getElementById('deployGitBtn').addEventListener('click', async () => {
    const confirmed = confirm("Êtes-vous sûr de vouloir déclencher un déploiement de production sur GitHub ?");
    if (!confirmed) return;

    const pwd = prompt("Veuillez saisir votre mot de passe administrateur pour valider le déploiement :");
    if (pwd === null) return; // user cancelled
    if (!pwd) {
      alert("Le mot de passe est requis pour le déploiement.");
      return;
    }

    const statusEl = document.getElementById('deployStatus');
    const consoleLogs = document.getElementById('deployLogsConsole');
    statusEl.textContent = 'Déploiement en cours... 🚀';
    statusEl.className = 'deploy-status active';
    consoleLogs.textContent = '>>> Lancement de deploy-now.bat...\\n>>> Connexion au serveur Git...\\n';
    try {
      const { ok, data } = await safeFetchJson('/api/deploy', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ password: pwd })
      });
      if (ok && data.success) {
        statusEl.textContent = '✓ Site Déployé avec succès !';
        statusEl.className = 'deploy-status success';
        consoleLogs.textContent += '\\n[STDOUT]\\n' + data.stdout;
      } else {
        statusEl.textContent = '❌ Échec de déploiement';
        statusEl.className = 'deploy-status error';
        consoleLogs.textContent += '\\n[ERROR]\\n' + (data.message || 'Erreur inconnue') + '\\n' + (data.stderr || '');
      }
    } catch(e) {
      statusEl.textContent = '❌ Échec réseau: ' + e.message;
      statusEl.className = 'deploy-status error';
      consoleLogs.textContent += '\\n[NET_ERROR]\\n' + e.message;
    }
  });

  // ==================== SETTINGS TAB ====================

  // Load current config from server (slug display)
  async function loadSettingsConfig() {
    try {
      const { ok, data } = await safeFetchJson('/api/admin-config', {
        headers: authHeaders()
      });
      if (ok) {
        const slug = data.loginSlug || 'aqacontrol2026';
        document.getElementById('currentSlugDisplay').textContent = slug;
        document.getElementById('urlSlugDisplay').textContent = slug;
        document.getElementById('urlOriginDisplay').textContent = window.location.origin + '/';
      }
    } catch(e) {
      document.getElementById('urlOriginDisplay').textContent = window.location.origin + '/';
    }
  }"""

# We'll replace from old_deploy_listener_start up to the end of loadSettingsConfig
start_deploy_idx = content.find("  // ==================== DEPLOY ====================")
end_deploy_token = "  loadSettingsConfig();"
end_deploy_idx = content.find(end_deploy_token)

if start_deploy_idx != -1 and end_deploy_idx != -1:
    end_deploy_idx += len(end_deploy_token)
    content = content[:start_deploy_idx] + new_deploy_and_settings + "\n  loadSettingsConfig();" + content[end_deploy_idx:]
    print("Step 5: Updated deployment trigger and settings loading.")
else:
    print(f"Step 5 Warning: Could not find start ({start_deploy_idx != -1}) or end ({end_deploy_idx != -1}) for deploy section.")

# 6. Update password change handler to send currentPassword to server and remove client-side check
old_pwd_handler_start = "  // Password change handler\n  document.getElementById('savePasswordBtn').addEventListener('click', async () => {"
if old_pwd_handler_start not in content:
    old_pwd_handler_start = "  // Password change handler\r\n  document.getElementById('savePasswordBtn').addEventListener('click', async () => {"

new_pwd_handler = """  // Password change handler
  document.getElementById('savePasswordBtn').addEventListener('click', async () => {
    const status = document.getElementById('savePasswordStatus');
    const currentPwd = document.getElementById('currentPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;

    status.textContent = ''; status.className = 'save-status';

    if (!currentPwd || !newPwd || !confirmPwd) {
      status.textContent = '❌ Tous les champs sont requis.'; status.className = 'save-status error'; return;
    }
    if (newPwd.length < 8) {
      status.textContent = '❌ Minimum 8 caractères.'; status.className = 'save-status error'; return;
    }
    if (newPwd !== confirmPwd) {
      status.textContent = '❌ Les mots de passe ne correspondent pas.'; status.className = 'save-status error'; return;
    }

    status.textContent = 'Mise à jour...';
    // SHA-256 hash of the new password (server still accepts sha-256 passwordHash, which it then hashes with bcrypt)
    // We can compute the newHash using our sha256 function
    const newHash = await sha256(newPwd);

    // Try to save to server
    try {
      const { ok, data } = await safeFetchJson('/api/save-admin-config', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword: currentPwd, passwordHash: newHash })
      });
      if (ok && data.success) {
        status.textContent = '✓ Mot de passe mis à jour ! Déconnexion dans 3s...';
        status.className = 'save-status success';
      } else {
        status.textContent = '❌ Erreur serveur: ' + (data.message || data.error || 'erreur');
        status.className = 'save-status error';
      }
    } catch(e) {
      status.textContent = '❌ ' + e.message;
      status.className = 'save-status error';
    }

    // Auto logout after 3s so user re-authenticates with new password
    setTimeout(() => {
      logout();
    }, 3000);
  });"""

start_pwd_idx = content.find("  // Password change handler")
# Find the next listener assignment or script end block
end_pwd_idx = content.find("  // URL slug change - live preview")

if start_pwd_idx != -1 and end_pwd_idx != -1:
    content = content[:start_pwd_idx] + new_pwd_handler + "\n\n" + content[end_pwd_idx:]
    print("Step 6: Updated password change verification to occur server-side.")
else:
    print(f"Step 6 Warning: Could not find start ({start_pwd_idx != -1}) or end ({end_pwd_idx != -1}) for password change section.")

# 7. Remove current URL and current password displays in settings card HTML
old_settings_card = """        <div class="glass-panel settings-info-card">
          <div class="settings-info-row">
            <div class="settings-info-item">
              <span class="settings-info-label">🔐 Mot de passe actuel</span>
              <span class="settings-info-value">••••••••••••</span>
            </div>
            <div class="settings-info-item">
              <span class="settings-info-label">🔗 URL d'accès actuelle</span>
              <span class="settings-info-value" id="currentSlugDisplay">{adminConfig.loginSlug || 'aqacontrol2026'}</span>
            </div>
          </div>
          <div class="settings-url-preview">
            <span class="url-prefix" id="urlOriginDisplay"></span><span class="url-slug" id="urlSlugDisplay">{adminConfig.loginSlug || 'aqacontrol2026'}</span>
            <button class="btn-copy" id="copyUrlBtn" title="Copier l'URL">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </div>"""

new_settings_card = """        <div class="glass-panel settings-info-card">
          <div class="settings-info-row">
            <div class="settings-info-item">
              <span class="settings-info-label">🔐 Mot de passe actuel</span>
              <span class="settings-info-value">••••••••••••</span>
            </div>
            <div class="settings-info-item">
              <span class="settings-info-label">🔗 URL d'accès actuelle</span>
              <span class="settings-info-value" id="currentSlugDisplay">••••••••••••</span>
            </div>
          </div>
          <div class="settings-url-preview">
            <span class="url-prefix" id="urlOriginDisplay"></span><span class="url-slug" id="urlSlugDisplay">••••••••••••</span>
            <button class="btn-copy" id="copyUrlBtn" title="Copier l'URL">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </div>"""

# Replace in content (handling potential spacing variations)
# We can do exact replace first
if old_settings_card in content:
    content = content.replace(old_settings_card, new_settings_card)
    print("Step 7: Masked current slug and URL prefix dynamically in HTML to prevent build leaks.")
else:
    # Try normalized spacing
    normalized_old = "\\n".join([line.strip() for line in old_settings_card.split("\\n")])
    print("Step 7: Old settings card not found directly. Will try a line-by-line replacement.")
    # Fallback: search for currentSlugDisplay and replace the tags
    content = content.replace('id="currentSlugDisplay">{adminConfig.loginSlug || \'aqacontrol2026\'}</span>', 'id="currentSlugDisplay">••••••••••••</span>')
    content = content.replace('id="urlSlugDisplay">{adminConfig.loginSlug || \'aqacontrol2026\'}</span>', 'id="urlSlugDisplay">••••••••••••</span>')
    print("Step 7 Fallback: Masked currentSlugDisplay and urlSlugDisplay bindings.")

# Save modified content back to file
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Modification complete.")
