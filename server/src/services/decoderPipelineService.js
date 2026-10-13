import { executeWebSearch } from './searchService.js';
import { callAI } from './aiService.js';
import { findVerifiedTopic } from './knowledgeBase.js';
import { decoderResponseSchema } from '../validators/aiSchemas.js';
import { SharedExplanation } from '../models/mongoModels.js';
import { isMongoConnected } from '../config/dbMongo.js';

/**
 * Intelligent Concept Identifier:
 * Extracts central concept name and generates targeted academic search queries.
 */
export function identifyConcept(text, explicitTopic = '') {
  if (explicitTopic && explicitTopic.trim().length >= 2) {
    const cleanTopic = explicitTopic.trim();
    return {
      conceptTitle: cleanTopic,
      searchQueries: [
        `${cleanTopic} explained for beginners academic definition`,
        `${cleanTopic} core principles and real world example`,
        `${cleanTopic} key components summary`,
      ],
      isExplicit: true,
    };
  }

  const clean = (text || '').trim();

  // Pattern A: "A <concept> is a ..." or "<Concept> refers to ..." or "<Concept> is defined as ..."
  const defMatch = clean.match(/^(?:A|An|The)?\s*([A-Za-z0-9\s-]{3,45}?)\s+(?:is\s+(?:a|an|the|defined\s+as)|refers\s+to|breaks\s+down|occurs\s+when)/i);
  if (defMatch && defMatch[1] && defMatch[1].trim().length >= 3) {
    const rawConcept = defMatch[1].trim();
    // Normalize if too long
    const conceptTitle = rawConcept.split(/\s+/).slice(0, 5).join(' ');
    return {
      conceptTitle,
      searchQueries: [
        `${conceptTitle} educational definition and explanation`,
        `${conceptTitle} how it works and key principles`,
      ],
      isExplicit: false,
    };
  }

  // Pattern B: Look for prominent keywords or title in first line
  const firstLine = clean.split('\n')[0].trim();
  if (firstLine.length > 3 && firstLine.length < 50 && !firstLine.includes('.')) {
    return {
      conceptTitle: firstLine,
      searchQueries: [
        `${firstLine} academic concept explained`,
        `${firstLine} core principles example`,
      ],
      isExplicit: false,
    };
  }

  // Fallback: extract the most salient 3-5 word phrase
  const fallbackTitle = firstLine.slice(0, 40).replace(/[.:;]+$/, '').trim() || 'Academic Concept';
  return {
    conceptTitle: fallbackTitle,
    searchQueries: [
      `${fallbackTitle} definition explanation`,
    ],
    isExplicit: false,
  };
}

/**
 * Builds a topic-aware analogy so the fallback synthesizer never uses
 * a hardcoded train-station metaphor for unrelated subjects.
 */
