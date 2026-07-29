import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUser: vi.fn(),
  createFeedback: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUser },
    feedback: { create: mocks.createFeedback },
  },
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));

import { POST } from "@/app/api/feedback/route";

const IMAGE_URL =
  "https://frens.public.blob.vercel-storage.com/feedback/pantalla-example.webp";

function feedbackRequest(body: unknown) {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Frens test browser",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FEEDBACK_TO_EMAIL = "owner@example.com";
    mocks.auth.mockResolvedValue(null);
    mocks.createFeedback.mockResolvedValue({ id: "feedback_1" });
    mocks.sendEmail.mockResolvedValue(undefined);
  });

  it("uses the database email for a signed-in user and stores a controlled image URL", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "user_1", email: "session@example.com" },
    });
    mocks.findUser.mockResolvedValue({ id: "user_1", email: "current@example.com" });

    const response = await POST(
      feedbackRequest({
        message: "  Hay algo roto.  ",
        email: "spoofed@example.com",
        imageUrl: IMAGE_URL,
        page: "/juntadas",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.createFeedback).toHaveBeenCalledWith({
      data: {
        message: "Hay algo roto.",
        email: "current@example.com",
        imageUrl: IMAGE_URL,
        page: "/juntadas",
        userAgent: "Frens test browser",
        userId: "user_1",
      },
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      ["owner@example.com"],
      "Nuevo feedback en Coworking Frens",
      expect.stringContaining(`Imagen: ${IMAGE_URL}`)
    );
  });

  it("ignores browser-supplied email and image URLs outside the feedback Blob folder", async () => {
    const response = await POST(
      feedbackRequest({
        message: "Feedback anónimo",
        email: "claimed@example.com",
        imageUrl: "https://example.com/feedback/private.png",
        page: "//example.com/not-local",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.createFeedback).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: null,
        imageUrl: null,
        page: null,
        userId: null,
      }),
    });
  });

  it("rejects a blank message before doing auth or database work", async () => {
    const response = await POST(feedbackRequest({ message: "   " }));

    expect(response.status).toBe(400);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.createFeedback).not.toHaveBeenCalled();
  });
});
