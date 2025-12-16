import "./config/env";
import express, { json } from "express";
import { db } from "./database/db";
import { routes } from "./routes";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(`${__dirname}../..uploads`))
app.use(express.static(`${__dirname}../../public`))
app.use(cors());
app.use(morgan("dev"));
app.use(routes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  // await db.sync();
  console.log(`Nthuso Server is running on PORT ${PORT}`);
});
