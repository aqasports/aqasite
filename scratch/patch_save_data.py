import os

save_data_path = r"c:\Users\dell\Desktop\aqasportsdotpro\netlify\functions\save-data.js"

with open(save_data_path, "r", encoding="utf-8") as f:
    content = f.read()

# Locate the token parsing and verification block
start_token = "  const token = authHeader.slice(7);"
# Find end of verification block
end_token = "  if (!isAuthorized) {\n    return {\n      statusCode: 403,\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ success: false, error: 'Jeton de connexion invalide' })\n    };\n  }"

# Let's do string replacement for the entire verification block
start_idx = content.find(start_token)
end_idx = content.find(end_token)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_token)
    
    new_verification = """  const token = authHeader.slice(7);

  // Load config passwordHash from GitHub or environment for signing key fallback
  let expectedHash = '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5';
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/admin-config.json`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AQA-Sports-Control-Center'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const contentBase64 = Buffer.from(data.content, 'base64').toString('utf8');
      const cfg = JSON.parse(contentBase64);
      if (cfg.passwordHash) expectedHash = cfg.passwordHash;
    }
  } catch (err) {
    console.warn("Failed to fetch admin config from GitHub API", err);
  }

  const crypto = require('crypto');
  function verifyToken(token, secret) {
    try {
      const [header, body, signature] = token.split('.');
      if (!header || !body || !signature) return null;
      const expectedSig = crypto.createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');
      if (signature !== expectedSig) return null;
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (payload.exp && Date.now() > payload.exp) return null;
      return payload;
    } catch (e) {
      return null;
    }
  }

  const secret = process.env.JWT_SECRET || expectedHash;
  const decoded = verifyToken(token, secret);

  if (!decoded || !decoded.isAdmin) {
    return {
      statusCode: 403,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: false, error: 'Jeton de connexion invalide ou expiré' })
    };
  }"""

    content = content[:start_idx] + new_verification + content[end_idx:]
    print("Step 1: Replaced raw hash authorization check with secure JWT verification.")
else:
    # Try normalized spacing
    normalized_old = end_token.replace("\n", "\r\n")
    end_idx_alt = content.find(normalized_old)
    if start_idx != -1 and end_idx_alt != -1:
        end_idx_alt += len(normalized_old)
        content = content[:start_idx] + new_verification + content[end_idx_alt:]
        print("Step 1: Replaced raw hash authorization check (CRLF).")
    else:
        print(f"Step 1 Warning: Verification boundaries not matched. start: {start_idx != -1}, end: {end_idx != -1}")

with open(save_data_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patching complete.")
