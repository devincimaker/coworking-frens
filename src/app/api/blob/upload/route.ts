import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const UPLOAD_FOLDERS = new Set(["avatars", "places", "feedback"]);

function parseClientPayload(payload: string | null) {
  if (!payload) return { folder: "avatars" };
  const parsed = JSON.parse(payload) as { folder?: unknown };
  const folder = typeof parsed.folder === "string" ? parsed.folder : "avatars";
  if (!UPLOAD_FOLDERS.has(folder)) throw new Error("Invalid upload folder");
  return { folder };
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  const isTokenRequest = body.type === "blob.generate-client-token";
  const session = isTokenRequest ? await auth() : null;
  const userId = session?.user?.id;

  if (isTokenRequest && !userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (isTokenRequest && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not configured" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!userId) throw new Error("Not authenticated");

        const { folder } = parseClientPayload(clientPayload);
        if (!pathname.startsWith(`${folder}/`)) throw new Error("Invalid upload path");

        return {
          allowedContentTypes: ALLOWED_IMAGE_TYPES,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          tokenPayload: JSON.stringify({
            userId,
            folder,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("blob upload completed", blob.url, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
