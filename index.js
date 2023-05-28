const express = require("express");
const cors = require("cors");
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

const menuCollection = client.db("bistroDB").collection("menu");
const reviewCollection = client.db("bistroDB").collection("reviews");
const cartCollection = client.db("bistroDB").collection("carts");

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

// review routes
app.get("/reviews", async (req, res) => {
  const result = await reviewCollection.find().toArray();
  res.send(result);
});

// cart routes
app.get("/carts", async (req, res) => {
  const userId = req.query.user_id;

  try {
    const cartItems = await cartCollection.find({ userId: userId }).toArray();

    for (const cartItem of cartItems) {
      const food = await menuCollection.findOne({ _id: cartItem.foodId });
      cartItem.food = food;
    }

    res.send(cartItems);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching cart items.");
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
