import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Test prompt",
      config: {
        responseMimeType: 'application/json',
      }
    });
    console.log("Success:", response.text);
  } catch (err: any) {
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
  }
}
run();
