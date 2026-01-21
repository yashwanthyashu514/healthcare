const OpenAI = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Gemini safely
let genAI = null;
let geminiTextModel = null;
let hasGemini = false;

if (process.env.GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiTextModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        hasGemini = true;
        console.log('✅ Gemini AI initialized');
    } catch (err) {
        console.warn('⚠️ Gemini AI initialization failed:', err.message);
    }
} else {
    console.log('ℹ️ Gemini API key not found - AI Avatar audio features will be disabled');
}

const chatHistory = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected to AI Avatar Chat:', socket.id);

        // Initialize history for this session
        if (!chatHistory.has(socket.id)) {
            chatHistory.set(socket.id, [
                {
                    role: "system",
                    content: `You are a friendly, calm, and empathetic virtual doctor assistant. 
                    
You must return your response in valid JSON format ONLY, with this structure:
{
  "speech": "A short, conversational response (1-2 sentences) appropriate for a 3D avatar to speak.",
  "suggestions": ["Actionable advice 1", "Actionable advice 2", "Safety tip"]
}

Rules:
- "speech": Do NOT list suggestions here. Just give a warm summary or advice intro.
- "suggestions": A list of short, clear bullet points.
- NO medical diagnosis.
- Always recommend consulting a real doctor.`
                }
            ]);
        }

        socket.on('user_message', async (data) => {
            const { message } = data;
            console.log(`Received: ${message} `);

            const history = chatHistory.get(socket.id);
            history.push({ role: "user", content: message });

            try {
                // --- STRATEGY: NON-STREAMING JSON RESPONSE ---
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: history,
                    response_format: { type: "json_object" }, // FORCE JSON
                    stream: false, // Wait for full valid JSON
                });

                const rawContent = completion.choices[0].message.content;
                console.log("AI Response:", rawContent);

                let parsedData = {};
                try {
                    parsedData = JSON.parse(rawContent);
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                    parsedData = {
                        speech: "I apologize, I'm having trouble processing that thought.",
                        suggestions: []
                    };
                }

                const speechText = parsedData.speech || "I am listening.";
                const suggestions = parsedData.suggestions || [];

                // 1. Emit Speech Text (for Chat Bubble + TTS)
                socket.emit('chat_response', { text: speechText });

                // 2. Emit Suggestions (for UI List)
                if (suggestions.length > 0) {
                    socket.emit('suggestions', { items: suggestions });
                }

                // 3. Generate Audio for Speech Part ONLY
                if (speechText.trim()) {
                    await streamGeminiAudio(socket, speechText);
                }

                socket.emit('stream_done');

                // Save to history
                history.push({ role: "assistant", content: rawContent });
                if (history.length > 20) {
                    const newHistory = [history[0], ...history.slice(-19)];
                    chatHistory.set(socket.id, newHistory);
                }

            } catch (error) {
                console.error("OpenAI Error:", error.message);

                // Fallback logic could go here, but for now we focus on stability
                // If OpenAI fails, we just send a generic error
                socket.emit('error', { message: "I'm currently unavailable. Please check your connection." });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            chatHistory.delete(socket.id);
        });
    });
};

/**
 * Generates Audio using Gemini TTS and emits 'audio_chunk'
 */
async function streamGeminiAudio(socket, text) {
    if (!hasGemini || !text || text.trim().length === 0) return;

    // const voices = ["Puck", "Kore", "Fenrir", "Leda"];
    // const selectedVoice = voices[Math.floor(Math.random() * voices.length)]; 

    try {
        console.log(`Generating Gemini Audio: "${text.substring(0, 20)}..."`);

        // Use the Speech endpoint via REST/SDK (using fetch as SDK for speech might be experimental or explicit)
        // Using the user's provided docs logic:
        // Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: text }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: "Zephyr" // Fixed voice for consistency
                                }
                            }
                        }
                    }
                })
            }
        );

        const data = await response.json();

        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].inlineData) {
            const rawPcmBase64 = data.candidates[0].content.parts[0].inlineData.data;

            // CONVERT RAW PCM TO WAV
            // Gemini returns raw PCM (s16le, 24kHz, 1 channel)
            const pcmBuffer = Buffer.from(rawPcmBase64, 'base64');
            const wavBuffer = addWavHeader(pcmBuffer, 24000, 1, 16);
            const wavBase64 = wavBuffer.toString('base64');

            console.log(`✅ Gemini Audio Generated (${wavBuffer.length} bytes) -> Emitting`);
            socket.emit('audio_chunk', { audio: wavBase64, text: text });
        } else {
            console.error("Gemini TTS: No audio candidate found", JSON.stringify(data));
        }

    } catch (error) {
        console.error("Gemini TTS Generation Error:", error);
    }
}

/**
 * Adds a WAV header to raw PCM data.
 * Specs based on Gemini: 24kHz, 1 Channel, 16-bit Little Endian.
 */
function addWavHeader(pcmData, sampleRate, numChannels, bitDepth) {
    const header = Buffer.alloc(44);
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;
    const dataSize = pcmData.length;
    const totalSize = 36 + dataSize;

    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(totalSize, 4);
    header.write('WAVE', 8);

    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);

    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
}
