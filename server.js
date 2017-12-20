const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
const request = require('request');
const cheerio = require('cheerio');

// Require all models
const db = require('./models');

const PORT = process.env.PORT || 3050;

// Initialize Express
const app = express();

// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: false }));
// Use express.static to serve the public folder as a static directory
app.use(express.static('public'));

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost/mongo_scraper'
mongoose.connect(MONGO_URI, {
  useMongoClient: true
});

// Routes

// A GET route for scraping the echojs website
app.get('/scrape', (req, res) => {
  request('http://www.foodnetwork.com/',(error, response, html) => {

    const $ = cheerio.load(html);

    // An empty array to save the data that we'll scrape
    let results = [];

    $('div.m-MediaBlock--gallery').each((i, element) => {

      const link = $(element).children().find('a').attr('href');
      const title = $(element).children().find('span.m-MediaBlock__a-HeadlineText').text();
      const description = $(element).children().find('div.m-MediaBlock__a-Description').text();

      if (link && title && description) {
        results.push({
          title: title,
          link: link,
          description: description
        });
      }
    });
    db.Article
      .create(results)
      .then((dbArticle) => {
        // If we were able to successfully scrape and save an Article, send a message to the client
        res.send('Scrape Complete');
      })
      .catch((err) => {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
});

// Route for getting all Articles from the db
app.get('/articles', (req, res) => {
  db.Article
    .find({})
    .then((articles) => {
      // If any Books are found, send them to the client
      res.json(articles);
    })
    .catch((err) => {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get('/articles/:id', (req, res) => {
  db.Article
    .findById(req.params.id)
    .populate('note')
    .then((articles) => {
      // If any Books are found, send them to the client
      res.json(articles);
      console.log(articles);
    })
    .catch((err) => {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post('/articles/:id', (req, res) => {
  db.Note
    .create(req.body)
    .then((dbNote) => {
      // If we were able to successfully scrape and save an Article, send a message to the client
      //res.send("Scrape Complete");
      return db.Article.findOneAndUpdate({_id: req.params.id}, { $push: { note: dbNote._id } }, { new: true });
    })
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
