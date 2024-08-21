import dotenv from 'dotenv'
import ConnectDb from "./src/database/DB.js"
import { app } from './index.js'

dotenv.config()

const PORT = process.env.PORT || 3000

ConnectDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running at PORT ${PORT}`);
        })
    })
    .catch((err) => {
        console.log('Mongodb cnnection failed', err);
    })