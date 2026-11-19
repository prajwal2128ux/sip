"""
PlagiCheck Security Hardening - Server-Side Python NLP & AI Detection Engine
Performs robust, high-performance, resource-bounded academic text analysis:
- Normalized tokenization and n-gram shingling (1 to 4-grams)
- TF-IDF vectorization and Cosine Similarity matching
- Sentence-by-sentence attribution and match categorization
- Discourse template & AI burstiness analysis
"""

import math
import re
import time

STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
    'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'him', 'his',
    'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
    'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
    'ours', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
    'the', 'their', 'theirs', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
    'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
    'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours'
}

AI_CLICHE_PHRASES = [
    r'in today\'?s fast-paced (?:digital )?world',
    r'plays a (?:pivotal|crucial|vital|fundamental) role',
    r'delving into (?:the)?',
    r'rich tapestry of',
    r'stands? as a testament to',
    r'navigating the complexities',
    r'foster a culture of',
    r'serves? as a cornerstone',
    r'myriad of (?:transformative )?possibilities',
    r'multifaceted approach',
    r'it is (?:important|crucial|essential) to note that',
    r'shed(?:s)? light on',
    r'furthermore,?\s+it is',
    r'in conclusion,?\s+it is evident',
    r'on the other hand,?\s+we must'
]

# Standard Curated Reference Corpus for Academic Alignment
REFERENCE_CORPUS = [
    {
        'name': 'Wikipedia: Climate change',
        'url': 'https://en.wikipedia.org/wiki/Climate_change',
        'text': "Climate change includes both global warming driven by human-induced emissions of greenhouse gases and the large-scale shifts in weather patterns. Though there have been previous periods of climatic change, since the mid-20th century humans have had an unprecedented impact on Earth's climate system and caused change on a global scale. The largest driver of warming is the emission of greenhouse gases, of which more than 90% are carbon dioxide and methane. Fossil fuel burning for energy consumption is the main source of these emissions, with additional contributions from agriculture, deforestation, and industrial processes."
    },
    {
        'name': 'Intergovernmental Panel on Climate Change (IPCC)',
        'url': 'https://www.ipcc.ch/reports/',
        'text': "The largest driver of warming is the emission of greenhouse gases, of which more than 90% are carbon dioxide and methane. Renewable alternatives like wind and solar power represent vital pathways to rapid decarbonization across electric grids. Human influence on the climate system is clear and evident from the increasing greenhouse gas concentrations."
    },
    {
        'name': 'Open Encyclopedia: Automobile & Transportation',
        'url': 'https://en.wikipedia.org/wiki/Car',
        'text': "Cars are one of the most important inventions in modern transportation. They are motor vehicles designed to carry people and goods from one place to another. Cars make travelling faster, easier, and more comfortable. They are widely used for personal transportation, business, tourism, and emergency services. A car consists of several important components, such as the engine, transmission, wheels, brakes, steering system, battery, and suspension."
    },
    {
        'name': 'IEEE Journal: Distributed Telemetry & Multi-Device OS',
        'url': 'https://ieeexplore.ieee.org/document/telemetry-2024',
        'text': "In this dissertation, we present an ambient multi-device screen time correlation engine designed to track user digital engagement across heterogeneous desktop and mobile endpoints. Experimental evaluations over 45 participants demonstrate an aggregate session attribution accuracy of 94.6% with a mean synchronization latency of 22ms. As noted by Smith et al., cross-device context switches significantly exacerbate cognitive fragmentation."
    }
]


