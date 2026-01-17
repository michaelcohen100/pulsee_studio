import { MarketingPersona, AIModelTemplate } from '../types';

// ============================================
// MARKETING PERSONAS - Target audience profiles for Pulsee
// ============================================

export const MARKETING_PERSONAS: MarketingPersona[] = [
    {
        id: 'entrepreneur',
        name: 'Entrepreneur',
        description: 'Leader dynamique, toujours en mouvement',
        ageRange: '30-45',
        occupation: 'entrepreneur',
        lifestyle: 'workaholic',
        energyNeed: 'réunions, deadlines, focus intense',
        visualKeywords: ['bureau moderne', 'confiance', 'succès', 'dynamique', 'costume décontracté', 'laptop'],
        icon: '💼',
        color: 'from-blue-600 to-indigo-600'
    },
    {
        id: 'student',
        name: 'Étudiant',
        description: 'Révisions tardives, examens, projets',
        ageRange: '18-25',
        occupation: 'étudiant',
        lifestyle: 'studieux',
        energyNeed: 'révisions nocturnes, concentration examen',
        visualKeywords: ['bibliothèque', 'livres', 'jeune', 'concentré', 'ordinateur', 'café'],
        icon: '📚',
        color: 'from-purple-600 to-pink-600'
    },
    {
        id: 'athlete',
        name: 'Sportif',
        description: 'Performance, entraînement, compétition',
        ageRange: '20-35',
        occupation: 'sportif',
        lifestyle: 'athlétique',
        energyNeed: 'avant entraînement, boost pré-compétition',
        visualKeywords: ['salle de sport', 'musclé', 'déterminé', 'tenue sportive', 'sueur', 'énergie'],
        icon: '🏃',
        color: 'from-green-600 to-emerald-600'
    },
    {
        id: 'gamer',
        name: 'Gamer',
        description: 'Sessions longues, e-sport, streaming',
        ageRange: '18-30',
        occupation: 'gamer',
        lifestyle: 'gaming',
        energyNeed: 'sessions gaming marathon, stream longue durée',
        visualKeywords: ['setup gaming', 'néons RGB', 'casque', 'écran', 'dark room', 'concentration'],
        icon: '🎮',
        color: 'from-red-600 to-orange-600'
    },
    {
        id: 'parent',
        name: 'Parent Actif',
        description: 'Famille + carrière, toujours multitâche',
        ageRange: '30-45',
        occupation: 'parent',
        lifestyle: 'famille',
        energyNeed: 'matins difficiles, double journée famille-travail',
        visualKeywords: ['famille', 'maison', 'bienveillant', 'multitâche', 'souriant', 'actif'],
        icon: '👨‍👩‍👧',
        color: 'from-amber-600 to-yellow-600'
    },
    {
        id: 'traveler',
        name: 'Voyageur',
        description: 'Nomade digital, jetlag, aventure',
        ageRange: '25-40',
        occupation: 'digital nomad',
        lifestyle: 'voyage',
        energyNeed: 'décalage horaire, trajets longs, adaptation',
        visualKeywords: ['aéroport', 'backpack', 'aventurier', 'monde', 'laptop café', 'passport'],
        icon: '✈️',
        color: 'from-cyan-600 to-teal-600'
    },
    {
        id: 'creative',
        name: 'Créatif',
        description: 'Designer, artiste, idées à foison',
        ageRange: '25-40',
        occupation: 'créatif',
        lifestyle: 'artistique',
        energyNeed: 'deadlines créatives, inspiration nocturne',
        visualKeywords: ['studio créatif', 'artiste', 'tablette graphique', 'couleurs', 'original', 'inspiré'],
        icon: '🎨',
        color: 'from-fuchsia-600 to-purple-600'
    }
];

// ============================================
// AI MODEL TEMPLATES - Predefined mannequin configurations
// ============================================

export const AI_MODEL_TEMPLATES: AIModelTemplate[] = [
    {
        id: 'business_woman',
        name: 'Business Woman',
        description: 'Femme professionnelle, confiante et élégante',
        config: {
            age: '30s',
            gender: 'female',
            style: 'professional',
            bodyType: 'slim',
            facialExpression: 'confident'
        },
        icon: '👩‍💼'
    },
    {
        id: 'business_man',
        name: 'Business Man',
        description: 'Homme d\'affaires déterminé et stylé',
        config: {
            age: '30s',
            gender: 'male',
            style: 'professional',
            bodyType: 'athletic',
            facialExpression: 'confident'
        },
        icon: '👨‍💼'
    },
    {
        id: 'young_athlete_f',
        name: 'Athlète Femme',
        description: 'Sportive énergique et déterminée',
        config: {
            age: '20s',
            gender: 'female',
            style: 'sporty',
            bodyType: 'athletic',
            facialExpression: 'smiling'
        },
        icon: '🏋️‍♀️'
    },
    {
        id: 'young_athlete_m',
        name: 'Athlète Homme',
        description: 'Sportif musclé et motivé',
        config: {
            age: '20s',
            gender: 'male',
            style: 'sporty',
            bodyType: 'athletic',
            facialExpression: 'serious'
        },
        icon: '🏋️‍♂️'
    },
    {
        id: 'casual_student',
        name: 'Étudiant Décontracté',
        description: 'Jeune étudiant au look casual',
        config: {
            age: '20s',
            gender: 'neutral',
            style: 'casual',
            bodyType: 'average',
            facialExpression: 'friendly'
        },
        icon: '🎓'
    },
    {
        id: 'elegant_mature',
        name: 'Élégant 40+',
        description: 'Personne mature au style raffiné',
        config: {
            age: '40s',
            gender: 'neutral',
            style: 'elegant',
            bodyType: 'average',
            facialExpression: 'confident'
        },
        icon: '🎩'
    }
];
