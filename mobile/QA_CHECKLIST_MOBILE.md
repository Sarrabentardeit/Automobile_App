# EL MECANO — Checklist QA App Mobile  
**Version :** 1.0 · **Android + iOS**  
**Build à tester :** _______________  
**Testeur :** _______________ · **Date :** _______________

### Légende
- **OK** = validé  
- **KO** = bug (noter le détail)  
- **N/A** = non applicable au rôle testé  

Tester **chaque ligne sur Android ET iPhone** (colonnes A / i).

---

## 0. Préparation

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 0.1 | Installer le build preview (pas l’ancienne APK) | ☐ | ☐ | |
| 0.2 | Connexion admin | ☐ | ☐ | |
| 0.3 | Connexion technicien (droits limités) | ☐ | ☐ | |
| 0.4 | Rotation portrait OK (pas de landscape forcé) | ☐ | ☐ | |
| 0.5 | Barre nav / home indicator ne coupe aucun bouton | ☐ | ☐ | |

---

## 1. Login & navigation

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 1.1 | Login email/mdp OK | ☐ | ☐ | |
| 1.2 | Mauvais mdp → message d’erreur lisible | ☐ | ☐ | |
| 1.3 | Menu latéral (drawer) s’ouvre / se ferme | ☐ | ☐ | |
| 1.4 | Toutes les entrées menu accessibles au rôle | ☐ | ☐ | |
| 1.5 | Cloche notifications visible (badge si non lus) | ☐ | ☐ | |

---

## 2. Dashboard

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 2.1 | Écran charge sans crash | ☐ | ☐ | |
| 2.2 | Cartes / chiffres affichés | ☐ | ☐ | |
| 2.3 | Pull-to-refresh (si présent) | ☐ | ☐ | |

---

## 3. Véhicules

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 3.1 | Liste + filtres état (pills) | ☐ | ☐ | |
| 3.2 | Ouvrir fiche véhicule | ☐ | ☐ | |
| 3.3 | **Nouveau véhicule** : tous les champs visibles (pas de modal vide) | ☐ | ☐ | |
| 3.4 | Boutons Annuler / Enregistrer au-dessus de la barre système | ☐ | ☐ | |
| 3.5 | Changer état (modal centré, boutons OK) | ☐ | ☐ | |
| 3.6 | Photos caméra / galerie | ☐ | ☐ | |
| 3.7 | Fiche financière : scroll + actions | ☐ | ☐ | |
| 3.8 | Ordre de réparation / suivi (si utilisé) | ☐ | ☐ | |
| 3.9 | Archives véhicules validés | ☐ | ☐ | |

---

## 4. Calendrier

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 4.1 | Grille mois / jour lisible | ☐ | ☐ | |
| 4.2 | **Nouvelle affectation** : Équipe, Véhicule, Travail, Client visibles | ☐ | ☐ | |
| 4.3 | Modal centré (pas collé en bas) | ☐ | ☐ | |
| 4.4 | Enregistrer RDV → apparaît dans la liste | ☐ | ☐ | |
| 4.5 | Ouvrir détail / modifier / supprimer | ☐ | ☐ | |
| 4.6 | Changer statut RDV | ☐ | ☐ | |

---

## 5. Chat équipe ⚠️ critique

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 5.1 | Liste conversations charge (pas d’erreur 500) | ☐ | ☐ | |
| 5.2 | **Nouvelle conversation** : modal **centré** | ☐ | ☐ | |
| 5.3 | Clic sur un nom → ouvre le fil (pas d’échec silencieux) | ☐ | ☐ | |
| 5.4 | Champ « Écrire un message » entièrement visible | ☐ | ☐ | |
| 5.5 | Envoyer un message → bulle OK | ☐ | ☐ | |
| 5.6 | Créer un groupe (onglet Groupe) | ☐ | ☐ | |
| 5.7 | Retour arrière depuis le fil | ☐ | ☐ | |

---

