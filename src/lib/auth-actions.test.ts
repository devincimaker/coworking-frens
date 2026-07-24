import { beforeEach, describe, expect, it, vi } from "vitest";

const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  signOut: signOutMock,
}));

import { signOutToHome } from "./auth-actions";

describe("signOutToHome", () => {
  beforeEach(() => {
    signOutMock.mockReset();
  });

  it("redirects signed-out users to the public home page", async () => {
    signOutMock.mockResolvedValue(undefined);

    await signOutToHome();

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
