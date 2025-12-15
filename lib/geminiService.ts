import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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

function capitalizeFirstLetter(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
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

// Define JSON schemas for different question types
const baseQuestionSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    question: { type: SchemaType.STRING as const },
    options: { 
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const }
    },
    correctIndex: { type: SchemaType.INTEGER as const },
    clue: { type: SchemaType.STRING as const },
    explanation: { type: SchemaType.STRING as const }
  },
  required: ["question", "options", "correctIndex", "clue", "explanation"]
};

const readingQuestionSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    passage: { type: SchemaType.STRING as const },
    question: { type: SchemaType.STRING as const },
    options: { 
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const }
    },
    correctIndex: { type: SchemaType.INTEGER as const },
    clue: { type: SchemaType.STRING as const },
    explanation: { type: SchemaType.STRING as const }
  },
  required: ["passage", "question", "options", "correctIndex", "clue", "explanation"]
};

function getResponseSchema(includePassage: boolean = false) {
  return {
    type: SchemaType.OBJECT as const,
    properties: {
      questions: {
        type: SchemaType.ARRAY as const,
        items: includePassage ? readingQuestionSchema : baseQuestionSchema
      }
    },
    required: ["questions"]
  };
}

function getOptimizedModel(includePassage: boolean = false) {
  return genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      maxOutputTokens: 8000,
      temperature: 1.0,
      topP: 0.95,
      responseMimeType: "application/json",
      responseSchema: getResponseSchema(includePassage)
    }
  });
}

function validateAndFormatQuestions(parsed: any): Question[] {
  // Extract questions array
  const questions = parsed?.questions || [];

  if (!Array.isArray(questions)) {
    console.error("Response does not contain a questions array:", parsed);
    return [];
  }

  const validQuestions: Question[] = [];

  questions.forEach((q, idx) => {
    // Validate question structure
    if (
      typeof q.question !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      typeof q.correctIndex !== "number" ||
      q.correctIndex < 0 ||
      q.correctIndex > 3 ||
      typeof q.explanation !== "string" ||
      typeof q.clue !== "string"
    ) {
      console.warn(`⚠️ Skipping invalid question #${idx + 1}:`, {
        hasQuestion: typeof q.question === "string",
        hasOptions: Array.isArray(q.options),
        optionsLength: q.options?.length,
        validCorrectIndex: typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3,
        hasExplanation: typeof q.explanation === "string",
        hasClue: typeof q.clue === "string"
      });
      return;
    }

    // Add valid question with capitalization
    validQuestions.push({
      ...(q.passage && { passage: capitalizeFirstLetter(q.passage) }),
      question: capitalizeFirstLetter(q.question),
      options: q.options.map((opt: string) => capitalizeFirstLetter(opt)),
      explanation: capitalizeFirstLetter(q.explanation),
      clue: capitalizeFirstLetter(q.clue),
      correctIndex: q.correctIndex
    });
  });

  console.log(`✅ Validated ${validQuestions.length}/${questions.length} questions`);
  return validQuestions;
}

function vocabularyPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, questionCount: number = 15): string {
  return `Generate EXACTLY ${questionCount} vocabulary questions as a JSON object.

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Vocabulary Focus:
- Test vocabulary in context with fill-in-the-blank sentences
- Use context clues (contrast, definition, example) appropriate for ${level} level
- Connect questions to user interests with varied scenarios
- All words should be appropriate for ${level} learners

Return format:
{
  "questions": [
    {
      "question": "She was tired, ___ she went to bed early.",
      "options": ["but", "so", "because", "and"],
      "correctIndex": 1,
      "clue": "Look for a word that shows result or consequence.",
      "explanation": "The word 'so' shows the result of being tired."
    }
  ]
}

Generate ${questionCount} questions now.`;
}

function grammarPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, questionCount: number = 15): string {
  return `Generate EXACTLY ${questionCount} grammar questions as a JSON object.

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Grammar Focus:
- Fill-in-the-blank and error spotting activities
- Target subject-verb agreement, tense usage, verb forms
- Connect to learner's interests using different scenarios
- Appropriate for ${level} level learners

Return format:
{
  "questions": [
    {
      "question": "He ___ to the market yesterday.",
      "options": ["go", "goes", "went", "gone"],
      "correctIndex": 2,
      "clue": "Think about the past tense form of the verb.",
      "explanation": "The past tense of 'go' is 'went'."
    }
  ]
}

Generate ${questionCount} questions now.`;
}

function translationPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, questionCount: number = 15): string {
  return `Generate EXACTLY ${questionCount} Filipino to English translation questions as a JSON object.

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Translation Focus:
- Translate Filipino words or short phrases to English
- Age-appropriate everyday vocabulary
- Connect to learner's interests when possible

CRITICAL: Wrong answers must be COMPLETELY DIFFERENT from the correct answer
- DO NOT use synonyms (e.g., Stone/Rock/Pebble are all wrong)
- Use unrelated words from different categories
- Example: "Bato" → ["Tree", "Rock", "Water", "House"] ✓ (clearly different)

Return format:
{
  "questions": [
    {
      "question": "Translate to English: 'Aso'",
      "options": ["Cat", "Dog", "Bird", "Fish"],
      "correctIndex": 1,
      "clue": "This is a common pet that barks.",
      "explanation": "'Aso' means 'Dog' in English."
    }
  ]
}

Generate ${questionCount} questions now.`;
}

function sentenceConstructionPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, questionCount: number = 15): string {
  return `Generate EXACTLY ${questionCount} sentence construction questions as a JSON object.

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Sentence Construction Focus:
- Present jumbled words that need rearranging
- Test syntax, word order, and grammar flow
- Connect to learner's interests using different scenarios
- Appropriate for ${level} level learners

Return format:
{
  "questions": [
    {
      "question": "Rearrange these words to make a correct sentence: the dog brown big ran",
      "options": ["The dog brown big ran.", "Big brown the dog ran.", "The big brown dog ran.", "Dog ran the big brown."],
      "correctIndex": 2,
      "clue": "Remember: adjectives come before the noun they describe.",
      "explanation": "The correct sentence is 'The big brown dog ran.' because adjectives should precede the noun in proper order."
    }
  ]
}

Generate ${questionCount} questions now.`;
}

function readingComprehensionPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, questionCount: number = 15): string {
  return `Generate EXACTLY ${questionCount} reading comprehension questions as a JSON object.

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Reading Comprehension Focus:
- Short passages (2-4 sentences) tailored to interests
- Simple, age-appropriate, engaging for ${level} level
- Test main idea, details, inference, predictions
- Connect to learner's interests with varied stories

Return format:
{
  "questions": [
    {
      "passage": "Anna loves basketball. She practices every afternoon after school.",
      "question": "What does Anna do after school?",
      "options": ["Studies math", "Plays basketball", "Goes shopping", "Cooks dinner"],
      "correctIndex": 1,
      "clue": "Check what the passage says Anna does in the afternoon.",
      "explanation": "The passage says Anna practices basketball after school."
    }
  ]
}

ALL questions must include the passage field.
Generate ${questionCount} questions now.`;
}

async function generateQuiz(
  level: CEFRLevel,
  interests: string[],
  gameMode: string,
  difficulty: string,
  promptBuilder: (level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, questionCount: number) => string,
  questionCount: number = 15,
  includePassage: boolean = false
): Promise<Question[]> {
  const prompt = promptBuilder(level, interests, gameMode, difficulty, questionCount);
  const model = getOptimizedModel(includePassage);

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    
    // Parse JSON directly (no sanitization needed with JSON mode)
    const parsed = JSON.parse(rawText);
    const questions = validateAndFormatQuestions(parsed);

    if (questions.length !== questionCount) {
      console.warn(`Expected ${questionCount} questions, got ${questions.length}. Returning ${questions.length} valid questions.`);
    }

    return questions;
  } catch (error) {
    console.error("Failed to generate quiz:", error);
    return [];
  }
}

export function generateVocabulary(level: CEFRLevel, interests: string[], difficulty: string, questionCount: number = 15) {
  return generateQuiz(level, interests, "Vocabulary", difficulty, vocabularyPrompt, questionCount, false);
}

export function generateGrammar(level: CEFRLevel, interests: string[], difficulty: string, questionCount: number = 15) {
  return generateQuiz(level, interests, "Grammar", difficulty, grammarPrompt, questionCount, false);
}

export function generateTranslation(level: CEFRLevel, interests: string[], difficulty: string, questionCount: number = 15) {
  return generateQuiz(level, interests, "Translation", difficulty, translationPrompt, questionCount, false);
}

export function generateSentence(level: CEFRLevel, interests: string[], difficulty: string, questionCount: number = 15) {
  return generateQuiz(level, interests, "Sentence Construction", difficulty, sentenceConstructionPrompt, questionCount, false);
}

export function generateReading(level: CEFRLevel, interests: string[], difficulty: string, questionCount: number = 15) {
  return generateQuiz(level, interests, "Reading Comprehension", difficulty, readingComprehensionPrompt, questionCount, true);
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
        results[i + index] = null as any;
      }
      onProgress?.(completed, tasks.length);
    });
  }

  return results.filter(r => r !== null);
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

  return runWithConcurrencyLimit(tasks, 10, onProgress);
}

async function generateQuestionsByMode(
  gameMode: string,
  level: CEFRLevel,
  interest: string,
  difficulty: string,
  count: number
): Promise<Question[]> {
  if (gameMode === "Vocabulary") {
    return await generateVocabulary(level, [interest], difficulty, count);
  } else if (gameMode === "Grammar") {
    return await generateGrammar(level, [interest], difficulty, count);
  } else if (gameMode === "Translation") {
    return await generateTranslation(level, [interest], difficulty, count);
  } else if (gameMode === "Sentence Construction") {
    return await generateSentence(level, [interest], difficulty, count);
  } else if (gameMode === "Reading Comprehension") {
    return await generateReading(level, [interest], difficulty, count);
  } else {
    throw new Error(`Unsupported game mode: ${gameMode}`);
  }
}

export async function generateQuestionBatch(
  interest: string,
  level: CEFRLevel,
  gameMode: string,
  difficulty: string,
  totalQuestions: number = 50,
  onProgress?: (completed: number, total: number) => void
): Promise<Question[]> {
  console.log(`Generating ${totalQuestions} questions for ${interest} ${level} ${gameMode} (single attempt)`);

  try {
    const questions = await generateQuestionsByMode(
      gameMode,
      level,
      interest,
      difficulty,
      totalQuestions
    );

    console.log(`✅ Received ${questions.length}/${totalQuestions} valid questions from API`);
    onProgress?.(questions.length, totalQuestions);

    if (questions.length === totalQuestions) {
      console.log(`✅ Successfully generated all ${totalQuestions} questions`);
    } else if (questions.length > 0) {
      console.warn(`⚠️ Generated ${questions.length}/${totalQuestions} questions (partial batch - saving anyway)`);
    } else {
      console.error(`❌ No valid questions generated - saving empty result`);
    }

    return questions;
  } catch (error) {
    console.error(`❌ Failed to generate questions for ${interest} ${level} ${gameMode}:`, error);
    return [];
  }
}