# CertifAI - Happy Path

Objetivo: probar el flujo actual de intake, assessment, resultado, badge y verificacion publica.

## 1. Levantar la aplicacion

Desde la raiz:

```bash
npm run install:all
npm run dev:all
```

Abre `http://localhost:5173`. El backend debe responder en `http://localhost:3001/api/health`.

## 2. Intake

1. Abre `/start`.
2. Captura organizacion, correo de trabajo y rol.
3. Selecciona `Tier 2 - Evidence & Badge`.
4. Inicia el assessment.

Ir directamente a `/assess` o `/results` sin completar el intake debe redirigir a `/start`.

## 3. Assessment

1. Responde las 36 preguntas en escala 0-5.
2. Agrega evidencia al menos a una respuesta para probar el flujo actual de Tier 2.
3. Comprueba que la firma permanezca bloqueada mientras falte una pregunta.
4. Finaliza el assessment.

El frontend muestra un preview inmediato. Todavia no existe badge hasta enviar la autocertificacion al backend.

## 4. Resultado y badge

1. En `/results`, escribe el nombre del firmante.
2. Pulsa `Sign & submit for certification`.
3. El frontend sincroniza las respuestas y llama a `POST /api/assessments/:id/result`.
4. El backend vuelve a comprobar finalizacion, evidencia y controles criticos, guarda el resultado y emite el badge si el nivel es elegible.

Resultado esperado:

- Score general de 0 a 100.
- 9 resultados por dominio.
- Nivel Aware, Aligned, Assured o Advanced.
- Badge solamente para Aligned, Assured o Advanced en Tier 2 completo.
- Token y enlace `http://localhost:3001/verify/<token>` cuando se emite un badge.

## 5. Pruebas de gates

- Deja una pregunta sin contestar: no debe permitir firmar ni registrar un nivel final.
- Asigna score 1 a Q17, Q18 o Q26: el resultado debe quedar limitado a Aware.
- Usa Tier 1/free: no debe emitirse badge.
- Llama directamente a `POST /api/assessments/:id/badges` antes de registrar un resultado: debe rechazarse.
- Solicita a `/badges` un tier distinto del almacenado: debe usarse el tier guardado.

## 6. Verificacion publica

Con el token devuelto:

```bash
curl http://localhost:3001/api/badges/<token>/verify
```

Abre tambien:

```text
http://localhost:3001/verify/<token>
```

La pagina debe mostrar una credencial publicamente verificable, el score 0-100, nivel, fechas y token. Un badge Aware, un tier desconocido, un score invalido o un token vencido/no existente no deben mostrar una credencial verificada.

## 7. Prueba automatizada disponible

Con el backend en ejecucion:

```powershell
cd backend
.\TEST_HAPPY_PATH.ps1
```

Los scripts actuales usan 36 preguntas y `POST /assessments/:id/result`; no usan el endpoint retirado `compute-score`.

## 8. Antes de la demo

- Limpia el almacenamiento local del navegador para evitar respuestas de versiones anteriores.
- Ejecuta `npm test`.
- Ejecuta `npm run build`.
- No presentes JWT, IA, pagos o scoring completamente server-side como funciones implementadas.
- No afirmes que todas las mutaciones tienen auditoria.
