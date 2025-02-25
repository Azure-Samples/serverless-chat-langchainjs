import { LitElement, css, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { customElement, property, state } from 'lit/decorators.js';
import panelSvg from '../../assets/panel.svg?raw';
import deleteSvg from '../../assets/delete.svg?raw';

export type ChatSession = {
  id: string;
  title: string;
};

export type HistoryComponentState = {
  hasError: boolean;
  isLoading: boolean;
};

export type HistoryComponentOptions = {
  apiUrl?: string;
  strings: {
    openSidebar: string;
    closeSidebar: string;
    chats: string;
    deleteChatButton: string;
    errorMessage: string;
    noChatHistory: string;
  };
};

export const historyDefaultOptions: HistoryComponentOptions = {
  apiUrl: '',
  strings: {
    openSidebar: 'Open sidebar',
    closeSidebar: 'Close sidebar',
    chats: 'Chats',
    deleteChatButton: 'Delete chat',
    errorMessage: 'Cannot load chat history',
    noChatHistory: 'No chat history',
  },
};

export const isLargeScreen = () => window.matchMedia('(width >= 800px)').matches;

/**
 * A component that displays a list of chat sessions for a user.
 * Labels and other aspects are configurable via the `option` property.
 * @element azc-history
 * @fires loadSession - Fired when a chat session is loaded
 * @fires chatsChanged - Fired when the chat history is updated
 * @fires stateChanged - Fired when the state of the component changes
 * */
@customElement('azc-history')
export class HistoryComponent extends LitElement {
  @property({
    type: Object,
    converter: (value) => ({ ...historyDefaultOptions, ...JSON.parse(value ?? '{}') }),
  })
  options: HistoryComponentOptions = historyDefaultOptions;

  @property({ type: Boolean, reflect: true }) open = isLargeScreen();
  @property() userId = '';
  @state() protected chats: ChatSession[] = [];
  @state() protected hasError = false;
  @state() protected isLoading = false;

  onPanelClicked() {
    this.open = !this.open;
  }

  async onChatClicked(sessionId: string) {
    try {
      this.isLoading = true;
      const response = await fetch(`${this.getApiUrl()}/api/chats/${sessionId}/?userId=${this.userId}`);
      const messages = await response.json();
      const loadSessionEvent = new CustomEvent('loadSession', {
        detail: { id: sessionId, messages },
        bubbles: true,
      });
      this.dispatchEvent(loadSessionEvent);

      if (!isLargeScreen()) {
        this.open = false;
      }
    } catch (error) {
      console.error(error);
    }

    this.isLoading = false;
  }

  async onDeleteChatClicked(sessionId: string) {
    try {
      this.chats = this.chats.filter((chat) => chat.id !== sessionId);

      await fetch(`${this.getApiUrl()}/api/chats/${sessionId}?userId=${this.userId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(error);
    }
  }

  override requestUpdate(name?: string, oldValue?: any) {
    switch (name) {
      case 'userId': {
        this.refresh();
        break;
      }

      case 'chats': {
        const chatsUpdatedEvent = new CustomEvent('chatsUpdated', {
          detail: { chats: this.chats },
          bubbles: true,
        });
        this.dispatchEvent(chatsUpdatedEvent);
        break;
      }

      case 'hasError':
      case 'isLoading': {
        const state = {
          hasError: this.hasError,
          isLoading: this.isLoading,
        };
        const stateUpdatedEvent = new CustomEvent('stateChanged', {
          detail: { state },
          bubbles: true,
        });
        this.dispatchEvent(stateUpdatedEvent);
        break;
      }

      default:
    }

    super.requestUpdate(name, oldValue);
  }

  async refresh() {
    if (!this.userId) {
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    try {
      const response = await fetch(`${this.getApiUrl()}/api/chats?userId=${this.userId}`);
      const chats = await response.json();
      this.chats = chats;
      this.isLoading = false;
    } catch (error) {
      this.hasError = true;
      this.isLoading = false;
      console.error(error);
    }
  }

  protected getApiUrl = () => this.options.apiUrl || import.meta.env.VITE_API_URL || '';

  protected renderLoader = () =>
    this.isLoading ? html`<slot name="loader"><div class="loader-animation"></div></slot>` : nothing;

  protected renderNoChatHistory = () =>
    this.chats.length === 0 && !this.isLoading && !this.hasError
      ? html`<div class="message">${this.options.strings.noChatHistory}</div>`
      : nothing;

  protected renderError = () =>
    this.hasError ? html`<div class="message error">${this.options.strings.errorMessage}</div>` : nothing;

  protected renderPanelButton = (standalone?: boolean) => html`
    <button
      class="icon-button ${standalone ? 'panel-button' : ''}"
      @click=${this.onPanelClicked}
      title=${this.open ? this.options.strings.closeSidebar : this.options.strings.openSidebar}
    >
      ${unsafeSVG(panelSvg)}
    </button>
  `;

  protected renderChatEntry = (entry: ChatSession) => html`
    <a
      class="chat-entry"
      href="#"
      @click=${(event: Event) => {
        event.preventDefault();
        this.onChatClicked(entry.id);
      }}
      title=${entry.title}
    >
      <span class="chat-title">${entry.title}</span>
      <button
        class="icon-button"
        @click=${(event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          this.onDeleteChatClicked(entry.id);
        }}
        title="${this.options.strings.deleteChatButton}"
      >
        ${unsafeSVG(deleteSvg)}
      </button>
    </a>
  `;

  protected override render() {
    return html`<aside class="chats-panel">
        <div class="buttons">
          ${this.renderPanelButton()}
          <slot name="buttons"></slot>
        </div>
        <div class="chats">
          <h2>${this.options.strings.chats}</h2>
          ${this.renderLoader()} ${repeat(this.chats, (entry) => this.renderChatEntry(entry))}
          ${this.renderNoChatHistory()} ${this.renderError()}
        </div>
      </aside>
      ${this.open ? nothing : this.renderPanelButton(true)} `;
  }

  static override styles = css`
    :host {
      /* Base properties */
      --primary: var(--azc-primary, #07f);
      --bg: var(--azc-bg, #eee);
      --error: var(--azc-error, #e30);
      --text-color: var(--azc-text-color, #000);
      --space-md: var(--azc-space-md, 12px);
      --space-xl: var(--azc-space-xl, calc(var(--space-md) * 2));
      --space-xs: var(--azc-space-xs, calc(var(--space-md) / 2));
      --space-xxs: var(--azc-space-xs, calc(var(--space-md) / 4));
      --border-radius: var(--azc-border-radius, 16px);
      --focus-outline: var(--azc-focus-outline, 2px solid);
      --overlay-color: var(--azc-overlay-color, rgba(0 0 0 / 40%));

      /* Component-specific properties */
      --panel-bg: var(--azc-panel-bg, #fff);
      --panel-width: var(--azc-panel-width, 300px);
      --panel-shadow: var(--azc-panel-shadow, 0 0 10px rgba(0, 0, 0, 0.1));
      --error-color: var(--azc-error-color, var(--error));
      --error-border: var(--azc-error-border, none);
      --error-bg: var(--azc-error-bg, var(--card-bg));
      --icon-button-color: var(--azc-icon-button-color, var(--text-color));
      --icon-button-bg: var(--azc-icon-button-bg, none);
      --icon-button-bg-hover: var(--azc-icon-button-bg, rgba(0, 0, 0, 0.07));
      --panel-button-color: var(--azc-panel-button-color, var(--text-color));
      --panel-button-bg: var(--azc-panel-button-bg, var(--bg));
      --panel-button-bg-hover: var(--azc-panel-button-bg, hsl(from var(--panel-button-bg) h s calc(l - 6)));
      --chat-entry-bg: var(--azc-chat-entry-bg, none);
      --chat-entry-bg-hover: var(--azc-chat-entry-bg-hover, #f0f0f0);

      width: 0;
      transition: width 0.3s ease;
      overflow: hidden;
    }
    :host([open]) {
      width: var(--panel-width);
    }
    :host(:not([open])) .panel-button {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
      margin: var(--space-xs);
      background: var(--panel-button-bg);
      color: var(--panel-button-color);

      &:hover {
        background: var(--panel-button-bg-hover);
      }
    }
    @media (width < 800px) {
      :host([open]) {
        width: 0;

        & .chats-panel {
          left: 0;
        }
      }
      .chats-panel {
        position: absolute;
        top: 0;
        left: calc(var(--panel-width) * -1.2);
        z-index: 1;
        box-shadow: var(--panel-shadow);
        transition: left 0.3s ease;
      }
    }
    *:focus-visible {
      outline: var(--focus-outline) var(--primary);
    }
    .animation {
      animation: 0.3s ease;
    }
    svg {
      fill: currentColor;
      width: 100%;
    }
    button {
      font-size: 1rem;
      border-radius: calc(var(--border-radius) / 2);
      outline: var(--focus-outline) transparent;
      transition: outline 0.3s ease;

      &:not(:disabled) {
        cursor: pointer;
      }
    }
    h2 {
      margin: var(--space-md) 0 0 0;
      padding: var(--space-xs) var(--space-md);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .buttons {
      display: flex;
      justify-content: space-between;
      padding: var(--space-xs);
      position: sticky;
      top: 0;
      background: var(--panel-bg);
      box-shadow: 0 var(--space-xs) var(--space-xs) var(--panel-bg);
    }
    .chats-panel {
      width: var(--panel-width);
      height: 100%;
      background: var(--panel-bg);
      font-family:
        'Segoe UI',
        -apple-system,
        BlinkMacSystemFont,
        Roboto,
        'Helvetica Neue',
        sans-serif;
      overflow: auto;
    }
    .chats {
      margin: 0;
      padding: 0;
      font-size: 0.9rem;
    }
    .chat-title {
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .chat-entry {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-xxs) var(--space-xxs) var(--space-xxs) var(--space-xs);
      margin: 0 var(--space-xs);
      border-radius: calc(var(--border-radius) / 2);
      color: var(--text-color);
      text-decoration: none;
      background: var(--chat-entry-bg);

      & .icon-button {
        flex: 0 0 auto;
        padding: var(--space-xxs);
        width: 28px;
        height: 28px;
      }

      &:hover {
        background: var(--chat-entry-bg-hover);
      }

      &:not(:focus):not(:hover) .icon-button:not(:focus) {
        opacity: 0;
      }
    }
    .message {
      padding: var(--space-xs) var(--space-md);
    }
    .error {
      color: var(--error-color);
    }
    .icon-button {
      width: 36px;
      height: 36px;
      padding: var(--space-xs);
      background: none;
      border: none;
      background: var(--icon-button-bg);
      color: var(--icon-button-color);
      font-size: 1.5rem;
      &:hover:not(:disabled) {
        background: var(--icon-button-bg-hover);
        color: var(--icon-button-color);
      }
    }
    .loader-animation {
      position: absolute;
      width: var(--panel-width);
      height: 2px;
      overflow: hidden;
      background-color: var(--primary);
      transform: scaleX(0);
      transform-origin: center left;
      animation: cubic-bezier(0.85, 0, 0.15, 1) 2s infinite load-animation;
    }

    @keyframes load-animation {
      0% {
        transform: scaleX(0);
        transform-origin: center left;
      }
      50% {
        transform: scaleX(1);
        transform-origin: center left;
      }
      51% {
        transform: scaleX(1);
        transform-origin: center right;
      }
      100% {
        transform: scaleX(0);
        transform-origin: center right;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host,
      .chats-panel {
        transition: none;
      }
      .animation {
        animation: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'azc-history': HistoryComponent;
  }
}
