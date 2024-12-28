const express = require("express");
const router = express.Router();
const db = require("../../db");
const { ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");

router.get("/generate-upi-link", (req, res) => {
  const { amount, upiId } = req.query;
  if (!amount || !upiId) {
    return res.status(400).json({ error: "Amount and UPI ID are required" });
  }

  const AdminupiId = "ashwinmaurya@oksbi";
  const name = "ASHWINI KUMAR RAJBALI MAURYA"; // Replace with your name
  const note = "Good Service";

  const upiLink = `upi://pay?pa=${AdminupiId}&pn=${name}&am=${amount}&tn=${note}&cu=INR`;
  res.json({ upiLink });
});
// Route to add payment details
router.post("/add", async (req, res) => {
  try {
    const {
      userEmail,
      deliveryAddress,
      paymentMethod,
      SubTotal,
      amountPaid,
      Tax,
      totalQuantity,
      size,
      name,
      cardNumber,
      cvv,
      expiryDates,
      upiID,
      selectedUPIApp,
      paymentUpdate,
      products,
      mobileNumber,
    } = req.body;

    // Validate the payment details
    if (!deliveryAddress || !paymentMethod) {
      return res.status(400).json({
        message: "Delivery address & Payment Information is required",
      });
    }
    if (paymentMethod === "CashOnDelivery") {
      if (!paymentUpdate) {
        return res.status(400).json({
          message: "Please select payment status for Cash on Delivery.",
        });
      }
      // You can add additional validations specific to Cash on Delivery here
    }

    const parsedAmountPaid = parseFloat(amountPaid);

    // Get current timestamp
    const createdAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    const currentYear = new Date().getFullYear().toString().slice(-2);
    // 888888888888888888888888888888888888
    //   const pdfData = `
    //   <html>
    //     <head>
    //       <title>Invoice</title>
    //       <style>
    //         body { font-family: Arial, sans-serif; }
    //         .invoice { max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; }
    //         .header { text-align: center; }
    //         .details { margin-top: 20px; }
    //         .footer { text-align: center; margin-top: 20px; }
    //       </style>
    //     </head>
    //     <body>
    //       <div class="invoice">
    //         <div class="header">
    //           <h1>Invoice</h1>
    //           <p>Date: ${createdAt}</p>
    //           <p>Invoice Number: ${currentYear}/${nextInvoiceNumber
    //             .toString()
    //             .padStart(4, "0")}</p>
    //         </div>
    //         <div class="details">
    //           <h2>Billing Details</h2>
    //           <p>Name: ${name}</p>
    //           <p>Email: ${userEmail}</p>
    //           <p>Delivery Address: ${deliveryAddress}</p>
    //           <h3>Items</h3>
    //           <ul>
    //             ${products
    //               .map(
    //                 (product) =>
    //                   `<li>${product.name} - ${product.quantity} x ${product.price}</li>`
    //               )
    //               .join("")}
    //           </ul>
    //           <p>Subtotal: $${SubTotal}</p>
    //           <p>Tax: $${Tax}</p>
    //           <p>Total Amount Paid: $${amountPaid}</p>
    //         </div>
    //         <div class="footer">
    //           <p>Thank you for your purchase!</p>
    //         </div>
    //       </div>
    //     </body>
    //   </html>
    // `;
    //   const pdf = await new Promise((resolve, reject) => {
    //     htmlToPdf.create(pdfData, {}).toBuffer((err, buffer) => {
    //       if (err) {
    //         reject(err);
    //       } else {
    //         resolve(buffer);
    //       }
    //     });
    //   });

    //   const transporter = nodemailer.createTransport({
    //     service: "gmail",
    //     auth: {
    // user: process.env.Email_UserName,
    // pass: process.env.Email_Password,
    //     },
    //   });

    //   const mailOptions = {
    //     from: "your-email@gmail.com",
    //     to: userEmail,
    //     subject: "Invoice for Your Purchase",
    //     text: "Please find attached the invoice for your recent purchase.",
    //     attachments: [
    //       {
    //         filename: "invoice.pdf",
    //         content: pdf,
    //         encoding: "base64",
    //       },
    //     ],
    //   };

    //   transporter.sendMail(mailOptions, (error, info) => {
    //     if (error) {
    //       console.error("Error sending email:", error);
    //       res.status(500).send("Failed to send email");
    //     } else {
    //       console.log("Email sent: " + info.response);
    //       res.status(200).send("Email sent successfully");
    //     }
    //   });

    const dbInstance = await db.connectDatabase();
    const db1 = await dbInstance.getDb();
    const paymentCollection = db1.collection("order");

    const maxInvoice = await paymentCollection.findOne(
      {},
      { sort: { InvoiceNumber: -1 }, projection: { _id: 0, InvoiceNumber: 1 } }
    );
    let nextInvoiceNumber = 1;
    if (maxInvoice) {
      nextInvoiceNumber = parseInt(maxInvoice.InvoiceNumber.split("/")[1]) + 1;
    }
    const batch = currentYear.padStart(2, "0"); // Ensure 2 digits for the year
    const invoiceNumber = `${batch}/${nextInvoiceNumber
      .toString()
      .padStart(4, "0")}`; // Format as YY/0001

    // Include common fields in the payment object
    const paymentWithDate = {
      InvoiceNumber: invoiceNumber, // Assign the generated InvoiceNumber
      userEmail,
      deliveryAddress,
      paymentMethod,
      totalQuantity,
      size,
      SubTotal,
      Tax,
      amountPaid: parsedAmountPaid,
      products,
      createdAt,
    };

    if (paymentMethod === "Online") {
      // Handle online payments
      if (selectedUPIApp) {
        // Save selected UPI app
        paymentWithDate.selectedUPIApp = selectedUPIApp;
        paymentWithDate.mobileNumber = mobileNumber;
      } else if (upiID) {
        // Save UPI ID
        paymentWithDate.upiID = upiID;
      }

      const result = await paymentCollection.insertOne(paymentWithDate);

      res.status(200).json({
        message: "Payment submitted successfully",
        paymentId: result.insertedId,
      });
    } else if (paymentMethod === "CardPayment") {
      if (!name || !cardNumber || !cvv || !expiryDates) {
        return res.status(400).json({ message: "Incomplete card details" });
      }

      paymentWithDate.name = name;
      paymentWithDate.cardNumber = cardNumber;
      paymentWithDate.cvv = cvv;
      paymentWithDate.cardExpiryDate = expiryDates;

      // Insert payment details into the database
      const result = await paymentCollection.insertOne(paymentWithDate);

      res.status(200).json({
        message: "Payment submitted successfully",
        paymentId: result.insertedId,
      });
    } else if (paymentMethod === "CashOnDelivery") {
      paymentWithDate.paymentStatus = paymentUpdate;

      const result = await paymentCollection.insertOne(paymentWithDate);

      res.status(200).json({
        message: "Payment submitted successfully",
        paymentId: result.insertedId,
      });
    } else {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const variantCollection = db1.collection("variant");
    const productCollection = db1.collection("product");

    const updateStockPromises = products.map(async (product) => {
      const productId = product.id; // Product ID
      const quantityPurchased = product.quantity; // Quantity purchased
      const selectedColor = product.color; // Selected color
      const selectedSize = product.size; // Selected size

      const updated_at = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      // Find the correct product variant and update the quantity for the selected size
      await variantCollection.updateOne(
        {
          productId: new ObjectId(productId),
          color: selectedColor,
          "sizes.size": selectedSize, // Match the size within the sizes array
        },
        {
          $inc: {
            "sizes.$.quantity": -quantityPurchased,
            "sizes.$.quantityPurchased": quantityPurchased,
          }, // Subtract the purchased quantity
          $set: { updatedAt: updated_at }, // Update the updatedAt field
        }
      );

      await productCollection.updateOne(
        { _id: new ObjectId(productId) },
        {
          $inc: {
            QuantityPurchased: quantityPurchased,
          },
          $set: { UpdateQuantity: updated_at },
        }
      );
    });

    await Promise.all(updateStockPromises);
  } catch (error) {
    console.error("Error submitting payment:", error);
    res.status(500).json({
      message: "Failed to submit payment. Please try again later.",
    });
  }
});

router.get("/getAll", async (req, res) => {
  try {
    const { id } = req.query; // Use "id" query parameter for flexibility
    let query = {}; // Default query to fetch all payment details

    // If "id" is provided, construct a query to filter by the specific OrderID
    if (id) {
      query = { _id: new ObjectId(id) };
    }

    // Access the MongoDB database instance
    const dbInstance = await db.connectDatabase();
    const db1 = await dbInstance.getDb();

    const paymentCollection = db1.collection("order");

    // Fetch payment details based on the constructed query
    const payments = await paymentCollection.find(query).toArray();

    // If no records found and "id" is provided, return 404
    if (id && payments.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Populate product details for each payment (without fetching variants)
    for (let i = 0; i < payments.length; i++) {
      const productIds = payments[i].products.map((product) => product.id);
      const objectIdArray = productIds.map((id) => new ObjectId(id));

      // Fetch products from the database based on the provided IDs
      const productCollection = db1.collection("product");
      const products = await productCollection
        .find({ _id: { $in: objectIdArray } })
        .toArray();

      // Map the product information with the respective order data
      payments[i].products = payments[i].products.map((purchasedProduct) => {
        const productInfo = products.find(
          (prod) => prod._id.toString() === purchasedProduct.id
        );

        // Use the data directly from the order's products array
        return {
          ...productInfo,
          quantityVariant: purchasedProduct.quantity,
          colorVariant: purchasedProduct.color,
          sizeVariant: purchasedProduct.size, // Already provided in the order
          priceVariant: purchasedProduct.price,
          mrpPriceVariant: purchasedProduct.mrpPrice,
        };
      });
    }

    res.status(200).json(id ? payments[0] : payments);
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({
      message: "Failed to fetch payment details. Please try again later.",
    });
  }
});

router.get("/getInvoice", async (req, res) => {
  try {
    const { userEmail } = req.query;
    let query = {};
    if (userEmail) {
      query = { userEmail: userEmail };
    }

    // Access the MongoDB database instance
    const dbInstance = await db.connectDatabase();
    const db1 = await dbInstance.getDb();

    const paymentCollection = db1.collection("order");

    // Fetch payment details based on the constructed query
    const payments = await paymentCollection.find(query).toArray();

    // If userEmail is provided, populate product details for each payment
    for (let i = 0; i < payments.length; i++) {
      const productIds = payments[i].products.map((product) => product.id);

      // Filter out invalid product IDs that can't be converted to ObjectId
      const validObjectIds = productIds
        .filter((id) => ObjectId.isValid(id)) // Check if the ID is a valid 24-character hex string
        .map((id) => new ObjectId(id));

      // Fetch products from the database based on valid Object IDs
      const productCollection = db1.collection("product");
      const products = await productCollection
        .find({ _id: { $in: validObjectIds } })
        .toArray();

      // Map the product information with the respective order data
      payments[i].products = payments[i].products.map((orderedProduct) => {
        const productInfo = products.find(
          (product) => product._id.toString() === orderedProduct.id
        );

        return {
          ...productInfo,
          quantityVariant: orderedProduct.quantity,
          colorVariant: orderedProduct.color, // Use color from the order data
          sizeVariant: orderedProduct.size, // Use size from the order data
          priceVariant: orderedProduct.price, // Use price from the order data
          mrpPriceVariant: orderedProduct.mrpPrice, // Use MRP price from the order data
        };
      });
    }

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({
      message: "Failed to fetch payment details. Please try again later.",
    });
  }
});

module.exports = router;
