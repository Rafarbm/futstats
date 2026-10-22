export default async function handler(req, res) {
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
    return res.status(500).json({ error: "GEMINI_API_KEY não encontrada." });
  }

  const nomesLigas = {
    brasileirao: "Brasileirão Série A 2026",
    champions: "UEFA Champions League 2026",
    premier: "Premier League 2026",
  };

  const nomeLiga = nomesLigas[liga] || "Brasileirão Série A 2026";

  const prompt = `Gere os próximos 10 jogos e estatísticas de Poisson para a competição "${nomeLiga}".
Retorne estritamente um JSON no seguinte formato (sem texto antes ou depois):
{
  "partidas": [
    {
      "id": "jogo-1",
      "leagueName": "${nomeLiga}",
      "date": "SÁB., 24/10 • 16:30",
      "venue": "Estádio Principal",
      "exp_home": 1.7,
      "exp_away": 1.1,
      "predictedScore": "2 - 1",
      "home": { "name": "Flamengo", "badge": "https://media.api-sports.io/football/teams/127.png" },
      "away": { "name": "Palmeiras", "badge": "https://media.api-sports.io/football/teams/121.png" },
      "metrics": {
        "shots": { "home": 14.5, "away": 11.0, "max": 22 },
        "shotsOnTarget": { "home": 5.5, "away": 4.0, "max": 10 },
        "corners": { "home": 6.5, "away": 4.5, "max": 12 },
        "fouls": { "home": 13.0, "away": 14.0, "max": 22 },
        "yellowCards": { "home": 2.1, "away": 2.5, "max": 6 },
        "redCards": { "home": 0.1, "away": 0.2, "max": 2 }
      },
      "goalscorers": [
        { "name": "Pedro", "team": "Flamengo", "pos": "ATA", "prob": 58, "teamType": "home" },
        { "name": "Veiga", "team": "Palmeiras", "pos": "MEI", "prob": 42, "teamType": "away" }
      ],
      "assists": [
        { "name": "Arrascaeta", "team": "Flamengo", "pos": "MEI", "prob": 48, "teamType": "home" }
      ]
    }
  ]
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extração limpa do bloco JSON
    const cleanText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    let parsedData = { partidas: [] };
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0]);
    }

    return res.status(200).json({
      status: "success",
      partidas: parsedData.partidas || []
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
