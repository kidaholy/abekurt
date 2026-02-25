import { signToken } from "./lib/auth";
import * as dotenv from "dotenv";

dotenv.config();

const token = signToken({
    id: "60c72b2f9b1d8b0015b6d5f7",
    email: "kidayos2014@gmail.com",
    role: "admin"
});

const endpoints = [
    "http://localhost:3001/api/stock",
    "http://localhost:3001/api/admin/expenses",
    "http://localhost:3001/api/categories?type=stock",
    "http://localhost:3001/api/categories?type=fixed-asset",
    "http://localhost:3001/api/fixed-assets"
];

const headers = { Authorization: `Bearer ${token}` };

Promise.all(endpoints.map(url =>
    fetch(url, { headers })
        .then(res => res.text().then(text => console.log(`[${res.status}] ${url}: ${text.substring(0, 100)}`)))
        .catch(err => console.error(`[ERROR] ${url}:`, err.message))
)).then(() => console.log("All done."));
