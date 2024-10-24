import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";

import { createClient } from "@supabase/supabase-js";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

const supabaseClient = createClient(
  "https://ufxqrkbktuahxfgnpeje.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeHFya2JrdHVhaHhmZ25wZWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2Mjc3NDUsImV4cCI6MjA0NTIwMzc0NX0.lVRhMQkHe5or1goB1ZMtjd09mOgRa4yql2swHNvPad4"

);

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: "documents",
  queryName: "match_documents",
});

const document1 = {
  pageContent: "The powerhouse of the cell is the mitochondria",
  metadata: { source: "https://example.com" },
};

const document2 = {
  pageContent: "Buildings are made out of brick",
  metadata: { source: "https://example.com" },
};

const document3 = {
  pageContent: "Mitochondria are made out of lipids",
  metadata: { source: "https://example.com" },
};

const document4 = {
  pageContent: "The 2024 Olympics are in Paris",
  metadata: { source: "https://example.com" },
};

const documents = [document1, document2, document3, document4];

await vectorStore.addDocuments(documents, { ids: ["11", "12", "13", "14"] });

// QUERY DIRECTLY
const filter = { source: "https://example.com" };
const similaritySearchResults = await vectorStore.similaritySearch(
  "biology",
  2,
  filter
)

for (const doc of similaritySearchResults) {
  console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`)
}

const similaritySearchWithScoreResults =
  await vectorStore.similaritySearchWithScore("biology", 2, filter);

for (const [doc, score] of similaritySearchWithScoreResults) {
  console.log(
    `* [SIM=${score.toFixed(3)}] ${doc.pageContent} [${JSON.stringify(
doc.metadata
)}]`
  );
}
