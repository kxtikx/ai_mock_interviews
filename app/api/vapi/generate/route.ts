import { generateText } from 'ai';
import { google } from "@ai-sdk/google"
import { getRandomInterviewCover } from "@/lib/utils";
import { db } from '@/firebase/admin';
import admin from "firebase-admin";

export async function GET() {
    return Response.json({ success: true, data: 'THANK YOU!' }, { status: 200 });
}

export async function POST(request: Request) {
    const { type, role, level, techstack, amount, userid } = await request.json();

    try {
        /* --------------- 1️⃣  LLM call with strict JSON prompt ---------------- */
        const { text: raw } = await generateText({
            model: google('gemini-2.0-flash-001'),
            prompt: `Return ONLY a valid JSON array (no markdown) of interview questions, e.g.
["Question 1", 
"Question 2", 
"Question 3"].

Role: ${role}
Experience level: ${level}
Tech stack: ${techstack}
Focus (behavioural/technical): ${type}
Total questions: ${amount}

NO extra keys, slashes or asterisks — just the JSON array.`,
        });

        /* --------------- 2️⃣  Safe JSON parse with fallback ------------------- */
        let questions: string[] = [];

        try {
            const parsed = JSON.parse(raw.trim());
            if (Array.isArray(parsed)) questions = parsed;
            else throw new Error('Not an array');
        } catch {
            console.warn('  LLM did not return valid JSON. Storing raw text.');
            questions = [raw.trim()];
        }

        if (!role || !level || !techstack || !amount) {
            return Response.json({
                success: false,
                error: "Missing required fields"
            }, { status: 400 });
        }

        /* --------------- 3️⃣  Build and store interview ---------------------- */
        const interview = {
            role,
            type,
            level,
            techstack: techstack.split(','),
            amount,
            questions,
            ...(userid ? { userId: userid } : {}),     // optional
            finalized: true,
            coverImage: getRandomInterviewCover(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection("interviews").add(interview);

        return Response.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error(error);
        return Response.json({ success: false, error }, { status: 500 });
    }
}
