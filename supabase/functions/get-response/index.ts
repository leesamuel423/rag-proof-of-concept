import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OpenAIEmbeddings } from "https://esm.sh/@langchain/openai";
import { SupabaseVectorStore } from "https://esm.sh/@langchain/community/vectorstores/supabase";
import OpenAI from "https://esm.sh/openai@4.28.0";

console.log("Function 'get-response' is running!");

serve(async (req) => {
  // handle CORS preflight request (important for browser-based requests)
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

    // get environment variables for api access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    // verify environment variables are present
    if (!supabaseUrl || !supabaseServiceRoleKey || !openaiApiKey) {
      throw new Error("Missing required environment variables");
    }

    // initialize OpenAI embeddings and client with text-embedding-3-small model
    // convert text -> numerical vectors for similarity search
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: openaiApiKey,
      model: "text-embedding-3-small",
    });

    // initialize OpenAI client for GPT interactions
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // initialize supabase client for database access
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // set up vector store using supabase
    // allows us to perform similarity searches on our embedded documents
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabaseClient,
      tableName: "documents", // table where docs are stored
      queryName: "match_documents", // name of similarity search function
    });

    // perform similarity search to find 3 relevant docs
    const searchResults = await vectorStore.similaritySearch(query, 3);
    
    // if no relevant docs are found, return early with a message
    if (!searchResults || searchResults.length === 0) {
      return new Response(
        JSON.stringify({ response: "I don't have enough information to answer that question." }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // combine the relevant chunks into one context string
    const context = searchResults.map(doc => doc.pageContent).join("\n\n");

    // prompt for GPT w/ system message and user message
    const messages = [
      {
        role: "system",
        content: `You are a helpful assistant that answers questions based on the provided context. 
                 Keep your answers concise and relevant. If the context doesn't contain enough 
                 information to answer the question fully, be honest about it and reply with "Sorry, no relevant information found". Use the context 
                 provided to answer the question, don't make up information.`
      },
      {
        role: "user",
        content: `Context: ${context}\n\nQuestion: ${query}\n\nPlease provide a concise and relevant answer based only on the context provided.`
      }
    ];

    // get response from GPT based on the context and question
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // using gpt 3.5 turbo model
      messages: messages,
      temperature: 0.3, // lower temperature for more focused and consistent responses
      max_tokens: 150   // limit response length to keep answers conceise
    });

    // extract answer from gpt response
    const answer = gptResponse.choices[0].message.content;

    // return final response
    return new Response(
      JSON.stringify({ 
        response: answer,
        // fields for debugging if needed 
        // context_used: searchResults.length,
        // first_context: searchResults[0].pageContent.substring(0, 100) + "..."
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