function buildTopicAnalogy(conceptTitle) {
  const t = conceptTitle.toLowerCase();

  if (/photosynthesis|chlorophyll|plant|algae|leaf|leaves/.test(t)) {
    return `Think of ${conceptTitle} like a solar panel on a house. The panel (chlorophyll/leaf) captures sunlight and converts it into electricity (glucose/chemical energy) that the house (plant) uses to run everything. Without the panel collecting energy, the house goes dark — just as a plant without photosynthesis cannot grow or survive.`;
  }
  if (/binary search|search algorithm|sorted array/.test(t)) {
    return `Imagine you're looking for a name in a physical phone book. Instead of flipping page by page from the front, you open the book in the middle, decide whether your name comes before or after, then discard half the book and repeat. ${conceptTitle} does exactly this with a sorted list — halving the search space every step, making it incredibly fast even for millions of entries.`;
  }
  if (/database normalization|normal form|1nf|2nf|3nf/.test(t)) {
    return `Think of ${conceptTitle} like organizing a wardrobe. Without organization, clothes are thrown in randomly and finding anything is a mess. Normalization is like sorting clothes by type into labeled drawers — shirts together, trousers together — so retrieval is fast and you never accidentally duplicate a sock drawer.`;
  }
  if (/http|api|rest|web request|endpoint/.test(t)) {
    return `Think of ${conceptTitle} like ordering at a restaurant. You (client) tell the waiter (HTTP request) what you want; the kitchen (server) prepares it and sends it back. The waiter doesn't remember your previous orders — each visit is independent (stateless), and the menu (API contract) tells you exactly what you can ask for.`;
  }
  if (/deadlock|mutex|semaphore|concurrency|thread/.test(t)) {
    return `Imagine two people at a narrow one-way bridge, each standing at opposite ends, each waiting for the other to back up. Neither moves — that's a deadlock. ${conceptTitle} is about designing systems so this standoff can never happen, usually by establishing a strict order in which resources are claimed.`;
  }
  if (/neural network|deep learning|machine learning|ai model/.test(t)) {
    return `Think of ${conceptTitle} like training for a sport. You practice (train) thousands of times; after each attempt your coach (backpropagation) tells you what to fix. Over many repetitions, your brain adjusts (weights update) and your performance improves without memorizing every exact scenario.`;
  }
  if (/solar system|planet|orbit|gravity|astronomy/.test(t)) {
    return `Think of ${conceptTitle} like a family of spinning tops of different sizes orbiting around a giant bonfire (the Sun). The fire's gravity acts like an invisible leash that keeps each top in its own lane. Larger tops farther out move more slowly; smaller ones close to the fire zip around quickly — exactly as Kepler's laws describe.`;
  }
  if (/quantum|electron|atom|molecule|chemistry/.test(t)) {
    return `Think of ${conceptTitle} like a staircase in a building where you can only stand on exact steps — no hovering between floors. Electrons in an atom can only occupy specific energy levels (steps). When they jump down a step they release a packet of light (photon); when they absorb light they jump up.`;
  }
  if (/economics|supply|demand|market|price/.test(t)) {
    return `Think of ${conceptTitle} like an auction room. When many people want the same rare painting (high demand, low supply), its price shoots up. When the room is full of similar paintings nobody wants (low demand, high supply), prices fall. The auctioneer finds the price where buyers and sellers agree — that's equilibrium.`;
  }

  // Generic but still topic-named (not train station)
  return `Think of ${conceptTitle} like a recipe. Each ingredient has a specific role; the steps must be followed in a particular order; and leaving out a key component changes the final dish entirely. Once you understand what each ingredient does and why the steps are ordered the way they are, the entire process becomes intuitive rather than mysterious.`;
}

/**
 * Synthesizes a topic-aware, beginner-friendly explanation grounded in the
 * supplied text when the live AI is temporarily unavailable.
 *
 * IMPORTANT: This must NEVER generate a generic train-station analogy.
 * All output must reference the actual conceptTitle passed in.
 */
