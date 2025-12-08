import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface Question {
  passage?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  clue: string;
}

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

function cleanJSONResponse(raw: string): string {
  return raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1").trim();
}

function sanitizeJSON(raw: string): string {
  let fixed = cleanJSONResponse(raw);
  fixed = fixed.replace(/\]\s*\[/g, ",");
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");
  fixed = fixed.replace(/[""]/g, '"').replace(/['']/g, "'");
  return fixed;
}

function capitalizeFirstLetter(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function extractQuestions(parsed: any): Question[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed?.quiz && Array.isArray(parsed.quiz)) return parsed.quiz;
  if (parsed?.questions && Array.isArray(parsed.questions)) return parsed.questions;
  return [];
}

function validateAndFormatQuestions(raw: string): Question[] {
  const cleaned = sanitizeJSON(raw);
  let parsed: any;

  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse failed. Raw Gemini output:", cleaned);

    const matches = cleaned.match(/\[[\s\S]*\]/);
    if (matches) {
      try {
        const recovered = matches[0].replace(/,\s*([}\]])/g, "$1");
        parsed = JSON.parse(recovered);
      } catch (err2) {
        throw new Error("Gemini returned unrecoverable JSON");
      }
    } else {
      throw new Error("Gemini returned invalid JSON");
    }
  }

  const questions = extractQuestions(parsed);

  if (!Array.isArray(questions)) {
    console.error("Gemini response is not an array:", parsed);
    throw new Error("Invalid quiz format from Gemini API");
  }

  return questions.map((q, idx) => {
    const normalizedQuestion = Array.isArray(q.question)
      ? q.question.join(" ")
      : q.question;

    if (
      typeof normalizedQuestion !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      typeof q.correctIndex !== "number" ||
      typeof q.explanation !== "string" ||
      typeof q.clue !== "string"
    ) {
      console.error(`Invalid format at question #${idx + 1}:`, q);
      throw new Error("Invalid question format from Gemini API");
    }

    return {
      ...q,
      question: capitalizeFirstLetter(normalizedQuestion),
      options: q.options.map((opt: string) => capitalizeFirstLetter(opt)),
      explanation: capitalizeFirstLetter(q.explanation),
      clue: capitalizeFirstLetter(q.clue),
    };
  });
}

function getLevelDescription(level: CEFRLevel): string {
  switch (level) {
    case "A1": return "Beginner (Elementary English learners)";
    case "A2": return "Elementary (Pre-intermediate English learners)";
    case "B1": return "Threshold (Intermediate English learners)";
    case "B2": return "Vantage (Upper-intermediate English learners)";
    case "C1": return "Effective Operational Proficiency (Advanced English learners)";
    case "C2": return "Mastery (Proficient English users)";
  }
}

function getLevelGuidelines(level: CEFRLevel): string {
  switch (level) {
    case "A1": return "simple grammar, everyday words, short explanations";
    case "A2": return "slightly more complex grammar, basic connectors, everyday contexts";
    case "B1": return "intermediate grammar, common idioms, workplace/school contexts, more detail in explanations";
    case "B2": return "upper-intermediate grammar, academic/workplace vocabulary, longer explanations with nuance";
    case "C1": return "advanced grammar, complex idioms, academic and professional vocabulary, nuanced explanations";
    case "C2": return "near-native proficiency, highly precise vocabulary, academic/technical contexts, very detailed explanations";
  }
}

function vocabularyPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string): string {
  return `You are a quiz creator for EngliQuest. Generate EXACTLY 15 vocabulary questions.

CRITICAL JSON REQUIREMENTS:
- Return ONLY a valid JSON array
- NO markdown, NO code blocks, NO extra text
- Start with [ and end with ]
- EXACTLY 15 questions
- Each question MUST have: question, options (array of 4 strings), correctIndex (0-3), clue, explanation

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Vocabulary Focus:
- Vocabulary refers to a learner's understanding and correct use of words
- Questions must test vocabulary in context, where learners choose the correct word to complete a sentence
- Use context clues (e.g., contrast, definition, or example clues) to guide learners
- All sentences and words should be appropriate for ${level} level learners
- Each question connects to user interests with varied scenarios

Example format (follow EXACTLY):
[
  {
    "question": "She was tired, ___ she went to bed early.",
    "options": ["but", "so", "because", "and"],
    "correctIndex": 1,
    "clue": "Look for a word that shows result or consequence.",
    "explanation": "The word 'so' shows the result of being tired."
  }
]

IMPORTANT: Start your response with [ and end with ]. No text before or after.
Generate 15 questions now:`;
}

function grammarPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string): string {
  return `You are a grammar quiz creator for EngliQuest. Generate EXACTLY 15 grammar questions.

CRITICAL JSON REQUIREMENTS:
- Return ONLY a valid JSON array
- NO markdown, NO code blocks, NO extra text
- Start with [ and end with ]
- EXACTLY 15 questions
- Each question MUST have: question, options (array of 4 strings), correctIndex (0-3), clue, explanation

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Grammar Focus:
- Grammar is the way words are put together to make correct sentences
- Activities: Fill-in-the-blank and Error Spotting
- Target common grammar issues like subject-verb agreement, tense usage, and misuse/omission of verbs
- Learners should practice identifying and correcting errors
- Each question must tie back to the learner's interests when possible, using different scenarios

Example format (follow EXACTLY):
[
  {
    "question": "He ___ to the market yesterday.",
    "options": ["go", "goes", "went", "gone"],
    "correctIndex": 2,
    "clue": "Think about the past tense form of the verb.",
    "explanation": "The past tense of 'go' is 'went'."
  }
]

IMPORTANT: Start your response with [ and end with ]. No text before or after.
Generate 15 questions now:`;
}

function translationPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string): string {
  return `You are a translation quiz creator for EngliQuest. Generate EXACTLY 15 Filipino to English translation questions.

CRITICAL JSON REQUIREMENTS:
- Return ONLY a valid JSON array
- NO markdown, NO code blocks, NO extra text
- Start with [ and end with ]
- EXACTLY 15 questions
- Each question MUST have: question, options (array of 4 strings), correctIndex (0-3), clue, explanation

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Translation Focus:
- Learners must translate Filipino words or short phrases into English
- Activities: Word or short-phrase translation (input-based recall)
- Encourage bilingual development by reinforcing both Filipino and English
- Questions should connect to the learner's interests when possible
- Keep translations age-appropriate and aligned with everyday vocabulary

CRITICAL: AVOID SYNONYM ANSWERS
- Each option must be DISTINCTLY DIFFERENT from the others
- DO NOT include synonyms or similar meanings in the options
- BAD example: "Bato" with options ["Stone", "Rock", "Pebble", "Boulder"] - these are all synonyms!
- GOOD example: "Bato" with options ["Tree", "Rock", "Water", "House"] - clearly different meanings
- Wrong answers should be completely unrelated words from different categories
- This ensures only ONE correct answer without confusion

Example format (follow EXACTLY):
[
  {
    "question": "Translate to English: 'Aso'",
    "options": ["Cat", "Dog", "Bird", "Fish"],
    "correctIndex": 1,
    "clue": "This is a common pet that barks.",
    "explanation": "'Aso' means 'Dog' in English."
  }
]

IMPORTANT: Start your response with [ and end with ]. No text before or after.
Generate 15 questions now:`;
}

function sentenceConstructionPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string): string {
  return `You are a sentence construction quiz creator for EngliQuest. Generate EXACTLY 15 questions.

CRITICAL JSON REQUIREMENTS:
- Return ONLY a valid JSON array
- NO markdown, NO code blocks, NO extra text
- Start with [ and end with ]
- EXACTLY 15 questions
- Each question MUST have: question, options (array of 4 strings), correctIndex (0-3), clue, explanation

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Sentence Construction Focus:
- A sentence is a grammatically complete string of words expressing a complete thought
- Learners often struggle with verb tenses, capitalization, and punctuation errors
- Sentence Construction mode presents jumbled words that learners must rearrange into grammatically correct sentences
- This helps learners improve syntax, word order, and logical flow of English grammar
- Each question must tie back to the learner's interests when possible, using different scenarios

Example format (follow EXACTLY):
[
  {
    "question": "Rearrange the words: ['the', 'dog', 'brown', 'big', 'ran']",
    "options": ["The dog brown big ran.", "Big brown the dog ran.", "The big brown dog ran.", "Dog ran the big brown."],
    "correctIndex": 2,
    "clue": "Remember: adjectives come before the noun they describe.",
    "explanation": "The correct sentence is 'The big brown dog ran.' because adjectives should precede the noun in proper order."
  }
]

IMPORTANT: Start your response with [ and end with ]. No text before or after.
Generate 15 questions now:`;
}

function readingComprehensionPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string): string {
  return `You are a reading comprehension quiz creator for EngliQuest. Generate EXACTLY 15 questions.

CRITICAL JSON REQUIREMENTS:
- Return ONLY a valid JSON array
- NO markdown, NO code blocks, NO extra text, NO explanations before or after
- Start your response with [ and end with ]
- EXACTLY 15 questions
- Each question MUST have ALL these fields: passage, question, options (array of 4 strings), correctIndex (0-3), clue, explanation
- All text must be properly escaped (use \\n for line breaks if needed)
- No trailing commas after last item

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Reading Comprehension Focus:
- Learners will read short passages tailored to their interests
- Passages must be simple, age-appropriate, and engaging for ${level} level
- Each passage should be 2-4 sentences long
- Questions should check understanding of main idea, details, inference, and "what happens next"
- Questions must tie back to the learner's interests when possible, using different stories and characters

Example format (follow EXACTLY):
[
  {
    "passage": "Anna loves basketball. She practices every afternoon after school.",
    "question": "What does Anna do after school?",
    "options": ["Studies math", "Plays basketball", "Goes shopping", "Cooks dinner"],
    "correctIndex": 1,
    "clue": "Check what the passage says Anna does in the afternoon.",
    "explanation": "The passage says Anna practices basketball after school."
  }
]

IMPORTANT: 
- Do NOT add any text before the opening bracket [
- Do NOT add any text after the closing bracket ]
- Do NOT use markdown code blocks
- Generate 15 questions following this exact structure

Generate 15 questions now:`;
}

function getOptimizedModel() {
  return genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      maxOutputTokens: 4000,
      temperature: 1.0,
      topP: 0.95,
    }
  });
}

async function generateQuiz(
  level: CEFRLevel,
  interests: string[],
  gameMode: string,
  difficulty: string,
  promptBuilder: (level: CEFRLevel, interests: string[], gameMode: string, difficulty: string) => string
): Promise<Question[]> {
  const prompt = promptBuilder(level, interests, gameMode, difficulty);
  const model = getOptimizedModel();

  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const questions = validateAndFormatQuestions(rawText);
    
    if (questions.length !== 15) {
      console.warn(`Expected 15 questions, got ${questions.length}. Retrying...`);
      throw new Error(`Invalid question count: ${questions.length}`);
    }
    
    return questions;
  }, 3, 1000);
}

export function generateVocabulary(level: CEFRLevel, interests: string[], difficulty: string) {
  return generateQuiz(level, interests, "Vocabulary", difficulty, vocabularyPrompt);
}
export function generateGrammar(level: CEFRLevel, interests: string[], difficulty: string) {
  return generateQuiz(level, interests, "Grammar", difficulty, grammarPrompt);
}
export function generateTranslation(level: CEFRLevel, interests: string[], difficulty: string) {
  return generateQuiz(level, interests, "Translation", difficulty, translationPrompt);
}
export function generateSentence(level: CEFRLevel, interests: string[], difficulty: string) {
  return generateQuiz(level, interests, "Sentence Construction", difficulty, sentenceConstructionPrompt);
}
export function generateReading(level: CEFRLevel, interests: string[], difficulty: string) {
  return generateQuiz(level, interests, "Reading Comprehension", difficulty, readingComprehensionPrompt);
}

export async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onProgress?: (completed: number, total: number) => void
): Promise<T[]> {
  const results: T[] = [];
  let completed = 0;
  
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit);
    const batchResults = await Promise.allSettled(
      batch.map(task => task())
    );
    
    batchResults.forEach((result, index) => {
      completed++;
      if (result.status === 'fulfilled') {
        results[i + index] = result.value;
      } else {
        console.error(`Task ${i + index} failed:`, result.reason);
        throw result.reason;
      }
      onProgress?.(completed, tasks.length);
    });

  }
  
  return results;
}

