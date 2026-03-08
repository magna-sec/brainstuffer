// ══════════════════════════════════════════════════════════════════
// GLOBAL STATE & CONSTANTS
// ══════════════════════════════════════════════════════════════════

const SLOW_THRESHOLD_SECONDS = 30;
const DATA_BASE = 'data/';

let store = null;       // active quiz session
let manifest = [];      // list of available quiz files
const quizDataCache = {}; // cached loaded quiz JSON
