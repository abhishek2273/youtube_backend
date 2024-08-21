import mongoose from "mongoose";

const ConnectDb = async (req, res) => {
    try {
        const connect = await mongoose.connect(`${process.env.DataBase}`)
        console.log(`Database is connected ${connect.connection.name}`);
    } catch (error) {
        console.log('MongoDB connection error', error);
        process.exit(1);
    }
}

export default ConnectDb;