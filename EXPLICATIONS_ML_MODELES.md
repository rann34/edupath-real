# 📚 EXPLICATION COMPLÈTE DES DEUX MODÈLES ML - EduPath PFE L3

---

## 🎯 VUE D'ENSEMBLE

Votre projet EduPath utilise **2 modèles de Machine Learning complémentaires** basés sur **Naive Bayes** de scikit-learn:

1. **Quiz Engine (Moteur de Quiz)** → Évalue les préférences/aptitudes de l'étudiant via un quiz
2. **Recommender (Système de Recommandation)** → Recommande des programmes universitaires basés sur le profil BAC

---

## 📋 MODÈLE 1: ADAPTIVE QUIZ ENGINE

### 🔍 QU'EST-CE QUE C'EST?

C'est un classifieur ML qui prend les réponses d'un étudiant (12 questions fermées) et prédit sa **meilleure filière** parmi 5 options:
- **Médecine** (Healthcare)
- **Ingénierie Logicielle** (Software Engineering)
- **Architecture**
- **Finance**
- **Journalisme**

### 📊 LES 12 QUESTIONS (FEATURES)

Le quiz pose 12 questions avec 4 réponses possibles chacune:

```
Q1. Quel domaine vous intéresse après le BAC?
    → Sciences & Santé | Tech & Ingénierie | Arts/Design/Communication | Business/Droit/Société

Q2. Quel type de formation vous convient?
    → Rigoureuse & structurée | Collaborative & projets | Leadership/décision | Flexible & pluridisciplinaire

Q3. Quel environnement d'étude préférez-vous?
    → Hôpital/labo science | Terrain/atelier/studio | Entreprise | Numérique/informatique

Q4. Quel est votre objectif principal?
    → Employabilité élevée | Aider les gens | Expertise approfondie | Garder les options ouvertes

Q5. Meilleur dans quels sujets?
    → Biologie/sciences naturelles | Maths/physique | Langues/expression | Économie/analyse

Q6. Quel rythme d'étude vous convient?
    → Très exigeant/sélectif | Équilibré avec projets | Créatif/portfolio | Progressif/flexible

Q7. Quel départ de carrière envisagez-vous?
    → Profession santé/science | Ingénieur/tech | Designer/architecte | Manager/analyste

Q8. Critère le plus important pour choisir?
    → Prestige/formation sélective | Compétences pratiques | Créativité/expression | Polyvalence/flexibilité

Q9. Meilleur style d'apprentissage?
    → Théorie détaillée/livres | Labs/coding/pratique | Projets/portfolios | Études de cas/discussions

Q10. Importance du contact humain?
    → Très important | Modérément important | Utile mais pas central | Peu important

Q11. Type de défi qui vous motive?
    → Problèmes scientifiques/médicaux | Systèmes techniques | Design créatif | Organisations/marchés/société

Q12. Quel type de carrière préférez-vous?
    → Long, études sélectives, spécialisation | Technique avec emploi | Créatif avec travail visible | Flexible/management
```

### 🧠 COMMENT ÇA FONCTIONNE?

#### **Étape 1: Préparation des données d'entraînement**

Le modèle crée automatiquement des **prototypes** pour chaque filière. Par exemple, pour **Médecine**:

```python
prototype_medecine = {
    "career": "Medicine",
    "q1": ["Sciences & Health"],           # Questions préférées
    "q2": ["Rigorous and structured", "Collaborative and project-based"],
    "q3": ["Hospital or science lab"],
    "q4": ["Helping people or society", "Building deep expertise"],
    "q5": ["Biology and natural sciences"],
    # ... etc
}
```

Ensuite, le modèle génère **toutes les combinaisons possibles** de réponses pour ce prototype.

**Exemple:** Si le prototype accepte:
- Q1: 1 option → q1 = 1
- Q2: 2 options → q2 = 2
- Q3: 1 option → q3 = 1

