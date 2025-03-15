import { writeFile, readFile } from 'fs/promises';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data", "links.json");

const serveFile = async (res, filepath, contentType) => {
    try {
        const data = await readFile(filepath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    } catch (error) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("404 Page Not Found");
    }
};

const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({})); // Fix: Use fs/promises
            return {};
        }
        throw error;
    }
};

const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links, null, 2)); // Add spacing for readability
};

const server = createServer(async (req, res) => {
    if (req.method === "GET") {
        if (req.url === '/') {
            return serveFile(res, path.join(__dirname, "public", "index.html"), "text/html");
        } else if (req.url === '/style.css') {
            return serveFile(res, path.join(__dirname, "public", "style.css"), "text/css");
        }
    }
   

    if (req.method === 'POST' && req.url === '/shorten') {
        const links = await loadLinks();
        let body = "";

        req.on('data', (chunk) => {
            body += chunk;
            console.log(JSON.parse(chunk))
        });

        req.on('end', async () => {
          console.log(body)
            try {
                const { url, shortcode } = JSON.parse(body);
                if (!url) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "URL is required." }));
                }

                const finalShortcode = shortcode || crypto.randomBytes(4).toString("hex");

                if (links[finalShortcode]) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "Short code already exists. Please choose another." }));
                }

                links[finalShortcode] = url;
                await saveLinks(links);
                console.log(links)

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true, shortcode: finalShortcode }));
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        });
    }
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
