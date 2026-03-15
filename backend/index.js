import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import passport from './passportConfig.js';
import User from './models/User.js';
import Portfolio from './models/Portfolio.js'
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.set('trust proxy', 1); // Trust first proxy
app.use(cookieParser());

// Connect to the database
import connectDB from './db/dbconn.js';
connectDB();

// Apply CORS middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Setup passport
app.use(passport.initialize());

const TOKEN_NAME = 'bhanupriya-create-folio';
const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'createfolio';

const getCookieOptions = () => {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        httpOnly: true,
    };
};

const issueToken = (user) => {
    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
            email: user.email,
        },
        jwtSecret,
        { expiresIn: '7d' }
    );
};

const setAuthCookie = (res, token) => {
    res.cookie(TOKEN_NAME, token, getCookieOptions());
};

const getTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }
    if (req.cookies && req.cookies[TOKEN_NAME]) {
        return req.cookies[TOKEN_NAME];
    }
    return null;
};

const getUserFromToken = async (req) => {
    const token = getTokenFromRequest(req);
    if (!token) {
        return null;
    }
    try {
        const payload = jwt.verify(token, jwtSecret);
        const user = await User.findById(payload.sub);
        return user || null;
    } catch (err) {
        return null;
    }
};

// Google Auth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user) => {
        if (err || !user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login`);
        }
        const token = issueToken(user);
        setAuthCookie(res, token);
        const redirectUrl = `${process.env.FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}`;
        return res.redirect(redirectUrl);
    })(req, res, next);
});

// github Auth Routes
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/auth/github/callback', (req, res, next) => {
    passport.authenticate('github', { session: false }, (err, user) => {
        if (err || !user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login`);
        }
        const token = issueToken(user);
        setAuthCookie(res, token);
        const redirectUrl = `${process.env.FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}`;
        return res.redirect(redirectUrl);
    })(req, res, next);
});

// facebook Auth Routes
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile'] }));

app.get('/auth/facebook/callback', (req, res, next) => {
    passport.authenticate('facebook', { session: false }, (err, user) => {
        if (err || !user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login`);
        }
        const token = issueToken(user);
        setAuthCookie(res, token);
        const redirectUrl = `${process.env.FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}`;
        return res.redirect(redirectUrl);
    })(req, res, next);
});


// Test route to see the user information
app.get('/isLogin', async (req, res) => {
    const user = await getUserFromToken(req);
    if (user) {
        return res.json(user);
    }
    return res.json({});
});

// Logout route
app.get('/logout', (req, res) => {
    res.clearCookie(TOKEN_NAME, getCookieOptions());
    res.redirect(process.env.FRONTEND_URL);
});

// delete account
app.get('/delete', async (req, res) => {
    const user = await getUserFromToken(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    await User.findOneAndDelete({ username: user.username });
    return res.redirect('/logout');
})


// fetch portfolio
app.post('/userPortfolio', async (req, res) => {
    try {
        let portfolioData = await Portfolio.findOne({ username: req.body.username })
        if (portfolioData) {
            res.send(portfolioData)
        } else {
            res.send({})
        }
    } catch (err) {
        console.log('error in fetch portfoli', err)
    }
})

// update portfolio
app.post('/updatePortfolio', async (req, res) => {
    const { username, updates } = req.body; // Extracting updates from the request body
    if (updates.project || updates.expertise || updates.skill || updates.language) {
        const updatedPortfolio = await Portfolio.findOneAndUpdate(
            { username: username }, // Find the document by username
            { $addToSet: updates }, // Merge new data with existing data
            { new: true, runValidators: true, upsert: true } // Options: return updated document, run schema validators, create if not found
        );
    } else {
        const updatedPortfolio = await Portfolio.findOneAndUpdate(
            { username: username }, // Find the document by username
            { $set: updates }, // Merge new data with existing data
            { new: true, runValidators: true, upsert: true } // Options: return updated document, run schema validators, create if not found
        );
    }
    // Send the updated portfolio as a response
    res.json({
        success: true,
        message: 'Portfolio updated successfully !',
    });

});


// delete item 
app.post("/deleteItem",async(req,res)=>{
    try {
        const id = req.body.id
        const username = req.body.username
        const field = req.body.field

        const portfolioItem = await Portfolio.findOneAndUpdate(
            { username: username },
            { $pull: { [field]: { _id: id } } },
            { new: true }
        )
        res.json({msg:"Item deleted successfully"});

    } catch (error) {
        console.error("Error in delete item:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.get('/', (req, res) => {
    res.json({ backend: 'Done' })
})

app.listen(port, () => {
    console.log(`App listening on http://localhost:${port}`);
});