→ Nombre de combinaisons = 1 × 2 × 1 = 2 données d'entraînement

Avec 5 filières et des centaines de combinaisons = **des milliers d'exemples synthétiques**

```
Exemple d'une ligne de données d'entraînement:
q1: "Sciences & Health"
q2: "Rigorous and structured"
q3: "Hospital or science lab"
...
filiere: "Medicine"  ← Label à prédire
```

#### **Étape 2: Encodage et création du pipeline**

```python
# Les réponses textes sont converties en nombres
encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
# Exemple: "Sciences & Health" → 0, "Tech & Engineering" → 1, etc.

# Le pipeline combine encodeur + classificateur
model = Pipeline([
    ("encoder", OrdinalEncoder(...)),
    ("model", CategoricalNB())  # Naive Bayes Catégorique
])
```

#### **Étape 3: Apprentissage du modèle (Training)**

```python
X_train = [liste des réponses encodées pour chaque ligne]
y_train = [la filière correspondante]

model.fit(X_train, y_train)  # Apprentissage
# Le modèle apprend les probabilités conditionnelles
```

### 📐 COMMENT ÇA CALCULE LES PRÉDICTIONS?

**Naive Bayes Catégorique** utilise la formule:

$$P(\text{Filière} | \text{Réponses}) = \frac{P(\text{Réponses} | \text{Filière}) \times P(\text{Filière})}{P(\text{Réponses})}$$

En français: 
> **Probabilité(Filière sachant les réponses) = Probabilité(réponses sachant filière) × Probabilité(filière) / Probabilité(réponses)**

**Exemple concret:**

Imaginons un étudiant répond:
- Q1: "Sciences & Health"
- Q2: "Rigorous and structured"
- Q3: "Hospital or science lab"
- ... (reste des réponses)

Le modèle calcule:
```
P(Médecine | réponses) = ?
P(Ingénierie | réponses) = ?
P(Architecture | réponses) = ?
P(Finance | réponses) = ?
P(Journalisme | réponses) = ?
```

**Résultat:** La filière avec la **plus haute probabilité** est recommandée!

Par exemple:
- P(Médecine | réponses) = 0.72 ✅ **MEILLEURE PRÉDICTION**
- P(Ingénierie | réponses) = 0.15
- P(Architecture | réponses) = 0.08
- etc.

### ✅ POURQUOI NAIVE BAYES POUR LE QUIZ?

**Avantages:**

1. **Simple et rapide** → Réponse instantanée au quiz
2. **Pas besoin de beaucoup de données** → Fonctionne avec données synthétiques
3. **Transparent** → Facile à comprendre quelles réponses influencent quoi
4. **Adapté aux données catégoriques** → CategoricalNB parfait pour réponses fermées
5. **Probabilités multi-class** → Donne un % de confiance pour chaque filière

**Inconvénients (acceptables ici):**

- Suppose indépendance entre variables (pas réaliste mais fonctionne)
- Pas optimal avec petits datasets (mais vous en générez des synthétiques)

---

## 🎓 MODÈLE 2: EDUCATION PATH RECOMMENDER

### 🔍 QU'EST-CE QUE C'EST?

C'est un système complexe qui recommande les **meilleures formations universitaires** basées sur le profil BAC de l'étudiant:

**Entrée:** Profil BAC (notes, filière, wilaya, etc.)
**Sortie:** Top 5 formations classées par pertinence avec explications

### 📥 DONNÉES D'ENTRÉE (FEATURES)

```python
{
    "bac_stream": "Sciences" ou "Mathématiques" ou "Technique-Math" ou "Lettres-Philo",
    "bac_average": 16.5,           # Moyenne générale BAC/20
    "math_grade": 17.0,            # Note math/20
    "physics_grade": 16.5,         # Note physique/20
    "subject3_grade": 15.8,        # 3e sujet/20
    "wilaya": "Alger"              # Wilaya de résidence
}
```

