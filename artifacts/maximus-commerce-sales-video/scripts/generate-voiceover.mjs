import OpenAI from "openai";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const artifactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const voiceoverPath = path.join(artifactDir, "VOICEOVER.txt");
const outputPath = path.join(artifactDir, "public/audio/voiceover.mp3");

if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error("The OpenAI Replit integration is not available in this environment.");
}

const text = (await readFile(voiceoverPath, "utf8"))
  .replace(/^VOIX OFF[^\n]*\n+\s*/u, "")
  .trim();

if (!text) {
  throw new Error("VOICEOVER.txt does not contain narration.");
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const stream = await openai.chat.completions.create({
  model: "gpt-audio",
  modalities: ["text", "audio"],
  audio: { voice: "alloy", format: "pcm16" },
  messages: [
    {
      role: "system",
      content:
        "Tu es une voix off française professionnelle. Lis toute la narration fournie, exactement et uniquement, avec un ton clair, chaleureux et posé. N’ajoute, ne retire et ne reformule aucun mot.",
    },
    { role: "user", content: text },
  ],
  stream: true,
});

const audioChunks = [];
for await (const chunk of stream) {
  const encodedAudio = chunk.choices?.[0]?.delta?.audio?.data;
  if (encodedAudio) {
    audioChunks.push(Buffer.from(encodedAudio, "base64"));
  }
}

if (audioChunks.length === 0) {
  throw new Error("The OpenAI integration returned no audio data.");
}

const temporaryDir = await mkdtemp(path.join(tmpdir(), "maximus-voiceover-"));
const pcmPath = path.join(temporaryDir, "voiceover.pcm");

try {
  const pcm = Buffer.concat(audioChunks);
  await import("node:fs/promises").then(({ writeFile }) => writeFile(pcmPath, pcm));
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "s16le",
    "-ar",
    "24000",
    "-ac",
    "1",
    "-i",
    pcmPath,
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "160k",
    "-y",
    outputPath,
  ]);
  console.log(
    `Generated French narration: ${audioChunks.length} audio chunks, ${pcm.length} PCM bytes.`,
  );
} finally {
  await rm(temporaryDir, { recursive: true, force: true });
}
