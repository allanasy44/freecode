const { MongoClient } = require("mongodb");
const express = require("express");
const cors = require("cors");

const client = new MongoClient(
  "mongodb+srv://allanasy44:EW0NlBWPSkoCGhMm@cluster9.wo6bm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster9",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

let db, urls;

// Connect to MongoDB
(async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db("Cluster9");
    urls = db.collection("urls");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
})();

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Utility: URL Validation
const isValidUrl = (url) => {
  const urlRegex = /^(https?:\/\/)(www\.)?[a-zA-Z0-9-]+\.[a-z]{2,}.*$/;
  return urlRegex.test(url);
};

// POST Endpoint to Shorten URLs
app.post("/api/shorturl", async (req, res) => {
  const originalUrl = req.body.url;

  if (!isValidUrl(originalUrl)) {
    return res.json({ error: "invalid url" });
  }

  try {
    // Check if the URL is already in the database
    const existing = await urls.findOne({ url: originalUrl });
    if (existing) {
      return res.json({ original_url: existing.url, short_url: existing.short_url });
    }

    // Get the count for generating a new short URL
    const urlCount = await urls.countDocuments();
    const shortUrl = urlCount + 1;

    const urlDoc = { url: originalUrl, short_url: shortUrl };
    await urls.insertOne(urlDoc);

    res.json({ original_url: originalUrl, short_url: shortUrl });
  } catch (err) {
    console.error("Error in POST /api/shorturl:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET Endpoint to Redirect Short URLs
app.get("/api/shorturl/:short_url", async (req, res) => {
  const shortUrl = parseInt(req.params.short_url);

  try {
    const urlDoc = await urls.findOne({ short_url: shortUrl });
    if (urlDoc) {
      return res.redirect(urlDoc.url);
    }
    res.status(404).json({ error: "URL not found" });
  } catch (err) {
    console.error("Error in GET /api/shorturl/:short_url:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
