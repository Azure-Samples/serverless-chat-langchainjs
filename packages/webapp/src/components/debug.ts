/* eslint-disable unicorn/template-indent */
import { LitElement, css, html } from 'lit';
import { map } from 'lit/directives/map.js';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { type ChatDebugDetails } from '../models.js';

export type DebugComponentOptions = {
  strings: {
    thoughtsTitle: string;
    supportingContentTitle: string;
  };
};

@customElement('azc-debug')
export class DebugComponent extends LitElement {
  @property({ type: Object }) details: ChatDebugDetails = { thoughts: '', dataPoints: [] };
  @property({ type: Object }) options!: DebugComponentOptions;
  @property({ type: Boolean }) showThoughtProcess = true;

  protected renderThoughtProcess = (thoughtProcess: string) => html`${unsafeHTML(thoughtProcess)}`;

  protected renderDataPoints = (dataPoints: string[]) => {
    const infos = dataPoints.map((dataPoint) => {
      const [title, ...extract] = dataPoint.split(':');
      return { title, extract: extract.join(':') };
    });
    return html`<div class="data-points">
      ${map(
        infos,
        (info) =>
          html`<div class="card">
            <div class="title">${info.title}</div>
            <div>${info.extract}</div>
          </div>`,
      )}
    </div>`;
  };

  protected override render() {
    return html`<aside class="debug-container">
      <slot name="close-button"></slot>
      <nav class="nav">
        <button class=${this.showThoughtProcess ? 'active' : ''} @click=${() => (this.showThoughtProcess = true)}>
          ${this.options.strings.thoughtsTitle}
        </button>
        <button class=${this.showThoughtProcess ? '' : 'active'} @click=${() => (this.showThoughtProcess = false)}>
          ${this.options.strings.supportingContentTitle}
        </button>
      </nav>
      <section class="content">
        ${this.showThoughtProcess
          ? this.renderThoughtProcess(this.details.thoughts)
          : this.renderDataPoints(this.details.dataPoints)}
      </section>
    </aside>`;
  }

  static override styles = css`
    *:focus-visible {
      outline: var(--focus-outline) var(--primary);
    }
    button {
      padding: var(--space-md);
      font-size: 1rem;
      outline: var(--focus-outline) transparent;
      transition: outline 0.3s ease;
      border: none;

      &:not(:disabled) {
        cursor: pointer;
      }
      &:hover:not(:disabled) {
        // TODO: separate out hover style
        background: var(--submit-button-bg-hover);
      }
    }
    .active {
      border-bottom: 3px solid var(--primary);
    }
    .nav {
      padding-bottom: var(--space-md);
    }
    .debug-container {
      position: absolute;
      inset: var(--space-xl);
      display: flex;
      flex-direction: column;
      border-radius: var(--border-radius);
      background: var(--bg);
      overflow: hidden;
      padding: var(--space-xl);
      margin: 0px auto;
      max-width: 1024px;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: auto;
    }
    .title {
      font-weight: bold;
      margin-bottom: var(--space-md);
    }
    .card {
      padding: var(--space-md);
      margin-bottom: var(--space-md);
      border-radius: var(--border-radius);
      // TODO: separate out card styles
      color: var(--bot-message-color);
      background: var(--bot-message-bg);
      border: var(--bot-message-border);
      box-shadow: var(--card-shadow);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'azc-debug': DebugComponent;
  }
}
