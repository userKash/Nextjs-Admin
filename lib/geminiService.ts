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

function vocabularyPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, isRegeneration?: boolean, seed?: string): string {
  const regenerationNote = isRegeneration
    ? `\n\n🔄 REGENERATION MODE - CRITICAL INSTRUCTIONS:
- This is a REGENERATION request (Seed: ${seed})
- You MUST generate COMPLETELY DIFFERENT questions from any previous generation
- Use ENTIRELY NEW vocabulary words, contexts, and scenarios
- DO NOT repeat any questions or similar patterns from before
- Create fresh, unique content with different topics and word choices
- Vary the sentence structures and contexts significantly\n`
    : '';

  return `You are a quiz creator for EngliQuest. Generate EXACTLY 15 vocabulary questions.
${regenerationNote}
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

CRITICAL: CLUE VS EXPLANATION REQUIREMENTS
- The "clue" is a hint shown BEFORE the learner answers (to help them think)
- The "explanation" is shown AFTER answering (to teach why the answer is correct)
- NEVER repeat the clue content in the explanation
- The explanation should provide additional educational value beyond the hint
- BAD: clue="Look for result", explanation="Look for a word showing result" (repetitive!)
- GOOD: clue="Look for result", explanation="'So' indicates consequence and shows what happened because she was tired"

Example format (follow EXACTLY):
[
  {
    "question": "She was tired, ___ she went to bed early.",
    "options": ["but", "so", "because", "and"],
    "correctIndex": 1,
    "clue": "Look for a word that shows result or consequence.",
    "explanation": "'So' is a conjunction that indicates a result or consequence. Here, going to bed early is the result of being tired."
  }
]

IMPORTANT: Start your response with [ and end with ]. No text before or after.
Generate 15 questions now:`;
}

function grammarPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, isRegeneration?: boolean, seed?: string): string {
  const regenerationNote = isRegeneration
    ? `\n\n🔄 REGENERATION MODE - CRITICAL INSTRUCTIONS:
- This is a REGENERATION request (Seed: ${seed})
- You MUST generate COMPLETELY DIFFERENT questions from any previous generation
- Use ENTIRELY NEW grammar topics, sentence structures, and scenarios
- DO NOT repeat any questions or similar patterns from before
- Create fresh, unique content with different grammar focuses
- Vary the contexts and examples significantly\n`
    : '';

  return `You are a grammar quiz creator for EngliQuest. Generate EXACTLY 15 grammar questions.
${regenerationNote}
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

CRITICAL: CLUE VS EXPLANATION REQUIREMENTS
- The "clue" is a hint shown BEFORE the learner answers (to help them think)
- The "explanation" is shown AFTER answering (to teach why the answer is correct)
- NEVER repeat the clue content in the explanation
- The explanation should provide additional educational value beyond the hint
- BAD: clue="Think about past tense", explanation="Use past tense form" (repetitive!)
- GOOD: clue="Think about past tense", explanation="'Went' is the simple past form of 'go', used with 'yesterday' to indicate a completed action"

Example format (follow EXACTLY):
[
  {
    "question": "He ___ to the market yesterday.",
    "options": ["go", "goes", "went", "gone"],
    "correctIndex": 2,
    "clue": "Think about the past tense form of the verb.",
    "explanation": "'Went' is the simple past tense of 'go'. We use it with time markers like 'yesterday' to describe completed actions in the past."
  }
]

IMPORTANT: Start your response with [ and end with ]. No text before or after.
Generate 15 questions now:`;
}

function translationPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, isRegeneration?: boolean, seed?: string): string {
  const regenerationNote = isRegeneration
    ? `\n\n🔄 REGENERATION MODE - CRITICAL INSTRUCTIONS:
- This is a REGENERATION request (Seed: ${seed})
- You MUST generate COMPLETELY DIFFERENT questions from any previous generation
- Use ENTIRELY NEW Filipino words and phrases to translate
- DO NOT repeat any questions or similar translations from before
- Create fresh, unique content with different vocabulary
- Vary the word categories and contexts significantly\n`
    : '';

  return `You are a translation quiz creator for EngliQuest. Generate EXACTLY 15 Filipino to English translation questions.
${regenerationNote}
CRITICAL JSON REQUIREMENTS:
- Return ONLY a valid JSON array
- NO markdown, NO code blocks, NO extra text
- Start with [ and end with ]
- EXACTLY 15 questions
- Each question MUST have: question, options (array of 4 strings), correctIndex (0-3), clue, explanation

Target: ${level} (${getLevelGuidelines(level)}) | Difficulty: ${difficulty}
Interests: ${interests.join(", ")}

Translation Focus:
- CRITICAL TRANSLATION DIRECTION: Filipino → English ONLY (NOT English → Filipino)
- The question MUST present a FILIPINO word or phrase to be translated INTO ENGLISH
- NEVER ask to translate an English word into Filipino
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

QUESTION FORMAT REQUIREMENTS:
- ALWAYS use this EXACT format: "Translate to English: '[Filipino word/phrase]'"
- The Filipino word/phrase MUST be inside single quotes
- Use proper capitalization: "English" (not "english")
- NEVER reverse the direction (e.g., "Translate into Filipino: 'run'" is WRONG)

CRITICAL: CLUE VS EXPLANATION REQUIREMENTS
- The "clue" is a hint shown BEFORE the learner answers (to help them think)
- The "explanation" is shown AFTER answering (to teach why the answer is correct)
- NEVER repeat the clue content in the explanation
- The explanation should provide additional educational value beyond the hint
- BAD: clue="This is a pet that barks", explanation="This is a pet that barks" (repetitive!)
- GOOD: clue="This is a common pet that barks", explanation="'Aso' is the Filipino word for 'Dog', a domesticated animal known for barking and loyalty"

Example format (follow EXACTLY):
[
  {
    "question": "Translate to English: 'Aso'",
    "options": ["Cat", "Dog", "Bird", "Fish"],
    "correctIndex": 1,
    "clue": "This is a common pet that barks.",
    "explanation": "'Aso' is the Filipino word for 'Dog', a domesticated animal often kept as a pet and companion."
  },
  {
    "question": "Translate to English: 'Bahay'",
    "options": ["School", "House", "Park", "Store"],
    "correctIndex": 1,
    "clue": "This is where people live.",
    "explanation": "'Bahay' means 'House' in English. It refers to a building where people reside or make their home."
  },
  {
    "question": "Translate to English: 'Tubig'",
    "options": ["Food", "Air", "Water", "Fire"],
    "correctIndex": 2,
    "clue": "This is a liquid you drink.",
    "explanation": "'Tubig' translates to 'Water' in English. It is an essential liquid necessary for human survival and hydration."
  }
]

IMPORTANT: Start your response with [ and end with ]. No text before or after.
Generate 15 questions now:`;
}

function sentenceConstructionPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, isRegeneration?: boolean, seed?: string): string {
  const regenerationNote = isRegeneration
    ? `\n\n🔄 REGENERATION MODE - CRITICAL INSTRUCTIONS:
- This is a REGENERATION request (Seed: ${seed})
- You MUST generate COMPLETELY DIFFERENT questions from any previous generation
- Use ENTIRELY NEW word combinations and sentence structures
- DO NOT repeat any questions or similar patterns from before
- Create fresh, unique content with different topics and word sets
- Vary the complexity and themes significantly\n`
    : '';

  return `You are a sentence construction quiz creator for EngliQuest. Generate EXACTLY 15 questions.
${regenerationNote}
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

CRITICAL: ENSURE ONLY ONE CORRECT ANSWER
- Design word sets so that ONLY ONE grammatically correct sentence can be formed
- AVOID ambiguous word sets where multiple valid arrangements exist
- BAD example: ['a', 'wizard', 'cast', 'a', 'powerful', 'spell'] - Can make "A powerful wizard cast a spell" OR "A wizard cast a powerful spell" (both correct!)
- GOOD example: ['the', 'dog', 'brown', 'big', 'ran'] - Only "The big brown dog ran" is correct (adjective order matters)
- Test your word set: if you can rearrange it into 2+ grammatically correct sentences with different meanings, REJECT it
- Use articles (the/a), prepositions, and word order rules that enforce ONE specific arrangement
- Wrong answer options should be clearly incorrect (wrong word order, grammar errors, nonsensical)

ADDITIONAL GUIDELINES:
- Avoid duplicate articles (like two 'a's) that could modify different nouns
- Use specific determiners like 'the' instead of multiple indefinite articles
- Include prepositional phrases or specific verb forms that lock word positions
- Make sure adjectives have clear noun targets and can't be moved around

CRITICAL: CLUE VS EXPLANATION REQUIREMENTS
- The "clue" is a hint shown BEFORE the learner answers (to help them think)
- The "explanation" is shown AFTER answering (to teach why the answer is correct)
- NEVER repeat the clue content in the explanation
- The explanation should provide additional educational value beyond the hint
- BAD: clue="Subject first, verb second", explanation="Put subject first and verb second" (repetitive!)
- GOOD: clue="Subject comes first, then verb", explanation="In English, sentences follow SVO (Subject-Verb-Object) order. 'The cat' is the subject performing the action"

Example format (follow EXACTLY):
[
  {
    "question": "Rearrange the words: ['the', 'dog', 'brown', 'big', 'ran']",
    "options": ["The dog brown big ran.", "Big brown the dog ran.", "The big brown dog ran.", "Dog ran the big brown."],
    "correctIndex": 2,
    "clue": "Adjectives go before the noun in a specific order: size before color.",
    "explanation": "In English, multiple adjectives follow a specific order: opinion, size, age, shape, color. Here, 'big' (size) comes before 'brown' (color), both before the noun 'dog'."
  },
  {
    "question": "Rearrange the words: ['quickly', 'the', 'runs', 'cat', 'very']",
    "options": ["The cat runs very quickly.", "Very quickly the cat runs.", "The runs cat very quickly.", "Quickly very the cat runs."],
    "correctIndex": 0,
    "clue": "The subject comes first, then the verb, then adverbs.",
    "explanation": "English follows Subject-Verb-Object word order. 'Very' is an adverb modifying 'quickly', and adverb phrases typically come after the verb they modify."
  }
]

IMPORTANT: Start your response with [ and end with ]. No text before or after.
Generate 15 questions now:`;
}

