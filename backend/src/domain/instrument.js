const DOMAINS = [
  { id: 'strategy', weight: 0.09, questionIds: [1, 2, 3, 4, 5] },
  { id: 'revenue', weight: 0.06, questionIds: [6, 7, 8, 9] },
  { id: 'governance', weight: 0.13, questionIds: [10, 11, 12, 13, 14] },
  { id: 'risk', weight: 0.19, questionIds: [15, 16, 17, 18, 19] },
  { id: 'data', weight: 0.17, questionIds: [20, 21, 22, 23, 24, 25] },
  { id: 'human', weight: 0.12, questionIds: [26, 27, 28] },
  { id: 'trust', weight: 0.12, questionIds: [29, 30, 31] },
  { id: 'workforce', weight: 0.08, questionIds: [32, 33, 34, 35] },
  { id: 'improve', weight: 0.04, questionIds: [36] },
];

const QUESTION_IDS = DOMAINS.flatMap((domain) => domain.questionIds);
const CRITICAL_IDS = [17, 18, 26];
const FRAMEWORKS = ['aiact', 'gdpr', 'oecd', 'iso', 'nist'];

module.exports = { DOMAINS, QUESTION_IDS, CRITICAL_IDS, FRAMEWORKS };
