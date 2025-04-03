import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import cors from 'cors';

const app = express();
const PORT = 3000;
const API_ENDPOINT = 'https://api-eu.libreview.io';

app.use(cors()); // Sta cross-origin requests toe
app.use(express.json()); // Voor JSON-parsing

let headers = {
    'accept-encoding': 'gzip, deflate, br',
    'cache-control': 'no-cache',
    'connection': 'Keep-Alive',
    'content-type': 'application/json',
    'product': 'llu.ios',
    'version': '4.12.0'
};

// Functie om een string om te zetten naar SHA-256 hash
function toSha256(inputValue) {
    return crypto.createHash('sha256').update(inputValue).digest('hex');
}

// Ophalen en opslaan van token
async function setToken(email, password) {
    try {
        const loginData = { email, password };
        const response = await axios.post(`${API_ENDPOINT}/llu/auth/login`, loginData, { headers });

        const data = response.data;
        const JWT_TOKEN = data.data.authTicket.token;
        const libreId = data.data.user.id;
        const hashedLibreId = toSha256(libreId);

        headers = {
            ...headers,
            'authorization': `Bearer ${JWT_TOKEN}`,
            'Account-Id': hashedLibreId
        };

        console.log("Token ingesteld en headers bijgewerkt!");
    } catch (error) {
        console.error("Fout bij inloggen:", error.response ? error.response.data : error.message);
    }
}

// Ophalen van patiënt-ID
async function getPatientId() {
    try {
        const response = await axios.get(`${API_ENDPOINT}/llu/connections`, { headers });
        return response.data.data[0].patientId;
    } catch (error) {
        console.error("Fout bij ophalen van patiënt-ID:", error.response ? error.response.data : error.message);
    }
}

// Ophalen van glucosewaarde en trendarrow
async function getData(patientId) {
    try {
        const response = await axios.get(`${API_ENDPOINT}/llu/connections/${patientId}/graph`, { headers });
        const data = response.data.data.connection;

        return {
            firstName: data.firstName,
            lastName: data.lastName,
            glucose: data.glucoseMeasurement.Value,
            trendArrow: data.glucoseMeasurement.TrendArrow,
            timestamp: data.glucoseMeasurement.Timestamp // Laatste metingstijd
        };
    } catch (error) {
        console.error("Fout bij ophalen van gegevens:", error.response ? error.response.data : error.message);
    }
}


// API-endpoint voor glucosewaarden en trendpijl
app.get('/glucose', async (req, res) => {
    try {
        const patientId = await getPatientId();
        if (patientId) {
            const glucoseData = await getData(patientId);
            res.json(glucoseData);
        } else {
            res.status(500).json({ error: "Geen patiënt-ID gevonden." });
        }
    } catch (error) {
        res.status(500).json({ error: "Fout bij ophalen van data." });
    }
});

// Server starten
app.listen(PORT, async () => {
    await setToken('', '');
    console.log(`Server draait op http://localhost:${PORT}`);
});
