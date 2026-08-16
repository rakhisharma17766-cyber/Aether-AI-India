import { ModelOption } from '../types';

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    badge: 'Flagship Speed',
    description: 'Next-gen state of the art model for all general tasks, multimodal understanding, and swift reasoning.',
    category: 'general',
    supportsVision: true,
    supportsSearch: true,
    supportsThinking: true,
    contextWindow: '1M tokens'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Deep Think)',
    badge: 'High Reasoning',
    description: 'Premier flagship model for complex reasoning, math, deep code architecture, and high thinking mode.',
    category: 'reasoning',
    supportsVision: true,
    supportsSearch: true,
    supportsThinking: true,
    contextWindow: '2M tokens',
    isPaid: true
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash (Search Grounding)',
    badge: 'Live Web Grounded',
    description: 'Optimized for high accuracy real-time web search grounding and structured knowledge retrieval.',
    category: 'general',
    supportsVision: true,
    supportsSearch: true,
    supportsThinking: true,
    contextWindow: '1M tokens'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Ultra Low-Latency',
    description: 'Sub-second real-time responsiveness designed for rapid Q&A and instant command execution.',
    category: 'fast',
    supportsVision: true,
    supportsSearch: false,
    contextWindow: '1M tokens'
  },
  {
    id: 'gemini-3.1-flash-image',
    name: 'Gemini 3.1 Flash Image',
    badge: 'Neural Canvas (4K)',
    description: 'Photorealistic image generation & editing supporting 512px, 1K, 2K, and 4K resolutions.',
    category: 'image',
    supportsImageGen: true,
    supportsVision: true,
    isPaid: true
  },
  {
    id: 'gemini-3-pro-image',
    name: 'Gemini 3 Pro Image',
    badge: 'Ultra-Res Studio',
    description: 'Studio grade ultra-high fidelity visual synthesis with fine detail rendering (1K, 2K, 4K).',
    category: 'image',
    supportsImageGen: true,
    supportsVision: true,
    isPaid: true
  },
  {
    id: 'imagen-3.0-generate-002',
    name: 'Imagen 3.0',
    badge: 'Direct REST Diffusion',
    description: 'Dedicated high-fidelity diffusion engine for creative, artistic, and photorealistic generations.',
    category: 'image',
    supportsImageGen: true
  },
  {
    id: 'lyria-3-clip-preview',
    name: 'Lyria 3 Music Clip',
    badge: 'Audio Synth (30s)',
    description: 'Generate high quality cinematic soundtracks and musical loops up to 30 seconds.',
    category: 'music',
    supportsMusic: true,
    isPaid: true
  }
];

export const DEFAULT_MODEL = 'gemini-3.7-flash';
