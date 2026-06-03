server_path = r"c:\Users\dell\Desktop\aqasportsdotpro\server.js"

with open(server_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace crypto import to include bcrypt and JWT secret
target_import = "const crypto = require('crypto');"
new_import_block = "const crypto = require('crypto');\nconst bcrypt = require('bcryptjs');\nconst JWT_SECRET = process.env.JWT_SECRET || 'aqa-sports-default-jwt-secret-key-2026';"

if target_import in content:
    content = content.replace(target_import, new_import_block)
    print("Final Step 1: Injected bcrypt import and JWT secret definition.")
else:
    print("Final Step 1 Warning: target_import not found.")

# 2. Secure app.post('/api/deploy')
target_deploy = "app.post('/api/deploy', verifyAdminToken, (req, res) => {"
new_deploy_block = """app.post('/api/deploy', verifyAdminToken, deployLimiter, (req, res) => {
  const { password } = req.body;
  const cfg = loadAdminConfig();
  const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'AqaSports2026!').digest('hex');

  if (!password || !verifyPassword(password, storedHash)) {
    return res.status(401).json({ success: false, error: 'Mot de passe incorrect pour le déploiement' });
  }"""

if target_deploy in content:
    content = content.replace(target_deploy, new_deploy_block)
    print("Final Step 2: Secured deploy route with deployLimiter and password checks.")
else:
    print("Final Step 2 Warning: target_deploy not found.")

with open(server_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patching finished.")
