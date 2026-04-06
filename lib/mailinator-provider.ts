import { setTimeout as delay } from 'node:timers/promises';
import {
  GetInboxRequest,
  GetMessageLinksRequest,
  GetMessageRequest,
  MailinatorClient,
  Message,
  Sort,
} from 'mailinator-client';
import {
  getMailinatorEnv,
  getOptionalBooleanEnv,
  getOptionalNonNegativeIntEnv,
  getOptionalPositiveIntEnv,
} from './env';

const DEFAULT_POLL_INTERVAL_MS = 5000;

function envDebugEnabled(): boolean {
  return getOptionalBooleanEnv('MAILINATOR_DEBUG') ?? false;
}

/** Options for {@link MailinatorInbox.getLastMessage} / {@link MailinatorInbox.getLastFeathrOtp}. */
export interface MailinatorPollOptions {
  /**
   * Wait this long before the first inbox request so you don’t immediately read the
   * previous “newest” message while the new OTP is still sending.
   * Defaults to `MAILINATOR_POLL_START_DELAY_MS` env, or `0`.
   */
  pollStartDelayMs?: number;
  /**
   * Only accept a message whose Mailinator `time` (Unix **seconds**) is **strictly greater** than this.
   * Set with {@link mailinatorClockSeconds} immediately **before** the action that sends the email
   * (optionally minus a few seconds for clock skew).
   */
  messageMinUnixSeconds?: number;
  /**
   * If the inbox’s newest message still has this id, keep polling (it’s the pre-trigger email).
   * Capture with {@link MailinatorInbox.debugPeekInbox} → `newestMessageId` before you submit login.
   */
  excludeMessageId?: string;
}

/** Unix time in seconds (aligns with Mailinator message `time` field). */
export function mailinatorClockSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** One-off inbox snapshot for troubleshooting (no secrets). */
export interface MailinatorInboxPeek {
  domain: string;
  inbox: string;
  inboxHttpStatus: number;
  messageCount: number;
  newestMessageId?: string;
  newestSubject?: string;
  /** When inbox call fails or returns no result payload. */
  hint?: string;
}

export interface MailinatorInboxOptions {
  /** API token from the Mailinator dashboard — never log this value. */
  apiToken: string;
  /** Domain only (the part after `@`), e.g. `your-domain.testinator.com`. */
  domain: string;
  /** Local part only — not a full address. */
  inbox: string;
  /** Delay between inbox polls when no message yet (default 5000). */
  pollIntervalMs?: number;
  /** Log polls to stdout — never includes the API token. */
  debug?: boolean;
}

export interface FeathrOtpEmail {
  message: Message;
  otp: string;
}

/**
 * Thin wrapper around `mailinator-client` for one inbox: poll until a message exists,
 * then fetch full {@link Message} body or link list. Tests should import this module only —
 * not `mailinator-client` directly.
 *
 * **Debugging:** set `MAILINATOR_DEBUG=true` (or `1`) to log each poll (status, message count,
 * subject preview). Set `MAILINATOR_POLL_INTERVAL_MS` (e.g. `8000`) to slow polling when
 * delivery is slow. Call {@link MailinatorInbox.debugPeekInbox} from a test to see the
 * current inbox without waiting.
 */
export class MailinatorInbox {
  private readonly client: MailinatorClient;

  private readonly domain: string;

  private readonly inbox: string;

  private readonly pollIntervalMs: number;

  private readonly debug: boolean;

  constructor(options: MailinatorInboxOptions) {
    this.client = new MailinatorClient(options.apiToken);
    this.domain = options.domain;
    this.inbox = options.inbox;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.debug = options.debug ?? envDebugEnabled();
  }

  /**
   * Build from env: `MAILINATOR_API_TOKEN`, `MAILINATOR_DOMAIN`, optional
   * `MAILINATOR_DEBUG`, `MAILINATOR_POLL_INTERVAL_MS`.
   */
  static fromEnv(inboxLocalPart: string, overrides?: Partial<Pick<MailinatorInboxOptions, 'pollIntervalMs' | 'debug'>>): MailinatorInbox {
    const { apiToken, domain, debug: envDebug, pollIntervalMs: envPollIntervalMs } = getMailinatorEnv();
    const pollIntervalMs =
      overrides?.pollIntervalMs ?? envPollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const debug = overrides?.debug ?? envDebug;
    return new MailinatorInbox({ apiToken, domain, inbox: inboxLocalPart, pollIntervalMs, debug });
  }

