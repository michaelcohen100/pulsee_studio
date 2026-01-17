import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { EntityProfile, GenerationMode, ExportFormat } from "../types";
import { descriptionCache } from "../utils/generationQueue";

// Safe API Key access
const getApiKey = () => {
  try {
    // Check various common names
    const env = (import.meta as any).env;
    return env?.VITE_GEMINI_API_KEY || env?.VITE_GOOGLE_API_KEY || env?.VITE_API_KEY || key_from_process();
  } catch (e) {
    return key_from_process();
  }
};

const key_from_process = () => {
  try { return process.env.GEMINI_API_KEY || process.env.API_KEY; } catch { return undefined; }
}

// ============================================
// PULSEE BRAND CONSTANTS
// ============================================
const PULSEE_BRAND_GUIDELINES = {
  colors: {
    primary: '#0A1628', // Bleu marine profond
    secondary: '#1A2744',
    accent: '#00D4FF', // Bleu électrique/cyan
    white: '#FFFFFF'
  },
  visualCodes: `
    - Deep navy blue (#0A1628) as dominant color
    - Electric cyan (#00D4FF) for energy accents and highlights
    - Cold, icy atmosphere evoking "polar mint" sensation
    - Premium, pharmaceutical, technical aesthetic
    - Electric/lightning visual effects when appropriate
    - Clean, modern, professional rendering
    - High contrast between light and shadow
  `,
  productDescription: `
    Pulsee Booster: 15ml dark glass dropper bottle with navy blue label.
    Label shows "PULSEE BOOSTER" in white bold text, lightning bolt icon inside a water drop logo.
    Secondary text: "INSTANT ENERGY - POLAR MINT" in cyan.
    Silver/chrome dropper cap with dark blue rubber top.
  `
};

// ============================================
// IMAGE OPTIMIZATION UTILITIES
// ============================================

/**
 * Optimise une image base64 pour l'envoi API
 * Stratégie adaptative selon le type de contenu
 */
export const optimizeImageForAPI = async (
  base64Str: string,
  maxDimension = 512,
  quality = 0.6
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcul des dimensions optimales
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Meilleur rendu
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl.split(',')[1]); // Clean Base64

      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error('Image loading failed'));

    // Handle both formats
    img.src = base64Str.includes(',') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
  });
};

/**
 * Configurations d'optimisation prédéfinies
 */
export const ImageOptimizationPresets = {
  // Pour les visages - compression forte, résolution moyenne
  PERSON: { maxDimension: 600, quality: 0.6 },

  // Pour les produits - haute fidélité pour préserver texte/logos
  PRODUCT: { maxDimension: 1280, quality: 0.9 },

  // Pour l'édition - équilibré
  EDIT: { maxDimension: 1024, quality: 0.8 },

  // Pour l'analyse - résolution moyenne suffit
  ANALYSIS: { maxDimension: 800, quality: 0.7 },

  // Pour la réparation produit - maximum fidélité
  REPAIR: { maxDimension: 1400, quality: 0.95 }
};

// ============================================
// TIMEOUT & RETRY UTILITIES
// ============================================

/**
 * Wrapper avec timeout configurable
 */
const callWithTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName = 'Opération'
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(
        `${operationName} : Délai dépassé (${Math.round(timeoutMs / 1000)}s). ` +
        `Le serveur est peut-être saturé. Réessayez dans quelques instants.`
      ));
    }, timeoutMs);
  });

  return Promise.race([
    promise.then(res => { clearTimeout(timeoutHandle); return res; }),
    timeoutPromise
  ]);
};

/**
 * Retry avec backoff exponentiel amélioré
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    initialDelay?: number;
    maxDelay?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    initialDelay = 3000,
    maxDelay = 30000,
    operationName = 'Opération'
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Ne pas retry pour certaines erreurs
      const errorMsg = error?.message || '';
      if (
        errorMsg.includes("400") ||
        errorMsg.includes("Sécurité") ||
        errorMsg.includes("SAFETY") ||
        errorMsg.includes("Invalid")
      ) {
        throw error;
      }

      if (attempt < retries) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        console.warn(
          `[${operationName}] Tentative ${attempt + 1}/${retries + 1} échouée. ` +
          `Retry dans ${Math.round(delay / 1000)}s... Erreur: ${errorMsg}`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`${operationName} a échoué après ${retries + 1} tentatives`);
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Traduit les erreurs API en messages utilisateur friendly
 */
