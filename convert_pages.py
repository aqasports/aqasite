import re
import os


def remove_div_block(html, attr_selector):
    """Remove a <div> block matching attr_selector, handling nested divs correctly."""
    pattern = r'<div\s[^>]*' + re.escape(attr_selector) + r'[^>]*>'
    start = re.search(pattern, html)
    if not start:
        return html
    idx = start.start()
    # Walk forward counting depth
    depth = 0
    pos = idx
    while pos < len(html):
        if html[pos:pos+4] == '<div':
            depth += 1
            pos = html.index('>', pos) + 1
        elif html[pos:pos+6] == '</div>':
            depth -= 1
            pos += 6
            if depth == 0:
                return html[:idx] + html[pos:]
        else:
            pos += 1
    return html

PAGES = {
    'tarifs.html':      ('tarifs',      'AQA Tarifs 2025 | Formules Natation et Apnee'),
    'groupes.html':     ('groupes',     'Groupes et Creneaux | AQA Sports Academy'),
    'piscines.html':    ('piscines',    'Piscines | AQA Sports Academy'),
    'infos.html':       ('infos',       'Infos et Reglement | AQA Sports Academy'),
    'inscription.html': ('inscription', 'Inscription | AQA Sports Academy'),
    'formation.html':   ('formation',   'Formations | AQA Sports Academy'),
    'events.html':      ('events',      'Evenements | AQA Sports Academy'),
    'store.html':       ('store',       'AQA Store | Boutique Officielle'),
    'clients.html':     ('clients',     'Espace Membres | AQA Sports Academy'),
    'team.html':        ('team',        'Notre Equipe | AQA Sports Academy'),
    'kids.html':        ('kids',        'Programme Enfants | AQA Sports Academy'),
    'well.html':        ('well',        'Bien-etre | AQA Sports Academy'),
    'cards.html':       ('cards',       'Formules et Cartes | AQA Sports'),
    'wear.html':        ('wear',        'AQA Wear | Sportswear Officiel'),
    'activities.html':  ('activities',  'Activites | AQA Sports Academy'),
    'app.html':         ('app',         'Application AQA | Suivi et Coaching'),
    'webtv.html':       ('webtv',       'AQA WebTV | Videos et Tutoriels'),
    'index.html':       ('index',       'AQA Sports Academy - De Zero au Pro | Natation et Coaching Algerie'),
}

QUOTE = '"'

def fix_href(m):
    h = m.group(1)
    if h.startswith('http') or h.startswith('mailto') or h.startswith('tel') or h.startswith('#'):
        return 'href=' + QUOTE + h + QUOTE
    h = re.sub(r'(\w[\w\-]*)\.html$', r'/\1', h)
    h = re.sub(r'^/?index$', '/', h)
    return 'href=' + QUOTE + h + QUOTE

os.makedirs('src/pages', exist_ok=True)
converted = 0

for src, (slug, title) in PAGES.items():
    if not os.path.exists(src):
        print('SKIP: ' + src)
        continue

    with open(src, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()

    # Extract body
    body_m = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL | re.IGNORECASE)
    body = body_m.group(1) if body_m else html

    # Extract styles from head
    head_m = re.search(r'<head[^>]*>(.*?)</head>', html, re.DOTALL | re.IGNORECASE)
    styles = ''
    if head_m:
        head = head_m.group(1)
        style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', head, re.DOTALL)
        styles = '\n'.join(style_blocks)

    # Strip shared components from body
    body = re.sub(r'<iframe\b[^>]*scroll[^>]*>.*?</iframe>', '', body, flags=re.DOTALL)
    body = re.sub(r'<iframe\b[^>]*/>', '', body)
    body = re.sub(r'<div\s+class="bg-logo"[^>]*>.*?</div>', '', body, flags=re.DOTALL)
    body = re.sub(r'<header\b[^>]*>.*?</header>', '', body, flags=re.DOTALL | re.IGNORECASE)
    body = remove_div_block(body, 'class="mobile-menu-overlay"')
    body = re.sub(r'<footer[^>]*>\s*<iframe[^>]*>.*?</iframe>\s*</footer>', '', body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r'<footer[^>]*>\s*</footer>', '', body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r'<div\s+id="footer-container"[^>]*>.*?</div>', '', body)
    body = re.sub(r'<script\s+src="[^"]*navbar\.js[^"]*"[^>]*>\s*</script>', '', body)
    body = re.sub(r'<script\s+src="[^"]*i18n\.js[^"]*"[^>]*>\s*</script>', '', body)
    body = re.sub(r'<script\s+src="[^"]*navbar-wa\.js[^"]*"[^>]*>\s*</script>', '', body)

    # Fix internal .html links
    body = re.sub(r'href="([^"]*)"', fix_href, body)
    body = body.strip()

    is_index = (slug == 'index')
    out = 'src/pages/index.astro' if is_index else 'src/pages/' + slug + '.astro'
    cp = '/' if is_index else '/' + slug

    lines = [
        '---',
        "import BaseLayout from '../layouts/BaseLayout.astro';",
        "import Navbar from '../components/Navbar.astro';",
        "import Footer from '../components/Footer.astro';",
        '---',
        '',
        '<BaseLayout title="' + title + '" currentPage="' + cp + '">',
        '  <Navbar currentPage="' + cp + '" />',
        '',
        body,
        '',
        '  <Footer />',
        '</BaseLayout>',
        '',
    ]

    if styles.strip():
        lines += ['<style>', styles, '</style>', '']

    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    sz = os.path.getsize(out)
    print('OK ' + slug + ' -> ' + out + ' (' + str(sz) + ' bytes)')
    converted += 1

print('Done: ' + str(converted) + '/' + str(len(PAGES)) + ' pages converted.')
