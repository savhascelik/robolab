/**
 * AppRouter — Clean URL & History API Router for CircuitLab 3D.
 *
 * Synchronizes navigation between:
 * - `/` (or `/showcase`)              -> 3D Robotics & Edge AI Showcase Landing Page (`view: 'showcase'`)
 * - `/workbench`                      -> 3D Spatial Hardware Workbench (`view: 'workbench'`)
 * - `/workbench?preset=sumo`          -> 3D Workbench preloaded with Autonomous Mini-Sumo Robot circuit
 * - `/workbench?preset=jetson`        -> 3D Workbench preloaded with NVIDIA Jetson Vision Rover circuit
 *
 * Ensures:
 * 1. Refreshing (`F5` / `Ctrl+R`) while inside `/workbench` stays inside the 3D Workbench.
 * 2. Real `<a href="/workbench">` and `<a href="/">` links work with standard click (SPA transition),
 *    middle-click / Ctrl+click (open in new tab), and Browser Back/Forward (`popstate`).
 */
export class AppRouter {
  /**
   * @param {object} [opts]
   * @param {Location| { pathname?: string, search?: string, hash?: string }} [opts.locationObj]
   * @param {History} [opts.historyObj]
   */
  constructor(opts = {}) {
    this._location =
      opts.locationObj || (typeof window !== 'undefined' ? window.location : null);
    this._history =
      opts.historyObj || (typeof window !== 'undefined' ? window.history : null);
    this._listeners = new Set();

    this.currentRoute = this.resolveRoute(
      this._location
        ? `${this._location.pathname || '/'}${this._location.search || ''}${this._location.hash || ''}`
        : '/'
    );

    this._onPopState = () => {
      if (!this._location) return;
      const nextUrl = `${this._location.pathname || '/'}${this._location.search || ''}${this._location.hash || ''}`;
      this.currentRoute = this.resolveRoute(nextUrl);
      this._emit(this.currentRoute, { source: 'popstate' });
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('popstate', this._onPopState);
    }
  }

  /**
   * Static helper for parsing a URL path/query/hash string into a normalized route descriptor.
   * @param {string} rawUrl
   * @param {string} [search]
   * @param {string} [hash]
   */
  static resolveRoute(rawUrl = '/', search = '', hash = '') {
    return AppRouter.prototype.resolveRoute(rawUrl, search, hash);
  }

