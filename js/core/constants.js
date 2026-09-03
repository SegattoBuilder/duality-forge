// ========== TIMERS (ms) ==========
export const TOAST_DURATION = 5000;
export const SYNC_STATUS_DURATION = 10000;
export const AUTOSAVE_INTERVAL = 30 * 1000; // 30s for testing — revert to 15 * 60 * 1000

// ========== VALIDATION ==========
export const PASSWORD_MIN_LENGTH = 6;

// ========== SUPABASE TABLES ==========
export const TABLE_CHARACTERS = 'characters';
export const TABLE_PROFILES = 'profiles';
export const TABLE_DM_TABLES = 'dm_tables';

// ========== LOCALSTORAGE KEYS: SHARED ==========
export const LS_CONSENT = 'dh_terms_accepted';

// ========== LOCALSTORAGE KEYS: DM ==========
export const LS_DM_CREATURES = 'dh_dm_creatures';
export const LS_DM_FEAR = 'dh_dm_fear';
export const LS_DM_COUNTERS = 'dh_dm_counters';
export const LS_DM_CAMPAIGN = 'dh_campaign_name';
export const LS_DM_MODE = 'dh_dm_mode';
export const LS_DM_ACTIONBAR = 'dh_dm_actionbar';
export const LS_DM_FEARPOOL = 'dh_dm_fearpool';
export const LS_DM_TITLE = 'dh_dm_title';
export const LS_DM_ACTIVE_TAB = 'dh_dm_active_tab';
export const LS_DM_VAULT = 'dh_dm_vault';
export const LS_DM_VAULT_GROUPS = 'dh_dm_vault_groups';
export const LS_DM_VAULT_COLLAPSED = 'dh_dm_vault_collapsed';
export const LS_DM_CHRONICLE = 'dh_dm_chronicle';
export const LS_DM_ADVERSARIES_CACHE = 'dh_adversaries_cache';
export const LS_DM_TABLE_ID = 'dh_dm_table_id';

// ========== LOCALSTORAGE KEYS: CHARACTER ==========
export const LS_CHAR_SAVE = 'dh_sheet';
export const LS_CHAR_THEME = 'dh_theme';
export const LS_CHAR_EXPORT = 'dh_last_export';
export const LS_CHAR_MODE = 'dh_mode';
export const LS_CHAR_ACTIVE_TAB = 'dh_active_tab';
export const LS_CHAR_SAVE_V1 = 'dh_sheet_v1';