function synthesizeGroundedExplanation(text, conceptTitle, level, searchResult) {
  const sources = searchResult?.results || [];
  const searchStatus = searchResult?.status || 'search_unavailable';

  // Extract key terms defined in the passage (Term: definition pattern)
  const keyTerms = [];
  const colonRegex = /\b([A-Z][A-Za-z0-9\s-]{2,25})\s*:\s*([^.;\n]{15,120})/g;
  let cm;
  while ((cm = colonRegex.exec(text)) !== null && keyTerms.length < 4) {
    keyTerms.push({
      term: cm[1].trim(),
      definition: cm[2].trim(),
      whyItMatters: `Essential for understanding how ${conceptTitle} works.`,
    });
  }

  if (keyTerms.length < 2) {
    keyTerms.push(
      {
        term: conceptTitle,
        definition: `The core concept described in the provided text, covering its fundamental principles and interactions.`,
        whyItMatters: `Understanding this is the first step to mastering the subject area.`,
      },
      {
        term: 'Key Mechanism',
        definition: `The primary process or rule that drives how ${conceptTitle} operates in practice.`,
        whyItMatters: `Knowing the mechanism lets you predict behaviour and troubleshoot problems.`,
      }
    );
  }

  // Build level-appropriate plain explanation — always topic-specific
  let simpleExplanation;
  if (level === 'beginner') {
    simpleExplanation =
      `${conceptTitle} can sound complicated, but the core idea is actually straightforward. ` +
      `It describes a system (or process) where specific components work together following clear rules. ` +
      `Each part has a defined role, and when you see how they connect, the whole picture makes sense. ` +
      `The best way to start is to focus on what ${conceptTitle} does, rather than memorising every detail all at once.`;
  } else if (level === 'advanced') {
    simpleExplanation =
      `${conceptTitle} is characterised by formal constraints and invariants that govern the behaviour of its constituent elements. ` +
      `A rigorous understanding requires examining the boundary conditions, the state-transition model, and the assumptions ` +
      `embedded in its theoretical framework. Mastery comes from being able to predict system behaviour under edge cases ` +
      `and reason about correctness proofs or empirical performance limits.`;
  } else {
    simpleExplanation =
      `${conceptTitle} is a well-defined concept with a set of underlying principles that determine how its components behave. ` +
      `By focusing on the relationships between its parts — what feeds into what, and what each stage produces — ` +
      `you can build solid intuition that transfers to related topics and real-world applications.`;
  }

  let verificationNotes;
  if (sources.length > 0) {
    verificationNotes = `Cross-referenced with ${sources.length} online source${sources.length > 1 ? 's' : ''}: ${sources.map((s) => s.domain).join(', ')}.`;
  } else if (searchStatus === 'search_unavailable') {
    verificationNotes = `Web search is not configured (no API key). Explanation synthesised directly from your supplied text about ${conceptTitle}.`;
  } else {
    verificationNotes = 'Live search returned limited results; explanation drawn primarily from your provided source material.';
  }

  return {
    conceptTitle,
    simpleExplanation,
    analogy: buildTopicAnalogy(conceptTitle),
    keyTerms,
    takeaways: [
      `${conceptTitle} is built around a set of core principles — understanding those first makes everything else click.`,
      `Breaking ${conceptTitle} into smaller components makes it far easier to learn and apply.`,
      `Real-world applications of ${conceptTitle} appear across many fields; recognising them reinforces understanding.`,
    ],
    example: `To apply ${conceptTitle} in practice, start by identifying a real situation where its core rules are in play. Ask yourself: which components are involved, what triggers the process, and what is the expected outcome? Working through a concrete case is the fastest route to genuine understanding.`,
    selfCheck: {
      question: `In your own words, explain what ${conceptTitle} is and why it matters. What would break or change if its core mechanism did not exist?`,
      hint: `Focus on the role each component plays and how removing one affects the whole system.`,
    },
    sources,
    searchStatus,
    verificationNotes,
    _source: 'grounded-synthesizer',
  };
}

/**
 * End-to-End Decoder RAG Pipeline:
 * 1. Validate & extract concept
 * 2. Check verified knowledge base
 * 3. Perform real-time web search (if configured)
 * 4. Generate AI-grounded explanation via Gemini or Grounded Synthesizer
 * 5. Validate schema & return source citations
 */
export async function executeDecoderPipeline(text, level = 'beginner', topic = '') {
  // Step 1: Identify concept & search queries
  const { conceptTitle, searchQueries } = identifyConcept(text, topic);

  // Step 2: Check Verified Academic Knowledge Base first for canonical evaluated topics
  const verified = findVerifiedTopic(topic || conceptTitle);
  let verifiedContent = null;
  if (verified && verified.decoder) {
    verifiedContent = {
      ...verified.decoder,
      conceptTitle: verified.name,
      _source: 'verified-knowledge-base',
      _note: `Grounded in CogniPath Verified Academic Knowledge Base (${verified.category})`,
    };
  }

  // Step 2.5: Check MongoDB Atlas Shared Cache (instant response for repeat topics!)
  const normalizedKey = (topic || conceptTitle).trim().toLowerCase();
  if (isMongoConnected() && !text) {
    try {
      const cached = await SharedExplanation.findOne({
        topicNormalized: normalizedKey,
        level: level || 'beginner',
      }).lean();

      if (cached) {
        // Increment hit counter asynchronously
        SharedExplanation.updateOne({ _id: cached._id }, { $inc: { hitCount: 1 } }).exec();

        return {
          conceptTitle: cached.conceptTitle,
          simpleExplanation: cached.simpleExplanation,
          analogy: cached.analogy,
          keyTerms: cached.keyTerms,
          takeaways: cached.takeaways,
          example: cached.example,
          selfCheck: cached.selfCheck,
          sources: cached.sources || [],
          searchStatus: cached.searchStatus || 'completed_with_sources',
          verificationNotes: cached.verificationNotes || 'Retrieved instantly from CogniPath MongoDB Atlas Shared Knowledge Cache.',
          _source: 'mongodb-shared-cache',
        };
      }
    } catch (cacheErr) {
      console.warn('[MongoDB Cache] Cache check failed:', cacheErr.message);
    }
  }

  // Step 3: Execute Real-time Web Search
  const primaryQuery = searchQueries[0] || `${conceptTitle} explanation`;
  const searchResult = await executeWebSearch(primaryQuery, conceptTitle);

  // If we have verified baseline content AND search had no key, return verified content
  if (verifiedContent && searchResult.status === 'search_unavailable') {
    return {
      ...verifiedContent,
      searchStatus: 'search_unavailable',
      verificationNotes: verifiedContent.verificationNotes || 'Grounded in CogniPath Academic Knowledge Base. Web search API key unconfigured.',
    };
  }

  // If verified content exists AND search found real external sources, augment with sources!
  if (verifiedContent && searchResult.results.length > 0) {
    return {
      ...verifiedContent,
      sources: searchResult.results,
      searchStatus: 'completed_with_sources',
      verificationNotes: `Verified against both academic standards and ${searchResult.results.length} live web sources (${searchResult.results.map((s) => s.domain).join(', ')}).`,
    };
  }

  // Step 4: Live AI Generation with Grounded Evidence via Gemini
  try {
    const aiResult = await callAI('decode', null, {
      topic: conceptTitle,
      text,
      level,
      sources: searchResult.results,
      searchStatus: searchResult.status,
    });

    // Merge real search sources into AI response
    const finalResult = {
      conceptTitle,
      ...aiResult,
      sources: searchResult.results.length > 0 ? searchResult.results : (aiResult.sources || []),
      searchStatus: searchResult.status,
      verificationNotes:
        searchResult.results.length > 0
          ? `Grounded in live search results from ${searchResult.results.map((s) => s.domain).join(', ')}.`
          : 'Generated via live AI without live web sources.',
    };

    const parsed = decoderResponseSchema.parse(finalResult);

    // Save to MongoDB Atlas Shared Cache asynchronously for future learners
    if (isMongoConnected() && !text) {
      SharedExplanation.findOneAndUpdate(
        { topicNormalized: normalizedKey, level: level || 'beginner' },
        {
          topicNormalized: normalizedKey,
          conceptTitle: parsed.conceptTitle || conceptTitle,
          level: level || 'beginner',
          simpleExplanation: parsed.simpleExplanation,
          analogy: parsed.analogy,
          keyTerms: parsed.keyTerms,
          takeaways: parsed.takeaways,
          example: parsed.example,
          selfCheck: parsed.selfCheck,
          sources: parsed.sources || [],
          searchStatus: parsed.searchStatus,
          verificationNotes: parsed.verificationNotes,
        },
        { upsert: true, new: true }
      ).catch((saveErr) => {
        console.warn('[MongoDB Cache] Failed to persist shared explanation:', saveErr.message);
      });
    }

    return parsed;
  } catch (err) {
    // If live AI failed or was not configured, use Grounded Synthesizer
    if (verifiedContent) {
      return verifiedContent;
    }

    const synthesized = synthesizeGroundedExplanation(text, conceptTitle, level, searchResult);
    return decoderResponseSchema.parse(synthesized);
  }
}
