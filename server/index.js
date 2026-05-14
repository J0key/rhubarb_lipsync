import { createServer } from "http";
import { spawn } from "child_process";
import { readFile, writeFile, unlink } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { performance } from "perf_hooks";

const ROOT_DIR = process.cwd();
const IS_WINDOWS = process.platform === "win32";
const DEFAULT_RHUBARB_DIR = IS_WINDOWS
  ? path.resolve(ROOT_DIR, "Rhubarb-Lip-Sync-1.14.0-Windows")
  : path.resolve(ROOT_DIR, "Rhubarb-Lip-Sync-1.14.0-Linux");
const DEFAULT_RHUBARB_BINARY = IS_WINDOWS ? "rhubarb.exe" : "rhubarb";
const RHUBARB_DIR = process.env.RHUBARB_DIR || DEFAULT_RHUBARB_DIR;
const RHUBARB_PATH = process.env.RHUBARB_PATH || path.join(RHUBARB_DIR, DEFAULT_RHUBARB_BINARY);
const PORT = process.env.PORT || 3001;
const DIST_DIR = path.resolve(ROOT_DIR, "dist");

const loadEnvFile = () => {
  const envPath = path.resolve(ROOT_DIR, ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  });
};

const jsonResponse = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
};

const collectRequestBody = async (req) => {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
};

const synthesizeAzureTTS = async ({ text, voice }) => {
  const region = process.env.AZURE_TTS_REGION;
  const key = process.env.AZURE_TTS_KEY;
  const outputFormat = "riff-16khz-16bit-mono-pcm";

  if (!region || !key) {
    throw new Error("Missing AZURE_TTS_REGION or AZURE_TTS_KEY");
  }

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const safeText = text.replace(/[<>]/g, "");
  const ssml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<speak version="1.0" xml:lang="id-ID">',
    `<voice name="${voice}">${safeText}</voice>`,
    "</speak>",
  ].join("");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": outputFormat,
      "User-Agent": "rhubarb-lipsync-local",
    },
    body: ssml,
  });

  if (!response.ok) {
    const textBody = await response.text();
    throw new Error(`Azure TTS error: ${response.status} ${textBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const runRhubarb = async ({ wavPath, outputPath }) => {
  return new Promise((resolve, reject) => {
    const args = ["-f", "json", "-o", outputPath, wavPath];
    const rhubarb = spawn(RHUBARB_PATH, args, {
      stdio: ["ignore", "ignore", "pipe"],
      cwd: RHUBARB_DIR,
    });
    let stderr = "";
    rhubarb.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    rhubarb.on("error", reject);
    rhubarb.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`rhubarb.exe failed (${code}): ${stderr}`));
        return;
      }
      resolve();
    });
  });
};

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
};

const serveStatic = async (req, res) => {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(DIST_DIR, urlPath);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (existsSync(filePath)) {
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
    return;
  }
  // SPA fallback
  const indexPath = path.join(DIST_DIR, "index.html");
  if (existsSync(indexPath)) {
    const content = await readFile(indexPath);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(content);
    return;
  }
  res.writeHead(404);
  res.end("Not found");
};

const handler = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/rhubarb") {
    try {
      const body = await collectRequestBody(req);
      const payload = JSON.parse(body || "{}");
      const text = String(payload.text || "").trim();
      const voice = "id-ID-ArdiNeural";

      if (!text) {
        jsonResponse(res, 400, { error: "Text is required" });
        return;
      }
      if (!existsSync(RHUBARB_PATH)) {
        jsonResponse(res, 500, { error: "rhubarb binary not found" });
        return;
      }

      const ttsStart = performance.now();
      const wavBuffer = await synthesizeAzureTTS({ text, voice });
      const ttsProcessingTime = (performance.now() - ttsStart) / 1000;
      const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const wavPath = path.join(tmpdir(), `rhubarb-${stamp}.wav`);
      const outputPath = path.join(tmpdir(), `rhubarb-${stamp}.json`);

      await writeFile(wavPath, wavBuffer);
      await runRhubarb({ wavPath, outputPath });
      const rhubarbJson = await readFile(outputPath, "utf8");
      const rhubarbData = JSON.parse(rhubarbJson);

      jsonResponse(res, 200, {
        rhubarbData,
        audioBase64: wavBuffer.toString("base64"),
        audioMime: "audio/wav",
        processingTime: ttsProcessingTime,
        processingTimeSource: "Azure TTS request",
      });

      await unlink(wavPath);
      await unlink(outputPath);
    } catch (error) {
      jsonResponse(res, 500, { error: error.message || "Server error" });
    }
    return;
  }

  await serveStatic(req, res);
};

loadEnvFile();

createServer(handler).listen(PORT, () => {
  console.log(`Rhubarb server listening on http://localhost:${PORT}`);
});
