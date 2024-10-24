// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// supabase/functions/get-response/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { RecursiveCharacterTextSplitter } from 'https://esm.sh/langchain/text_splitter'
import { OpenAIEmbeddings } from "https://esm.sh/@langchain/openai@0.0.2"
import { SupabaseVectorStore } from "https://esm.sh/@langchain/community@0.0.26/vectorstores/supabase"

Deno.serve(async (req: Request) => {
  try {
    // Get the text content from the request body
    const { text } = await req.json()
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Environment variables are set in Supabase dashboard
    const sbUrl = Deno.env.get('SUPABASE_URL')
    const sbApiKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

    // Verify environment variables
    if (!sbUrl || !sbApiKey || !openAIApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing environment variables', 
          details: {
            hasUrl: !!sbUrl,
            hasApiKey: !!sbApiKey,
            hasOpenAI: !!openAIApiKey
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const client = createClient(sbUrl, sbApiKey)

    // Test database connection
    try {
      const { data, error } = await client
        .from('documents')
        .select('id')
        .limit(1)

      if (error) {
        return new Response(
          JSON.stringify({ 
            error: 'Database connection test failed', 
            details: error 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Database connection test threw an error', 
          details: error.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      separators: ['\n\n', '\n', ' ', ''],
      chunkOverlap: 50
    })
    const output = await splitter.createDocuments([text])

    try {
      // Store vectors in Supabase
      const vectorStore = await SupabaseVectorStore.fromDocuments(
        output,
        new OpenAIEmbeddings({ openAIApiKey }),
        {
          client,
          tableName: 'documents',
        }
      )

      return new Response(
        JSON.stringify({ 
          success: true, 
          chunks: output.length
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Vector storage failed', 
          details: error.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Top level error', 
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-response' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