const humanizeError = (error: any): string => {
  const msg = error?.message || String(error);

  if (msg.includes('SAFETY') || msg.includes('Sécurité')) {
    return "⚠️ L'IA a bloqué cette génération pour des raisons de sécurité. Essayez de reformuler le prompt.";
  }
  if (msg.includes('429') || msg.includes('quota')) {
    return "⏳ Quota API dépassé. Attendez quelques minutes avant de réessayer.";
  }
  if (msg.includes('timeout') || msg.includes('Délai')) {
    return "⏱️ Le serveur met trop de temps à répondre. Réessayez avec un prompt plus simple.";
  }
  if (msg.includes('500') || msg.includes('503')) {
    return "🔧 Le serveur Gemini rencontre des difficultés. Réessayez dans quelques instants.";
  }
  if (msg.includes('Invalid') || msg.includes('400')) {
    return "❌ Requête invalide. Vérifiez vos images et votre prompt.";
  }

  return `Erreur : ${msg}`;
};

// ============================================
// CORE API FUNCTIONS
// ============================================

/**
 * Analyse des images pour créer une description détaillée
 * Avec cache pour éviter les appels redondants
 */
export const analyzeImageForTraining = async (
  base64Images: string[],
  subjectType: 'PERSON' | 'PRODUCT'
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante. Vérifiez votre fichier .env");

  // Vérifier le cache d'abord
  const cached = descriptionCache.get(base64Images);
  if (cached) {
    console.log('[Cache Hit] Description récupérée du cache');
    return cached;
  }

  const ai = new GoogleGenAI({ apiKey });
  const preset = ImageOptimizationPresets.ANALYSIS;

  const performAnalysis = async (): Promise<string> => {
    const prompt = subjectType === 'PERSON'
      ? `You are an expert casting director. Analyze these photos and create an extremely detailed physical description.
         Include: facial structure, eye color and shape, hair (color, texture, style), estimated age, skin tone and texture,
         body type if visible, distinctive features, typical expressions.
         Be objective, precise, and thorough. This description will be used for AI image generation.`
      : `You are an expert 3D product modeler. Analyze this product and create an extremely detailed technical description.
         Include: exact geometry and dimensions, materials and textures, all label text (VERBATIM - copy exactly),
         logo placement and design, color codes, reflection properties, surface finish.
         CRITICAL: Copy ALL text on the label exactly as written. This is essential for accurate reproduction.`;

    // Optimiser les images avant envoi
    const optimizedImages = await Promise.all(
      base64Images.slice(0, 3).map(img =>
        optimizeImageForAPI(img, preset.maxDimension, preset.quality)
      )
    );

    const parts = [
      ...optimizedImages.map(data => ({
        inlineData: { mimeType: 'image/jpeg', data }
      })),
      { text: prompt }
    ];

    const response = await callWithTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts }
      }),
      45000,
      'Analyse d\'image'
    );

    const description = response.text || "Description non générée.";

    // Sauvegarder dans le cache
    descriptionCache.set(base64Images, description);

    return description;
  };

  return retryOperation(performAnalysis, {
    retries: 2,
    operationName: 'Analyse d\'image'
  });
};

/**
 * Génère une description détaillée pour un personnage IA
 */
