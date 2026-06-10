import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import { env } from '../../constant';
import logger from '../../logger';
import * as fs from 'fs';
import * as path from 'path';

// TypeScript Interfaces
interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

interface ChatOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4';
  style?: 'photographic' | 'digital_art' | 'comic_book' | 'neon_punk' | 'isometric' | 'line_art' | 'origami' | 'low_poly' | 'minimalist' | 'watercolor' | 'cyberpunk' | 'dark_moody' | 'warm_tone' | 'hdr' | 'long_exposure';
}

interface FileSummaryOptions {
  maxLength?: number;
  language?: 'th' | 'en';
  focusAreas?: string[];
}

interface KnowledgeBaseOptions {
  chunkSize?: number;
  overlap?: number;
  maxChunks?: number;
}

interface GeminiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// Initialize Gemini AI
class GeminiAI {
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;

  constructor() {
    if (!env.gemini.apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    this.genAI = new GoogleGenerativeAI(env.gemini.apiKey);
    this.textModel = this.genAI.getGenerativeModel({ model: env.gemini.model });
    this.visionModel = this.genAI.getGenerativeModel({ model: env.gemini.visionModel });
  }

  /**
   * Chat with Gemini AI
   * ข้อจำกัด: 
   * - Input: สูงสุด 1 ล้านโทเค็น (ประมาณ 750,000 คำ)
   * - Output: สูงสุด 8,192 โทเค็น (ประมาณ 6,000 คำ)
   * - Context window: 1 ล้านโทเค็น
   */
  async chat(
    message: string, 
    history: ChatMessage[] = [], 
    options: ChatOptions = {}
  ): Promise<GeminiResponse<string>> {
    try {
      const chatOptions = {
        temperature: options.temperature || env.gemini.temperature,
        maxOutputTokens: options.maxOutputTokens || env.gemini.maxTokens,
        topP: options.topP || 0.8,
        topK: options.topK || 40,
      };

      const chat = this.textModel.startChat({
        history: history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.parts }],
        })),
        generationConfig: chatOptions,
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      logger.info('Gemini chat completed successfully', {
        messageLength: message.length,
        responseLength: text.length,
        historyCount: history.length
      });

