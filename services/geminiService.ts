
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { EntityProfile, GenerationMode, ExportFormat } from "../types";

// Safe API Key access
const getApiKey = () => {
  try {
    return process.env.API_KEY;
  } catch (e) {
    return (import.meta as any).env?.VITE_API_KEY; 
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy' });

/**
 * Wraps a promise with a timeout to prevent infinite hanging.
 */
const callWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Délai dépassé (Timeout ${Math.round(timeoutMs/1000)}s). Le serveur est peut-être saturé.`)), timeoutMs);
  });

  return Promise.race([
    promise.then(res => { clearTimeout(timeoutHandle); return res; }),
    timeoutPromise
  ]);
};

/**
 * Helper to retry an async operation with exponential backoff.
 */
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 5000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Don't retry client errors (4xx) or safety blocks
    if (error.message.includes("400") || error.message.includes("Sécurité")) {
       throw error;
    }

    if (retries > 0) {
      console.warn(`Operation failed, retrying... (${retries} attempts left). Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay)); 
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Analyzes images to create a detailed physical description.
 */
export const analyzeImageForTraining = async (
  base64Images: string[],
  subjectType: 'PERSON' | 'PRODUCT'
): Promise<string> => {
  if (!apiKey) throw new Error("API Key manquante. Vérifiez votre configuration (.env).");
  
  try {
    const prompt = subjectType === 'PERSON' 
      ? "You are a casting director. Describe the person in these photos in extreme detail. Focus on facial structure, eye color, hair texture, age, and skin tone. Be objective and precise."
      : "You are a 3D Product Modeler. Describe this object's geometry, materials, textures, label details, reflection properties, and colors in extreme detail so it can be recreated digitally.";

    const parts = base64Images.slice(0, 3).map(img => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: img.includes(',') ? img.split(',')[1] : img
      }
    }));

    const response = await callWithTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          ...parts,
          { text: prompt }
        ]
      }
    }), 30000); // 30s timeout for analysis

    return response.text || "Pas de description générée.";
  } catch (error) {
    console.error("Error analyzing images:", error);
    throw error;
  }
};

/**
 * Generates a detailed description for an AI Persona based on a short idea.
 */