### 🧠 ARCHITECTURE DU MODÈLE

Le recommender utilise **3 systèmes en parallèle**:

#### **SYSTÈME 1: Prédiction du TRACK (domaine)**

Utilise **Naive Bayes** entraîné sur 7 tracks (domaines):

```python
TRACK_CATEGORIES = [
    "computer",      # Informatique
    "engineering",   # Ingénierie
    "medical",       # Médecine/Santé
    "business",      # Finance/Business
    "humanities",    # Lettres/Droit/etc
    "science",       # Sciences pures
    "general"        # Autres
]
```

**Features du modèle (entrées):**
```python
MODEL_FEATURES = [
    "stream",           # BAC: technique_math, mathematiques, sciences, lettres_philo, default
    "average_band",     # Bande de note: excellent (≥17), strong (14-17), fair (11-14), low (<11)
    "math_band",        # Idem pour math
    "physics_band",     # Idem pour physique
    "subject3_band",    # Idem pour 3e sujet
    "location_pref"     # local vs open (selon wilaya)
]
```

**Exemple de conversion:**
```
Entrée brute:         → Données transformées:
bac_stream: "Sciences" → stream: "sciences"
bac_average: 16.5     → average_band: "strong"
math_grade: 17.0      → math_band: "strong"
physics_grade: 16.5   → physics_band: "strong"
subject3_grade: 15.8  → subject3_band: "strong"
wilaya: "Alger"       → location_pref: "local"
```

**Données d'entraînement synthétiques:**

Le modèle crée automatiquement des prototypes. Par exemple pour **Computer**:

```python
prototype_computer = {
    "track": "computer",
    "stream": ["mathematiques", "sciences", "technique_math"],  # Autorisé
    "average_band": ["strong", "excellent"],                     # Autorisé
    "math_band": ["strong", "excellent"],
    "physics_band": ["fair", "strong", "excellent"],
    "subject3_band": ["fair", "strong"],
    "location_pref": ["local", "open"]
}
```

→ Génère 2×2×3×2×2 = **48 combinaisons** pour Computer
→ Répète pour les 7 tracks = **centaines de données synthétiques**

**Résultat:** Le modèle output des probabilités pour chaque track
```python
{
    "computer": 0.72,      # 72% de probabilité
    "engineering": 0.15,   # 15%
    "medical": 0.05,       # 5%
    ...
}
```

---

#### **SYSTÈME 2: Règles de flux par filière BAC**

Chaque filière BAC a des **poids et restrictions**:

```python
stream_rules = {
    "mathematiques": {
        "weights": {
            "computer": 1.0,        # Très compatible
            "engineering": 0.95,
            "science": 0.85,
            "business": 0.55,       # Moins compatible
            "medical": 0.25,        # Peu compatible
            "humanities": 0.1,      # Très incompatible
            "general": 0.45
        },
        "allowed": {"computer", "engineering", "science", "business", "general"},
        "discouraged": {"medical", "humanities"}
    },
    "sciences": {
        "weights": {
            "medical": 1.0,
            "science": 0.95,
            "computer": 0.72,
            "engineering": 0.74,
            "business": 0.32,
            "humanities": 0.12,
            "general": 0.45
        },
        "allowed": {"medical", "science", "computer", "engineering", "business", "general"},
        "discouraged": {"humanities"}
    },
    # ... pareil pour chaque filière
}
```

**Application:**

Un étudiant en **Lettres-Philo** ne peut pas accéder à **Informatique** ou **Médecine** (discouraged)

---

#### **SYSTÈME 3: Scoring multicritères**

Pour chaque formation, calcule un score combiné:

$$\text{Score final} = 0.30 \times \text{BAC fit} + 0.22 \times \text{Subject fit} + 0.15 \times \text{Subject fit}$$
$$+ 0.08 \times \text{Stream fit} + 0.12 \times \text{AI fit} + 0.13 \times \text{Selectivity fit}$$
$$+ \text{City bonus} + \text{Excellence bonus}$$

