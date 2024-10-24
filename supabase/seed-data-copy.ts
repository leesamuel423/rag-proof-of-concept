import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";

// Define your Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
console.log("Supabase URL:", Deno.env.get("SUPABASE_URL"));
console.log("Supabase Anon Key:", Deno.env.get("SUPABASE_ANON_KEY"));
console.log("Supabase Service Key:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

const supabaseClient = createClient(
  supabaseUrl
  supabaseServiceRoleKey
);

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: "documents",
  queryName: "match_documents",
});
