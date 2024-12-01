import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createRoadmap = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      // Destructure the request body
      const { title, prerequisites, start_date, roadmap } = req.body;

      // Insert the Course 
      const course = await prisma.course.create({
        data: {
          title,
          prerequisites,
          startDate: new Date(start_date), // Ensure proper date formatting
        },
      });

      // Insert the Roadmap, Videos, Docs, and Quizzes for each day
      for (const dayData of roadmap) {
        const { day, topic, video, docs, quiz, startTime, endTime } = dayData;

        // Insert the Roadmap item
        const roadmapItem = await prisma.roadmap.create({
          data: {
            day,
            topic,
            date: new Date(start_date),  // Or specific day dates
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            courseId: course.id,  // Link to the course
          },
        });

        // Insert the Video (if exists)
        if (video) {
          await prisma.video.create({
            data: {
              title: video.title,
              url: video.url,
              roadmapId: roadmapItem.id,  // Link to the roadmap item
            },
          });
        }

        // Insert the Docs
        for (const docUrl of docs) {
          await prisma.doc.create({
            data: {
              url: docUrl,
              roadmapId: roadmapItem.id,  // Link to the roadmap item
            },
          });
        }

        // Insert the Quizzes
        for (const quizItem of quiz) {
          const { question, options, answer } = quizItem;
          await prisma.quiz.create({
            data: {
              question,
              options,
              answer,
              roadmapId: roadmapItem.id,  // Link to the roadmap item
            },
          });
        }
      }

      // Return a success response
      return res.status(201).json({ message: 'Roadmap created successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create roadmap' });
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
};

export default createRoadmap;
