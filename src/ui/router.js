/**
 * SPA Page Router for CE Tool
 * Switches between 3 views (Input, Practice, Memorize) without browser reload,
 * preserving Web Audio API Context, PCM audio buffers, and sentence states.
 */

import { playbackController } from '../audio/playback-controller.js';

export class AppRouter {
  constructor(views = {}) {
    this.views = views; // { input: View, practice: View, memorize: View }
    this.currentPage = 'input';
    this.hasNavigated = false;
    this.initEvents();
  }

  registerViews(views) {
    this.views = { ...this.views, ...views };
  }

  initEvents() {
    // Brand Logo click -> navigate to first page ('input')
    const brandEl = document.querySelector('.brand');
    if (brandEl) {
      brandEl.addEventListener('click', () => {
        if (this.currentPage !== 'input') {
          this.navigateTo('input');
        } else if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      brandEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (this.currentPage !== 'input') {
            this.navigateTo('input');
          } else if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    }

    // Top tab clicks
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pageId = btn.getAttribute('data-page');
        if (pageId) {
          this.navigateTo(pageId);
        }
      });
    });

    // Hash change support
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (['input', 'practice', 'memorize'].includes(hash) && hash !== this.currentPage) {
        this.navigateTo(hash, false);
      }
    });
  }

  navigateTo(pageId, updateHash = true) {
    if (!this.views[pageId] && !document.getElementById(`view-${pageId}`)) return;
    // Re-selecting the current tab must not reset the view state (e.g. Page 2 sentence position)
    if (this.hasNavigated && pageId === this.currentPage) return;

    const prevPage = this.currentPage;
    if (this.views[prevPage] && typeof this.views[prevPage].onDeactivated === 'function') {
      this.views[prevPage].onDeactivated();
    }

    // Any page-owned segment playback must stop when leaving the page
    playbackController.stop();

    this.currentPage = pageId;
    this.hasNavigated = true;

    // 1. Update navigation tab buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-page') === pageId);
    });

    // 2. Toggle view containers
    ['input', 'practice', 'memorize'].forEach(key => {
      const container = document.getElementById(`view-${key}`);
      if (container) {
        container.classList.toggle('hidden', key !== pageId);
      }
    });

    // 3. Notify new view
    if (this.views[pageId] && typeof this.views[pageId].onActivated === 'function') {
      this.views[pageId].onActivated();
    }

    // 4. Update hash
    if (updateHash) {
      window.location.hash = pageId;
    }
  }

  getCurrentPage() {
    return this.currentPage;
  }
}
