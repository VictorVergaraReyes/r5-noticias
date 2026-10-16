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

let paginaActual = 1;
let totalPaginas = 1;

async function obtenerNoticias(busqueda = "", pagina = 1) {
  const params = new URLSearchParams({ limit: LIMITE, offset: (pagina - 1) * LIMITE });
  if (busqueda) params.set("search", busqueda);

  const respuesta = await fetch(`${API_URL}?${params}`);
  if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
  const datos = await respuesta.json();
  return { noticias: datos.results || [], total: datos.count || 0 };
}

/* ---------- Paginación ---------- */
const paginacion = document.getElementById("paginacion");
const pagPrev = document.getElementById("pag-prev");
const pagNext = document.getElementById("pag-next");
const pagNumeros = document.getElementById("pag-numeros");

function paginasVisibles() {
  // Primera, última y las cercanas a la actual; los huecos se marcan con null
  const set = new Set([1, totalPaginas, paginaActual - 1, paginaActual, paginaActual + 1]);
  const lista = [...set].filter((p) => p >= 1 && p <= totalPaginas).sort((a, b) => a - b);
  const resultado = [];
  lista.forEach((p, i) => {
    if (i > 0 && p - lista[i - 1] > 1) resultado.push(null);
    resultado.push(p);
  });
  return resultado;
}

function renderizarPaginacion() {
  paginacion.hidden = totalPaginas <= 1;
  pagPrev.disabled = paginaActual <= 1;
  pagNext.disabled = paginaActual >= totalPaginas;
  pagNumeros.replaceChildren(...paginasVisibles().map((p) => {
    if (p === null) {
      const s = document.createElement("span");
      s.className = "puntos";
      s.textContent = "…";
      return s;
    }
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = p;
    if (p === paginaActual) {
      b.classList.add("actual");
      b.setAttribute("aria-current", "page");
    }
    b.addEventListener("click", () => irAPagina(p));
    return b;
  }));
}

function irAPagina(p) {
  if (p < 1 || p > totalPaginas || p === paginaActual) return;
  paginaActual = p;
  cargarNoticias();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

pagPrev.addEventListener("click", () => irAPagina(paginaActual - 1));
pagNext.addEventListener("click", () => irAPagina(paginaActual + 1));

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
  renderizarHero(noticias);
}

/* ---------- Hero con carrusel ---------- */
const HERO_CANTIDAD = 5;
const HERO_INTERVALO = 6000;
const hero = document.getElementById("hero");
const heroPistas = document.getElementById("hero-pistas");
const heroPuntos = document.getElementById("hero-puntos");
let heroIndice = 0;
let heroTotal = 0;
let heroTimer = null;

function crearSlide(noticia, indice) {
  const slide = document.createElement("div");
  slide.className = "hero__slide";
  slide.setAttribute("role", "group");
  slide.setAttribute("aria-roledescription", "diapositiva");
  if (noticia.image_url) slide.style.backgroundImage = `url("${noticia.image_url}")`;

  const texto = document.createElement("div");
  texto.className = "hero__texto";

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `Destacada · ${noticia.news_site} · ${formatearFecha(noticia.published_at)}`;

  const h2 = document.createElement("h2");
  const titulo = document.createElement("button");
  titulo.type = "button";
  titulo.textContent = noticia.title;
  titulo.addEventListener("click", () => abrirModal(indice));
  h2.append(titulo);

  const resumen = document.createElement("p");
  resumen.className = "resumen";
  const s = noticia.summary || "";
  resumen.textContent = s.length > 180 ? s.slice(0, 180) + "…" : s;

  texto.append(meta, h2, resumen);
  slide.append(texto);
  return slide;
}

function irASlide(i) {
  if (heroTotal === 0) return;
  heroIndice = (i + heroTotal) % heroTotal;
  heroPistas.style.transform = `translateX(-${heroIndice * 100}%)`;
  [...heroPuntos.children].forEach((p, n) => p.classList.toggle("activo", n === heroIndice));
}

function iniciarAutoplay() {
  detenerAutoplay();
  if (heroTotal > 1) heroTimer = setInterval(() => irASlide(heroIndice + 1), HERO_INTERVALO);
}

function detenerAutoplay() {
  clearInterval(heroTimer);
  heroTimer = null;
}

function renderizarHero(noticias) {
  const destacadas = noticias.slice(0, HERO_CANTIDAD);
  heroTotal = destacadas.length;
  heroPistas.replaceChildren(...destacadas.map(crearSlide));
  heroPuntos.replaceChildren(...destacadas.map((_, n) => {
    const punto = document.createElement("button");
    punto.type = "button";
    punto.className = "hero__punto";
    punto.setAttribute("aria-label", `Ir a la noticia ${n + 1}`);
    punto.addEventListener("click", () => { irASlide(n); iniciarAutoplay(); });
    return punto;
  }));
  hero.hidden = false;
  irASlide(0);
  iniciarAutoplay();
}

document.getElementById("hero-prev").addEventListener("click", () => { irASlide(heroIndice - 1); iniciarAutoplay(); });
document.getElementById("hero-next").addEventListener("click", () => { irASlide(heroIndice + 1); iniciarAutoplay(); });
hero.addEventListener("mouseenter", detenerAutoplay);
hero.addEventListener("mouseleave", iniciarAutoplay);

async function cargarNoticias() {
  const busqueda = inputBusqueda.value.trim();
  btnRefrescar.disabled = true;
  mostrarEstado("Cargando noticias…");
  contenedor.replaceChildren();
  hero.hidden = true;
  detenerAutoplay();

  try {
    const { noticias, total } = await obtenerNoticias(busqueda, paginaActual);
    noticiasActuales = noticias;
    totalPaginas = Math.max(1, Math.ceil(total / LIMITE));
    if (noticiasActuales.length === 0) {
      paginacion.hidden = true;
      mostrarEstado("No hay noticias disponibles para tu búsqueda.");
      return;
    }
    renderizar(noticiasActuales);
    renderizarPaginacion();
    mostrarEstado(`Página ${paginaActual} de ${totalPaginas} · ${total} noticias · actualizado a las ${new Date().toLocaleTimeString("es-MX")}`);
  } catch (error) {
    console.error(error);
    paginacion.hidden = true;
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
formBusqueda.addEventListener("submit", (e) => { e.preventDefault(); paginaActual = 1; cargarNoticias(); });

cargarNoticias();
