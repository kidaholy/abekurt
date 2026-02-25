import { signToken } from "./lib/auth";
import * as dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const token = signToken({
    id: "60c72b2f9b1d8b0015b6d5f7",
    email: "kidayos2014@gmail.com",
    role: "admin"
});

console.log("Generated Token:", token);

fetch("http://localhost:3001/api/categories?type=fixed-asset", {
    headers: { Authorization: `Bearer ${token}` }
})
    .then(res => res.text().then(text => console.log(res.status, text)))
    .catch(err => console.error("Fetch failed:", err));