function readingComprehensionPrompt(level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, isRegeneration?: boolean, seed?: string): string {
  const regenerationNote = isRegeneration
    ? `\n\n🔄 REGENERATION MODE - CRITICAL INSTRUCTIONS:
- This is a REGENERATION request (Seed: ${seed})
- You MUST generate COMPLETELY DIFFERENT questions from any previous generation
- Use ENTIRELY NEW passages with different characters, stories, and scenarios
- DO NOT repeat any questions, passages, or similar storylines from before
- Create fresh, unique content with different plots and themes
- Vary the reading topics and comprehension questions significantly\n`
    : '';

  return `You are a reading comprehension quiz creator for EngliQuest. Generate EXACTLY 15 questions.
${regenerationNote}
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

CRITICAL: CLUE VS EXPLANATION REQUIREMENTS
- The "clue" is a hint shown BEFORE the learner answers (to help them think)
- The "explanation" is shown AFTER answering (to teach why the answer is correct)
- NEVER repeat the clue content in the explanation
- The explanation should provide additional educational value beyond the hint
- BAD: clue="Check what Anna does", explanation="Check what Anna does in the passage" (repetitive!)
- GOOD: clue="Check what Anna does in the afternoon", explanation="The second sentence states 'She practices every afternoon after school,' which refers to basketball practice"

Example format (follow EXACTLY):
[
  {
    "passage": "Anna loves basketball. She practices every afternoon after school.",
    "question": "What does Anna do after school?",
    "options": ["Studies math", "Plays basketball", "Goes shopping", "Cooks dinner"],
    "correctIndex": 1,
    "clue": "Check what the passage says Anna does in the afternoon.",
    "explanation": "The passage explicitly states 'She practices every afternoon after school.' The word 'She' refers to Anna, and her practice is for basketball, as mentioned in the first sentence."
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
  promptBuilder: (level: CEFRLevel, interests: string[], gameMode: string, difficulty: string, isRegeneration?: boolean, seed?: string) => string,
  isRegeneration: boolean = false
): Promise<Question[]> {
  const seed = Date.now().toString() + Math.random().toString(36).substring(7);
  const prompt = promptBuilder(level, interests, gameMode, difficulty, isRegeneration, seed);
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

export function generateVocabulary(level: CEFRLevel, interests: string[], difficulty: string, isRegeneration: boolean = false) {
  return generateQuiz(level, interests, "Vocabulary", difficulty, vocabularyPrompt, isRegeneration);
}
export function generateGrammar(level: CEFRLevel, interests: string[], difficulty: string, isRegeneration: boolean = false) {
  return generateQuiz(level, interests, "Grammar", difficulty, grammarPrompt, isRegeneration);
}
export function generateTranslation(level: CEFRLevel, interests: string[], difficulty: string, isRegeneration: boolean = false) {
  return generateQuiz(level, interests, "Translation", difficulty, translationPrompt, isRegeneration);
}
export function generateSentence(level: CEFRLevel, interests: string[], difficulty: string, isRegeneration: boolean = false) {
  return generateQuiz(level, interests, "Sentence Construction", difficulty, sentenceConstructionPrompt, isRegeneration);
}
export function generateReading(level: CEFRLevel, interests: string[], difficulty: string, isRegeneration: boolean = false) {
  return generateQuiz(level, interests, "Reading Comprehension", difficulty, readingComprehensionPrompt, isRegeneration);
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
    
    if (i + limit < tasks.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

export async function createPersonalizedQuizClient(
  userId: string,
  level: CEFRLevel,
  interests: string[],
  gameMode: string,
  difficulty: string,
  isRegeneration: boolean = false
): Promise<{ quizId: string; questions: Question[] }> {
  let questions: Question[];

  if (gameMode === "Vocabulary") {
    questions = await generateVocabulary(level, interests, difficulty, isRegeneration);
  } else if (gameMode === "Grammar") {
    questions = await generateGrammar(level, interests, difficulty, isRegeneration);
  } else if (gameMode === "Translation") {
    questions = await generateTranslation(level, interests, difficulty, isRegeneration);
  } else if (gameMode === "Sentence Construction") {
    questions = await generateSentence(level, interests, difficulty, isRegeneration);
  } else if (gameMode === "Reading Comprehension") {
    questions = await generateReading(level, interests, difficulty, isRegeneration);
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

  return runWithConcurrencyLimit(tasks, 5, onProgress);
}