import { useState } from "react";
import { useLipsyncStore } from "../store/useLipsyncStore";
import { RHUBARB_VISEMES, phonemizerToExpected } from "../data/ipaVisemeMap";

export const VASEvaluation = ({ onBack }) => {
  const { lastOutput } = useLipsyncStore();
  const [scriptText, setScriptText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [phonemizerError, setPhonemizerError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleLoadFromGenerate = () => {
    if (lastOutput?.text) {
      setScriptText(lastOutput.text);
      setAnalysisResult(null);
      setPhonemizerError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!scriptText.trim()) return;
    if (!lastOutput?.rhubarbData?.mouthCues) {
      alert("No Rhubarb viseme data available. Please generate lipsync first.");
      return;
    }

    setAnalyzing(true);
    setPhonemizerError(null);
    setAnalysisResult(null);

    let expectedPhonemes;
    try {
      const res = await fetch("/api/phonemize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: scriptText, lang: "id" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Phonemize failed");
      expectedPhonemes = phonemizerToExpected(data.words);
    } catch (err) {
      setPhonemizerError(err.message);
      setAnalyzing(false);
      return;
    }

    // Get detected visemes from Rhubarb output (exclude REST/X)
    const detectedCues = lastOutput.rhubarbData.mouthCues.filter(
      (cue) => cue.value !== "X"
    );

    // Set of viseme classes Rhubarb actually produced
    const detectedVisemeSet = new Set(detectedCues.map((c) => c.value));

    const comparison = expectedPhonemes.map((expected, index) => {
      const isMatch =
        expected.expectedViseme !== null &&
        detectedVisemeSet.has(expected.expectedViseme);
      const detectedViseme = isMatch ? expected.expectedViseme : null;

      return {
        index: index + 1,
        word: expected.word,
        phoneme: expected.phone,
        expectedViseme: expected.expectedViseme,
        expectedVisemeName: expected.expectedVisemeName,
        expectedMorphTarget: expected.expectedMorphTarget,
        detectedViseme,
        detectedVisemeName: detectedViseme
          ? RHUBARB_VISEMES[detectedViseme]?.name || "?"
          : "-",
        detectedMorphTarget: detectedViseme
          ? RHUBARB_VISEMES[detectedViseme]?.morphTarget || "?"
          : "-",
        isMatch,
        notInDictionary: expected.notInDictionary || false,
      };
    });

    const evaluable = comparison.filter((c) => !c.notInDictionary && c.expectedViseme !== null);
    const correct = evaluable.filter((c) => c.isMatch).length;
    const total = evaluable.length;
    const vasScore = total > 0 ? (correct / total) * 100 : 0;

    setAnalysisResult({
      comparison,
      correct,
      total,
      vasScore,
      totalDetected: detectedCues.length,
      totalExpected: expectedPhonemes.length,
    });
    setAnalyzing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getBarColor = (score) => {
    if (score >= 80) return "bg-green-400";
    if (score >= 60) return "bg-yellow-400";
    return "bg-red-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="bg-white/10 hover:bg-white/20 rounded-full py-2 px-4 text-white text-sm cursor-pointer transition-all flex items-center gap-2"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Avatar
          </button>
          <h1 className="text-white text-2xl font-bold">
            VAS Evaluation Rhubarb
          </h1>
        </div>

        {/* Input Section */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-white text-lg font-semibold mb-3">
            Script Input
          </h2>
          <div className="flex gap-3 items-start">
            <textarea
              className="flex-1 bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white text-sm outline-none placeholder:text-white/40 resize-none min-h-[60px]"
              placeholder="Enter script text (e.g. Place red at B five now)"
              value={scriptText}
              onChange={(e) => {
                setScriptText(e.target.value);
                setAnalysisResult(null);
              }}
              rows={2}
            />
          </div>
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleLoadFromGenerate}
              disabled={!lastOutput}
              className={`rounded-xl py-2 px-4 text-sm cursor-pointer transition-all flex items-center gap-2 ${
                lastOutput
                  ? "bg-blue-500/60 hover:bg-blue-500/80 text-white"
                  : "bg-gray-600/40 text-gray-400 cursor-not-allowed"
              }`}
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Load from Last Generate
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !scriptText.trim() || !lastOutput?.rhubarbData}
              className={`rounded-xl py-2 px-4 text-sm cursor-pointer transition-all font-medium ${
                !analyzing && scriptText.trim() && lastOutput?.rhubarbData
                  ? "bg-purple-500/70 hover:bg-purple-500/90 text-white"
                  : "bg-gray-600/40 text-gray-400 cursor-not-allowed"
              }`}
            >
              {analyzing ? "Analyzing..." : "Analyze VAS"}
            </button>
          </div>
          {lastOutput && (
            <p className="text-gray-400 text-xs mt-2">
              Last generated: "{lastOutput.text?.substring(0, 50)}
              {lastOutput.text?.length > 50 ? "..." : ""}"
            </p>
          )}
          {!lastOutput && (
            <p className="text-yellow-400/70 text-xs mt-2">
              No lipsync data available. Generate lipsync on Avatar page first.
            </p>
          )}
          {phonemizerError && (
            <p className="text-red-400 text-xs mt-2">
              Phonemizer error: {phonemizerError}
            </p>
          )}
        </div>

        {/* VAS Score Display */}
        {analysisResult && (
          <>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/20">
              <h2 className="text-white text-lg font-semibold mb-4">
                VAS Score
              </h2>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div
                    className={`text-5xl font-bold ${getScoreColor(
                      analysisResult.vasScore
                    )}`}
                  >
                    {analysisResult.vasScore.toFixed(1)}%
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    {analysisResult.correct}/{analysisResult.total} correct
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                        analysisResult.vasScore
                      )}`}
                      style={{ width: `${analysisResult.vasScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-4 text-sm text-gray-400">
                <span>Expected phonemes: {analysisResult.totalExpected}</span>
                <span>Detected visemes: {analysisResult.totalDetected}</span>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Formula: VAS = (Correctly Mapped Visemes / Total Visemes) x 100
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <h2 className="text-white text-lg font-semibold mb-4">
                Detailed Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">
                        #
                      </th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">
                        Kata · IPA Phone
                      </th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">
                        Expected Viseme ID
                      </th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">
                        Detected Viseme ID
                      </th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">
                        ✓ / X
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.comparison.map((row) => (
                      <tr
                        key={row.index}
                        className={`border-b border-white/5 ${
                          row.notInDictionary
                            ? "opacity-50"
                            : row.isMatch
                            ? ""
                            : "bg-red-500/5"
                        }`}
                      >
                        <td className="py-2 px-2 text-gray-500">
                          {row.index}
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-white font-medium">{row.word}</span>
                          <span className="text-gray-500 mx-1">·</span>
                          <span className="text-blue-300 font-mono">{row.phoneme}</span>
                        </td>
                        <td className="py-2 px-2 text-green-300">
                          {row.expectedViseme || "-"}
                        </td>
                        <td
                          className={`py-2 px-2 ${
                            row.isMatch ? "text-green-300" : "text-red-300"
                          }`}
                        >
                          {row.detectedViseme || "-"}
                        </td>
                        <td className="py-2 px-2 text-center text-lg">
                          {row.notInDictionary ? (
                            <span className="text-yellow-400" title="Word not in dictionary">
                              ?
                            </span>
                          ) : row.detectedViseme === null ? (
                            <span className="text-gray-500">-</span>
                          ) : row.isMatch ? (
                            <span className="text-green-400">✓</span>
                          ) : (
                            <span className="text-red-400">X</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-white/10 flex gap-6 text-xs text-gray-500">
                <span>
                  <span className="text-green-400 mr-1">V</span> Correct match
                </span>
                <span>
                  <span className="text-red-400 mr-1">X</span> Mismatch
                </span>
                <span>
                  <span className="text-yellow-400 mr-1">?</span> Word not in
                  dictionary
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
