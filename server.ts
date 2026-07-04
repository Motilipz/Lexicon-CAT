import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Create apiRouter to support both local /api and Netlify serverless functions prefix
const apiRouter = express.Router();

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// API Endpoint: Check backend and API status
apiRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    apiConfigured: !!apiKey,
    timestamp: new Date().toISOString(),
  });
});

// JSON Schema for Word profiling
const wordSchema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    ipa: { type: Type.STRING },
    partOfSpeech: { type: Type.STRING },
    cefr: { type: Type.STRING },
    difficulty: { type: Type.INTEGER },
    frequency: { type: Type.INTEGER },
    simpleDefinition: { type: Type.STRING },
    detailedDefinition: { type: Type.STRING },
    hindiMeaning: { type: Type.STRING },
    alternativeMeanings: { type: Type.ARRAY, items: { type: Type.STRING } },
    memory: {
      type: Type.OBJECT,
      properties: {
        mnemonic: { type: Type.STRING, description: "An clever, easy to recall word association or verbal bridge." },
        visualImagination: { type: Type.STRING, description: "A high-retention mental image description." },
        storyTrick: { type: Type.STRING, description: "A short, engaging narrative to remember the word." },
        realAssociation: { type: Type.STRING, description: "A concrete real-world phenomenon, scenario, or historical event." },
        funnyTrick: { type: Type.STRING, description: "A humorous, pun-based or quirky memory cue." }
      },
      required: ["mnemonic", "visualImagination", "storyTrick", "realAssociation", "funnyTrick"]
    },
    etymology: {
      type: Type.OBJECT,
      properties: {
        rootWord: { type: Type.STRING },
        prefix: { type: Type.STRING },
        suffix: { type: Type.STRING },
        origin: { type: Type.STRING },
        rootMeaning: { type: Type.STRING },
        sharedRootWords: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              meaning: { type: Type.STRING }
            },
            required: ["word", "meaning"]
          }
        }
      },
      required: ["rootWord", "prefix", "suffix", "origin", "rootMeaning", "sharedRootWords"]
    },
    synonyms: {
      type: Type.OBJECT,
      properties: {
        easy: { type: Type.STRING, description: "A highly common synonym known by general readers." },
        medium: { type: Type.STRING, description: "A intermediate-level academic synonym." },
        advanced: { type: Type.STRING, description: "A sophisticated, high-frequency CAT level synonym." }
      },
      required: ["easy", "medium", "advanced"]
    },
    antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
    wordFamily: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          form: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING }
        },
        required: ["form", "partOfSpeech"]
      }
    },
    contextExamples: {
      type: Type.OBJECT,
      properties: {
        simple: { type: Type.STRING, description: "Everyday conversational sentence." },
        editorial: { type: Type.STRING, description: "Newspaper editorial (The Hindu, Indian Express, NYT) style." },
        catRc: { type: Type.STRING, description: "A dense, high-complexity CAT Reading Comprehension style passage sentence." },
        business: { type: Type.STRING, description: "Financial or corporate business case sentence." },
        academic: { type: Type.STRING, description: "Scientific or sociological journal statement." },
        conversation: { type: Type.STRING, description: "A practical conversational sentence." }
      },
      required: ["simple", "editorial", "catRc", "business", "academic", "conversation"]
    },
    collocations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Provide exactly 5 natural, frequent word pairings." },
    commonMistakes: {
      type: Type.OBJECT,
      properties: {
        confusedWith: { type: Type.STRING, description: "Words commonly misspelled or confused with this word." },
        incorrectUsage: { type: Type.STRING, description: "An example sentence demonstrating bad grammar/word choice." },
        correctUsage: { type: Type.STRING, description: "The corrected version of the incorrect sentence." },
        grammarMistake: { type: Type.STRING, description: "Explicit explanation of why the usage was bad or confusion occurs." }
      },
      required: ["confusedWith", "incorrectUsage", "correctUsage", "grammarMistake"]
    },
    readingRecognition: {
      type: Type.OBJECT,
      properties: {
        newspaperAppearance: { type: Type.STRING, description: "How this word typically behaves in major articles." },
        typicalPhrases: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Phrases the word is frequently embedded in." },
        hiddenMeanings: { type: Type.STRING, description: "Subtle subtexts or double meanings of the word." },
        authorTone: { type: Type.STRING, description: "What author attitude (e.g. critical, mocking, admiring) this word signals." },
        connotation: { type: Type.STRING, description: "Emotional coloration: Positive, Negative, or Neutral." }
      },
      required: ["newspaperAppearance", "typicalPhrases", "hiddenMeanings", "authorTone", "connotation"]
    },
    emotionalTone: { type: Type.STRING, description: "e.g. Negative, Positive, Neutral, Academic, Literary, Formal, Informal" },
    category: { type: Type.STRING, description: "Choose one: Business, Economics, Psychology, Politics, Philosophy, Science, Law, History, Technology, Environment, Society, Education, Literature, CAT High Frequency" }
  },
  required: [
    "word", "ipa", "partOfSpeech", "cefr", "difficulty", "frequency",
    "simpleDefinition", "detailedDefinition", "hindiMeaning", "alternativeMeanings",
    "memory", "etymology", "synonyms", "antonyms", "wordFamily", "contextExamples",
    "collocations", "commonMistakes", "readingRecognition", "emotionalTone", "category"
  ]
};

