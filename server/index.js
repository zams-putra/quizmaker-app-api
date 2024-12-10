import express from "express";
import { config } from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import Quiz from "./models/quizModel.js";
import expressRateLimit from "express-rate-limit";
import getToken from "./function/getToken.js";

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
  max: 30,
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

app.get("/api/lagu_spotify", async (req, res) => {
  try {
    const token = await getToken();

    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    if(response.status == 204 || response.status > 400) {
      return res.status(200).json({
        message: 'Putro tidak lagi memutar spotifynya 🗣️',
        status: 200
      })
    }


    const data = await response.json()
    const songData = {
      imgLagu: data.item.album.images[0]?.url,
      artist: data.item.artists.map((artist) => artist.name).join(", "),
      judul: data.item.name
    }
    
    res.status(200).json(songData)
  } catch (err) {
    console.log('Error', err)
    res.status(500).json({
      message: 'Error server lah',
      status: 500
    })
  }

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

app.use(rateLimiter);

app.post("/api/create-quiz", async (req, res) => {
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

const port = process.env.PORT || 5000;

app.listen(port, () => console.log("Web started on http://localhost:5000"));
