
export enum WorkflowStatus {
  IDLE = 'idle',
  RESEARCHING = 'researching', // Gemini 3.0 Pro (Thinking)
  AWAITING_IMAGES = 'awaiting_images',
  GENERATING_IMAGE = 'generating_image', // Gemini 3.0 Pro Image
  UPLOADING = 'uploading', // Simulating Drive Upload
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface ResearchResult {
  productName: string;      // Original input
  marketingName: string;    // Cleaned name (No codes)
  features: string;
  benefits: string;
  functions: string;
  designConcept: string;
}

export interface UploadedImage {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  step: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'system';
}