**Expliquons chaque composante:**

### 📊 LES 7 CRITÈRES DE SCORING

#### **1️⃣ BAC FIT (30%)**

Compare la moyenne BAC de l'étudiant avec la moyenne minimale requise:

```python
required_bac = 13.0  # Min requis pour la formation
student_bac = 16.5   # Note de l'étudiant
gap = 16.5 - 13.0 = 3.5

# Si éligible (gap >= 0):
bac_fit = max(0.72, 1 - min(abs(gap), 5) / 8)
        = max(0.72, 1 - min(3.5, 5) / 8)
        = max(0.72, 1 - 3.5 / 8)
        = max(0.72, 0.5625)
        = 0.72 ✅

# Si borderline (-0.75 ≤ gap < 0):
bac_fit = max(0.45, 0.72 - min(abs(gap), 2.5) / 6)

# Si trop loin (gap < -0.75):
# → Formation exclue ❌
```

**Logique:** Plus l'écart est petit, meilleur le score (max 1.0, min 0.45)

---

#### **2️⃣ SUBJECT FIT (22%)**

Vérifie que les notes spécifiques sont adaptées au domaine:

```python
# Pour INFORMATIQUE:
subject_fit = (math_norm * 0.50) + (physics_norm * 0.30) + (subject3_norm * 0.20)
            = (0.85 * 0.50) + (0.825 * 0.30) + (0.79 * 0.20)
            = 0.425 + 0.2475 + 0.158
            = 0.8305

# Pour MÉDECINE:
subject_fit = (subject3_norm * 0.45) + (physics_norm * 0.30) + (math_norm * 0.25)
            = (0.79 * 0.45) + (0.825 * 0.30) + (0.85 * 0.25)
            = 0.3555 + 0.2475 + 0.2125
            = 0.8155

# Poids spécifiques par domaine:
# Informatique: Math 50%, Physique 30%, Autre 20%
# Ingénierie: Math 40%, Physique 40%, Autre 20%
# Médecine: Autre 45%, Physique 30%, Math 25%
# Business: Math 35%, Autre 35%, Physique 30%
# Lettres: Autre 60%, Physique 20%, Math 20%
# Science: Math 34%, Physique 33%, Autre 33%
```

---

#### **3️⃣ SUBJECT THRESHOLD FIT (15%)**

Vérifie que chaque note atteint les seuils individuels minimums:

```python
# Une formation peut exiger:
min_score_1 = 13.0  # Minimum math
min_score_2 = 12.5  # Minimum physique
min_score_3 = 12.0  # Minimum 3e sujet

student_math = 17.0
student_physics = 16.5
student_subject3 = 15.8

# Calcul des gaps:
gap_math = 17.0 - 13.0 = 4.0 ≥ 0 → +1.0 point
gap_physics = 16.5 - 12.5 = 4.0 ≥ 0 → +1.0 point
gap_subject3 = 15.8 - 12.0 = 3.8 ≥ 0 → +1.0 point

threshold_fit = (1.0 + 1.0 + 1.0) / 3 = 1.0 ✅

# Barème complet:
# gap ≥ 0: +1.0
# gap ∈ [-1, 0): +0.75
# gap ∈ [-2, -1): +0.5
# gap < -2: +0.1
```

---

#### **4️⃣ STREAM FIT (8%)**

Utilise les **poids** définis dans `stream_rules`:

```python
# Étudiant: Sciences
# Formation: Informatique (track: "computer")
stream_fit = stream_rules["sciences"]["weights"]["computer"]
           = 0.72

# Mais si c'était Lettres-Philo:
stream_fit = stream_rules["lettres_philo"]["weights"]["computer"]
           = 0.05  # Très faible!
```

---

#### **5️⃣ AI FIT (12%)**

C'est la **probabilité prédite par le Naive Bayes**:

