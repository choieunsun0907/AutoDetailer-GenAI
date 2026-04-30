
import { GoogleGenAI } from "@google/genai";
import { ResearchResult } from "../types";

// 1. Research Phase: Using Gemini 3.0 Pro Preview with Thinking Mode
export const researchProduct = async (productName: string): Promise<ResearchResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      You are Korea's top **Sports Brand Copywriter** (Nike/Adidas style).
      Analyze the input: "${productName}". 
      
      **CRITICAL TASK (TITLE CLEANING)**: 
      Identify if the input contains any technical product codes, model numbers, or SKUs (e.g., "DH4071-001", "SM-S928N", "V3-X").
      **REMOVE these technical codes** and extract only the "Marketing Name" that a customer would recognize.
      Example: "Nike Air Zoom Pegasus 39 DH4071-001" -> "Nike Air Zoom Pegasus 39"
      
      **Copywriting Task**:
      Write SHORT, PUNCHY, and DRAMATIC copy in KOREAN (Hangul) for a product detail page.
      
      **Format**: "Headline: Description" (Headline 3-6 words, Description 1 sentence).
      
      **Required Sections:**
      1. marketingName: The cleaned, consumer-friendly product name.
      2. features: Technical Spec (Focus on speed, touch, or material).
      3. benefits: User Gain (Focus on dominating the game).
      4. functions: Performance (Focus on fit and agility).
      5. designConcept: Visual (Focus on sleekness and aggressive aesthetics).

      Output strictly in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");
    
    const data = JSON.parse(text);
    return {
      productName,
      ...data
    };

  } catch (error) {
    console.error("Research Error:", error);
    throw error;
  }
};

// 2. Image Generation Phase: Using Gemini 3.0 Pro Image Preview
export const generateDetailImage = async (
  researchData: ResearchResult,
  images: { base64: string; mimeType: string }[]
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      **ROLE**: Senior Creative Director (Top 1% in Korea).
      **TASK**: Create a 2K resolution, vertical (9:16) product detail page for "${researchData.marketingName}".

      **STRICT REQUIREMENTS**:
      1. **TITLE**: Use the marketing name "${researchData.marketingName}". **DO NOT INCLUDE ANY TECHNICAL CODES.**
      2. **LANGUAGE**: All text MUST be in **KOREAN (Hangul)**.
      3. **IMAGE SOURCE**: **CRITICAL**: You MUST ONLY use the ${images.length} provided images for the product visuals. **DO NOT** generate or hallucinate any new product images. The product shown in the final design MUST MATCH the provided images exactly.
      4. **IMAGE INTEGRATION**: Blend the ${images.length} provided images dynamically into the layout.
      
      **CONTENT**:
      - Headline: "${researchData.marketingName}"
      - Detail 1: ${researchData.features}
      - Detail 2: ${researchData.benefits}
      - Detail 3: ${researchData.functions}
      - Detail 4: ${researchData.designConcept}

      **STYLE**: 
      - High-end Sports Editorial.
      - Deep Navy/Black/Neon accents.
      - Cinematic rim lighting and bold typography.
    `;

    const parts: any[] = [{ text: prompt }];
    images.forEach((img) => {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: { parts },
      config: {
        imageConfig: {
            aspectRatio: "9:16",
            imageSize: "2K"
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image generated.");

  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};