export async function createPersonalizedQuizClient(
  userId: string,
  level: CEFRLevel,
  interests: string[],
  gameMode: string,
  difficulty: string
): Promise<{ quizId: string; questions: Question[] }> {
  let questions: Question[];

  if (gameMode === "Vocabulary") {
    questions = await generateVocabulary(level, interests, difficulty);
  } else if (gameMode === "Grammar") {
    questions = await generateGrammar(level, interests, difficulty);
  } else if (gameMode === "Translation") {
    questions = await generateTranslation(level, interests, difficulty);
  } else if (gameMode === "Sentence Construction") {
    questions = await generateSentence(level, interests, difficulty);
  } else if (gameMode === "Reading Comprehension") {
    questions = await generateReading(level, interests, difficulty);
  } else {
    throw new Error(`Unsupported game mode: ${gameMode}`);
  }

  const quizId = `${userId}_${Date.now()}_${gameMode}`;
  return { quizId, questions };
}

export async function generateAllQuizzes(
  userId: string,
  interests: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Array<{ quizId: string; questions: Question[]; metadata: any }>> {
  const quizPlan = [
    { level: "A1", difficulty: "easy", gameMode: "Vocabulary" },
    { level: "A2", difficulty: "easy", gameMode: "Vocabulary" },
    { level: "B1", difficulty: "medium", gameMode: "Vocabulary" },
    { level: "B2", difficulty: "medium", gameMode: "Vocabulary" },
    { level: "C1", difficulty: "hard", gameMode: "Vocabulary" },
    { level: "C2", difficulty: "hard", gameMode: "Vocabulary" },
    { level: "A1", difficulty: "easy", gameMode: "Grammar" },
    { level: "A2", difficulty: "easy", gameMode: "Grammar" },
    { level: "B1", difficulty: "medium", gameMode: "Grammar" },
    { level: "B2", difficulty: "medium", gameMode: "Grammar" },
    { level: "C1", difficulty: "hard", gameMode: "Grammar" },
    { level: "C2", difficulty: "hard", gameMode: "Grammar" },
    { level: "A1", difficulty: "easy", gameMode: "Translation" },
    { level: "A2", difficulty: "easy", gameMode: "Translation" },
    { level: "B1", difficulty: "medium", gameMode: "Translation" },
    { level: "B2", difficulty: "medium", gameMode: "Translation" },
    { level: "C1", difficulty: "hard", gameMode: "Translation" },
    { level: "C2", difficulty: "hard", gameMode: "Translation" },
    { level: "A1", difficulty: "easy", gameMode: "Sentence Construction" },
    { level: "A2", difficulty: "easy", gameMode: "Sentence Construction" },
    { level: "B1", difficulty: "medium", gameMode: "Sentence Construction" },
    { level: "B2", difficulty: "medium", gameMode: "Sentence Construction" },
    { level: "C1", difficulty: "hard", gameMode: "Sentence Construction" },
    { level: "C2", difficulty: "hard", gameMode: "Sentence Construction" },
    { level: "A1", difficulty: "easy", gameMode: "Reading Comprehension" },
    { level: "A2", difficulty: "easy", gameMode: "Reading Comprehension" },
    { level: "B1", difficulty: "medium", gameMode: "Reading Comprehension" },
    { level: "B2", difficulty: "medium", gameMode: "Reading Comprehension" },
    { level: "C1", difficulty: "hard", gameMode: "Reading Comprehension" },
    { level: "C2", difficulty: "hard", gameMode: "Reading Comprehension" },
  ];

  const tasks = quizPlan.map(({ level, difficulty, gameMode }) => 
    async () => {
      const result = await createPersonalizedQuizClient(
        userId,
        level as CEFRLevel,
        interests,
        gameMode,
        difficulty
      );
      return {
        ...result,
        metadata: { level, difficulty, gameMode }
      };
    }
  );

  // Increase concurrency from 5 to 10 for faster generation
  return runWithConcurrencyLimit(tasks, 10, onProgress);
}