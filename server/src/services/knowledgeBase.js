/**
 * CogniPath Verified Academic Knowledge Base & Text Analyzer
 * Provides authentic, scientifically and technically rigorous educational data
 * for core topics when in demo/offline mode or as a verified baseline,
 * and semantic extractive analysis for student-pasted source text.
 */

/**
 * Pre-process source text: strip LaTeX math, normalize bullet symbols and
 * section headers into plain English prose so downstream parsing works cleanly.
 */
function preprocessSourceText(raw) {
  let t = raw;

  // 1. Replace LaTeX inline math \(...\) or $...$ with a placeholder reading phrase
  t = t.replace(/\\\(.*?\\\)/gs, '[equation]');
  t = t.replace(/\$[^$]+\$/g, '[equation]');

  // 2. Strip remaining LaTeX commands: \text{...}, \frac{...}{...}, \ce{...}, etc.
  t = t.replace(/\\[a-zA-Z]+\{[^}]*\}/g, '');
  t = t.replace(/\\[a-zA-Z]+/g, '');

  // 3. Normalize bullet symbols (•, -, *, –) at line start to a period-ending sentence suffix
  t = t.replace(/^[•\-–*]\s+/gm, '');

  // 4. Normalize Windows/Mac line endings
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 5. Collapse multiple blank lines
  t = t.replace(/\n{3,}/g, '\n\n');

  // 6. Remove lines that are purely punctuation or empty after cleanup
  t = t
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2)
    .join('\n');

  return t.trim();
}

/**
 * Detect named top-level sections from the preprocessed text.
 * Returns an array of { heading, body } objects.
 * Falls back to paragraph-based splitting when no headings are found.
 */
function detectSections(text) {
  // Match lines that look like section headings: short (<= 60 chars), often followed
  // by content, and typically start with a capital word or known keyword.
  const headingPattern = /^([A-Z][^\n]{2,59})$/gm;
  const lines = text.split('\n');
  const sections = [];
  let currentHeading = '';
  let currentBody = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Heuristic: a heading is a short line (3-60 chars) with ≥ 50% capitalized words
    // or well-known academic section names
    const words = trimmed.split(/\s+/);
    const capRatio = words.filter((w) => /^[A-Z]/.test(w)).length / words.length;
    const isHeading =
      trimmed.length <= 60 &&
      words.length <= 8 &&
      (capRatio >= 0.6 ||
        /^(introduction|background|overview|summary|conclusion|chemical formula|main stages?|why it matters?|examples?|applications?|key (concepts?|points?|terms?)|light-dependent|light-independent|calvin cycle|reactants?|products?|primary producers?)/i.test(
          trimmed
        ));

    if (isHeading && currentBody.length > 0) {
      sections.push({ heading: currentHeading || 'Overview', body: currentBody.join(' ') });
      currentHeading = trimmed;
      currentBody = [];
    } else if (isHeading && currentBody.length === 0) {
      currentHeading = trimmed;
    } else {
      currentBody.push(trimmed);
    }
  }
  if (currentBody.length > 0) {
    sections.push({ heading: currentHeading || 'Overview', body: currentBody.join(' ') });
  }

  // If no sections detected, fall back to paragraph splitting
  if (sections.length === 0) {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
    return paragraphs.map((p, i) => ({ heading: `Section ${i + 1}`, body: p.replace(/\n/g, ' ').trim() }));
  }

  return sections;
}

/**
 * Extract a concise (≤ 15 word) main idea from a section body.
 */
function extractMainIdea(body, heading) {
  if (!body) return heading || 'Key concept from this section.';
  // Take the first full sentence (ends at . ! ?)
  const firstSentenceMatch = body.match(/^([^.!?]{10,}[.!?])/);
  if (firstSentenceMatch) {
    const s = firstSentenceMatch[1].trim();
    return s.length <= 140 ? s : s.slice(0, 137) + '...';
  }
  // Fallback: first 120 chars
  return body.length <= 120 ? body : body.slice(0, 117) + '...';
}

/**
 * Split body into readable key-point bullet strings (2–4 per card).
 */
function extractKeyPoints(body) {
  if (!body) return [];
  // Split on sentence boundaries
  const sentences = body.match(/[^.!?]{10,}[.!?]/g) || [body];
  return sentences.slice(0, 4).map((s) => s.trim()).filter(Boolean);
}

// Extractive analysis for user-provided custom source text
export function extractFromSourceText(rawText, cardCount = 4, titleHint = '') {
  // ── Step 1: pre-process ──────────────────────────────────────────────────
  const processed = preprocessSourceText(rawText);

  // ── Step 2: derive collection title ─────────────────────────────────────
  let collectionTitle = titleHint && titleHint.trim() ? titleHint.trim() : '';
  if (!collectionTitle) {
    // Use the very first non-empty line of the original text as title
    const firstLine = rawText.split('\n').map((l) => l.trim()).find((l) => l.length > 3) || 'Study Material';
    collectionTitle =
      firstLine.length <= 60 ? firstLine : firstLine.slice(0, 57) + '...';
    // Strip any leading LaTeX
    collectionTitle = collectionTitle.replace(/\\\(.*?\\\)/g, '').replace(/\$.*?\$/g, '').trim();
    if (!collectionTitle) collectionTitle = 'Study Material';
  }

  // ── Step 3: detect sections ──────────────────────────────────────────────
  const sections = detectSections(processed);

  // ── Step 4: extract vocabulary (terms defined with colon or parenthetical) ─
  const vocabulary = [];
  const meaningRegex = /\b([A-Za-z][A-Za-z0-9 -]{2,30})\s*\((?:meaning|defined? as|denoting?)\s+([^)]{5,80})\)/gi;
  const colonRegex = /\b([A-Z][A-Za-z0-9 -]{2,25})\s*:\s*([A-Z][^.;\n]{10,100})/g;
  let m;
  while ((m = meaningRegex.exec(processed)) !== null && vocabulary.length < 6) {
    const term = m[1].trim();
    const def = m[2].trim();
    if (!vocabulary.some((v) => v.term.toLowerCase() === term.toLowerCase())) {
      vocabulary.push({ term, definition: def });
    }
  }
  while ((m = colonRegex.exec(processed)) !== null && vocabulary.length < 6) {
    const term = m[1].trim();
    const def = m[2].trim();
    // Skip if term looks like a heading we already captured
    if (term.split(' ').length <= 5 && def.length >= 15 &&
        !vocabulary.some((v) => v.term.toLowerCase() === term.toLowerCase())) {
      vocabulary.push({ term, definition: def });
    }
  }

  // If still empty, pick frequent content words from the processed text
  if (vocabulary.length === 0) {
    const stopWords = new Set([
      'which', 'their', 'about', 'would', 'these', 'could', 'where', 'there',
      'other', 'from', 'that', 'this', 'with', 'have', 'they', 'also', 'into',
      'used', 'when', 'some', 'than', 'been', 'more', 'most', 'such', 'both',
    ]);
    const words = processed.match(/\b[A-Za-z]{5,}\b/g) || [];
    const freq = {};
    for (const w of words) {
      const lw = w.toLowerCase();
      if (!stopWords.has(lw)) freq[lw] = (freq[lw] || 0) + 1;
    }
    const topWords = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 4);
    for (const w of topWords) {
      vocabulary.push({
        term: w.charAt(0).toUpperCase() + w.slice(1),
        definition: 'Key term appearing frequently in the source material.',
      });
    }
  }

  // ── Step 5: merge sections into N cards ─────────────────────────────────
  // If detectSections produced fewer sections than requested (e.g. a 2-sentence
  // paragraph yields only 1 section), fall back to sentence-level splitting
  // so the user always gets the number of cards they asked for.
  let workingSections = sections;
  if (sections.length < cardCount) {
    // Split all body text into individual sentences and distribute as sections
    const allBody = sections.map((s) => s.body).join(' ');
    const sentences = allBody.match(/[^.!?]{10,}[.!?]/g) || [allBody];
    if (sentences.length >= cardCount) {
      const chunkSize = Math.ceil(sentences.length / cardCount);
      workingSections = [];
      for (let i = 0; i < cardCount; i++) {
        const chunk = sentences.slice(i * chunkSize, (i + 1) * chunkSize);
        if (chunk.length > 0) {
          workingSections.push({
            heading: sections[i]?.heading || `Section ${i + 1}`,
            body: chunk.join(' '),
          });
        }
      }
    }
  }

  const count = Math.max(1, Math.min(cardCount, workingSections.length));

  // Group sections evenly into `count` cards
  const groupSize = Math.ceil(workingSections.length / count);
  const cards = [];

  for (let i = 0; i < count; i++) {
    const group = workingSections.slice(i * groupSize, (i + 1) * groupSize);

    if (group.length === 0) break;

    // Card title: use first section heading in the group
    const cardHeading = group[0].heading || `Section ${i + 1}`;
    const cardTitle =
      cardHeading.length <= 50 ? cardHeading : cardHeading.slice(0, 47) + '...';

    // Combine body text for this card
    const combinedBody = group.map((s) => s.body).join(' ');

    const mainIdea = extractMainIdea(group[0].body, cardHeading);
    const keyPoints = extractKeyPoints(combinedBody);

    // Spread vocabulary across cards (each card gets up to 2 terms)
    const cardVocab = vocabulary.slice(i * 2, i * 2 + 2);

    // Self-check question uses the specific card heading
    const selfCheck = `What is the key point about "${cardTitle}" and how does it relate to ${collectionTitle}?`;

    cards.push({
      id: `card_${i + 1}`,
      sectionNumber: i + 1,
      title: cardTitle,
      mainIdea,
      explanation: combinedBody.length <= 600 ? combinedBody : combinedBody.slice(0, 597) + '...',
      keyPoints: keyPoints.length > 0 ? keyPoints : [mainIdea],
      vocabulary: cardVocab,
      selfCheck,
    });
  }

  // ── Step 6: return collection ────────────────────────────────────────────
  const wordCount = rawText.split(/\s+/).length;
  return {
    title: collectionTitle,
    estimatedReadingMinutes: Math.max(2, Math.ceil(wordCount / 150)),
    cards,
  };
}


