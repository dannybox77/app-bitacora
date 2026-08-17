exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const trabajos = body.trabajos || [];

    if (trabajos.length === 0) {
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto: '[]' })
      };
    }

    const trabajosTexto = trabajos.map((t, i) => {
      return `${i + 1}. "${t.titulo}" — estado: ${t.estado}, prioridad: ${t.prioridad}, avance: ${t.avance}%, entrega: ${t.entrega || 'sin fecha'}${t.desc ? `, descripción: ${t.desc}` : ''}`;
    }).join('\n');

    const prompt = `Eres un asistente de productividad experto en gestión de proyectos. Aquí está la lista de trabajos activos de una persona (no incluye los ya cerrados ni completados):

${trabajosTexto}

Genera un plan de trabajo para HOY, priorizando lo que más lo necesita (trabajos atrasados o urgentes primero, luego los de mayor prioridad, luego los que llevan menos avance relativo al tiempo restante). Para cada trabajo que incluyas, sugiere una acción concreta y específica que la persona pueda hacer hoy para avanzarlo (no genérica como "trabajar en esto", sino algo accionable basado en su descripción y estado). No incluyas más de 5 trabajos en el plan — enfócate en lo más importante del día.

Devuelve ÚNICAMENTE un array JSON válido (sin texto antes ni después, sin markdown), con esta forma exacta:
[
  { "titulo": "título exacto del trabajo tal como aparece arriba", "accion": "acción concreta sugerida para hoy", "motivo": "por qué es prioridad hoy, en pocas palabras" }
]

Responde solo con el JSON.`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error || data }) };
    }

    const texto = (data.content || []).map(b => b.text || '').join('');

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