// API Endpoint: Profile any custom word (from search, Reading Mode, etc.)
const analyzeWordHandler = async (req: express.Request, res: express.Response) => {
  const { word } = req.body;
  if (!word || typeof word !== "string") {
    return res.status(400).json({ error: "A valid word string is required." });
  }

  if (!ai) {
    return res.status(500).json({
      error: "Gemini API key is not configured in the Secrets panel. Please ask the user to configure GEMINI_API_KEY.",
    });
  }

  try {
    const prompt = `Analyze the English word "${word.trim()}" in deep, comprehensive detail specifically for a CAT (Common Admission Test) preparation student.

    Provide simple English definitions, detailed academic meanings, precise Hindi translations, advanced memorization hooks (mnemonic, funny tricks, real associations, story tricks), full etymology showing root words, prefixes, suffixes, origins, and a list of other words sharing the same root.

    Provide 3 synonyms ranked by usefulness (easy, medium, advanced), 3-5 antonyms, related word families, 6 specialized context example sentences (simple, editorial, dense CAT RC style, business, academic, conversation), at least 5 natural collocations, common mistakes (confusing words, incorrect vs correct sentences, grammatical tips), and reading recognition subtexts (how authors use it, typical newspaper phrases, tone signals).

    Be extremely accurate, highly educational, and return a clean JSON object following the response schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: wordSchema,
      },
    });

    if (!response.text) {
      throw new Error("Received empty response from Gemini.");
    }

    const wordProfile = JSON.parse(response.text.trim());
    res.json(wordProfile);
  } catch (err: any) {
    console.error("Gemini analyze-word failure:", err);
    res.status(500).json({
      error: "Failed to profile word with AI. Details: " + (err.message || err),
    });
  }
};

apiRouter.post("/gemini/analyze-word", analyzeWordHandler);
apiRouter.post("/gemini/quick-lookup", analyzeWordHandler);

// API Endpoint: Generate customized 15-word daily lists
apiRouter.post("/gemini/generate-daily-list", async (req, res) => {
  const { studiedWords, weakCategories } = req.body;
  if (!ai) {
    return res.status(500).json({
      error: "Gemini API key is not configured.",
    });
  }

  try {
    const prompt = `Generate an advanced vocabulary daily list of exactly 15 high-frequency English words curated specifically for CAT (Common Admission Test) or GMAT preparation.
    
    Context and Requirements:
    - We want a personalized list of 15 diverse and sophisticated words.
    ${studiedWords && studiedWords.length > 0 ? `- EXCLUDE these recently studied/known words: ${studiedWords.join(", ")}.` : ""}
    ${weakCategories && weakCategories.length > 0 ? `- Focus especially on these weak categories/domains: ${weakCategories.join(", ")}.` : "- Include a balanced selection of categories: Business, Economics, Psychology, Politics, Philosophy, Science, Law, History, Technology, Environment, Society, Education, Literature, or CAT High Frequency."}

    For each word in the list, you must provide a deep, rich, comprehensive CAT-focused profile matching the expected word schema structure:
    - Provide accurate IPA, part of speech, CEFR level (typically C1 or C2), and relative difficulty/frequency ranks.
    - Provide a simple English definition and a detailed academic definition.
    - Provide a precise Hindi meaning.
    - Include advanced memory cues (mnemonic, visual imagination description, story trick, real association, funny trick).
    - Include etymology details (rootWord, prefix, suffix, origin, rootMeaning, and other words sharing the same root).
    - Provide easy, medium, and advanced synonyms.
    - Include antonyms, word families, and 6 highly contextual context examples (simple, editorial, CAT reading comprehension style, business, academic, conversation).
    - List exactly 5 natural, frequent word pairings (collocations).
    - Highlight common mistakes (confusing words, incorrect vs correct sentence, explicit grammatical tips).
    - Detail reading recognition cues (how major newspapers use it, typical phrases, subtext, author tone signal, connotation color).
    - Choose an appropriate emotional tone and specify one of the valid categories.

    Return a clean JSON array containing exactly 15 fully-profiled word objects following the response schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: wordSchema,
        },
      },
    });

    if (!response.text) {
      throw new Error("Received empty response from daily list generator.");
    }

    const dailyList = JSON.parse(response.text.trim());
    res.json(dailyList);
  } catch (err: any) {
    console.error("Gemini generate-daily-list failure:", err);
    res.status(500).json({
      error: "Failed to generate AI daily list. Details: " + (err.message || err),
    });
  }
});

