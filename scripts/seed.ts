import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as path from "path";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const serviceAccount = require(
    path.resolve(process.cwd(), "service-account.json")
  );

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();
const batch = db.batch();

// Helper to create timestamps
const now = Timestamp.now();

// -----------------------------
// Journeys (v2) — aligned to 4 layers
// Foundation (1–5), Expansion (6–15), Expression (16–25), Mastery (26–30)
// -----------------------------

const journeys = [
  // FOUNDATION (1–5)
  {
    id: "journey-1",
    title: "Awakening Curiosity with AI",
    slug: "awakening-curiosity-with-ai",
    layer: "Foundation",
    category: "Journey",
    emotionShift: "Fear → Curiosity",
    summary: "Make AI feel human, safe, and magical — not technical.",
    description:
      "Emotional safety & wonder. What AI is (and isn’t), how to talk to it like a human, ask better questions, and enjoy your first guided play session.",
    order: 1,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j1.jpg",
    estimatedMinutes: 45,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-2",
    title: "The Language of Prompts",
    slug: "the-language-of-prompts",
    layer: "Foundation",
    category: "Journey",
    emotionShift: "Confusion → Clarity",
    summary: "Build a real skill set for effective prompting.",
    description:
      "Prompt fundamentals, roles (system vs user), everyday templates, iteration, building a personal prompt library, and heart-led boundaries.",
    order: 2,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j2.jpg",
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-3",
    title: "Vibe Coding — The New Creative Literacy",
    slug: "vibe-coding-the-new-creative-literacy",
    layer: "Foundation",
    category: "Journey",
    emotionShift: "Passivity → Play",
    summary: "Reframe coding as vibe‑based creative collaboration.",
    description:
      "Turn ideas into clear instructions, structure complex tasks, debug with AI, build small demos, and design with vibe, vision, and intuition.",
    order: 3,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j3.jpg",
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-4",
    title: "Working & Creating with AI",
    slug: "working-and-creating-with-ai",
    layer: "Foundation",
    category: "Journey",
    emotionShift: "Uncertainty → Empowerment",
    summary: "Apply skills in real‑world contexts.",
    description:
      "AI for work and creativity: writing, design, research, entrepreneurship, and ethical team collaboration.",
    order: 4,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j4.jpg",
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-5",
    title: "The Human Expansion",
    slug: "the-human-expansion",
    layer: "Foundation",
    category: "Journey",
    emotionShift: "Surface → Depth",
    summary: "Anchor emotional intelligence, ethics, and long‑term vision.",
    description:
      "Staying conscious with AI, digital boundaries, self‑expression, curiosity as philosophy, future of work, and building an AI practice for life.",
    order: 5,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j5.jpg",
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
  },

  // EXPANSION (6–15)
  {
    id: "journey-6",
    title: "AI Thinking — How Machines Perceive the World",
    slug: "ai-thinking-how-machines-perceive-the-world",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Reaction → Perspective",
    summary: "From rules to reasoning; empathy for machines & self.",
    description:
      "Limits of LLMs, human/machine cognitive bias, and how to think like AI without losing your humanity.",
    order: 6,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j6.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-7",
    title: "Emotional Design — Creating with Feelings",
    slug: "emotional-design-creating-with-feelings",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Logic → Empathy",
    summary: "Design tone, warmth, and empathy into experiences.",
    description:
      "Emotion in digital experiences, tone design in prompts, sensing emotional patterns, and co‑creating emotionally intelligent stories and apps.",
    order: 7,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j7.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-8",
    title: "The Architecture of Ideas",
    slug: "the-architecture-of-ideas",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Chaos → Clarity",
    summary: "Use AI as a second brain; store & structure curiosity.",
    description:
      "Idea capture and distillation, knowledge graphs, concept mapping, and turning curiosity into IP.",
    order: 8,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j8.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-9",
    title: "The Art of AI Storytelling",
    slug: "the-art-of-ai-storytelling",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Telling → Feeling",
    summary: "Fuse imagination and technology into narrative mastery.",
    description:
      "Narrative design for humans + machines, world‑building, archetypes and emotion, and the ethics of co‑authorship.",
    order: 9,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j9.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-10",
    title: "The Designer’s Mind",
    slug: "the-designers-mind",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Seeing → Shaping",
    summary: "Express ideas visually through AI design systems.",
    description:
      "Thinking in interfaces, prompt‑to‑design workflows, iterative prototyping, and human‑centered design with AI feedback loops.",
    order: 10,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j10.jpg",
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-11",
    title: "The Product Creator’s Toolkit",
    slug: "the-product-creators-toolkit",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Dreaming → Doing",
    summary: "Turn ideas into solo MVPs with AI.",
    description:
      "Idea → MVP, automating early tasks (copy, UX, pitch, tests), feedback & analytics loops, and emotional value design.",
    order: 11,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j11.jpg",
    estimatedMinutes: 65,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-12",
    title: "The Voice of Authenticity",
    slug: "the-voice-of-authenticity",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Mimicry → Authenticity",
    summary: "Write and communicate with a soul‑true voice.",
    description:
      "Reclaim your voice, AI‑assisted writing that keeps your soul intact, tone calibration, and the courage to publish.",
    order: 12,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j12.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-13",
    title: "Mindful Productivity with AI",
    slug: "mindful-productivity-with-ai",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Rush → Rhythm",
    summary: "Work smarter without burnout.",
    description:
      "Move from speed to alignment, offload cognitive load, energy‑aware workflows, and digital pause rituals.",
    order: 13,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j13.jpg",
    estimatedMinutes: 45,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-14",
    title: "Collective Intelligence",
    slug: "collective-intelligence",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Isolation → Synergy",
    summary: "Co‑create with others using AI.",
    description:
      "Group prompting and knowledge pooling, swarm intelligence workflows, and building AI teams that learn together.",
    order: 14,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j14.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-15",
    title: "The Quantum of Creativity",
    slug: "the-quantum-of-creativity",
    layer: "Expansion",
    category: "Journey",
    emotionShift: "Linear → Multidimensional",
    summary: "See creativity as an interconnected field, not a task.",
    description:
      "Non‑linear brainstorming, blending domains (art + science + psychology), and breaking stagnation with AI.",
    order: 15,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j15.jpg",
    estimatedMinutes: 50,
    createdAt: now,
    updatedAt: now,
  },

  // EXPRESSION (16–25)
  {
    id: "journey-16",
    title: "Soulful Automation",
    slug: "soulful-automation",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Control → Trust",
    summary: "Design systems that free, not trap.",
    description:
      "Human‑centered automation, when to delegate vs be present, and building your first ‘soul automation’.",
    order: 16,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j16.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-17",
    title: "The Mentor Mindset",
    slug: "the-mentor-mindset",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Dependency → Self‑trust",
    summary: "Teach AI to teach you; build companions.",
    description:
      "Custom learning companions, micro‑courses with AI, and reflective practice loops.",
    order: 17,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j17.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-18",
    title: "Digital Alchemy",
    slug: "digital-alchemy",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Consumption → Creation",
    summary: "Transmute knowledge into beauty and insight.",
    description:
      "Use AI to mix mediums (text → image → sound), synthesize across fields, and turn information into art.",
    order: 18,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j18.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-19",
    title: "Empathy Engineering",
    slug: "empathy-engineering",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Detachment → Connection",
    summary: "Design emotionally safe AI experiences.",
    description:
      "Emotion in personas and interfaces, safety patterns, bias detection and correction, and soulful UX.",
    order: 19,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j19.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-20",
    title: "The Intuitive Coder",
    slug: "the-intuitive-coder",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Fear → Flow",
    summary: "Think in logic + intuition with AI co‑coding.",
    description:
      "Prompt → code → feedback → iterate loops, visualizing algorithms, and creative, safe co‑coding.",
    order: 20,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j20.jpg",
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-21",
    title: "The Imagination Lab",
    slug: "the-imagination-lab",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Chaos → Experimentation",
    summary: "Turn sparks into structured play.",
    description:
      "Constraint as catalyst, reimagining ordinary tools, experimentation cycles, and capturing insights before they fade.",
    order: 21,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j21.jpg",
    estimatedMinutes: 50,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-22",
    title: "The AI Creator’s Ethics",
    slug: "the-ai-creators-ethics",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Indulgence → Responsibility",
    summary: "Conscious creation in a synthetic world.",
    description:
      "Ownership, consent, originality, the soul contract of creation, and building AI art with integrity.",
    order: 22,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j22.jpg",
    estimatedMinutes: 50,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-23",
    title: "Narrative Leadership",
    slug: "narrative-leadership",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Talking → Inspiring",
    summary: "Lead with story; heal communication gaps.",
    description:
      "Storytelling inside organizations, AI as a mirror for gaps, and crafting transformational narratives.",
    order: 23,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j23.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-24",
    title: "Flow States and Technology",
    slug: "flow-states-and-technology",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Distraction → Immersion",
    summary: "Master inner rhythm in a connected world.",
    description:
      "Neuroscience of flow, AI as focus partner, digital rituals, and balancing deep work with deep rest.",
    order: 24,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j24.jpg",
    estimatedMinutes: 50,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-25",
    title: "The Human Experience Designer",
    slug: "the-human-experience-designer",
    layer: "Expression",
    category: "Journey",
    emotionShift: "Survival → Harmony",
    summary: "Design life systems like products.",
    description:
      "Map emotions to interactions, create feedback loops for wellbeing, and align values with tech use.",
    order: 25,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j25.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },

  // MASTERY (26–30)
  {
    id: "journey-26",
    title: "Conscious Technology",
    slug: "conscious-technology",
    layer: "Mastery",
    category: "Journey",
    emotionShift: "Unconscious → Mindful",
    summary: "Use tech as a consciousness amplifier.",
    description:
      "Integrate mindfulness into digital tools, design calm systems, and practice presence‑led productivity.",
    order: 26,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j26.jpg",
    estimatedMinutes: 55,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-27",
    title: "Building Your Personal AI",
    slug: "building-your-personal-ai",
    layer: "Mastery",
    category: "Journey",
    emotionShift: "User → Co‑creator",
    summary: "Create your own custom assistant that reflects you.",
    description:
      "Personality shaping, memory systems, teaching your AI your philosophy, and safety & privacy setup.",
    order: 27,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j27.jpg",
    estimatedMinutes: 65,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-28",
    title: "The Future Architect",
    slug: "the-future-architect",
    layer: "Mastery",
    category: "Journey",
    emotionShift: "Present → Foresight",
    summary: "Design humane, regenerative futures.",
    description:
      "See macro trends through intuition, futures thinking exercises, and build the next ImagineHuman project.",
    order: 28,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j28.jpg",
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-29",
    title: "Human–AI Synthesis",
    slug: "human-ai-synthesis",
    layer: "Mastery",
    category: "Journey",
    emotionShift: "Separation → Harmony",
    summary: "Embody partnership between human and AI.",
    description:
      "The next paradigm of co‑evolution, human qualities machines can’t replicate, and integrating intuition, emotion, and logic.",
    order: 29,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j29.jpg",
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "journey-30",
    title: "The Infinite Curiosity",
    slug: "the-infinite-curiosity",
    layer: "Mastery",
    category: "Journey",
    emotionShift: "Learning → Being",
    summary: "Curiosity as a lifelong spiritual practice.",
    description:
      "Create your lifelong learning map, stay humble and open as AI evolves, and reflect on who you’re becoming.",
    order: 30,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/j30.jpg",
    estimatedMinutes: 45,
    createdAt: now,
    updatedAt: now,
  },
];