export const generateAIModelDescription = async (idea: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante.");

  const ai = new GoogleGenAI({ apiKey });

  const response = await callWithTimeout(
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a highly detailed visual description for a photorealistic AI model based on this concept: "${idea}". 
      
      Include ALL of the following in a dense paragraph:
      - Face shape and structure
      - Eye color, shape, and expression
      - Hair color, texture, length, and style
      - Skin tone and texture
      - Estimated age range
      - Body type and posture
      - Typical expression/demeanor
      
      Format as a single detailed paragraph optimized for AI image generation.
      Be specific with colors (use descriptive terms like "warm honey brown" not just "brown").`,
    }),
    30000,
    'Génération de description'
  );

  return response.text || idea;
};

/**
 * Génère les 6 images de référence pour un personnage IA
 */
export const generateAIModelImages = async (description: string): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante.");

  const ai = new GoogleGenAI({ apiKey });

  const generateSingleImage = async (
    prompt: string,
    referenceImage?: string
  ): Promise<string> => {
    const parts: any[] = [];

    if (referenceImage) {
      const base64Data = referenceImage.includes(',')
        ? referenceImage.split(',')[1]
        : referenceImage;
      const optimized = await optimizeImageForAPI(base64Data, 512, 0.7);
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: optimized }
      });
      parts.push({
        text: `IDENTITY REFERENCE: Use this face as the STRICT identity reference. 
               The generated image MUST be the same person.`
      });
    }

    parts.push({ text: prompt });

    const response = await callWithTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: "1:1" } }
      }),
      90000,
      'Génération portrait IA'
    );

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("Aucune image retournée par l'API");
  };

  // Image maître (référence)
  const masterPrompt = `Generate a photorealistic ID-style portrait photo.
    Character: ${description}
    Shot: Extreme close-up portrait, facing camera directly, neutral expression.
    Lighting: Soft professional studio lighting, clean white/light gray background.
    Quality: High resolution, 8k, sharp focus on facial features.`;

  const masterImage = await retryOperation(
    () => generateSingleImage(masterPrompt),
    { retries: 2, operationName: 'Portrait maître' }
  );

  // Shots additionnels avec référence
  const shots = [
    {
      label: "Souriant",
      prompt: `Same person, warm genuine smile, friendly expression. 
               Close-up portrait, soft lighting, neutral background.`
    },
    {
      label: "Triste",
      prompt: `Same person, melancholic expression, looking slightly down.
               Close-up portrait, soft dramatic lighting.`
    },
    {
      label: "Profil",
      prompt: `Same person, side profile view (90 degrees), neutral expression.
               Clean background, professional lighting showing facial structure.`
    },
    {
      label: "Plein pied",
      prompt: `Same person, full body fashion shot, standing confidently.
               Stylish casual pose, clean studio background, full length visible.`
    },
    {
      label: "Plan américain",
      prompt: `Same person, waist-up shot, arms crossed, confident expression.
               Professional headshot style, neutral background.`
    }
  ];

  const additionalImages = await Promise.all(
    shots.map(shot =>
      retryOperation(
        () => generateSingleImage(
          `${shot.prompt}\nCharacter identity: ${description}`,
          masterImage
        ),
        { retries: 2, operationName: `Shot ${shot.label}` }
      )
    )
  );

  return [masterImage, ...additionalImages];
};

/**
 * GÉNÉRATION PRINCIPALE DE VISUEL
 * Fonction optimisée avec injection automatique des codes Pulsee
 */
export const generateBrandVisual = async (
  userPrompt: string,
  mode: GenerationMode,
  selectedPeople: EntityProfile[],
  products: EntityProfile[],
  likedPrompts: string[] = [],
  options: {
    injectPulseeBranding?: boolean;
    prioritizeProductFidelity?: boolean;
    ultraRealistic?: boolean;
    isPackshot?: boolean;
  } = {}
): Promise<string> => {

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante (vérifiez .env)");

  const {
    injectPulseeBranding = true,
    prioritizeProductFidelity = true,
    ultraRealistic = false,
    isPackshot = false
  } = options;

  const ai = new GoogleGenAI({ apiKey });

  const performGeneration = async (): Promise<string> => {
    const imageParts: any[] = [];
    let promptBuilder = "";
    let scaleInstructions = "";
    let referenceCount = 0;

    // === 1. TRAITEMENT DES PRODUITS (Priorité haute) ===
    const productPreset = prioritizeProductFidelity
      ? ImageOptimizationPresets.REPAIR
      : ImageOptimizationPresets.PRODUCT;

    for (const product of products.slice(0, 2)) { // Max 2 produits
      if (product.images.length > 0) {
        const optimized = await optimizeImageForAPI(
          product.images[0],
          productPreset.maxDimension,
          productPreset.quality
        );

        referenceCount++;
        imageParts.push({
          inlineData: { mimeType: 'image/jpeg', data: optimized }
        });

        promptBuilder += `[REFERENCE IMAGE ${referenceCount}: PRODUCT "${product.name}"]\n`;
        promptBuilder += `CRITICAL INSTRUCTIONS FOR THIS PRODUCT:\n`;
        promptBuilder += `- Reproduce the product EXACTLY as shown in the reference\n`;
        promptBuilder += `- ALL text on the label must be IDENTICAL and READABLE\n`;
        promptBuilder += `- Logo, colors, and proportions must match perfectly\n\n`;

        if (product.dimensions) {
          scaleInstructions += `• Product "${product.name}": ${product.dimensions}\n`;
        }
      }
    }

    // === 2. TRAITEMENT DES PERSONNES ===
    const personPreset = ImageOptimizationPresets.PERSON;

    for (const person of selectedPeople.slice(0, 2)) { // Max 2 personnes
      if (person.images.length > 0) {
        const optimized = await optimizeImageForAPI(
          person.images[0],
          personPreset.maxDimension,
          personPreset.quality
        );

        referenceCount++;
        imageParts.push({
          inlineData: { mimeType: 'image/jpeg', data: optimized }
        });

        promptBuilder += `[REFERENCE IMAGE ${referenceCount}: PERSON "${person.name}"${person.isAI ? ' (AI Model)' : ''}]\n`;
        promptBuilder += `- Maintain exact facial features and identity\n`;
        promptBuilder += `- Preserve skin tone, hair, and distinguishing features\n\n`;

        if (person.dimensions) {
          scaleInstructions += `• Person "${person.name}" height: ${person.dimensions}\n`;
        }
      }
    }

    // === 3. CONSTRUCTION DU PROMPT PRINCIPAL ===
    promptBuilder += `\n========================================\n`;
    promptBuilder += `ROLE: World-class Commercial Photographer & Digital Artist\n`;

    if (ultraRealistic) {
      promptBuilder += `PHOTOGRAPHY STYLE: High-End Editorial, Shot on Canon EOS R5, 85mm f/1.2 L lens. 8K RAW.\n`;
      promptBuilder += `CRITICAL: The image MUST look like a real photograph, not CGI or AI art.\n`;
      promptBuilder += `- Skin texture must be imperfect and realistic (pores, vellus hair, natural texture)\n`;
      promptBuilder += `- Lighting must be physically accurate with complex subsurface scattering\n`;
      promptBuilder += `- Depth of field must be natural and optical, not artificial blur\n`;
      promptBuilder += `- NO "plastic" skin, NO weird AI eyes, NO symmetrical perfection\n`;
    }

    promptBuilder += `TASK: Create a photorealistic advertising image\n`;
    promptBuilder += `========================================\n\n`;

    promptBuilder += `USER CREATIVE BRIEF:\n"${userPrompt}"\n\n`;

    // Injection des codes Pulsee si activé
    if (injectPulseeBranding && products.some(p =>
      p.name.toLowerCase().includes('pulsee') ||
      p.description.toLowerCase().includes('pulsee')
    )) {
      promptBuilder += `BRAND VISUAL GUIDELINES (Pulsee):\n`;
      promptBuilder += PULSEE_BRAND_GUIDELINES.visualCodes;
      promptBuilder += `\n\n`;
    }

    // Instructions de fidélité
    if (imageParts.length > 0) {
      promptBuilder += `VISUAL FIDELITY REQUIREMENTS:\n`;
      promptBuilder += `1. Reference images are the PRIMARY source of truth\n`;
      promptBuilder += `2. Product labels must be 100% accurate - copy text EXACTLY\n`;
      promptBuilder += `3. Blend subjects naturally into the described environment\n`;
      promptBuilder += `4. Maintain realistic lighting and shadows\n\n`;

      if (scaleInstructions) {
        promptBuilder += `SCALE & PROPORTIONS (CRITICAL):\n${scaleInstructions}\n`;
      }
    }

    // PACKSHOT MODE INSTRUCTIONS
    if (isPackshot) {
      promptBuilder += `\nMODE: PRODUCT PACKSHOT (STRICT)\n`;
      promptBuilder += `CRITICAL: The image must ONLY contain the product(s). NO PEOPLE. NO HANDS. NO HUMAN PRESENCE.\n`;
      promptBuilder += `COMPOSITION: Centered product composition, commercial advertising style.\n`;
      promptBuilder += `BACKGROUND: Clean, high-quality professional background as described, or studio abstract.\n`;
      promptBuilder += `FOCUS: Sharp focus on the entire product. 100% clarity on labels.\n`;
    }

    // Apprentissage des préférences
    if (likedPrompts.length > 0) {
      promptBuilder += `\nSTYLE PREFERENCES (from user history):\n`;
      promptBuilder += `The user has liked images with these characteristics:\n`;
      promptBuilder += likedPrompts.slice(-3).map(p => `• ${p.substring(0, 100)}...`).join('\n');
      promptBuilder += `\n\n`;
    }

    // === 4. APPEL API ===
    const fullParts = [
      ...imageParts,
      { text: promptBuilder }
    ];

    const response = await callWithTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: fullParts },
        config: { imageConfig: { aspectRatio: "1:1" } }
      }),
      120000, // 2 minutes pour les générations complexes
      'Génération de visuel'
    );

    // === 5. TRAITEMENT DE LA RÉPONSE ===
    const candidate = response.candidates?.[0];

    if (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
      throw new Error(
        `Génération bloquée (${candidate.finishReason}). ` +
        `Essayez de simplifier le prompt ou de changer de sujet.`
      );
    }

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("L'API n'a retourné aucune image. Réessayez.");
  };

  try {
    return await retryOperation(performGeneration, {
      retries: 2,
      initialDelay: 5000,
      operationName: 'Génération visuel'
    });
  } catch (error: any) {
    throw new Error(humanizeError(error));
  }
};

/**
 * RÉPARATION DE L'IDENTITÉ PRODUIT
 * Réinjecte les détails du produit original dans une image générée
 */
export const repairProductIdentity = async (
  generatedImageUrl: string,
  originalProductUrl: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante");

  const ai = new GoogleGenAI({ apiKey });

  const performRepair = async (): Promise<string> => {
    const [generatedOpt, productOpt] = await Promise.all([
      optimizeImageForAPI(generatedImageUrl, ImageOptimizationPresets.EDIT.maxDimension, ImageOptimizationPresets.EDIT.quality),
      optimizeImageForAPI(originalProductUrl, ImageOptimizationPresets.REPAIR.maxDimension, ImageOptimizationPresets.REPAIR.quality)
    ]);

    const parts = [
      { inlineData: { mimeType: 'image/jpeg', data: generatedOpt } },
      { inlineData: { mimeType: 'image/jpeg', data: productOpt } },
      {
        text: `ROLE: Expert Photo Retoucher specializing in product photography.

TASK: Restore perfect product identity in Image 1 (Scene) using Image 2 (Product Reference).

DETAILED INSTRUCTIONS:
1. IDENTIFY the product location in the Scene
2. REPLACE product details with those from the Reference:
   - Label text must be IDENTICAL and FULLY READABLE
   - Logo must be pixel-perfect
   - Colors and materials must match exactly
3. PRESERVE the Scene's:
   - Lighting direction and intensity
   - Perspective and angle
   - Shadows and reflections
   - Everything else in the image

QUALITY STANDARDS:
- Text must be crisp and legible
- No blurring or artifacts on the product
- Seamless integration with the scene

Output a single corrected image.`
      }
    ];

    const response = await callWithTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: "1:1" } }
      }),
      90000,
      'Réparation produit'
    );

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("La réparation a échoué - aucune image retournée");
  };

  try {
    return await retryOperation(performRepair, { retries: 2, operationName: 'Réparation' });
  } catch (error: any) {
    throw new Error(humanizeError(error));
  }
};

/**
 * ÉDITEUR MAGIQUE
 */
export const editGeneratedVisual = async (
  originalImageUrl: string,
  instruction: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante");

  const ai = new GoogleGenAI({ apiKey });

  const performEdit = async (): Promise<string> => {
    const optimized = await optimizeImageForAPI(
      originalImageUrl,
      ImageOptimizationPresets.EDIT.maxDimension,
      ImageOptimizationPresets.EDIT.quality
    );

    const parts = [
      { inlineData: { mimeType: 'image/jpeg', data: optimized } },
      {
        text: `ROLE: Expert Photo Retoucher.

EDIT REQUEST: "${instruction}"

CONSTRAINTS:
- Maintain the identity of any people in the image
- Preserve product appearance and label text exactly
- Only modify what is explicitly requested
- Keep the overall composition and style consistent

Apply the edit and output the modified image.`
      }
    ];

    const response = await callWithTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: "1:1" } }
      }),
      90000,
      'Édition magique'
    );

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("L'édition a échoué");
  };

  try {
    return await retryOperation(performEdit, { retries: 2, operationName: 'Édition' });
  } catch (error: any) {
    throw new Error(humanizeError(error));
  }
};

/**
 * EXPORT STUDIO - Expansion de canvas
 */
export const expandImageForFormat = async (
  originalImageUrl: string,
  format: ExportFormat
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante");

  const ai = new GoogleGenAI({ apiKey });

  const performExpansion = async (): Promise<string> => {
    const optimized = await optimizeImageForAPI(
      originalImageUrl,
      ImageOptimizationPresets.EDIT.maxDimension,
      ImageOptimizationPresets.EDIT.quality
    );

    const formatName = format === '9:16' ? 'vertical Story (9:16)' : 'horizontal Banner (16:9)';

    const parts = [
      { inlineData: { mimeType: 'image/jpeg', data: optimized } },
      {
        text: `ROLE: Digital Artist specializing in image expansion.

TASK: Expand this image's canvas to ${formatName} aspect ratio for social media.

INSTRUCTIONS:
1. Intelligently extend the background to fill the new aspect ratio
2. DO NOT crop, distort, or move the central subject/product
3. Match the existing style, lighting, and atmosphere perfectly
4. Create seamless, natural-looking extensions
5. Maintain all important elements (people, products, text)

Output a single expanded image in ${format} format.`
      }
    ];

    const response = await callWithTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: format } }
      }),
      90000,
      'Export format'
    );

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("L'export a échoué");
  };

  try {
    return await retryOperation(performExpansion, { retries: 2, operationName: 'Export' });
  } catch (error: any) {
    throw new Error(humanizeError(error));
  }
};

/**
 * PROMPT REFINER - Transforme une idée en Master Prompt
 */
export const refinePrompt = async (
  roughIdea: string,
  context?: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return roughIdea;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a World-Class Prompt Engineer for AI Image Generators.

INPUT (may be in French): "${roughIdea}"
CONTEXT: ${context || 'General commercial photography'}

TASK: Transform this into an optimized ENGLISH "Master Prompt" for photorealistic image generation.

INCLUDE specific details for:
• Subject positioning and expression
• Lighting setup (e.g., "three-point lighting with soft key light", "golden hour rim light")
• Camera/lens specs (e.g., "Sony A7R IV, 85mm f/1.4, shallow DOF")
• Art direction (e.g., "Vogue editorial aesthetic", "Apple product photography style")
• Color grading and mood
• Technical quality keywords (8K, hyperrealistic, etc.)

OUTPUT: A single dense paragraph in English. No explanations, just the prompt.`,
      }),
      20000,
      'Prompt refinement'
    );

    return response.text || roughIdea;
  } catch (e) {
    console.warn('Prompt refinement failed, using original:', e);
    return roughIdea;
  }
};

