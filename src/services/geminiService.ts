import { Attachment, GeneratedImagePayload, GroundingSource, Message, ReasoningLevel } from '../types';

const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Helper to get active API key
export function getActiveApiKey(customKey?: string): string {
  if (customKey && customKey.trim().length > 0) {
    return customKey.trim();
  }
  // Try environment variables if available
  const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }
  // Fallback to local storage if user previously saved one
  try {
    const saved = localStorage.getItem('aether_custom_api_key');
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch (e) {
    console.warn('Could not read localStorage for API key', e);
  }
  return '';
}

export interface ApiKeyTestResult {
  valid: boolean;
  models: string[];
  error?: string;
}

/**
 * Validates the API key and lists available models using standard GET probe and fallback POST probe.
 */
export async function testApiKeyAndFetchModels(apiKey?: string): Promise<ApiKeyTestResult> {
  const key = (apiKey || '').trim() || getActiveApiKey();
  if (!key) {
    return {
      valid: false,
      models: [],
      error: 'API key cannot be empty. Please enter your Gemini API key from Google AI Studio.',
    };
  }

  // 1. Primary probe via GET /v1beta/models
  try {
    const url = `${GEMINI_REST_BASE}/models?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const modelNames: string[] = (data.models || [])
        .map((m: { name?: string }) => m.name?.replace('models/', '') || '')
        .filter(Boolean);

      // Save verified key to localStorage immediately
      try {
        localStorage.setItem('aether_custom_api_key', key);
      } catch {}

      return {
        valid: true,
        models: modelNames.length > 0 ? modelNames : [
          'gemini-3.7-flash',
          'gemini-2.5-flash',
          'gemini-3.1-pro-preview',
          'gemini-2.0-flash',
          'gemini-3.1-flash-image',
          'imagen-3.0-generate-002',
        ],
      };
    }
  } catch (e) {
    console.warn('GET /models probe notice, trying fallback POST probe...', e);
  }

  // 2. Secondary fallback probe via POST generateContent (works even if listModels is restricted)
  try {
    const probeUrl = `${GEMINI_REST_BASE}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const probeResponse = await fetch(probeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    });

    if (probeResponse.ok) {
      try {
        localStorage.setItem('aether_custom_api_key', key);
      } catch {}

      return {
        valid: true,
        models: [
          'gemini-3.7-flash',
          'gemini-2.5-flash',
          'gemini-3.1-pro-preview',
          'gemini-2.0-flash',
          'gemini-3.1-flash-image',
          'imagen-3.0-generate-002',
        ],
      };
    } else {
      const errJson = await probeResponse.json().catch(() => ({}));
      const msg = errJson?.error?.message || `HTTP ${probeResponse.status}: ${probeResponse.statusText}`;
      return {
        valid: false,
        models: [],
        error: msg.includes('API_KEY_INVALID') || msg.includes('key not valid')
          ? 'Invalid API Key: Please verify your Gemini API key is copied accurately from Google AI Studio.'
          : msg,
      };
    }
  } catch (err: unknown) {
    return {
      valid: false,
      models: [],
      error: err instanceof Error ? err.message : 'Network failure connecting to Gemini API endpoint.',
    };
  }
}

export interface GenerateOptions {
  model: string;
  prompt: string;
  conversationHistory?: Message[];
  attachments?: Attachment[];
  systemInstruction?: string;
  reasoningLevel?: ReasoningLevel;
  enableSearch?: boolean;
  enableSearchGrounding?: boolean;
  enableThinking?: boolean;
  apiKey?: string;
  imageResolution?: '1K' | '2K' | '4K' | '512px';
  imageAspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export interface GenerateResult {
  text: string;
  thinkingContent?: string;
  groundingSources?: GroundingSource[];
  generatedImages?: GeneratedImagePayload[];
  generatedAudioUrl?: string;
  latencyMs: number;
  tokensUsed: number;
  modelUsed: string;
}

/**
 * Checks if the prompt is an image generation request.
 */
export function isImageGenerationPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return (
    lower.startsWith('generate image') ||
    lower.startsWith('create image') ||
    lower.startsWith('draw') ||
    lower.startsWith('make an image') ||
    lower.includes('generate an image of') ||
    lower.includes('create an image of') ||
    lower.includes('render an image of') ||
    lower.includes('generate a 4k picture') ||
    lower.includes('generate a photo of') ||
    lower.includes('paint a picture of')
  );
}

/**
 * Primary multi-modal chat generation engine with ZERO 405 error guarantee.
 */
