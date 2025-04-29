require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { databaseConnection } = require("./db/database-connect");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

// Database Connect
databaseConnection();

// Middleware
const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  optionalSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
  });

  next();
};

// Database Collection
const db = require("./db/database-connect").client.db("solo-bids");
const jobsCollection = db.collection("jobs");
const bidsCollection = db.collection("bids");

// Generate Json Web Token
app.post("/jwt", async (req, res) => {
  const email = req.body;
  // create token
  const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "365d",
  });
  console.log(token);
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true });
});

// logout || clear cookie from browser
app.get("/logout", async (req, res) => {
  res
    .clearCookie("token", {
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true });
});

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
app.get("/jobs/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  const decodedEmail = req.user?.email;
  if (decodedEmail !== email)
    return res.status(401).send({ message: "unauthorized access" });
  const query = { "buyer.email": email };
  const result = await jobsCollection.find(query).toArray();
  res.send(result);
  // console.log(result);
});

// delete a job from database
app.delete("/job/:id", verifyToken, async (req, res) => {
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
app.get("/bids/:email", verifyToken, async (req, res) => {
  const isBuyer = req.query.buyer;
  const email = req.params.email;
  const decodedEmail = req.user?.email;
  if (decodedEmail !== email)
    return res.status(401).send({ message: "unauthorized access" });
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

// get all jobs
app.get("/all-jobs", async (req, res) => {
  const filter = req.query.filter;
  const search = req.query.search;
  const sort = req.query.sort;
  let options = {};
  if (sort) options = { sort: { deadline: sort === "asc" ? 1 : -1 } };
  let query = {
    job_title: {
      $regex: search,
      $options: "i",
    },
  };
  if (filter) query.category = filter;
  const result = await jobsCollection.find(query, options).toArray();
  res.send(result);
});

// Server Listening
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
