const mongoose = require('mongoose');
const Campground = require('./models/campground');

mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
    console.log('Database connected - Replacing Cloudinary URLs...\n');
    
    try {
        const campgrounds = await Campground.find({});
        
        let updatedCount = 0;
        
        for (let camp of campgrounds) {
            // Заменяем все Cloudinary URLs на working default image
            const newImages = camp.images.map(img => ({
                url: 'https://res.cloudinary.com/douqbebwk/image/upload/v1600103881/YelpCamp/lz8jjv2gyynjil7lswf4.png',
                filename: 'YelpCamp/lz8jjv2gyynjil7lswf4'
            }));
            
            await Campground.findByIdAndUpdate(
                camp._id,
                { images: newImages },
                { runValidators: false }
            );
            
            updatedCount++;
            console.log(`✅ Updated: ${camp.title}`);
        }
        
        console.log(`\n🎉 Updated ${updatedCount} campgrounds with working images`);
        mongoose.connection.close();
        
    } catch (error) {
        console.error('Error:', error);
        mongoose.connection.close();
    }
});