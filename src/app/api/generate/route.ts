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
  5. Start time and end time for each day of the roadmap.

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
    "title": "course_name in _ days",
    "prerequisites": "List of prerequisites for the course",
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
        ],
        "startTime": "YYYY-MM-DDTHH:MM:SSZ",
        "endTime": "YYYY-MM-DDTHH:MM:SSZ"
      },
      ...
    ]
  }
  \`\`\`

  - Ensure that each day's roadmap includes a startTime and endTime to indicate the study session times.

  ### Example:

  \`\`\`json
  {
    "title": "JavaScript Basics in 30 days",
    "prerequisites": "None",
    "start_date": "2024-12-01",
    "roadmap": [
      {
        "day": 1,
        "topic": "Introduction to JavaScript",
        "video": {
          "title": "What is JavaScript?",
          "url": "https://www.youtube.com/watch?v=xxxxx"
        },
        "docs": ["https://developer.mozilla.org/en-US/docs/Web/JavaScript"],
        "quiz": [
          {
            "question": "What is JavaScript used for?",
            "options": ["Web development", "Machine learning", "Game development"],
            "answer": "Web development"
          }
        ],
        "startTime": "2024-12-01T09:00:00Z",
        "endTime": "2024-12-01T11:00:00Z"
      },
      {
        "day": 2,
        "topic": "Variables and Data Types",
        "video": {
          "title": "Variables in JavaScript",
          "url": "https://www.youtube.com/watch?v=yyyyy"
        },
        "docs": ["https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types"],
        "quiz": [
          {
            "question": "Which of the following is not a data type in JavaScript?",
            "options": ["String", "Boolean", "Object", "Integer"],
            "answer": "Integer"
          }
        ],
        "startTime": "2024-12-02T09:00:00Z",
        "endTime": "2024-12-02T11:00:00Z"
      }
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
