import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PostgresStore = pgSession(session);

app.use(
  session({
    store: new PostgresStore({ pool }),
    secret: process.env.SESSION_SECRET || "peace-power-session-secret-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Same-site by default; frontend and API are on same domain
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.use("/api", router);

export default app;