export const generateAIModelDescription = async (idea: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key manquante.");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a highly detailed visual description for a photorealistic AI model based on this concept: "${idea}". 
      Describe face, hair, eyes, skin texture, age, body type and typical expression. 
      Format as a dense paragraph suitable for image generation prompting.`,
    });
    return response.text || idea;
  } catch (error) {
    throw new Error("Impossible de générer la description du personnage.");
  }
};

/**
 * Generates reference images for an AI Persona with specific angles and expressions.
 */
export const generateAIModelImages = async (description: string): Promise<string[]> => {
  if (!apiKey) throw new Error("API Key manquante.");

  const masterPrompt = `Generate a photorealistic ID photo of the following character: ${description}. 
  Shot: Extreme close-up portrait, facing camera directly. Neutral expression. 
  Lighting: Soft studio lighting, white background. High resolution, 8k.`;

  const generateImage = async (prompt: string, referenceImage?: string): Promise<string> => {
    const parts: any[] = [];
    
    if (referenceImage) {
      const base64Data = referenceImage.includes(',') ? referenceImage.split(',')[1] : referenceImage;
      parts.push({
        inlineData: { mimeType: 'image/png', data: base64Data }
      });
      parts.push({ text: `Reference Image: Use this face as the strict identity reference for the character.` });
    }

    parts.push({ text: prompt });

    const response = await callWithTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { imageConfig: { aspectRatio: "1:1" } }
    }), 60000);
    
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data returned");
  };

  try {
    const masterImage = await retryOperation(() => generateImage(masterPrompt), 2);
    
    const shots = [
      { label: "Face - Souriant", prompt: `Portrait of the character, smiling warmly. Friendly expression. Maintain exact facial features from reference.` },
      { label: "Face - Triste", prompt: `Portrait of the character, sad expression, looking down. Maintain exact facial features from reference.` },
      { label: "Profil", prompt: `Side profile view of the character. Neutral expression. Maintain exact facial features from reference.` },
      { label: "Plein Pied", prompt: `Full body fashion shot of the character walking. Stylish pose. Maintain body type and features.` },
      { label: "Plan Américain", prompt: `Waist-up shot of the character, arms crossed, confident. Maintain exact facial features.` }
    ];

    const otherImagesPromises = shots.map(shot => 
      retryOperation(() => generateImage(`${shot.prompt} Character Description: ${description}`, masterImage), 2)
    );

    const otherImages = await Promise.all(otherImagesPromises);

    return [masterImage, ...otherImages];

  } catch (e) {
    console.error("Failed to generate AI model images", e);
    throw new Error("Erreur lors de la création de la planche contact du personnage.");
  }
};


/**
 * Generates a new image based on profiles and user prompt.
 */
export const generateBrandVisual = async (
  userPrompt: string,
  mode: GenerationMode,
  selectedPeople: EntityProfile[],
  products: EntityProfile[], 
  likedPrompts: string[] = []
): Promise<string> => {
  
  if (!apiKey) throw new Error("API Key manquant (Check .env)");

  const performGeneration = async () => {
    const imageParts: any[] = [];
    let promptBuilder = "";
    let scaleInstructions = "";

    // IMPORTANT: Products FIRST for higher fidelity on text/logos
    const maxTotalImages = 4;
    let currentImageCount = 0;

    // 1. Process Products (Priority)
    products.forEach((product, idx) => {
      if (currentImageCount >= maxTotalImages) return;
      if (product.images.length > 0) {
        const rawProd = product.images[0];
        const base64Prod = rawProd.includes(',') ? rawProd.split(',')[1] : rawProd;
        if (base64Prod) {
          imageParts.push({
            inlineData: { mimeType: 'image/jpeg', data: base64Prod }
          });
          promptBuilder += `[Reference Image ${currentImageCount + 1}: PRODUCT (${product.name}) - CRITICAL: KEEP LOGO AND TEXT IDENTICAL]. `;
          if (product.dimensions) {
             scaleInstructions += `- PRODUCT "${product.name}" DIMENSIONS: ${product.dimensions}.\n`;
          }
          currentImageCount++;
        }
      }
    });

    // 2. Process People
    selectedPeople.forEach((p, idx) => {
      if (currentImageCount >= maxTotalImages) return;
      if (p.images.length > 0) {
        const rawPerson = p.images[0];
        const base64Person = rawPerson.includes(',') ? rawPerson.split(',')[1] : rawPerson;
        if (base64Person) {
          imageParts.push({
            inlineData: { mimeType: 'image/jpeg', data: base64Person }
          });
          promptBuilder += `[Reference Image ${currentImageCount + 1}: SUBJECT PERSON (${p.name})]. `;
          if (p.dimensions) {
             scaleInstructions += `- SUBJECT "${p.name}" HEIGHT/SIZE: ${p.dimensions}.\n`;
          }
          currentImageCount++;
        }
      }
    });

    // 3. Prompt Engineering
    promptBuilder += `\n\nROLE: Professional Commercial Photographer & Digital Artist.`;
    promptBuilder += `\nTASK: Create a photorealistic image based on the user's request.`;
    promptBuilder += `\nUSER REQUEST (Translate to English internally): "${userPrompt}"`;
    
    if (imageParts.length > 0) {
      promptBuilder += `\n\nVISUAL INSTRUCTIONS (STRICT):`;
      promptBuilder += `\n- Use the provided reference images as the PRIMARY source for the subjects/objects.`;
      promptBuilder += `\n- BRAND INTEGRITY: Ensure the product looks EXACTLY like the reference.`;
      promptBuilder += `\n- TEXT FIDELITY: Any text or logos on the product labels must be legible, identical to the photo, and accurate. Do not hallucinate new text.`;
      promptBuilder += `\n- Seamlessly blend the subjects into the described environment.`;
      
      if (scaleInstructions) {
         promptBuilder += `\n\nSCALE & PROPORTIONS (CRITICAL):`;
         promptBuilder += `\nYou MUST respect the following real-world dimensions:`;
         promptBuilder += `\n${scaleInstructions}`;
         promptBuilder += `\n- Ensure small objects look small in hands, and large objects look large.`;
      }
    } else {
      promptBuilder += `\n\nINSTRUCTIONS: Generate a high quality image based solely on the textual description.`;
    }

    // 4. Execution with TIMEOUT
    const fullParts = [
      ...imageParts,
      { text: promptBuilder }
    ];

    const response = await callWithTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: fullParts,
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    }), 90000); // 90 seconds max per image

    const candidate = response.candidates?.[0];
    
    // Safety Check
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
       throw new Error(`Sécurité : L'IA a bloqué l'image (Raison: ${candidate.finishReason}). Simplifiez le prompt ou changez de sujet.`);
    }

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const base64ImageBytes = part.inlineData.data;
          return `data:image/png;base64,${base64ImageBytes}`;
        }
      }
    }
    
    throw new Error("L'API n'a pas retourné d'image valide.");
  };

  return retryOperation(performGeneration, 2, 5000);
};

