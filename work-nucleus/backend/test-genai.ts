import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = ['gemini-3.8-flash', 'gemini-flash-latest'];
  for (const model of models) {
    console.log("Testing model:", model);
    try {
      const response = await ai.models.generateContent({
        model,
        contents: "Return a JSON array with one insight: [{\"title\": \"test\"}]",
        config: { responseMimeType: 'application/json' }
      });
      console.log(`Success with ${model}:`, response.text);
      break;
    } catch (e: any) {
      console.log(`Failed with ${model}:`, e.message);
    }
  }
}
run();
