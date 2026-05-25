import { useState } from "react";
import { useLipsyncStore } from "../store/useLipsyncStore";

const VOICES = [
  { label: "Indonesia", lang: "ID", voice: "id-ID-ArdiNeural" },
  { label: "English", lang: "us", voice: "en-US-GuyNeural" },
];

export const TypingBox = () => {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const { loading, speak, stop, currentMessage, lastOutput, downloadAll } =
    useLipsyncStore();

  const handleSubmit = () => {
    if (text.trim()) {
      speak(text, selectedVoice.voice);
      setText("");
    }
  };

  const handleStop = () => {
    stop();
  };

  return (
    <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-4 sm:p-6 w-[92vw] sm:w-125 max-w-125 shadow-lg border border-white/20">
      <div className="text-gray-800 text-xl text-center font-semibold mb-3">
        Rhubarb 
      </div>

      {/* Language toggle */}
      <div className="flex gap-1.5 mb-3 justify-center">
        {VOICES.map((v) => (
          <button
            key={v.voice}
            onClick={() => setSelectedVoice(v)}
            className={`flex items-center gap-1 rounded-lg py-1 px-2.5 text-xs font-medium transition-all border ${
              selectedVoice.voice === v.voice
                ? "bg-emerald-500 text-white border-emerald-600"
                : "bg-white/30 text-gray-700 border-white/30 hover:bg-white/50"
            }`}
          >
            <span className="uppercase opacity-70">{v.lang}</span>
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-3 gap-3 text-gray-800">
          <div className="w-5 h-5 border-3 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <span>Generating...</span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
          <div className="flex-1 flex gap-1.5 items-center">
            <input
              className="flex-1 bg-black/30 border-none rounded-full py-3 px-5 text-white text-sm outline-none placeholder:text-white/50"
              placeholder="Drop your text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
              disabled={currentMessage !== null}
            />
            {lastOutput?.text && !currentMessage && (
              <button
                title="Muat kembali teks sebelumnya"
                onClick={() => setText(lastOutput.text)}
                className="bg-white/20 hover:bg-white/40 rounded-full p-2.5 text-white transition-all shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
          {currentMessage ? (
            <button
              className="bg-red-500/80 hover:bg-red-500 rounded-full py-3 px-7 text-white text-sm font-medium cursor-pointer transition-all w-full sm:w-auto"
              onClick={handleStop}
            >
              Stop
            </button>
          ) : (
            <button
              className="bg-white/90 hover:bg-white rounded-full py-3 px-7 text-gray-800 text-sm font-medium cursor-pointer transition-all w-full sm:w-auto"
              onClick={handleSubmit}
            >
              Generate
            </button>
          )}
        </div>
      )}

      {/* Download Section */}
      {/*
      {lastOutput && !loading && (
        <div className="border-t border-white/20 mt-4 pt-4">
          <p className="text-gray-600 text-xs mb-2">Download Output:</p>
          <button
            className="bg-purple-500/60 hover:bg-purple-500/80 rounded-xl py-2 px-4 text-white text-sm cursor-pointer flex items-center gap-2 transition-all"
            onClick={downloadAll}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Data
          </button>
          <p className="text-gray-500 text-xs mt-2">
            Last: "{lastOutput.text.substring(0, 30)}
            {lastOutput.text.length > 30 ? "..." : ""}"
          </p>
        </div>
      )}
       */}
    </div>
  );
};
