import { MAILINATOR_OTP_BASELINE_SKEW_SECONDS, TestTimeouts } from '../constants';
import { FeathrOtpEmail, MailinatorInbox, mailinatorClockSeconds } from '../mailinator-provider';

/**
 * Captures a fresh mailbox boundary before each OTP-triggering action, then reads only the
 * next Feathr OTP email that appears after that trigger.
 */
export type FeathrOtpWatch = {
  markOtpTrigger: () => Promise<void>;
  readNextOtp: (timeoutMs?: number) => Promise<FeathrOtpEmail>;
};

export async function createFeathrOtpWatch(inbox: MailinatorInbox): Promise<FeathrOtpWatch> {
  let nextOtpBoundary: { excludeMessageId?: string; messageMinUnixSeconds: number } | null = null;
  let lastConsumedMessageId: string | undefined;
  let lastConsumedMessageUnixSeconds: number | undefined;

  return {
    async markOtpTrigger() {
      const peekBefore = await inbox.debugPeekInbox();
      nextOtpBoundary = {
        excludeMessageId: peekBefore.newestMessageId ?? lastConsumedMessageId,
        messageMinUnixSeconds: Math.max(
          mailinatorClockSeconds() - MAILINATOR_OTP_BASELINE_SKEW_SECONDS,
          lastConsumedMessageUnixSeconds ?? Number.NEGATIVE_INFINITY
        ),
      };
    },

    async readNextOtp(timeoutMs = TestTimeouts.mailinatorOtp) {
      if (nextOtpBoundary == null) {
        throw new Error('feathr-otp-watch: call markOtpTrigger() before readNextOtp()');
      }
      const otpEmail = await inbox.getLastFeathrOtpEmail(timeoutMs, nextOtpBoundary);
      lastConsumedMessageId = otpEmail.message.id;
      if (typeof otpEmail.message.time === 'number') {
        lastConsumedMessageUnixSeconds = otpEmail.message.time;
      }
      nextOtpBoundary = null;
      return otpEmail;
    },
  };
}
