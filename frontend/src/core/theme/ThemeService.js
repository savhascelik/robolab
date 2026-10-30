import { eventBus } from '../events/EventBus.js';

export const STAGE_THEME_TOKENS = Object.freeze({
  dark: Object.freeze({
    id: 'dark',
    clearColor: '#0B0C0E',
    gridPrimary: '#1E222B',
    gridSecondary: '#151820',
    outlineColor: '#050608',
    hemiSky: '#DCE6F7',
    hemiGround: '#1A1D24',
    hemiIntensity: 1.28,
    dirColor: '#F8FAFC',
    dirIntensity: 1.52,
    fillColor: '#93C5FD',
    fillIntensity: 0.38,
    shadowOpacity: 0.28
  }),
  light: Object.freeze({
    id: 'light',
    clearColor: '#F3F2EE',
    gridPrimary: '#D0D3DC',
    gridSecondary: '#E2E4EA',
    outlineColor: '#1E2330',
    hemiSky: '#FFFDF8',
    hemiGround: '#D8C4A0',
    hemiIntensity: 1.45,
    dirColor: '#FFF8EB',
    dirIntensity: 1.55,
    fillColor: '#D9E8FF',
    fillIntensity: 0.45,
    shadowOpacity: 0.14
  })
});

/**
 * Spatial Workbench Theme Service (`dark` Carbon Lab default / `light` Technical Drafting Paper).
 * Synchronizes CSS custom property attributes (`data-theme="dark|light"`) AND 3D Three.js stage lighting/grid tokens.
 */
export class ThemeService {
  constructor(defaultTheme = 'dark', { storageKey = 'circuit_lab.theme' } = {}) {
    this.storageKey = storageKey;
    const saved = this._readStorage();
    this.currentTheme = saved === 'light' || saved === 'dark' ? saved : defaultTheme === 'light' ? 'light' : 'dark';
    this._applyDomAttribute(this.currentTheme);
  }

  /**
   * Returns active theme code ('dark' | 'light').
   * @returns {'dark'|'light'}
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Returns 3D Three.js stage rendering tokens for the requested or current theme.
   * @param {'dark'|'light'} [theme]
   */
  getStageTokens(theme = this.currentTheme) {
    return STAGE_THEME_TOKENS[theme] || STAGE_THEME_TOKENS.dark;
  }

  /**
   * Switches active theme ('dark' | 'light'), updates DOM attribute, persists preference, and emits `theme:changed`.
   * @param {'dark'|'light'} theme
   */
  setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') {
      throw new Error(`Unsupported theme "${theme}". Expected "dark" or "light".`);
    }
    this.currentTheme = theme;
    this._writeStorage(theme);
    this._applyDomAttribute(theme);
    const tokens = this.getStageTokens(theme);
    eventBus.emit('theme:changed', { theme, tokens });
    return this.currentTheme;
  }

  /**
   * Toggles between 'dark' and 'light' themes.
   * @returns {'dark'|'light'}
   */
  toggleTheme() {
    return this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }

  /**
   * Subscribes to theme changes.
   * @param {(payload: { theme: 'dark'|'light', tokens: object }) => void} handler
   */
  onChange(handler) {
    return eventBus.on('theme:changed', handler);
  }

  /**
   * Explicitly applies the active or provided theme attribute (`data-theme="dark|light"`) to `document.documentElement`.
   * @param {'dark'|'light'} [theme]
   */
  applyToDocument(theme = this.currentTheme) {
    this._applyDomAttribute(theme);
    return this.currentTheme;
  }

  _applyDomAttribute(theme) {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  _readStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(this.storageKey);
      }
    } catch {
      // Ignore storage access errors in headless/sandbox environments
    }
    return null;
  }

  _writeStorage(theme) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, theme);
      }
    } catch {
      // Ignore storage access errors
    }
  }
}

export const themeService = new ThemeService('dark');
