﻿require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/user');
const reportRoutes = require('./routes/report');
const masterRoutes = require('./routes/master');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json({ limit: '10mb' })); 

const allowedOrigins = [process.env.FRONTEND_URL];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Enable cookies if needed
}
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));  // Respond to preflight OPTIONS requests

//const session = require('express-session');
//app.use(session({
//    secret: 'whiteeaglesecret',
//    resave: false,
//    saveUninitialized: true,
//    cookie: { secure: false } // Should be 'true' if using HTTPS
//}));

const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!token) {
        return res.sendStatus(403); // Forbidden
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user; // Add user data to request object
        next();
    });
};


app.use('/api/user', userRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/master', masterRoutes);




//// Serve static files from the Angular app
//app.use(express.static(path.join(__dirname, '../OMS-CLIENT/dist/oms-we')));

//// Catch-all route to serve the Angular index.html file for any request that doesn't match a server route
//app.get('*', (req, res) => {
//    res.sendFile(path.join(__dirname, '../OMS-CLIENT/dist/oms-we/browser/index.html'));
//});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
