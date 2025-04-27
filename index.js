require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { databaseConnection } = require("./db/database-connect");
const { ObjectId } = require("mongodb");

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

// Get all jobs in the UI
app.get("/jobs", async (req, res) => {
  const result = await jobsCollection.find().toArray();
  res.send(result);
});

// Get all jobs by specific user
app.get("/jobs/:email", async (req, res) => {
  const email = req.params.email;
  const query = { "buyer.email": email };
  const result = await jobsCollection.find(query).toArray();
  res.send(result);
  // console.log(result);
});

// delete posted data
app.delete("/job/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobsCollection.deleteOne(query);
  res.send(result);
});

// get single data for update
app.get("/job-update/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobsCollection.findOne(query);
  res.send(result);
});

// Update a job Data in DB
app.put("/update-job/:id", async (req, res) => {
  const id = req.params.id;
  const jobData = req.body;
  const update = {
    $set: jobData,
  };
  const query = { _id: new ObjectId(id) };
  const result = await jobsCollection.updateOne(query, update);
  res.send(result);
  console.log(result);
});

// Server Listening
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