/**
 * REPAIR PRODUCT IDENTITY: Composites original product onto generated image.
 */
export const repairProductIdentity = async (
  generatedImageUrl: string,
  originalProductUrl: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key manquant");

  const performRepair = async () => {
    const generatedBase64 = generatedImageUrl.includes(',') ? generatedImageUrl.split(',')[1] : generatedImageUrl;
    const productBase64 = originalProductUrl.includes(',') ? originalProductUrl.split(',')[1] : originalProductUrl;

    const parts = [
      {
        inlineData: { mimeType: 'image/png', data: generatedBase64 }
      },
      {
        inlineData: { mimeType: 'image/jpeg', data: productBase64 }
      },
      { 
        text: `ROLE: Expert Photo Retoucher.
        TASK: Restore the product identity in the first image (Scene) using the second image (Product Reference).
        INSTRUCTIONS:
        1. Identify the product in the Scene (Image 1).
        2. Replace the details, label, text, and logo of the product in the Scene with the exact details from the Product Reference (Image 2).
        3. Maintain the lighting, perspective, and shadows of the Scene.
        4. CRITICAL: The text on the product must be 100% readable and identical to the reference. Do not change anything else in the image.` 
      }
    ];

    const response = await callWithTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { imageConfig: { aspectRatio: "1:1" } }
    }), 60000);

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
           return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("La réparation a échoué.");
  };

  return retryOperation(performRepair, 2);
};


/**
 * MAGIC EDITOR
 */
export const editGeneratedVisual = async (
  originalImageUrl: string,
  instruction: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key manquant");

  const performEdit = async () => {
    const base64Data = originalImageUrl.includes(',') ? originalImageUrl.split(',')[1] : originalImageUrl;
    
    const parts = [
      {
        inlineData: { mimeType: 'image/png', data: base64Data }
      },
      { text: `ROLE: Expert Photo Retoucher.\nTASK: Edit this image. ${instruction}\nCONSTRAINT: Maintain the identity of the person and the look of the product exactly. Only modify what is requested.` }
    ];

    const response = await callWithTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { imageConfig: { aspectRatio: "1:1" } }
    }), 60000);

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
           return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("L'édition a échoué.");
  };
  return retryOperation(performEdit, 2);
};

/**
 * EXPORT STUDIO
 */
export const expandImageForFormat = async (
  originalImageUrl: string,
  format: ExportFormat
): Promise<string> => {
  if (!apiKey) throw new Error("API Key manquant");

  const performExpansion = async () => {
    const base64Data = originalImageUrl.includes(',') ? originalImageUrl.split(',')[1] : originalImageUrl;
    
    const parts = [
      {
        inlineData: { mimeType: 'image/png', data: base64Data }
      },
      { text: `ROLE: Digital Artist.\nTASK: Expand the canvas of this image to fit a ${format} aspect ratio for social media use.\nINSTRUCTION: Seamlessly extend the background. Do NOT distort or crop the central subject/product. Keep the style consistent.` }
    ];

    const response = await callWithTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { imageConfig: { aspectRatio: format } }
    }), 60000);

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
           return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("L'exportation a échoué.");
  };
  return retryOperation(performExpansion, 2);
};

export const refinePrompt = async (roughIdea: string, context?: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a World-Class Prompt Engineer for AI Image Generators.
        Your task: Take the user's rough idea (which might be in French) and convert it into an ENGLISH "Master Prompt" optimized for photorealism.
        
        User's Rough Idea: "${roughIdea}"
        Context: ${context || 'General scene'}
        
        Format the output as a single, dense, highly detailed paragraph in ENGLISH.
        Include specific keywords for:
        - Subject details (pose, expression)
        - Lighting (e.g., volumetric, cinematic, golden hour, studio softbox)
        - Camera/Lens (e.g., 85mm, f/1.8, depth of field, bokeh)
        - Art Style (e.g., Hyper-realistic, 8k, Unreal Engine 5 render, Vogue editorial)
        - Color Grading
        
        Output ONLY the English prompt text. No intro or explanation.
      `,
    });
    return response.text || roughIdea;
  } catch (e) {
    return roughIdea;
  }
};

export const suggestPrompts = async (
  userDesc: string,
  productDesc: string
): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Suggest 3 creative, distinct photo concepts for: Person (${userDesc.substring(0, 50)}...) and Product (${productDesc.substring(0, 50)}...). Return valid JSON array of strings in French.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (e) {
    return ["Séance photo studio avec éclairage sombre", "Photo lifestyle en extérieur dans la nature", "Composition style urbain moderne"];
  }
};
