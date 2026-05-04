import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/app/lib/supabase/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sectorLabels: Record<string, string> = {
  fotografia: 'Fotografia & Vídeo',
  design: 'Design Gráfico & Branding',
  '3d': '3D & Visualização',
  web: 'Desenvolvimento Web & Digital',
  marketing: 'Marketing & Comunicação',
  arquitetura: 'Arquitetura & Interiores',
  construcao: 'Construção & Renovação',
  consultoria: 'Consultoria de Negócios',
  conteudo: 'Produção de Conteúdo & Copywriting',
  outro: 'Profissional independente',
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  try {
    const { descricao, idioma = 'português', setor = '' } = await request.json();

    if (!descricao || descricao.trim().length < 15) {
      return NextResponse.json({ error: 'Por favor, descreva o projeto com mais detalhe.' }, { status: 400 });
    }

    const sectorContext = setor && sectorLabels[setor]
      ? `O profissional trabalha no setor de ${sectorLabels[setor]}. Adapta a terminologia, os entregáveis e o tom específico deste setor.\n\n`
      : '';

    const prompt = `És um consultor comercial sénior especializado em ajudar criativos, agências e profissionais independentes a escrever propostas que fecham negócios. As tuas propostas são conhecidas por serem específicas, confiantes, persuasivas e humanas — nunca genéricas.

${sectorContext}O profissional forneceu o seguinte briefing:

"${descricao}"

Escreve uma proposta comercial completa em ${idioma}.

Diretrizes de tom e estilo:
- Tom: confiante, profissional e humano. Directo sem ser frio.
- Usa exclusivamente os detalhes do briefing — esta proposta deve parecer feita à medida, nunca um template genérico.
- Evita absolutamente: "com grande entusiasmo", "estou entusiasmado", "é com prazer", "estimado cliente", "espero que vá ao encontro das suas expectativas", "não hesite em contactar", "entendo que", "compreendo que", "percebo que", "foi um prazer entender", "fico feliz em".
- Nunca uses frases de declaração de entendimento na primeira pessoa. Demonstra expertise através da especificidade dos factos, não através de afirmações de compreensão.
- Escreve de forma fluída e natural.
- Os títulos seguem o formato "1. Título" — sem asteriscos, sem #, sem traços separadores.
- Termina após os "Próximos Passos". Sem despedidas, sem "[Nome]" ou "[Cargo]".

Estrutura da proposta (8 secções):

1. Introdução
Dois parágrafos completos. Contextualiza a proposta de forma profissional e confiante. Demonstra que conheces o contexto do cliente. Não sejas genérico.

2. Compreensão do Projeto
Dois parágrafos completos. Descreve com precisão o que o projeto envolve, os seus objetivos e o que vai ser entregue. Usa os detalhes específicos do briefing. Reformula com as tuas palavras — sem frases como "entendo que" ou "compreendo que". Demonstra expertise através da especificidade dos factos e do contexto, não através de declarações de entendimento.

3. Âmbito dos Trabalhos
Um parágrafo introdutório seguido de uma lista detalhada com todos os entregáveis. Sê específico: o cliente deve saber exatamente o que vai receber, quando e em que formato. Inclui também o que não está incluído no âmbito se for relevante.

4. Processo de Trabalho
Dois parágrafos completos. Descreve como o trabalho será conduzido: fases, metodologia, comunicação e colaboração. Explica o que precisas do cliente para avançar. Esta secção constrói confiança no teu método e profissionalismo.

5. Investimento
Um parágrafo a enquadrar o investimento como uma decisão de valor, não apenas um custo. Apresenta os valores concretos do briefing de forma clara. Inclui condições de pagamento (adiantamento, fases, prazo). Se houver serviços adicionais, menciona-os e o respetivo preço.

6. Prazo de Entrega
Um parágrafo com o prazo total e, se aplicável, marcos intermédios ou fases de entrega. Sê preciso com as datas ou durações do briefing.

7. Termos e Garantias
Um parágrafo com termos profissionais e claros: o que está coberto, número de revisões incluídas, propriedade intelectual, confidencialidade e proteção para ambas as partes.

8. Próximos Passos
Um parágrafo final com uma instrução clara e específica sobre o que o cliente deve fazer para avançar. Cria momentum sem pressão. Termina de forma confiante.

Cada secção deve ser substantiva e completa. O total da proposta deve ter entre 600 e 900 palavras.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.62,
      max_tokens: 2500,
    });

    let propostaGerada = completion.choices[0]?.message?.content?.trim() || 'Erro ao gerar proposta.';

    // Limpar formatação markdown e despedidas genéricas
    propostaGerada = propostaGerada.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '');
    propostaGerada = propostaGerada.replace(/Com os melhores cumprimentos[\s\S]*$/i, '').trim();
    propostaGerada = propostaGerada.replace(/Atenciosamente[\s\S]*$/i, '').trim();
    propostaGerada = propostaGerada.replace(/Não hesite em contactar[\s\S]*$/i, '').trim();

    return NextResponse.json({ proposta: propostaGerada, sucesso: true });

  } catch (error: any) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro ao gerar a proposta. Tente novamente.' }, { status: 500 });
  }
}
