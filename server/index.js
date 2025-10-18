/* eslint-env node */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const app = express();

app.use(express.static(distDir));

app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number.parseInt(4006, 10);

app.listen(port, () => {
    console.log(`🚀 Production server ready at http://0.0.0.0:${port}`);
});
