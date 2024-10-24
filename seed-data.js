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
  const sbApiKey = process.env.SUPABASE_API_ANON
  const sbUrl = process.env.SUPABASE_URL
  const openAIApiKey = process.env.OPEN_AI_API

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