/**
 * SUGGESTION DE PROMPTS basée sur le contexte
 */
export const suggestPrompts = async (
  userDesc: string,
  productDesc: string
): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return getDefaultSuggestions();

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate 5 creative and diverse photo concepts for a brand shoot.

SUBJECT: ${userDesc.substring(0, 100)}
PRODUCT: ${productDesc.substring(0, 100)}

Requirements:
- Each concept should be distinctly different (different setting, mood, style)
- Include a mix of: studio shots, lifestyle scenes, artistic/creative concepts
- Make them specific and actionable, not generic
- Write in French

Return ONLY a valid JSON array of 5 strings. No markdown, no explanation.
Example format: ["concept 1", "concept 2", ...]`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }),
      15000,
      'Suggestions'
    );

    const text = response.text;
    if (!text) return getDefaultSuggestions();

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : getDefaultSuggestions();

  } catch (e) {
    console.warn('Suggestion generation failed:', e);
    return getDefaultSuggestions();
  }
};

/**
 * Suggestions par défaut si l'API échoue
 */
function getDefaultSuggestions(): string[] {
  return [
    "Séance photo studio avec éclairage dramatique bleu et noir",
    "Photo lifestyle en extérieur, golden hour, ambiance naturelle",
    "Composition urbaine moderne avec reflets néon",
    "Portrait corporate élégant sur fond neutre",
    "Mise en scène créative avec effets de glace et de froid"
  ];
}
