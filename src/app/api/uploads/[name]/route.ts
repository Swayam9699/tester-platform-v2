import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { apiHandler, HttpError, requireApiUser, withValidation } from "@/api/handler";
import { UPLOAD_DIR } from "@/api/storage";
import { uploadParamsSchema } from "@/validation/uploads";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** Serves locally stored screenshots (demo mode). Signed-in users only. */
export const GET = apiHandler(
  withValidation({ params: uploadParamsSchema }, async (_request, { params: { name } }) => {
    await requireApiUser();
    const bytes = await readFile(path.join(UPLOAD_DIR, name)).catch((err: NodeJS.ErrnoException) => {
      // A missing file is a 404; anything else (permissions, disk) is a real failure for apiHandler to log.
      if (err.code === "ENOENT") throw new HttpError(404, "Not found");
      throw err;
    });
    const ext = name.slice(name.lastIndexOf(".") + 1);
    return new NextResponse(bytes, { headers: { "content-type": TYPES[ext], "cache-control": "private, max-age=86400" } });
  }),
);
