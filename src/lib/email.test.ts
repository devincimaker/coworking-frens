import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  batchSend: vi.fn(),
  emailsSend: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    batch = { send: mocks.batchSend };
    emails = { send: mocks.emailsSend };
  },
}));

import { sendEmail } from "./email";

const ATTACHMENT = { filename: "juntada.ics", content: "BEGIN:VCALENDAR\r\n" };

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.batchSend.mockResolvedValue({ error: null });
    mocks.emailsSend.mockResolvedValue({ error: null });
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "hola@frens.example");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends nothing when there is no one to send to", async () => {
    await sendEmail([], "Asunto", "Cuerpo");
    expect(mocks.batchSend).not.toHaveBeenCalled();
    expect(mocks.emailsSend).not.toHaveBeenCalled();
  });

  describe("without an API key", () => {
    beforeEach(() => vi.stubEnv("RESEND_API_KEY", ""));

    it("logs instead of sending, and does not throw", async () => {
      await expect(sendEmail(["a@example.com"], "Asunto", "Cuerpo")).resolves.toBeUndefined();
      expect(mocks.batchSend).not.toHaveBeenCalled();
      expect(mocks.emailsSend).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("a@example.com"));
    });

    it("names the attachment in the log so dev can see it was built", async () => {
      await sendEmail(["a@example.com"], "Asunto", "Cuerpo", { attachments: [ATTACHMENT] });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("juntada.ics"));
    });
  });

  describe("plain mail", () => {
    it("goes out as one batch, never one at a time", async () => {
      await sendEmail(["a@example.com", "b@example.com"], "Asunto", "Cuerpo");
      expect(mocks.batchSend).toHaveBeenCalledTimes(1);
      expect(mocks.batchSend).toHaveBeenCalledWith([
        { from: "hola@frens.example", to: "a@example.com", subject: "Asunto", text: "Cuerpo" },
        { from: "hola@frens.example", to: "b@example.com", subject: "Asunto", text: "Cuerpo" },
      ]);
      expect(mocks.emailsSend).not.toHaveBeenCalled();
    });

    it("drops empty addresses before sending", async () => {
      await sendEmail(["a@example.com", ""], "Asunto", "Cuerpo");
      expect(mocks.batchSend).toHaveBeenCalledWith([expect.objectContaining({ to: "a@example.com" })]);
    });

    it("treats an empty attachment list as no attachments", async () => {
      await sendEmail(["a@example.com"], "Asunto", "Cuerpo", { attachments: [] });
      expect(mocks.batchSend).toHaveBeenCalledTimes(1);
      expect(mocks.emailsSend).not.toHaveBeenCalled();
    });
  });

  // Resend's batch endpoint silently has no attachment field — its own type is
  // Omit<CreateEmailOptions, "attachments">. Sending one that way would deliver a
  // mail with the file quietly missing, which is the whole reason for the branch.
  describe("mail with an attachment", () => {
    it("goes one send at a time, never through batch", async () => {
      await sendEmail(["a@example.com", "b@example.com"], "Asunto", "Cuerpo", {
        attachments: [ATTACHMENT],
      });
      expect(mocks.batchSend).not.toHaveBeenCalled();
      expect(mocks.emailsSend).toHaveBeenCalledTimes(2);
    });

    it("hands Resend the filename and contents unchanged", async () => {
      await sendEmail(["a@example.com"], "Asunto", "Cuerpo", { attachments: [ATTACHMENT] });
      expect(mocks.emailsSend).toHaveBeenCalledWith({
        from: "hola@frens.example",
        to: "a@example.com",
        subject: "Asunto",
        text: "Cuerpo",
        attachments: [ATTACHMENT],
      });
    });
  });

  describe("when something goes wrong", () => {
    it("refuses to send without a from address", async () => {
      vi.stubEnv("EMAIL_FROM", "");
      await sendEmail(["a@example.com"], "Asunto", "Cuerpo");
      expect(mocks.batchSend).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("throws the missing-from error only when asked to", async () => {
      vi.stubEnv("EMAIL_FROM", "");
      await expect(
        sendEmail(["a@example.com"], "Asunto", "Cuerpo", { throwOnError: true })
      ).rejects.toThrow("EMAIL_FROM");
    });

    // Notifications are a side effect of an action that already succeeded, so a
    // failed send must not take the caller down with it.
    it("swallows a batch failure by default and rethrows on request", async () => {
      mocks.batchSend.mockResolvedValue({ error: { name: "api_error", message: "nope" } });
      await expect(sendEmail(["a@example.com"], "Asunto", "Cuerpo")).resolves.toBeUndefined();
      await expect(
        sendEmail(["a@example.com"], "Asunto", "Cuerpo", { throwOnError: true })
      ).rejects.toThrow("api_error: nope");
    });

    it("surfaces a failure on the attachment path too", async () => {
      mocks.emailsSend.mockResolvedValue({ error: { name: "api_error", message: "nope" } });
      await expect(
        sendEmail(["a@example.com"], "Asunto", "Cuerpo", { attachments: [ATTACHMENT] })
      ).resolves.toBeUndefined();
      await expect(
        sendEmail(["a@example.com"], "Asunto", "Cuerpo", {
          attachments: [ATTACHMENT],
          throwOnError: true,
        })
      ).rejects.toThrow("api_error: nope");
    });

    it("reports a failure even when only the second recipient fails", async () => {
      mocks.emailsSend
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { name: "api_error", message: "nope" } });
      await expect(
        sendEmail(["a@example.com", "b@example.com"], "Asunto", "Cuerpo", {
          attachments: [ATTACHMENT],
          throwOnError: true,
        })
      ).rejects.toThrow("api_error: nope");
    });

    it("swallows a thrown transport error rather than failing the action", async () => {
      mocks.batchSend.mockRejectedValue(new Error("socket hang up"));
      await expect(sendEmail(["a@example.com"], "Asunto", "Cuerpo")).resolves.toBeUndefined();
    });
  });
});
