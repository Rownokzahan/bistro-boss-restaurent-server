const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT;
const app = express();

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jxgrj34.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const userCollection = client.db("bistroDB").collection("users");
const menuCollection = client.db("bistroDB").collection("menu");
const reviewCollection = client.db("bistroDB").collection("reviews");
const cartCollection = client.db("bistroDB").collection("carts");

//jwt routes
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "1h" });
  res.send({ token });
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unathorized access" });
  }

  //bearer token
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unathorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// use verifyJWT before using verfyAdmin
const verfyAdmin = async (req, res, next) => {
  const email = req.decoded.email;

  const user = await userCollection.findOne({ email: email });
  if (user?.role !== "admin") {
    return res.status(403).send({ error: true, message: "forbidden access" });
  }
  next();
};

//users routes
app.get("/users", verifyJWT, verfyAdmin, async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

app.get("/users/admin/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    res.send({ admin: false });
  }

  const user = await userCollection.findOne({ email: email });
  const result = { admin: user?.role === "admin" };
  res.send(result);
});

app.post("/users", async (req, res) => {
  const user = req.body;
  const email = user.email;
  const alreadyExists = await userCollection.findOne({ email: email });
  if (alreadyExists) {
    return res.send({ message: "User Already Exists" });
  }
  const result = await userCollection.insertOne(user);
  res.send(result);
});

app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedUser = {
    $set: { role: "admin" },
  };
  const result = await userCollection.updateOne(filter, updatedUser);
  res.send(result);
});

// menu routs
app.get("/menu", async (req, res) => {
  const category = req.query.category;
  if (category) {
    const result = await menuCollection.find({ category: category }).toArray();
    return res.send(result);
  }
  const result = await menuCollection.find().toArray();
  res.send(result);
});

app.get("/menu/:id", async (req, res) => {
  const id = req.params.id;
  const result = await menuCollection.find({ _id: new ObjectId(id) }).toArray();
  res.send(result);
});

app.post("/menu", verifyJWT, verfyAdmin, async (req, res) => {
  const newFood = req.body;
  const result = await menuCollection.insertOne(newFood);
  res.send(result);
});

// review routes
app.get("/reviews", async (req, res) => {
  const result = await reviewCollection.find().toArray();
  res.send(result);
});

// cart routes
app.get("/carts", verifyJWT, async (req, res) => {
  const email = req.query.email;

  const decodedEmail = req.decoded.email;
  if (decodedEmail !== email) {
    return res.status(403).send({ error: true, message: "forbidden access" });
  }

  try {
    const cartItems = await cartCollection.find({ email: email }).toArray();

    for (const cartItem of cartItems) {
      const food = await menuCollection.findOne({
        _id: new ObjectId(cartItem.foodId),
      });
      cartItem.food = food;
    }

    res.send(cartItems);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching cart items.");
  }
});

app.delete("/carts/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while deleting cart item.");
  }
});

app.post("/carts", async (req, res) => {
  const item = req.body;
  const result = await cartCollection.insertOne(item);
  res.send(result);
});

app.get("/", (req, res) => {
  res.send({ message: "Server is running" });
});

app.listen(port, () => {
  console.log(`Server is running on port : ${port}`);
});