// JSON Schema for Quiz Question
const quizQuestionSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    type: { type: Type.STRING, description: "Must be one of: meaning-recall, fill-blank, synonym, antonym, context-complete, root-word, collocation" },
    word: { type: Type.STRING },
    question: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must have exactly 4 choices." },
    correctAnswer: { type: Type.STRING, description: "Must match one of the 4 options exactly." },
    explanation: { type: Type.STRING }
  },
  required: ["id", "type", "word", "question", "options", "correctAnswer", "explanation"]
};

const quizListSchema = {
  type: Type.ARRAY,
  items: quizQuestionSchema
};

// API Endpoint: Generate customized quiz questions
apiRouter.post("/gemini/generate-ai-quiz", async (req, res) => {
  const { words, weakCategories } = req.body;
  if (!ai) {
    return res.status(500).json({
      error: "Gemini API key is not configured.",
    });
  }

  try {
    const prompt = `Generate an intelligent set of 5 distinct multiple-choice quiz questions specifically tailored for CAT (Common Admission Test) aspirants.
    
    ${words && words.length > 0 ? `Focus the quiz on these specific studied words: ${words.join(", ")}.` : ""}
    ${weakCategories && weakCategories.length > 0 ? `Target these weak vocabulary themes: ${weakCategories.join(", ")}.` : ""}

    Include a diverse mix of question formats:
    - Meaning recall
    - Fill in the blanks (contextual)
    - Choose the most appropriate synonym
    - Choose the most appropriate antonym
    - Sentence completion (editorial style)
    - Root word associations (e.g. 'What word shares the root...')
    - Collocation matching

    Each question must have exactly 4 plausible choices. The correctAnswer must match one of the options exactly. Include a rich explanation explaining why the correct choice fits perfectly in a CAT exam context.
    
    Return a clean JSON array of 5 questions following the specified response schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizListSchema,
      },
    });

    if (!response.text) {
      throw new Error("Empty response from quiz generator.");
    }

    const quizList = JSON.parse(response.text.trim());
    res.json(quizList);
  } catch (err: any) {
    console.error("Gemini generate-ai-quiz failure:", err);
    res.status(500).json({
      error: "Failed to generate AI quiz. Details: " + (err.message || err),
    });
  }
});

// API Endpoint: Compare confusing words or explain a concept
apiRouter.post("/gemini/compare-words", async (req, res) => {
  const { wordA, wordB } = req.body;
  if (!wordA || !wordB) {
    return res.status(400).json({ error: "Both wordA and wordB are required." });
  }

  if (!ai) {
    return res.status(500).json({ error: "Gemini API is not configured." });
  }

  try {
    const prompt = `Explain the precise differences, nuances, and common mistakes when distinguishing between the confusing English words "${wordA}" and "${wordB}".
    
    This is for CAT aspirants, so focus on logical reasoning, exact shades of meaning, grammatical collocations, and typical traps examiners set.
    
    Return a clean JSON object with:
    1. "explanation": Comprehensive, highly descriptive markdown comparing both words.
    2. "differences": A list of short, high-impact bullet points explaining key differences.
    3. "examples": A list of comparison sentence pairs where both words are correctly vs incorrectly contrasted.
    
    Conform exactly to this schema.`;

    const comparisonSchema = {
      type: Type.OBJECT,
      properties: {
        explanation: { type: Type.STRING },
        differences: { type: Type.ARRAY, items: { type: Type.STRING } },
        examples: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["explanation", "differences", "examples"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: comparisonSchema,
      },
    });

    if (!response.text) {
      throw new Error("Empty response from word comparator.");
    }

    const comparisonData = JSON.parse(response.text.trim());
    res.json(comparisonData);
  } catch (err: any) {
    console.error("Gemini compare-words failure:", err);
    res.status(500).json({
      error: "Failed to compare words with AI. Details: " + (err.message || err),
    });
  }
});

// Mount the api router to handle local requests under /api and Netlify requests under /.netlify/functions/api
app.use("/api", apiRouter);
app.use("/.netlify/functions/api", apiRouter);

// Integrate Vite middleware in development or serve static assets in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CAT Dictionary Server] running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.NETLIFY) {
  startServer();
}

export default app;
