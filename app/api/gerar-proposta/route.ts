import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { descricao } = await request.json();

    if (!descricao || descricao.trim().length < 15) {
      return NextResponse.json(
        { error: 'Por favor, descreve o projeto com mais detalhe.' },
        { status: 400 }
      );
    }

    const prompt = `Tu és um consultor comercial sénior português com vasta experiência na elaboração de propostas claras, profissionais e persuasivas.

Projeto descrito pelo cliente:

"${descricao}"

Escreve uma proposta comercial completa, bem estruturada e persuasiva em português de Portugal.

Regras importantes:
- A introdução deve ser positiva e elegante, sem exageros de entusiasmo (evita frases como "é com grande entusiasmo", "estou muito entusiasmado", etc.).
- Usa "Descrição do Projeto" em vez de "Entendimento do Projeto".
- Usa "Âmbito dos Trabalhos" em vez de "Escopo".
- Mantém a numeração consistente (1., 2., 3., etc.).
- Não uses linhas com "--".
- Não incluas no final da proposta frases como "Com os melhores cumprimentos", "Atenciosamente", "[Seu Nome]", "[Seu Cargo]", "[Nome da Empresa]", "[Telefone]", "[Email]" ou qualquer despedida genérica.
- O texto deve terminar naturalmente após os "Próximos Passos".

Estrutura sugerida:
1. Introdução
2. Descrição do Projeto
3. Âmbito dos Trabalhos
4. Investimento e Condições de Pagamento
5. Prazo de Execução
6. Garantias
7. Próximos Passos

Escreve com boa fluidez, detalhe e linguagem natural.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.68,
      max_tokens: 1650,
    });

    let propostaGerada = completion.choices[0]?.message?.content?.trim() || "Erro ao gerar proposta.";

    // Limpeza simples do final genérico
    propostaGerada = propostaGerada.replace(/Com os melhores cumprimentos[\s\S]*$/i, '').trim();
    propostaGerada = propostaGerada.replace(/Atenciosamente[\s\S]*$/i, '').trim();

    return NextResponse.json({ 
      proposta: propostaGerada,
      sucesso: true 
    });

  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: 'Erro ao gerar a proposta. Tenta novamente.' },
      { status: 500 }
    );
  }
}
