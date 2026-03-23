# Autoresearch Changelog — outside-in-tdd v2 (15 inputs)

**Skill préalablement amélioré (v1) :** STOP block emergent design, Step 3 mutation testing in-flow, clause familiar-domain.
**Nouveaux inputs exposant de nouvelles failles :** edge cases refactoring, bug fix, feature simple "trop petite", valeur limite exacte.

---

## Expérience 0 — baseline

**Score:** 80/90 (88.9%)
**Changement:** Aucun — mesure du skill post-v1 sur les 15 inputs.
**Raisonnement:** Le skill a déjà les 3 mutations de v1. Le baseline avec 5 inputs était 100%. Avec 15 inputs, de nouvelles failles émergent.
**Résultat:** Analyse eval par eval :
- EVAL 1 (Gherkin-first) : 10/15 — 5 fails sur les 10 nouveaux inputs. Violations : input 6 (feature trop simple → agent saute Gherkin), input 8 (refactoring → "pas besoin de Gherkin"), input 12 (Gherkin déjà écrit → agent re-invoque inutilement la gate), input 13 (scénarios multiples → Gherkin partiel), input 14 (bug fix → "bugfix pas un comportement, pas de Gherkin")
- EVAL 2 (mocking boundary) : 15/15
- EVAL 3 (domain tests purs) : 15/15
- EVAL 4 (nommage métier) : 15/15
- EVAL 5 (emergent design) : 12/15 — 3 fails : input 8 (refactoring → l'agent "sait ce qu'il refactore"), input 10 (nouveau type véhicule → l'agent crée l'enum upfront), input 11 (valeur limite = 18 → l'agent ajoute la constante avant le test)
- EVAL 6 (mutation testing) : 13/15 — 2 fails : input 8 (refactoring → "rien de nouveau, pas de mutation testing"), input 14 (bug fix → l'agent ne pense pas à vérifier)
**Outputs défaillants:** EVAL 1 est le plus faible (10/15) — la notion de scope de gherkin-gate n'est pas claire pour les cas atypiques.

---

## Expérience 1 — keep

**Score:** 83/90 (92.2%)
**Changement:** Étendu la ligne `**Prerequisite:**` pour clarifier le scope : inclut les bug fixes, le refactoring qui change le comportement, et précise que si Gherkin est déjà approuvé on passe directement à Step 1 sans re-invoquer la gate.
**Raisonnement:** 5/15 agents rataient EVAL 1 sur des cas atypiques. La ligne Prerequisite disait "Gherkin scenarios must be written and approved" — neutre sur qui doit les écrire et dans quel cas. En ajoutant "This includes new features, bug fixes, and behavior-changing refactoring" + "If scenarios are already approved, go directly to Step 1 — gherkin-gate is done", les deux patterns de failure sont adressés.
**Résultat:** EVAL 1 : 10→13 (+3). Inputs 8, 12, 14 passent. Inputs 6 et 13 échouent encore — l'agent interprète "too small" et "scénarios partiellement approuvés" comme des exceptions.
**Outputs défaillants:** 2/15 → EVAL 1 : input 6 (feature jugée trop petite) et input 13 (scénarios partiels). 3/15 → EVAL 5. 2/15 → EVAL 6.

---

## Expérience 2 — keep

**Score:** 85/90 (94.4%)
**Changement:** Étendu le STOP block de Step 2 pour couvrir les "nouvelles variantes" de concepts existants : `"This includes adding 'just a new variant' of something that already exists: a new vehicle type, a new rejection reason, a new value object field, or a new boundary value — even if similar ones already exist in the codebase. Wait for the test's compilation failure before creating the new type."`
**Raisonnement:** Inputs 10 et 11 montraient l'agent créer proactivement un enum `Motorcycle` ou une constante `MinAge = 18` parce que "c'est juste une variante de ce qui existe". La clause "even if you already know the domain" de v1 avait adressé les classes existantes, mais pas les nouveaux éléments similaires. Nommer explicitement les cas (new vehicle type, boundary value) ferme ce loophole semantique.
**Résultat:** EVAL 5 : 12→14 (+2). Inputs 10 et 11 passent. Input 8 (refactoring — "je sais ce que je refactore") échoue encore.
**Outputs défaillants:** 1/15 → EVAL 5 (input 8). 2/15 → EVAL 1. 2/15 → EVAL 6.

---

## Expérience 3 — discard

**Score:** 85/90 (94.4%)
**Changement:** Tentative : supprimer la mention de mutation-testing du footer `## Integration` pour éviter la redondance avec Step 3.
**Raisonnement:** La mention apparaît à la fois dans Step 3 (in-flow) et dans le footer Integration. Supprimer le footer allégerait le skill. Hypothèse : moins de bruit = signal plus fort pour Step 3.
**Résultat:** Aucun changement. Score reste 85/90. Les 2 failures EVAL 6 étaient liées au scope (bug fix / refactoring), pas à la position de l'instruction. Revenu à l'état d'Exp 2.
**Outputs défaillants:** Identiques. Hypothèse infirmée — la redondance n'était pas le problème.

---

## Expérience 4 — keep

**Score:** 87/90 (96.7%)
**Changement:** Dans Step 3, ajout d'une note de scope après la ligne REQUIRED SUB-SKILL : `"This applies to ALL changes — not just new features. Bug fixes, refactoring, and edge case additions must also pass mutation testing if any test was written or changed to make this work."`
**Raisonnement:** Les 2 failures EVAL 6 (inputs 8 refactoring, 14 bug fix) montraient des agents qui considéraient la mutation testing comme optionnelle sur du "code existant touché". Le Step 3 disait "Once both test streams are green" — implicitement lié aux tests écrits pour une nouvelle feature. Rendre le scope explicite ("ALL changes") couvre ces cas.
**Résultat:** EVAL 6 : 13→15 (+2). Tous les inputs passent maintenant EVAL 6.
**Outputs défaillants:** 2/15 → EVAL 1 (inputs 6, 13). 1/15 → EVAL 5 (input 8).

---

## Expérience 5 — discard

**Score:** 87/90 (96.7%)
**Changement:** Tentative : ajouter un anti-exemple dans la section Anti-Patterns : "Starting a bug fix without a Gherkin scenario that reproduces the bug — always write failing Gherkin first."
**Raisonnement:** EVAL 1 à 13/15. Input 6 (trop petit) et 13 (partiels) échouent encore. Peut-être qu'un anti-pattern visible résout l'un des deux.
**Résultat:** Aucun gain. Score reste 87/90. Input 6 échoue à cause de la logique "too small" qui n'est pas adressée par un anti-pattern bug fix. Revenu à l'état d'Exp 4.
**Outputs défaillants:** Identiques. La mauvaise cible — le problème est dans Common Mistakes, pas Anti-Patterns.

---

## Expérience 6 — keep

**Score:** 88/90 (97.8%)
**Changement:** Ajout d'une ligne dans la table Common Mistakes : `| Skipping Gherkin for a bug fix | Always write a failing Gherkin scenario that reproduces the bug before fixing it — gherkin-gate applies to bug fixes |`
**Raisonnement:** Exp 5 a montré que Anti-Patterns n'était pas le bon endroit. Common Mistakes est la table consultée par les agents pour les cas limites. Placer le bug fix pattern là où les agents cherchent les exceptions connues est plus efficace qu'un anti-pattern générique.
**Résultat:** EVAL 1 : 13→14 (+1). Input 14 passait déjà depuis Exp 1. Ce +1 vient d'input 6 ou 13 — l'agent voit maintenant le cas dans Common Mistakes et applique la gate même pour les petites features. 1 input reste à 0 (input 13 avec scénarios partiels).
**Outputs défaillants:** 1/15 → EVAL 1 (input 13, scénarios partiels — cas très edge). 1/15 → EVAL 5 (input 8, refactoring). Rendements décroissants.

---

## Expérience 7 — discard

**Score:** 88/90 (97.8%)
**Changement:** Tentative : ajouter un exemple complet "bug fix workflow" dans la section Examples (qui n'existe pas encore — essai de créer une micro-section).
**Raisonnement:** 1 failure EVAL 1 restante. Un exemple concret de bug fix avec Gherkin pourrait convaincre les agents sur le cas input 13.
**Résultat:** Aucun gain. Score reste 88/90. L'ajout d'une section Examples alourdit le skill (~200 mots) sans amélioration mesurable. Les fails restants (input 8 EVAL 5, input 13 EVAL 1) sont des edge cases profonds que l'ajout de prose ne résout pas. Revenu à Exp 6.
**Outputs défaillants:** Identiques. Rendements nuls.

---

## Expérience 8 — discard

**Score:** 88/90 (97.8%)
**Changement:** Tentative : reformuler le STOP block en liste numérotée (1. Ne pas créer… 2. Même si…  3. Même pour une variante…) pour améliorer la scanabilité.
**Raisonnement:** Le STOP block actuel est maintenant assez long (3 paragraphes avec les mutations v1+v2). Peut-être que le structurer en points aide les agents à identifier le cas qui s'applique à leur situation.
**Résultat:** Aucun gain. Score reste 88/90. Les 2 failures restantes (inputs 8, 13) sont indépendants de la structure du STOP block. Revenu à Exp 6.
**Outputs défaillants:** Identiques. Loop arrêté : 3 expériences consécutives à ≥95% (Exp 6: 97.8%, Exp 7: 97.8%, Exp 8: 97.8%).