```python
# Le modèle NB prédit pour ce profil:
ai_fit = track_probabilities["computer"]  # Par exemple 0.72
       = 72% de confiance
```

---

#### **6️⃣ SELECTIVITY FIT (13%)**

Score basé sur la "sélectivité" de la formation:

```python
required_bac = 14.5  # Seuil de la formation

selectivity_fit = max(0, min((14.5 - 10) / 10, 1))
                = min(4.5 / 10, 1)
                = 0.45

# Logique: Plus la formation est sélective (haut seuil), 
# plus ce score compte pour favoriser les excellents étudiants
```

---

#### **7️⃣ BONUS DE VILLE (CITY BONUS)**

```python
preferred_wilaya = "Alger"
formation_city = "Alger"

if preferred_wilaya.lower() == formation_city.lower():
    city_bonus = 0.08  # Bonus de 8%
else:
    city_bonus = 0.0
```

---

#### **8️⃣ BONUS D'EXCELLENCE**

```python
# Si BAC ≥ 17 ET seuil formation ≥ 16:
excellence_bonus = 0.08

# Si BAC ≥ 18.5 ET domaine sélectif (computer/engineering/medical):
excellence_bonus += 0.05

# Maximum: 0.14 (14%)
```

---

### 📊 EXEMPLE COMPLET DE CALCUL

**Profil étudiant:**
```
BAC: Sciences
Moyenne: 16.5/20
Maths: 17.0
Physique: 16.5
Sujet 3: 15.8
Wilaya: Alger
```

**Formation candidate: Informatique à USTHB**
```
Seuil min BAC: 13.5
Seuil math: 13.0
Seuil physique: 12.5
Seuil sujet 3: 12.0
Localité: Alger
```

**Calcul du score:**

```
1. BAC fit:
   gap = 16.5 - 13.5 = 3.0
   bac_fit = max(0.72, 1 - 3.0/8) = max(0.72, 0.625) = 0.72
   Contribution: 0.72 × 0.30 = 0.216

2. Subject fit:
   subject_fit = 0.85×0.50 + 0.825×0.30 + 0.79×0.20 = 0.8305
   Contribution: 0.8305 × 0.22 = 0.1827

3. Threshold fit:
   Tous les gaps ≥ 0 → 1.0
   Contribution: 1.0 × 0.15 = 0.15

4. Stream fit:
   stream_fit = 0.72 (Sciences → Informatique)
   Contribution: 0.72 × 0.08 = 0.0576

5. AI fit:
   ai_fit = 0.70 (Prédiction du modèle NB)
   Contribution: 0.70 × 0.12 = 0.084

6. Selectivity fit:
   selectivity = (13.5 - 10) / 10 = 0.35
   Contribution: 0.35 × 0.13 = 0.0455

7. City bonus: 0.08 ✅

8. Excellence bonus: 0.05 ✅ (16.5 ≥ 17? Non, donc pas de bonus ici)

TOTAL:
0.216 + 0.1827 + 0.15 + 0.0576 + 0.084 + 0.0455 + 0.08 = 0.8158
= 81.58% de compatibilité 🎯
```

---

## 🤔 POURQUOI CES MODÈLES POUR VOTRE PFE?

### ✅ AVANTAGES DE NAIVE BAYES

1. **Apprentissage rapide** → Pas besoin de GPU ou ressources lourdes
2. **Données synthétiques** → Peut fonctionner sans dataset réel massif
3. **Transparent et explicable** → Parfait pour un PFE (vous pouvez expliquer chaque décision)
4. **Probabilités calibrées** → Donne un % de confiance (ex: 72%)
5. **Multi-classe naturel** → Classifie directement en 5 ou 7 catégories
6. **Adapté au contexte** → Données catégoriques/ordinales (filières, bandes de notes)

### ❌ LIMITATIONS (ET POURQUOI C'EST OK POUR UN PFE)

