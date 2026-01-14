
import { describe, expect, test } from "bun:test";

const BASE_URL = "http://localhost:3000";

console.log("🔍 Checking Backend at", BASE_URL);

async function check() {
    // 1. Check Root
    try {
        const res = await fetch(BASE_URL + "/");
        console.log(`GET / status: ${res.status}`);
    } catch (e) {
        console.error("GET / failed:", e);
    }

    // 2. Check OPTIONS /auth/login
    try {
        const res = await fetch(BASE_URL + "/auth/login", { method: "OPTIONS" });
        console.log(`OPTIONS /auth/login status: ${res.status}`);
        console.log(`Headers:`, [...res.headers.entries()]);
    } catch (e) {
        console.error("OPTIONS /auth/login failed:", e);
    }

    // 3. Check POST /auth/login
    try {
        const res = await fetch(BASE_URL + "/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "admin", password: "password" })
        });
        console.log(`POST /auth/login status: ${res.status}`);
        const body = await res.text();
        console.log(`POST body:`, body);
    } catch (e) {
        console.error("POST /auth/login failed:", e);
    }
}

check();
