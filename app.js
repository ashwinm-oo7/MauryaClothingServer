const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const userRoutes = require("./Components/ClothingController/UserController.js");
const categoryRoutes = require("./Components/ClothingController/CategoryController.js");
const subCategoryRoutes = require("./Components/ClothingController/SubCategoryController.js");
const brandRoutes = require("./Components/ClothingController/BrandController.js");
const productRoutes = require("./Components/ClothingController/ProductController.js");

const motoBrandRoutes = require("./Components/ClothingController/MotoBrandController.js");
const feedBackRoutes = require("./Components/ClothingController/FeedbackController.js");
const mumbaiRoutes = require("./Components/ClothingController/MumbaiPinCode.js");
const paymentRoutes = require("./Components/ClothingController/PaymentController.js");
const reviewRoutes = require("./Components/ClothingController/ReviewsProduct.js");
const cartRoutes = require("./Components/ClothingController/CartController.js");
const mobileProductRoutes = require("./Components/MobilePhoneController/MobileAddProduct.js");

const WebSocket = require("ws");
const wss = require("./Components/Utility/chatbot.js"); // Add this line

const bodyParser = require("body-parser");

// Load environment variables from .env file

dotenv.config();

// Create Express application
const app = express();

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
// Parse JSON request bodies
app.use(bodyParser.json());
// Middleware
const allowedOrigins = [
  "https://maurya-clothing.vercel.app",
  "https://maurya-clothing-ashwinm-oo7s-projects.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use((req, res, next) => {
  console.log("Request Origin:", req.headers.origin);
  console.log("Request Method:", req.method);
  console.log("Request URL:", req.url);
  next();
});

app.get("/test-cors", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.send("CORS is working!");
});



app.use("/user", userRoutes);
app.use("/category", categoryRoutes);
app.use("/subcategory", subCategoryRoutes);
app.use("/product", productRoutes);
app.use("/brand", brandRoutes);

app.use("/motoBrandModels", motoBrandRoutes);

app.use("/feedback", feedBackRoutes);
app.use("/mumbai", mumbaiRoutes);
app.use("/payment", paymentRoutes);
app.use("/review", reviewRoutes);
app.use("/cart", cartRoutes);
app.use("/mobile", mobileProductRoutes);
// Start the server
const PORT = process.env.BACKEND_PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Create WebSocket server
// const wss = new WebSocket.Server({ server });
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
