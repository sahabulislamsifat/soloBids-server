require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { databaseConnection } = require("./db/database-connect");

const app = express();
const port = process.env.PORT || 5000;

// Database Connect
databaseConnection();

// Middleware
const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

// Database Collection
const db = require("./db/database-connect").client.db("solo-bids");
const jobsCollection = db.collection("jobs");

// Welcome Route
app.get("/", async (req, res) => {
  res.send("Welcome from SoloBids Server...");
});

// Save a job Data in DB
app.post("/add-job", async (req, res) => {
  const jobData = req.body;
  // console.log(jobData);
  const result = await jobsCollection.insertOne(jobData);
  res.send(result);
});

// Server Listening
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
