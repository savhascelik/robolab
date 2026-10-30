import { i18n } from '../core/i18n/I18nService.js';

/**
 * Single-Responsibility Manager for 3D-to-2D Technical Callout Tags,
 * SVG Bent Leader Lines (#leaders), and Component Inspector Popup (#inspector).
 */
export class CalloutManager {
  constructor(options = {}) {
    const opts =
      options && typeof options === 'object' && ('leadersSvg' in options || 'tagsEl' in options || 'cameraController' in options)
        ? options
        : { cameraController: options };
    this.leadersSvg = opts.leadersSvg || null;
    this.tagsEl = opts.tagsEl || null;
    this.inspectorEl = opts.inspectorEl || null;
    this.cameraController = opts.cameraController || null;

    this.callouts = [];
    this.calloutDom = [];
    this.activeCalloutId = null;

    this._unsubscribeI18n = i18n.onChange(() => {
      const prevActive = this.activeCalloutId;
      this.buildDOM();
      if (prevActive) this.select(prevActive);
    });
  }

  resolveLabel(c) {
    if (!c) return '';
    const rawKey = c.i18nKey || c.labelKey || (typeof c.label === 'string' && c.label.includes('.') ? c.label : null);
    if (rawKey) {
      const cleanKey = rawKey.startsWith('@i18n:') ? rawKey.slice(6) : rawKey;
      const baseKey = cleanKey.replace(/\.(label|name)$/, '');
      if (i18n.hasKey(cleanKey)) {
        return i18n.t(cleanKey);
      }
      if (i18n.hasKey(`${baseKey}.label`)) {
        return i18n.t(`${baseKey}.label`);
      }
      if (i18n.hasKey(`${baseKey}.name`)) {
        return i18n.t(`${baseKey}.name`);
      }
    }
    return i18n.pick(c.label) || c.id || '';
  }

  resolveDesc(c) {
    if (!c) return '';
    const rawKey = c.i18nKey || c.descKey || c.labelKey || (typeof c.desc === 'string' && c.desc.includes('.') ? c.desc : null);
    if (rawKey) {
      const cleanKey = rawKey.startsWith('@i18n:') ? rawKey.slice(6) : rawKey;
      const baseKey = cleanKey.replace(/\.(desc|summary|label|name)$/, '');
      if (i18n.hasKey(cleanKey)) {
        return i18n.t(cleanKey);
      }
      if (i18n.hasKey(`${baseKey}.desc`)) {
        return i18n.t(`${baseKey}.desc`);
      }
      if (i18n.hasKey(`${baseKey}.summary`)) {
        return i18n.t(`${baseKey}.summary`);
      }
    }
    return i18n.pick(c.desc) || '';
  }

  setCallouts(callouts = []) {
    this.callouts = callouts;
    this.select(null);
    this.buildDOM();
  }

  buildDOM() {
    if (!this.tagsEl || !this.leadersSvg || typeof document === 'undefined') return;
    this.tagsEl.innerHTML = '';
    this.leadersSvg.innerHTML = '';
    this.calloutDom = [];
    const NS = 'http://www.w3.org/2000/svg';

    for (const c of this.callouts) {
      const poly = document.createElementNS(NS, 'polyline');
      poly.setAttribute('class', 'leader-line');
      this.leadersSvg.appendChild(poly);

      const pin = document.createElement('div');
      pin.className = 'anchor-pin';
      this.tagsEl.appendChild(pin);

      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'call-tag';
      tag.innerHTML = `<span class="call-dot"></span><span>${this.resolveLabel(c)}</span>`;
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select(this.activeCalloutId === c.id ? null : c.id);
      });
      tag.addEventListener('pointerenter', () => {
        poly.classList.add('is-active');
      });
      tag.addEventListener('pointerleave', () => {
        if (this.activeCalloutId !== c.id) poly.classList.remove('is-active');
      });
      this.tagsEl.appendChild(tag);

      this.calloutDom.push({ data: c, poly, pin, tag });
    }
  }

  select(id) {
    this.activeCalloutId = id;
    const found = this.calloutDom.find((item) => item.data.id === id);
    for (const item of this.calloutDom) {
      const active = item.data.id === id;
      item.tag.classList.toggle('is-active', active);
      item.poly.classList.toggle('is-active', active);
    }
    if (found && this.inspectorEl) {
      this.inspectorEl.hidden = false;
      this.inspectorEl.innerHTML = `
        <h4>${this.resolveLabel(found.data)}</h4>
        <p>${this.resolveDesc(found.data)}</p>
      `;
    } else if (this.inspectorEl) {
      this.inspectorEl.hidden = true;
    }
  }

  update() {
    if (!this.leadersSvg || this.calloutDom.length === 0) return;
    const w = this.cameraController?.width || 0;
    const h = this.cameraController?.height || 0;
    if (w <= 0 || h <= 0) {
      for (const { poly, pin, tag } of this.calloutDom) {
        poly.style.display = 'none';
        pin.style.display = 'none';
        tag.style.display = 'none';
      }
      return;
    }
    this.leadersSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    for (const { data, poly, pin, tag } of this.calloutDom) {
      const anchor = typeof data.worldAnchor === 'function' ? data.worldAnchor() : null;
      const p0 = anchor ? this.cameraController.projectToScreen(anchor) : null;
      if (
        !p0 ||
        p0.visible === false ||
        !Number.isFinite(p0.x) ||
        !Number.isFinite(p0.y) ||
        (p0.x === 0 && p0.y === 0)
      ) {
        poly.style.display = 'none';
        pin.style.display = 'none';
        tag.style.display = 'none';
        continue;
      }

      poly.style.display = '';
      pin.style.display = '';
      tag.style.display = '';

      const [ox, oy] = data.offset || [0, -40];
      const rawX = Math.max(64, Math.min(w - 64, p0.x + ox));
      const minTopY = rawX < 300 ? 84 : 28;
      const p2 = {
        x: rawX,
        y: Math.max(minTopY, Math.min(h - 44, p0.y + oy))
      };
      const knee = {
        x: p0.x + ox * 0.45,
        y: p2.y
      };

      pin.style.left = `${p0.x}px`;
      pin.style.top = `${p0.y}px`;
      tag.style.left = `${p2.x}px`;
      tag.style.top = `${p2.y}px`;
      poly.setAttribute(
        'points',
        `${p0.x.toFixed(1)},${p0.y.toFixed(1)} ${knee.x.toFixed(1)},${knee.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
      );
    }
  }
}
