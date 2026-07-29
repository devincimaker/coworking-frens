import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const uploadOptimizedImageMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/image-upload-field", () => ({
  uploadOptimizedImage: uploadOptimizedImageMock,
}));

import { FeedbackWidget } from "@/components/feedback-widget";

const IMAGE_URL =
  "https://frens.public.blob.vercel-storage.com/feedback/pantalla-example.webp";

describe("FeedbackWidget", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    uploadOptimizedImageMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("rests close to the mobile nav and keeps the panel within the viewport", () => {
    const { container } = render(<FeedbackWidget aboveBottomNav />);
    const shell = container.firstElementChild;

    expect(shell).toHaveClass("bottom-[calc(var(--bottom-nav-h)+0.5rem)]");

    fireEvent.click(screen.getByRole("button", { name: "Feedback" }));

    expect(screen.getByLabelText("Enviar feedback")).toHaveClass(
      "max-h-[calc(100dvh-var(--bottom-nav-h)-5.25rem)]"
    );
  });

  it("does not ask for an email", () => {
    render(<FeedbackWidget />);

    fireEvent.click(screen.getByRole("button", { name: "Feedback" }));

    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/email opcional/i)).not.toBeInTheDocument();
  });

  it("uploads one image and includes its URL in the feedback payload", async () => {
    uploadOptimizedImageMock.mockImplementation(
      async ({ onProgress }: { onProgress?: (progress: number) => void }) => {
        onProgress?.(100);
        return IMAGE_URL;
      }
    );
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const { container } = render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Feedback" }));

    const file = new File(["screenshot"], "pantalla.png", { type: "image/png" });
    const input = container.querySelector<HTMLInputElement>('#feedback-image');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });

    await screen.findByAltText("Captura adjunta al feedback");
    expect(uploadOptimizedImageMock).toHaveBeenCalledWith(
      expect.objectContaining({ file, folder: "feedback", variant: "place" })
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Qué mejorarías" }), {
      target: { value: "La tarjeta se corta en el teléfono." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar feedback" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(request.body));

    expect(body).toEqual({
      message: "La tarjeta se corta en el teléfono.",
      imageUrl: IMAGE_URL,
      page: "/",
    });
    expect(body).not.toHaveProperty("email");
    expect(await screen.findByText("Gracias, lo recibimos.")).toBeInTheDocument();
  });

  it("shows a recoverable upload error and keeps the form available", async () => {
    uploadOptimizedImageMock.mockRejectedValue(new Error("Usá una imagen de menos de 12 MB."));

    const { container } = render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Feedback" }));
    const input = container.querySelector<HTMLInputElement>('#feedback-image');
    fireEvent.change(input!, {
      target: { files: [new File(["large"], "large.png", { type: "image/png" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usá una imagen de menos de 12 MB."
    );
    expect(screen.getByRole("button", { name: "Enviar feedback" })).toBeEnabled();
  });
});
