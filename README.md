# supabase-llm

![DEMO](./gif.gif)

1. Set Up Supabase

```bash
supabase init
supabase start
```

2. Copy `.env.template` file and make `.env`
3. To run:

```bash
npm run dev # Terminal 1
supabase functions serve # Terminal 2
```

## Sam Notes

### Cosine similarity

- When using `SupabaseVectorStore` with `similaritySearch` method, using pgvector's cosine similarity by default
- When creating embeddings:

```js
const embeddings = new OpenAIEmbeddings({
	openAIApiKey: openaiApiKey,
	model: "text-embedding-3-small",
});
```

converting text into high-dimensional vectors of 1536 dimensions.

- When storing in supabase:

```js
await vectorStore.addDocument(documents, { ids });
```

it is storing both the text and vector representation in supabase using pgvector.

- Now, when we search:

```js
const searchResults = await vectorStore.similaritySearch(query, 3);
```

Under the hood, we are converting query to vector using same embedding model, using pgvector's `<->` operator to compute cosine similarity, and returning most similar documents

- Cosine similarity formula is : `Cosine Similarity = dot_product(v1, v2) / (magnitude(v1) * magnitude(v2))`
- `Cosine Distance = 1 - Cosine Similarity`

Cosine similarity is popular for embeddings b/c direction matters more than magnitude, it is normalized by vector length, fast to compute, and works with high dimensional data
In supabase, you can choose similarity measure:

```sql
-- Using cosine distance (default)
order by embedding <-> query_embedding

-- Using euclidean distance // meansures straight line distance between two points
-- Best for physical distances / coordinates, when magnitude matters, and when working with normalized vectors
-- ie: finding nearby restaurants
order by embedding <=> query_embedding

-- Using inner product (dot product)
-- best for recommendation system where magnitude indicates strength, when larger values in both vectors should amplify similarity, and when feature importance weighting
-- ie: movie recommendations based on genre preference
order by embedding <#> query_embedding
```