## 6. Clients & contacts

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 6.1 | Liste clients | ☐ | ☐ | |
| 6.2 | Fiche client centrée + Modifier / Supprimer visibles | ☐ | ☐ | |
| 6.3 | Formulaire nouveau client (champs + footer OK) | ☐ | ☐ | |
| 6.4 | Contacts importants — même contrôles | ☐ | ☐ | |
| 6.5 | Appel / lien téléphone si présent | ☐ | ☐ | |

---

## 7. Équipe & utilisateurs

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 7.1 | Membres équipe — fiche centrée | ☐ | ☐ | |
| 7.2 | Formulaire membre (footer OK) | ☐ | ☐ | |
| 7.3 | Utilisateurs — **Nouveau compte** : Identité, Rôle, Accès scrollables | ☐ | ☐ | |
| 7.4 | Boutons Créer / Annuler au-dessus de la nav | ☐ | ☐ | |
| 7.5 | Modifier permissions | ☐ | ☐ | |

---

## 8. Stock & produits

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 8.1 | Stock général — liste / KPIs | ☐ | ☐ | |
| 8.2 | Fiche produit centrée + Modifier / Supprimer | ☐ | ☐ | |
| 8.3 | **Nouveau produit** — formulaire scroll + footer OK | ☐ | ☐ | |
| 8.4 | Modifier produit (stock) — footer OK | ☐ | ☐ | |
| 8.5 | Catalogue produits (écran Produits) | ☐ | ☐ | |

---

## 9. Devis

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 9.1 | Liste demandes | ☐ | ☐ | |
| 9.2 | **Nouvelle demande** : champs Client / Description visibles | ☐ | ☐ | |
| 9.3 | Créer → apparaît en liste | ☐ | ☐ | |
| 9.4 | Détail + Modifier | ☐ | ☐ | |

---

## 10. Finance

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 10.1 | Facturation vente — liste / détail | ☐ | ☐ | |
| 10.2 | Paiement vente — modal + boutons OK | ☐ | ☐ | |
| 10.3 | Facturation achat — idem | ☐ | ☐ | |
| 10.4 | Paiement achat — idem | ☐ | ☐ | |
| 10.5 | Paiements vente / achat (écrans) | ☐ | ☐ | |
| 10.6 | Caisse | ☐ | ☐ | |
| 10.7 | Money / trésorerie | ☐ | ☐ | |
| 10.8 | Transactions fournisseurs | ☐ | ☐ | |
| 10.9 | Dettes clients — form + détail | ☐ | ☐ | |
| 10.10 | Fournisseurs — fiche centrée + form | ☐ | ☐ | |

---

## 11. Réclamations

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 11.1 | Liste | ☐ | ☐ | |
| 11.2 | Formulaire (champs visibles + footer) | ☐ | ☐ | |

---

## 12. Checklists

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 12.1 | Checklist du jour — cocher / enregistrer | ☐ | ☐ | |
| 12.2 | Modèles (admin) | ☐ | ☐ | |
| 12.3 | Détail / validation modals OK | ☐ | ☐ | |

---

## 13. Statistiques (admin)

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 13.1 | Écran charge | ☐ | ☐ | |
| 13.2 | Filtres période si présents | ☐ | ☐ | |
| 13.3 | Pas de crash graphiques | ☐ | ☐ | |

---

## 14. Autres

| # | Contrôle | A | i | Notes |
|---|----------|---|---|-------|
| 14.1 | Documents | ☐ | ☐ | |
| 14.2 | Outils Ahmed | ☐ | ☐ | |
| 14.3 | Clavier ouvert ne cache pas Enregistrer | ☐ | ☐ | |
| 14.4 | App en arrière-plan puis retour — session OK | ☐ | ☐ | |

---

## Bugs bloquants (à noter)

| Sévérité | Écran | Android / iOS | Description | Captures |
|----------|-------|---------------|-------------|----------|
| Bloquant | | | | |
| Majeur | | | | |
| Mineur | | | | |

---

## Signature validation

| | Android | iOS |
|--|---------|-----|
| Build testé | | |
| Résultat global | ☐ OK · ☐ KO | ☐ OK · ☐ KO |
| Validé par | | |
| Date | | |

**Critères de sortie :** aucun bug **bloquant** ; chat, calendrier, véhicules, devis, utilisateurs validés sur les 2 OS.
