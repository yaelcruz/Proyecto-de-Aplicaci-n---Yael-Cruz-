"use strict";
// Backend sin dependencias: sirve la carpeta public/ y expone una API JSON.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PUERTO = process.env.PORT || 3000;
const PUBLICO = path.join(__dirname, "public");
const ARCHIVO_DATOS = path.join(__dirname, "datos", "comentarios.json");

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function leerComentarios() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_DATOS, "utf8"));
  } catch {
    return [];
  }
}

function guardarComentarios(lista) {
  fs.mkdirSync(path.dirname(ARCHIVO_DATOS), { recursive: true });
  fs.writeFileSync(ARCHIVO_DATOS, JSON.stringify(lista, null, 2));
}

function responderJSON(res, codigo, cuerpo) {
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(cuerpo));
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let datos = "";
    req.on("data", (trozo) => {
      datos += trozo;
      if (datos.length > 10_000) { reject(new Error("Cuerpo demasiado grande")); req.destroy(); }
    });
    req.on("end", () => resolve(datos));
    req.on("error", reject);
  });
}

async function manejarApi(req, res) {
  if (req.method === "GET") {
    return responderJSON(res, 200, leerComentarios().reverse());
  }
  if (req.method === "POST") {
    let entrada;
    try {
      entrada = JSON.parse(await leerCuerpo(req));
    } catch {
      return responderJSON(res, 400, { error: "Los datos enviados no son válidos." });
    }
    const nombre = String(entrada.nombre ?? "").trim();
    const animal = String(entrada.animal ?? "").trim();
    const comentario = String(entrada.comentario ?? "").trim();

    if (!nombre || nombre.length > 40) {
      return responderJSON(res, 400, { error: "El nombre es obligatorio (máx. 40 caracteres)." });
    }
    if (!comentario || comentario.length > 500) {
      return responderJSON(res, 400, { error: "El comentario es obligatorio (máx. 500 caracteres)." });
    }
    if (animal.length > 60) {
      return responderJSON(res, 400, { error: "La sugerencia es demasiado grande" });
    }

    const lista = leerComentarios();
    lista.push({ nombre, animal, comentario, fecha: new Date().toISOString() });
    guardarComentarios(lista);
    return responderJSON(res, 201, { ok: true });
  }
  responderJSON(res, 405, { error: "Método no permitido." });
}

function servirEstatico(req, res) {
  const ruta = new URL(req.url, "http://localhost").pathname;
  const relativa = ruta === "/" ? "MetalyNarrativaEstructura.html" : decodeURIComponent(ruta).replace(/^\/+/, "");
  const archivo = path.join(PUBLICO, relativa);

  // Impide salir de public/ (por ejemplo con ../)
  if (!archivo.startsWith(PUBLICO + path.sep)) {
    res.writeHead(403); return res.end("Prohibido");
  }
  fs.readFile(archivo, (error, contenido) => {
    if (error) { res.writeHead(404); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
    res.end(contenido);
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith("/api/comentarios")) return manejarApi(req, res);
  servirEstatico(req, res);
}).listen(PUERTO, () => console.log(`Servidor en http://localhost:${PUERTO}`));
