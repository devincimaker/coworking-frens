import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  handleUpload: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@vercel/blob/client", () => ({ handleUpload: mocks.handleUpload }));

import { POST } from "@/app/api/blob/upload/route";

function tokenRequest() {
  return new Request("http://localhost/api/blob/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "blob.generate-client-token" }),
  });
}

describe("POST /api/blob/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
  });

  it("requires authentication before generating an upload token", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(tokenRequest());

    expect(response.status).toBe(401);
    expect(mocks.handleUpload).not.toHaveBeenCalled();
  });

  it("authorizes image uploads into the feedback folder with the existing size cap", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } });
    mocks.handleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      const token = await onBeforeGenerateToken(
        "feedback/pantalla.webp",
        JSON.stringify({ folder: "feedback" })
      );
      return { type: "blob.generate-client-token", clientToken: "token", token };
    });

    const response = await POST(tokenRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toEqual(
      expect.objectContaining({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        maximumSizeInBytes: 2 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ userId: "user_1", folder: "feedback" }),
      })
    );
  });

  it("rejects a feedback token when the requested path does not match its folder", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } });
    mocks.handleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      await onBeforeGenerateToken(
        "avatars/not-feedback.webp",
        JSON.stringify({ folder: "feedback" })
      );
      return {};
    });

    const response = await POST(tokenRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid upload path" });
  });
});
