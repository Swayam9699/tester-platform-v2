import { z } from "zod";

/** Route params of GET /api/uploads/[name]: a stored screenshot's file name. */
export const uploadParamsSchema = z.object({
  name: z.string().regex(/^[0-9a-f-]{36}\.(png|jpg|webp)$/, "Not found"),
});
