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
const bidsCollection = db.collection("bids");

// Welcome Route
app.get("/", async (req, res) => {
  res.send("Welcome from SoloBids Server...");
});

// Jobs Collection Start Here
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

// Bids Collection Start Here
// Save a bid data in db
app.post("/add-bid", async (req, res) => {
  const bidData = req.body;

  // 0. if a user placed a bid already on this job
  const query = { email: bidData?.email, jobId: bidData?.jobId };
  const alreadyExist = await bidsCollection.findOne(query);
  // console.log("alreadyExist bid data ->", alreadyExist);
  if (alreadyExist) {
    return res.status(400).send("You have already place a bid on this Job.");
  }

  // 1. save data in bid collection
  const result = await bidsCollection.insertOne(bidData);

  // 2. Increase bid count in jobs collection
  const filter = { _id: new ObjectId(bidData.jobId) };
  const update = {
    $inc: {
      bid_count: 1,
    },
  };
  await jobsCollection.updateOne(filter, update);
  res.send(result);
});

// get all bids for a specific user
app.get("/bids/:email", async (req, res) => {
  const isBuyer = req.query.buyer;
  const email = req.params.email;
  let query = {};
  if (isBuyer) {
    query.buyer = email;
  } else {
    query.email = email;
  }
  const result = await bidsCollection.find(query).toArray();
  res.send(result);
});

// Update bid status
app.patch("/update-bid-status/:id", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  console.log(status);

  const filter = { _id: new ObjectId(id) };
  const update = {
    $set: { status },
  };
  const result = await bidsCollection.updateOne(filter, update);
  res.send(result);
});

// Server Listening
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