1. **Indépendance des variables** → Suppose que réponses/notes sont indépendantes
   - **Solution:** Fonctionne bien en pratique malgré cette hypothèse
   
2. **Données synthétiques** → Pas basé sur vrais historiques d'étudiants
   - **Solution:** Pour PFE c'est acceptable (simulation réaliste)
   
3. **Pas de deep learning** → Moins sophistiqué que réseaux de neurones
   - **Solution:** Overkill pour ce problème, KISS principle (Keep It Simple)

---

## 🎓 MODÈLES ALTERNATIFS QUE VOUS AURIEZ PU CHOISIR

### ❌ KNN (K-Nearest Neighbors)
- **Problème:** Besoin de vraies données étiquetées (impossible sans historique)
- **Ici:** Inadapté

### ❌ Random Forest
- **Avantage:** Très précis
- **Problème:** Boîte noire (impossible à expliquer pour PFE)
- **Ici:** Trop complexe

### ❌ Régression Logistique
- **Problème:** Pas adapté aux données catégoriques
- **Ici:** Mauvais choix

### ❌ Deep Learning (Réseaux de neurones)
- **Problème:** Besoin de beaucoup de données réelles
- **Ici:** Overkill et non-explicable

### ✅ NAIVE BAYES (VOTRE CHOIX)
- **Perfect pour:** Données catégoriques, données synthétiques, transparence
- **Ici:** Meilleur choix pour un PFE! 🎯

---

## 💡 RÉSUMÉ EN UNE PAGE

| Aspect | Quiz Engine | Recommender |
|--------|-------------|-------------|
| **Entrée** | 12 réponses fermées | Notes BAC + profil |
| **Modèle ML** | Naive Bayes Catégorique | Naive Bayes + Scoring |
| **Sortie** | 1 filière recommandée (+ probabilités) | Top 5 formations classées |
| **Données train** | 5000+ combinaisons synthétiques | 800+ profils synthétiques |
| **Features** | 12 réponses textuelles | 6 données converties en bandes |
| **Calcul principal** | P(filière\|réponses) | Score multicritères (8 facteurs) |
| **Temps de calcul** | <10ms | <50ms |
| **Explicabilité** | Très haute | Très haute |

---

## 🚀 POINTS CLÉS POUR VOTRE DÉFENSE DE PFE

### À souligner:

1. **Choix intelligent de Naive Bayes:**
   - Transparent (vs boîte noire)
   - Adapté aux données catégoriques
   - Fonctionne sans big data réel

2. **Données synthétiques bien construites:**
   - Prototypes réalistes (basés sur règles métier)
   - Couverture combinatoire complète
   - Labelling automatique et cohérent

3. **Système hybride intelligent:**
   - Quiz: Préférences + aptitudes
   - Recommender: Données objectives (notes)
   - Les 2 se complètent!

4. **Scoring multicritères bien pensé:**
   - 8 facteurs pertinents
   - Poids équilibrés et documentés
   - Chaque décision explicable

5. **Scalabilité:**
   - Base de données SQLite
   - Pipeline sklearn standard
   - Facile à enrichir avec vraies données

---

## 🎓 FORMULES MATHÉMATIQUES CLÉS

### Naive Bayes:
$$P(C|X) = \frac{P(X|C) \cdot P(C)}{P(X)}$$

Où:
- $C$ = classe (filière/track)
- $X$ = features (réponses/notes)
- $P(C|X)$ = probabilité posteriori
- $P(X|C)$ = vraisemblance
- $P(C)$ = probabilité a priori

### Score final (Recommender):
$$\text{Score} = \sum_{i=1}^{8} (w_i \cdot f_i) + \text{bonus}$$

Où:
- $w_i$ = poids du facteur $i$ (0.30, 0.22, etc.)
- $f_i$ = score du facteur $i$ (0 à 1)
- $\text{bonus}$ = bonus de ville/excellence

---

**Document créé pour le PFE EduPath - Explication complète des modèles ML**