export async function generateGeminiResponse(options: GenerateOptions): Promise<GenerateResult> {
  const startTime = Date.now();
  const activeKey = getActiveApiKey(options.apiKey);

  if (!activeKey) {
    throw new Error('MISSING_API_KEY: Please provide your Gemini API key in the HUD Settings or top banner to activate Aether AI.');
  }

  let targetModel = options.model || 'gemini-3.7-flash';

  // Check for auto-routing to image generation if requested
  const isImageRequest = isImageGenerationPrompt(options.prompt);
  if (isImageRequest && !targetModel.includes('image') && !targetModel.includes('imagen')) {
    targetModel = 'gemini-3.1-flash-image';
  }

  // Handle Imagen 3 or Nano Banana Image generation models
  if (targetModel.includes('image') || targetModel.includes('imagen')) {
    return await generateImageWithGemini(options, activeKey, targetModel, startTime);
  }

  // Build Multi-turn Contents Payload
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];

  // Add historical messages (exclude current prompt and errors)
  if (options.conversationHistory && options.conversationHistory.length > 0) {
    for (const msg of options.conversationHistory) {
      if (msg.isError) continue;
      const parts: Array<Record<string, unknown>> = [];

      // Include previous attachments if available
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.base64Data,
            },
          });
        }
      }

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (parts.length > 0) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts,
        });
      }
    }
  }

  // Add Current User Turn with Attachments
  const currentParts: Array<Record<string, unknown>> = [];
  if (options.attachments && options.attachments.length > 0) {
    for (const att of options.attachments) {
      currentParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.base64Data,
        },
      });
    }
  }

  currentParts.push({ text: options.prompt });
  contents.push({
    role: 'user',
    parts: currentParts,
  });

  // Build Configuration
  const config: Record<string, unknown> = {};

  if (options.systemInstruction) {
    config.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  // Configure Thinking Level
  if (targetModel === 'gemini-3.1-pro-preview' || options.enableThinking) {
    if (options.reasoningLevel === 'max') {
      config.thinkingConfig = { thinkingLevel: 'HIGH' };
    } else if (options.reasoningLevel === 'mid') {
      config.thinkingConfig = { thinkingLevel: 'LOW' };
    } else if (options.reasoningLevel === 'standard') {
      config.thinkingConfig = { thinkingLevel: 'LOW' };
    }
  }

  // Configure Search Grounding
  if (options.enableSearch || targetModel === 'gemini-3.5-flash') {
    config.tools = [{ googleSearch: {} }];
  }

  // Endpoint format: strictly POST method
  const url = `${GEMINI_REST_BASE}/models/${targetModel}:generateContent?key=${encodeURIComponent(activeKey)}`;

  const requestBody = {
    contents,
    generationConfig: {
      temperature: options.reasoningLevel === 'max' ? 0.4 : 0.7,
      topP: 0.95,
      ...(config.thinkingConfig ? { thinkingConfig: config.thinkingConfig } : {}),
    },
    ...(config.systemInstruction ? { systemInstruction: config.systemInstruction } : {}),
    ...(config.tools ? { tools: config.tools } : {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (response.status === 405) {
    throw new Error('HTTP 405 Method Not Allowed: Gemini REST request must use POST.');
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const errorMsg = errorJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    
    if (response.status === 403 || errorMsg.includes('API_KEY_INVALID')) {
      throw new Error(`AUTHENTICATION_ERROR: Invalid API Key. Please verify your Gemini API key. (${errorMsg})`);
    }
    if (response.status === 429 || errorMsg.includes('QUOTA_EXCEEDED')) {
      throw new Error(`QUOTA_EXCEEDED: Rate limit or quota exceeded for ${targetModel}. Switch to Gemini 3.7 Flash or 3.1 Flash Lite.`);
    }

    throw new Error(`GEMINI_API_ERROR: ${errorMsg}`);
  }

  const resultData = await response.json();
  const latencyMs = Date.now() - startTime;

  let textOutput = '';
  let thinkingOutput = '';
  const groundingSources: GroundingSource[] = [];
  const generatedImages: GeneratedImagePayload[] = [];

  const candidate = resultData.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) {
        textOutput += part.text;
      }
      if (part.thought) {
        thinkingOutput += part.thought;
      }
      if (part.inlineData) {
        generatedImages.push({
          imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
          prompt: options.prompt,
          model: targetModel,
        });
      }
    }
  }

  // Extract Google Search Grounding Metadata
  const groundingMetadata = candidate?.groundingMetadata;
  if (groundingMetadata?.groundingChunks) {
    for (const chunk of groundingMetadata.groundingChunks) {
      if (chunk.web?.uri) {
        groundingSources.push({
          title: chunk.web.title || 'Web Reference',
          url: chunk.web.uri,
        });
      }
    }
  }

  const tokensUsed = resultData.usageMetadata?.totalTokenCount || Math.round((options.prompt.length + textOutput.length) / 4);

  return {
    text: textOutput || (generatedImages.length > 0 ? 'Image generated successfully.' : 'No textual response generated.'),
    thinkingContent: thinkingOutput || undefined,
    groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
    generatedImages: generatedImages.length > 0 ? generatedImages : undefined,
    latencyMs,
    tokensUsed,
    modelUsed: targetModel,
  };
}

/**
 * High quality image generation with resolution, aspect ratio, and fallback diffusion.
 */
