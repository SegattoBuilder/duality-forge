// Shared application state
import { LS_CHAR_SAVE, LS_CHAR_THEME, LS_CHAR_EXPORT } from '../core/constants.js';

export const SAVE_KEY = LS_CHAR_SAVE;
export const THEME_KEY = LS_CHAR_THEME;
export const EXPORT_KEY = LS_CHAR_EXPORT;

export const GITHUB_RAW = "https://raw.githubusercontent.com/daggersearch/daggerheart-data/main/core/";

export let currentData = [];
export let addedCards = new Set();
export let selectedDomainCards = new Set();
export let savedCardsData = [];
export let _restoring = false;

export function setCurrentData(data) { currentData = data; }
export function setSavedCardsData(data) { savedCardsData = data; }
export function setRestoring(val) { _restoring = val; }

export const FIELD_IDS = ['charName','charPronouns','charLevel','charHeritage','charClass',
    'track_ev','track_prof','t_agi','t_str','t_fin','t_inst','t_pres','t_know',
    'hp_max','stress_max','hope_max','armor_max',
    'thresh_major_extra','thresh_severe_extra',
    'desc_clothes','desc_eyes','desc_body','desc_skin','desc_attitude',
    'gold_hand','gold_bags'];

export const TEXTAREA_IDS = ['levelupNotes','backstory','connections'];

export const CATEGORY_LABELS = {
    'ancestries.json': 'Ancestry',
    'communities.json': 'Community',
    'classes.json': 'Class',
    'subclasses.json': 'Subclass',
};

export const DOMAIN_COLORS = {
    ARCANA:   { text: '#9b6fbf', border: '#391F48', bg: '#391F4830', icon: '../../images/arcana.png' },
    BLADE:    { text: '#c75a4a', border: '#933728', bg: '#93372830', icon: '../../images/blade.png' },
    BLOOD:    { text: '#b83a3d', border: '#760306', bg: '#76030630', icon: '../../images/blood.png' },
    BONE:     { text: '#999a9c', border: '#666769', bg: '#66676930', icon: '../../images/bone.png' },
    CODEX:    { text: '#5b82c4', border: '#19284A', bg: '#19284A30', icon: '../../images/codex.png' },
    DREAD:    { text: '#8a7fc4', border: '#453C7F', bg: '#453C7F30', icon: '../../images/dread.png' },
    GRACE:    { text: '#c46e9e', border: '#883C6E', bg: '#883C6E30', icon: '../../images/grace.png' },
    MIDNIGHT: { text: '#7a7a82', border: '#26252A', bg: '#26252A50', icon: '../../images/midnight.png' },
    SAGE:     { text: '#3da86a', border: '#044320', bg: '#04432030', icon: '../../images/sage.png' },
    SPLENDOR: { text: '#d4af5e', border: '#BF9947', bg: '#BF994730', icon: '../../images/splendor.png' },
    VALOR:    { text: '#d49050', border: '#A66828', bg: '#A6682830', icon: '../../images/valor.png' },
};
