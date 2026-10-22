export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { liga = "brasileirao" } = req.query;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY não encontrada nas variáveis da Vercel." });
  }

  const nomesLigas = {
    brasileirao: "Brasileirão Série A 2026",
    champions: "UEFA Champions League 2026",
    premier: "Premier League 2026",
  };

  const nomeLiga = nomesLigas[liga] || "Brasileirão Série A 2026";

  const prompt = `Pesquise no Google o histórico acumulado desde a Rodada 1 até hoje e os próximos 10 jogos da competição "${nomeLiga}".
  Retorne APENAS um JSON válido no seguinte formato exato, sem textos adicionais ou marcações markdown:
  {
    "partidas": [
      {
        "id": "jogo-1",
        "leagueName": "${nomeLiga}",
        "date": "Data e Hora",
        "venue": "Estádio, Cidade",
        "exp_home": 1.8,
        "exp_away": 1.1,
        "home": { "name": "Time Mandante", "badge": "https://media.api-sports.io/football/teams/127.png" },
        "away": { "name": "Time Visitante", "badge": "https://media.api-sports.io/football/teams/121.png" },
        "predictedScore": "2 - 1",
        "metrics": {
          "shots": { "home": 14.5, "away": 11.0, "max": 22 },
          "shotsOnTarget": { "home": 5.5, "away": 4.0, "max": 10 },
          "corners": { "home": 6.5, "away": 4.5, "max": 12 },
          "fouls": { "home": 13.0, "away": 14.0, "max": 22 },
          "yellowCards": { "home": 2.1, "away": 2.5, "max": 6 },
          "redCards": { "home": 0.1, "away": 0.2, "max": 2 }
        }
      }
    ]
  }
  Calcule "exp_home" e "exp_away" com base na média real de gols marcados e sofridos por cada equipe desde a Rodada 1.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
        }),
      }
    );

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);

    return res.status(200).json({ status: "success", partidas: parsedData.partidas || [] });
  } catch (err) {
    console.error("Erro na requisição Gemini:", err);
    return res.status(500).json({ error: "Falha ao processar os dados com o Gemini", details: err.message });
  }
}