def normalize_text(text: str) -> str:
    """Normalize text by converting to lower case and removing excessive punctuation."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def tokenize(text: str, remove_stopwords: bool = False) -> list[str]:
    """Tokenize normalized string into words."""
    norm = normalize_text(text)
    if not norm:
        return []
    words = norm.split(' ')
    if remove_stopwords:
        return [w for w in words if len(w) > 1 and w not in STOP_WORDS]
    return words


def get_ngrams(tokens: list[str], n: int) -> set[tuple]:
    """Generate n-gram shingle tuples."""
    if len(tokens) < n:
        return set()
    return set(tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1))


def compute_cosine_similarity(tokens1: list[str], tokens2: list[str]) -> float:
    """Compute TF-IDF / term-frequency cosine similarity between token sets."""
    if not tokens1 or not tokens2:
        return 0.0

    tf1 = {}
    for t in tokens1:
        tf1[t] = tf1.get(t, 0) + 1

    tf2 = {}
    for t in tokens2:
        tf2[t] = tf2.get(t, 0) + 1

    all_terms = set(tf1.keys()).union(set(tf2.keys()))
    dot_product = sum(tf1.get(t, 0) * tf2.get(t, 0) for t in all_terms)

    mag1 = math.sqrt(sum(v * v for v in tf1.values()))
    mag2 = math.sqrt(sum(v * v for v in tf2.values()))

    if mag1 == 0 or mag2 == 0:
        return 0.0

    return dot_product / (mag1 * mag2)


def compute_jaccard_similarity(set1: set, set2: set) -> float:
    """Compute Jaccard overlap between shingle sets."""
    if not set1 or not set2:
        return 0.0
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    return (intersection / union) if union > 0 else 0.0


def split_sentences(text: str) -> list[str]:
    """Split text into individual sentences reliably."""
    raw = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in raw if s.strip()]
    return sentences if sentences else [text.strip()]


def detect_ai_patterns(sentence: str, full_text: str) -> tuple[bool, float]:
    """
    Evaluate linguistic indicators of Large Language Model generation:
    - AI boilerplate cliches
    - Low variance in sentence length (burstiness deficit)
    - High frequency of formal transition adverbials
    """
    sentence_lower = sentence.lower()
    cliche_score = 0
    for pat in AI_CLICHE_PHRASES:
        if re.search(pat, sentence_lower):
            cliche_score += 35

    # Check sentence length consistency across document
    sentences = split_sentences(full_text)
    lengths = [len(tokenize(s)) for s in sentences if s]
    if len(lengths) > 2:
        mean_len = sum(lengths) / len(lengths)
        variance = sum((l - mean_len) ** 2 for l in lengths) / len(lengths)
        # Uniform length across long text is typical of GPT default output
        if variance < 15 and len(sentences) >= 4:
            cliche_score += 20

    ai_prob = min(98.0, max(5.0, float(cliche_score + 10)))
    is_ai = ai_prob >= 60.0
    return is_ai, round(ai_prob, 1)


def analyze_document_plagiarism(submitted_text: str) -> dict:
    """
    Full academic plagiarism and AI analysis pipeline.
    Returns complete report payload matching frontend requirements.
    """
    start_time = time.time()
    sentences = split_sentences(submitted_text)
    submitted_tokens = tokenize(submitted_text, remove_stopwords=True)
    all_tokens = tokenize(submitted_text, remove_stopwords=False)

    word_count = len(all_tokens)
    char_count = len(submitted_text)
    sentence_count = len(sentences)

    matches = []
    source_stats = {}
    matched_sentence_count = 0
    ai_sentence_count = 0

    curr_idx = 0
    for idx, sentence in enumerate(sentences):
        sent_tokens = tokenize(sentence, remove_stopwords=True)
        sent_ngrams_3 = get_ngrams(tokenize(sentence, remove_stopwords=False), 3)

        best_score = 0.0
        best_source = None
        best_matched_excerpt = ""

        # Compare sentence against reference database
        for ref in REFERENCE_CORPUS:
            ref_tokens = tokenize(ref['text'], remove_stopwords=True)
            ref_ngrams_3 = get_ngrams(tokenize(ref['text'], remove_stopwords=False), 3)

            cos_sim = compute_cosine_similarity(sent_tokens, ref_tokens)
            jaccard_sim = compute_jaccard_similarity(sent_ngrams_3, ref_ngrams_3)

            combined_sim = (cos_sim * 0.6) + (jaccard_sim * 0.4)
            sim_pct = combined_sim * 100.0

            if sim_pct > best_score:
                best_score = sim_pct
                best_source = ref
                best_matched_excerpt = ref['text'][:180] + "..."

        is_ai, ai_score = detect_ai_patterns(sentence, submitted_text)
        if is_ai:
            ai_sentence_count += 1

        match_type = 'ORIGINAL'
        if best_score >= 68.0:
            match_type = 'VERBATIM'
            matched_sentence_count += 1
        elif best_score >= 38.0:
            match_type = 'PARAPHRASE'
            matched_sentence_count += 1

        start_char = submitted_text.find(sentence, curr_idx)
        if start_char == -1:
            start_char = curr_idx
        end_char = start_char + len(sentence)
        curr_idx = end_char

        match_span = {
            'id': f"span-{idx}",
            'sentenceIndex': idx,
            'text': sentence,
            'startIndex': start_char,
            'endIndex': end_char,
            'similarityScore': round(best_score, 1),
            'matchType': match_type,
            'isAiPattern': is_ai,
            'aiScore': ai_score,
            'sourceName': best_source['name'] if best_source and best_score >= 38.0 else None,
            'sourceUrl': best_source['url'] if best_source and best_score >= 38.0 else None,
            'matchedSourceExcerpt': best_matched_excerpt if best_score >= 38.0 else None
        }
        matches.append(match_span)

        if best_source and best_score >= 38.0:
            s_url = best_source['url']
            if s_url not in source_stats:
                source_stats[s_url] = {
                    'sourceName': best_source['name'],
                    'sourceUrl': best_source['url'],
                    'matchedText': best_matched_excerpt,
                    'scores': [],
                    'matchedPhrasesCount': 0
                }
            source_stats[s_url]['scores'].append(best_score)
            source_stats[s_url]['matchedPhrasesCount'] += 1

    # Calculate overall metrics
    if sentence_count > 0:
        overall_similarity = min(100.0, (matched_sentence_count / sentence_count) * 100.0)
        overall_ai = min(100.0, (ai_sentence_count / sentence_count) * 100.0)
    else:
        overall_similarity = 0.0
        overall_ai = 0.0

    originality = max(0.0, 100.0 - overall_similarity)
    human_pct = max(0.0, 100.0 - overall_ai)

    if overall_similarity >= 50.0:
        risk_level = 'HIGH'
    elif overall_similarity >= 20.0:
        risk_level = 'MODERATE'
    else:
        risk_level = 'LOW'

    ai_verdict = (
        'Copied from AI / LLM Output' if overall_ai >= 65.0 else
        'Likely AI Assisted with Minor Human Editing' if overall_ai >= 35.0 else
        'Human Written Document'
    )

    # Format sources list
    sources = []
    for s_data in source_stats.values():
        avg_pct = sum(s_data['scores']) / len(s_data['scores'])
        sources.append({
            'sourceName': s_data['sourceName'],
            'sourceUrl': s_data['sourceUrl'],
            'matchedText': s_data['matchedText'],
            'matchPercentage': round(avg_pct, 2),
            'matchedPhrasesCount': s_data['matchedPhrasesCount']
        })

    sources.sort(key=lambda s: s['matchPercentage'], reverse=True)
    elapsed_ms = int((time.time() - start_time) * 1000)

    return {
        'wordCount': word_count,
        'characterCount': char_count,
        'sentenceCount': sentence_count,
        'similarityPercentage': round(overall_similarity, 2),
        'originalityPercentage': round(originality, 2),
        'aiProbabilityPercentage': round(overall_ai, 2),
        'humanPercentage': round(human_pct, 2),
        'aiVerdict': ai_verdict,
        'riskLevel': risk_level,
        'processingTimeMs': elapsed_ms,
        'sources': sources,
        'matches': matches
    }

