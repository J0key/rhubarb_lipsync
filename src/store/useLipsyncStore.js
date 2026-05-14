import { create } from "zustand";

// Rhubarb Lip Sync Viseme Mapping (Preston Blair phoneme set)
// Reference: https://github.com/DanielSWolf/rhubarb-lip-sync
const VISEME_MAP = {
  A: { id: "A", name: "MBP", description: "Closed mouth (M, B, P)", morphTarget: "viseme_PP" },
  B: { id: "B", name: "ETC", description: "Slightly open mouth (most consonants)", morphTarget: "viseme_kk" },
  C: { id: "C", name: "E", description: "Open mouth (E, EH)", morphTarget: "viseme_E" },
  D: { id: "D", name: "AI", description: "Wide open mouth (A, I, AI)", morphTarget: "viseme_aa" },
  E: { id: "E", name: "O", description: "Rounded small (O)", morphTarget: "viseme_O" },
  F: { id: "F", name: "U", description: "Rounded open (U, OO)", morphTarget: "viseme_U" },
  G: { id: "G", name: "FV", description: "Upper teeth on lower lip (F, V)", morphTarget: "viseme_FF" },
  H: { id: "H", name: "L", description: "Tongue behind teeth (L)", morphTarget: "viseme_nn" },
  X: { id: "X", name: "REST", description: "Neutral/rest position", morphTarget: "viseme_sil" },
};

// Helper function to format visemes with detailed info (Rhubarb format)
const formatVisemesDetailed = (visemes) => {
  return visemes.map(({ start, end, value }, index) => {
    const visemeInfo = VISEME_MAP[value] || VISEME_MAP.X;
    return {
      index: index,
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3)),
      value: value,
      viseme_name: visemeInfo.name,
      description: visemeInfo.description,
      morph_target: visemeInfo.morphTarget,
    };
  });
};

// Convert Rhubarb visemes to legacy format for backward compatibility [timeMs, visemeId]
const convertToLegacyFormat = (rhubarbVisemes) => {
  return rhubarbVisemes.map(v => [v.start * 1000, v.value]);
};

export const useLipsyncStore = create((set, get) => ({
  // State
  loading: false,
  currentMessage: null, // { text, visemes, rhubarbData, audioPlayer, audioBlob, audioUrl, processingTime, processingTimeSource }
  lastOutput: null,

  // Speak function - generates audio and visemes
  speak: async (text) => {
    if (!text.trim()) return;

    set({ loading: true });

    try {
      const response = await fetch("/api/rhubarb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Rhubarb API error: ${response.status} ${errorBody}`);
      }

      const {
        rhubarbData,
        audioBase64,
        audioMime,
        processingTime,
      } = await response.json();

      const legacyVisemes = convertToLegacyFormat(rhubarbData.mouthCues || []);

      const audioBlob = await (await fetch(`data:${audioMime};base64,${audioBase64}`)).blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create audio player
      const audioPlayer = new Audio(audioUrl);

      const output = {
        text,
        visemes: legacyVisemes,
        rhubarbData,
        audioBlob,
        audioUrl,
         processingTime,
        timestamp: new Date().toISOString(),
      };

      const message = {
        ...output,
        audioPlayer,
      };

      // Clean up when audio ends (but keep lastOutput for download)
      audioPlayer.onended = () => {
        set({ currentMessage: null });
      };

      audioPlayer.onerror = (event) => {
        console.error("Audio error:", event);
        set({ loading: false, currentMessage: null });
      };

      set({ loading: false, currentMessage: message, lastOutput: output });
      audioPlayer.play().catch((err) => {
        console.warn("Autoplay blocked, retrying on next user interaction:", err);
        const resume = () => {
          audioPlayer.play().catch(console.error);
          document.removeEventListener("click", resume);
          document.removeEventListener("keydown", resume);
        };
        document.addEventListener("click", resume, { once: true });
        document.addEventListener("keydown", resume, { once: true });
      });
    } catch (error) {
      console.error('Speak error:', error);
      set({ loading: false, currentMessage: null });
    }
  },

  // Stop current audio
  stop: () => {
    const { currentMessage } = get();
    if (currentMessage?.audioPlayer) {
      currentMessage.audioPlayer.pause();
      currentMessage.audioPlayer.currentTime = 0;
    }
    set({ currentMessage: null });
  },

  // Download audio file 
  downloadAudio: () => {
    const { lastOutput } = get();
    if (!lastOutput?.audioBlob) {
      return;
    }

    const link = document.createElement("a");
    link.href = lastOutput.audioUrl;
    link.download = `tts_audio_${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Download viseme data as JSON (Rhubarb format)
  downloadVisemes: () => {
    const { lastOutput } = get();
    if (!lastOutput?.rhubarbData) return;

    const data = {
      metadata: lastOutput.rhubarbData.metadata,
      mouthCues: formatVisemesDetailed(lastOutput.rhubarbData.mouthCues),
      viseme_reference: VISEME_MAP,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rhubarb_visemes_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Download all data as a bundle (Rhubarb format)
  downloadAll: async () => {
    const { lastOutput } = get();
    if (!lastOutput) return;

    // Convert audio blob to base64
    const arrayBuffer = await lastOutput.audioBlob.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // rhubarb type
    const data = {
      text: lastOutput.text,
      timestamp: lastOutput.timestamp,
      metadata: lastOutput.rhubarbData?.metadata || {
        soundFile: "speech.wav",
        duration: lastOutput.visemes.length > 0
          ? lastOutput.visemes[lastOutput.visemes.length - 1][0] / 1000
          : 0,
      },
      mouthCues: formatVisemesDetailed(lastOutput.rhubarbData?.mouthCues || []),
      viseme_reference: VISEME_MAP,
    };

    // generate header
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rhubarb_lipsync_bundle_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
}));

// Export viseme map for use in Avatar
export { VISEME_MAP };
