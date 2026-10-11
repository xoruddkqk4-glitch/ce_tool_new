/**
 * SPA Page Router for ChunkLingo
 * Switches between 3 views (Input, Practice, Memorize) without browser reload,
 * preserving Web Audio API Context, PCM audio buffers, and sentence states.
 */

export class AppRouter {
  constructor(views = {}) {
    this.views = views; // { input: View, practice: View, memorize: View }
    this.currentPage = 'input';
    this.initEvents();
  }

  registerViews(views) {
    this.views = { ...this.views, ...views };
  }

  initEvents() {
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

    const prevPage = this.currentPage;
    if (this.views[prevPage] && typeof this.views[prevPage].onDeactivated === 'function') {
      this.views[prevPage].onDeactivated();
    }

    this.currentPage = pageId;

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
