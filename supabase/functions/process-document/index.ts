import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OpenAIEmbeddings } from "https://esm.sh/@langchain/openai";
import { SupabaseVectorStore } from "https://esm.sh/@langchain/community/vectorstores/supabase";

console.log("Function 'process-document' is running!");

// Store the content directly in the code
const samInfoContent = `
Main Faqs

What is Sam's childhood background?
Samuel Lee was born in Vancouver, Canada on April 23, 1999. He moved to the United States when he was less than a year old. He lived in various locations in the United States, such as southern california, northern virginia, and parts of massachusetts (near the boston area). He spent most of his life moving locations every 2-3 years for various reasons, and now considers Centreville, Virginia his home. He spent his first year of high school (grade 9) at Lexington High School in Lexington, massachusetts, and the remaining 3 years of high school at Centreville High school in Clifton, Virginia.

What is Sam's education background?
Sam did his undergraduate degree at McMaster University, where he attended the Bachelors of Health Sciences Honours program. After finishing his bachelors degree in 2021, he did a bootcamp at Codesmith in 2023, and started his Masters of Computer and Information Technology at University of Pennsylvania on January of 2024. He is currently doing his masters and is estimated to finish it in December of 2025.

What is Sam's work history?
Sam has worked as a private tutor since the 6th grade, teaching students various subjects such as English, history, chemistry, physics, math (up to Calculus 2), test prep (SAT, ACT, IELTS, TOEFL), and much more. He also does consulting for university admissions for both Canadian and US students. After graduating from his undergraduate degree, Sam worked as a medical scribe as well for 6 months in 2022, and after doing his bootcamp, he has worked as a fellow and lead fellow at Codesmith. He had the opportunity to work as a Production Engineer Fellow for Meta in the summer of 2024, and has also worked as a software engineer at a startup called Sports Pulse. He is now currently working as a software engineer at Starbourne Labs, and is also continuing to tutor students and is an instructor for Codesmith as well.

What is Sam's favorite food?
Sam's favorite food is probably Korean food. Sam is ethnically Korean, and he has grown up eating Korean food all his life. He had initially disliked Korean food after high school because he had eaten it so much and was sick of it, but after being away from home for a long time, he has acquired a taste for food that reminds him of home. Food like Kimchi, K-barbeque, and Soondubu are regular foods that Sam looks to eat.

What sports does Sam like?
Sam grew up playing soccer and was on a scholarship to play when he was younger. However, as his family could not financially support a possible sports career, his parents forced him to quit soccer and focus on academics. Sam still enjoys watching and playing soccer to this day, although he does not play regularly anymore. Outside of soccer, Sam also swims, does long distance running, and is currently training to finish another marathon in March 2025 at a quicker time of around 4:30 hours and wants to do an Ironman in 2026.

What are Sam's hobbies?
Sam enjoys reading books in his free time. His favorite book (or most memorable) is Living a Life of Fire by Reinhard Bonnke. He also enjoys classics like The Republic by Plato and Meditations by Marcus Aurelius. Sam also occassionally plays video games with his friends, specifically only League of Legends. He enjoys chess, and also likes to listen to music in his spare time. Finally, Sam enjoys running, and continues to train for long distance races.
`;

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
      },
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey || !openaiApiKey) {
      throw new Error("Missing required environment variables");
    }

    // Initialize OpenAI embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: openaiApiKey,
      model: "text-embedding-3-small",
    });

    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Initialize vector store
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabaseClient,
      tableName: "documents",
      queryName: "match_documents",
    });

    // Split the content into chunks
    const chunks = samInfoContent.split(/(?=\n\s*\n)/)  // Split on double newlines
      .map(chunk => chunk.trim())  // Trim whitespace
      .filter(chunk => chunk.length > 0)  // Remove empty chunks
      .map(chunk => {
        // Further split if chunk is too large (over 1000 characters)
        if (chunk.length > 1000) {
          return chunk.split(/(?<=\.|\?|\!)\s+/)  // Split on sentence boundaries
            .filter(sentence => sentence.length > 0);
        }
        return [chunk];
      })
      .flat();  // Flatten the array of chunks

    console.log(`Split content into ${chunks.length} chunks`);

    // Prepare documents for vectorization
    const documents = chunks.map((chunk, index) => ({
      pageContent: chunk.trim(),
      metadata: { 
        source: "sam-info.txt",
        chunk: index,
        length: chunk.length
      }
    }));

    // Generate numeric IDs starting from current timestamp
    const baseId = Date.now();
    const ids = documents.map((_, index) => baseId + index);

    // Add documents to the vector store
    await vectorStore.addDocuments(documents, { ids });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${documents.length} chunks of text`,
        chunks: documents.length,
        firstChunk: documents[0].pageContent.substring(0, 100) + "..." // Preview of first chunk
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (err) {
    console.error("Error processing request:", err);
    return new Response(
      JSON.stringify({ 
        error: err.message,
        stack: err.stack // Including stack trace for debugging
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
