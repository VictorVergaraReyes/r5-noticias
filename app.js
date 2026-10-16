// API gratuita y sin clave: https://api.spaceflightnewsapi.net/v4/docs/
const API_URL = "https://api.spaceflightnewsapi.net/v4/articles/";
const LIMITE = 12;

const contenedor = document.getElementById("noticias");
const estado = document.getElementById("estado");
const btnRefrescar = document.getElementById("btn-refrescar");
const formBusqueda = document.getElementById("form-busqueda");
const inputBusqueda = document.getElementById("busqueda");

const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const modalMeta = document.getElementById("modal-meta");
const modalTitulo = document.getElementById("modal-titulo");
const modalResumen = document.getElementById("modal-resumen");
const modalEnlace = document.getElementById("modal-enlace");

let noticiasActuales = [];

function mostrarEstado(texto, esError = false) {
  estado.textContent = texto;
  estado.classList.toggle("error", esError);
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

async function obtenerNoticias(busqueda = "") {
  const params = new URLSearchParams({ limit: LIMITE });
  if (busqueda) params.set("search", busqueda);

  const respuesta = await fetch(`${API_URL}?${params}`);
  if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
  const datos = await respuesta.json();
  return datos.results || [];
}

function crearTarjeta(noticia, indice) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta";

  const img = document.createElement("img");
  img.src = noticia.image_url;
  img.alt = "";
  img.loading = "lazy";
  img.onerror = () => img.remove();

  const cuerpo = document.createElement("div");
  cuerpo.className = "tarjeta__cuerpo";

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `${noticia.news_site} · ${formatearFecha(noticia.published_at)}`;

  const h2 = document.createElement("h2");
  const titulo = document.createElement("button");
  titulo.type = "button";
  titulo.textContent = noticia.title;
  titulo.addEventListener("click", () => abrirModal(indice));
  h2.append(titulo);

  const resumen = document.createElement("p");
  resumen.className = "resumen";
  const texto = noticia.summary || "";
  resumen.textContent = texto.length > 130 ? texto.slice(0, 130) + "…" : texto;

  cuerpo.append(meta, h2, resumen);
  tarjeta.append(img, cuerpo);
  return tarjeta;
}

function renderizar(noticias) {
  contenedor.replaceChildren(...noticias.map(crearTarjeta));
}

async function cargarNoticias() {
  const busqueda = inputBusqueda.value.trim();
  btnRefrescar.disabled = true;
  mostrarEstado("Cargando noticias…");
  contenedor.replaceChildren();

  try {
    noticiasActuales = await obtenerNoticias(busqueda);
    if (noticiasActuales.length === 0) {
      mostrarEstado("No hay noticias disponibles para tu búsqueda.");
      return;
    }
    renderizar(noticiasActuales);
    mostrarEstado(`Actualizado a las ${new Date().toLocaleTimeString("es-MX")} · ${noticiasActuales.length} noticias`);
  } catch (error) {
    console.error(error);
    mostrarEstado("No se pudieron cargar las noticias. La API no está disponible o no hay conexión. Intenta refrescar.", true);
  } finally {
    btnRefrescar.disabled = false;
  }
}

function abrirModal(indice) {
  const n = noticiasActuales[indice];
  modalImg.src = n.image_url;
  modalImg.hidden = !n.image_url;
  modalMeta.textContent = `${n.news_site} · ${formatearFecha(n.published_at)}`;
  modalTitulo.textContent = n.title;
  modalResumen.textContent = n.summary;
  modalEnlace.href = n.url;
  modal.hidden = false;
  document.getElementById("modal-cerrar").focus();
}

function cerrarModal() {
  modal.hidden = true;
}

document.getElementById("modal-cerrar").addEventListener("click", cerrarModal);
modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });

btnRefrescar.addEventListener("click", cargarNoticias);
formBusqueda.addEventListener("submit", (e) => { e.preventDefault(); cargarNoticias(); });

cargarNoticias();