  get inboxId(): string {
    return this.inbox;
  }

  get domainName(): string {
    return this.domain;
  }

  /** Full disposable address for typing into your app: `local@${MAILINATOR_DOMAIN}`. */
  get emailAddress(): string {
    return `${this.inbox}@${this.domain}`;
  }

  /**
   * Single inbox read — no waiting. Use in tests or REPL to verify API + address
   * (e.g. “do we see 0 messages because nothing arrived yet, or 401?”).
   */
  async debugPeekInbox(): Promise<MailinatorInboxPeek> {
    const base: Pick<MailinatorInboxPeek, 'domain' | 'inbox'> = {
      domain: this.domain,
      inbox: this.inbox,
    };

    const inboxRes = await this.client.request(
      new GetInboxRequest(this.domain, this.inbox, 0, 1, Sort.DESC)
    );

    const status = inboxRes.statusCode;
    if (status !== 200 || inboxRes.result == null) {
      return {
        ...base,
        inboxHttpStatus: status,
        messageCount: 0,
        hint:
          status === 401 || status === 403
            ? 'Check MAILINATOR_API_TOKEN (unauthorized).'
            : status !== 200
              ? `Unexpected HTTP status from inbox API (${status}).`
              : 'Empty or null inbox response body.',
      };
    }

    const msgs = inboxRes.result.msgs ?? [];
    const first = msgs[0];
    return {
      ...base,
      inboxHttpStatus: status,
      messageCount: msgs.length,
      newestMessageId: first?.id,
      newestSubject: first?.subject,
    };
  }

  /**
   * Polls the inbox (newest first) until an acceptable message exists, then loads the full body.
   * Use {@link MailinatorPollOptions} to avoid returning an **older** OTP still sitting in the inbox.
   */
  async getLastMessage(maxTimeoutMs: number, options?: MailinatorPollOptions): Promise<Message> {
    const started = Date.now();
    const deadline = started + maxTimeoutMs;

    const pollStartDelayMs =
      options?.pollStartDelayMs ?? getOptionalNonNegativeIntEnv('MAILINATOR_POLL_START_DELAY_MS') ?? 0;
    if (pollStartDelayMs > 0) {
      this.logDebug('poll: start delay before first inbox read', { pollStartDelayMs });
      await delay(pollStartDelayMs);
    }

    let poll = 0;

    while (Date.now() < deadline) {
      poll += 1;
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, deadline - Date.now());

      const inboxRes = await this.client.request(
        new GetInboxRequest(this.domain, this.inbox, 0, 1, Sort.DESC)
      );

      if (inboxRes.statusCode !== 200 || inboxRes.result == null) {
        this.logDebug('poll: inbox request not ready', {
          poll,
          httpStatus: inboxRes.statusCode,
          hasResult: inboxRes.result != null,
          elapsedMs: elapsed,
          remainingMs: remaining,
          email: this.emailAddress,
        });
        await delay(this.pollIntervalMs);
        continue;
      }

      const msgs = inboxRes.result.msgs;
      const count = msgs?.length ?? 0;

      if (count === 0) {
        this.logDebug('poll: inbox empty, will retry', {
          poll,
          elapsedMs: elapsed,
          remainingMs: remaining,
          pollIntervalMs: this.pollIntervalMs,
          email: this.emailAddress,
        });
        await delay(this.pollIntervalMs);
        continue;
      }

      const head = msgs[0];
      const messageId = head.id;
      const headTime = head.time;

      if (options?.excludeMessageId && messageId === options.excludeMessageId) {
        this.logDebug('poll: skipping — newest id still matches excludeMessageId (waiting for new mail)', {
          messageId,
          excludeMessageId: options.excludeMessageId,
        });
        await delay(this.pollIntervalMs);
        continue;
      }

      if (
        options?.messageMinUnixSeconds != null &&
        typeof headTime === 'number' &&
        headTime <= options.messageMinUnixSeconds
      ) {
        this.logDebug('poll: skipping — message time not after baseline (stale inbox head)', {
          messageTime: headTime,
          messageMinUnixSeconds: options.messageMinUnixSeconds,
          messageId,
        });
        await delay(this.pollIntervalMs);
        continue;
      }

      const subjectPreview = head.subject?.slice(0, 120);

      this.logDebug('poll: message(s) in inbox, fetching full body', {
        poll,
        messageId,
        subjectPreview,
        email: this.emailAddress,
      });

      const msgRes = await this.client.request(new GetMessageRequest(this.domain, messageId));

      if (msgRes.statusCode === 200 && msgRes.result != null) {
        const textLen = msgRes.result.text?.length ?? 0;
        this.logDebug('poll: full message loaded', {
          messageId,
          textLength: textLen,
          subject: msgRes.result.subject?.slice(0, 120),
        });
        return msgRes.result;
      }

      this.logDebug('poll: GetMessage failed, retrying', {
        poll,
        httpStatus: msgRes.statusCode,
        hasResult: msgRes.result != null,
        messageId,
      });

      await delay(this.pollIntervalMs);
    }

