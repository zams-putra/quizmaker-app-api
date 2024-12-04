import express from "express";
import { config } from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import Quiz from "./models/quizModel.js";
import expressRateLimit from "express-rate-limit";

config();
mongoose
  .connect(process.env.MONGO)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("Error ", err));

const app = express();

app.set("trust proxy", 1);

// middleware
const rateLimiter = expressRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: "Too many req",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Jalan kok",
    status: 200,
  });
});

app.post("/api/create-quiz", rateLimiter, async (req, res) => {
  const { id_quiz, quizes } = req.body;
  const quiz = new Quiz({
    id_quiz,
    quizes,
  });
  await quiz.save();

  res.status(201).json({
    message: "New data",
    status: 201,
  });
});

app.get("/api/answer/:id_quiz", async (req, res) => {
  const { id_quiz } = req.params;
  const data = await Quiz.findOne({ id_quiz });
  // console.log(data);
  res.status(200).json({
    message: "Get your data",
    status: 200,
    quiz: data,
  });
});

const port = process.env.PORT || 5000;

app.listen(port, () => console.log("Web started on http://localhost:5000"));
