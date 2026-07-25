import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const requireUserMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/auth", () => ({
  requireUser: requireUserMock,
  requireOnboardedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

import { acceptTerms, completeOnboarding } from "./actions";
import { TERMS_REQUIRED_MESSAGE, TERMS_VERSION } from "./terms";

const idle = { status: "idle" as const, message: "" };

function profileForm(extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("name", "Ana Suarez");
  form.set("username", "ana");
  form.set("bio", "Mate y foco.");
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ id: "u1" });
  prismaMock.user.findUnique.mockResolvedValue(null); // username is free
  prismaMock.user.update.mockResolvedValue({});
});

describe("acceptTerms", () => {
  it("stores the timestamp and version when the box is checked", async () => {
    const form = new FormData();
    form.set("acceptTerms", "on");
    form.set("callbackUrl", "/host");

    await acceptTerms(idle, form);

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    const { where, data } = prismaMock.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: "u1" });
    expect(data.termsVersion).toBe(TERMS_VERSION);
    expect(data.termsAcceptedAt).toBeInstanceOf(Date);
    expect(redirectMock).toHaveBeenCalledWith("/host");
  });

  it("records nothing when the box is unchecked", async () => {
    const result = await acceptTerms(idle, new FormData());

    expect(result).toEqual({ status: "error", message: TERMS_REQUIRED_MESSAGE });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("sends an off-site callbackUrl to the default destination", async () => {
    const form = new FormData();
    form.set("acceptTerms", "on");
    form.set("callbackUrl", "//evil.example.com");

    await acceptTerms(idle, form);

    expect(redirectMock).toHaveBeenCalledWith("/juntadas");
  });
});

describe("completeOnboarding", () => {
  it("stamps acceptance together with the profile", async () => {
    await completeOnboarding(idle, profileForm({ acceptTerms: "on" }));

    const { data } = prismaMock.user.update.mock.calls[0][0];
    expect(data.onboardedAt).toBeInstanceOf(Date);
    expect(data.termsAcceptedAt).toBeInstanceOf(Date);
    expect(data.termsVersion).toBe(TERMS_VERSION);
  });

  it("refuses to create a profile without acceptance", async () => {
    const result = await completeOnboarding(idle, profileForm());

    expect(result).toEqual({ status: "error", message: TERMS_REQUIRED_MESSAGE });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