// Rigorous, scientifically and technically verified educational knowledge base
export const VERIFIED_TOPICS = {
  chlorophyll: {
    name: 'Chlorophyll',
    category: 'Biology / Plant Physiology',
    decoder: {
      simpleExplanation:
        'Chlorophyll is a green biological pigment found inside chloroplasts of plants, algae, and cyanobacteria. Its primary role is absorbing sunlight—specifically blue and red wavelengths—to drive photosynthesis, while reflecting green light, which makes plants look green.',
      analogy:
        'Think of chlorophyll as biological solar panels installed on a plant leaf. Just as solar panels capture light energy from the sun and convert it into electricity, chlorophyll captures light photons and converts that energy into chemical energy stored in sugars.',
      keyTerms: [
        { term: 'Chloroplast', definition: 'The cellular organelle in plant and algal cells where photosynthesis takes place.' },
        { term: 'Thylakoid Membrane', definition: 'The microscopic internal membrane structure inside chloroplasts where chlorophyll pigments are embedded.' },
        { term: 'Absorption Spectrum', definition: 'The specific wavelengths of electromagnetic radiation (light) that a pigment absorbs most effectively (for chlorophyll: blue ~430nm and red ~660nm).' },
        { term: 'Chlorophyll-a & b', definition: 'The two main types of chlorophyll in plants: chlorophyll-a is the primary electron donor in the light reaction; chlorophyll-b acts as an accessory antenna pigment.' }
      ],
      takeaways: [
        'Chlorophyll is the essential photosynthetic pigment that traps light energy in plants, algae, and cyanobacteria.',
        'It absorbs blue and red wavelengths of light while reflecting green light, giving foliage its green color.',
        'It contains a magnesium ion (Mg2+) held within a porphyrin ring structure responsible for electron excitation.',
        'Without chlorophyll, oxygenic photosynthesis cannot initiate the light-dependent reactions that produce ATP and NADPH.'
      ],
      example:
        'In autumn, deciduous trees break down chlorophyll to reabsorb its nutrients. As the dominant green chlorophyll fades away, underlying accessory pigments like orange carotenoids and yellow xanthophylls become visible.',
      selfCheck: {
        question: 'Why do plant leaves appear green to the human eye, even though chlorophyll absorbs light for photosynthesis?',
        hint: 'Consider which wavelengths of the visible spectrum chlorophyll absorbs versus which wavelengths it reflects back to your eyes.'
      }
    },
    focusCards: {
      title: 'Bite-Sized Guide: Chlorophyll & Light Harvesting',
      estimatedReadingMinutes: 8,
      cards: [
        {
          id: 'card_1',
          sectionNumber: 1,
          title: 'Etymology & Biological Definition',
          mainIdea: 'Chlorophyll is the primary green pigment in photosynthetic organisms, derived from Greek roots meaning "pale green leaf".',
          explanation: 'Coined from Greek "khloros" (pale green) and "phyllon" (leaf), chlorophyll is a lipid-soluble pigment found in plant chloroplasts and cyanobacteria that absorbs photon energy to initiate the synthesis of organic molecules from carbon dioxide and water.',
          keyPoints: [
            'Found in plants, green algae, and photosynthetic bacteria.',
            'Contains a central magnesium ion coordinated inside a porphyrin ring.',
            'Hydrophobic hydrocarbon tail anchors it securely within thylakoid lipid membranes.'
          ],
          vocabulary: [
            { term: 'Porphyrin Ring', definition: 'A flat, light-absorbing heterocyclic ring with a central magnesium ion in chlorophyll.' },
            { term: 'Phytol Tail', definition: 'A hydrophobic chain that anchors the chlorophyll molecule into the thylakoid membrane.' }
          ],
          selfCheck: 'What central metal ion is required at the heart of the chlorophyll molecular structure?'
        },
        {
          id: 'card_2',
          sectionNumber: 2,
          title: 'Light Absorption & The Color Paradox',
          mainIdea: 'Chlorophyll captures blue and red wavelengths while transmitting and reflecting green light.',
          explanation: 'Chlorophyll does not absorb all sunlight equally. It exhibits strong absorption peaks in the blue (~430-450 nm) and red (~640-660 nm) regions of the visible spectrum. Because it reflects and transmits wavelengths between 500-550 nm (green), our eyes perceive leaves as green.',
          keyPoints: [
            'Absorbs highest energy photons in the violet-blue spectrum.',
            'Absorbs lower energy photons in the red spectrum to excite electrons.',
            'Green light is largely reflected rather than utilized.'
          ],
          vocabulary: [
            { term: 'Photon Excitation', definition: 'When an absorbed photon boosts a chlorophyll electron to a higher energy orbital.' }
          ],
          selfCheck: 'Which colors of visible light are most efficiently absorbed by chlorophyll?'
        },
        {
          id: 'card_3',
          sectionNumber: 3,
          title: 'Chlorophyll Types: a vs. b and Accessory Pigments',
          mainIdea: 'Chlorophyll-a performs the primary photochemical reaction, while chlorophyll-b and carotenoids broaden the light-harvesting spectrum.',
          explanation: 'Plants possess both chlorophyll-a (the primary electron donor in photosystems I and II) and chlorophyll-b (an antenna pigment with a slightly different absorption spectrum). Accessory pigments like carotenoids also protect chlorophyll from phototoxic oxidative damage under intense sunlight.',
          keyPoints: [
            'Chlorophyll-a is the reaction center pigment present in all oxygenic photosynthetic organisms.',
            'Chlorophyll-b has a formyl (-CHO) group instead of a methyl (-CH3) group, shifting its absorption spectrum.',
            'Carotenoids protect against excess light through non-photochemical quenching.'
          ],
          vocabulary: [
            { term: 'Reaction Center', definition: 'The specialized chlorophyll-a complex that converts excited electron energy into chemical charge separation.' }
          ],
          selfCheck: 'What is the functional difference between chlorophyll-a and accessory pigments like chlorophyll-b?'
        },
        {
          id: 'card_4',
          sectionNumber: 4,
          title: 'Role in the Light-Dependent Reactions',
          mainIdea: 'Chlorophyll transfers excited electrons down the electron transport chain to generate ATP and NADPH.',
          explanation: 'When light strikes chlorophyll in Photosystem II (P680), an electron is excited and passed to an electron transport chain. The lost electron is replenished by splitting water molecules (photolysis), releasing oxygen (O2) as a byproduct. This electron flow drives the proton gradient that produces ATP.',
          keyPoints: [
            'Excited chlorophyll initiates photolysis (water splitting: 2H2O -> 4H+ + 4e- + O2).',
            'Generates the proton gradient across the thylakoid membrane that fuels ATP synthase.',
            'Supplies reducing power in the form of NADPH for the Calvin cycle.'
          ],
          vocabulary: [
            { term: 'Photolysis', definition: 'The light-activated enzymatic splitting of water into hydrogen ions, electrons, and oxygen gas.' }
          ],
          selfCheck: 'Where do the electrons come from to replace those lost by chlorophyll during the light reaction?'
        }
      ]
    },
    modes: {
      story: {
        mode: 'story',
        storyTitle: 'The Leaf as a Solar Powerhouse: How Chlorophyll Traps the Sun',
        storyText: 'Imagine walking into a high-tech solar power plant nestled inside every single leaf on a tree. Millions of microscopic solar collectors—chlorophyll molecules—are lined up along microscopic thylakoid rooftops inside cellular chloroplasts. As sunlight streams down from 93 million miles away, these collectors filter through the visible rainbow. They hunger for energetic blue photons and warm red photons, snatching them out of the air. But they have no use for green light, so they bounce it away into your eyes. Each time a photon hits a chlorophyll molecule, an electron leaps with excitement, kicking off an atomic bucket brigade that splits water and releases fresh oxygen for you to breathe.',
        conceptConnection: 'This story illustrates how chlorophyll functions: not as a passive dye, but as an active quantum light-harvester that absorbs specific wavelengths (blue and red) and drives electron excitation to convert photon energy into biological fuel.',
        moralOrInsight: 'In nature, color is not just decoration—the green of foliage is the direct visual footprint of unused light reflected while life captures the red and blue light needed to sustain the planet.'
      },
      step_by_step: {
        mode: 'step_by_step',
        whatItMeans: 'Chlorophyll is the principal light-absorbing pigment molecule in chloroplasts that drives oxygenic photosynthesis.',
        whyItMatters: 'Without chlorophyll, terrestrial and aquatic plant life could not convert solar radiation into chemical carbohydrates, halting the base of almost all global food webs and atmospheric oxygen production.',
        howItWorks: [
          'Step 1 (Photon Capture): Sunlight strikes the light-harvesting antenna complex, transferring resonance energy to a chlorophyll molecule.',
          'Step 2 (Electron Excitation): An electron in the porphyrin ring is boosted to a higher energy level (photoexcitation).',
          'Step 3 (Charge Separation): The excited electron is transferred to a primary electron acceptor in the reaction center (P680 in Photosystem II).',
          'Step 4 (Water Splitting): An enzyme splits a water molecule (photolysis), donating electrons back to chlorophyll and releasing O2 gas.',
          'Step 5 (ATP & NADPH Generation): The electron cascades down an electron transport chain, pumping protons to synthesize ATP and NADPH.'
        ],
        workedExample: 'A photon of wavelength 680 nm hits a P680 chlorophyll-a pair in Photosystem II. The electron excitation causes the reduction of pheophytin, which initiates the proton gradient that synthesizes 1 mole of ATP.',
        commonMistake: 'Believing that chlorophyll absorbs green light to make plants green. In reality, chlorophyll absorbs red and blue light, and REFLECTS green light.',
        summary: 'Chlorophyll captures photon energy in blue/red bands, excites electrons, splits water to replenish electrons, and fuels ATP/NADPH synthesis for carbon fixation.'
      },
      quiz: {
        mode: 'quiz',
        questions: [
          {
            id: 'q1',
            question: 'What is the primary biological function of chlorophyll in plant cells?',
            options: [
              'To store starch inside the root system',
              'To absorb photon light energy to drive photosynthetic electron transport',
              'To absorb water directly from atmospheric humidity',
              'To reflect all wavelengths of visible light equally'
            ],
            correctAnswerIndex: 1,
            explanation: 'Chlorophyll functions as the primary antenna and reaction center pigment that absorbs light energy to initiate the light-dependent reactions of photosynthesis.',
            difficulty: 'easy'
          },
          {
            id: 'q2',
            question: 'Which wavelengths of visible light does chlorophyll absorb most strongly?',
            options: [
              'Blue (~430-450 nm) and Red (~640-660 nm)',
              'Green (~520-550 nm) and Yellow (~580 nm)',
              'Only infrared radiation beyond 800 nm',
              'Only ultraviolet radiation below 300 nm'
            ],
            correctAnswerIndex: 0,
            explanation: 'Chlorophyll absorbs blue and red wavelengths of light very effectively, while transmitting and reflecting green light.',
            difficulty: 'medium'
          },
          {
            id: 'q3',
            question: 'What happens to replenish the electron lost when a chlorophyll molecule in Photosystem II is photoexcited?',
            options: [
              'It absorbs an electron from carbon dioxide gas',
              'Water molecules are split through photolysis, releasing O2 and supplying replacement electrons',
              'The plant absorbs electrons directly from mineral soil',
              'The chlorophyll molecule breaks down and is destroyed'
            ],
            correctAnswerIndex: 1,
            explanation: 'In Photosystem II, the oxygen-evolving complex splits water (2 H2O -> 4 H+ + 4 e- + O2) to supply replacement electrons to the oxidized chlorophyll reaction center.',
            difficulty: 'hard'
          }
        ]
      }
    },
    taskBreakdown: {
      taskPlanTitle: 'Study Plan: Mastering Chlorophyll & Light Reactions',
      totalEstimatedMinutes: 105,
      recommendedPriority: 'high',
      feasibility: 'Comprehensive and well-structured for mastering cellular photosynthesis within 1-2 study sessions.',
      schedulingNotes: 'Begin with molecular structure and absorption spectrum before attempting complex Z-scheme electron transport mechanics.',
      tasks: [
        {
          id: 't_1',
          title: 'Review Chlorophyll Molecular Structure (Porphyrin Ring & Phytol Tail)',
          description: 'Draw the magnesium-porphyrin head and hydrophobic phytol tail; note how it anchors in the thylakoid lipid bilayer.',
          estimatedMinutes: 20,
          priority: 'high',
          status: 'pending',
          dependencies: []
        },
        {
          id: 't_2',
          title: 'Graph the Absorption Spectrum vs. Action Spectrum',
          description: 'Compare absorption peaks of chlorophyll a and b (blue & red) against the overall action spectrum of photosynthesis.',
          estimatedMinutes: 25,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_1']
        },
        {
          id: 't_3',
          title: 'Diagram Photosystems II and I (P680 & P700)',
          description: 'Trace electron flow from water photolysis through plastoquinone, cytochrome b6f, and plastocyanin to NADP+ reductase.',
          estimatedMinutes: 30,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_2']
        },
        {
          id: 't_4',
          title: 'Practice 5 Exam Questions on Photolysis & Light Reactions',
          description: 'Test recall on photolysis stoichiometry, cyclic vs non-cyclic photophosphorylation, and magnesium deficiency effects.',
          estimatedMinutes: 30,
          priority: 'medium',
          status: 'pending',
          dependencies: ['t_3']
        }
      ]
    },
    practiceBridge: {
      conceptSummary: 'Chlorophyll pigments absorb specific photon wavelengths (blue and red) in thylakoid membranes to generate electron charge separation for ATP/NADPH synthesis.',
      scenario: 'You are an agricultural technologist designing an energy-efficient indoor vertical farming system. The LED grow lights currently consume excessive electricity by emitting a full broad-spectrum white light, but plant growth rates are lagging.',
      challenge: 'Design an optimized spectral lighting formula tailored to the absorption peaks of chlorophyll-a and chlorophyll-b to maximize photosynthetic efficiency while reducing electricity consumption.',
      requirements: [
        'Must specify the target optical wavelengths (in nm) for the LED fixtures based on chlorophyll absorption spectrum.',
        'Must explain why green LEDs (520-550 nm) can be minimized without significantly reducing primary carbon fixation.',
        'Must account for chlorophyll-b and accessory carotenoid absorption to prevent photoinhibition.',
        'Must calculate estimated energy savings when shifting from broad white spectrum to targeted narrow-band blue/red emission.'
      ],
      hints: [
        'Hint 1: Look at the distinct absorption peaks of chlorophyll-a (430 nm & 662 nm) and chlorophyll-b (453 nm & 642 nm).',
        'Hint 2: Since leaves reflect ~90% of pure green light, running high-intensity green LEDs wastes electricity compared to blue/red photons.',
        'Hint 3: Maintain a ~4:1 ratio of red-to-blue light: blue light regulates stomatal opening and vegetative morphology, while red light drives peak biomass growth.'
      ],
      expectedOutcome: 'A technical lighting blueprint combining ~450 nm blue LEDs and ~660 nm deep-red LEDs at an optimal 1:4 ratio, cutting non-utilized green radiation by 70% while boosting photosynthetic yield.',
      reflectionQuestions: [
        'Why might adding a small percentage of green light still be beneficial for deep canopy leaves in dense vertical farm racks?',
        'What physiological symptom would crops show if the hydroponic nutrient solution lacked magnesium ions (Mg2+)?',
        'How does chlorophyll-a differ chemically from chlorophyll-b, and why does this chemical shift affect light harvesting?'
      ],
      optionalSolution: 'Optimal Solution Blueprint:\n1. Spectral Mix: 80% Hyper Red (660 nm) + 20% Deep Blue (450 nm). Red light targets the P680 reaction center peak for high quantum yield; blue light stimulates chlorophyll-b and activates cryptochrome photoreceptors to maintain healthy leaf thickness.\n2. Minimizing Green: Removing broad-spectrum green diodes saves ~35% wattage per fixture with negligible drop in photosynthetic electron transport rate (ETR).\n3. Canopy Penetration: In multi-layer dense canopies, 5% broad white light can be added because green light penetrates deeper through upper leaves to reach shaded lower foliage.'
    }
  },

  'binary search': {
    name: 'Binary Search',
    category: 'Computer Science / Algorithms',
    decoder: {
      simpleExplanation:
        'Binary search is an efficient search algorithm that finds the position of a target value within a sorted array. It repeatedly divides the search interval in half by comparing the target with the middle element, eliminating half of the remaining elements at each step.',
      analogy:
        'Imagine looking up a word in a printed dictionary. You do not read every page from the beginning (linear search). Instead, you open the book in the middle. If your word starts with "M" and you opened to "T", you instantly ignore the entire second half of the book and repeat the process on the first half.',
      keyTerms: [
        { term: 'Sorted Precondition', definition: 'Binary search strictly requires the collection to be in sorted order (ascending or descending) to work.' },
        { term: 'Midpoint Calculation', definition: 'Finding the index halfway between the low and high pointers: mid = low + ((high - low) / 2).' },
        { term: 'Time Complexity O(log n)', definition: 'Logarithmic runtime: searching 1,000,000 items takes at most ~20 comparisons.' },
        { term: 'Divide and Conquer', definition: 'The algorithmic paradigm of breaking a problem down into smaller sub-problems until it becomes trivial.' }
      ],
      takeaways: [
        'Binary search requires that the underlying data is already sorted.',
        'Each comparison eliminates 50% of the remaining search space.',
        'Its worst-case and average-case time complexity is O(log n), far superior to O(n) linear search for large datasets.',
        'Its space complexity is O(1) for the iterative implementation.'
      ],
      example:
        'In a sorted phonebook of 1,024 names, linear search could take up to 1,024 checks. Binary search will find any name (or confirm it is missing) in at most 10 checks (since 2^10 = 1,024).',
      selfCheck: {
        question: 'Why will binary search fail or produce incorrect results if applied to an unsorted array?',
        hint: 'Think about the decision to discard the left or right half: how does the algorithm know which half contains the target?'
      }
    },
    focusCards: {
      title: 'Bite-Sized Guide: Binary Search Fundamentals',
      estimatedReadingMinutes: 7,
      cards: [
        {
          id: 'card_1',
          sectionNumber: 1,
          title: 'The Invariant: Pre-sorted Data',
          mainIdea: 'Binary search relies entirely on the mathematical guarantee that items are ordered.',
          explanation: 'Before binary search can be invoked, elements must be strictly ordered (e.g. A[0] <= A[1] <= ... <= A[n-1]). This invariant guarantees that if the target is smaller than the middle element, it CANNOT exist anywhere in the right half of the array.',
          keyPoints: [
            'Only works on random-access, sorted data structures (like arrays).',
            'Does not work efficiently on standard singly-linked lists because finding the middle takes O(n) time.',
            'If data changes frequently, the cost of sorting must be weighed against search frequency.'
          ],
          vocabulary: [
            { term: 'Monotonicity', definition: 'A property where values only increase or only decrease, enabling directional decisions.' }
          ],
          selfCheck: 'Why is binary search inefficient on a standard singly linked list even if the list is sorted?'
        },
        {
          id: 'card_2',
          sectionNumber: 2,
          title: 'The Three-Pointer Mechanism (Low, High, Mid)',
          mainIdea: 'Two boundary pointers and a calculated midpoint narrow the active search window.',
          explanation: 'The search range is maintained using two indices: low = 0 and high = array.length - 1. While low <= high, compute mid = low + Math.floor((high - low) / 2). If array[mid] == target, return mid. If array[mid] < target, set low = mid + 1. If array[mid] > target, set high = mid - 1.',
          keyPoints: [
            'Using low + (high - low)/2 prevents integer overflow in languages with fixed-width integers.',
            'The loop terminates when low > high, indicating the target is absent.',
            'Each iteration strictly shrinks the window by at least one element.'
          ],
          vocabulary: [
            { term: 'Integer Overflow', definition: 'When (low + high) exceeds the maximum 32-bit signed integer value (2,147,483,647).' }
          ],
          selfCheck: 'Why is mid = low + (high - low)/2 preferred over mid = (low + high)/2?'
        },
        {
          id: 'card_3',
          sectionNumber: 3,
          title: 'Logarithmic Complexity O(log n)',
          mainIdea: 'Halving the search space creates an exponential drop in required operations.',
          explanation: 'Because the remaining search size n is divided by 2 on each step (n, n/2, n/4, ..., 1), the maximum number of iterations k satisfies n / 2^k = 1, meaning k = log2(n). For 1 billion items, binary search takes at most 30 comparisons.',
          keyPoints: [
            'Best case: O(1) when target is directly at the first midpoint.',
            'Worst case: O(log2 n) comparisons when target is at an extreme or not present.',
            'Auxiliary Space: O(1) iterative, O(log n) recursive due to call stack frames.'
          ],
          vocabulary: [
            { term: 'Logarithm (base 2)', definition: 'The exponent to which 2 must be raised to yield the value n.' }
          ],
          selfCheck: 'How many maximum comparisons does binary search need to search an array of 1,000,000 items?'
        }
      ]
    },
    modes: {
      story: {
        mode: 'story',
        storyTitle: 'The Number Guessing Game: The Power of Halving',
        storyText: 'Imagine playing a guessing game where your friend picks a secret whole number between 1 and 100. If you guess 1, 2, 3, 4 in sequence, you might need 100 guesses. Instead, you smartly guess 50. Your friend says, "Too high!" In a single second, you eliminate 50 numbers (51 to 100). Next, you guess 25. "Too low!" Now you have eliminated 1 through 25. Next you guess 37. By continually cutting the remaining choices in half, you pin down the exact number in just 6 or 7 guesses every single time.',
        conceptConnection: 'This guessing game is the exact execution trace of binary search: each question is a midpoint comparison that chops off exactly half the candidate space.',
        moralOrInsight: 'Exponential growth works in reverse when dividing: an immense problem becomes trivial when you can eliminate half of it with every single decision.'
      },
      step_by_step: {
        mode: 'step_by_step',
        whatItMeans: 'Binary search is an algorithm that locates a key within a sorted array in O(log n) time by repeated halving.',
        whyItMatters: 'As datasets grow into millions or billions of records, linear O(n) search takes seconds or minutes, while binary search O(log n) finishes in microseconds.',
        howItWorks: [
          'Step 1 (Precondition): Verify the array is sorted in ascending order.',
          'Step 2 (Initialize): Set pointer low = 0 and pointer high = length - 1.',
          'Step 3 (Loop Condition): While low <= high, compute mid = low + Math.floor((high - low) / 2).',
          'Step 4 (Comparison): If array[mid] === target, return mid index.',
          'Step 5 (Branch Left or Right): If array[mid] < target, set low = mid + 1; otherwise set high = mid - 1.',
          'Step 6 (Exit): If loop ends without match, return -1 (element not found).'
        ],
        workedExample: 'Array: [3, 8, 15, 23, 42, 77, 91], Target: 42. Step 1: low=0, high=6 -> mid=3 (value 23). 23 < 42 -> low=4. Step 2: low=4, high=6 -> mid=5 (value 77). 77 > 42 -> high=4. Step 3: low=4, high=4 -> mid=4 (value 42). Match found at index 4!',
        commonMistake: 'Using mid = (low + high) / 2 which causes integer overflow on large arrays, or using low < high instead of low <= high which misses the single-element boundary case.',
        summary: 'Binary search requires sorted arrays and maintains low/high pointers to halve search ranges in O(log n) time and O(1) space.'
      },
      quiz: {
        mode: 'quiz',
        questions: [
          {
            id: 'q1',
            question: 'What is the absolute mandatory prerequisite before binary search can be performed on an array?',
            options: [
              'The array elements must be unique with no duplicates',
              'The array elements must be sorted in order',
              'The array size must be an exact power of 2',
              'All array values must be positive integers'
            ],
            correctAnswerIndex: 1,
            explanation: 'Binary search depends on the directional invariant provided by sorted order; without it, eliminating halves is invalid.',
            difficulty: 'easy'
          },
          {
            id: 'q2',
            question: 'What is the worst-case time complexity of binary search on an array of n sorted elements?',
            options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
            correctAnswerIndex: 1,
            explanation: 'Because the remaining search size is halved on every iteration, it requires at most log2(n) steps.',
            difficulty: 'medium'
          },
          {
            id: 'q3',
            question: 'Why is mid calculated as low + ((high - low) / 2) instead of (low + high) / 2?',
            options: [
              'It makes the code run in O(1) rather than O(n)',
              'It avoids potential 32-bit integer overflow when low + high exceeds 2^31 - 1',
              'It automatically handles descending sorted arrays',
              'It rounds floating point numbers to the nearest prime'
            ],
            correctAnswerIndex: 1,
            explanation: 'When low and high are both large positive integers, their sum can exceed the maximum representable integer, causing integer overflow into negative numbers.',
            difficulty: 'hard'
          }
        ]
      }
    },
    taskBreakdown: {
      taskPlanTitle: 'Study Plan: Binary Search & Divide-and-Conquer Algorithms',
      totalEstimatedMinutes: 90,
      recommendedPriority: 'high',
      feasibility: 'Ideal 90-minute structured session covering conceptual basics, implementation traps, and 3 coding variations.',
      schedulingNotes: 'Code the iterative version first before attempting boundary search variations (lower bound / upper bound).',
      tasks: [
        {
          id: 't_1',
          title: 'Implement Classic Iterative Binary Search in Code',
          description: 'Write iterative binary search from scratch; ensure handling of integer overflow and empty arrays.',
          estimatedMinutes: 20,
          priority: 'high',
          status: 'pending',
          dependencies: []
        },
        {
          id: 't_2',
          title: 'Analyze Edge Cases: Target at ends, Single Element, Not Present',
          description: 'Step through traces where target is smaller than index 0, larger than index n-1, or exactly matches bounds.',
          estimatedMinutes: 20,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_1']
        },
        {
          id: 't_3',
          title: 'Implement Lower Bound and Upper Bound (Duplicates Handling)',
          description: 'Modify standard binary search to locate the first occurrence and last occurrence of a target value.',
          estimatedMinutes: 30,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_2']
        },
        {
          id: 't_4',
          title: 'Solve "Search in Rotated Sorted Array" Challenge',
          description: 'Apply binary search logic to an array that has been rotated at an unknown pivot point.',
          estimatedMinutes: 20,
          priority: 'medium',
          status: 'pending',
          dependencies: ['t_3']
        }
      ]
    },
    practiceBridge: {
      conceptSummary: 'Binary search achieves O(log n) lookup by repeatedly evaluating the midpoint of a monotonically sorted sequence and discarding the unviable half.',
      scenario: 'You are working as an infrastructure engineer at a video streaming platform. System error logs contain 50 million server request events sorted chronologically by millisecond timestamp. An incident occurred between timestamp T_start and T_end.',
      challenge: 'Implement an efficient search routine that extracts all log entries between timestamps T_start and T_end without scanning the entire 50 million log dataset.',
      requirements: [
        'Must find the lower bound index for T_start in O(log n) time.',
        'Must find the upper bound index for T_end in O(log n) time.',
        'Total search time must be under 5 milliseconds.',
        'Must handle cases where exact timestamps do not match any single log entry.'
      ],
      hints: [
        'Hint 1: Use two independent binary searches: one to find the first index where timestamp >= T_start, and one for the last index where timestamp <= T_end.',
        'Hint 2: Once both boundary indices are found, the target log entries are simply the contiguous subarray slice between index_start and index_end.',
        'Hint 3: If index_start > index_end, immediately return an empty result without reading file blocks.'
      ],
      expectedOutcome: 'A high-performance two-pass binary search algorithm executing in ~50 comparisons total (2 * log2(50,000,000) ≈ 52 checks) instead of 50,000,000 sequential scans.',
      reflectionQuestions: [
        'Why is binary search applicable to time-series logs even if timestamps have gaps between seconds?',
        'What would happen if clock synchronization on servers caused a few timestamps to be logged out of order?',
        'How does binary search scale compared to a B-tree database index for ordered range queries?'
      ],
      optionalSolution: 'Solution Walkthrough:\n1. Lower Bound Binary Search: Find the smallest index `i` such that `logs[i].timestamp >= T_start` using `if (logs[mid].timestamp >= T_start) high = mid - 1; else low = mid + 1;`.\n2. Upper Bound Binary Search: Find the largest index `j` such that `logs[j].timestamp <= T_end`.\n3. Result: Return slice `logs[i...j]`. Complexity: O(log N + K) where N = 50,000,000 and K = number of matching logs in the time window. Runtime: < 1ms memory lookup.'
    }
  },

  'database normalization': {
    name: 'Database Normalization',
    category: 'Computer Science / Databases',
    decoder: {
      simpleExplanation:
        'Database normalization is the process of organizing data in a relational database to reduce data redundancy and eliminate anomalies during inserts, updates, and deletes. It involves decomposing large, messy tables into smaller, well-structured tables linked by foreign keys.',
      analogy:
        'Imagine keeping a single paper spreadsheet where every customer order includes the customer’s full name, home address, and phone number on every row. If a customer moves, you have to update their address on 50 different rows—and if you miss one, your records conflict! Normalization means keeping one "Customers" list and one "Orders" list, connected by a simple Customer ID.',
      keyTerms: [
        { term: 'First Normal Form (1NF)', definition: 'Each table cell must contain a single atomic (indivisible) value, with no repeating groups or comma-separated lists.' },
        { term: 'Second Normal Form (2NF)', definition: 'Must be in 1NF, and all non-key attributes must be fully functionally dependent on the entire primary key (no partial dependencies).' },
        { term: 'Third Normal Form (3NF)', definition: 'Must be in 2NF, and no non-key attribute can depend on another non-key attribute (no transitive dependencies).' },
        { term: 'Modification Anomalies', definition: 'Insert, update, or delete bugs that corrupt data integrity when tables are not normalized.' }
      ],
      takeaways: [
        'Normalization organizes relational tables to eliminate redundant duplicate data.',
        'It prevents update anomalies, deletion anomalies, and insertion anomalies.',
        '1NF ensures atomic columns; 2NF removes partial key dependencies; 3NF removes transitive dependencies.',
        'Over-normalization can require complex SQL JOINs, so production systems sometimes selectively denormalize for read performance.'
      ],
      example:
        'Instead of storing CourseName and InstructorEmail inside an Enrollment table, 3NF separates them into a Courses table and an Instructors table linked by IDs.',
      selfCheck: {
        question: 'What is a transitive dependency, and which normal form is specifically designed to eliminate it?',
        hint: 'Think about when column A determines column B, and column B determines column C.'
      }
    },
    focusCards: {
      title: 'Bite-Sized Guide: Relational Database Normalization',
      estimatedReadingMinutes: 8,
      cards: [
        {
          id: 'card_1',
          sectionNumber: 1,
          title: 'The Problem: Database Anomalies',
          mainIdea: 'Unnormalized tables suffer from insertion, update, and deletion anomalies that corrupt records.',
          explanation: 'When customer info and order info share a single table: Updating an address requires altering multiple rows (Update Anomaly). Deleting a customer’s only order accidentally deletes their contact details forever (Delete Anomaly). Adding a customer who has not yet ordered is impossible without dummy order data (Insert Anomaly).',
          keyPoints: [
            'Update Anomaly: Data inconsistency when changes are made in some rows but missed in others.',
            'Delete Anomaly: Unintended loss of crucial data when a related entity is removed.',
            'Insert Anomaly: Inability to record certain information without inserting null or dummy attributes.'
          ],
          vocabulary: [
            { term: 'Anomaly', definition: 'An inconsistency or error caused by redundant data storage in relational tables.' }
          ],
          selfCheck: 'Give an example of a delete anomaly in a single-table student enrollment system.'
        },
        {
          id: 'card_2',
          sectionNumber: 2,
          title: 'First Normal Form (1NF): Atomic Values',
          mainIdea: 'Each column must hold a single, indivisible value with a designated primary key.',
          explanation: 'To satisfy 1NF, eliminate repeating groups and multi-valued attributes. For instance, a "PhoneNumbers" column containing "555-1234, 555-9876" violates 1NF because it holds multiple values. Each row must have a unique identifier and atomic scalar values.',
          keyPoints: [
            'Every column contains only atomic (indivisible) values.',
            'No repeating groups or arrays stored inside a single table cell.',
            'A primary key must uniquely identify each record in the table.'
          ],
          vocabulary: [
            { term: 'Atomicity', definition: 'The state where data cannot be decomposed into smaller meaningful components.' }
          ],
          selfCheck: 'How do you fix a column named "Skills" that contains "Java, Python, SQL" to achieve 1NF?'
        },
        {
          id: 'card_3',
          sectionNumber: 3,
          title: 'Second Normal Form (2NF): No Partial Dependencies',
          mainIdea: 'All non-key attributes must depend on the WHOLE composite primary key.',
          explanation: '2NF applies to tables with composite primary keys (keys made of multiple columns, e.g. {StudentID, CourseID}). If a column like CourseName depends only on CourseID and not on StudentID, that is a Partial Dependency and violates 2NF. Move CourseName to a dedicated Courses table.',
          keyPoints: [
            'Table must already be in 1NF.',
            'No non-prime attribute may depend on a proper subset of any candidate key.',
            'Tables with single-column primary keys are automatically in 2NF if they meet 1NF.'
          ],
          vocabulary: [
            { term: 'Partial Dependency', definition: 'When a non-key column depends on only part of a composite primary key.' }
          ],
          selfCheck: 'If a table has a single-column primary key and satisfies 1NF, is it automatically in 2NF?'
        },
        {
          id: 'card_4',
          sectionNumber: 4,
          title: 'Third Normal Form (3NF) & Beyond',
          mainIdea: 'Eliminate transitive dependencies: non-key columns must depend only on the primary key.',
          explanation: 'In 3NF, non-key columns cannot depend on other non-key columns. If EmployeeID -> DepartmentID, and DepartmentID -> DepartmentHead, then DepartmentHead transitively depends on EmployeeID. 3NF extracts Department data into its own table.',
          keyPoints: [
            'Must already satisfy 2NF.',
            'No transitive functional dependencies (A -> B and B -> C implies A -> C).',
            'Rule of thumb: "Every non-key attribute must depend on the key, the whole key, and nothing but the key."'
          ],
          vocabulary: [
            { term: 'Transitive Dependency', definition: 'An indirect relationship between values in the same table where X -> Z through X -> Y.' }
          ],
          selfCheck: 'Recite the famous oath describing 1NF, 2NF, and 3NF attributes.'
        }
      ]
    },
    modes: {
      story: {
        mode: 'story',
        storyTitle: 'The Tale of the Chaotic Hotel Ledger: The Birth of Normalization',
        storyText: 'In a seaside resort in 1970, manager Arthur kept a single giant leather ledger for everything: guest names, credit cards, room numbers, bed sizes, and breakfast orders all jammed into one row per reservation. When a guest changed their phone number, Arthur had to search 400 pages to erase the old number by hand. One day, a guest canceled their reservation, and Arthur scratched out the row—accidentally erasing the only record of the room’s bed size and nightly rate! Desperate, Arthur split his records into three organized binders: Guests, Rooms, and Reservations. From that day on, updating a phone number took two seconds in the Guests binder, and room details were never accidentally deleted.',
        conceptConnection: 'Arthur discovered database normalization: decomposing one bloated table with severe update and delete anomalies into clean, interconnected relational tables linked by IDs.',
        moralOrInsight: 'Store each fact in exactly one place. Redundancy breeds contradiction; modularity guarantees integrity.'
      },
      step_by_step: {
        mode: 'step_by_step',
        whatItMeans: 'Database normalization is a systematic technique for organizing relational schema to minimize data redundancy and dependency anomalies.',
        whyItMatters: 'Unnormalized schemas lead to corrupted, out-of-sync records and make data updates costly and error-prone.',
        howItWorks: [
          'Step 1 (Examine Unnormalized Data): Identify all columns, primary key candidates, and functional dependencies.',
          'Step 2 (Achieve 1NF): Split composite/multi-valued attributes into separate atomic rows and designate a primary key.',
          'Step 3 (Achieve 2NF): For composite keys, remove partial dependencies by moving partially-dependent attributes to separate tables.',
          'Step 4 (Achieve 3NF): Remove transitive dependencies where non-key attributes determine other non-key attributes.',
          'Step 5 (Establish Foreign Keys): Link the newly created tables using primary-key to foreign-key constraints.'
        ],
        workedExample: 'Table: StudentCourse(StudentID, CourseID, StudentName, CourseFee). Functional dependencies: StudentID -> StudentName (Partial), CourseID -> CourseFee (Partial). Decompose into Students(StudentID, StudentName), Courses(CourseID, CourseFee), and Enrollments(StudentID, CourseID). Now in 2NF and 3NF!',
        commonMistake: 'Over-normalizing into dozens of tiny tables without evaluating the SQL JOIN performance overhead for read-heavy analytical applications.',
        summary: 'Normalization progresses from 1NF (atomic) to 2NF (no partial key dependencies) to 3NF (no transitive dependencies), securing data integrity.'
      },
      quiz: {
        mode: 'quiz',
        questions: [
          {
            id: 'q1',
            question: 'Which normal form requires all column values to be atomic and forbids repeating groups?',
            options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
            correctAnswerIndex: 0,
            explanation: '1NF mandates that each attribute value must be atomic (indivisible) and each record uniquely identifiable.',
            difficulty: 'easy'
          },
          {
            id: 'q2',
            question: 'What type of dependency is specifically targeted and eliminated in Second Normal Form (2NF)?',
            options: ['Transitive dependencies', 'Partial dependencies on a composite primary key', 'Multi-valued dependencies', 'Trivial functional dependencies'],
            correctAnswerIndex: 1,
            explanation: '2NF removes partial functional dependencies where a non-prime attribute depends on only part of a composite primary key.',
            difficulty: 'medium'
          },
          {
            id: 'q3',
            question: 'Suppose in a table we have functional dependencies: EmpID -> DeptID, and DeptID -> DeptManager. What kind of dependency exists between EmpID and DeptManager?',
            options: [
              'A partial dependency violating 2NF',
              'A transitive dependency violating 3NF',
              'An atomic violation of 1NF',
              'A cyclic dependency violating BCNF'
            ],
            correctAnswerIndex: 1,
            explanation: 'Because EmpID determines DeptID and DeptID determines DeptManager, EmpID transitively determines DeptManager through another non-key attribute.',
            difficulty: 'hard'
          }
        ]
      }
    },
    taskBreakdown: {
      taskPlanTitle: 'Action Plan: Master Relational Database Normalization',
      totalEstimatedMinutes: 100,
      recommendedPriority: 'high',
      feasibility: 'Comprehensive step-by-step path taking a beginner through theory, practical SQL schema normalization, and exam practice.',
      schedulingNotes: 'Master functional dependency notation (X -> Y) before attempting 3NF and BCNF decomposition exercises.',
      tasks: [
        {
          id: 't_1',
          title: 'Understand Functional Dependencies and Candidate Keys',
          description: 'Learn the formal definition of functional dependencies (X -> Y) and practice identifying candidate keys.',
          estimatedMinutes: 20,
          priority: 'high',
          status: 'pending',
          dependencies: []
        },
        {
          id: 't_2',
          title: 'Step-by-Step 1NF, 2NF, and 3NF Decomposition Practice',
          description: 'Take an unnormalized invoice spreadsheet table and manually decompose it into 1NF, 2NF, and 3NF tables on paper.',
          estimatedMinutes: 30,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_1']
        },
        {
          id: 't_3',
          title: 'Study Boyce-Codd Normal Form (BCNF) vs 3NF',
          description: 'Review edge-case functional dependencies with overlapping candidate keys where 3NF is satisfied but BCNF is violated.',
          estimatedMinutes: 25,
          priority: 'medium',
          status: 'pending',
          dependencies: ['t_2']
        },
        {
          id: 't_4',
          title: 'Write SQL DDL to Implement Normalized Schema with Foreign Keys',
          description: 'Write CREATE TABLE statements with primary keys, foreign keys, and ON DELETE CASCADE constraints.',
          estimatedMinutes: 25,
          priority: 'medium',
          status: 'pending',
          dependencies: ['t_3']
        }
      ]
    },
    practiceBridge: {
      conceptSummary: 'Database normalization decomposes tables to satisfy functional dependency rules (1NF, 2NF, 3NF), eliminating modification anomalies while preserving dependencies.',
      scenario: 'You are hired by an e-commerce startup whose database crashes every weekend. A single monolithic table `OrdersReport` contains customer addresses, item catalogs, vendor emails, warehouse locations, and order status.',
      challenge: 'Decompose the unnormalized `OrdersReport` schema into a set of 3NF-compliant relational tables linked by foreign keys, eliminating duplicate addresses and preventing delete anomalies.',
      requirements: [
        'Must eliminate multi-valued columns (1NF).',
        'Must remove partial dependencies on order item line keys (2NF).',
        'Must remove transitive dependencies such as VendorID -> VendorEmail (3NF).',
        'Must produce clean SQL schema definitions with referential integrity.'
      ],
      hints: [
        'Hint 1: Separate entities: Customers, Products, Vendors, Orders, and OrderItems.',
        'Hint 2: OrderItems has a composite primary key (OrderID, ProductID). Only line-specific data like quantity and unit price belong here.',
        'Hint 3: Vendor details belong in a Vendors table, referenced by VendorID in the Products table.'
      ],
      expectedOutcome: 'A modular 5-table schema (Customers, Orders, OrderItems, Products, Vendors) with zero redundancy, eliminating update anomalies and reducing table footprint by 60%.',
      reflectionQuestions: [
        'Why do modern data warehouses (like Snowflake or BigQuery) often deliberately denormalize tables that were normalized in OLTP?',
        'What happens to query latency when you must perform 4 SQL JOINs across normalized tables on every page load?',
        'How does a surrogate key (auto-increment ID or UUID) simplify foreign key constraints compared to natural composite keys?'
      ],
      optionalSolution: 'Normalized Schema Solution:\n1. Customers(CustomerID [PK], FullName, Email, Address)\n2. Orders(OrderID [PK], CustomerID [FK], OrderDate, Status)\n3. Vendors(VendorID [PK], VendorName, ContactEmail)\n4. Products(ProductID [PK], VendorID [FK], ProductName, BasePrice)\n5. OrderItems(OrderID [FK], ProductID [FK], Quantity, BilledPrice, [PK: OrderID, ProductID])\nResult: 3NF satisfied. Zero partial dependencies, zero transitive dependencies, zero modification anomalies.'
    }
  },

  'photosynthesis': {
    name: 'Photosynthesis',
    category: 'Biology / Biochemistry',
    decoder: {
      simpleExplanation:
        'Photosynthesis is the biological process by which plants, algae, and certain bacteria convert light energy from the sun into chemical energy stored in glucose sugars, using water and carbon dioxide and releasing oxygen as a byproduct.',
      analogy:
        'Imagine a solar-powered bakery inside a leaf. Sunlight is the electricity that powers the ovens. Carbon dioxide from the air and water from the soil are the raw flour and water. The bakery turns them into sugar loaves (glucose) to feed the plant, and vents clean oxygen out the window as a pleasant byproduct.',
      keyTerms: [
        { term: 'Light-Dependent Reactions', definition: 'The first stage occurring in the thylakoid membranes where light energy splits water and produces ATP and NADPH.' },
        { term: 'Calvin Cycle (Light-Independent)', definition: 'The second stage occurring in the stroma where ATP and NADPH power the fixation of CO2 into glucose sugars.' },
        { term: 'Stomata', definition: 'Microscopic pores on leaf surfaces that open and close to exchange carbon dioxide and oxygen gas.' },
        { term: 'RuBisCO', definition: 'The primary enzyme responsible for fixing carbon dioxide into organic molecules during the Calvin cycle.' }
      ],
      takeaways: [
        'Overall chemical formula: 6 CO2 + 6 H2O + light energy -> C6H12O6 + 6 O2.',
        'Occurs in two interconnected stages: Light-Dependent Reactions (thylakoids) and Calvin Cycle (stroma).',
        'Water molecules are split in photolysis to provide replacement electrons, releasing breathable oxygen gas.',
        'It forms the energetic foundation for nearly all aerobic life and food chains on Earth.'
      ],
      example:
        'A single mature oak tree can produce enough oxygen through photosynthesis in one season to support the breathing needs of two humans for a year.',
      selfCheck: {
        question: 'Where does the oxygen released during photosynthesis come from: carbon dioxide (CO2) or water (H2O)?',
        hint: 'Think about the photolysis reaction that replenishes electrons in Photosystem II.'
      }
    },
    focusCards: {
      title: 'Bite-Sized Guide: Photosynthesis Stages & Mechanism',
      estimatedReadingMinutes: 8,
      cards: [
        {
          id: 'card_1',
          sectionNumber: 1,
          title: 'The Chemical Overview',
          mainIdea: 'Sunlight fuels the synthesis of glucose carbohydrates from carbon dioxide and water.',
          explanation: 'The balanced equation of oxygenic photosynthesis is 6 CO2 + 6 H2O + light energy -> C6H12O6 + 6 O2. This is an endergonic oxidation-reduction reaction: water is oxidized to oxygen, and carbon dioxide is reduced to high-energy glucose.',
          keyPoints: [
            'Endergonic reaction driven by solar radiation.',
            'Converts low-energy inorganic molecules into high-energy organic bonds.',
            'Produces oxygen as a byproduct of photolysis.'
          ],
          vocabulary: [
            { term: 'Redox Reaction', definition: 'A coupled chemical reaction involving the transfer of electrons between species.' }
          ],
          selfCheck: 'Is photosynthesis an exergonic (energy-releasing) or endergonic (energy-storing) process?'
        },
        {
          id: 'card_2',
          sectionNumber: 2,
          title: 'Stage 1: Light-Dependent Reactions',
          mainIdea: 'Thylakoid membranes convert light photons into chemical energy packets (ATP & NADPH).',
          explanation: 'Inside thylakoid discs, chlorophyll in Photosystems II and I absorbs light, exciting electrons that travel through an electron transport chain. Protons are pumped into the thylakoid lumen, driving ATP synthase. Water is split to replenish electrons, liberating oxygen.',
          keyPoints: [
            'Located in the chloroplast thylakoid membranes.',
            'Splits H2O into 2H+, 2e-, and 1/2 O2.',
            'Generates ATP (via chemiosmosis) and NADPH (reducing power).'
          ],
          vocabulary: [
            { term: 'Chemiosmosis', definition: 'The generation of ATP by the movement of hydrogen ions across a membrane down their electrochemical gradient.' }
          ],
          selfCheck: 'What two chemical energy products of the light reactions are required by the Calvin cycle?'
        },
        {
          id: 'card_3',
          sectionNumber: 3,
          title: 'Stage 2: The Calvin Cycle (Carbon Fixation)',
          mainIdea: 'The stroma uses ATP and NADPH to synthesize glucose from atmospheric carbon dioxide.',
          explanation: 'The Calvin cycle takes place in the fluid stroma. The enzyme RuBisCO fixes CO2 onto ribulose 1,5-bisphosphate (RuBP). Using ATP and NADPH from the light reaction, it produces Glyceraldehyde 3-phosphate (G3P), which is then assembled into glucose and other carbohydrates.',
          keyPoints: [
            'Occurs in the chloroplast stroma, independent of direct light illumination.',
            'RuBisCO is the world’s most abundant enzyme, catalyzing carbon fixation.',
            'Every 3 turns of the cycle fixes 3 CO2 molecules to yield 1 net G3P molecule.'
          ],
          vocabulary: [
            { term: 'RuBisCO', definition: 'Ribulose-1,5-bisphosphate carboxylase-oxygenase, the primary carbon-fixing enzyme.' }
          ],
          selfCheck: 'Why can the Calvin cycle not continue indefinitely in complete darkness, even if CO2 is available?'
        }
      ]
    },
    modes: {
      story: {
        mode: 'story',
        storyTitle: 'The Sunlight Alchemists: How Plants Cook with Air and Light',
        storyText: 'Deep inside a green oak leaf, microscopic kitchens called chloroplasts are bustling under the afternoon sun. Outside, water has traveled up from the tree roots through narrow xylem tubes, and invisible molecules of carbon dioxide have slipped in through tiny stomata trapdoors on the underside of the leaf. Light rays crash through the cell window like energetic delivery trucks. In the thylakoid bakery, chlorophyll captures this solar electricity and cracks open water molecules with a burst of photolysis, tossing clean oxygen out into the wind. Then, in the stroma kitchen, the chef RuBisCO grabs the carbon from the air and kneads it together with hydrogen to bake sweet, golden glucose.',
        conceptConnection: 'This narrative shows the two-part division of photosynthesis: the light reaction harvesting solar power to split water, and the Calvin cycle fixing carbon to create plant nutrition.',
        moralOrInsight: 'Every bite of food we eat and every breath of air we take originated from sunlight captured by plants.'
      },
      step_by_step: {
        mode: 'step_by_step',
        whatItMeans: 'Photosynthesis is the biochemical conversion of light energy, water, and carbon dioxide into chemical energy (sugars) and oxygen.',
        whyItMatters: 'It sustains the Earth’s aerobic atmosphere and produces almost all organic biomass consumed by heterotrophs.',
        howItWorks: [
          'Step 1 (Light Absorption): Chlorophyll in Photosystem II absorbs photons and excites electrons.',
          'Step 2 (Photolysis): Water is split (2H2O -> 4H+ + 4e- + O2) to replace lost electrons.',
          'Step 3 (Electron Transport & Chemiosmosis): Electrons pump H+ into the lumen; ATP synthase produces ATP while ferredoxin creates NADPH.',
          'Step 4 (Carbon Fixation): In the stroma, RuBisCO binds CO2 to RuBP, forming 3-PGA.',
          'Step 5 (Reduction): ATP and NADPH convert 3-PGA into G3P sugars.',
          'Step 6 (Regeneration & Synthesis): RuBP is regenerated to repeat the cycle, while exiting G3P molecules combine into glucose.'
        ],
        workedExample: 'To produce 1 molecule of glucose (C6H12O6), the plant requires 6 CO2 molecules, 18 ATP, and 12 NADPH molecules over 6 turns of the Calvin cycle.',
        commonMistake: 'Claiming that oxygen gas comes from the oxygen in CO2. Isotopic labeling experiments proved oxygen is released exclusively from H2O.',
        summary: 'Photosynthesis couples thylakoid light reactions (splitting water to make ATP/NADPH) with stroma dark reactions (fixing CO2 into glucose).'
      },
      quiz: {
        mode: 'quiz',
        questions: [
          {
            id: 'q1',
            question: 'What is the exact source of the oxygen (O2) gas released into the atmosphere during photosynthesis?',
            options: [
              'Carbon dioxide (CO2) absorbed through leaf stomata',
              'Water (H2O) split during photolysis in Photosystem II',
              'Glucose (C6H12O6) broken down in cellular respiration',
              'Atmospheric nitrogen converted in soil'
            ],
            correctAnswerIndex: 1,
            explanation: 'In Photosystem II, water molecules are split (photolysis) to donate electrons to oxidized chlorophyll, releasing O2 as a byproduct.',
            difficulty: 'easy'
          },
          {
            id: 'q2',
            question: 'In which part of the chloroplast does the Calvin cycle (light-independent reactions) take place?',
            options: ['Thylakoid lumen', 'Outer chloroplast membrane', 'Stroma (fluid surrounding thylakoids)', 'Mitochondrial cristae'],
            correctAnswerIndex: 2,
            explanation: 'The Calvin cycle takes place in the fluid stroma of the chloroplast, utilizing ATP and NADPH synthesized at the thylakoid membranes.',
            difficulty: 'medium'
          },
          {
            id: 'q3',
            question: 'What is the role of the enzyme RuBisCO in the Calvin cycle?',
            options: [
              'To split water molecules into hydrogen ions and oxygen',
              'To catalyze the fixation of CO2 onto RuBP to form 3-phosphoglycerate',
              'To absorb green light wavelengths for chloroplast protection',
              'To pump protons across the outer mitochondrial membrane'
            ],
            correctAnswerIndex: 1,
            explanation: 'RuBisCO catalyzes the initial, crucial step of carbon fixation: binding gaseous CO2 to 5-carbon RuBP.',
            difficulty: 'hard'
          }
        ]
      }
    },
    taskBreakdown: {
      taskPlanTitle: 'Study Plan: Photosynthesis Biochemical Pathways',
      totalEstimatedMinutes: 100,
      recommendedPriority: 'high',
      feasibility: 'Very achievable study path breaking down light-dependent reactions and the Calvin cycle into two distinct 45-minute blocks.',
      schedulingNotes: 'Master the Z-scheme light reaction before studying RuBisCO carbon fixation stoichiometry.',
      tasks: [
        {
          id: 't_1',
          title: 'Diagram Chloroplast Anatomy (Thylakoids, Grana, Stroma, Lumen)',
          description: 'Label where light reactions and carbon fixation occur and where proton gradients build up.',
          estimatedMinutes: 20,
          priority: 'high',
          status: 'pending',
          dependencies: []
        },
        {
          id: 't_2',
          title: 'Trace the Z-Scheme (Photosystem II to Photosystem I)',
          description: 'Map out electron transport, photolysis of water, and chemiosmotic ATP synthesis step-by-step.',
          estimatedMinutes: 30,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_1']
        },
        {
          id: 't_3',
          title: 'Calculate Calvin Cycle Stoichiometry (CO2, ATP, NADPH, G3P)',
          description: 'Understand why 6 turns of the cycle are required to yield 1 net glucose molecule (C6H12O6).',
          estimatedMinutes: 25,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_2']
        },
        {
          id: 't_4',
          title: 'Compare C3, C4, and CAM Photosynthetic Adaptations',
          description: 'Understand how desert plants prevent photorespiration in hot, dry climates.',
          estimatedMinutes: 25,
          priority: 'medium',
          status: 'pending',
          dependencies: ['t_3']
        }
      ]
    },
    practiceBridge: {
      conceptSummary: 'Photosynthesis utilizes photon energy in thylakoids to generate ATP/NADPH via photolysis, which fuels the Calvin cycle in the stroma to fix CO2 into carbohydrates.',
      scenario: 'You are an environmental engineer tasked with designing a bio-regenerative life support system for a lunar research station. The greenhouse must recycle astronaut exhaled CO2 into breathable oxygen while cultivating edible sweet potatoes.',
      challenge: 'Calculate the required lighting intensity and water delivery rates to balance carbon dioxide absorption with oxygen output for an astronaut crew of 4.',
      requirements: [
        'Must balance human respiration (consuming ~550 liters of O2 and exhaling ~450 liters of CO2 per astronaut daily) against crop photosynthetic rates.',
        'Must specify light saturation parameters to avoid photoinhibition.',
        'Must account for water consumption through photolysis.',
        'Must explain how night periods affect greenhouse gas balance.'
      ],
      hints: [
        'Hint 1: Remember that plants also respire at night (consuming O2 and producing CO2). Constant lighting or staggered day/night zones may be necessary.',
        'Hint 2: Water consumed in photolysis is recycled when astronauts drink and metabolize the carbohydrates.',
        'Hint 3: RuBisCO efficiency drops if oxygen concentration gets too high, triggering photorespiration.'
      ],
      expectedOutcome: 'A complete mass-balance equation linking human respiration (C6H12O6 + 6O2 -> 6CO2 + 6H2O) with photosynthetic recovery (6CO2 + 6H2O -> C6H12O6 + 6O2), requiring ~30 square meters of canopy per astronaut.',
      reflectionQuestions: [
        'What would happen if the greenhouse lights were left on 24/7 without a rest period?',
        'How does temperature affect RuBisCO’s affinity for CO2 versus oxygen?',
        'Why can’t pure chemical electrolysis of water replace the need for photosynthetic plant biomass on long missions?'
      ],
      optionalSolution: 'Lunar Bio-Regenerative Solution:\n1. Mass Balance: 4 astronauts consume ~2.2 kg O2/day and produce ~3.0 kg CO2/day. Balanced photosynthesis requires fixing 3.0 kg CO2 via ~120 m² of sweet potato and microalgae canopy.\n2. Photolysis Demand: 1.25 liters of H2O split per day into oxygen, regenerated as metabolic sweat/urine water.\n3. Photoperiod: Stagger 2 separate greenhouse modules on 16h light / 8h dark cycles to ensure continuous O2 generation without single-point dark-period spikes.'
    }
  },

  'http api': {
    name: 'HTTP API',
    category: 'Computer Science / Web Architecture',
    decoder: {
      simpleExplanation:
        'An HTTP API (Application Programming Interface) is an agreed-upon set of rules that lets software applications communicate over the internet using standard web protocols. Clients send HTTP requests (like GET or POST) to specific endpoints, and servers respond with structured data, usually formatted as JSON.',
      analogy:
        'Think of an HTTP API like ordering food at a drive-thru. You (the client) pull up to the speaker (the endpoint), speak your order using a standard menu item (the HTTP request method), the kitchen prepares the meal, and the window hands back your packaged meal with a receipt (the HTTP response status code and JSON payload).',
      keyTerms: [
        { term: 'HTTP Method (Verb)', definition: 'The action being performed: GET (retrieve), POST (create), PUT/PATCH (update), DELETE (remove).' },
        { term: 'Endpoint / URI', definition: 'The specific URL address on the server where a particular resource can be accessed (e.g. /api/v1/users).' },
        { term: 'Status Code', definition: 'A standard 3-digit number indicating response outcome: 200 (OK), 400 (Bad Request), 404 (Not Found), 500 (Server Error).' },
        { term: 'JSON Payload', definition: 'JavaScript Object Notation, the lightweight key-value format standard for API data exchange.' }
      ],
      takeaways: [
        'HTTP APIs enable independent systems built with different programming languages to exchange data seamlessly.',
        'They are stateless: each request contains all the information needed by the server to fulfill it.',
        'HTTP methods dictate the intent: GET retrieves, POST creates, PATCH modifies, DELETE removes.',
        'Standard status codes (2xx, 4xx, 5xx) immediately tell the client whether an operation succeeded or failed.'
      ],
      example:
        'When your weather smartphone app opens, it sends an HTTP GET request to `https://api.weather.com/v1/forecast?city=Seattle`. The server returns JSON with temperature, humidity, and wind speed.',
      selfCheck: {
        question: 'What is the semantic difference between an HTTP POST request and an HTTP GET request?',
        hint: 'Consider whether the operation is designed to retrieve existing data or create/submit new state on the server.'
      }
    },
    focusCards: {
      title: 'Bite-Sized Guide: HTTP API Architecture',
      estimatedReadingMinutes: 7,
      cards: [
        {
          id: 'card_1',
          sectionNumber: 1,
          title: 'The Request-Response Lifecycle',
          mainIdea: 'Clients send structured HTTP requests and servers return structured HTTP responses.',
          explanation: 'An HTTP transaction consists of a request containing a Method (GET, POST), a URL Path (/api/v1/items), Headers (Content-Type, Authorization), and an optional Body. The server processes this request and replies with an HTTP Status Code, Response Headers, and Body data (typically JSON).',
          keyPoints: [
            'Stateless protocol: each request is isolated and self-contained.',
            'Headers communicate metadata (auth tokens, content encoding, cache policies).',
            'Bodies contain structured payloads (JSON, form data, binary files).'
          ],
          vocabulary: [
            { term: 'Statelessness', definition: 'The server does not retain client session state between independent requests.' }
          ],
          selfCheck: 'What header is used by a client to tell the server that its request body is formatted as JSON?'
        },
        {
          id: 'card_2',
          sectionNumber: 2,
          title: 'Standard HTTP Verbs & REST Conventions',
          mainIdea: 'HTTP methods represent explicit CRUD operations on resources.',
          explanation: 'REST (Representational State Transfer) maps HTTP verbs to database actions: GET reads a resource without side effects (safe & idempotent). POST creates a new resource (non-idempotent). PUT replaces a resource. PATCH applies partial updates. DELETE removes a resource.',
          keyPoints: [
            'GET requests should be idempotent and never mutate server state.',
            'POST requests create new child resources and generate new IDs.',
            'PATCH updates only specified fields rather than replacing the entire object.'
          ],
          vocabulary: [
            { term: 'Idempotency', definition: 'Making multiple identical requests produces the exact same server state as making one request.' }
          ],
          selfCheck: 'Which HTTP method should be used to update just the email field of an existing user account?'
        },
        {
          id: 'card_3',
          sectionNumber: 3,
          title: 'HTTP Status Code Classes (2xx, 4xx, 5xx)',
          mainIdea: 'Three-digit status codes standardize communication of success and failure.',
          explanation: 'Status codes are categorized by their first digit: 2xx represents Success (200 OK, 201 Created). 3xx represents Redirection (301 Moved Permanently). 4xx represents Client Error (400 Bad Request, 401 Unauthorized, 404 Not Found, 429 Too Many Requests). 5xx represents Server Error (500 Internal Error, 502 Bad Gateway).',
          keyPoints: [
            '200 OK = Read/Update successful; 201 Created = New resource generated.',
            '401 Unauthorized = Missing or invalid token; 403 Forbidden = Authenticated but lacks permissions.',
            '429 Too Many Requests = Rate limit exceeded; 500 = Uncaught server crash.'
          ],
          vocabulary: [
            { term: 'Status Code', definition: 'A 3-digit standardized integer signaling the resolution of an HTTP transaction.' }
          ],
          selfCheck: 'What is the difference between a 401 Unauthorized response and a 403 Forbidden response?'
        }
      ]
    },
    modes: {
      story: {
        mode: 'story',
        storyTitle: 'The Universal Messenger: How Two Strange Computers Talked',
        storyText: 'In a digital city, a mobile phone written in Swift wanted to ask a massive database server written in Python for a user profile. The phone did not speak Python, and the server did not understand Swift. So they agreed to use the international postal code of the web: HTTP. The phone wrote an envelope: "POSTAL ADDRESS: /api/v1/profile/alex. VERB: GET. TICKET: Bearer secret_token." It slipped the envelope through the fiber-optic mail chute. The server read the standard envelope, found Alex’s profile, and stamped the return receipt "STATUS: 200 OK" with a neat JSON slip of paper containing { name: "Alex", credits: 50 }. Both devices understood each other without ever needing to know what programming language the other was running.',
        conceptConnection: 'This illustrates the core purpose of an HTTP API: an interoperable, platform-agnostic communication standard connecting client apps to backend services.',
        moralOrInsight: 'Standards and protocols enable collaboration across completely incompatible technological architectures.'
      },
      step_by_step: {
        mode: 'step_by_step',
        whatItMeans: 'An HTTP API is an interface defining endpoints, request structures, and JSON responses allowing client apps to exchange data with backend servers.',
        whyItMatters: 'It decouples frontend user interfaces from backend databases, enabling web apps, mobile apps, and third-party integrations to use the same logic.',
        howItWorks: [
          'Step 1 (Client Request): Client crafts an HTTP request (Method + URL + Headers + Body).',
          'Step 2 (DNS & Connection): Client resolves domain to IP and opens a TCP/TLS handshake.',
          'Step 3 (Server Routing): Server matches URL and verb to a controller handler.',
          'Step 4 (Middleware): Server validates authentication token and request payload schema.',
          'Step 5 (Business Execution): Controller queries database or triggers logic.',
          'Step 6 (Response): Server serializes data to JSON and returns with a status code (e.g. 200 OK).'
        ],
        workedExample: 'Client sends `GET https://api.store.com/v1/products/42`. Server looks up ID 42, finds row, and returns `HTTP/1.1 200 OK` with JSON `{ "id": 42, "name": "Headphones", "price": 99.99 }`.',
        commonMistake: 'Using GET requests with bodies to mutate database records, or returning 200 OK with `{ error: "Failed" }` inside the body instead of using proper 4xx/5xx status codes.',
        summary: 'HTTP APIs use stateless request-response transactions with standard verbs, URL endpoints, and status codes to exchange JSON data.'
      },
      quiz: {
        mode: 'quiz',
        questions: [
          {
            id: 'q1',
            question: 'Which HTTP status code should a server return after successfully creating a new user account in a database?',
            options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
            correctAnswerIndex: 1,
            explanation: '201 Created is the dedicated HTTP status code confirming that a new resource was successfully instantiated.',
            difficulty: 'easy'
          },
          {
            id: 'q2',
            question: 'What is the characteristic property of an "idempotent" HTTP method?',
            options: [
              'It always executes in under 10 milliseconds',
              'Multiple identical requests have the exact same effect on the server state as a single request',
              'It can only be invoked by authenticated administrators',
              'It does not return any response headers'
            ],
            correctAnswerIndex: 1,
            explanation: 'Idempotency means that calling the method once or multiple times consecutively leaves the server in the identical state (e.g. GET, PUT, DELETE).',
            difficulty: 'medium'
          },
          {
            id: 'q3',
            question: 'If a client submits an HTTP request with an expired JWT authorization token, which HTTP status code should the server return?',
            options: ['400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found'],
            correctAnswerIndex: 1,
            explanation: '401 Unauthorized signals that authentication credentials are missing, invalid, or expired.',
            difficulty: 'hard'
          }
        ]
      }
    },
    taskBreakdown: {
      taskPlanTitle: 'Action Plan: Design and Build a Production RESTful HTTP API',
      totalEstimatedMinutes: 95,
      recommendedPriority: 'high',
      feasibility: 'Realistic 95-minute curriculum building from endpoint routing to authentication and schema validation.',
      schedulingNotes: 'Design your endpoint URIs and JSON response schemas on paper before writing Express or Fastify route code.',
      tasks: [
        {
          id: 't_1',
          title: 'Design RESTful Resource URL Routes and HTTP Methods',
          description: 'Document CRUD endpoints (/items, /items/:id) with corresponding GET, POST, PATCH, and DELETE verbs.',
          estimatedMinutes: 20,
          priority: 'high',
          status: 'pending',
          dependencies: []
        },
        {
          id: 't_2',
          title: 'Implement Express Route Controllers and JSON Serialization',
          description: 'Write controller functions returning standard { success: true, data: ... } response structures.',
          estimatedMinutes: 30,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_1']
        },
        {
          id: 't_3',
          title: 'Add Request Schema Validation with Zod',
          description: 'Validate request body fields, types, and lengths; return 400 Bad Request on malformed inputs.',
          estimatedMinutes: 25,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_2']
        },
        {
          id: 't_4',
          title: 'Test with Postman / Curl and Handle 404 & 500 Status Codes',
          description: 'Verify status codes (200, 201, 400, 404) and ensure uncaught exceptions trigger error middleware.',
          estimatedMinutes: 20,
          priority: 'medium',
          status: 'pending',
          dependencies: ['t_3']
        }
      ]
    },
    practiceBridge: {
      conceptSummary: 'An HTTP API exposes stateless endpoints using HTTP methods and status codes to exchange structured JSON payloads between clients and servers.',
      scenario: 'You are developing the backend API for a university course enrollment system. During registration week, 10,000 students hit the enroll endpoint simultaneously, causing race conditions where classes overfill beyond classroom capacity.',
      challenge: 'Design a resilient HTTP API endpoint `POST /api/v1/courses/:id/enroll` that guarantees atomic enrollment, prevents oversubscription, and handles client retry timeouts safely.',
      requirements: [
        'Must specify request headers (Authorization, Idempotency-Key).',
        'Must handle race conditions and return 409 Conflict when a section is full.',
        'Must implement idempotency keys to prevent double-billing or duplicate enrollments on network retries.',
        'Must return proper status codes (201 Created on success, 400 on invalid input, 409 on class full).'
      ],
      hints: [
        'Hint 1: Have the client generate a UUID `Idempotency-Key` header with each submission so retry requests do not execute twice.',
        'Hint 2: In the database transaction, use conditional updates: `UPDATE courses SET enrolled = enrolled + 1 WHERE id = :id AND enrolled < capacity`.',
        'Hint 3: If zero rows were updated, immediately return HTTP 409 Conflict with an explanation message.'
      ],
      expectedOutcome: 'A robust REST endpoint definition with idempotency keys, database row-locking or atomic conditional updates, and precise HTTP status codes.',
      reflectionQuestions: [
        'Why should idempotent requests like GET and DELETE never generate side-effects on client retry?',
        'How does a rate-limiting middleware returning 429 Too Many Requests protect the API from distributed denial of service?',
        'What are the advantages of using JSON Schema or Zod at the API gateway layer before database queries run?'
      ],
      optionalSolution: 'Robust Endpoint Architecture:\n1. Route: `POST /api/v1/courses/:courseId/enroll`\n2. Headers: `Authorization: Bearer <token>`, `Idempotency-Key: <uuid-v4>`\n3. Idempotency Check: Cache key in Redis for 10 minutes. If exists, return cached response immediately.\n4. Atomic DB Operation: `BEGIN TRANSACTION; SELECT enrolled, capacity FROM courses WHERE id = $1 FOR UPDATE; IF enrolled >= capacity ROLLBACK & return 409 Conflict; INSERT INTO enrollments; UPDATE courses SET enrolled = enrolled + 1; COMMIT;`\n5. Response: `HTTP 201 Created` with `{ success: true, data: { enrollmentId: "e_98", status: "confirmed" } }`.'
    }
  },
  deadlock: {
    name: 'Operating System Deadlock',
    category: 'Computer Science / Operating Systems',
    decoder: {
      conceptTitle: 'Operating System Deadlock',
      simpleExplanation:
        'An operating system deadlock is a freeze condition where two or more processes cannot execute because each holds a resource that the other process needs, forming a circular wait where nobody can proceed.',
      analogy:
        'Imagine a tight four-way traffic intersection with no traffic lights. Four cars arrive at the exact same moment from four directions and enter the center. Car A blocks Car B, Car B blocks Car C, Car C blocks Car D, and Car D blocks Car A. No car can move forward because each car waits for the car ahead to clear out first. The limitation of the analogy is that cars have human drivers who can reverse, whereas computer processes in deadlock have no awareness unless the OS intervenes.',
      keyTerms: [
        { term: 'Mutual Exclusion', definition: 'At least one resource must be held in a non-shareable mode (only one process can use it at a time).', whyItMatters: 'Essential condition; if resources could be shared freely, deadlocks would not occur.' },
        { term: 'Hold and Wait', definition: 'A process holds at least one resource while waiting to acquire additional resources held by other processes.', whyItMatters: 'Allows partial allocation to become a dependency bottleneck.' },
        { term: 'No Preemption', definition: 'Resources cannot be forcibly taken away from a process; they can only be released voluntarily after the process finishes its task.', whyItMatters: 'Prevents the operating system from unilaterally breaking the freeze without killing work.' },
        { term: 'Circular Wait', definition: 'A closed chain of processes exists such that P0 waits for P1, P1 waits for P2, and Pn waits for P0.', whyItMatters: 'The final, determining condition that turns contention into a permanent freeze.' }
      ],
      takeaways: [
        'A deadlock requires all four Coffman conditions to hold simultaneously: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.',
        'Eliminating even one Coffman condition (such as enforcing resource ordering to prevent Circular Wait) guarantees deadlock prevention.',
        'Operating systems handle deadlocks via Prevention (protocol rules), Avoidance (Banker\'s Algorithm), Detection and Recovery, or Ignorance (the Ostrich Algorithm).'
      ],
      example:
        'Process 1 locks the Printer and requests the Scanner. Simultaneously, Process 2 locks the Scanner and requests the Printer. Neither process can release its resource until it finishes with both, freezing both tasks indefinitely.',
      selfCheck: {
        question: 'If an OS prevents processes from requesting resources in arbitrary order and instead requires all resources to be requested in strictly ascending numbered order, which Coffman condition is eliminated?',
        hint: 'Numbering resources eliminates closed cyclic chains.'
      },
      sources: [
        {
          title: 'Operating System Concepts (Silberschatz, Galvin, Gagne) - Deadlocks Chapter',
          url: 'https://os-book.com/OS10/slide-dir/index.html',
          domain: 'os-book.com',
          supportedClaims: 'Four Coffman conditions, resource allocation graphs, and prevention strategies.',
        },
        {
          title: 'Deadlock in Operating System - GeeksforGeeks',
          url: 'https://www.geeksforgeeks.org/introduction-of-deadlock-in-operating-system/',
          domain: 'geeksforgeeks.org',
          supportedClaims: 'Mutual exclusion, hold and wait, no preemption, circular wait explanations.',
        }
      ],
      searchStatus: 'completed_with_sources',
      verificationNotes: 'Verified against canonical operating system literature (Silberschatz et al.).'
    },
    focusCards: {
      title: 'Operating System Deadlocks & The Four Conditions',
      estimatedReadingMinutes: 4,
      cards: [
        {
          id: 'card_1',
          sectionNumber: 1,
          title: 'Section 1: What is a Deadlock?',
          mainIdea: 'A permanent standstill where concurrent processes block each other by holding locked resources while waiting for others.',
          explanation: 'In concurrent computing, a deadlock occurs when a set of processes are blocked because each process is holding a resource and waiting for another resource held by some other process in the set.',
          keyPoints: [
            'Processes are stuck indefinitely without outside intervention.',
            'Requires concurrent execution and exclusive resource sharing.'
          ],
          vocabulary: [
            { term: 'Deadlock', definition: 'A state where no process can proceed because required resources are mutually locked.' }
          ],
          selfCheck: 'What distinguishes a deadlock from a temporary resource queue delay?'
        },
        {
          id: 'card_2',
          sectionNumber: 2,
          title: 'Section 2: The Four Coffman Conditions',
          mainIdea: 'All four conditions must hold simultaneously for a deadlock to exist: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.',
          explanation: 'Formulated by Edward G. Coffman Jr. in 1971, these four necessary conditions define deadlock: mutual exclusion (exclusive access), hold and wait (holding while seeking more), no preemption (no forced release), and circular wait (cyclic dependency).',
          keyPoints: [
            'Mutual exclusion: resources cannot be shared simultaneously.',
            'Hold and wait: process retains acquired resources while waiting.',
            'No preemption: resources cannot be forcefully confiscated.',
            'Circular wait: closed cycle of process resource requests.'
          ],
          vocabulary: [
            { term: 'Coffman Conditions', definition: 'The four necessary and sufficient conditions for deadlock to occur.' }
          ],
          selfCheck: 'Why does invalidating just one condition prevent deadlocks entirely?'
        }
      ]
    },
    modes: {
      story: {
        mode: 'story',
        storyTitle: 'The Gridlock of the Two Printers',
        storyText: 'In the busy server room of DataCity, Process Alpha and Process Beta were assigned high-priority rendering jobs. Alpha quickly claimed the high-speed Color Printer. Beta simultaneously claimed the Paper Feeder. Alpha needed the Feeder to start printing, so it paused to wait for Beta. Beta needed the Printer to load the paper, so it paused to wait for Alpha. Minutes turned into hours; both sat patiently holding their keys, neither willing to yield. The entire server room ground to a halt in perfect, silent gridlock until the Operating System kernel stepped in.',
        coreConceptRevealed: 'Deadlock occurs when concurrent processes hold exclusive resources and wait cyclically for each other with no preemption.',
        keyTakeaway: 'Without OS arbitration or strict resource ordering, processes cannot escape mutual blockage.'
      },
      step_by_step: {
        mode: 'step_by_step',
        prerequisites: ['Basic process management', 'Concept of mutual exclusion and locks'],
        howItWorks: [
          'Step 1: Process P1 requests and acquires exclusive lock on Resource R1.',
          'Step 2: Process P2 requests and acquires exclusive lock on Resource R2.',
          'Step 3: P1 requests R2 while still holding R1; the OS puts P1 to sleep until R2 is free.',
          'Step 4: P2 requests R1 while still holding R2; the OS puts P2 to sleep until R1 is free.',
          'Step 5: Circular dependency is formed (P1 -> R2 -> P2 -> R1 -> P1). Neither can awaken without external intervention.'
        ],
        commonPitfalls: [
          'Confusing deadlock (permanent freeze) with starvation (indefinite postponement where others make progress).',
          'Assuming multi-threading automatically handles deadlocks without lock hierarchies.'
        ],
        summary: 'Deadlocks occur when circular dependencies form across exclusively locked resources.'
      },
      quiz: {
        mode: 'quiz',
        questions: [
          {
            id: 'q_1',
            question: 'Which of the following is NOT one of the four Coffman conditions required for a deadlock?',
            options: [
              'Mutual Exclusion',
              'Hold and Wait',
              'Preemptive Scheduling',
              'Circular Wait'
            ],
            correctAnswerIndex: 2,
            explanation: 'Preemption breaks deadlocks; the required condition is NO preemption (resources cannot be confiscated).'
          },
          {
            id: 'q_2',
            question: 'What is the primary difference between deadlock and starvation in operating systems?',
            options: [
              'In starvation, at least some processes continue making progress; in deadlock, all involved processes are permanently stuck.',
              'Deadlock only happens with CPU, starvation only with memory.',
              'Starvation is resolved automatically, deadlocks never can be.',
              'There is no difference; they are identical concepts.'
            ],
            correctAnswerIndex: 0,
            explanation: 'In starvation, low-priority processes are delayed while higher-priority processes make progress. In deadlock, none of the involved processes can ever progress.'
          },
          {
            id: 'q_3',
            question: 'How does the Banker\'s Algorithm handle deadlocks?',
            options: [
              'By ignoring them until the computer crashes',
              'By avoiding them through safe-state resource allocation checks before granting requests',
              'By terminating all running processes immediately',
              'By converting non-shareable resources into shareable ones'
            ],
            correctAnswerIndex: 1,
            explanation: 'Edsger Dijkstra\'s Banker\'s Algorithm is a deadlock avoidance algorithm that tests whether granting a resource maintains a safe state.'
          }
        ]
      }
    },
    taskBreakdown: {
      taskPlanTitle: 'Action Plan: Mastering OS Deadlock Analysis and Prevention',
      totalEstimatedMinutes: 80,
      recommendedPriority: 'high',
      feasibility: 'Very achievable in a focused 90-minute study session.',
      schedulingNotes: 'Study the four conditions first, then practice resource allocation graphs before coding lock hierarchies.',
      tasks: [
        {
          id: 't_1',
          title: 'Master the 4 Coffman Conditions',
          description: 'Memorize and understand Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait.',
          estimatedMinutes: 20,
          priority: 'high',
          status: 'pending',
          dependencies: []
        },
        {
          id: 't_2',
          title: 'Solve Resource Allocation Graph (RAG) Problems',
          description: 'Draw processes as circles and resources as squares; identify directed cycles.',
          estimatedMinutes: 25,
          priority: 'high',
          status: 'pending',
          dependencies: ['t_1']
        },
        {
          id: 't_3',
          title: 'Implement Lock Ordering in Code',
          description: 'Write a two-thread C or Java program demonstrating deadlock, then fix it by enforcing global lock ordering.',
          estimatedMinutes: 35,
          priority: 'medium',
          status: 'pending',
          dependencies: ['t_2']
        }
      ]
    },
    practiceBridge: {
      conceptSummary: 'A deadlock is a permanent freeze condition where processes hold resources and wait circularly for others, requiring all 4 Coffman conditions to hold.',
      scenario: 'You are designing the storage engine of a high-throughput relational database. Transactions frequently dead-lock when executing multi-row updates concurrently, spiking latency and crashing checkout sessions.',
      challenge: 'Design a deadlock detection and resolution mechanism that identifies cyclic lock waits and recovers transactions with minimal wasted computation.',
      requirements: [
        'Maintain a Wait-For Graph (WFG) tracking transactions and locks.',
        'Implement cycle detection using Tarjan\'s or depth-first search.',
        'Choose a victim transaction based on lowest work completed (least rollback cost).',
        'Aborted victim must rollback cleanly and retry with exponential backoff.'
      ],
      hints: [
        'Hint 1: A directed edge T1 -> T2 in a Wait-For Graph means T1 is waiting for a lock held by T2.',
        'Hint 2: Run cycle detection periodically (e.g., every 500ms) or when lock wait timeout exceeds a threshold.',
        'Hint 3: Abort the youngest transaction to minimize rolled-back work.'
      ],
      expectedOutcome: 'A robust deadlock detection loop that automatically breaks circular waits and issues 409/retry signals.',
      reflectionQuestions: [
        'Why is deadlock detection often preferred over strict deadlock prevention in complex relational databases?',
        'How does lock ordering prevent deadlocks from ever forming in the first place?'
      ],
      optionalSolution: 'Implementation outline:\n1. Maintain thread-safe Wait-For Graph with adjacency list.\n2. On lock acquisition wait: Add edge (Requester -> Holder).\n3. Periodic timer runs DFS: If cycle found, select transaction with fewest modified rows as victim.\n4. Call victim.abort(), release its locks, remove its edges from graph.\n5. Victim receives DeadlockDetectedException and retries after jittered backoff.'
    }
  }
};

// Check if topic matches verified topic dictionary using scored matching.
// Scored approach prevents false positives where an incidentally mentioned keyword
// (e.g. "chlorophyll" inside a photosynthesis topic string) wins over the real topic.
export function findVerifiedTopic(topicOrText) {
  if (!topicOrText || typeof topicOrText !== 'string') return null;
  // Only inspect the first 80 characters — this is always the short topic title,
  // never a long pasted body (we changed callAI to pass only `topic`, not `text`).
  const lower = topicOrText.toLowerCase().trim().slice(0, 80);

  let bestMatch = null;
  let bestScore = 0;

  for (const [key, data] of Object.entries(VERIFIED_TOPICS)) {
    let score = 0;
    const nameLower = (data.name || '').toLowerCase();

    if (lower === key || lower === nameLower) {
      score = 100; // exact match
    } else if (lower.startsWith(key) || lower.startsWith(nameLower) || nameLower.startsWith(lower)) {
      score = 80;  // prefix match
    } else if (lower.includes(key) || key.includes(lower) || lower.includes(nameLower) || nameLower.includes(lower)) {
      score = 65;  // contained match
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = data;
    }
  }

  return bestScore >= 50 ? bestMatch : null;
}
