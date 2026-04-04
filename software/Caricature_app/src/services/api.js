import { GoogleGenerativeAI } from "@google/generative-ai";

// Use the existing environment variable name, but treat it as Gemini API Key
const API_KEY = import.meta.env.VITE_BANANA_API_KEY;

let genAI = null;
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
}

export const generateCaricature = async (imageBlob, options = {}) => {
    if (!API_KEY) {
        throw new Error("API Key not configured. Please check your .env file.");
    }
    try {
        // 1. Convert Blob to generative-ai compatible format (Part)
        const imageBase64 = await blobToBase64(imageBlob);
        // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        const base64Data = imageBase64.split(',')[1];

        // const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        // const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });



        const prompt = `Generate a black and white line art caricature drawing using this image. explicitly don't include shading, filling and complex shapes, only lines. 
        finally convert the image to a VALID SVG XML code.Do NOT wrap the output in markdown code blocks`; // make it funny and whimsical.
        // finally convert the image as a high-resolution PNG file. Do NOT wrap the output in markdown code blocks`;


        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: imageBlob.type || "image/jpeg",
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present
        text = text.replace(/```svg/g, '').replace(/```xml/g, '').replace(/```/g, '').trim();

        console.log("Gemini API Response (First 200 chars):", text.substring(0, 200));

        // Return as a data URL so it can be used as an image source
        // Detect content type
        if (text.trim().toLowerCase().startsWith('<svg')) {
            // It's an SVG
            const svgDataUrl = `data:image/svg+xml;base64,${btoa(text)}`;
            return { output: svgDataUrl, type: 'svg' };
        } else if (text.trim().startsWith('http')) {
            // It's a URL
            return { output: text.trim(), type: 'url' };
        } else if (text.length > 100 && !text.includes(' ') && !text.includes('\n')) {
            // Assume it might be base64 image data (no spaces, long string)
            return { output: `data:image/png;base64,${text}`, type: 'image' };
        } else {
            // Fallback: It's likely just text describing the image or a refusal.
            console.warn("API returned text, not image data:", text.substring(0, 100));

            // If the user is asking for PNG, the model likely returned text saying "I can't".
            // We should throw an error so the UI handles it (alerts the user).
            throw new Error("The AI returned text instead of an image. (Note: Gemini Flash models cannot generate PNG files directly). Response: " + text.substring(0, 50) + "...");
        }

    } catch (error) {
        console.error("Error generating caricature with Gemini:", error);
        throw error;
    }
};

const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
