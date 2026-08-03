import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import { DatabaseManager } from "../db.ts";
import { logger } from "../core/observability/logger";

export interface ImageAnalysisReport {
  qualityScore: number;
  marketplaceReadiness: "Excellent" | "Good" | "Needs Improvement";
  brandingReview: string;
  conversionOptimization: string[];
  seoSuggestions: string[];
  marketplaceCheck: string;
}

export class ImageStudioService {

  /**
   * Generates or synthesizes a product/brand ad image based on provider selection & prompts.
   * Leverages real Gemini/OpenAI/BFL API calls.
   */
  public static async generateImage(params: {
    workspaceId: string;
    prompt: string;
    provider: string; // "flux" | "google_imagen" | "openai_images" | "stability_ai" | "gemini_images"
    aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
    category?: string; // e.g. "product_ad", "lifestyle", "luxury"
    mode?: "text_to_image" | "product_to_image" | "image_to_image" | "backdrop_generation" | "marketing_banner";
    productImageBase64?: string;
  }): Promise<{ imageUrl: string; modelUsed: string; latencyMs: number; status: string }> {
    const start = Date.now();
    const { workspaceId, prompt, provider, aspectRatio = "1:1", category, mode = "text_to_image", productImageBase64 } = params;

    const db = await DatabaseManager.getInstance();

    if (process.env.TEST_MODE === "true") {
      let hasKey = false;
      if (provider === "flux") {
        hasKey = !!(await db.getAIProviderApiKey(workspaceId, "flux") || process.env.FLUX_API_KEY);
      } else if (provider === "google_imagen" || provider === "gemini_images") {
        hasKey = !!(await db.getAIProviderApiKey(workspaceId, "gemini_images") || process.env.GEMINI_API_KEY);
      } else if (provider === "openai_images") {
        hasKey = !!(await db.getAIProviderApiKey(workspaceId, "openai_images") || process.env.OPENAI_API_KEY);
      } else if (provider === "stability_ai") {
        hasKey = !!(await db.getAIProviderApiKey(workspaceId, "stability_ai") || process.env.STABILITY_API_KEY);
      }

      if (!hasKey) {
        logger.warn(`[ImageStudioService] Running in TEST_MODE and API key for ${provider} is not configured. Returning premium mock image.`);
        return this.getMockImageResponse(provider, prompt, start);
      }
    }
    
    // Construct mode-enhanced prompt for professional production quality
    let enhancedPrompt = prompt;
    if (mode === "backdrop_generation") {
      enhancedPrompt = `A premium professional commercial background studio scene: ${prompt}. Photorealistic, studio lighting, hyper-detailed, clean bokeh, 4k resolution, optimized for e-commerce product placement.`;
    } else if (mode === "product_to_image") {
      enhancedPrompt = `High-end advertising context placing a product inside a ${prompt}, realistic cast shadows, exquisite depth of field, award-winning composition, commercial photorealistic product shot.`;
    } else if (mode === "marketing_banner") {
      enhancedPrompt = `A stunning commercial banner background styled like a ${prompt}, modern minimalist layout space, beautiful lighting, rich color palette.`;
    } else if (mode === "image_to_image") {
      enhancedPrompt = `A stylized cinematic creative re-imagining of the scene into: ${prompt}. Artistic commercial grade rendering, extreme depth of field, 8k resolution.`;
    } else {
      enhancedPrompt = `${prompt}. Clean commercial studio photography, extremely detailed, professional lighting, photorealistic, 4k.`;
    }

    try {
      if (provider === "flux") {
        const apiKey = await db.getAIProviderApiKey(workspaceId, "flux") || process.env.FLUX_API_KEY;
        if (!apiKey) {
          throw new Error("Missing FLUX_API_KEY. Please configure your Black Forest Labs (Flux) API key in the AI Providers settings.");
        }

        logger.info(`[ImageStudioService] Calling Black Forest Labs (BFL) Flux API...`);
        const endpoint = "https://api.bfl.ai/v1/flux-dev";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Key": apiKey
          },
          body: JSON.stringify({
            prompt: enhancedPrompt,
            width: 1024,
            height: 1024
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Flux API Generation Error (HTTP ${response.status}): ${errText || response.statusText}`);
        }

        const taskData = (await response.json()) as { id?: string };
        const taskId = taskData.id;
        if (!taskId) {
          throw new Error(`Flux API did not return a valid task ID. Response: ${JSON.stringify(taskData)}`);
        }

        // Poll for task completion
        let imageUrl = "";
        const timeoutMs = 45000; // 45 seconds timeout
        const pollStart = Date.now();

        while (Date.now() - pollStart < timeoutMs) {
          const endpoint = `https://api.bfl.ai/v1/get_result?id=${taskId}`;

          const response = await fetch(endpoint, {
            headers: { "X-Key": apiKey }
          });
          logger.debug({ status: response.status }, "Flux status:");

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Flux API status check failed: ${response.statusText} - ${errText}`);
          }

          const checkData = (await response.json()) as {
            status: string;
            result?: { sample?: string };
          };

          if (checkData.status === "Ready") {
            imageUrl = checkData.result?.sample || "";
            break;
          } else if (checkData.status === "Failed") {
            throw new Error(`Flux server-side image generation failed.`);
          }

          // Wait 1.5 seconds before next poll
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        if (!imageUrl) {
          throw new Error("Flux image generation timed out.");
        }

        logger.debug({ imageUrl }, "Final imageUrl returned:");

        return {
          imageUrl,
          modelUsed: "flux-dev",
          latencyMs: Date.now() - start,
          status: "success"
        };
      }

      if (provider === "google_imagen" || provider === "gemini_images") {
        const apiKey = await db.getAIProviderApiKey(workspaceId, "gemini_images") || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("Missing GEMINI_API_KEY. Please configure your Gemini API key in the AI Providers settings.");
        }

        logger.info(`[ImageStudioService] Calling Google GenAI (gemini-3.1-flash-image)...`);
        const ai = new GoogleGenAI({ apiKey });
        
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-image",
          contents: {
            parts: [{ text: enhancedPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio === "1:1" ? "1:1" : aspectRatio === "3:4" ? "3:4" : aspectRatio === "4:3" ? "4:3" : aspectRatio === "16:9" ? "16:9" : "1:1",
              imageSize: "1K"
            }
          }
        });

        let base64 = "";
        if (response?.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              base64 = part.inlineData.data;
              break;
            }
          }
        }

        if (base64) {
          const imageUrl = `data:image/jpeg;base64,${base64}`;
          return {
            imageUrl,
            modelUsed: "gemini-3.1-flash-image",
            latencyMs: Date.now() - start,
            status: "success"
          };
        } else {
          throw new Error(`Google Image Generation API did not return image bytes. Response: ${JSON.stringify(response)}`);
        }
      }

      if (provider === "openai_images") {
        const apiKey = await db.getAIProviderApiKey(workspaceId, "openai_images") || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("Missing OPENAI_API_KEY. Please configure your OpenAI API key in the AI Providers settings.");
        }

        logger.info(`[ImageStudioService] Calling OpenAI DALL-E 3 Image Generation...`);
        const openai = new OpenAI({ apiKey });
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
          response_format: "url"
        });

        if (response.data?.[0]?.url) {
          return {
            imageUrl: response.data[0].url,
            modelUsed: "openai-dall-e-3",
            latencyMs: Date.now() - start,
            status: "success"
          };
        } else {
          throw new Error(`OpenAI DALL-E 3 API did not return an image URL. Response: ${JSON.stringify(response)}`);
        }
      }

      if (provider === "stability_ai") {
        const apiKey = await db.getAIProviderApiKey(workspaceId, "stability_ai") || process.env.STABILITY_API_KEY;
        if (!apiKey) {
          throw new Error("Missing STABILITY_API_KEY. Please configure your Stability AI API key in the AI Providers settings.");
        }

        logger.info(`[ImageStudioService] Calling Stability AI SDXL Image Generation...`);
        const stabilityResponse = await fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            text_prompts: [
              {
                text: enhancedPrompt,
                weight: 1
              }
            ],
            cfg_scale: 7,
            height: 1024,
            width: 1024,
            samples: 1,
            steps: 30
          })
        });

        if (!stabilityResponse.ok) {
          const errText = await stabilityResponse.text();
          throw new Error(`Stability AI API error (HTTP ${stabilityResponse.status}): ${errText}`);
        }

        const resJson = (await stabilityResponse.json()) as {
          artifacts?: Array<{ base64: string }>;
        };

        if (resJson.artifacts?.[0]?.base64) {
          const base64 = resJson.artifacts[0].base64;
          return {
            imageUrl: `data:image/png;base64,${base64}`,
            modelUsed: "stable-diffusion-xl-1024-v1-0",
            latencyMs: Date.now() - start,
            status: "success"
          };
        } else {
          throw new Error(`Stability AI API did not return image artifacts. Response: ${JSON.stringify(resJson)}`);
        }
      }

      throw new Error(`Unsupported image provider requested: ${provider}`);
    } catch (err: any) {
      if (process.env.TEST_MODE === "true") {
        logger.warn({ err: err.message || err }, "[ImageStudioService] Image generation failed with error, falling back to mock image in TEST_MODE");
        return this.getMockImageResponse(provider, prompt, start);
      }
      throw err;
    }
  }

  /**
   * Evaluates image files using Gemini Vision model for detailed CRO, Visual SEO, and branding audits.
   */
  public static async analyzeImage(params: {
    workspaceId: string;
    imageBase64: string; // Base64 data string (raw or with data:image/png;base64 prefix)
    productTitle?: string;
  }): Promise<ImageAnalysisReport> {
    const { workspaceId, imageBase64, productTitle } = params;
    const db = await DatabaseManager.getInstance();

    if (process.env.TEST_MODE === "true") {
      const apiKey = await db.getAIProviderApiKey(workspaceId, "gemini") || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.warn("[ImageStudioService] Running in TEST_MODE and GEMINI_API_KEY is not configured. Returning mock audit.");
        return this.getMockImageAnalysisReport(productTitle);
      }
    }

    // Clean base64 string
    let cleanBase64 = imageBase64;
    let mimeType = "image/png";
    if (imageBase64.includes("base64,")) {
      const parts = imageBase64.split("base64,");
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }

    // INTEGRITY FIX (Phase 2): image analysis previously fell back to a fabricated report
    // with a `Math.random()`-generated quality score and canned text whenever Gemini Vision
    // failed or was not configured, indistinguishable in the UI from a real audit. It now
    // requires a real Gemini API key and surfaces real failures instead of inventing data.
    const apiKey = await db.getAIProviderApiKey(workspaceId, "gemini") || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY. Please configure your Gemini API key in the AI Providers settings to run image analysis.");
    }

    try {
      logger.info(`[ImageStudioService] Running real Gemini Vision Audit on image...`);
      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = `You are an elite e-commerce conversion rate optimization (CRO) image auditor and visual SEO expert.
Analyze the provided image and generate a highly detailed performance and marketplace audit.
You MUST respond with a valid JSON object matching this exact TypeScript structure:
{
  "qualityScore": number (integer between 0 and 100),
  "marketplaceReadiness": "Excellent" | "Good" | "Needs Improvement",
  "brandingReview": "A detailed 2-3 sentence review of brand alignment, colors, logo placement, and design consistency.",
  "conversionOptimization": string[] (3 to 5 highly specific tips to improve clicks, trust, and purchase intent),
  "seoSuggestions": string[] (3 to 5 suggestions covering visual SEO, Google Lens optimization, file names, and alt tags),
  "marketplaceCheck": "A complete evaluation of compliance for Shopify, Amazon, and eBay regarding lighting, margins, and backdrops."
}`;

      const imagePart = {
        inlineData: {
          mimeType,
          data: cleanBase64
        }
      };

      const textPart = {
        text: `Evaluate this product image${productTitle ? ` (Product: "${productTitle}")` : ""}. Provide your review in strict JSON format.`
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.15
        }
      });

      const textResult = response.text || "";
      logger.debug({ rawOutput: textResult }, `[ImageStudioService] Gemini Vision Audit Raw Output:`);
      const parsed = JSON.parse(textResult.trim()) as ImageAnalysisReport;

      return parsed;
    } catch (err: any) {
      if (process.env.TEST_MODE === "true") {
        logger.warn({ err: err.message || err }, "[ImageStudioService] Gemini Vision image analysis failed, falling back to mock report in TEST_MODE");
        return this.getMockImageAnalysisReport(productTitle);
      }
      // INTEGRITY FIX (Phase 2): previously this swallowed the error and returned a
      // fabricated report. Real failures must now be visible to the caller.
      logger.error({ err: err.message || err }, "[ImageStudioService] Gemini Vision image analysis failed");
      throw new Error(`Image analysis failed: ${err.message || "Gemini Vision request did not succeed."}`);
    }
  }

  private static getMockImageResponse(provider: string, prompt: string, start: number) {
    let photoId = "photo-1523381210434-271e8be1f52b"; // default commercial product mockup
    const keywords = (prompt || "").toLowerCase();
    if (keywords.includes("shoe") || keywords.includes("sneaker")) {
      photoId = "photo-1542291026-7eec264c27ff";
    } else if (keywords.includes("watch") || keywords.includes("clock")) {
      photoId = "photo-1523275335684-37898b6baf30";
    } else if (keywords.includes("cosmetic") || keywords.includes("perfume") || keywords.includes("lotion") || keywords.includes("skincare")) {
      photoId = "photo-1526947425960-945c6e72858f";
    } else if (keywords.includes("bottle") || keywords.includes("drink") || keywords.includes("beverage")) {
      photoId = "photo-1600271886742-f049cd451bba";
    } else if (keywords.includes("chair") || keywords.includes("furniture") || keywords.includes("table") || keywords.includes("couch")) {
      photoId = "photo-1505691938895-1758d7feb511";
    } else if (keywords.includes("phone") || keywords.includes("laptop") || keywords.includes("computer") || keywords.includes("tech")) {
      photoId = "photo-1496181130204-755241524eab";
    }
    const imageUrl = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&q=80&w=1024`;
    return {
      imageUrl,
      modelUsed: `${provider}-mock-dev`,
      latencyMs: Date.now() - start,
      status: "success"
    };
  }

  private static getMockImageAnalysisReport(productTitle?: string): ImageAnalysisReport {
    return {
      qualityScore: 88,
      marketplaceReadiness: "Excellent",
      brandingReview: `The branding and layout for ${productTitle || "this product"} are exceptionally clean, displaying accurate color harmony and strong contrast consistent with elite professional studio photography. Logo positioning is balanced and prominent.`,
      conversionOptimization: [
        "Include a badge for 'Free Shipping' or dynamic discount to improve click-through-rates.",
        "Highlight the primary product features using clear, minimal visual pointer lines.",
        "Add a subtle lifestyle overlay or customer testimonial to build trust and increase conversion by up to 25%."
      ],
      seoSuggestions: [
        `Rename the image file to '${(productTitle || "product").toLowerCase().replace(/\s+/g, "-")}-luxury-mockup.png' to optimize Google Image SEO.`,
        "Define alternative (alt) text with descriptive long-tail search keywords.",
        "Compress the file using WebP format to achieve faster load times without loss in premium visual clarity."
      ],
      marketplaceCheck: "Meets or exceeds all main image compliance requirements for Shopify, Amazon, and eBay. Light levels are balanced at a perfect 1:1 ratio, with transparent/white backgrounds and clear margins."
    };
  }
}
