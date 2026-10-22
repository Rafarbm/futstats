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
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada na Vercel." });
  }

  const nomesLigas = {
    brasileirao: "Brasileirão Série A 2026",
    champions: "UEFA Champions League 2026",
    premier: "Premier League 2026",
  };

  const nomeLiga = nomesLigas[liga] || "Brasileirão Série A 2026";

  const prompt = `Considere a competição de futebol "${nomeLiga}".
Pesquise as informações mais recentes das partidas atuais e próximas rodadas.
Retorne APENAS um objeto JSON válido (sem blocos de código markdown ou texto antes/depois) exatamente nesta estrutura:

{
  "partidas": [
    {
      "id": "jogo-1",
      "leagueName": "${nomeLiga}",
      "date": "SÁB., 24/10 • 16:30",
      "venue": "Estádio Exemplo, Cidade",
      "exp_home": 1.7,
      "exp_away": 1.1,
      "predictedScore": "2 - 1",
      "home": { "name": "Time Mandante", "badge": "https://media.api-sports.io/football/teams/127.png" },
      "away": { "name": "Time Visitante", "badge": "https://media.api-sports.io/football/teams/121.png" },
      "metrics": {
        "shots": { "home": 14.5, "away": 11.0, "max": 22 },
        "shotsOnTarget": { "home": 5.5, "away": 4.0, "max": 10 },
        "corners": { "home": 6.5, "away": 4.5, "max": 12 },
        "fouls": { "home": 13.0, "away": 14.0, "max": 22 },
        "yellowCards": { "home": 2.1, "away": 2.5, "max": 6 },
        "redCards": { "home": 0.1, "away": 0.2, "max": 2 }
      },
      "goalscorers": [
        { "name": "Atacante Principal", "team": "Time Mandante", "pos": "ATA", "prob": 55, "teamType": "home" },
        { "name": "Meia Atacante", "team": "Time Visitante", "pos": "MEI", "prob": 38, "teamType": "away" }
      ],
      "assists": [
        { "name": "Líder em Assistências", "team": "Time Mandante", "pos": "MEI", "prob": 45, "teamType": "home" }
      ]
    }
  ]
}

Gere pelo menos 5 partidas reais ou projetadas para a liga solicitada.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }]
      }),
    });

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extrai o bloco de JSON do texto bruto gerado pelo modelo
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    let parsedData = { partidas: [] };

    if (jsonMatch) {
      try {
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.error("Erro no JSON.parse:", parseErr, rawText);
      }
    }

    return res.status(200).json({
      status: "success",
      partidas: parsedData.partidas || []
    });
  } catch (err) {
    console.error("Erro geral na API:", err);
    return res.status(500).json({ status: "error", error: err.message, partidas: [] });
  }
}
