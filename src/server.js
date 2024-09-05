
 import dotenv from 'dotenv'
 dotenv.config();
 import express from 'express'
import cors from 'cors'
import morgan from 'morgan';
 import cookieParser from 'cookie-parser';  
import {errorHandler,notFoundRoute} from "./middlewares/error-Handling/error-Handling-Middleware.js"
import apiRouter from "./routes/api-routes.js"
import connectMongoDB from './config/mongo-db.js';

////config environment variables


const PORT = process.env.PORT;

////connect MongoDB
connectMongoDB()



const app = express();


////middlewares
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from this origin
    credentials: true, // Enable sending of cookies with requests
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

////Routes

app.use("/v1",apiRouter);


app.get("/",(req,res)=>{
    
    res.json({
        message:"Server is Running"
    })
});

////Notfound page handler

app.use(notFoundRoute);

////error handling middleware

app.use(errorHandler);


app.listen(PORT,()=>{
    console.log(`Server is Running http://localhost:${PORT}`); 
    
})