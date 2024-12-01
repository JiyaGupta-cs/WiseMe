import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const createCourseWithRoadmap = async (courseData: any) => {
  console.log("Starting course creation with roadmap...");
  try {
    const { title, prerequisites, start_date, roadmap } = courseData;

    console.log("Data extracted:", { title, prerequisites, start_date, roadmap });

    const result = await prisma.course.create({
      data: {
        title,
        prerequisites,
        startDate: new Date(start_date),
        createdById: "some-user-id", // Replace with dynamic user ID logic
        roadmap: {
          create: roadmap.map((dayData: any) => {
            console.log("Processing day data:", dayData);
            return {
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
                create: dayData.docs.map((docUrl: string) => {
                  console.log("Adding document URL:", docUrl);
                  return { url: docUrl };
                }),
              },
              quizzes: {
                create: dayData.quiz.map((quiz: any) => {
                  console.log("Adding quiz:", quiz);
                  return {
                    question: quiz.question,
                    options: quiz.options,
                    answer: quiz.answer,
                  };
                }),
              },
            };
          }),
        },
      },
    });

    console.log("Course created successfully in the database:", result);
    return result;
  } catch (error) {
    console.error("Error during course creation:", error);
    throw error;
  }
};

export async function POST(req: Request) {
  console.log("Received POST request");
  try {
    const {
      course,
      start_date,
      learning_duration,
      daily_hours_weekdays,
      daily_hours_weekends,
    } = await req.json();

    console.log("Parsed request JSON:", {
      course,
      start_date,
      learning_duration,
      daily_hours_weekdays,
      daily_hours_weekends,
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    console.log("GoogleGenerativeAI initialized");

    const schema = {
      description: "Personalized learning roadmap for a course",
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, nullable: false },
        prerequisites: { type: SchemaType.STRING, nullable: false },
        start_date: { type: SchemaType.STRING, nullable: false },
        roadmap: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              day: { type: SchemaType.NUMBER, nullable: false },
              topic: { type: SchemaType.STRING, nullable: false },
              video: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING, nullable: false },
                  url: { type: SchemaType.STRING, nullable: false },
                },
              },
              docs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              quiz: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    question: { type: SchemaType.STRING, nullable: false },
                    options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    answer: { type: SchemaType.STRING, nullable: false },
                  },
                },
              },
              startTime: { type: SchemaType.STRING, nullable: false },
              endTime: { type: SchemaType.STRING, nullable: false },
            },
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

    console.log("Generative AI model initialized with schema");

    const prompt = `
    Generate a personalized ${course} learning roadmap based on the provided input.
    - Start date: ${start_date}
    - Duration: ${learning_duration} days
    - Weekday hours: ${daily_hours_weekdays}
    - Weekend hours: ${daily_hours_weekends}
    `;
    console.log("Prompt for Generative AI:", prompt);

    const result = await model.generateContent(prompt);
    console.log("Generative AI response received");

    const output = await result.response.text();
    console.log("Parsed AI response:", output);

    createCourseWithRoadmap(JSON.parse(output))
      .then((course) => {
        console.log("Course successfully created:", course);
      })
      .catch((error) => {
        console.error("Error during course creation:", error);
      });

    return new Response(JSON.stringify({ output }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  console.log("Received GET request");
  return new Response(JSON.stringify({ message: "generate" }), {
    headers: { "Content-Type": "application/json" },
  });
}
