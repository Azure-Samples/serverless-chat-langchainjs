import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import sendSvg from '../../assets/send.svg?raw';
import { postArticle } from '../api.js';

@customElement('azc-article')
export class ArticleComponent extends LitElement {
  @property() topic = '';
  @state() protected article = '';
  @state() protected hasError = false;
  @state() protected isLoading = false;

  async onGenerateClicked() {
    if (this.isLoading) {
      return;
    }

    this.hasError = false;
    this.isLoading = true;
    this.article = '';

    try {
      const response = await postArticle({ topic: this.topic });
      this.article = response.article;
    } catch (error) {
      this.hasError = true;
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  onApproveClicked() {
    console.log('Article approved!');
    // Here you could add logic to save the article or notify the user
  }

  onRequestChangesClicked() {
    console.log('Requesting changes...');
    // Here you could add logic to allow the user to provide feedback
  }

  protected renderLoader = () =>
    this.isLoading
      ? html`
          <div class="message assistant loader">
            <div class="message-body">
              <slot name="loader"><div class="loader-animation"></div></slot>
            </div>
          </div>
        `
      : nothing;

  protected renderArticle = () =>
    this.article
      ? html`
          <div class="message assistant">
            <div class="message-body">
              <div class="content">${this.article}</div>
              <div class="feedback-buttons">
                <button @click=${this.onApproveClicked}>Approve</button>
                <button @click=${this.onRequestChangesClicked}>Request Changes</button>
              </div>
            </div>
          </div>
        `
      : nothing;

  protected renderError = () =>
    this.hasError
      ? html`
          <div class="message assistant error">
            <div class="message-body">
              <span class="error-message">We are currently experiencing an issue.</span>
              <button @click=${async () => this.onGenerateClicked()}>Retry</button>
            </div>
          </div>
        `
      : nothing;

  protected renderInput = () => html`
    <div class="chat-input">
      <form class="input-form">
        <textarea
          class="text-input"
          placeholder="Enter a topic for the article..."
          .value=${this.topic}
          autocomplete="off"
          @input=${(event: { target: { value: string; }; }) => {
            this.topic = event.target.value;
          }}
          .disabled=${this.isLoading}
        ></textarea>
        <button
          class="submit-button"
          @click=${async () => this.onGenerateClicked()}
          title="Generate article"
          .disabled=${this.isLoading || !this.topic}
        >
          ${unsafeSVG(sendSvg)}
        </button>
      </form>
    </div>
  `;

  protected override render() {
    return html`
      <section class="chat-container">
        <div class="messages">
          ${this.renderArticle()}
          ${this.renderLoader()}
          ${this.renderError()}
        </div>
        ${this.renderInput()}
      </section>
    `;
  }

  static override styles = css`
    :host {
      --primary: var(--azc-primary, #07f);
      --error: var(--azc-error, #e30);
      --text-color: var(--azc-text-color, #000);
      --text-invert-color: var(--azc--text-invert-color, #fff);
      --disabled-color: var(--azc-disabled-color, #ccc);
      --bg: var(--azc-bg, #eee);
      --card-bg: var(--azc-card-bg, #fff);
      --card-shadow: var(--azc-card-shadow, 0 0.3px 0.9px rgba(0 0 0 / 12%), 0 1.6px 3.6px rgba(0 0 0 / 16%));
      --space-md: var(--azc-space-md, 12px);
      --space-xl: var(--azc-space-xl, calc(var(--space-md) * 2));
      --space-xs: var(--azc-space-xs, calc(var(--space-md) / 2));
      --border-radius: var(--azc-border-radius, 16px);
      --focus-outline: var(--azc-focus-outline, 2px solid);
    }
    .chat-container {
      height: 100%;
      overflow: auto;
      position: relative;
      background: var(--bg);
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
    }
    .messages {
      padding: var(--space-xl);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    .message {
      width: auto;
      max-width: 90%;
      align-self: center;
      border-radius: var(--border-radius);
      padding: var(--space-xl);
      background: var(--card-bg);
      color: var(--text-color);
      box-shadow: var(--card-shadow);
    }
    .message-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    .content {
      white-space: pre-line;
    }
    .feedback-buttons {
      display: flex;
      gap: var(--space-md);
      margin-top: var(--space-md);
    }
    .feedback-buttons button {
      flex: 1;
      padding: var(--space-md);
      border: none;
      border-radius: calc(var(--border-radius) / 2);
      cursor: pointer;
      background: var(--primary);
      color: var(--text-invert-color);
    }
    .chat-input {
      position: sticky;
      bottom: 0;
      padding: var(--space-xl);
      padding-top: var(--space-md);
      background: var(--bg);
      box-shadow: 0 calc(-1 * var(--space-md)) var(--space-md) var(--bg);
      display: flex;
      gap: var(--space-md);
    }
    .input-form {
      display: flex;
      flex: 1 auto;
      background: var(--chat-input-bg, var(--card-bg));
      border-radius: var(--border-radius);
      padding: var(--space-md);
      box-shadow: var(--card-shadow);
    }
    .text-input {
      padding: var(--space-xs);
      font-family: inherit;
      font-size: 1rem;
      flex: 1 auto;
      border: none;
      resize: none;
      background: none;
    }
    .submit-button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-xs);
      background: none;
      border: none;
      color: var(--primary);
    }
    .loader-animation {
      width: 100px;
      height: 4px;
      border-radius: var(--border-radius);
      overflow: hidden;
      background-color: var(--primary);
      animation: cubic-bezier(0.85, 0, 0.15, 1) 2s infinite load-animation;
    }
    @keyframes load-animation {
      0% { transform: scaleX(0); transform-origin: center left; }
      50% { transform: scaleX(1); transform-origin: center left; }
      51% { transform: scaleX(1); transform-origin: center right; }
      100% { transform: scaleX(0); transform-origin: center right; }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'azc-article': ArticleComponent;
  }
}