      return {
        success: true,
        data: text,
        usage: {
          promptTokens: result.response.usageMetadata?.promptTokenCount,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount,
          totalTokens: result.response.usageMetadata?.totalTokenCount,
        }
      };
    } catch (error) {
      logger.error('Error in Gemini chat', { error, message: message.substring(0, 100) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate image description or analyze image
   * ข้อจำกัด:
   * - รองรับไฟล์: JPEG, PNG, WebP, HEIC, HEIF
   * - ขนาดไฟล์: สูงสุด 20MB
   * - ความละเอียด: สูงสุด 3072x3072 pixels
   * - จำนวนรูป: สูงสุด 16 รูปต่อ request
   */
  async analyzeImage(
    imagePath: string, 
    prompt: string = "อธิบายรูปภาพนี้"
  ): Promise<GeminiResponse<string>> {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
      }

      const imageData = fs.readFileSync(imagePath);
      const mimeType = this.getMimeType(imagePath);
      
      if (!mimeType) {
        throw new Error('Unsupported image format');
      }

      const imagePart: Part = {
        inlineData: {
          data: imageData.toString('base64'),
          mimeType: mimeType,
        },
      };

      const result = await this.visionModel.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      logger.info('Gemini image analysis completed', {
        imagePath,
        promptLength: prompt.length,
        responseLength: text.length
      });

      return {
        success: true,
        data: text,
        usage: {
          promptTokens: result.response.usageMetadata?.promptTokenCount,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount,
          totalTokens: result.response.usageMetadata?.totalTokenCount,
        }
      };
    } catch (error) {
      logger.error('Error in Gemini image analysis', { error, imagePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate image using Imagen (via Gemini)
   * หมายเหตุ: Gemini ไม่สามารถสร้างรูปได้โดยตรง แต่สามารถสร้าง prompt สำหรับ AI อื่นได้
   * ข้อจำกัด:
   * - Input prompt: สูงสุด 1,000 ตัวอักษร
   * - Output: คำอธิบายรายละเอียดสำหรับ image generation
   */
  async generateImagePrompt(
    description: string,
    options: ImageGenerationOptions = {}
  ): Promise<GeminiResponse<string>> {
    try {
      const aspectRatio = options.aspectRatio || '1:1';
      const style = options.style || 'photographic';
      
      const enhancedPrompt = `
        สร้าง prompt ที่ละเอียดสำหรับการสร้างรูปภาพ AI โดยใช้คำอธิบายต่อไปนี้: "${description}"
        
        กำหนดการ:
        - อัตราส่วน: ${aspectRatio}
        - สไตล์: ${style}
        - ให้ prompt ที่ละเอียด เฉพาะเจาะจง และสามารถใช้กับ AI image generator ได้
        - ใช้ภาษาอังกฤษ
        - ความยาวไม่เกิน 500 คำ
        
        ตอบเฉพาะ prompt เท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม
      `;

      const result = await this.textModel.generateContent(enhancedPrompt);
      const response = await result.response;
      const text = response.text();

      logger.info('Gemini image prompt generation completed', {
        originalDescription: description,
        generatedPromptLength: text.length
      });

      return {
        success: true,
        data: text,
        usage: {
          promptTokens: result.response.usageMetadata?.promptTokenCount,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount,
          totalTokens: result.response.usageMetadata?.totalTokenCount,
        }
      };
    } catch (error) {
      logger.error('Error in Gemini image prompt generation', { error, description });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Summarize file content
   * ข้อจำกัด:
   * - ไฟล์ text: สูงสุด 1 ล้านตัวอักษร
   * - รองรับ: .txt, .md, .json, .csv, .xml, .html
   * - PDF: ต้องแปลงเป็น text ก่อน
   * - Output: สูงสุด 8,192 โทเค็น
   */
  async summarizeFile(
    filePath: string,
    options: FileSummaryOptions = {}
  ): Promise<GeminiResponse<string>> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const maxLength = options.maxLength || 500;
      const language = options.language || 'th';
      const focusAreas = options.focusAreas || [];

      let prompt = `
        สรุปเนื้อหาจากไฟล์ต่อไปนี้:
        
        ชื่อไฟล์: ${path.basename(filePath)}
        เนื้อหา:
        ${fileContent}
        
        กำหนดการสรุป:
        - ภาษา: ${language === 'th' ? 'ภาษาไทย' : 'English'}
        - ความยาว: ไม่เกิน ${maxLength} คำ
        - รูปแบบ: จุดสำคัญเป็นข้อๆ
      `;

      if (focusAreas.length > 0) {
        prompt += `\n- เน้นหัวข้อ: ${focusAreas.join(', ')}`;
      }

      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logger.info('Gemini file summarization completed', {
        filePath,
        fileSize: fileContent.length,
        summaryLength: text.length
      });

      return {
        success: true,
        data: text,
        usage: {
          promptTokens: result.response.usageMetadata?.promptTokenCount,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount,
          totalTokens: result.response.usageMetadata?.totalTokenCount,
        }
      };
    } catch (error) {
      logger.error('Error in Gemini file summarization', { error, filePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create knowledge base from multiple files
   * ข้อจำกัด:
   * - จำนวนไฟล์: สูงสุด 100 ไฟล์
   * - ขนาดรวม: สูงสุด 10MB
   * - แต่ละ chunk: สูงสุด 30,000 ตัวอักษร
   * - จำนวน chunks: สูงสุด 1,000 chunks
   */
  async createKnowledgeBase(
    filePaths: string[],
    query: string,
    options: KnowledgeBaseOptions = {}
  ): Promise<GeminiResponse<string>> {
    try {
      const chunkSize = options.chunkSize || 5000;
      const overlap = options.overlap || 500;
      const maxChunks = options.maxChunks || 50;

      let allContent = '';
      const fileContents: { path: string; content: string }[] = [];

      // อ่านไฟล์ทั้งหมด
      for (const filePath of filePaths) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          fileContents.push({ path: filePath, content });
          allContent += `\n\n=== ${path.basename(filePath)} ===\n${content}`;
        }
      }

      // แบ่ง content เป็น chunks
      const chunks = this.createTextChunks(allContent, chunkSize, overlap);
      const limitedChunks = chunks.slice(0, maxChunks);

      const prompt = `
        ใช้ข้อมูลจาก knowledge base ต่อไปนี้เพื่อตอบคำถาม:
        
        คำถาม: ${query}
        
        Knowledge Base:
        ${limitedChunks.join('\n\n---\n\n')}
        
        กำหนดการตอบ:
        - ตอบโดยอ้างอิงข้อมูลจาก knowledge base เท่านั้น
        - ระบุแหล่งที่มาของข้อมูล
        - หากไม่มีข้อมูลที่เกี่ยวข้อง ให้บอกว่าไม่พบข้อมูล
        - ตอบเป็นภาษาไทย
      `;

      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logger.info('Gemini knowledge base query completed', {
        filesCount: filePaths.length,
        chunksCount: limitedChunks.length,
        queryLength: query.length,
        responseLength: text.length
      });

      return {
        success: true,
        data: text,
        usage: {
          promptTokens: result.response.usageMetadata?.promptTokenCount,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount,
          totalTokens: result.response.usageMetadata?.totalTokenCount,
        }
      };
    } catch (error) {
      logger.error('Error in Gemini knowledge base query', { error, query });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Batch process multiple texts
   * ข้อจำกัด:
   * - จำนวน requests: สูงสุด 100 requests ต่อนาที
   * - แต่ละ text: สูงสุด 30,000 ตัวอักษร
   * - รวมทั้งหมด: สูงสุด 1 ล้านตัวอักษร
   */
  async batchProcess(
    texts: string[],
    instruction: string,
    batchSize: number = 5
  ): Promise<GeminiResponse<string[]>> {
    try {
      const results: string[] = [];
      
      // แบ่งเป็น batches เพื่อไม่ให้เกิน rate limit
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(async (text, index) => {
          const prompt = `${instruction}\n\nข้อความที่ ${i + index + 1}:\n${text}`;
          const result = await this.textModel.generateContent(prompt);
          const response = await result.response;
          return response.text();
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // หน่วงเวลาเพื่อไม่ให้เกิน rate limit
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info('Gemini batch processing completed', {
        totalTexts: texts.length,
        batchSize,
        resultsCount: results.length
      });

      return {
        success: true,
        data: results
      };
    } catch (error) {
      logger.error('Error in Gemini batch processing', { error, textsCount: texts.length });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Helper methods
  private getMimeType(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
    };
    return mimeTypes[ext] || null;
  }

  private createTextChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      
      if (end === text.length) break;
      start = end - overlap;
    }

    return chunks;
  }
}

// Export singleton instance
const geminiAI = new GeminiAI();

export const GEMINI = {
  // Chat functions
  chat: geminiAI.chat.bind(geminiAI),
  
  // Image functions
  analyzeImage: geminiAI.analyzeImage.bind(geminiAI),
  generateImagePrompt: geminiAI.generateImagePrompt.bind(geminiAI),
  
  // File processing
  summarizeFile: geminiAI.summarizeFile.bind(geminiAI),
  createKnowledgeBase: geminiAI.createKnowledgeBase.bind(geminiAI),
  
  // Batch processing
  batchProcess: geminiAI.batchProcess.bind(geminiAI),
};

export type {
  ChatMessage,
  ChatOptions,
  ImageGenerationOptions,
  FileSummaryOptions,
  KnowledgeBaseOptions,
  GeminiResponse,
};