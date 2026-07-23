import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env";
import { adminAuthRouter } from "./routes/admin.routes";
import { authRouter } from "./routes/auth.routes";
import { listingsRouter } from "./routes/listings.routes";
import { messagesRouter } from "./routes/messages.routes";
import { sellerRouter } from "./routes/seller.routes";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "roofstead-api" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminAuthRouter);
  app.use("/api/seller", sellerRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/messages", messagesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
