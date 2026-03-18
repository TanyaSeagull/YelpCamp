const mongoose = require('mongoose');
const axios = require('axios');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campground');
const User = require('../models/user');

// Используем переменную окружения для подключения к БД
const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/yelp-camp';

mongoose.connect(dbUrl, {
    serverSelectionTimeoutMS: 30000, // Увеличиваем таймаут до 30 секунд
    socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

const db = mongoose.connection;

// Функция для ожидания готовности подключения
const waitForConnection = () => {
    return new Promise((resolve, reject) => {
        if (mongoose.connection.readyState === 1) {
            console.log('🟢 Database connection ready');
            return resolve();
        }
        
        console.log('⏳ Waiting for database connection...');
        
        mongoose.connection.once('connected', () => {
            console.log('🟢 Database connected');
            resolve();
        });
        
        mongoose.connection.once('error', (err) => {
            reject(err);
        });
        
        // Таймаут на случай проблем
        setTimeout(() => {
            reject(new Error('Connection timeout after 30 seconds'));
        }, 30000);
    });
};

const sample = array => array[Math.floor(Math.random() * array.length)];

async function seedImg() {
    try {
        const resp = await axios.get('https://api.unsplash.com/photos/random', {
            params: {
                client_id: process.env.UNSPLASH_KEY || '7Q4BH28pVNlD8x5wE2JDRUIh6WX9_YNFeyizPXD_W8M',
                collections: 1114848,
            },
        });
        return resp.data.urls.small;
    } catch (err) {
        console.error('Unsplash error:', err.message);
        return 'https://source.unsplash.com/collection/483251';
    }
}

const seedDB = async () => {
    try {
        // Ждем подключения к БД
        await waitForConnection();
        
        console.log('🗑️  Удаляем существующие кемпинги...');
        await Campground.deleteMany({});
        console.log('✅ Кемпинги удалены');
        
        // Находим или создаем тестового пользователя
        console.log('👤 Проверяем наличие пользователя...');
        let user = await User.findOne();
        if (!user) {
            console.log('👤 Создаем тестового пользователя...');
            user = new User({
                email: 'test@test.com',
                username: 'testuser'
            });
            await User.register(user, 'testpassword');
            console.log('✅ Тестовый пользователь создан');
        } else {
            console.log('✅ Найден существующий пользователь');
        }

        console.log('🏕️  Создаем 50 кемпингов...');
        for (let i = 0; i < 50; i++) {
            const random1000 = Math.floor(Math.random() * 1000);
            const price = Math.floor(Math.random() * 20) + 10;
            
            // Получаем случайное изображение
            const imgUrl = await seedImg();
            
            const camp = new Campground({
                author: user._id,
                location: `${cities[random1000].city}, ${cities[random1000].state}`,
                title: `${sample(descriptors)} ${sample(places)}`,
                description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quibusdam dolores, perferendis accusamus repellat reprehenderit minima delectus nihil commodi alias similique corrupti, pariatur esse at architecto inventore! Velit, animi. Saepe, rem.',
                price,
                geometry: {
                    type: "Point",
                    coordinates: [
                        cities[random1000].longitude,
                        cities[random1000].latitude
                    ]
                },
                images: [
                    {
                        url: imgUrl,
                        filename: `YelpCamp/sample_${i}`
                    }
                ]
            });

            await camp.save();
            
            if ((i + 1) % 10 === 0) {
                console.log(`✅ ${i + 1} кемпингов создано...`);
            }
        }
        
        console.log('🎉 Все 50 кемпингов успешно созданы!');
    } catch (err) {
        console.error('💥 Критическая ошибка:', err);
        throw err;
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Соединение с БД закрыто');
    }
};

// Запускаем с обработкой ошибок
seedDB()
    .then(() => {
        console.log('✨ Скрипт завершен успешно');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Скрипт завершился с ошибкой:', err);
        process.exit(1);
    });