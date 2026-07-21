require('dotenv').config();

// Проверяем, что ключи Cloudinary есть
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_KEY || !process.env.CLOUDINARY_SECRET) {
    console.error("❌ Cloudinary environment variables are missing!");
    process.exit(1); 
}

const express = require('express');
const app = express();
app.set('query parser', 'extended');
const engine = require('ejs-mate');
const ExpressError = require('./utils/ExpressError.js');
const methodOverride = require('method-override');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const { campgroundSchema, reviewSchema } = require('./schemas.js');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const sanitizeV5 = require('./utils/mongoSanitizeV5.js');
const helmet = require('helmet');
const MongoStore = require('connect-mongo');

const userRoutes = require('./routes/users');
const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';
mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Database connected');
});

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(sanitizeV5({ replaceWith: '_' }));

// Разрешаем Render правильно определять HTTPS для безопасности сессий
app.set('trust proxy', 1);

// Создаем хранилище сессий, связанное с БД
const store = MongoStore.create({
    mongoUrl: dbUrl, 
    touchAfter: 24 * 60 * 60, 
    crypto: {
        secret: 'soupisonthebalcony' 
    }
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e);
});

const sessionConfig = {
  store, 
  name: 'session', 
  secret: 'soupisonthebalcony',
  resave: false,
  saveUninitialized: true,
  cookie: {
      httpOnly: true,
      secure: true, 
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7
  }
};

app.use(session(sessionConfig));
app.use(flash());

// Настройки путей для Content Security Policy
const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
    "https://cdn.maptiler.com/", 
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net",
    "https://cdn.maptiler.com/", 
];
const connectSrcUrls = [
    "https://api.maptiler.com/",
    "https://cdn.maptiler.com/",
    "https://cdn.jsdelivr.net/"
];
const fontSrcUrls = [
    "https://fonts.gstatic.com/",
    "https://cdn.jsdelivr.net",
    "https://stackpath.bootstrapcdn.com",
    "https://kit-free.fontawesome.com"
];

// ОБЪЕДИНЕННЫЙ ВЫЗОВ HELMET (Решает проблему дублирования и блокировки карт)
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: [],
                connectSrc: ["'self'", ...connectSrcUrls],
                scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
                styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
                workerSrc: ["'self'", "blob:"],
                childSrc: ["blob:"],
                objectSrc: [],
                imgSrc: [
                    "'self'",
                    "blob:",
                    "data:",
                    "https://res.cloudinary.com/dnw1krx0t/", 
                    "https://api.maptiler.com/",
                ],
                fontSrc: ["'self'", ...fontSrcUrls],
            },
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use('/', userRoutes);
app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:id/reviews', reviewRoutes);

app.get('/', async (req, res) => {
    res.render('home');
});

app.all(/(.*)/, (req, res, next) => {
  next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!';
    
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(statusCode).render('error', { err });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`);
});