    throw new Error(
      `Mailinator: no matching message within ${maxTimeoutMs}ms (domain=${this.domain}, inbox=${this.inbox}). ` +
        `Try MAILINATOR_DEBUG=true, MAILINATOR_POLL_START_DELAY_MS, excludeMessageId / messageMinUnixSeconds, or increase maxTimeoutMs.`
    );
  }

  /**
   * Waits for the newest message, then returns extracted links (e.g. password reset URLs).
   */
  async getLastMessageLinks(maxTimeoutMs: number, options?: MailinatorPollOptions): Promise<string[]> {
    const message = await this.getLastMessage(maxTimeoutMs, options);
    const linksRes = await this.client.request(
      new GetMessageLinksRequest(this.domain, message.id)
    );

    if (linksRes.statusCode !== 200 || linksRes.result == null) {
      throw new Error(
        `Mailinator: could not load links for message ${message.id} (domain=${this.domain}, inbox=${this.inbox}).`
      );
    }

    return linksRes.result.links ?? [];
  }

  private logDebug(message: string, meta: Record<string, unknown>): void {
    if (!this.debug) return;
    console.log(`[Mailinator] ${message}`, JSON.stringify(meta));
  }

  /**
   * Polls for the newest matching message, then returns both the full Mailinator message and
   * the parsed Feathr OTP from that exact email.
   */
  async getLastFeathrOtpEmail(maxTimeoutMs: number, options?: MailinatorPollOptions): Promise<FeathrOtpEmail> {
    const message = await this.getLastMessage(maxTimeoutMs, options);
    const otp =
      extractFeathrOtpFromEmailText(message.text ?? '') ||
      extractFeathrOtpFromEmailText(message.parts?.map((p) => p.body).join('\n') ?? '');
    if (!otp) {
      throw new Error(
        `Feathr OTP not found in message (domain=${this.domain}, inbox=${this.inbox}, messageId=${message.id}).`
      );
    }
    return { message, otp };
  }

  /**
   * Polls for the newest message, then parses Feathr’s alphanumeric OTP from the body.
   * Same format as: `Your one-time password is: 6PCW18N7` (see {@link extractFeathrOtpFromEmailText}).
   */
  async getLastFeathrOtp(maxTimeoutMs: number, options?: MailinatorPollOptions): Promise<string> {
    const { otp } = await this.getLastFeathrOtpEmail(maxTimeoutMs, options);
    return otp;
  }
}

/**
 * Feathr OTP line (plain text): `Your one-time password is: 6PCW18N7` then `--` and footer.
 * Code is alphanumeric, not digits-only.
 */
const FEATHR_OTP_PATTERN = /Your one-time password is:\s*([A-Za-z0-9]+)/i;

/**
 * Extracts the OTP token from Feathr’s email body. Returns `null` if the line is missing.
 */
export function extractFeathrOtpFromEmailText(text: string): string | null {
  const m = text.match(FEATHR_OTP_PATTERN);
  return m?.[1] ?? null;
}

export type { Message } from 'mailinator-client';
