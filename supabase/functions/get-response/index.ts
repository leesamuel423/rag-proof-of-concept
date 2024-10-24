import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OpenAIEmbeddings } from "https://esm.sh/@langchain/openai";
import { SupabaseVectorStore } from "https://esm.sh/@langchain/community/vectorstores/supabase";

console.log("Function 'get-response' is running!");

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
    const { query } = await req.json();
    console.log("Received query:", query);

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
      model: "text-embedding-3-small", // Using the same model as in search.js
    });

    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Initialize vector store
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabaseClient,
      tableName: "documents", // Make sure this matches your table name
      queryName: "match_documents", // Make sure this matches your function name
    });

    // Perform similarity search
    const searchResults = await vectorStore.similaritySearch(query, 1); // Get the most relevant result

    if (!searchResults || searchResults.length === 0) {
      return new Response(
        JSON.stringify({ response: "No relevant information found." }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Return the most relevant document's content
    return new Response(
      JSON.stringify({ response: searchResults[0].pageContent }),
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
      JSON.stringify({ error: err.message }),
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
