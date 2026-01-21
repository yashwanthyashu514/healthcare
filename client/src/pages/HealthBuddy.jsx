import React, { useEffect, useRef, useState } from 'react';
import { TalkingHead } from "@met4citizen/talkinghead";
import io from 'socket.io-client';
import { AudioQueue } from '../utils/AudioQueue';
import { useNavigate } from 'react-router-dom';
import { X, Send, Mic, MicOff, MessageSquare, Video } from 'lucide-react';

const HealthBuddy = () => {
    const navigate = useNavigate();
    const avatarContainerRef = useRef(null);
    const isInitialized = useRef(false);

    // Modes: 'chat' | 'live'
    const [mode, setMode] = useState('chat');

    // Core State
    const [head, setHead] = useState(null);
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [suggestions, setSuggestions] = useState([]); // Fixed: Added suggestions state
    const [inputText, setInputText] = useState("");
    const [audioQueue, setAudioQueue] = useState(null);
    const [isThinking, setIsThinking] = useState(false);

    // Live Mode Specific State
    const [isAvatarLoading, setIsAvatarLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [audioLevel, setAudioLevel] = useState(0); // For debugging VAD

    // 1. Socket Connection
    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
        setSocket(newSocket);
        return () => newSocket.close();
    }, []);

    // // 2. Audio Queue (Browser Voice Mode)
    // useEffect(() => {
    //     // We don't strictly need 'head' to be ready for browser TTS, 
    //     // but we'll keep the dependency if we want to add animations later.
    //     if (head) {
    //         const queue = new AudioQueue(async (text) => {
    //             console.log("🗣️ Speaking:", text);
    //             return new Promise((resolve, reject) => {
    //                 try {
    //                     // Create Utterance
    //                     const utterance = new SpeechSynthesisUtterance(text);

    //                     // Select Voice (try to find Google US English or similar)
    //                     const voices = window.speechSynthesis.getVoices();
    //                     const preferredVoice = voices.find(v =>
    //                         v.name.includes("Google US English") ||
    //                         v.name.includes("Microsoft David") ||
    //                         v.lang === "en-US"
    //                     );
    //                     if (preferredVoice) utterance.voice = preferredVoice;

    //                     utterance.rate = 1.0;
    //                     utterance.pitch = 1.0;

    //                     // Event Listeners for Queue Management
    //                     utterance.onend = () => {
    //                         console.log("✅ Speech finished");
    //                         resolve();
    //                     };
    //                     utterance.onerror = (e) => {
    //                         console.error("❌ Speech Error:", e);
    //                         resolve(); // Resolve anyway to keep queue moving
    //                     };

    //                     // Speak
    //                     window.speechSynthesis.cancel(); // Cancel potential overlap
    //                     window.speechSynthesis.speak(utterance);

    //                     // Optional: Trigger random animation on avatar if available
    //                     if (head && typeof head.startLipsync === 'function') {
    //                         // head.speakText handles this internally, but we are bypassing it.
    //                         // We might not get accurate lipsync without the library's internal TTS.
    //                         // For now, at least we get Audio.
    //                     }

    //                 } catch (err) {
    //                     console.error("❌ AudioQueue Error:", err);
    //                     resolve();
    //                 }
    //             });
    //         });
    //         setAudioQueue(queue);
    //     }
    // }, [head]);

    // 2. Audio Queue (Server Audio Mode)
    useEffect(() => {
        if (head) {
            const queue = new AudioQueue(async (data) => {
                if (!data || !data.audio) return;
                console.log("🗣️ Avatar Speaking:", data.text);

                try {
                    // Convert Base64 to ArrayBuffer
                    const binaryString = window.atob(data.audio);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const arrayBuffer = bytes.buffer;
                    console.log(`📦 Audio Size: ${arrayBuffer.byteLength} bytes`);

                    // Ensure audio context is running
                    if (head?.audioCtx && head.audioCtx.state === 'suspended') {
                        console.log("� Resuming Audio Context for lip-sync...");
                        await head.audioCtx.resume();
                    }

                    // Use TalkingHead's speakAudio for lip-sync
                    if (head && typeof head.speakAudio === 'function') {
                        console.log("💬 Starting lip-sync animation...");
                        await head.speakAudio(arrayBuffer, {
                            text: data.text,
                            // These options help with lip-sync accuracy
                            lipsyncLang: 'en'
                        });
                        console.log("✅ Lip-sync completed");
                    } else {
                        console.error("❌ Head.speakAudio not available");
                    }

                } catch (err) {
                    console.error("❌ Lip-sync Error:", err);
                }
            });
            setAudioQueue(queue);
        }
    }, [head]);

    // 3. Initialize Avatar (Loaded only when entering Live Mode or pre-loaded)
    // We'll load it once on mount but hide it in chat mode to avoid reloading delays
    useEffect(() => {
        const initAvatar = async () => {
            if (isInitialized.current || !avatarContainerRef.current) return;

            try {
                isInitialized.current = true;
                setIsAvatarLoading(true);
                avatarContainerRef.current.innerHTML = '';
                const newHead = new TalkingHead(avatarContainerRef.current, {
                    cameraView: "upper",
                    cameraDistance: 2.0,
                    lipsyncRoot: "/lipsync/",
                    lipsyncModules: ["lipsync-en.mjs"],
                    lipsyncLang: "en"
                });

                await newHead.showAvatar({
                    url: "https://models.readyplayer.me/6943e2398f9c70cbc9b4c9bb.glb?morphTargets=ARKit",
                    body: "M",
                    avatarMood: "neutral"
                });

                setHead(newHead);
                setIsAvatarLoading(false);
                console.log("✅ Avatar + Lipsync Loaded");
            } catch (error) {
                console.error("Avatar Failed:", error);
                isInitialized.current = false;
                setIsAvatarLoading(false);
            }
        };

        // Initialize immediately to be ready
        setTimeout(initAvatar, 500);
    }, []);

    // 4. Voice Activity Detection (VAD) + Speech Recognition
    const transcriptBuffer = useRef("");
    const silenceTimer = useRef(null);
    const recognitionRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const micStreamRef = useRef(null);
    const vadIntervalRef = useRef(null);
    const isRecognitionActive = useRef(false);
    const lastRecognitionEndTime = useRef(0); // Tracks cooldown

    useEffect(() => {
        if (mode !== 'live') {
            // Cleanup if not in live mode
            if (vadIntervalRef.current) cancelAnimationFrame(vadIntervalRef.current);
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
            if (recognitionRef.current) recognitionRef.current.stop();
            setIsListening(false);
            return;
        }

        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech Recognition not supported');
            return;
        }

        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        // Cooldown tracking
        const RESTART_COOLDOWN = 1000; // 1 second
        // lastRecognitionEndTime is now at top level

        recog.onresult = (event) => {
            if (silenceTimer.current) clearTimeout(silenceTimer.current);

            let finalChunk = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalChunk += event.results[i][0].transcript;
                }
            }

            if (finalChunk) {
                transcriptBuffer.current += finalChunk + " ";
                console.log("🎤 Captured:", finalChunk);
            }
        };

        recog.onend = () => {
            isRecognitionActive.current = false;
            setIsListening(false);
            lastRecognitionEndTime.current = Date.now(); // Mark end time
            console.log("🔴 Recognition stopped");
        };

        recog.onerror = (event) => {
            if (event.error === 'no-speech') {
                console.warn("⚠️ Recognition: No speech detected (Ignored)");
                // Do NOT set isRecognitionActive to false immediately if we want to treat it as "running but silent"
                // But typically onend fires after onerror, so the cleanup happens there.
                // Just log it.
            } else {
                console.error("Recognition error:", event.error);
            }
            // isRecognitionActive is managed by onend
        };

        recognitionRef.current = recog;

        // Initialize Voice Activity Detection
        const initVAD = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                micStreamRef.current = stream;

                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                audioContextRef.current = audioContext;

                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.8;
                analyserRef.current = analyser;

                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const VOICE_THRESHOLD = 45; // Increased from 35 to prevent noise triggering
                const SILENCE_DURATION = 2000; // 2 seconds
                const MIN_VOICE_DURATION = 100; // 100ms
                let lastVoiceTime = 0;
                let voiceStartTime = 0;
                let isVoiceDetected = false;

                const checkVoiceActivity = () => {
                    analyser.getByteFrequencyData(dataArray);

                    // Calculate average volume
                    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

                    // Update UI state for debugging
                    setAudioLevel(Math.round(average));

                    const now = Date.now();

                    if (average > VOICE_THRESHOLD) {
                        // Potential voice detected
                        if (!isVoiceDetected) {
                            voiceStartTime = now;
                            isVoiceDetected = true;
                        }

                        lastVoiceTime = now;

                        // Only start recognition if:
                        // 1. Not already active
                        // 2. Voice sustained for min duration
                        // 3. Cooldown period passed since last stop
                        if (!isRecognitionActive.current &&
                            (now - voiceStartTime > MIN_VOICE_DURATION) &&
                            (now - lastRecognitionEndTime.current > RESTART_COOLDOWN)
                        ) {
                            try {
                                console.log(`🔴 Voice detected (level: ${average.toFixed(1)}) - Starting recognition`);
                                recog.start();
                                isRecognitionActive.current = true;
                                setIsListening(true);
                            } catch (e) {
                                console.warn("Recognition already active");
                            }
                        }
                    } else {
                        // Below threshold
                        isVoiceDetected = false;

                        // Silence detected - stop after duration
                        if (isRecognitionActive.current && (now - lastVoiceTime > SILENCE_DURATION)) {
                            console.log("⚪ Silence detected - Stopping recognition");
                            recog.stop(); // onend will handle state update
                            // State updates are handled in onend, but we can proactively set listener false for UI
                            setIsListening(false);

                            // Send accumulated message
                            const messageToSend = transcriptBuffer.current.trim();
                            if (messageToSend.length > 0) {
                                console.log("🚀 Sending message:", messageToSend);
                                handleSendMessage(messageToSend);
                                transcriptBuffer.current = "";
                            } else {
                                console.log("❌ No valid transcript captured (Ignored)");
                                transcriptBuffer.current = ""; // Clear empty buffer
                            }
                        }
                    }

                    vadIntervalRef.current = requestAnimationFrame(checkVoiceActivity);
                };

                checkVoiceActivity();
                console.log("✅ VAD initialized");

            } catch (error) {
                console.error("Failed to initialize VAD:", error);
                alert("Microphone access required for Live Mode");
            }
        };

        initVAD();

        return () => {
            if (vadIntervalRef.current) cancelAnimationFrame(vadIntervalRef.current);
            if (silenceTimer.current) clearTimeout(silenceTimer.current);
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) audioContextRef.current.close();
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, [mode, socket]);

    // 5. Socket Listeners
    useEffect(() => {
        if (!socket) return;

        // NEW: Handle Structured Speech
        socket.on('chat_response', (data) => {
            console.log("💬 AI Speech:", data.text);
            // Append as a complete message since we disabled streaming
            setMessages(prev => [...prev, { role: 'ai', text: data.text, isStreaming: false }]);
            setIsThinking(false);

            // Note: Audio (TTS) will arrive via 'audio_chunk' OR we fallback in stream_done
        });

        // NEW: Handle Suggestions List
        socket.on('suggestions', (data) => {
            console.log("💡 Suggestions received:", data.items);
            setSuggestions(data.items); // Replace old suggestions with new ones
        });

        socket.on('audio_chunk', (data) => {
            // Check mode and queue availability
            if (mode === 'live' && audioQueue) {
                audioQueue.enqueue(data);
            }
        });

        socket.on('stream_done', () => {
            setIsThinking(false);

            // Browser TTS Fallback (if no server audio)
            setMessages(prev => {
                const last = prev[prev.length - 1];
                // Only speak if it's AI, and we assume no server audio if we are checking this here
                // Although 'audio_chunk' might come slightly later, usually it's before stream_done.
                // We'll trust the user to use this as safety.
                if (last?.role === 'ai' && last.text && mode === 'live') {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(last.text);
                    const voices = window.speechSynthesis.getVoices();
                    const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.lang === "en-US");
                    if (preferredVoice) utterance.voice = preferredVoice;
                    utterance.rate = 1.0;
                    window.speechSynthesis.speak(utterance);
                }
                return prev;
            });
        });

        return () => {
            socket.off('chat_response');
            socket.off('suggestions');
            socket.off('audio_chunk');
            socket.off('stream_done');
        };
    }, [socket, audioQueue, mode]);

    // 6. Handle TTS Voices & Cleanup
    useEffect(() => {
        const handleVoicesChanged = () => {
            const voices = window.speechSynthesis.getVoices();
            console.log(`🗣️ Voices loaded: ${voices.length} available.`);
        };

        window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

        // Cleanup on unmount
        return () => {
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const handleSendMessage = (text) => {
        if (!text.trim() || !socket) return;

        // Unlock Audio Context if in Live Mode
        if (mode === 'live' && head && head.audioCtx && head.audioCtx.state === 'suspended') {
            head.audioCtx.resume();
        }

        setMessages(prev => [...prev, { role: 'user', text: text }]);
        setSuggestions([]); // Clear previous suggestions on new query
        socket.emit('user_message', { message: text });
        setIsThinking(true);
    };

    const handleMicClick = () => {
        if (recognitionRef.current) {
            if (isListening) {
                console.log("🛑 Manual Stop");
                recognitionRef.current.stop();
                setIsListening(false); // Immediate UI update
            } else {
                console.log("🟢 Manual Start");
                try {
                    recognitionRef.current.start();
                    setIsListening(true); // Immediate UI update
                    isRecognitionActive.current = true;
                } catch (e) {
                    console.warn("Recognition already active or failed:", e);
                }
            }
        } else {
            alert("Voice recognition not supported or not ready.");
        }
    };

    const toggleMode = () => {
        // Cancel any ongoing speech when switching modes
        window.speechSynthesis.cancel();
        setMode(prev => prev === 'chat' ? 'live' : 'chat');
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white relative overflow-hidden">

            {/* 3D AVATAR CONTAINER */}
            <div
                ref={avatarContainerRef}
                className={`absolute inset-0 bg-[#0f172a] transition-opacity duration-500 ${mode === 'live' ? 'opacity-100 z-10' : 'opacity-0 -z-10'}`}
            />

            {/* HEADER */}
            <div className="absolute top-0 w-full p-4 flex justify-between z-50 bg-gradient-to-b from-gray-900 via-gray-900/80 to-transparent">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">Health Buddy</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${mode === 'live' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'}`}>
                        {mode === 'live' ? 'LIVE' : 'CHAT'}
                    </span>
                </div>
                <div className='flex gap-2'>
                    <button
                        onClick={toggleMode}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all backdrop-blur-md border ${mode === 'live' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                    >
                        {mode === 'live' ? <MessageSquare size={18} /> : <Video size={18} />}
                        <span>{mode === 'live' ? 'Switch to Chat' : 'Start Live Call'}</span>
                    </button>
                    <button onClick={() => navigate('/patient/dashboard')} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* LOADING OVERLAY */}
            {mode === 'live' && isAvatarLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
                    <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
                    <p className="animate-pulse text-blue-400 text-lg">Summoning Dr. AI...</p>
                </div>
            )}

            {/* CHAT MODE UI */}
            {mode === 'chat' && (
                <div className="flex flex-col h-full pt-20 pb-4 px-4 max-w-4xl mx-auto w-full z-20">
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-white/20 px-20">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4">
                                <MessageSquare size={48} />
                                <p>Start a conversation with your Health Buddy.</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-4 rounded-2xl max-w-[80%] text-base shadow-md ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 border border-slate-700 rounded-bl-none'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Input */}
                    <div className="flex gap-3 bg-slate-800 p-2 rounded-full border border-slate-700 shadow-lg">
                        <input
                            className="flex-1 bg-transparent border-none text-white px-4 focus:ring-0 placeholder:text-slate-500"
                            placeholder="Type a message..."
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText) && setInputText("")}
                        />
                        <button
                            onClick={() => { handleSendMessage(inputText); setInputText(""); }}
                            className="bg-blue-600 hover:bg-blue-500 p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!inputText.trim()}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* LIVE MODE UI */}
            {mode === 'live' && !isAvatarLoading && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-end pb-12 pointer-events-none">

                    {/* NEW: SUGGESTIONS PANEL (Left) */}
                    {suggestions.length > 0 && (
                        <div className="absolute left-6 top-24 bottom-32 w-80 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-y-auto pointer-events-auto shadow-2xl transition-all duration-500 animate-in slide-in-from-left-10">
                            <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
                                <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                                Health Suggestions
                            </h3>
                            <ul className="space-y-3">
                                {suggestions.map((s, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-white/90 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-blue-500/30 transition-colors">
                                        <div className="mt-1 min-w-[6px] h-1.5 rounded-full bg-blue-500" />
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* NEW: SPEECH BUBBLE (Right) */}
                    {messages.length > 0 && messages[messages.length - 1].role === 'ai' && (
                        <div className="absolute right-6 top-24 max-w-sm pointer-events-auto animate-in slide-in-from-right-10 fade-in duration-500">
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl rounded-tr-none shadow-2xl">
                                <p className="text-lg leading-relaxed font-medium text-white shadow-black drop-shadow-md">
                                    "{messages[messages.length - 1].text}"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Status Text */}
                    {isThinking && (
                        <div className="absolute top-1/4 animate-pulse bg-black/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-white/80">
                            Dr. AI is thinking...
                        </div>
                    )}

                    <div className="pointer-events-auto flex flex-col items-center gap-6">
                        {/* Mic Indicator */}
                        <div
                            onClick={handleMicClick}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 ${isListening ? 'bg-red-500 scale-110 shadow-red-500/50 animate-pulse' : 'bg-white/10 border border-white/20 backdrop-blur-md hover:bg-white/20'}`}
                        >
                            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                        </div>

                        <p className="text-white/60 text-sm font-medium tracking-wider uppercase">
                            {isListening ? "Listening... (Tap to Pause)" : "Tap Mic or Speak to Start"}
                        </p>

                        {/* Debug Meter */}
                        <div className="flex flex-col items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-lg">
                            <p className="text-white/60 text-xs">Audio Level: {audioLevel}</p>
                            <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-100 ${audioLevel > 45 ? 'bg-green-500' : 'bg-white/30'}`}
                                    style={{ width: `${Math.min(100, (audioLevel / 100) * 100)}%` }}
                                />
                            </div>
                            <p className="text-white/40 text-xs">Threshold: 45 | Tap mic to force start</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthBuddy;