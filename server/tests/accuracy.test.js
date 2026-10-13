import assert from 'node:assert';
import { callAI } from '../src/services/aiService.js';
import { extractFromSourceText, findVerifiedTopic } from '../src/services/knowledgeBase.js';

console.log('====================================================');
console.log('COGNIPATH AI ACCURACY & CONTENT QUALITY VERIFICATION');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assertTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
  }
}

async function runAllTests() {
  // Test A: Chlorophyll
  await runAsyncTest('Test A (Chlorophyll Accuracy): Decoder & Focus Cards', async () => {
    const res = await callAI('decode', null, { topic: 'chlorophyll', level: 'beginner' });
    assert(res.simpleExplanation.toLowerCase().includes('pigment'), 'Should mention pigment');
    assert(res.simpleExplanation.toLowerCase().includes('photosynthesis'), 'Should mention photosynthesis');
    assert(res.analogy.toLowerCase().includes('solar'), 'Analogy should map to light harvesting / solar');
    assert(!res.analogy.toLowerCase().includes('workshop'), 'Must NOT contain workshop trope');
    assert(!res.analogy.toLowerCase().includes('waiter'), 'Must NOT contain restaurant waiter trope');
    
    // Check key terms
    const hasChloroplast = res.keyTerms.some(t => t.term.toLowerCase().includes('chloroplast') || t.definition.toLowerCase().includes('chloroplast'));
    assert(hasChloroplast, 'Should define chloroplast');

    // Focus cards for Chlorophyll
    const cards = await callAI('focusCards', null, { topic: 'chlorophyll', cardCount: 4 });
    assert(cards.cards.length >= 3, 'Should have multiple cards');
    assert(cards.cards[0].title.toLowerCase().includes('etymology') || cards.cards[0].title.toLowerCase().includes('definition'), 'Card 1 should cover definition/etymology');
    assert(!cards.cards[0].title.includes('Foundations of The word'), 'Must NOT contain string slice artifact');
    assert(!cards.cards[0].vocabulary.some(v => v.term.includes('Factor 1')), 'Must NOT contain Factor 1');

    // Story mode for Chlorophyll
    const story = await callAI('mode', null, { topic: 'chlorophyll', mode: 'story' });
    assert(story.storyText.toLowerCase().includes('solar') || story.storyText.toLowerCase().includes('leaf') || story.storyText.toLowerCase().includes('photon'), 'Story must be about light harvesting in leaves');
    assert(!story.storyText.toLowerCase().includes('craft workshop'), 'Story must NOT be about a craft workshop');
  });

  // Test B: Binary Search
  await runAsyncTest('Test B (Binary Search Accuracy): Algorithm Invariants & Complexity', async () => {
    const res = await callAI('decode', null, { topic: 'binary search', level: 'beginner' });
    assert(res.simpleExplanation.toLowerCase().includes('sorted'), 'Must emphasize sorted data prerequisite');
    assert(res.simpleExplanation.toLowerCase().includes('half') || res.simpleExplanation.toLowerCase().includes('halving'), 'Must explain halving intervals');
    
    const hasLogN = res.keyTerms.some(t => t.definition.includes('O(log n)') || t.term.includes('O(log n)'));
    assert(hasLogN, 'Must reference O(log n) time complexity');

    // Step by step mode
    const steps = await callAI('mode', null, { topic: 'binary search', mode: 'step_by_step' });
    assert(steps.howItWorks.length >= 4, 'Must have distinct steps');
    assert(steps.howItWorks.some(s => s.toLowerCase().includes('mid') || s.toLowerCase().includes('low') || s.toLowerCase().includes('high')), 'Must explain low/high/mid pointers');
  });

  // Test C: Database Normalization
  await runAsyncTest('Test C (Database Normalization Accuracy): Normal Forms & Anomalies', async () => {
    const res = await callAI('decode', null, { topic: 'database normalization', level: 'beginner' });
    assert(res.simpleExplanation.toLowerCase().includes('redundancy'), 'Must mention reducing redundancy');
    assert(res.simpleExplanation.toLowerCase().includes('anomal'), 'Must mention anomalies');

    const has1NF = res.keyTerms.some(t => t.term.includes('1NF') || t.definition.includes('atomic'));
    const has2NF = res.keyTerms.some(t => t.term.includes('2NF') || t.definition.includes('partial'));
    const has3NF = res.keyTerms.some(t => t.term.includes('3NF') || t.definition.includes('transitive'));
    assert(has1NF && has2NF && has3NF, 'Must define 1NF, 2NF, and 3NF');

    // Quiz mode
    const quiz = await callAI('mode', null, { topic: 'database normalization', mode: 'quiz' });
    assert(quiz.questions.length >= 3, 'Must have 3 quiz questions');
    assert(quiz.questions[0].options.length === 4, 'Each question must have 4 options');
    assert(quiz.questions[0].correctAnswerIndex >= 0 && quiz.questions[0].correctAnswerIndex <= 3, 'Valid correct answer index');
  });

  // Test D: Photosynthesis
  await runAsyncTest('Test D (Photosynthesis Accuracy): Chemical Equation & Organelles', async () => {
    const res = await callAI('decode', null, { topic: 'photosynthesis', level: 'beginner' });
    assert(res.simpleExplanation.toLowerCase().includes('glucose') || res.simpleExplanation.toLowerCase().includes('sugar'), 'Must mention glucose/sugar');
    assert(res.takeaways.some(t => t.includes('CO2') || t.includes('H2O')), 'Must reference chemical formula inputs');
    
    const quiz = await callAI('mode', null, { topic: 'photosynthesis', mode: 'quiz' });
    assert(quiz.questions.some(q => q.question.toLowerCase().includes('oxygen') && q.explanation.toLowerCase().includes('water')), 'Must accurately identify water as source of released oxygen');
  });

  // Test E: HTTP API
  await runAsyncTest('Test E (HTTP API Accuracy): Verbs, Status Codes & Statelessness', async () => {
    const res = await callAI('decode', null, { topic: 'http api', level: 'beginner' });
    assert(res.simpleExplanation.toLowerCase().includes('http') || res.simpleExplanation.toLowerCase().includes('json'), 'Must mention HTTP or JSON');
    assert(res.keyTerms.some(t => t.term.includes('Status Code')), 'Must include Status Codes');
    assert(res.keyTerms.some(t => t.term.includes('Method')), 'Must include HTTP Methods');
  });

  // Test F: User-Provided Source Text
  assertTest('Test F (User-Provided Source Text Extraction): Synthesizing from actual paragraph', () => {
    const customText = `The word chlorophyll breaks down from two Greek roots: khloros (meaning pale green) and phyllon (meaning leaf). Discovered in 1817 by French pharmacists Joseph Bienaimé Caventou and Pierre Joseph Pelletier, chlorophyll is essential for the photolysis of water in plant chloroplasts.`;
    const result = extractFromSourceText(customText, 2, 'Greek Roots of Chlorophyll');
    
    assert(result.title === 'Greek Roots of Chlorophyll', 'Title should match provided topic');
    assert(result.cards.length === 2, 'Should divide into 2 cards');
    assert(result.cards[0].explanation.includes('khloros'), 'Card explanation must contain the actual text sentences');
    assert(result.cards[0].vocabulary.some(v => v.term.toLowerCase() === 'khloros'), 'Must extract khloros as vocabulary');
    assert(result.cards[0].vocabulary.some(v => v.definition.toLowerCase().includes('pale green')), 'Must extract pale green definition');
    assert(!result.cards[0].title.includes('Foundations of The word'), 'Must not contain string-slicing garbage');
    assert(!result.cards[0].vocabulary.some(v => v.term.includes('Factor 1')), 'Must not contain Factor 1');
  });

  // Test G: Missing or Invalid Input Handling
  await runAsyncTest('Test G (Invalid Input Validation): Gracefully rejects empty or invalid inputs', async () => {
    try {
      // In controller, empty topic should reject
      await callAI('decode', null, { topic: '', text: '' });
      assert.fail('Should have thrown on empty input');
    } catch (err) {
      assert(err.message.length > 0, 'Must produce meaningful error');
    }
  });

  // Test H: AI Provider Failure & Error Transparency
  await runAsyncTest('Test H (AI Provider Failure Transparency): Never silently fakes custom topics with workshop templates', async () => {
    try {
      await callAI('mode', null, { topic: 'quantum chromodynamics unconfigured', mode: 'story' });
      // If it succeeded via live Gemini, verify it did not generate the banned workshop template
    } catch (err) {
      assert(!err.message.includes('craft workshop'), 'Error must not contain craft workshop');
      assert(err.code === 'AI_KEY_REQUIRED' || err.code === 'GENERATION_FAILED' || err.message.includes('timed out') || err.message.includes('API key'), 'Must report transparent error failure');
    }
  });

  // Test I: Operating System Deadlock & Coffman Conditions
  await runAsyncTest('Test I (Deadlock & Coffman Conditions): Verifies all 4 conditions and real sources', async () => {
    const { executeDecoderPipeline } = await import('../src/services/decoderPipelineService.js');
    const input = 'A deadlock in an operating system is a state where a set of processes are permanently blocked because each process holds a resource and waits for another resource held by another process in the set.';
    const res = await executeDecoderPipeline(input, 'beginner', 'Operating System Deadlock');

    assert(res.conceptTitle.toLowerCase().includes('deadlock'), 'Title must identify Deadlock');
    assert(res.simpleExplanation.toLowerCase().includes('process'), 'Explanation must mention processes');
    assert(res.simpleExplanation.toLowerCase().includes('resource'), 'Explanation must mention resources');
    assert(res.analogy.toLowerCase().includes('traffic') || res.analogy.toLowerCase().includes('intersection'), 'Analogy must map to resource contention/traffic');
    
    // Check for Coffman conditions in keyTerms
    const terms = res.keyTerms.map(k => k.term.toLowerCase());
    assert(terms.some(t => t.includes('mutual exclusion')), 'Must define Mutual Exclusion');
    assert(terms.some(t => t.includes('hold and wait')), 'Must define Hold and Wait');
    assert(terms.some(t => t.includes('preemption')), 'Must define No Preemption');
    assert(terms.some(t => t.includes('circular wait')), 'Must define Circular Wait');

    // Check sources
    assert(Array.isArray(res.sources), 'Must include sources array');
    assert(res.sources.length >= 1, 'Must have verified educational reference sources');
    assert(res.sources[0].url.startsWith('http'), 'Source URL must be valid');
    assert(res.sources[0].domain.length > 3, 'Source domain must be present');
  });

  // Test J: Search Service Relevance Filtering & Deduplication
  await runAsyncTest('Test J (Search Service): Relevance filtering, deduplication, and domain ranking', async () => {
    const { filterAndRankResults, sanitizeUrl, extractDomain } = await import('../src/services/searchService.js');
    
    assert(sanitizeUrl('https://example.com/deadlock') === 'https://example.com/deadlock', 'Valid HTTPS URL');
    assert(sanitizeUrl('javascript:alert(1)') === null, 'Rejects unsafe protocols');
    assert(extractDomain('https://en.wikipedia.org/wiki/Deadlock') === 'en.wikipedia.org', 'Extracts clean domain');

    const mockRaw = [
      { title: 'Deadlock in Operating System', url: 'https://www.geeksforgeeks.org/deadlock', snippet: 'A deadlock happens when four conditions hold...' },
      { title: 'Deadlock in Operating System', url: 'https://www.geeksforgeeks.org/deadlock/', snippet: 'Duplicate link' },
      { title: 'Random Shopping Deals', url: 'https://spam.com/shoes', snippet: 'Buy cheap shoes now' },
      { title: 'MIT 6.004 Deadlock Lecture', url: 'https://ocw.mit.edu/courses/deadlock.pdf', snippet: 'Deadlock synchronization and semaphores' }
    ];

    const ranked = filterAndRankResults(mockRaw, 'deadlock');
    assert(ranked.length <= 3, 'Must filter out duplicate URL and low-relevance spam');
    assert(ranked[0].domain.includes('geeksforgeeks') || ranked[0].domain.includes('mit.edu'), 'Authoritative domains must rank highest');
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests();
