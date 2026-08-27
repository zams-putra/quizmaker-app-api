import express from "express";
import { config } from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import Quiz from "./models/quizModel.js";
import expressRateLimit from "express-rate-limit";
import getToken from "./function/getToken.js";
import { SYSTEM_PROMPT } from "./function/systemPrompt.js";

config();
mongoose
  .connect(process.env.MONGO)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("Error ", err));

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: "https://zamsputra.my.id",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());



// middleware
const rateLimiter = expressRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: "Bentar sidi lagi mikir",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());


app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Jalan kok",
    status: 200,
  });
});

// app.get("/api/lagu_spotify", async (req, res) => {
//   try {
//     const token = await getToken();
//     const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
//       headers: {
//         "Authorization": `Bearer ${token}`
//       }
//     })

//     console.log("STATUS:", response.status, response);

//     if(response.status == 204 || response.status > 400) {
//       return res.status(200).json({
//         message: 'Putro sedang tidak memutar spotifynya 🗣️',
//         status: 200
//       })
//     }


//     const data = await response.json()
//     const songData = {
//       imgLagu: data.item.album.images[0]?.url,
//       artist: data.item.artists.map((artist) => artist.name).join(", "),
//       judul: data.item.name,
//       progress_ms: data.progress_ms,
//       duration_ms: data.item.duration_ms,
//       is_playing: data.is_playing,
//     }
    
//     res.status(200).json(songData)
//   } catch (err) {
//     console.log('Error', err)
//     res.status(500).json({
//       message: 'Error server lah',
//       status: 500
//     })
//   }

// });

// app.get("/api/fav_song", async (req, res) => {
//   const FAVORITE_TRACK_ID = "1ai6CZYghbvcxEGeedqXoM";
//   try {
//     const token = await getToken();

//     const response = await fetch(
//       "https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=1&offset=1",
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     if (response.status === 403 || !response.ok) {
//       console.log("Top tracks gagal, kudu premium yaelah fallback ke yg hardcode");

//       const fallbackResponse = await fetch(
//         `https://api.spotify.com/v1/tracks/${FAVORITE_TRACK_ID}`,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );
//       console.log("Fallback status:", fallbackResponse.status);
//       console.log("Fallback Track ID:", FAVORITE_TRACK_ID);
//       const fallbackText = await fallbackResponse.text(); // baca raw dulu
//       console.log("Fallback response:", fallbackText);

//       if (!fallbackResponse.ok) {
//         return res.status(500).json({ message: "Gagal fetch data dari Spotify", status: 500 });
//       }

//       const fallbackData = await fallbackResponse.json();
//       return res.status(200).json({
//         artist: fallbackData.artists.map((a) => a.name).join(", "),
//         judul: fallbackData.name,
//         imgLagu: fallbackData.album.images[0]?.url,
//         message: "Butuh Spotify Premium buat top tracknya jadi dapetnya yg hardcode aja",
//         status: 200
//       });
//     }

//     if (!response.ok) {
//       console.log(await response.text()); // debug
//       return res.status(500).json({
//         message: "Gagal fetch data dari Spotify",
//         status: 500,
//       });
//     }

//     const data = await response.json();
//     const lagu = data.items[0];

//     const result = {
//       artist: lagu.artists.map((a) => a.name).join(", "),
//       judul: lagu.name,
//       imgLagu: lagu.album.images[0]?.url,
//     };

//     res.status(200).json(result);
//   } catch (err) {
//     console.log("Error", err);
//     res.status(500).json({
//       message: "Error server lah",
//       status: 500,
//     });
//   }
// });

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


async function fetchGemini(url, options, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 503) {
      return response;
    }

    if (attempt < retries) {
      const delay = 2000 * 2 ** attempt;

      console.log(
        `Gemini 503. Retry ${attempt + 1}/${retries} dalam ${delay}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error("Gemini unavailable after retries");
}

app.post("/api/chat", rateLimiter, async (req, res) => {
  const { messages } = req.body;

  const limitedMessages = messages.slice(-6);

  try {
    const response = await fetchGemini(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },

      contents: limitedMessages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      })),

      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.6,
        topP: 0.8,
        topK: 40
      }
    })
  }
);
    console.log(response)

    const data = await response.json()
    console.log("respon:", JSON.stringify(data)) 
    console.log("Finish Reason:", data.candidates?.[0]?.finishReason);
    
    if (data.error) {
  console.log("Gemini Error:", data.error);

    if (data.error.code === 429) {
      return res.status(429).json({
        reply: "Abis quota gw cug"
      });
    }

    if (data.error.code === 503) {
      return res.status(503).json({
        reply: "Gemini lagi rame. Cobalagi."
      });
    }

  return res.status(data.error.code || 500).json({
    reply: "Gemini API error."
  });
}

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Something went wrong."
    res.status(200).json({ reply })

  } catch (err) {
    console.log("Error", err)
    res.status(500).json({ message: "Error server lah", status: 500 })
  }
})




const port = process.env.PORT || 5000;

app.listen(port, () => console.log("Web started on http://localhost:5000"));
