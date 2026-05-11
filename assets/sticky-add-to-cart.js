if (!customElements.get('sticky-add-to-cart')) {
  customElements.define(
    'sticky-add-to-cart',
    class StickyAddToCart extends HTMLElement {
      constructor() {
        super();
        this.onScroll = this.onScroll.bind(this);
        this.onVariantChange = this.onVariantChange.bind(this);
        this.onResize = this.onResize.bind(this);
        this.sectionId = null;
        this.buyButtons = null;
        this.mainSubmit = null;
        this.abortScroll = null;
      }

      connectedCallback() {
        this.sectionId = this.dataset.sectionId;
        if (!this.sectionId) return;

        this.buyButtons = document.querySelector(`#ProductInfo-${this.sectionId} .product-form__buttons`);
        this.mainSubmit = document.querySelector(`#ProductSubmitButton-${this.sectionId}`);
        this.priceSource = document.querySelector(`#price-${this.sectionId}`);
        this.stickyPrice = this.querySelector('[data-sticky-price]');
        this.stickySubmit = this.querySelector('[data-sticky-submit]');
        this.stickySubmitText = this.querySelector('[data-sticky-submit-text]');
        this.variantEl = this.querySelector('[data-sticky-variant]');

        if (!this.buyButtons || !this.mainSubmit || !this.stickySubmit) return;

        this.mq = window.matchMedia('(max-width: 749px)');
        if (!this.mq.matches) return;

        this.syncPrice();
        this.syncVariantLabel();
        this.syncSubmitMirror();

        if (typeof subscribe !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
          this.unsubscribeVariant = subscribe(PUB_SUB_EVENTS.variantChange, this.onVariantChange);
        }

        this.submitObserver = new MutationObserver(() => this.syncSubmitMirror());
        this.submitObserver.observe(this.mainSubmit, {
          attributes: true,
          attributeFilter: ['disabled'],
          childList: true,
          subtree: true,
          characterData: true,
        });

        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onResize, { passive: true });
        this.onScroll();

        this.mq.addEventListener('change', this.onResize);
      }

      disconnectedCallback() {
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onResize);
        this.mq?.removeEventListener('change', this.onResize);
        this.submitObserver?.disconnect();
        this.unsubscribeVariant?.();
      }

      onVariantChange(payload) {
        if (!payload?.data || payload.data.sectionId !== this.sectionId) return;
        requestAnimationFrame(() => {
          this.syncPrice();
          this.syncVariantLabel(payload.data.variant);
          this.syncSubmitMirror();
        });
      }

      onResize() {
        if (!this.mq?.matches) {
          this.classList.remove('sticky-atc--visible');
          this.setAriaHidden(true);
          return;
        }
        this.onScroll();
      }

      onScroll() {
        if (!this.mq?.matches || !this.buyButtons) return;

        const rect = this.buyButtons.getBoundingClientRect();
        const headerPx = this.getHeaderOffset();
        const pastMainAtc = rect.bottom < headerPx + 4;

        this.classList.toggle('sticky-atc--visible', pastMainAtc);
        this.setAriaHidden(!pastMainAtc);
      }

      getHeaderOffset() {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-height').trim();
        const n = parseFloat(raw);
        return Number.isFinite(n) ? n : 64;
      }

      setAriaHidden(hidden) {
        this.toggleAttribute('aria-hidden', hidden);
      }

      syncPrice() {
        if (!this.priceSource || !this.stickyPrice) return;
        const priceEl = this.priceSource.querySelector('.price');
        if (priceEl) {
          this.stickyPrice.innerHTML = priceEl.outerHTML;
        } else {
          this.stickyPrice.innerHTML = '';
        }
      }

      syncVariantLabel(variantFromEvent) {
        if (!this.variantEl) return;

        let label = '';
        if (variantFromEvent?.title && variantFromEvent.title !== 'Default Title') {
          label = variantFromEvent.title;
        } else {
          const jsonEl = document.querySelector(
            `product-info[data-section="${this.sectionId}"] variant-selects [data-selected-variant]`
          );
          if (jsonEl?.textContent) {
            try {
              const v = JSON.parse(jsonEl.textContent);
              if (v?.title && v.title !== 'Default Title') label = v.title;
            } catch {
              /* ignore */
            }
          }
        }

        if (label) {
          this.variantEl.textContent = label;
          this.variantEl.removeAttribute('hidden');
        } else {
          this.variantEl.textContent = '';
          this.variantEl.setAttribute('hidden', '');
        }
      }

      syncSubmitMirror() {
        if (!this.mainSubmit || !this.stickySubmit || !this.stickySubmitText) return;

        const textSpan = this.mainSubmit.querySelector(':scope > span');
        if (textSpan) this.stickySubmitText.textContent = textSpan.textContent.trim();

        this.stickySubmit.disabled = this.mainSubmit.disabled;
        this.stickySubmit.classList.toggle('loading', this.mainSubmit.classList.contains('loading'));

        const mainSpin = this.mainSubmit.querySelector('.loading__spinner');
        const stickySpin = this.stickySubmit.querySelector('.loading__spinner');
        if (mainSpin && stickySpin) {
          stickySpin.classList.toggle('hidden', mainSpin.classList.contains('hidden'));
        }
      }
    }
  );
}
