import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase"
import { OpenAIEmbeddings } from "@langchain/openai"
import 'dotenv/config'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

try {
  const sbApiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeHFya2JrdHVhaHhmZ25wZWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2Mjc3NDUsImV4cCI6MjA0NTIwMzc0NX0.lVRhMQkHe5or1goB1ZMtjd09mOgRa4yql2swHNvPad4"
  const sbUrl = "https://ufxqrkbktuahxfgnpeje.supabase.co"
  const openAIApiKey = "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"

  const text = await readFile(join(__dirname, 'sam-info.txt'), 'utf-8')

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    separators: ['\n\n', '\n', ' ', ''],
    chunkOverlap: 50
  })

  const output = await splitter.createDocuments([text])


  const client = createClient(sbUrl, sbApiKey)

  await SupabaseVectorStore.fromDocuments(
    output,
    new OpenAIEmbeddings({ openAIApiKey }),
    {
      client,
      tableName: 'documents',
    }
  )

} catch (err) {
  console.log("ERROR: ", err)
}
