const mongoose = require('mongoose');
const axios = require('axios');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campground');
const User = require('../models/user'); // Добавьте эту строку

mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Database connected');
});

const sample = array => array[Math.floor(Math.random() * array.length)];

async function seedImg() {
    try {
      const resp = await axios.get('https://api.unsplash.com/photos/random', {
        params: {
          client_id: '7Q4BH28pVNlD8x5wE2JDRUIh6WX9_YNFeyizPXD_W8M',
          collections: 1114848,
        },
      })
      return resp.data.urls.small;
    } catch (err) {
      console.error(err);
      return 'https://source.unsplash.com/collection/483251';
    }
}

const seedDB = async () => {
    await Campground.deleteMany({});
    
    let user = await User.findOne();
    if (!user) {
        user = new User({
            email: 'test@test.com',
            username: 'testuser'
        });
        await User.register(user, 'testpassword');
    }

    console.log(`Создаю кемпинги для пользователя ${user.username}...`);
    
    for (let i = 0; i < 50; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const price = Math.floor(Math.random() * 20) + 10;
        
        // ВАЖНО: Проверьте правильность порядка координат!
        const camp = new Campground({
            author: user._id,
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            description: 'Lorem ipsum dolor sit amet...',
            price,
            geometry: {
                type: "Point",
                coordinates: [
                    cities[random1000].longitude, // Долгота first
                    cities[random1000].latitude   // Широта second
                ]
            },
            images: [
                {
                    url: 'https://res.cloudinary.com/douqbebwk/image/upload/v1600060601/YelpCamp/ahfnenvca4tha00h2ubt.png',
                    filename: 'YelpCamp/ahfnenvca4tha00h2ubt'
                }
            ]
        });

        // Добавьте проверку координат
        console.log(`Кемпинг ${i+1}: ${camp.location}`);
        console.log(`Координаты: ${camp.geometry.coordinates}`);
        
        try {
            await camp.save();
            console.log(`✅ Кемпинг #${i + 1} создан`);
        } catch (err) {
            console.error(`❌ Ошибка:`, err.message);
        }
    }
}

seedDB()
    .then(() => {
        console.log('🎉 Все кемпинги созданы!');
        mongoose.connection.close();
    })
    .catch(err => {
        console.error('💥 Критическая ошибка:', err);
        process.exit(1);
    });