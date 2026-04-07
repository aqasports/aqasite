"""
AQA SEO Patcher — injects rich, localized titles + descriptions into all .astro pages
"""
import re, os

# (slug, title, description, keywords)
SEO = {
    'index': (
        'AQA Sports Academy — Natation & Apnée en Algérie | De Zéro au Pro',
        'AQA Sports Academy : coaching natation, apnée et sports aquatiques en Algérie. Groupes G10, MAX5 et suivi individuel. Réghaia & Cheraga.',
        'natation algérie, apnée algérie, coaching natation alger, piscine réghaia, aqa sports, académie natation',
    ),
    'tarifs': (
        'Tarifs AQA 2025 — Formules Natation, Apnée & Coaching Algérie',
        'Consultez les tarifs AQA 2025 : groupes G10, MAX5 et sessions individuelles. 1, 3, 6 ou 9 mois. Formules Homme, Femme, Enfants et Apnée.',
        'tarifs natation algérie, prix coaching natation, abonnement piscine algérie, formules aqa 2025',
    ),
    'groupes': (
        'Créneaux & Groupes | AQA Sports Academy — Planning Natation Algérie',
        'Consultez les créneaux d\'entraînement AQA : groupes hommes, femmes, enfants et apnée à Réghaia et Cheraga. Places limitées — inscription en ligne.',
        'créneaux natation algérie, groupes natation alger, planning piscine réghaia, horaires natation',
    ),
    'piscines': (
        'Nos Piscines | AQA Sports Academy — Réghaia & Cheraga Algérie',
        'AQA Sports Academy s\'entraîne dans des piscines partenaires à Réghaia et Cheraga, Alger. Infrastructures modernes, eau traitée, conditions optimales.',
        'piscines algérie, piscine réghaia, piscine cheraga, infrastructure natation alger, aqa piscine',
    ),
    'infos': (
        'Infos & Règlement | AQA Sports Academy — Tout Savoir Avant de Commencer',
        'Tout ce que vous devez savoir avant de rejoindre AQA : règlement intérieur, matériel requis, FAQ, conditions d\'accès et conseils de préparation.',
        'règlement piscine algérie, conditions inscription natation, matériel natation, faq aqa sports',
    ),
    'inscription': (
        'Inscription | AQA Sports Academy — Rejoignez-nous en Ligne',
        'Inscrivez-vous à AQA Sports Academy en ligne. Choisissez votre formule (G10, MAX5, Individuel), votre créneau et commencez votre transformation.',
        'inscription natation algérie, s\'inscrire aqa sports, rejoindre académie natation alger, coaching inscription',
    ),
    'formation': (
        'Formations & Certifications | AQA Sports Academy — Algérie',
        'AQA propose des formations et certifications sportives pour moniteurs et coachs aquatiques. Programmes reconnus, encadrement professionnel en Algérie.',
        'formation natation algérie, certification coach natation, moniteur piscine algérie, formation apnée',
    ),
    'events': (
        'Événements & Compétitions | AQA Sports Academy — Algérie',
        'Suivez les événements, compétitions et stages AQA Sports Academy. Championnats, galas de natation et rencontres aquatiques en Algérie.',
        'compétitions natation algérie, événements aquatiques alger, gala natation, stages natation algérie',
    ),
    'store': (
        'AQA Store — Équipements & Accessoires Natation Officiel Algérie',
        'Boutique officielle AQA Sports : lunettes, bonnets, combinaisons et accessoires de natation et d\'apnée. Matériel de qualité professionnelle livré en Algérie.',
        'équipements natation algérie, boutique natation, lunettes natation, bonnet piscine, matériel apnée algérie',
    ),
    'clients': (
        'Espace Membres | AQA Sports Academy — Suivi & Plannings',
        'Accédez à votre espace membre AQA : planning de séances, suivi de progression, historique de paiements et informations de groupe.',
        'espace membre aqa, suivi natation, planning piscine membre, portail aqa sports',
    ),
    'team': (
        'Notre Équipe de Coachs | AQA Sports Academy — Experts Natation & Apnée',
        'Rencontrez les coachs professionnels d\'AQA Sports Academy : diplômés, certifiés, spécialisés en natation, apnée et sports aquatiques en Algérie.',
        'coachs natation algérie, moniteurs piscine alger, entraîneurs natation professionnels, équipe aqa',
    ),
    'kids': (
        'Natation Enfants | AQA Sports Academy — Dès 4 Ans, Algérie',
        'Programme natation enfants AQA : apprentissage progressif, jeux aquatiques et sécurité en piscine dès 4 ans. Coachs spécialisés pédiatrie sportive.',
        'natation enfants algérie, cours natation enfants alger, apprentissage piscine enfants, aqa kids',
    ),
    'well': (
        'Bien-être & Fitness Aquatique | AQA Sports — Remise en Forme Algérie',
        'Programmes bien-être et remise en forme aquatique AQA : aquagym, relaxation, récupération active. Accessible à tous les niveaux. Réghaia & Cheraga.',
        'bien-être aquatique algérie, aquagym alger, fitness piscine, remise en forme natation algérie',
    ),
    'cards': (
        'Formules AQA — Cartes & Abonnements Natation Algérie 2025',
        'Formules d\'abonnement AQA 2025 : cartes 1 mois, 3 mois, 6 mois et 9 mois. Tarifs compétitifs pour tous les niveaux et toutes les disciplines.',
        'abonnement natation algérie, carte piscine algérie, formules mensuel natation, tarif piscine 2025',
    ),
    'wear': (
        'AQA Wear — Sportswear & Vêtements de Natation Officiels',
        'Collection sportswear officielle AQA : maillots de bain, combinaisons, t-shirts et accessoires. Style et performance pour tous vos entraînements.',
        'vêtements natation algérie, sportswear aqa, maillot de bain algérie, combinaison natation, boutique vêtements sport',
    ),
    'activities': (
        'Activités Sportives | AQA Sports Academy — Natation, Apnée & Plus',
        'Découvrez toutes les activités AQA Sports Academy : natation technique, apnée, water-polo, aquagym, stages intensifs et formations aquatiques.',
        'activités sportives algérie, natation apnée algérie, sports aquatiques alger, water-polo algérie, aquagym',
    ),
    'app': (
        'Application AQA Sports — Suivi Training & Coaching Mobile Algérie',
        'L\'application AQA Sports pour mobile : suivez vos séances, progressions, planning d\'entraînement et accédez à vos coach en temps réel.',
        'application natation algérie, app coaching sport, suivi entraînement mobile, aqa app, coaching digital',
    ),
    'webtv': (
        'AQA WebTV — Vidéos Natation, Tutoriels & Compétitions Algérie',
        'Regardez les vidéos AQA : tutoriels de nage, démonstrations d\'apnée, résumés de compétitions et conseils de nos coachs professionnels.',
        'vidéos natation algérie, tutoriels nage, chaîne natation youtube, apnée video, coaching video natation',
    ),
}

for slug, (title, description, keywords) in SEO.items():
    path = f'src/pages/index.astro' if slug == 'index' else f'src/pages/{slug}.astro'
    if not os.path.exists(path):
        print(f'SKIP {path}')
        continue

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    cp = '/' if slug == 'index' else f'/{slug}'

    # Replace the existing BaseLayout opening tag
    new_tag = (
        '<BaseLayout\n'
        f'  title="{title}"\n'
        f'  description="{description}"\n'
        f'  keywords="{keywords}"\n'
        f'  currentPage="{cp}"\n'
        '>'
    )

    # Match any existing BaseLayout opening tag (single or multi-line)
    content = re.sub(
        r'<BaseLayout[^>]*currentPage="[^"]*"[^>]*>',
        new_tag,
        content,
        flags=re.DOTALL
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'OK  {slug}')

print('Done.')
