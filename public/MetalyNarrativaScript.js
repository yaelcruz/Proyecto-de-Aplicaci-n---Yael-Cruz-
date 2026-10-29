"use strict";

const form = document.getElementById("formulario");
const lista = document.getElementById("lista-comentarios");
const estado = document.getElementById("estado");
const boton = document.getElementById("enviar");
const campoNombre = document.getElementById("nombre");
const campoComentario = document.getElementById("comentario");
const contador = document.getElementById("contador");

function mostrarComentarios(comentarios) {
  lista.replaceChildren();
  if (comentarios.length === 0) {
    const vacio = document.createElement("li");
    vacio.className = "vacio";
    vacio.textContent = "Todavía no hay comentarios. Sé la primera persona en escribir uno.";
    lista.append(vacio);
    return;
  }
  for (const c of comentarios) {
    const li = document.createElement("li");

    const autor = document.createElement("span");
    autor.className = "autor";
    autor.textContent = c.nombre;

    const meta = document.createElement("span");
    meta.className = "meta";
    const fecha = new Date(c.fecha).toLocaleDateString("es-CO", { dateStyle: "medium" });
    meta.textContent = ` · ${fecha}` + (c.animal ? ` · sugiere: ${c.animal}` : "");

    const texto = document.createElement("p");
    texto.textContent = c.comentario; // textContent evita inyección de HTML

    li.append(autor, meta, texto);
    lista.append(li);
  }
}

async function cargarComentarios() {
  try {
    const respuesta = await fetch("/api/comentarios");
    if (!respuesta.ok) throw new Error();
    mostrarComentarios(await respuesta.json());
  } catch {
    lista.replaceChildren();
    const li = document.createElement("li");
    li.className = "vacio";
    li.textContent = "No se pudieron cargar los comentarios. Revisa que el servidor esté activo.";
    lista.append(li);
  }
}

function validar() {
  let valido = true;
  const reglas = [
    [campoNombre, "error-nombre", "Escribe tu nombre."],
    [campoComentario, "error-comentario", "Escribe un comentario."],
  ];
  for (const [campo, idError, mensaje] of reglas) {
    const vacio = campo.value.trim() === "";
    document.getElementById(idError).textContent = vacio ? mensaje : "";
    campo.setAttribute("aria-invalid", vacio);
    if (vacio) valido = false;
  }
  return valido;
}

function ponerEstado(texto, clase) {
  estado.textContent = texto;
  estado.className = "estado " + clase;
}

campoComentario.addEventListener("input", () => {
  contador.textContent = `${campoComentario.value.length} / 500`;
});

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  ponerEstado("", "");
  if (!validar()) return;

  boton.disabled = true;
  try {
    const respuesta = await fetch("/api/comentarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: campoNombre.value.trim(),
        animal: document.getElementById("animal").value.trim(),
        comentario: campoComentario.value.trim(),
      }),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error || "Error al guardar.");

    form.reset();
    contador.textContent = "0 / 500";
    ponerEstado("Comentario publicado.", "ok");
    await cargarComentarios();
  } catch (error) {
    ponerEstado(error.message, "fallo");
  } finally {
    boton.disabled = false;
  }
});

cargarComentarios();
