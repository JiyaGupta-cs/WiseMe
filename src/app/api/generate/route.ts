import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const createCourseWithRoadmap = async (courseData: any) => {
  try {
    const { title, prerequisites, start_date, roadmap } = courseData;

    const result = await prisma.course.create({
      data: {
        title,
        prerequisites,
        startDate: new Date(start_date),
        createdById: "some-user-id",
        roadmap: {
          create: roadmap.map((dayData: any) => ({
            day: dayData.day,
            date: new Date(new Date(start_date).getTime() + (dayData.day - 1) * 24 * 60 * 60 * 1000),
            startTime: new Date(dayData.startTime),
            endTime: new Date(dayData.endTime),
            topic: dayData.topic,
            video: {
              create: {
                title: dayData.video.title,
                url: dayData.video.url,
              },
            },
            docs: {
              create: dayData.docs.map((docUrl: string) => ({
                url: docUrl,
              })),
            },
            quizzes: {
              create: dayData.quiz.map((quiz: any) => ({
                question: quiz.question,
                options: quiz.options,
                answer: quiz.answer,
              })),
            },
          })),
        },
      },
    });

    console.log("Course created successfully:", result);
    return result;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
};



export async function POST(req: Request) {
  const {
    course,
    start_date,
    learning_duration,
    daily_hours_weekdays,
    daily_hours_weekends,
  } = await req.json();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  const schema = {
    description: "Personalized learning roadmap for a course",
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
        description: "Course name with duration",
        nullable: false,
      },
      prerequisites: {
        type: SchemaType.STRING,
        description: "Prerequisites for the course",
        nullable: false,
      },
      start_date: {
        type: SchemaType.STRING,
        description: "Roadmap start date in YYYY-MM-DD format",
        nullable: false,
      },
      roadmap: {
        type: SchemaType.ARRAY,
        description: "Day-wise roadmap",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            day: {
              type: SchemaType.NUMBER,
              description: "Day number in the roadmap",
              nullable: false,
            },
            topic: {
              type: SchemaType.STRING,
              description: "Topic covered on the day",
              nullable: false,
            },
            video: {
              type: SchemaType.OBJECT,
              properties: {
                title: {
                  type: SchemaType.STRING,
                  description: "Title of the YouTube video",
                  nullable: false,
                },
                url: {
                  type: SchemaType.STRING,
                  description: "URL of the YouTube video",
                  nullable: false,
                },
              },
              required: ["title", "url"],
            },
            docs: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.STRING,
              },
              description: "Array of documentation links",
              nullable: false,
            },
            quiz: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  question: {
                    type: SchemaType.STRING,
                    description: "Quiz question",
                    nullable: false,
                  },
                  options: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.STRING,
                    },
                    description: "Quiz options",
                    nullable: false,
                  },
                  answer: {
                    type: SchemaType.STRING,
                    description: "Correct answer to the quiz",
                    nullable: false,
                  },
                },
                required: ["question", "options", "answer"],
              },
            },
            startTime: {
              type: SchemaType.STRING,
              description: "Start time in ISO 8601 format",
              nullable: false,
            },
            endTime: {
              type: SchemaType.STRING,
              description: "End time in ISO 8601 format",
              nullable: false,
            },
          },
          required: [
            "day",
            "topic",
            "video",
            "docs",
            "quiz",
            "startTime",
            "endTime",
          ],
        },
      },
    },
    required: ["title", "prerequisites", "start_date", "roadmap"],
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const prompt = `
You are a learning roadmap generator. Your task is to generate a well-structured JSON response for a personalized ${course} learning roadmap. The roadmap should include day-wise content based on the given inputs.

Each day's plan must include:
1. A topic to focus on.
2. A YouTube video link (one video per day).
3. A link to relevant documentation.
4. A short quiz with questions, options, and the correct answer.
5. Start time and end time for each day of the roadmap.

Here is the input:
- **Start date**: ${start_date}
- **Learning duration**: ${learning_duration} days
- **Daily study hours**: ${daily_hours_weekdays} hours
- **Weekend study hours**: ${daily_hours_weekends} hours
- **Preferred content type**: Video, Documentation, Quiz

Return the roadmap in the JSON format as defined in the schema.
`;

  try {
    const result = await model.generateContent(prompt);
    const output = await result.response.text();

    

    createCourseWithRoadmap(output)
      .then((course) => {
        console.log("Course created successfully:", course);
      })
      .catch((error) => {
        console.error("Error creating course:", error);
      });

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
