import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextApiRequest, NextApiResponse } from "next";

export async function POST(req: Request) {
  const {
    start_date,
    learning_duration,
    daily_hours_weekdays,
    daily_hours_weekends,
  } = await req.json();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
  You are a learning roadmap generator. Your task is to generate a well-structured JSON response for a personalized JavaScript learning roadmap. The roadmap should include day-wise content based on the given inputs.
  
  Each day's plan must include:
  1. A topic to focus on.
  2. A YouTube video link (one video per day).
  3. A link to relevant documentation.
  4. A short quiz with questions, options, and the correct answer.
  
  Here is the input:
  - **Start date**: ${start_date}
  - **Learning duration**: ${learning_duration}
  - **Daily study hours**: ${daily_hours_weekdays}
  - **Weekend study hours**: ${daily_hours_weekends}
  - **Preferred content type**: [Video, Documentation, Quiz]
  
  ### Output Format:
  Return the roadmap in the following JSON format:
  \`\`\`json
  {
  "title":"course_name in _ days",
  "prerequisites":""
    "start_date": "YYYY-MM-DD",
    "roadmap": [
      {
        "day": 1,
        "topic": "Topic Name",
        "video": {
          "title": "Video Title",
          "url": "Video URL"
        },
        "docs": ["Documentation URL"],
        "quiz": [
          {
            "question": "Quiz question",
            "options": ["Option 1", "Option 2", "Option 3"],
            "answer": "Correct Option"
          }
        ]
      },
      ...
    ]
  }
  \`\`\`
  
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const output = await response.text();
    return new Response(JSON.stringify({ output }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating content:", error);
    return new Response(JSON.stringify({ error: "Error generating content" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ message: "generate" }), {
    headers: { "Content-Type": "application/json" },
  });
}
