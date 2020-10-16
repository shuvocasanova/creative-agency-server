const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs-extra");
const fileUpload = require("express-fileupload");
const ObjectID = require("mongodb").ObjectID;

const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("uploads"));
app.use(fileUpload());

const port = 7000;

app.get("/", (req, res) => {
  res.send("Welcome to creative-agency-server");
});

// mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.krddc.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  // Collections
  const servicesCollection = client
    .db(process.env.DB_NAME)
    .collection("servicesCollection");

  const adminCollection = client
    .db(process.env.DB_NAME)
    .collection("adminCollection");
  const orderCollection = client
    .db(process.env.DB_NAME)
    .collection("orderCollection");
  const feedbackCollection = client
    .db(process.env.DB_NAME)
    .collection("feedbackCollection");

  console.log("dbConnected");

  // Get isAdmin services api
  app.post("/user-role", (req, res) => {
    const email = req.body.email;
    adminCollection.find({ email: email }).toArray((err, result) => {
      result.length > 0
        ? res.send({ isAdmin: true })
        : res.send({ isAdmin: false });
    });
  });

  // Get all services api
  app.get("/services", (req, res) => {
    servicesCollection.find({}).toArray((err, services) => {
      res.send(services);
    });
  });

  //update Order Status
  app.patch("/updateOrderStatus", (req, res) => {
    orderCollection
      .updateOne(
        { _id: ObjectID(req.body.id) },
        { $set: { status: parseInt(req.body.status) } }
      )
      .then((result) => {
        res.send(result);
      });
  });

  // get signal service by serviceID
  app.get("/singleService/:serviceID", (req, res) => {
    const serviceID = req.params.serviceID;
    servicesCollection
      .find({ _id: ObjectID(serviceID) })
      .toArray((err, service) => {
        res.send({ title: service[0].title, img: service[0].img.img });
      });
  });

  // get orders services api
  app.get("/orders", (req, res) => {
    orderCollection.find({}).toArray((err, order) => {
      res.send(order);
    });
  });

  // get customer Feedback
  app.get("/feedbacks", (req, res) => {
    feedbackCollection.find({}).toArray((err, feedback) => {
      res.send(feedback);
    });
  });

  // addFeedback post api
  app.post("/addFeedback", (req, res) => {
    const name = req.body.name;
    const photoURL = req.body.photoURL;
    const company = req.body.company;
    const description = req.body.description;
    feedbackCollection
      .insertOne({
        name: name,
        company: company,
        description: description,
        photoURL: photoURL,
      })
      .then(() => {
        res.send("ok");
      });
  });

  // submit order post api
  app.post("/submit-order", (req, res) => {
    const file = req.files.file;
    const filePath = `${__dirname}/uploads/${file.name}`;
    const name = req.body.name;
    const email = req.body.email;
    const service = req.body.service;
    const serviceID = req.body.serviceID;
    const details = req.body.details;
    const price = req.body.price;
    orderCollection.insertOne({
      name: name,
      email: email,
      service: service,
      serviceID: serviceID,
      details: details,
      price: price,
      status: 0,
    });
    file.mv(filePath, (err) => {
      if (err) {
        res.status(500).send({ msg: "failed to upload file" });
      }
      res.send({ name: file.name, path: `/${file.name}` });
    });
  });

  // orders list by user
  app.post("/userOrderList", (req, res) => {
    const email = req.body.email;
    orderCollection.find({ email: email }).toArray((err, orderList) => {
      res.send(orderList);
    });
  });

  // add-service post api
  app.post("/add-service", (req, res) => {
    const file = req.files.file;
    const filePath = `${__dirname}/uploads/${file.name}`;
    const title = req.body.title;
    const description = req.body.description;

    file.mv(filePath, (err) => {
      if (err) {
        res.status(500).send({ msg: "failed to upload file" });
      }
      const newImg = fs.readFileSync(filePath);
      const encImg = newImg.toString("base64");
      const img = {
        contentType: req.files.file.mimetype,
        size: req.files.file.size,
        img: Buffer(encImg, "base64"),
      };
      servicesCollection
        .insertOne({
          title: title,
          description: description,
          img: img,
        })
        .then((result) => {
          fs.remove(filePath);
          res.send(result.insertedCount > 0);
        });
    });
  });

  // make admin
  app.post("/makeAdmin", (req, res) => {
    adminCollection
      .find({ email: req.body.currentUser })
      .toArray((err, document) => {
        if (document.length > 0) {
          adminCollection.insertOne({ email: req.body.email }).then(() => {
            res.send("ok");
          });
        }
      });
  });
  // client connect close
});

app.listen(process.env.PORT || port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
