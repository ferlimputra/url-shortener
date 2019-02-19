'use strict';
const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require("body-parser");
const dns = require('dns');
const shortid = require('shortid');

const app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, "Failed to connect"));
db.once('open', () => {
  console.log("Connected to Mongo");
});

const UrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String
});
const Url = mongoose.model("Url", UrlSchema);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use('/public', express.static(process.cwd() + '/public'));
app.use("/", bodyParser.urlencoded({
  extended: false
}));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

const createAndSaveUrl = (url, done) => {
  url.save((err, url) => {
    if (err) {
      done(err);
    } else {
      console.log("URL saved successfully");
      done(null, url);
    }
  });
};

const findUrlByShortUrl = (shortUrl, done) => {
  Url.find({
    short_url: shortUrl
  }, (err, data) => {
    if (err) {
      return done(err);
    } else if (!data || !data.length) {
      return done("URL not found");
    }
    return done(null, data[0]);
  });
};

const findUrlByOriginalUrl = (originalUrl, done) => {
  Url.find({
    original_url: originalUrl
  }, (err, data) => {
    if (err) {
      return done(err);
    }
    return done(null, data);
  });
};

const checkExistingUrl = (url, done) => {
  findUrlByOriginalUrl(url, (err, data) => {
    if (err) {
      done(err);
    } else if (data && data.length) {
      console.log("URL already exists");
      done("URL already exists");
    } else {
      done(null);
    }
  });
};

const generateNewUrl = (url) => {
  return new Url({
    original_url: url,
    short_url: shortid.generate()
  });
};

const processNewUrl = (url, res) => {
  console.log("Valid URL, generating short URL...");
  checkExistingUrl(url, (err) => {
    if (err) {
      res.json({
        error: err
      });
    } else {
      const newUrl = generateNewUrl(url);
      createAndSaveUrl(newUrl, (err, data) => {
        if (err) {
          res.json({
            error: err
          });
        } else {
          res.json(data);
        }
      });
    }
  });
};

app.post("/api/shorturl/new", (req, res) => {
  const url = req.body.url;
  dns.lookup(url, null, (err, address) => {
    processNewUrl(url, res);
  });
});

app.get("/api/shorturl/:shorturl", (req, res) => {
  const shortUrl = req.params.shorturl;
  console.log(shortUrl);
  findUrlByShortUrl(shortUrl, (err, data) => {
    if (err) {
      console.log(err);
      res.json({
        error: err
      });
    } else {
      //redirect
      console.log(data);
      console.log("Redirecting to original URL: " + data.original_url);
      res.redirect(data.original_url);
    }
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});