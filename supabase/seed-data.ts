import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Define your Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
console.log("Supabase URL:", Deno.env.get("SUPABASE_URL"));
console.log("Supabase Anon Key:", Deno.env.get("SUPABASE_ANON_KEY"));
console.log("Supabase Service Key:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Function to read the text file
const readTextFile = async (filePath: string): Promise<string> => {
  try {
    const content = await Deno.readTextFile(filePath);
    return content;
  } catch (err) {
    console.error("Error reading file:", err);
    throw err;
  }
};

// Function to get embeddings from OpenAI
const getEmbeddingFromOpenAI = async (text: string): Promise<number[]> => {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: text,
    }),
  });

  // Check if the response is OK (status 200-299)
  if (!response.ok) {
    const errorDetails = await response.json();
    console.error("OpenAI API Error:", errorDetails);
    throw new Error(`Failed to fetch embedding from OpenAI: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.data || !data.data.length || !Array.isArray(data.data[0].embedding)) {
    throw new Error("Failed to fetch embedding from OpenAI: No embedding data returned");
  }

  const embedding = data.data[0].embedding;

  if (embedding.length !== 1536) {
    throw new Error(`Unexpected embedding length: ${embedding.length}`)
  }

  return embedding;
};

// Function to insert embeddings and content into Supabase using match_documents
const insertDataToSupabase = async (content: string, embedding: number[]) => {
  try {
    const { error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_count: 5,
      filter: {}, // You can set a specific filter if needed
    });

    if (error) {
      console.error("Error inserting into Supabase using match_documents:", error);
    } else {
      console.log("Successfully inserted chunk using match_documents");
    }
  } catch (err) {
    console.error("Error executing match_documents:", err);
  }
};

// Function to process and insert data into Supabase using match_documents
const processAndInsertData = async () => {
  const filePath = "./sam-info.txt";
  const content = await readTextFile(filePath);

  // Split content into smaller chunks, you can adjust chunk size as needed
  const chunks = content.match(/(.|[\r\n]){1,1000}/g) || [];

  for (const chunk of chunks) {
    try {
      const embedding = await getEmbeddingFromOpenAI(chunk);
      await insertDataToSupabase(chunk, embedding);
    } catch (err) {
      console.error("Error processing chunk:", err);
    }
  }
};

// Execute the seeding function
processAndInsertData()
  .then(() => console.log("Seeding complete"))
  .catch((err) => console.error("Seeding failed:", err));
