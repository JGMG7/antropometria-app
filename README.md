# Antropometría — Composición corporal y somatotipo

Progressive Web App (PWA) para el cálculo de composición corporal y somatotipo
(método Heath-Carter) a partir de datos antropométricos, basada en el protocolo
de cátedra del Grupo de Investigación Biofísica y Bioquímica del Ejercicio,
ISEF-CURE (Universidad de la República, Uruguay).

Funciona enteramente en el navegador (sin backend), guarda los sujetos en el
dispositivo del usuario y funciona sin conexión una vez instalada.

**App en vivo:** https://jgmg7.github.io/antropometria-app/

## Funcionalidades

- Carga de datos básicos, diámetros, perímetros y pliegues cutáneos por sujeto.
- Cálculo automático de: edad, IMC, suma de 6 pliegues, % graso, peso graso,
  peso óseo, peso muscular, peso residual, y somatotipo (endo/meso/ectomorfia
  con coordenadas X/Y).
- Somatocarta con triángulo de Reuleaux, siguiendo la construcción clásica
  (Siders & Rue, 1992).
- Gestión de sujetos guardados (editar, eliminar, exportar a CSV).
- Estadísticos de grupo (promedio, desvío estándar, mediana, máximo, mínimo).
- Informes imprimibles / exportables a PDF (individual y grupal), vía el
  diálogo de impresión nativo del navegador.
- Instalable como app (PWA), con caché offline.

## Métodos y fórmulas utilizadas

| Componente | Método |
|---|---|
| % graso | Faulkner (1968), diferenciado por sexo |
| Peso óseo | Von Döbeln (1964), modificado por Rocha (1974) |
| Peso residual | Würch — 24.1 % hombres, 20.9 % mujeres |
| Composición corporal (4 componentes) | De Rose & Guimarães (1980) |
| Somatotipo | Heath & Carter (Carter, 2002) |
| Somatocarta | Siders & Rue (1992), *Reuleaux triangle somatocharts* |

Ver la sección "Métodos y bibliografía" dentro de la propia app para el
detalle completo de las referencias.

## Uso

La forma más simple es abrir directamente **https://jgmg7.github.io/antropometria-app/**
en el navegador (celular o computadora) e instalarla desde ahí — no requiere
crear cuenta ni instalar nada más.

### Correrla localmente (desarrollo)

No requiere instalación de dependencias ni proceso de build. Es HTML/CSS/JS
puro. Para correrla localmente:

```bash
# desde la carpeta del proyecto
python -m http.server 8123
# abrir http://localhost:8123
```

O simplemente abrir `index.html` en un navegador (algunas funciones de PWA,
como el service worker, requieren servirla por HTTP(S), no `file://`).

## Estructura del proyecto

```
index.html      Estructura de la app
style.css       Estilos (claro/oscuro)
app.js          Lógica: cálculos, almacenamiento, gráfico, impresión
manifest.json   Manifiesto de la PWA
sw.js           Service worker (caché offline)
icons/          Íconos de la PWA
```

## Licencia

Este proyecto está bajo licencia [GPL-3.0-or-later](LICENSE).

## Autoría y cita

**Dr. José Meléndez-Gallardo** — Instituto Superior de Educación Física
(ISEF), Centro Universitario Regional del Este (CURE), Universidad de la
República (UdelaR), Uruguay.

Si usa este software, por favor cítelo (ver [CITATION.cff](CITATION.cff)).

Basada en el protocolo antropométrico usado en:

> Meléndez-Gallardo, J. et al. (2024). Body composition and somatotype of
> child and adolescent athletes from the Sports Swimming School, Campus
> Maldonado, Uruguay. *Journal of Sport and Kinetic Movement*, 43(I), 15–21.
> https://doi.org/10.52846/jskm/43.2024.1.2