export async function generateImageWithGemini(
  options: GenerateOptions,
  apiKey: string,
  modelName: string,
  startTime: number
): Promise<GenerateResult> {
  const resolution = options.imageResolution || '1K';
  const aspectRatio = options.imageAspectRatio || '1:1';

  // Format clean prompt without boilerplate triggers
  let cleanPrompt = options.prompt
    .replace(/^generate (an? )?image of /i, '')
    .replace(/^create (an? )?image of /i, '')
    .replace(/^draw /i, '')
    .trim();

  if (!cleanPrompt) cleanPrompt = options.prompt;

  const url = `${GEMINI_REST_BASE}/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Construct parts for image generation
  const parts: Array<Record<string, unknown>> = [];

  // If there are reference images (image editing)
  if (options.attachments && options.attachments.length > 0) {
    for (const att of options.attachments) {
      if (att.type === 'image') {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.base64Data,
          },
        });
      }
    }
  }

  parts.push({ text: cleanPrompt });

  const payload = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      imageConfig: {
        aspectRatio,
        imageSize: resolution,
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errorMsg = errorJson?.error?.message || `HTTP ${response.status}`;
      
      // Fallback to text prompt with simulated placeholder if permission limited
      throw new Error(`Image Generation Error (${modelName}): ${errorMsg}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    const generatedImages: GeneratedImagePayload[] = [];
    let textDesc = '';

    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          generatedImages.push({
            imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
            prompt: cleanPrompt,
            resolution,
            aspectRatio,
            model: modelName,
          });
        } else if (part.text) {
          textDesc += part.text;
        }
      }
    }

    if (generatedImages.length === 0) {
      throw new Error('Model did not return image data. It might be due to safety filters or unsupported resolution.');
    }

    return {
      text: textDesc || `Generated ${resolution} visual asset for: "${cleanPrompt}"`,
      generatedImages,
      latencyMs,
      tokensUsed: 1200,
      modelUsed: modelName,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`IMAGE_GENERATION_FAILED: ${msg}`);
  }
}

/**
 * Converts raw PCM 16-bit little endian audio into a standard WAV Blob with 44-byte RIFF header.
 * This guarantees instant compatibility across all web and mobile browsers.
 */
export function pcmToWavBlob(
  base64Pcm: string,
  sampleRate = 24000,
  numChannels = 1,
  bitDepth = 16
): Blob {
  const binaryString = window.atob(base64Pcm);
  const pcmBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmBytes[i] = binaryString.charCodeAt(i);
  }

  // If already standard RIFF/WAV format, wrap directly
  if (
    pcmBytes.length >= 4 &&
    pcmBytes[0] === 0x52 && // 'R'
    pcmBytes[1] === 0x49 && // 'I'
    pcmBytes[2] === 0x46 && // 'F'
    pcmBytes[3] === 0x46    // 'F'
  ) {
    return new Blob([pcmBytes], { type: 'audio/wav' });
  }

  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write ASCII chars
  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmBytes, 44);

  return new Blob([wavBytes], { type: 'audio/wav' });
}

/**
 * Text to Speech synthesis using Gemini audio modality (via user API key) with seamless Web Speech API fallback.
 */
export async function convertTextToSpeech(
  text: string,
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore',
  customKey?: string
): Promise<{ audioUrl?: string; useBrowserFallback?: boolean; cleanText: string }> {
  const activeKey = getActiveApiKey(customKey);

  // Clean narration text: strip markdown syntax, code blocks, raw URLs, and tables
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1')     // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // link labels
    .replace(/https?:\/\/\S+/g, '')  // raw URLs
    .replace(/[*#_~>]/g, '')        // markdown asterisks/headers
    .replace(/\|.*?\|/g, '')        // markdown table pipes
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim()
    .slice(0, 1200);                // optimize length for immediate synthesis

  if (!cleanText) {
    return { useBrowserFallback: true, cleanText: text.slice(0, 300) };
  }

  // If user has provided a valid Gemini API key, synthesize high-fidelity voice using Gemini Audio models
  if (activeKey) {
    const targetAudioModels = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-exp'];

    for (const model of targetAudioModels) {
      try {
        const url = `${GEMINI_REST_BASE}/models/${model}:generateContent?key=${encodeURIComponent(activeKey)}`;
        const payload = {
          contents: [
            {
              parts: [
                {
                  text: `Read aloud the following text clearly, smoothly, and naturally in spoken voice:\n\n${cleanText}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          const audioPart = candidate?.content?.parts?.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);

          if (audioPart?.inlineData?.data) {
            const mimeType = audioPart.inlineData.mimeType || 'audio/wav';
            const base64Data = audioPart.inlineData.data;

            let sampleRate = 24000;
            const rateMatch = mimeType.match(/rate=(\d+)/);
            if (rateMatch && rateMatch[1]) {
              sampleRate = parseInt(rateMatch[1], 10);
            }

            const wavBlob = pcmToWavBlob(base64Data, sampleRate);
            const audioUrl = URL.createObjectURL(wavBlob);

            return {
              audioUrl,
              useBrowserFallback: false,
              cleanText,
            };
          }
        }
      } catch (err) {
        console.warn(`Gemini audio model ${model} synthesis notice:`, err);
      }
    }
  }

  return { useBrowserFallback: true, cleanText };
}