// -----------------------------
// NEW: Skill Labs (parallel, tool-based pods)
// -----------------------------

const skillLabs = [
  {
    id: "lab-1",
    title: "Shopify for AI Creators",
    slug: "shopify-for-ai-creators",
    category: "SkillLab",
    layer: null, // intentionally outside the 4-layer arc
    emotionShift: "Stuck → Shipped",
    summary: "Prototype and launch a soulful store fast with AI help.",
    description:
      "Set up Shopify, generate brand/story/copy with AI, structure products, and publish a clean MVP store with an ethical checklist.",
    relatedJourneyIds: ["journey-11", "journey-16"],
    prerequisites: ["journey-2"],
    order: 1,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/lab-shopify.jpg",
    estimatedMinutes: 90,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lab-2",
    title: "Notion + AI Automation",
    slug: "notion-and-ai-automation",
    category: "SkillLab",
    layer: null,
    emotionShift: "Scattered → Structured",
    summary: "Build your second brain and automate rituals.",
    description:
      "Design pages, databases, and light automations; use AI for synthesis and weekly reviews.",
    relatedJourneyIds: ["journey-8", "journey-16"],
    prerequisites: ["journey-2"],
    order: 2,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/lab-notion.jpg",
    estimatedMinutes: 75,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lab-3",
    title: "Canva for Soulful Brand Design",
    slug: "canva-for-soulful-brand-design",
    category: "SkillLab",
    layer: null,
    emotionShift: "Blank → Branded",
    summary: "Express your vibe visually, fast.",
    description:
      "Use AI to draft moodboards, iterate logos, craft social kits, and export a lightweight brand system.",
    relatedJourneyIds: ["journey-10", "journey-12"],
    prerequisites: ["journey-1"],
    order: 3,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/lab-canva.jpg",
    estimatedMinutes: 60,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lab-4",
    title: "Zapier & AI Workflows",
    slug: "zapier-and-ai-workflows",
    category: "SkillLab",
    layer: null,
    emotionShift: "Manual → Magical",
    summary: "Automate repetitive tasks with ethics and care.",
    description:
      "Trigger → process → output pipelines, GPT actions, safety rails, and logging for awareness.",
    relatedJourneyIds: ["journey-16", "journey-21"],
    prerequisites: ["journey-2"],
    order: 4,
    isPublished: true,
    thumbnailUrl: "https://example.com/thumbnails/lab-zapier.jpg",
    estimatedMinutes: 80,
    createdAt: now,
    updatedAt: now,
  },
];

// Sample lessons for Lab 1 (Shopify)
const lab1Lessons = [
  {
    id: "lesson-l1-1",
    title: "Set Up & Clean Config",
    order: 1,
    durationMinutes: 12,
    videoUrl: "https://example.com/videos/lab1-setup.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-l1-2",
    title: "AI‑Assisted Brand & Copy",
    order: 2,
    durationMinutes: 15,
    videoUrl: "https://example.com/videos/lab1-brand-copy.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-l1-3",
    title: "Products, Collections, Navigation",
    order: 3,
    durationMinutes: 14,
    videoUrl: "https://example.com/videos/lab1-products.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-l1-4",
    title: "Payments, Policies, Launch Checklist",
    order: 4,
    durationMinutes: 16,
    videoUrl: "https://example.com/videos/lab1-launch.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-l1-5",
    title: "Ethical Store UX (Bonus)",
    order: 5,
    durationMinutes: 10,
    contentType: "md",
    contentBlocks: [
      {
        type: "md",
        value:
          "Design calm, trustworthy storefronts with empathy cues and clear consent patterns.",
      },
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
];

// -----------------------------
// NEW: Tools Library (modular metadata)
// -----------------------------

const tools = [
  {
    id: "tool-shopify",
    name: "Shopify",
    category: "E‑commerce",
    purpose: "Build and automate soulful online stores.",
    linkedLabIds: ["lab-1"],
    linkedJourneyIds: ["journey-11", "journey-16"],
    skillLevel: "Intermediate",
    iconUrl: "https://example.com/icons/shopify.png",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tool-notion",
    name: "Notion",
    category: "Knowledge",
    purpose: "Second brain; structured docs and databases.",
    linkedLabIds: ["lab-2"],
    linkedJourneyIds: ["journey-8", "journey-16"],
    skillLevel: "Beginner",
    iconUrl: "https://example.com/icons/notion.png",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tool-canva",
    name: "Canva",
    category: "Design",
    purpose: "Quick visual expression and brand kits.",
    linkedLabIds: ["lab-3"],
    linkedJourneyIds: ["journey-10", "journey-12"],
    skillLevel: "Beginner",
    iconUrl: "https://example.com/icons/canva.png",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tool-zapier",
    name: "Zapier",
    category: "Automation",
    purpose: "Connect apps and automate flows.",
    linkedLabIds: ["lab-4"],
    linkedJourneyIds: ["journey-16", "journey-21"],
    skillLevel: "Intermediate",
    iconUrl: "https://example.com/icons/zapier.png",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tool-elevenlabs",
    name: "ElevenLabs",
    category: "Audio",
    purpose: "Voice cloning and narration.",
    linkedLabIds: [],
    linkedJourneyIds: ["journey-18"],
    skillLevel: "Intermediate",
    iconUrl: "https://example.com/icons/elevenlabs.png",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tool-synthesia",
    name: "Synthesia",
    category: "Video",
    purpose: "AI presenters and rapid video lessons.",
    linkedLabIds: [],
    linkedJourneyIds: ["journey-18", "journey-23"],
    skillLevel: "Beginner",
    iconUrl: "https://example.com/icons/synthesia.png",
    createdAt: now,
    updatedAt: now,
  },
];

// -----------------------------
// Lessons — align samples to correct journeys
// -----------------------------

// Journey 1 lessons (6 bullets)
const journey1Lessons = [
  {
    id: "lesson-1-1",
    title: "The AI Awakening — Why Curiosity Beats Fear",
    order: 1,
    durationMinutes: 6,
    videoUrl: "https://example.com/videos/j1-01.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-1-2",
    title: "What ChatGPT Really Is (and Isn’t)",
    order: 2,
    durationMinutes: 6,
    videoUrl: "https://example.com/videos/j1-02.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-1-3",
    title: "Talking to AI Like a Human",
    order: 3,
    durationMinutes: 6,
    videoUrl: "https://example.com/videos/j1-03.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-1-4",
    title: "The Art of Asking Better Questions",
    order: 4,
    durationMinutes: 6,
    videoUrl: "https://example.com/videos/j1-04.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-1-5",
    title: "How AI Thinks: Inside the Prompt Loop",
    order: 5,
    durationMinutes: 6,
    videoUrl: "https://example.com/videos/j1-05.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-1-6",
    title: "Your First Conversation with AI — Guided Play",
    order: 6,
    durationMinutes: 10,
    videoUrl: "https://example.com/videos/j1-06.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
];

// Journey 2 lessons (prompt‑engineering samples)
const journey2Lessons = [
  {
    id: "lesson-2-1",
    title: "Introduction to Prompt Engineering",
    order: 1,
    durationMinutes: 10,
    videoUrl: "https://example.com/videos/prompt-intro.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-2-2",
    title: "Core Prompt Patterns",
    order: 2,
    durationMinutes: 15,
    videoUrl: "https://example.com/videos/prompt-patterns.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-2-3",
    title: "Context and Specificity",
    order: 3,
    durationMinutes: 12,
    videoUrl: "https://example.com/videos/prompt-context.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-2-4",
    title: "Iterative Refinement",
    order: 4,
    durationMinutes: 10,
    videoUrl: "https://example.com/videos/prompt-refinement.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-2-5",
    title: "Practical Exercise",
    order: 5,
    durationMinutes: 15,
    contentType: "exercise",
    contentBlocks: [
      {
        type: "md",
        value:
          "# Prompt Engineering ExercisePractice writing effective prompts for different scenarios.",
      },
      {
        type: "exercise",
        value:
          "Write a prompt that helps an AI generate a detailed business plan for a fictional sustainable fashion brand.",
      },
      { type: "tip", value: "Include target audience, price point, and USP." },
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
];

// Journey 5 lessons (ethics)
const journey5Lessons = [
  {
    id: "lesson-5-1",
    title: "Understanding AI Bias",
    order: 1,
    durationMinutes: 12,
    videoUrl: "https://example.com/videos/ethics-bias.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-5-2",
    title: "Transparency and Explainability",
    order: 2,
    durationMinutes: 15,
    videoUrl: "https://example.com/videos/ethics-transparency.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-5-3",
    title: "Privacy Considerations",
    order: 3,
    durationMinutes: 10,
    videoUrl: "https://example.com/videos/ethics-privacy.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lesson-5-4",
    title: "Building an Ethical Framework",
    order: 4,
    durationMinutes: 18,
    videoUrl: "https://example.com/videos/ethics-framework.mp4",
    contentType: "video",
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
];

// -----------------------------
// Batch writes
// -----------------------------

const TARGET_CLUB_ID =
  process.env.CLUB_ID || "oCuLKtZNA9mlC949ZHmW";
const clubJourneys = db
  .collection("clubs")
  .doc(TARGET_CLUB_ID)
  .collection("journeys");

// Add journeys
journeys.forEach((journey) => {
  const { id, ...journeyData } = journey;
  batch.set(clubJourneys.doc(id), {
    ...journeyData,
    clubId: TARGET_CLUB_ID,
  });
});

// Add lessons
journey1Lessons.forEach((lesson) => {
  const { id, ...lessonData } = lesson;
  batch.set(
    clubJourneys.doc("journey-1").collection("lessons").doc(id),
    lessonData
  );
});

journey2Lessons.forEach((lesson) => {
  const { id, ...lessonData } = lesson;
  batch.set(
    clubJourneys.doc("journey-2").collection("lessons").doc(id),
    lessonData
  );
});

journey5Lessons.forEach((lesson) => {
  const { id, ...lessonData } = lesson;
  batch.set(
    clubJourneys.doc("journey-5").collection("lessons").doc(id),
    lessonData
  );
});

// Add Skill Labs
skillLabs.forEach((lab) => {
  const { id, ...labData } = lab;
  batch.set(db.collection("labs").doc(id), labData);
});

// Add Lab 1 lessons
lab1Lessons.forEach((lesson) => {
  const { id, ...lessonData } = lesson;
  batch.set(
    db.collection("labs").doc("lab-1").collection("lessons").doc(id),
    lessonData
  );
});

// Add Tools
tools.forEach((tool) => {
  const { id, ...toolData } = tool;
  batch.set(db.collection("tools").doc(id), toolData);
});

// Commit
batch
  .commit()
  .then(() => {
    console.log("✅ Seed data written successfully (v2 + SkillLabs + Tools)");
  })
  .catch((error) => {
    console.error("❌ Error writing seed data:", error);
  });