  /**
   * Parses a URL path/query/hash string into a normalized route descriptor.
   * @param {string} rawUrl
   * @param {string} [extraSearch]
   * @param {string} [extraHash]
   * @returns {{ view: 'showcase'|'workbench'|'workspace'|'studio', tab?: 'workspaces'|'groups'|'presets'|'account'|null, preset: 'sumo'|'jetson'|null, workspaceSlug: string|null, componentSlug?: string|null, href: string, hash: string }}
   */
  resolveRoute(rawUrl = '/', extraSearch = '', extraHash = '') {
    const combinedUrl = `${String(rawUrl || '/')}${extraSearch || ''}${extraHash || ''}`;
    const parsed = new URL(combinedUrl, 'http://localhost');
    const pathname = (parsed.pathname || '/').replace(/\/+$/, '') || '/';
    const viewParam = (parsed.searchParams.get('view') || '').toLowerCase();
    const presetParam = (parsed.searchParams.get('preset') || '').toLowerCase();
    const tabParam = (parsed.searchParams.get('tab') || '').toLowerCase();
    const workspaceParam = (parsed.searchParams.get('workspace') || '').trim();
    const componentParam = (
      parsed.searchParams.get('component') ||
      parsed.searchParams.get('id') ||
      ''
    ).trim();
    const hash = parsed.hash || '';
    const validTabs = new Set(['workspaces', 'groups', 'presets', 'account']);

    const isStudioPath =
      pathname === '/studio' ||
      pathname.startsWith('/studio/') ||
      pathname === '/component-studio' ||
      pathname.startsWith('/component-studio/') ||
      viewParam === 'studio' ||
      hash === '#studio' ||
      hash === '#/studio' ||
      hash.startsWith('#/studio/');

    if (isStudioPath) {
      let rawStudioSlug = '';
      if (pathname.startsWith('/studio/')) {
        rawStudioSlug = pathname.slice('/studio/'.length).replace(/\/+$/, '');
      } else if (pathname.startsWith('/component-studio/')) {
        rawStudioSlug = pathname.slice('/component-studio/'.length).replace(/\/+$/, '');
      } else if (hash.startsWith('#/studio/')) {
        rawStudioSlug = hash.slice('#/studio/'.length).replace(/\/+$/, '');
      } else if (componentParam) {
        rawStudioSlug = componentParam;
      }

      const componentSlug = rawStudioSlug
        ? decodeURIComponent(rawStudioSlug)
            .trim()
            .replace(/^custom\./i, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase() || null
        : null;

      return {
        view: 'studio',
        tab: null,
        preset: null,
        workspaceSlug: null,
        componentSlug,
        href: componentSlug ? `/studio/${encodeURIComponent(componentSlug)}` : '/studio',
        hash
      };
    }

    if (pathname.startsWith('/workspace/')) {
      const rawSubPath = pathname.slice('/workspace/'.length).replace(/\/+$/, '');
      const lowerSubPath = rawSubPath.toLowerCase();
      if (rawSubPath && !validTabs.has(lowerSubPath) && !tabParam) {
        const workspaceSlug = decodeURIComponent(rawSubPath).trim();
        return {
          view: 'workbench',
          tab: null,
          preset: null,
          workspaceSlug,
          href: `/workspace/${encodeURIComponent(workspaceSlug)}`,
          hash
        };
      }
    }

    const isWorkspacePath =
      pathname === '/workspace' ||
      pathname.startsWith('/workspace/') ||
      viewParam === 'workspace' ||
      hash === '#workspace' ||
      hash === '#/workspace';

    if (isWorkspacePath) {
      const pathSubTab = pathname.startsWith('/workspace/')
        ? pathname.slice('/workspace/'.length).toLowerCase()
        : '';
      const rawTab = tabParam || pathSubTab || 'workspaces';
      const tab = validTabs.has(rawTab) ? rawTab : 'workspaces';
      const canonicalHref = tab === 'workspaces' ? '/workspace' : `/workspace?tab=${tab}`;
      return {
        view: 'workspace',
        tab,
        preset: null,
        workspaceSlug: null,
        href: canonicalHref,
        hash
      };
    }

    if (workspaceParam) {
      return {
        view: 'workbench',
        tab: null,
        preset: null,
        workspaceSlug: workspaceParam,
        href: `/workspace/${encodeURIComponent(workspaceParam)}`,
        hash
      };
    }

    const isWorkbenchPath =
      pathname === '/workbench' ||
      pathname.startsWith('/workbench/') ||
      viewParam === 'workbench' ||
      hash === '#workbench' ||
      hash === '#/workbench';

    const preset =
      presetParam === 'sumo' || pathname === '/workbench/sumo'
        ? 'sumo'
        : presetParam === 'jetson' || pathname === '/workbench/jetson'
        ? 'jetson'
        : null;

    const view = isWorkbenchPath || preset !== null ? 'workbench' : 'showcase';

    let canonicalHref = '/';
    if (view === 'workbench') {
      canonicalHref = preset ? `/workbench?preset=${preset}` : '/workbench';
    } else if (hash && hash.startsWith('#showcase-scene-')) {
      canonicalHref = `/${hash}`;
    }

    return {
      view,
      tab: null,
      preset,
      workspaceSlug: null,
      href: canonicalHref,
      hash
    };
  }

  /**
   * Navigates to the given path (`/` or `/workbench` or `/workbench?preset=sumo`),
   * pushing a new browser history state and notifying route listeners.
   *
   * @param {string} targetHref
   * @param {{ replace?: boolean, source?: string }} [options]
   */
  navigate(targetHref, options = {}) {
    const nextRoute = this.resolveRoute(targetHref);
    const changed =
      nextRoute.href !== this.currentRoute.href || nextRoute.view !== this.currentRoute.view;

    this.currentRoute = nextRoute;

    if (this._history) {
      try {
        if (options.replace && typeof this._history.replaceState === 'function') {
          this._history.replaceState({ view: nextRoute.view, preset: nextRoute.preset }, '', nextRoute.href);
        } else if (changed && typeof this._history.pushState === 'function') {
          this._history.pushState({ view: nextRoute.view, preset: nextRoute.preset }, '', nextRoute.href);
        }
      } catch {
        // Ignore history state security errors in sandboxed/file origins
      }
    }

    this._emit(this.currentRoute, { source: options.source || 'navigate' });
    return this.currentRoute;
  }

  /**
   * Helper for intercepting standard left-clicks on `<a href="...">` while allowing
   * Ctrl/Cmd/Shift/Middle-click to open in a new tab naturally.
   *
   * @param {MouseEvent} event
   * @returns {boolean} true if intercepted for SPA navigation
   */
  shouldInterceptClick(event) {
    if (!event) return true;
    if (event.defaultPrevented) return false;
    if (typeof event.button === 'number' && event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    return true;
  }

  /**
   * Subscribes to route transitions.
   * @param {(route: { view: 'showcase'|'workbench', preset: 'sumo'|'jetson'|null, href: string }, meta: { source: string }) => void} fn
   * @returns {() => void}
   */
  onChange(fn) {
    if (typeof fn !== 'function') return () => {};
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(route, meta) {
    for (const fn of this._listeners) {
      fn(route, meta);
    }
  }

  destroy() {
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('popstate', this._onPopState);
    }
    this._listeners.clear();
  }
}
